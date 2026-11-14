// Engine smoke test: rank and detail for a sunscreen, a day cream and a synthetic shelf-only product.
// Run: node tools/apptest/smoke.js
const assert = require("assert");
const path = require("path");
const engine = require(path.join(__dirname, "../../api/_app/engine.js"));
const fixture = require("./fixture-other.json");
engine._addTestProducts(fixture);

const me = { age: "25-34", type: "combination", tone: 3, sun: "burns-tans", budget: "10-20", concerns: ["sensitivity"], concernsConsent: true };
const reviews = engine.allReviews([], true);
// a stray review of a shelf-only product must never count
reviews.push({ id: "r_x", p: fixture[0].id, a: "y", s: "e", g: { type: "combination", age: "25-34", tone: 3, sun: "burns-tans" }, f: [], x: [], n: "stray" });

const all = engine.rank(reviews, me, {});
assert(all.length > 1000, "rank returns the catalogue");
assert(all.every((c) => c.cat === "sun" || c.cat === "moist"), "rank only has sun/moist");
assert(all.every((c) => c.kind === "sunscreen" || c.kind === "day cream"), "cards carry kind");
assert(!engine.rank(reviews, me, { cat: "other" }).length, "cat=other gives nothing in rank");
assert(!engine.rank(reviews, me, { q: "Testmerk" }).length, "search in rank never finds other kinds");

const sun = engine.rank(reviews, me, { cat: "sun" })[0];
const moist = engine.rank(reviews, me, { cat: "moist" })[0];
for (const c of [sun, moist]) {
  const d = engine.detail(reviews, me, c.id, false);
  assert(d && d.product.id === c.id && d.product.reviewsOpen === true, "detail for " + c.cat);
  assert(Array.isArray(d.product.hints), "hints present");
}
assert.strictEqual(sun.kind, "sunscreen"); assert.strictEqual(moist.kind, "day cream");

const o = engine.detail(reviews, me, fixture[0].id, true);
assert(o, "detail works for other");
assert.strictEqual(o.product.cat, "other"); assert.strictEqual(o.product.kind, "serum"); assert.strictEqual(o.product.reviewsOpen, false);
assert.strictEqual(o.stats.all.n, 0, "no review numbers for other kinds");
assert.strictEqual(o.reviews.length, 0); assert.strictEqual(o.locked, 0);
assert(o.product.basis === "outside" && o.product.outside.source === "Kruidvat", "shop rating labelled with its source");
assert(o.product.flags.acids.includes("Glycolic acid") && o.product.flags.retinoids.includes("Retinol"));
assert(o.product.similarList.length === 1 && o.product.similarList[0].id === fixture[1].id, "similar formula of the same kind");
assert(o.product.hints.length, "hints for other");

const found = engine.search(reviews, me, { q: "testmerk" });
assert.strictEqual(found.length, 3, "search finds all kinds");
const mixed = engine.search(reviews, me, { q: "nivea" });
assert(mixed.length && mixed[0].reviewsOpen, "open kinds first in search");
const byIds = engine.search(reviews, me, { ids: [fixture[2].id, sun.id, "nope"] });
assert.deepStrictEqual(byIds.map((c) => c.id), [fixture[2].id, sun.id], "ids lookup keeps order, drops unknown");
assert.strictEqual(byIds[0].kind, "cleanser");

assert(engine.isOpen(engine.BY_ID[sun.id]) && !engine.isOpen(engine.BY_ID[fixture[0].id]));
console.log("smoke ok:", all.length, "ranked;", sun.name, "/", moist.name, "/", o.product.name);
