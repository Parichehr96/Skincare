// Skin Peers app API. One function so the free Vercel plan's function limit isn't an issue.
// Call it as /api/app?r=<route>. Signed-in calls send "Authorization: Bearer <token>".
const crypto = require("crypto");
const db = require("./_app/db");
const auth = require("./_app/auth");
const engine = require("./_app/engine");
const ai = require("./_app/ai");
const mail = require("./_app/mail");

const AGES = ["18-24", "25-34", "35-44", "45-54", "55+"];
const TYPES = ["dry", "oily", "combination", "normal", "unsure"];
const SUNS = ["burns", "burns-tans", "tans"];
const BUDGETS = ["u10", "10-20", "20-35", "any"];
const CONCERNS = ["breakouts", "redness", "dark spots", "dryness", "sensitivity", "fine lines"];
const FEEL = ["hydrated", "greasy", "still tight", "stings", "broke out", "no change", "white cast", "no white cast"];
const EXTRA = ["good under makeup", "pills", "too expensive", "lasts long"];
const EVENTS = ["intro_done", "intro_skip", "matches_view", "product_view", "buy_click", "scan_open", "barcode", "share", "runout_rebuy", "runout_switch", "why_unlock"];

const sendJSON = (res, code, obj) => { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(obj)); };
const body = (req) => { let b = req.body; if (typeof b === "string") { try { b = JSON.parse(b); } catch (e) { b = {}; } } return b && typeof b === "object" ? b : {}; };
const pick = (v, list) => (list.includes(v) ? v : null);
const isAdmin = (k) => { const key = process.env.EXPORT_KEY; return !!key && key.length >= 16 && k === key; };

async function samplesOn() { const v = await db.cmd("GET", "app:cfg:samples"); return v !== "off"; }
async function realReviews() { return ((await db.cmd("LRANGE", "app:reviews", "0", "-1")) || []).map((s) => { try { return { ...JSON.parse(s), _raw: s }; } catch (e) { return null; } }).filter(Boolean); }
async function reviewsFor() { const [real, on] = await Promise.all([realReviews(), samplesOn()]); return { all: engine.allReviews(real, on), real, on }; }
async function saveUser(u) { const { _token, ...clean } = u; await db.setJSON("app:user:" + u.id, clean); }
function publicUser(u) { const { _token, ...rest } = u; return rest; }

function cleanProfile(p) {
  if (!p || typeof p !== "object") return null;
  const out = { age: pick(p.age, AGES), type: pick(p.type, TYPES), tone: Math.min(8, Math.max(1, parseInt(p.tone, 10) || 0)) || null, sun: pick(p.sun, SUNS), budget: pick(p.budget, BUDGETS) || "any",
    concernsConsent: !!p.concernsConsent, concerns: [] };
  if (out.concernsConsent && Array.isArray(p.concerns)) out.concerns = [...new Set(p.concerns.filter((c) => CONCERNS.includes(c)))];
  if (!out.age || !out.type) return null;
  return out;
}
function cleanShelf(items) {
  if (!Array.isArray(items)) return [];
  const seen = new Set(), out = [];
  for (const it of items.slice(0, 100)) {
    if (!it || typeof it !== "object") continue;
    const pid = String(it.pid || "").slice(0, 80);
    const custom = !engine.BY_ID[pid];
    if (!pid || seen.has(pid)) continue;
    seen.add(pid);
    out.push({ pid, status: it.status === "stopped" ? "stopped" : "using", since: typeof it.since === "string" ? it.since.slice(0, 30) : new Date().toISOString(),
      reason: it.reason ? String(it.reason).slice(0, 60) : null, name: custom ? String(it.name || pid).slice(0, 120) : undefined, cat: custom ? (it.cat === "sun" ? "sun" : "moist") : undefined,
      reviewed: { early: !!(it.reviewed && it.reviewed.early), late: !!(it.reviewed && it.reviewed.late) } });
  }
  return out;
}

async function deleteUser(u) {
  const [real, sess] = await Promise.all([realReviews(), db.cmd("SMEMBERS", "app:usess:" + u.id)]);
  const cmds = real.filter((r) => r.uid === u.id).map((r) => ["LREM", "app:reviews", "1", r._raw]);
  for (const s of sess || []) cmds.push(["DEL", "app:sess:" + s]);
  cmds.push(["DEL", "app:usess:" + u.id], ["DEL", "app:shelf:" + u.id], ["DEL", "app:user:" + u.id], ["DEL", "app:email:" + auth.hash(u.email)], ["SREM", "app:users", u.id]);
  await db.pipe(cmds);
}

async function adminStats() {
  const days = [...Array(30)].map((_, i) => new Date(Date.now() - i * 864e5).toISOString().slice(0, 10)).reverse();
  const uids = (await db.cmd("SMEMBERS", "app:users")) || [];
  const [total, topics, gaps, on, ...dayRows] = await db.pipe([["HGETALL", "app:stats:total"], ["HGETALL", "app:stats:topics"], ["ZREVRANGE", "app:gaps", "0", "24", "WITHSCORES"], ["GET", "app:cfg:samples"], ...days.map((d) => ["HGETALL", "app:stats:d:" + d])]);
  const toObj = (arr) => { const o = {}; for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]); return o; };
  const users = uids.length ? (await db.cmd("MGET", ...uids.map((u) => "app:user:" + u))).map((s) => { try { return JSON.parse(s); } catch (e) { return null; } }).filter(Boolean) : [];
  const dist = (k) => { const o = {}; for (const u of users) if (u.profile && u.profile[k] != null) o[u.profile[k]] = (o[u.profile[k]] || 0) + 1; return o; };
  const conc = {}; for (const u of users) for (const c of (u.profile && u.profile.concerns) || []) conc[c] = (conc[c] || 0) + 1;
  const real = await realReviews();
  const perProduct = {}; for (const r of real) perProduct[r.p] = (perProduct[r.p] || 0) + 1;
  const again = { y: 0, m: 0, n: 0 }; for (const r of real) again[r.a] = (again[r.a] || 0) + 1;
  return {
    at: new Date().toISOString(), samples: on !== "off",
    users: users.length, onboarded: users.filter((u) => u.profile).length, unlocked: users.filter((u) => u.unlocked).length, consent: users.filter((u) => u.profile && u.profile.concernsConsent).length,
    totals: toObj(total), topics: toObj(topics), gaps: toObj(gaps),
    days: days.map((d, i) => ({ d, ...toObj(dayRows[i]) })),
    profiles: { type: dist("type"), age: dist("age"), tone: dist("tone"), budget: dist("budget"), concerns: conc },
    reviews: { real: real.length, early: real.filter((r) => r.s === "e").length, late: real.filter((r) => r.s === "l").length, again, products: Object.keys(perProduct).length,
      top: Object.entries(perProduct).sort((a, b) => b[1] - a[1]).slice(0, 15).map(([id, n]) => ({ id, name: (engine.BY_ID[id] || {}).name || id, n })) },
    config: { ai: ai.hasKey(), email: mail.provider() || (process.env.AUTH_TEST_MODE === "1" ? "test mode" : "not set up"), model: process.env.AI_MODEL || "claude-haiku-5-5" }
  };
}

module.exports = async (req, res) => {
  const r = String(req.query.r || "");
  const m = req.method;
  try {
    // ----- open routes
    if (r === "config" && m === "GET") return sendJSON(res, 200, { ai: ai.hasKey(), email: !!mail.provider(), testMode: process.env.AUTH_TEST_MODE === "1", products: engine.PRODUCTS.length });
    if (r === "auth/start" && m === "POST") { const [c, o] = await auth.start(body(req)); return sendJSON(res, c, o); }
    if (r === "auth/verify" && m === "POST") { const [c, o] = await auth.verify(body(req)); return sendJSON(res, c, o); }
    if (r === "admin/stats" && m === "GET") { if (!isAdmin(req.query.key)) return sendJSON(res, 401, { error: "not_allowed" }); return sendJSON(res, 200, await adminStats()); }
    if (r === "admin/samples" && m === "POST") { const b = body(req); if (!isAdmin(b.key)) return sendJSON(res, 401, { error: "not_allowed" }); await db.cmd("SET", "app:cfg:samples", b.on ? "on" : "off"); return sendJSON(res, 200, { ok: true, samples: !!b.on }); }

    // ----- signed-in routes
    const user = await auth.userFrom(req);
    if (!user) return sendJSON(res, 401, { error: "signed_out" });

    if (r === "auth/logout" && m === "POST") { const [c, o] = await auth.logout(user); return sendJSON(res, c, o); }
    if (r === "me" && m === "GET") { const shelf = (await db.getJSON("app:shelf:" + user.id)) || []; return sendJSON(res, 200, { user: publicUser(user), shelf }); }
    if (r === "me" && m === "PUT") {
      const b = body(req);
      if ("profile" in b) { const p = cleanProfile(b.profile); if (!p) return sendJSON(res, 400, { error: "bad_profile" }); const first = !user.profile; user.profile = p; if (first) await db.track("onboard_done"); }
      if ("seenIntro" in b) user.seenIntro = !!b.seenIntro;
      if ("reminders" in b) user.reminders = !!b.reminders;
      if (b.deleteConcerns && user.profile) { user.profile.concerns = []; user.profile.concernsConsent = false; }
      await saveUser(user);
      return sendJSON(res, 200, { user: publicUser(user) });
    }
    if (r === "me" && m === "DELETE") { await deleteUser(user); await db.track("account_delete"); return sendJSON(res, 200, { ok: true }); }
    if (r === "me/export" && m === "GET") {
      const [shelf, real] = await Promise.all([db.getJSON("app:shelf:" + user.id), realReviews()]);
      await db.track("export");
      return sendJSON(res, 200, { exportedAt: new Date().toISOString(), account: publicUser(user), shelf: shelf || [], reviews: real.filter((x) => x.uid === user.id).map(({ _raw, uid, ...rest }) => rest), note: "Chat messages are kept only on your device and are not stored by Skin Peers." });
    }
    if (r === "shelf" && m === "GET") return sendJSON(res, 200, { shelf: (await db.getJSON("app:shelf:" + user.id)) || [] });
    if (r === "shelf" && m === "PUT") {
      const before = (await db.getJSON("app:shelf:" + user.id)) || [];
      const next = cleanShelf(body(req).shelf);
      // reviewed flags are set only by the server when a review is saved
      const prev = Object.fromEntries(before.map((x) => [x.pid, x.reviewed]));
      for (const it of next) it.reviewed = prev[it.pid] || { early: false, late: false };
      const added = next.filter((x) => !prev[x.pid]);
      for (const a of added.filter((x) => !engine.BY_ID[x.pid])) db.cmd("ZINCRBY", "app:gaps", 1, engine.norm(a.name).slice(0, 80)).catch(() => {});
      await db.setJSON("app:shelf:" + user.id, next);
      if (added.length) await db.track(...added.map(() => "shelf_add"));
      return sendJSON(res, 200, { shelf: next });
    }
    if (r === "products" && m === "GET") {
      const { all } = await reviewsFor();
      const q = req.query;
      const list = engine.rank(all, user.profile, { cat: pick(q.cat, ["sun", "moist"]), max: q.max ? Number(q.max) : null, shop: q.shop || null, ff: q.ff === "1", spf: q.spf === "1", light: q.light === "1", nocast: q.nocast === "1", nobreak: q.nobreak === "1", q: q.q ? String(q.q).slice(0, 60) : null });
      return sendJSON(res, 200, { products: list.slice(0, Number(q.limit) || 60), count: list.length });
    }
    if (r === "product" && m === "GET") {
      const { all } = await reviewsFor();
      const d = engine.detail(all, user.profile, String(req.query.id || ""), user.unlocked);
      if (!d) return sendJSON(res, 404, { error: "not_found" });
      await db.track("product_view");
      return sendJSON(res, 200, d);
    }
    if (r === "review" && m === "POST") {
      const b = body(req);
      const pid = String(b.pid || "");
      if (!engine.BY_ID[pid]) return sendJSON(res, 400, { error: "unknown_product" });
      if (!user.profile) return sendJSON(res, 400, { error: "no_profile" });
      const a = pick(b.again, ["y", "m", "n"]); if (!a) return sendJSON(res, 400, { error: "bad_review" });
      const s = b.stage === "late" ? "l" : "e";
      const p = user.profile;
      const rev = { id: "r_" + crypto.randomBytes(6).toString("base64url"), p: pid, a, s, uid: user.id, at: new Date().toISOString(),
        f: [...new Set((Array.isArray(b.feel) ? b.feel : []).concat(b.stopped === "broke me out" ? ["broke out"] : []))].filter((x) => FEEL.includes(x)), x: (Array.isArray(b.extra) ? b.extra : []).filter((x) => EXTRA.includes(x)),
        n: String(b.note || "").replace(/\s+/g, " ").trim().slice(0, 300), g: { type: p.type, age: p.age, tone: p.tone, sun: p.sun, c: p.concerns || [] } };
      const real = await realReviews();
      const cmds = real.filter((x) => x.uid === user.id && x.p === pid && x.s === s).map((x) => ["LREM", "app:reviews", "1", x._raw]);
      cmds.push(["RPUSH", "app:reviews", JSON.stringify(rev)]);
      await db.pipe(cmds);
      const firstUnlock = !user.unlocked; user.unlocked = true; await saveUser(user);
      const shelf = (await db.getJSON("app:shelf:" + user.id)) || [];
      let item = shelf.find((x) => x.pid === pid);
      if (!item) { item = { pid, status: "using", since: new Date().toISOString(), reviewed: { early: false, late: false } }; shelf.push(item); }
      item.reviewed = { ...(item.reviewed || {}), [s === "l" ? "late" : "early"]: true };
      if (b.stopped) { item.status = "stopped"; item.reason = String(b.stopped).slice(0, 60); }
      await db.setJSON("app:shelf:" + user.id, shelf);
      await db.track(s === "l" ? "review_late" : "review_early", ...(firstUnlock ? ["unlock"] : []));
      // Real women with skin like hers who use the app (one per account, sample reviews not counted).
      const mine = engine.features(p);
      const peers = new Set(real.filter((x) => x.uid && x.uid !== user.id && engine.sim(mine, x.g) >= engine.PEER_MIN).map((x) => x.uid)).size;
      return sendJSON(res, 200, { ok: true, firstUnlock, helps: peers, shelf });
    }
    if (r === "chat" && m === "POST") {
      const b = body(req);
      const msgs = Array.isArray(b.messages) ? b.messages.filter((x) => x && typeof x.text === "string").slice(-8) : [];
      if (!msgs.length) return sendJSON(res, 400, { error: "no_message" });
      const max = Number(process.env.AI_DAILY_LIMIT || 600);
      if (!(await db.limit("chat:" + user.id, 40, 3600))) return sendJSON(res, 429, { error: "slow_down" });
      if (ai.hasKey() && !(await db.limit("chatday:" + db.today(), max, 86400))) return sendJSON(res, 429, { error: "daily_limit" });
      const { all, on } = await reviewsFor();
      const out = await ai.chat({ messages: msgs, profile: user.profile, reviews: all, samples: on });
      const pipe = [["HINCRBY", "app:stats:topics", out.topic, 1]];
      await Promise.all([db.track("chat", ...(out.medical ? ["chat_medical"] : [])), db.pipe(pipe)]);
      return sendJSON(res, 200, out);
    }
    if (r === "identify" && m === "POST") {
      if (!(await db.limit("id:" + user.id, 30, 3600))) return sendJSON(res, 429, { error: "slow_down" });
      const out = await ai.identify(body(req));
      if (out.error) return sendJSON(res, out.error === "ai_not_configured" ? 503 : 400, out);
      await db.track("identify", ...(out.match ? ["identify_match"] : []));
      return sendJSON(res, 200, out);
    }
    if (r === "ean" && m === "GET") { const pid = await db.cmd("HGET", "app:ean", String(req.query.code || "").replace(/\D/g, "").slice(0, 14)); return sendJSON(res, 200, { pid: pid || null }); }
    if (r === "ean" && m === "POST") {
      const b = body(req); const code = String(b.code || "").replace(/\D/g, "").slice(0, 14);
      if (code.length >= 8 && engine.BY_ID[b.pid]) await db.cmd("HSET", "app:ean", code, b.pid);
      return sendJSON(res, 200, { ok: true });
    }
    if (r === "event" && m === "POST") { const n = body(req).name; if (EVENTS.includes(n)) await db.track(n); return sendJSON(res, 200, { ok: true }); }
    return sendJSON(res, 404, { error: "unknown_route" });
  } catch (e) {
    console.error(r, e.message);
    return sendJSON(res, 500, { error: e.message === "storage_not_configured" ? "storage_not_configured" : "server_error" });
  }
};
