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
const BREAK_MIN = 10;        // reviews needed before we say anything about breakouts
const BREAK_HIGH = 0.15;     // share that earns a caution
const BREAK_LOW = 0.06;      // share that earns "rarely breaks out"

const TAG_LABEL = {
  hydrated: ["Hydrating", true], greasy: ["Greasy", false], "still tight": ["Still tight", false], stings: ["Stings", false],
  "no change": ["No change", false], "white cast": ["White cast", false], "no white cast": ["No white cast", true],
  "broke out": ["Broke them out", false], "good under makeup": ["Good under makeup", true], pills: ["Pills", false], "too expensive": ["Too expensive", false], "lasts long": ["Lasts long", true]
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
  const brk = (l) => l.filter((r) => (r.f || []).includes("broke out")).length;
  const bl = peer.length >= PEER_SOME ? peer : list;
  return {
    breakouts: { n: brk(bl), of: bl.length, who: peer.length >= PEER_SOME ? "peer" : "all", allN: brk(list), allOf: list.length },
    peer: { yes: yes(peer), n: peer.length },
    all: { yes: yes(list), n: list.length },
    late: (peer.length >= PEER_SOME ? peer : list).filter((r) => r.s === "l").length,
    tags: Object.entries(tags).filter(([k]) => TAG_LABEL[k]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => [TAG_LABEL[k][0], n, TAG_LABEL[k][1]]),
    samples: list.some((r) => r.sample),
    view: peer.length >= PEER_SOME ? "peer" : "all"
  };
}

// Evidence a product borrows before it has enough reviews of its own: reviews of products with a near-identical
// formula (same ingredients, in nearly the same order). Shared ingredients don't guarantee the same result, so this
// only sets the starting point, and it fades as the product gets its own reviews.
const SIM_MIN = 0.6;
function similarStats(p, by, me) {
  const out = { peer: { yes: 0, n: 0 }, all: { yes: 0, n: 0 }, products: [] };
  for (const s of p.similar || []) {
    if (s.s < SIM_MIN && !s.same) continue;
    const q = BY_ID[s.id];
    if (!q) continue;
    const st = stats(by[s.id] || [], me);
    if (!st.all.n) continue;
    out.peer.yes += st.peer.yes; out.peer.n += st.peer.n; out.all.yes += st.all.yes; out.all.n += st.all.n;
    out.products.push({ id: q.id, name: q.name, same: !!s.same, s: s.s });
  }
  return out;
}
function outsideOf(p) {
  const ex = (p.external || []).filter((e) => e.n >= 5).sort((a, b) => b.n - a.n);
  return ex[0] || null;
}
// What the headline number rests on, strongest first: her peers, everyone here, peers on similar formulas,
// another shop's rating, or only the label.
function basisOf(st, simSt, outside) {
  if (st.peer.n >= PEER_SOME) return "peer";
  if (st.all.n >= PEER_SOME) return "all";
  if (simSt && simSt.peer.n >= PEER_SOME) return "similar";
  if (simSt && simSt.all.n >= PEER_SOME) return "similar-all";
  if (outside) return "outside";
  return "label";
}

// Score in 0..1, plus short reasons she can read. Rules come from the survey and the review data.
function judge(p, st, me, simSt) {
  // Shrink small samples toward a starting point, so 2 of 2 never beats 18 of 24. The starting point is the
  // average, or what women said about near-identical formulas when there is enough of that.
  let base = 0.6;
  if (simSt && simSt.all.n >= PEER_SOME) base = (simSt.all.yes + 8 * 0.6) / (simSt.all.n + 8);
  const allRate = (st.all.yes + 8 * base) / (st.all.n + 8);
  let peerPrior = allRate;
  if (simSt && simSt.peer.n >= PEER_SOME && st.all.n < PEER_READY) peerPrior = (simSt.peer.yes + 5 * allRate) / (simSt.peer.n + 5);
  const peerRate = (st.peer.yes + 5 * peerPrior) / (st.peer.n + 5);
  let score = st.peer.n >= PEER_SOME ? 0.7 * peerRate + 0.3 * allRate : 0.3 * peerRate + 0.7 * allRate;
  score += Math.min(0.06, Math.log10(st.all.n + 1) * 0.03);
  // Another shop's star rating nudges the order a little while a product has few reviews here; it is never
  // turned into a "would buy again" number.
  const out = outsideOf(p);
  if (out) score += Math.max(-0.03, Math.min(0.03, (out.rating - 4) * 0.03)) * Math.min(1, Math.log10(out.n + 1) / 2) * (1 - Math.min(1, st.all.n / 30));
  // With nothing from women here (not even on a near-identical formula), a product sits below ones they have tried.
  if (st.all.n < PEER_SOME && !(simSt && simSt.all.n >= PEER_SOME)) score -= 0.08;
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
    const br = st.breakouts;
    const prone = c.includes("breakouts") || f.type === "oily" || f.type === "combination";
    if (br && br.of >= BREAK_MIN) {
      const who = br.who === "peer" ? "women like you" : "reviewers";
      if (prone && br.n / br.of >= BREAK_HIGH) { score -= c.includes("breakouts") ? 0.12 : 0.06; cautions.unshift(`${br.n} of ${br.of} ${who} said it broke them out`); }
      else if (c.includes("breakouts") && br.n / br.of <= BREAK_LOW) reasons.unshift(`Few breakouts: ${br.n} of ${br.of} ${who}`);
    }
    if (c.includes("breakouts") && tr.blemish) reasons.push("Made for blemish-prone skin");
    if (p.cat === "sun" && f.tone >= 6 && fl.filters === "hybrid") { score -= 0.1; cautions.push("Has mineral filters, which can leave a white cast on deeper skin"); }
    if (p.cat === "sun" && f.tone >= 5 && fl.filters === "chemical") reasons.push("Chemical filters, less likely to leave a white cast");
    const pore = fl.poreClogging || [];
    if (c.includes("breakouts") && pore.length) { score -= 0.04 * Math.min(2, pore.length); cautions.push(`Has ${pore.length === 1 ? "an ingredient" : pore.length + " ingredients"} on common pore-clogging lists`); }
    if (fl.retinol && (c.includes("sensitivity") || c.includes("redness"))) { score -= 0.06; cautions.push("Contains retinol, which can irritate sensitive skin"); }
    if (c.includes("sensitivity") && tr.sensitive) reasons.push("Made for sensitive skin");
    const bmax = BUDGET_MAX[me.budget];
    if (bmax && p.price > bmax * 1.25) { score -= 0.06; cautions.push(`Above your usual budget`); }
  }
  return { score: Math.max(0, Math.min(1, score)), reasons: reasons.slice(0, 2), cautions: cautions.slice(0, 2) };
}

function card(p, st, j, simSt) {
  const s0 = p.shops[0] || {};
  const outside = outsideOf(p);
  const basis = basisOf(st, simSt, outside);
  return {
    id: p.id, name: p.name, brand: p.brand, cat: p.cat, size: p.size, price: p.price, was: s0.was || null, shop: s0.shop || "",
    shopCount: p.shops.length, spf: p.spf, flags: p.flags, traits: p.traits, shape: p.shape, c: p.c,
    peer: st.peer, all: st.all, view: st.view, breakouts: st.breakouts, samples: st.samples, score: Math.round(j.score * 1000) / 1000, reasons: j.reasons, cautions: j.cautions,
    basis, similar: basis === "similar" || basis === "similar-all" ? { peer: simSt.peer, all: simSt.all, k: simSt.products.length, names: simSt.products.slice(0, 2).map((x) => x.name) } : null,
    outside: outside ? { source: outside.source, rating: outside.rating, n: outside.n, date: outside.date } : null,
    hasIngredients: !!(p.ingredients && p.ingredients.length)
  };
}
function evaluate(p, by, me) {
  const st = stats(by[p.id] || [], me);
  const simSt = st.all.n < PEER_READY ? similarStats(p, by, me) : null;
  const j = judge(p, st, me, simSt);
  return { st, simSt, j, c: card(p, st, j, simSt) };
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
  if (q.nobreak) list = list.filter((p) => { const l = by[p.id] || []; const st = stats(l, me); const b = st.breakouts; return b.of >= BREAK_MIN && b.n / b.of < 0.1; });
  if (q.q) { const w = norm(q.q).split(/\s+/).filter(Boolean); list = list.filter((p) => { const n = norm(p.name + " " + p.brand); return w.every((x) => n.includes(x)); }); }
  return list.map((p) => evaluate(p, by, me).c).sort((a, b) => b.score - a.score);
}

function detail(reviews, me, id, unlocked) {
  const p = BY_ID[id];
  if (!p) return null;
  const list = reviews.filter((r) => r.p === id);
  const by = groupBy(reviews);
  const { st, simSt, j, c } = evaluate(p, by, me);
  const f = features(me);
  const scored = list.map((r) => ({ r, s: f ? sim(f, r.g) : 0 })).sort((a, b) => (b.s >= PEER_MIN) - (a.s >= PEER_MIN) || (b.r.at || "").localeCompare(a.r.at || "") || b.s - a.s);
  const shown = scored.filter((x) => x.r.n).map(({ r, s }) => ({
    id: r.id, again: r.a, note: r.n, stage: r.s, like: s >= PEER_MIN, sample: !!r.sample,
    who: [r.g && r.g.type && r.g.type !== "unsure" ? r.g.type[0].toUpperCase() + r.g.type.slice(1) : "", r.g && r.g.age].filter(Boolean).join(", ")
  }));
  const sims = (p.similar || []).map((s) => ({ ...s, q: BY_ID[s.id] })).filter((s) => s.q).slice(0, 4)
    .map((s) => ({ id: s.id, name: s.q.name, price: s.q.price, same: !!s.same, s: s.s, reviews: (by[s.id] || []).length }));
  return { product: { ...c, shops: p.shops, note: p.note, checked: p.checked, ingredients: p.ingredients || null, ingredientsSource: p.ingredientsSource || null,
    actives: p.actives || [], claims: p.claims || [], external: p.external || [], similarList: sims, similarUsed: simSt ? simSt.products.length : 0 }, stats: st, reviews: unlocked ? shown : shown.slice(0, 2), locked: unlocked ? 0 : Math.max(0, shown.length - 2), totalNotes: shown.length };
}

module.exports = { PRODUCTS, BY_ID, SAMPLES, rank, detail, stats, sim, features, allReviews, BUDGET_MAX, PEER_READY, PEER_SOME, PEER_MIN, BREAK_MIN, SIM_MIN, norm };
