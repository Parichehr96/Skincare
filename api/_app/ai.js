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
    id: c.id, name: c.name, type: c.kind === "day cream" ? "moisturiser" : c.kind, reviews_open: c.reviewsOpen, price_eur: c.price, shop: c.shop, spf: c.spf,
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

const SYSTEM = (profile, cands, samples, extra) => `You are the assistant in Skin Peers, a Dutch app that helps women in the Netherlands choose a face sunscreen or moisturiser using reviews from women with similar skin.

How you work:
- Your baseline is real peer reviews: always say whose reviews you draw on, with the exact numbers given ("9 of 12 women with skin like yours would buy it again"). Never invent numbers, reviews, prices, tests or studies.
- On top of reviews you may explain ingredients from the flags given (fragrance, drying alcohol, filters, retinol, texture). Name the source: "from the ingredient list".
- Each candidate has "evidence": say plainly what a number rests on. Reviews of near-identical formulas are "similar products", not this product; a shop's star rating is that shop's rating for all skin types. Never present either as "women like you" reviews of this product.
- Only suggest products from the CANDIDATES list, by their id. If nothing fits, say so and ask one short question.
- This is a conversation. Read all of it and answer her last message in the light of what was said and shown before: "it", "that one" or "cheaper" refer to the product in JUST SHOWN. Never start over with a general "what are you looking for?" when she has already told you, and never repeat your previous reply.
- If she names a product, look for it in ALSO IN THIS CONVERSATION and answer about that product (put its id in "products"). Those products may be of any kind; when "reviews_open" is false, give only label facts (ingredients, price, shop) and say reviews for that kind aren't open yet. If the product she names is in neither list, say you couldn't find it and suggest typing the brand and product name or scanning the pack; don't guess.
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

ALSO IN THIS CONVERSATION (products she named or was shown, from the full list; not ranked):
${JSON.stringify(((extra && extra.cards) || []).map(compact))}

JUST SHOWN to her (ids, first is the one she most likely means by "it"): ${JSON.stringify((extra && extra.shown) || [])}

Reply with only JSON:
{"reply": "your message", "products": ["id", "id"], "chips": ["short follow-up she might tap", "..."], "topic": "one of: find_sunscreen, find_moisturiser, compare, ingredients, routine, my_product, medical, other", "medical": false}
Show at most 3 products. Give 2 or 3 chips of at most 4 words each.`;

// ---------- Conversation: products she names, what was just shown, follow-up questions ----------
const toks = (t) => engine.norm(t).replace(/[^a-z0-9]+/g, " ").trim().split(/\s+/).filter(Boolean);
// Brand names that are also everyday words: never enough on their own to mean "she named a product".
const PLAIN_BRANDS = new Set(["care", "hero", "bubble", "neutral", "nature", "skin", "glow", "pure", "basic", "simple", "normal", "the", "dr", "bio", "eco", "one", "nude", "mine", "first", "sun", "face", "me"]);
const SHOP_NAMES = ["kruidvat", "etos", "douglas", "hema", "ah"];
// Words that describe what she wants rather than name a product.
const DESCRIBE = new Set(("fragrance free parfum parfumvrij sensitive gevoelige huid skin dry droge oily vette light licht rich mineral tinted hydrating hydraterende " +
  "cream creme dagcreme moisturiser moisturizer sunscreen zonnebrand zonnecreme spf face gezicht serum cleanser toner mask masker night nacht eye oog day dag " +
  "cheap cheaper best good white cast breakouts acne pimples anti aging age glow repair barrier pure sun zon lotion gel fluid oil olie water care daily " +
  "with without voor for and the een het my mijn want buy how about what this that does have any something need looking under onder max").split(" "));
const SMALL = new Set(("i im me you your we a an to of on in at is are am be do can could would should will it its im ive id so too very really just also or but if not no yes ok okay please thanks thank " +
  "hi hello hey hoi hallo there here now today lately always often sometimes feel feels feeling get gets got make makes made like love hate use using used try tried think know find show tell give " +
  "help recommend suggest advice better new one some more most much many little bit bought buying shiny red redness wrinkles pores dull tight cheeks forehead nose chin t zone zone summer winter morning evening " +
  "ik je jij mijn wil zoek iets heb heeft dat dit die deze wat welke hoe waar waarom een beetje graag niet wel ook maar als dan nog").split(" "));
let IDX = null;
function index() {
  if (IDX && IDX.n === engine.PRODUCTS.length) return IDX;
  const df = new Map(), brands = new Map();
  const items = engine.PRODUCTS.map((p) => {
    const t = new Set(toks(p.name));
    t.forEach((w) => df.set(w, (df.get(w) || 0) + 1));
    const b = toks(p.brand || "").join(" ");
    const it = { p, t, b };
    if (b) { if (!brands.has(b)) brands.set(b, []); brands.get(b).push(it); }
    return it;
  });
  return (IDX = { n: engine.PRODUCTS.length, df, brands, items });
}
// Products she names in a message. sure = the brand is in the message; otherwise it is a guess from rare name words.
function mentioned(text, limit = 40) {
  const I = index(), mt = toks(text);
  if (!mt.length) return { list: [], brand: null, sure: false };
  const msp = " " + mt.join(" ") + " ", msq = mt.join("");
  const words = new Set(mt);
  for (let i = 0; i + 1 < mt.length; i++) words.add(mt[i] + mt[i + 1]);   // "skin 1004" is "SKIN1004"
  const idf = (w) => Math.log(I.n / (I.df.get(w) || I.n));
  const score = (it, skip) => { let x = 0; for (const w of words) if (it.t.has(w) && !(skip && skip.has(w))) x += idf(w); return x; };
  let best = null;
  for (const b of I.brands.keys()) {
    if (PLAIN_BRANDS.has(b)) continue;
    const bsq = b.replace(/ /g, "");
    if (!(msp.includes(" " + b + " ") || (bsq.length >= 6 && msq.includes(bsq)))) continue;
    if (SHOP_NAMES.includes(b) && new RegExp("\\b(at|bij|from|van|in)\\s+" + b + "\\b").test(mt.join(" "))) continue;   // "at Etos" is a shop
    const skip = new Set(b.split(" ").concat([bsq]));
    const pool = I.brands.get(b).map((it) => ({ it, x: score(it, skip) })).sort((a, c) => c.x - a.x);
    if (SHOP_NAMES.includes(b) && pool[0].x <= 0) continue;
    // several brand names can be in one message ("cosrx snail essence"): the one whose products fit the other words best wins
    if (!best || pool[0].x > best.pool[0].x || (pool[0].x === best.pool[0].x && b.length > best.b.length)) best = { b, pool };
  }
  if (best) {
    const top = best.pool[0].x;
    const list = (top > 0 ? best.pool.filter((o) => o.x >= top * 0.6) : best.pool).map((o) => o.it.p);
    return { list: list.slice(0, limit), brand: best.pool[0].it.p.brand, sure: true, total: list.length };
  }
  const rare = [...words].filter((w) => w.length >= 3 && !DESCRIBE.has(w) && I.df.has(w) && I.df.get(w) <= 60);
  if (!rare.length) return { list: [], brand: null, sure: false };
  const cand = [];
  for (const it of I.items) {
    const hit = rare.filter((w) => it.t.has(w));
    if ((hit.length >= 2 && hit.some((w) => w.length >= 5)) || (hit.length === 1 && hit[0].length >= 6 && I.df.get(hit[0]) <= 25)) cand.push({ it, x: hit.reduce((a, w) => a + idf(w), 0) });
  }
  if (!cand.length) return { list: [], brand: null, sure: false };
  cand.sort((a, b) => b.x - a.x);
  const list = cand.filter((o) => o.x >= cand[0].x * 0.8).map((o) => o.it.p);
  return { list: list.slice(0, limit), brand: null, sure: false, total: list.length };
}

const euro = (n) => "€" + Number(n).toFixed(2).replace(".", ",");
// What a number rests on, said plainly. Similar formulas and shop ratings are never "women like you" reviews of this product.
function evidenceLine(c) {
  if (!c.reviewsOpen) return `Reviews for ${c.kind}s aren't open yet, so I can only tell you what's on the label`;
  if (c.peer.n >= engine.PEER_SOME) return `${c.peer.yes} of ${c.peer.n} women with skin like yours would buy it again`;
  if (c.all.n > 0) return `${c.all.yes} of ${c.all.n} reviewers would buy it again${c.peer.n ? "" : " (none with your skin yet)"}`;
  if (c.basis === "similar" && c.similar) return `No reviews of it here yet. On near-identical formulas, ${c.similar.peer.yes} of ${c.similar.peer.n} women like you would buy again`;
  if (c.basis === "similar-all" && c.similar) return `No reviews of it here yet. On near-identical formulas, ${c.similar.all.yes} of ${c.similar.all.n} reviewers would buy again`;
  if (c.outside) return `No reviews here yet. ${c.outside.source} shoppers give it ${String(c.outside.rating).replace(".", ",")} out of 5 (${c.outside.n} ratings, all skin types)`;
  return c.hasIngredients ? "No reviews yet, so all I have is its ingredient list" : "No reviews yet, and the shop doesn't list its ingredients";
}
const ASK = {
  fragrance: /fragrance|parfum|perfume|geur|scent/,
  alcohol: /alcohol/,
  spf: /\bspf\b|sun protection|factor/,
  where: /price|cost|how much|prijs|kost|where|waar|buy it|kopen|which shop|welke winkel|in stock/,
  ingredients: /ingredient|inci|what('?s| is) in|wat zit|contains|bevat|niacinamide|retinol|actives?/,
  breakouts: /puist|break(s|ing)? (me )?out|broke (me )?out|breakout|acne|pimple|clog|verstop|comedogen/,
  why: /\bwhy\b|waarom|tell me more|more about|meer over|good for me|goed voor mij|is it good|worth it|should i|what do (women|people) (think|say)|reviews?/
};
function productAnswer(c, intent) {
  const p = engine.BY_ID[c.id] || {}, f = c.flags || {}, noList = "I don't have its ingredient list, so I can't say";
  switch (intent) {
    case "fragrance": return !c.hasIngredients || f.fragrance == null ? `${noList} whether ${c.name} has fragrance.` : f.fragrance ? `No: ${c.name} contains fragrance, going by the ingredient list.` : `Yes: ${c.name} is fragrance-free, going by the ingredient list.`;
    case "alcohol": return !c.hasIngredients || f.dryingAlcohol == null ? `${noList} whether ${c.name} has drying alcohol.` : f.dryingAlcohol ? `${c.name} has alcohol among its first ingredients, which can feel drying.` : `${c.name} has no drying alcohol near the top of its ingredient list.`;
    case "spf": return c.spf ? `${c.name} has SPF ${c.spf}.` : `${c.name} has no SPF on the label.`;
    case "where": {
      const shops = (p.shops || []).filter((s) => s.price != null).sort((a, b) => a.price - b.price);
      return shops.length ? `${c.name}: ${shops.map((s) => `${euro(s.price)} at ${s.shop}`).join(", ")}. Prices were checked on ${p.checked || "the day we read the shops"} and can change.` : `I don't have a current price for ${c.name}.`;
    }
    case "ingredients": {
      const act = (p.actives || []).map((a) => (a && a.label) || a).filter(Boolean);
      return !c.hasIngredients ? `The shop doesn't list the ingredients of ${c.name}. Check the pack.` : `${c.name}${act.length ? ` contains ${act.slice(0, 5).join(", ")}` : " has no ingredients I'd single out"}, going by the ingredient list. Open the product for the full list.`;
    }
    case "breakouts": {
      const b = c.breakouts, pore = Array.isArray(f.poreClogging) ? f.poreClogging : null;
      const rev = c.reviewsOpen && b && b.of >= engine.BREAK_MIN ? `${b.n} of ${b.of} ${b.who === "peer" ? "women with skin like yours" : "reviewers"} said ${c.name} broke them out.` : `Too few reviews to say whether ${c.name} breaks women out.`;
      const lab = pore == null ? "" : pore.length ? ` Its list has ${pore.length === 1 ? "an ingredient" : pore.length + " ingredients"} found on common pore-clogging lists.` : " Nothing on its list is on the common pore-clogging lists.";
      return `${rev}${lab} That's what women and the label say, not a promise for your skin.`;
    }
    default: {
      const bits = [`${c.name}: ${evidenceLine(c)}.`];
      if (c.price != null) bits.push(`${euro(c.price)}${c.shop ? " at " + c.shop : ""}.`);
      if (c.reasons && c.reasons.length) bits.push(`For you: ${c.reasons.join(", ").toLowerCase()}.`);
      if (c.cautions && c.cautions.length) bits.push(`Watch out: ${c.cautions.join(", ").toLowerCase()}.`);
      return bits.join(" ");
    }
  }
}
// What one message asks for. Filters build up over the conversation; "any shop" and "any price" take one away again.
function parseWant(t, q) {
  if (/\bsun|\bspf\b|\bzon|\buv\b|white cast|witte waas/.test(t)) q.cat = "sun";
  else if (/moist|dagcr|day ?cream|gezichtscr|face ?cream|hydrat|tight|\bdry\b|droog|droge|strak|\bcream\b|\bcr[eè]me\b/.test(t)) q.cat = "moist";
  const mm = t.match(/(?:under|below|onder|max|less than|tot|<)\s*€?\s*(\d+)/) || t.match(/€\s?(\d+)/); if (mm) q.max = +mm[1];
  const shop = (t.match(/\b(etos|kruidvat|douglas|hema)\b/) || [])[1]; if (shop) q.shop = shop;
  if (/fragrance|parfum|geur|scent/.test(t)) q.ff = true;
  if (/white cast|witte/.test(t)) q.nocast = true;
  if (ASK.breakouts.test(t)) q.nobreak = true;
  if (/any shop|elke winkel|all shops/.test(t)) delete q.shop;
  if (/any price|elke prijs|price doesn'?t matter/.test(t)) delete q.max;
  return q;
}
const OTHER_KIND = /serum|cleanser|reinig|toner|tonic|night ?cream|nachtcr|eye ?cream|oogcr|mask|masker|peeling|scrub|exfoli/;
const wantLabel = (q) => [q.ff ? "fragrance-free" : "", q.nobreak ? "rarely-breaks-out" : "", q.cat === "sun" ? "sunscreens" : q.cat === "moist" ? "moisturisers" : "products", q.nocast ? "with no white cast" : "",
  q.max ? `under €${Math.round(q.max * 100) / 100}`.replace(".", ",") : "", q.shop ? `at ${q.shop[0].toUpperCase() + q.shop.slice(1)}` : ""].filter(Boolean).join(" ");

// Rules-only answers, used when no AI key is set or the AI call fails. It reads the whole conversation, not just the last line.
function fallback(messages, profile, reviews, ctx = {}) {
  const msgs = typeof messages === "string" ? [{ role: "user", text: messages }] : messages || [];
  const users = msgs.filter((m) => m.role !== "assistant").map((m) => String(m.text || "").toLowerCase());
  const t = users[users.length - 1] || "";
  const prevBot = (msgs.filter((m) => m.role === "assistant").pop() || {}).text || "";
  const topicOf = (cat) => (cat === "sun" ? "find_sunscreen" : cat === "moist" ? "find_moisturiser" : "other");
  const say = (reply, products = [], chips = [], topic = "other") => ({ reply, products, chips, topic, medical: false });
  if (MEDICAL.test(t)) return { reply: "I can't tell what this is, and skin changes like this are worth showing to your huisarts. Until then, keep your routine simple and pause anything new.", products: [], chips: ["Pause a product on my shelf", "Something else"], topic: "medical", medical: true };

  const cardOf = (id) => engine.search(reviews, profile, { ids: [id] })[0];
  const shown = (Array.isArray(ctx.shown) ? ctx.shown : []).filter((id) => engine.BY_ID[id]);
  const intent = Object.keys(ASK).find((k) => ASK[k].test(t)) || null;
  const followChips = (c) => ["Is it fragrance-free?", "Where can I buy it?", c.reviewsOpen ? "Will it break me out?" : "What's in it?"];

  const pronoun = /\b(it|this|that|deze|die|dit|het)\b/.test(t);
  const question = /\?\s*$/.test(t) || /^(is|does|has|will|can|where|what|why|how|waar|wat|heeft|bevat|waarom|hoe)\b/.test(t);
  const several = (list, lead) => {
    const cards = engine.search(reviews, profile, { ids: list.map((p) => p.id) }).sort((a, b) => (b.reviewsOpen - a.reviewsOpen) || (b.all.n - a.all.n) || (b.score - a.score));
    const pick = cards.slice(0, 3), closed = pick.filter((c) => !c.reviewsOpen);
    const kinds = [...new Set(closed.map((c) => c.kind + "s"))];
    return say(`${lead}${list.length > pick.length ? ` (${list.length} in our list)` : ""}, these come closest. Which one do you mean?${closed.length ? ` Reviews aren't open yet for ${kinds.join(" and ")}, but you can still see the ingredient check.` : ""}`,
      pick.map((c) => c.id), ["The first one", "The second one", pick.length > 2 ? "The third one" : ""].filter(Boolean), "my_product");
  };
  const one = (id, lead = "") => { const c = cardOf(id); return say(lead + productAnswer(c, intent), [c.id], followChips(c), c.reviewsOpen ? "my_product" : "other"); };

  // 1. She names a product.
  const men = mentioned(t);
  const named = () => men.list.length === 1 ? one(men.list[0].id, men.sure ? "" : "I think you mean this one. ") : men.list.length > 1 ? several(men.list, men.brand ? `From ${men.brand}` : "I found a few that could be it") : null;
  if (men.sure) return named();
  // 2. She picks one of the products I just asked about ("the second one", "the gel cream").
  if (shown.length > 1 && /which one/i.test(prevBot)) {
    const ord = [/\b(first|eerste|1st|top)\b|^1$/, /\b(second|tweede|2nd|middle)\b|^2$/, /\b(third|derde|3rd)\b|^3$/].findIndex((r) => r.test(t));
    if (/\b(last|laatste)\b/.test(t)) return one(shown[shown.length - 1]);
    if (ord >= 0 && shown[ord]) return one(shown[ord]);
    const w = new Set(toks(t)), names = shown.map((id) => new Set(toks(engine.BY_ID[id].name + " " + engine.kindOf(engine.BY_ID[id]))));
    const sc = names.map((n) => [...w].filter((x) => x.length >= 3 && n.has(x) && !names.every((m) => m.has(x))).length), best = Math.max(...sc);
    const tied = shown.filter((id, i) => sc[i] === best);
    if (best > 0 && tied.length === 1) return one(tied[0]);
    if (best > 0 && tied.length < shown.length) return several(tied.map((id) => engine.BY_ID[id]), "Of those");
    const said = [...w].filter((x) => x.length >= 3 && !["the", "een", "het", "one", "die"].includes(x));
    if (said.length && said.every((x) => names.some((n) => n.has(x))))
      return say(`That fits ${shown.length === 2 ? "both" : "all " + shown.length} of them. Which one do you mean: the first${shown.length > 2 ? ", second or third" : " or the second"}?`, [], ["The first one", "The second one", shown.length > 2 ? "The third one" : ""].filter(Boolean), "my_product");
  }
  if (men.list.length) return named();
  // 2b. A question about the product we were just looking at.
  if (intent && shown.length && (pronoun || (question && !parseWant(t, {}).cat)) && !/\b(one|something|anything|iets|eentje)\b/.test(t.replace(/(that|this|first) one/g, ""))) {
    const c = cardOf(shown[0]);
    return say(productAnswer(c, intent), [], followChips(c).filter((x) => !ASK[intent].test(x.toLowerCase())).concat(["Something cheaper"]).slice(0, 3), "my_product");
  }
  // 3. Another kind of product than we recommend yet.
  if (OTHER_KIND.test(t) && !/sun|spf|zon|dagcr|day ?cream|moistur/.test(t))
    return say("For now I can only suggest face sunscreens and moisturisers; reviews for other kinds aren't open yet. Name the one you use, or scan it, and I'll show you its ingredient check.", [], ["A sunscreen", "A moisturiser", "Scan my product"]);

  // 4. What she is looking for, built up over the conversation.
  const q = {};
  const aboutIt = (u) => /\b(it|this|that|deze|dit|het)\b/.test(u) && Object.keys(ASK).some((k) => ASK[k].test(u));
  users.forEach((u, i) => {
    if (aboutIt(u) && i < users.length - 1) return;                       // a question about one product is not a filter
    const own = parseWant(u, {});
    if (own.cat && q.cat && own.cat !== q.cat) Object.keys(q).forEach((k) => delete q[k]);   // a new kind starts a new search
    parseWant(u, q);
  });
  if (!q.cat && (ctx.cat === "sun" || ctx.cat === "moist")) q.cat = ctx.cat;
  const fresh = parseWant(t, {});
  const cheaper = /cheaper|goedkoper|less expensive|too expensive|te duur|lower price/.test(t);
  const another = /something else|anything else|another|other option|more option|different one|iets anders|andere|show me more/.test(t);
  const understood = Object.keys(fresh).length > 0 || cheaper || another || /any shop|any price|elke winkel|elke prijs/.test(t);
  if (cheaper) { const base = shown.length ? (engine.BY_ID[shown[0]] || {}).price : q.max; if (base) q.max = Math.max(1, Math.round((base - 0.01) * 100) / 100); }

  const closed = shown.length && !engine.isOpen(engine.BY_ID[shown[0]]) ? engine.kindOf(engine.BY_ID[shown[0]]) : null;
  if (closed && (cheaper || another) && !fresh.cat)
    return say(`Reviews for ${closed}s aren't open yet, so I can't suggest another one. I can find you a sunscreen or a moisturiser, or check another product you name.`, [], ["A sunscreen", "A moisturiser", "Scan my product"]);
  if (!q.cat) {
    const kindChips = ["A sunscreen", "A moisturiser", "Scan my product"];
    if (/^\s*(hi|hello|hey|hoi|hallo)\b/.test(t)) return say("Hi! Tell me what you're looking for, or name a product you're thinking of buying.", [], kindChips);
    const left = toks(t).filter((w) => !DESCRIBE.has(w) && !SMALL.has(w));
    if (left.length) return say(`I couldn't find "${left.slice(0, 5).join(" ")}" in our list. Try the brand and product name together, or scan the pack.`, [], kindChips);
    const ask = "I can look for that. Should it be a sunscreen or a moisturiser? Those are the two I have reviews for.";
    return say(prevBot === ask ? "Pick a sunscreen or a moisturiser and I'll use what you've told me so far." : ask, [], kindChips);
  }
  if (!understood)
    return say(`I didn't catch that. I'm still looking at ${wantLabel(q)} for you. You can narrow it down, or name a product and I'll check it.`, [], ["Cheaper", "Fragrance-free", "Another option"], topicOf(q.cat));

  let list = engine.rank(reviews, profile, q);
  if (another && shown.length) { const rest = list.filter((x) => !shown.includes(x.id)); if (rest.length) list = rest; }
  list = list.slice(0, 2);
  if (!list.length) return say(`Nothing in our list fits ${wantLabel(q)} yet. Want me to drop one of the filters?`, [], [q.shop ? "Any shop" : "", q.max ? "Any price" : "", "Another option"].filter(Boolean).slice(0, 3), topicOf(q.cat));
  const top = list[0], label = wantLabel(q);
  const chips = [q.max ? "" : "Cheaper", q.ff ? "" : "Fragrance-free", "Another option", "Will it break me out?"].filter(Boolean).slice(0, 3);
  if (q.nobreak && fresh.nobreak) { const b = top.breakouts; return say(`Fewest breakouts for you: ${top.name}. ${b.n} of ${b.of} ${b.who === "peer" ? "women with skin like yours" : "reviewers"} said it broke them out. That's what women reported, not a promise for your skin.`, list.map((x) => x.id), chips, topicOf(q.cat)); }
  return say(`${another ? "Another one" : "Top pick"} for you among ${label}: ${top.name}. ${evidenceLine(top)}.`, list.map((x) => x.id), chips, topicOf(q.cat));
}

async function chat({ messages, profile, reviews, samples, context }) {
  const last = (messages[messages.length - 1] || {}).text || "";
  const medicalHint = MEDICAL.test(last);
  const ctx = { shown: context && Array.isArray(context.shown) ? context.shown.map(String).filter((id) => engine.BY_ID[id]).slice(0, 3) : [], cat: context && context.cat };
  const cands = [...engine.rank(reviews, profile, { cat: "sun" }).slice(0, 12), ...engine.rank(reviews, profile, { cat: "moist" }).slice(0, 12)];
  let out = null, usedAI = false;
  if (hasKey()) {
    const msgs = messages.slice(-8).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: String(m.text || "").slice(0, 1500) || "…" }));
    while (msgs.length && msgs[0].role !== "user") msgs.shift();
    try { out = parseJSON(await claude({ system: SYSTEM(profile, cands, samples, extras(messages, ctx, cands, reviews, profile)), messages: msgs })); usedAI = !!out; } catch (e) { console.error(e.message); }
  }
  if (!out || typeof out.reply !== "string") out = fallback(messages, profile, reviews, ctx);
  const ids = [...new Set((Array.isArray(out.products) ? out.products : []).map(String))].filter((id) => engine.BY_ID[id]).slice(0, 3);
  return {
    reply: out.reply.slice(0, 1200),
    products: engine.search(reviews, profile, { ids }),
    chips: (Array.isArray(out.chips) ? out.chips : []).map(String).filter(Boolean).slice(0, 3),
    topic: String(out.topic || "other").slice(0, 30),
    medical: !!out.medical || (medicalHint && out.topic === "medical"),
    ai: usedAI
  };
}
// Products outside the ranked candidates that the conversation is about: ones she names, and ones just shown to her.
function extras(messages, ctx, cands, reviews, profile) {
  const have = new Set(cands.map((c) => c.id));
  const named = messages.filter((m) => m.role !== "assistant").slice(-3).flatMap((m) => mentioned(m.text).list.slice(0, 4).map((p) => p.id));
  const ids = [...new Set([...named, ...(ctx.shown || [])])].filter((id) => !have.has(id)).slice(0, 8);
  return { cards: engine.search(reviews, profile, { ids }), shown: ctx.shown || [] };
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
module.exports = { chat, identify, hasKey, MEDICAL, fallback, mentioned };
