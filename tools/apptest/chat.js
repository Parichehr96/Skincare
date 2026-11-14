// Checks that the rules-only chat follows a conversation: named products, picks, follow-up questions, filters that build up.
//   node tools/apptest/chat.js
const path = require("path"), assert = require("assert");
const engine = require(path.join(__dirname, "../../api/_app/engine.js")), ai = require(path.join(__dirname, "../../api/_app/ai.js"));
const reviews = engine.allReviews([], true);
const me = { type: "combination", age: "25-34", tone: 3, sun: "sometimes", budget: "10-20", concerns: ["breakouts"] };
function talk(lines) {
  const msgs = []; let ctx = { shown: [], cat: null }; const out = [];
  for (const l of lines) {
    msgs.push({ role: "user", text: l });
    const o = ai.fallback(msgs, me, reviews, ctx);
    assert(o.reply && typeof o.reply === "string", "no reply to: " + l);
    if (out.length) assert.notStrictEqual(o.reply, out[out.length - 1].reply, "repeated itself after: " + l);
    msgs.push({ role: "assistant", text: o.reply });
    if (o.products.length) ctx = { shown: o.products, cat: engine.BY_ID[o.products[0]].cat };
    out.push(o);
  }
  return out;
}
const name = (o, i = 0) => engine.BY_ID[o.products[i]].name;
let n = 0; const ok = (label, cond) => { assert(cond, label); n++; console.log("ok  ", label); };

let r = talk(["I want to buy how about Centella SKIN 1004 madagascar?", "the second one", "Is it fragrance-free?", "Where can I buy it?"]);
ok("a named brand is found, not answered with the opener", r[0].products.length > 1 && /SKIN1004/i.test(name(r[0])) && /which one/i.test(r[0].reply));
ok("'the second one' picks from what was shown", r[1].products.length === 1 && r[1].products[0] === r[0].products[1]);
ok("a question about 'it' is answered about that product", /fragrance|ingredient list/i.test(r[2].reply) && r[2].reply.includes(engine.BY_ID[r[1].products[0]].name));
ok("price question names a shop", /€\d+,\d\d at /.test(r[3].reply));

r = talk(["A sunscreen with no white cast", "Cheaper", "Fragrance-free", "Will it break me out?", "Another option", "asdf qwer"]);
ok("cheaper keeps the kind and lowers the price", engine.BY_ID[r[1].products[0]].cat === "sun" && engine.BY_ID[r[1].products[0]].price < engine.BY_ID[r[0].products[0]].price);
ok("a bare 'Fragrance-free' is a filter", r[2].products.length > 0 && r[2].products.every((id) => engine.BY_ID[id].flags.fragrance === false));
ok("breakout question is answered from reviews, without a promise", /broke them out|too few reviews/i.test(r[3].reply) && /not a promise/.test(r[3].reply));
ok("another option shows something else", r[4].products.length > 0 && r[4].products[0] !== r[2].products[0]);
ok("nonsense keeps the thread instead of starting over", /still looking at/.test(r[5].reply) && /sunscreens/.test(r[5].reply));

r = talk(["A moisturiser under €20", "does it have spf?", "a sunscreen at etos"]);
ok("'does it have spf?' is about the product, not a new search", r[1].products.length === 0 && /SPF/.test(r[1].reply));
ok("a new kind starts a new search", engine.BY_ID[r[2].products[0]].cat === "sun" && !/under/.test(r[2].reply));

r = talk(["something for sensitive skin", "I want my skin to glow", "A moisturiser"]);
ok("a vague wish gets a question back, twice without repeating", /sunscreen or a moisturiser/.test(r[0].reply) && r[1].reply !== r[0].reply);
ok("then the pick is used", engine.BY_ID[r[2].products[0]].cat === "moist");

r = talk(["zzzbrand glowmilk"]);
ok("an unknown product is named back, with a way forward", /couldn't find "zzzbrand glowmilk"/.test(r[0].reply) && r[0].chips.includes("Scan my product"));
r = talk(["a night cream"]);
ok("other kinds: no product suggested", r[0].products.length === 0 && /aren't open yet/.test(r[0].reply));
r = talk(["I have a rash on my cheek"]);
ok("symptoms go to the huisarts", r[0].medical === true && r[0].products.length === 0);
console.log(`chat ok: ${n} checks`);
