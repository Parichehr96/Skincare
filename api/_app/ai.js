// Advice and photo recognition through the Anthropic API, with a rules-only fallback when no key is set.
const engine = require("./engine");

const MODEL = () => process.env.AI_MODEL || "claude-haiku-5-5";
const hasKey = () => !!process.env.ANTHROPIC_API_KEY;
const MEDICAL = /rash|patch|itch|jeuk|uitslag|eczema|ecze|psoria|swell|zwel|bleed|bloed|pain|pijn|infect|blister|blaar|bult|lump|mole|moedervlek|allerg|burning|brand(t|end)|wond|wound|hives|bultjes|ontsteking|prescri|tretinoin|isotretin|accutane|antibiot/i;

async function claude({ system, messages, maxTokens = 900 }) {
  const r = await fetch((process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com") + "/v1/messages", {
    method: "POST",
    headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL(), max_tokens: maxTokens, system, messages })
  });
  if (!r.ok) { const t = await r.text(); throw new Error("ai_failed_" + r.status + " " + t.slice(0, 200)); }
  const j = await r.json();
  return (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
}
function parseJSON(text) {
  try { return JSON.parse(text); } catch (e) {}
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/); if (m) { try { return JSON.parse(m[1]); } catch (e) {} }
  const a = text.indexOf("{"), b = text.lastIndexOf("}");
  if (a >= 0 && b > a) { try { return JSON.parse(text.slice(a, b + 1)); } catch (e) {} }
  return null;
}

const TYPE_WORD = { dry: "dry", oily: "oily", combination: "combination", normal: "normal", unsure: "not sure yet" };
function profileLine(p) {
  if (!p) return "No profile yet.";
  return [`Skin by midday: ${TYPE_WORD[p.type] || "unknown"}`, `age ${p.age}`, `skin tone ${p.tone || "?"} of 8 (1 lightest)`, `sun: ${p.sun}`,
    `usual spend per product: ${({ u10: "under €10", "10-20": "€10–20", "20-35": "€20–35", any: "price doesn't matter" })[p.budget] || "unknown"}`,
    p.concerns && p.concerns.length ? `concerns she chose to share: ${p.concerns.join(", ")}` : "no concerns shared"].join("; ");
}
function compact(c) {
  const f = c.flags || {};
  return {
    id: c.id, name: c.name, type: c.cat === "sun" ? "sunscreen" : "moisturiser", price_eur: c.price, shop: c.shop, spf: c.spf,
    fragrance: f.fragrance, drying_alcohol: f.dryingAlcohol, filters: f.filters, tinted: f.tinted, retinol: f.retinol, texture: c.traits.light ? "light" : c.traits.rich ? "rich" : "medium",
    women_like_her: c.peer.n ? `${c.peer.yes} of ${c.peer.n} would buy again` : "none yet",
    evidence: c.basis === "similar" && c.similar ? `no reviews of this product yet; on near-identical formulas ${c.similar.peer.yes} of ${c.similar.peer.n} women like her would buy again` :
      c.basis === "similar-all" && c.similar ? `no reviews of this product yet; on near-identical formulas ${c.similar.all.yes} of ${c.similar.all.n} reviewers would buy again` :
      c.basis === "outside" && c.outside ? `no reviews here yet; ${c.outside.source}'s own star rating is ${c.outside.rating} of 5 from ${c.outside.n} ratings (all skin types)` :
      c.basis === "label" ? "no reviews yet; only the ingredient list" : "reviews on Skin Peers",
    pore_clogging_list: c.flags && Array.isArray(c.flags.poreClogging) ? (c.flags.poreClogging.length ? c.flags.poreClogging.join(", ") : "none found") : "not checked yet",
    everyone: `${c.all.yes} of ${c.all.n} would buy again`,
    breakouts: c.breakouts && c.breakouts.of >= engine.BREAK_MIN ? `${c.breakouts.n} of ${c.breakouts.of} ${c.breakouts.who === "peer" ? "women like her" : "reviewers"} said it broke them out` : "too few reviews to say",
    fits: c.reasons, watch_out: c.cautions
  };
}

const SYSTEM = (profile, cands, samples) => `You are the assistant in Skin Peers, a Dutch app that helps women in the Netherlands choose a face sunscreen or moisturiser using reviews from women with similar skin.

How you work:
- Your baseline is real peer reviews: always say whose reviews you draw on, with the exact numbers given ("9 of 12 women with skin like yours would buy it again"). Never invent numbers, reviews, prices, tests or studies.
- On top of reviews you may explain ingredients from the flags given (fragrance, drying alcohol, filters, retinol, texture). Name the source: "from the ingredient list".
- Each candidate has "evidence": say plainly what a number rests on. Reviews of near-identical formulas are "similar products", not this product; a shop's star rating is that shop's rating for all skin types. Never present either as "women like you" reviews of this product.
- Only suggest products from the CANDIDATES list, by their id. If nothing fits, say so and ask one short question.
- Recommendations cover face sunscreens and moisturisers only for now. If she asks for another kind (serum, cleanser, toner, night or eye cream, mask, exfoliant), say reviews for those aren't open yet, suggest no product, and tell her she can scan it or add it to her shelf to see the ingredient check.
- No brand pays for a spot. Never favour a shop or brand.
- You give general skincare guidance, not medical advice. Never diagnose or name a condition. If she mentions symptoms (rash, swelling, pain, bleeding, a changing mole, a reaction that won't settle) or prescription medicine, set "medical": true, tell her to contact her huisarts and point to Thuisarts.nl, say "call 112" only for swelling of the face or trouble breathing, and suggest pausing new products. Don't suggest products for the symptom itself.
- Keep replies short: 1 to 3 sentences, warm and plain. Reply in the language she writes in (Dutch or English).
- She may ask about her routine or how to use a product: answer briefly and safely.
- Breakouts ("puistjes", acne-prone, "will it break me out", blemishes): answer from the "breakouts" numbers, which come from reviews, and say so. Prefer products with few reported breakouts. "pore_clogging_list" names ingredients that appear on common pore-clogging lists (old single-ingredient tests): you may mention them, but never promise a product won't clog pores or call it non-comedogenic yourself; if the brand claims it, say it's the brand's claim. Persistent or painful acne is for the huisarts.
${samples ? "- Some review numbers include sample reviews used for testing. That's fine; just use the numbers as given.\n" : ""}
HER PROFILE: ${profileLine(profile)}

CANDIDATES (already ranked for her; "fits" and "watch_out" are checked facts):
${JSON.stringify(cands.map(compact))}

Reply with only JSON:
{"reply": "your message", "products": ["id", "id"], "chips": ["short follow-up she might tap", "..."], "topic": "one of: find_sunscreen, find_moisturiser, compare, ingredients, routine, my_product, medical, other", "medical": false}
Show at most 3 products. Give 2 or 3 chips of at most 4 words each.`;

function fallback(text, profile, reviews) {
  const t = String(text || "").toLowerCase();
  if (MEDICAL.test(t)) return { reply: "I can't tell what this is, and skin changes like this are worth showing to your huisarts. Until then, keep your routine simple and pause anything new.", products: [], chips: ["Pause a product on my shelf", "Something else"], topic: "medical", medical: true };
  const q = {};
  if (/serum|cleanser|reinig|toner|tonic|night ?cream|nachtcr|eye ?cream|oogcr|mask|masker|peeling|scrub|exfoli/.test(t) && !/sun|spf|zon|dagcr|day ?cream|moistur/.test(t))
    return { reply: "For now I can only suggest face sunscreens and moisturisers; reviews for other kinds aren't open yet. You can scan yours or add it to your shelf to see the ingredient check.", products: [], chips: ["A sunscreen", "A moisturiser", "Check my product"], topic: "other", medical: false };
  q.cat = /sun|spf|zon|uv|cast/.test(t) ? "sun" : /moist|cream|crème|creme|dagcr|hydrat|tight|dry|droog|strak/.test(t) ? "moist" : null;
  const mm = t.match(/(?:under|below|onder|max|less than|tot|<)\s*€?\s*(\d+)/) || t.match(/€\s?(\d+)/); if (mm) q.max = +mm[1];
  const shop = (t.match(/etos|kruidvat|douglas|hema|action/) || [])[0]; if (shop) q.shop = shop;
  if (/fragrance|parfum|geur|scent/.test(t)) q.ff = true;
  if (/white cast|witte/.test(t)) q.nocast = true;
  const brk = /puist|breakout|break(s|ing)? (me )?out|broke (me )?out|acne|blemish|pimple|onzuiver|clog|verstop/.test(t);
  if (brk) q.nobreak = true;
  if (!q.cat) return { reply: "I can help you find a face sunscreen or a moisturiser, or check one you already use. What are you looking for?", products: [], chips: ["A sunscreen", "A moisturiser", "Check my product"], topic: "other", medical: false };
  const list = engine.rank(reviews, profile, q).slice(0, 2);
  if (!list.length) return { reply: "Nothing matches all of that yet. Want me to drop one of the filters?", products: [], chips: ["Any shop", "Any price"], topic: q.cat === "sun" ? "find_sunscreen" : "find_moisturiser", medical: false };
  const top = list[0];
  if (brk) { const b = top.breakouts; return { reply: `Fewest breakouts for you: ${top.name}. ${b.n} of ${b.of} ${b.who === "peer" ? "women with skin like yours" : "reviewers"} said it broke them out. That's what women reported, not a promise for your skin.`, products: list.map((x) => x.id), chips: ["Cheaper?", "Fragrance-free", "See all"], topic: q.cat === "sun" ? "find_sunscreen" : "find_moisturiser", medical: false }; }
  const who = top.peer.n >= engine.PEER_SOME ? `${top.peer.yes} of ${top.peer.n} women with skin like yours would buy it again` : `${top.all.yes} of ${top.all.n} reviewers would buy it again`;
  return { reply: `Top pick for you: ${top.name}. ${who}.`, products: list.map((x) => x.id), chips: ["Cheaper?", "Fragrance-free", "See all"], topic: q.cat === "sun" ? "find_sunscreen" : "find_moisturiser", medical: false };
}

async function chat({ messages, profile, reviews, samples }) {
  const last = (messages[messages.length - 1] || {}).text || "";
  const medicalHint = MEDICAL.test(last);
  const cands = [...engine.rank(reviews, profile, { cat: "sun" }).slice(0, 12), ...engine.rank(reviews, profile, { cat: "moist" }).slice(0, 12)];
  let out = null, usedAI = false;
  if (hasKey()) {
    const msgs = messages.slice(-8).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.text || "").slice(0, 1500) || "…" }));
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    try { out = parseJSON(await claude({ system: SYSTEM(profile, cands, samples), messages: msgs })); usedAI = !!out; } catch (e) { console.error(e.message); }
  }
  if (!out || typeof out.reply !== "string") out = fallback(last, profile, reviews);
  const ids = (Array.isArray(out.products) ? out.products : []).map(String).filter((id) => engine.BY_ID[id]).slice(0, 3);
  const cardsById = Object.fromEntries(engine.rank(reviews, profile, {}).map((c) => [c.id, c]));
  return {
    reply: out.reply.slice(0, 1200),
    products: ids.map((id) => cardsById[id]).filter(Boolean),
    chips: (Array.isArray(out.chips) ? out.chips : []).map(String).filter(Boolean).slice(0, 3),
    topic: String(out.topic || "other").slice(0, 30),
    medical: !!out.medical || (medicalHint && out.topic === "medical"),
    ai: usedAI
  };
}

async function identify({ image }) {
  if (!hasKey()) return { error: "ai_not_configured" };
  const m = String(image || "").match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return { error: "bad_image" };
  if (m[2].length > 4_000_000) return { error: "image_too_large" };
  const catalogue = engine.PRODUCTS.map((p) => `${p.id}: ${p.name}`).join("\n");
  const prompt = `You identify skincare products from a photo for a Dutch skincare app. Read the brand and product name from the packaging (Dutch or English). Then pick the matching id from this catalogue. Only match the same brand and product line; a different variant or SPF is not a match.

Catalogue:
${catalogue}

Reply with only JSON: {"readable": true, "match": "id or null", "brand": "...", "product": "...", "category": "sunscreen|moisturiser|other", "confidence": "high|medium|low"}. readable is false when no label can be read.`;
  const text = await claude({ system: "You read product labels accurately and answer only in JSON.", maxTokens: 300,
    messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: m[1], data: m[2] } }, { type: "text", text: prompt }] }] });
  const j = parseJSON(text) || {};
  const match = j.match && engine.BY_ID[j.match] ? j.match : null;
  return { readable: j.readable !== false, match, brand: String(j.brand || "").slice(0, 80), product: String(j.product || "").slice(0, 120), category: ["sunscreen", "moisturiser", "other"].includes(j.category) ? j.category : "other", confidence: ["high", "medium", "low"].includes(j.confidence) ? j.confidence : "low" };
}
module.exports = { chat, identify, hasKey, MEDICAL };
