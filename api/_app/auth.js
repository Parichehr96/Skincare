// Email sign-in with a 6-digit code. Sessions are random tokens kept for 90 days.
const crypto = require("crypto");
const db = require("./db");
const mail = require("./mail");

const SESSION_DAYS = 90;
const hash = (s) => crypto.createHash("sha256").update(s).digest("hex");
const normEmail = (e) => String(e || "").trim().toLowerCase();
const validEmail = (e) => /^[^\s@]{1,64}@[^\s@]{1,190}\.[a-z]{2,}$/i.test(e);
const testMode = () => process.env.AUTH_TEST_MODE === "1";

async function start(body) {
  const email = normEmail(body.email);
  if (!validEmail(email)) return [400, { error: "invalid_email" }];
  if (!(await db.limit("code:" + hash(email), 5, 3600))) return [429, { error: "too_many_codes" }];
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
  await db.setJSON("app:code:" + hash(email), { h: hash(code + email), tries: 0 }, "EX", 600);
  let res = { sent: false };
  try { res = await mail.sendCode(email, code); } catch (e) { console.error(e.message); if (!testMode()) return [502, { error: "mail_failed" }]; }
  if (!res.sent && !testMode()) return [503, { error: "mail_not_configured" }];
  return [200, { ok: true, sent: res.sent, testCode: !res.sent && testMode() ? code : undefined }];
}

async function verify(body) {
  const email = normEmail(body.email);
  const code = String(body.code || "").replace(/\D/g, "");
  const key = "app:code:" + hash(email);
  const rec = await db.getJSON(key);
  if (!rec) return [400, { error: "code_expired" }];
  if (rec.tries >= 5) { await db.cmd("DEL", key); return [400, { error: "too_many_tries" }]; }
  if (rec.h !== hash(code + email)) { rec.tries++; await db.setJSON(key, rec, "KEEPTTL"); return [400, { error: "wrong_code" }]; }
  await db.cmd("DEL", key);
  let uid = await db.cmd("GET", "app:email:" + hash(email));
  let isNew = false;
  if (!uid) {
    uid = "u_" + crypto.randomBytes(9).toString("base64url");
    isNew = true;
    const user = { id: uid, email, createdAt: new Date().toISOString(), profile: null, seenIntro: false, unlocked: false, reminders: true };
    await db.pipe([["SET", "app:user:" + uid, JSON.stringify(user)], ["SET", "app:email:" + hash(email), uid], ["SADD", "app:users", uid]]);
  }
  const token = crypto.randomBytes(24).toString("base64url");
  await db.pipe([["SET", "app:sess:" + hash(token), uid, "EX", SESSION_DAYS * 86400], ["SADD", "app:usess:" + uid, hash(token)]]);
  await db.track(isNew ? "signup" : "signin");
  return [200, { token, isNew }];
}

async function userFrom(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+([A-Za-z0-9_-]{20,})$/);
  if (!m) return null;
  const uid = await db.cmd("GET", "app:sess:" + hash(m[1]));
  if (!uid) return null;
  const user = await db.getJSON("app:user:" + uid);
  if (user) user._token = hash(m[1]);
  return user;
}
async function logout(user) { await db.pipe([["DEL", "app:sess:" + user._token], ["SREM", "app:usess:" + user.id, user._token]]); return [200, { ok: true }]; }
module.exports = { start, verify, userFrom, logout, hash };
