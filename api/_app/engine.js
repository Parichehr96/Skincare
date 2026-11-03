// Peer matching: which reviews come from women like her, what they say, and how products rank for her.
const PRODUCTS = require("../../data/products.json");
const SAMPLES = require("../../data/sample-reviews.json").map((r) => ({ ...r, sample: true }));
const BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

const AGES = ["18-24", "25-34", "35-44", "45-54", "55+"];
const BUDGET_MAX = { u10: 10, "10-20": 20, "20-35": 35, any: null };
const TYPE_ADJ = { "combination|oily": 1, "combination|normal": 1, "dry|normal": 1 };
const PEER_MIN = 0.7;        // similarity needed to count as "a woman like you"
const PEER_READY = 10;       // the survey: 10 matched reviews satisfy about half; below that we lean on everyone
const PEER_SOME = 5;

const TAG_LABEL = {
  hydrated: ["Hydrating", true], greasy: ["Greasy", false], "still tight": ["Still tight", false], stings: ["Stings", false],
  "no change": ["No change", false], "white cast": ["White cast", false], "no white cast": ["No white cast", true],
  "good under makeup": ["Good under makeup", true], pills: ["Pills", false], "too expensive": ["Too expensive", false], "lasts long": ["Lasts long", true]
};

function features(profile) {
  if (!profile) return null;
  return { type: profile.type || null, age: profile.age || null, tone: Number(profile.tone) || null, sun: profile.sun || null, c: profile.concerns || [] };
}
function sim(a, b) {
  if (!a || !b) return 0;
  let s = 0;
  if (a.type && b.type && a.type !== "unsure" && b.type !== "unsure") {
    if (a.type === b.type) s += 0.45;
    else if (TYPE_ADJ[[a.type, b.type].sort().join("|")]) s += 0.18;
  } else s += 0.15;
  const ai = AGES.indexOf(a.age), bi = AGES.indexOf(b.age);
  if (ai >= 0 && bi >= 0) { const d = Math.abs(ai - bi); s += d === 0 ? 0.25 : d === 1 ? 0.12 : 0; }
  if (a.tone && b.tone) { const d = Math.abs(a.tone - b.tone); s += d <= 1 ? 0.2 : d === 2 ? 0.1 : 0; }
  if (a.sun && b.sun && a.sun === b.sun) s += 0.1;
  return s;
}

function groupBy(reviews) {
  const m = {};
  for (const r of reviews) (m[r.p] = m[r.p] || []).push(r);
  return m;
}
function allReviews(real, samplesOn) { return samplesOn ? real.concat(SAMPLES) : real.slice(); }

function stats(list, me) {
  const f = features(me);
  const peer = f ? list.filter((r) => sim(f, r.g) >= PEER_MIN) : [];
  const yes = (l) => l.filter((r) => r.a === "y").length;
  const tags = {};
  for (const r of peer.length >= PEER_SOME ? peer : list) for (const t of [...(r.f || []), ...(r.x || [])]) tags[t] = (tags[t] || 0) + 1;
  return {
    peer: { yes: yes(peer), n: peer.length },
    all: { yes: yes(list), n: list.length },
    late: (peer.length >= PEER_SOME ? peer : list).filter((r) => r.s === "l").length,
    tags: Object.entries(tags).filter(([k]) => TAG_LABEL[k]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => [TAG_LABEL[k][0], n, TAG_LABEL[k][1]]),
    samples: list.some((r) => r.sample),
    view: peer.length >= PEER_SOME ? "peer" : "all"
  };
}

// Score in 0..1, plus short reasons she can read. Rules come from the survey and the review data.
function judge(p, st, me) {
  // Shrink small samples toward the average, so 2 of 2 never beats 18 of 24.
  const allRate = (st.all.yes + 8 * 0.6) / (st.all.n + 8);
  const peerRate = (st.peer.yes + 5 * allRate) / (st.peer.n + 5);
  let score = st.peer.n >= PEER_SOME ? 0.7 * peerRate + 0.3 * allRate : 0.3 * peerRate + 0.7 * allRate;
  score += Math.min(0.06, Math.log10(st.all.n + 1) * 0.03);
  const reasons = [], cautions = [];
  const f = me ? features(me) : null;
  const c = (f && f.c) || [];
  const fl = p.flags || {}, tr = p.traits || {};
  if (f) {
    if ((c.includes("sensitivity") || c.includes("redness")) && fl.fragrance === true) { score -= 0.12; cautions.push("Contains fragrance, which often bothers sensitive skin"); }
    if ((c.includes("sensitivity") || c.includes("redness")) && fl.fragrance === false) reasons.push("Fragrance-free");
    if (f.type === "dry" && fl.dryingAlcohol === true) { score -= 0.08; cautions.push("Contains drying alcohol"); }
    if ((f.type === "oily" || f.type === "combination") && tr.rich) { score -= 0.08; cautions.push("A rich texture, which can feel heavy on oilier skin"); }
    if ((f.type === "oily" || f.type === "combination") && tr.light) reasons.push("Light texture");
    if (f.type === "dry" && tr.rich) reasons.push("Rich texture for dry skin");
    if (c.includes("breakouts") && tr.blemish) reasons.push("Made for blemish-prone skin");
    if (p.cat === "sun" && f.tone >= 6 && fl.filters === "hybrid") { score -= 0.1; cautions.push("Has mineral filters, which can leave a white cast on deeper skin"); }
    if (p.cat === "sun" && f.tone >= 5 && fl.filters === "chemical") reasons.push("Chemical filters, less likely to leave a white cast");
    if (fl.retinol && (c.includes("sensitivity") || c.includes("redness"))) { score -= 0.06; cautions.push("Contains retinol, which can irritate sensitive skin"); }
    if (c.includes("sensitivity") && tr.sensitive) reasons.push("Made for sensitive skin");
    const bmax = BUDGET_MAX[me.budget];
    if (bmax && p.price > bmax * 1.25) { score -= 0.06; cautions.push(`Above your usual budget`); }
  }
  return { score: Math.max(0, Math.min(1, score)), reasons: reasons.slice(0, 2), cautions: cautions.slice(0, 2) };
}

function card(p, st, j) {
  const s0 = p.shops[0] || {};
  return {
    id: p.id, name: p.name, brand: p.brand, cat: p.cat, size: p.size, price: p.price, was: s0.was || null, shop: s0.shop || "",
    spf: p.spf, flags: p.flags, traits: p.traits, shape: p.shape, c: p.c,
    peer: st.peer, all: st.all, view: st.view, samples: st.samples, score: Math.round(j.score * 1000) / 1000, reasons: j.reasons, cautions: j.cautions
  };
}

function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); }

function rank(reviews, me, q = {}) {
  const by = groupBy(reviews);
  let list = PRODUCTS;
  if (q.cat) list = list.filter((p) => p.cat === q.cat);
  if (q.max) list = list.filter((p) => p.price != null && p.price <= Number(q.max));
  if (q.shop) list = list.filter((p) => p.shops.some((s) => s.shop.toLowerCase() === String(q.shop).toLowerCase()));
  if (q.ff) list = list.filter((p) => p.flags.fragrance === false);
  if (q.spf) list = list.filter((p) => p.spf);
  if (q.light) list = list.filter((p) => p.traits.light);
  if (q.nocast) list = list.filter((p) => p.cat !== "sun" || p.flags.filters !== "hybrid");
  if (q.q) { const w = norm(q.q).split(/\s+/).filter(Boolean); list = list.filter((p) => { const n = norm(p.name + " " + p.brand); return w.every((x) => n.includes(x)); }); }
  return list.map((p) => { const st = stats(by[p.id] || [], me); return card(p, st, judge(p, st, me)); }).sort((a, b) => b.score - a.score);
}

function detail(reviews, me, id, unlocked) {
  const p = BY_ID[id];
  if (!p) return null;
  const list = reviews.filter((r) => r.p === id);
  const st = stats(list, me);
  const j = judge(p, st, me);
  const f = features(me);
  const scored = list.map((r) => ({ r, s: f ? sim(f, r.g) : 0 })).sort((a, b) => (b.s >= PEER_MIN) - (a.s >= PEER_MIN) || (b.r.at || "").localeCompare(a.r.at || "") || b.s - a.s);
  const shown = scored.filter((x) => x.r.n).map(({ r, s }) => ({
    id: r.id, again: r.a, note: r.n, stage: r.s, like: s >= PEER_MIN, sample: !!r.sample,
    who: [r.g && r.g.type && r.g.type !== "unsure" ? r.g.type[0].toUpperCase() + r.g.type.slice(1) : "", r.g && r.g.age].filter(Boolean).join(", ")
  }));
  return { product: { ...card(p, st, j), shops: p.shops, note: p.note, checked: p.checked }, stats: st, reviews: unlocked ? shown : shown.slice(0, 2), locked: unlocked ? 0 : Math.max(0, shown.length - 2), totalNotes: shown.length };
}

module.exports = { PRODUCTS, BY_ID, SAMPLES, rank, detail, stats, sim, features, allReviews, BUDGET_MAX, PEER_READY, PEER_SOME, PEER_MIN, norm };
