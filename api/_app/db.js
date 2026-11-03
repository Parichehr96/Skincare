// Storage helpers for the app (Upstash Redis over REST), built on the survey's _store.js.
const { findEnv } = require("../_store");

async function call(path, body) {
  const { url, token } = findEnv();
  if (!url || !token) throw new Error("storage_not_configured");
  const r = await fetch(url + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok) throw new Error("storage_failed_" + r.status);
  return r.json();
}
async function cmd(...args) { return (await call("", args)).result; }
async function pipe(cmds) {
  if (!cmds.length) return [];
  const out = await call("/pipeline", cmds);
  return out.map((x) => x.result);
}
const getJSON = async (key) => { const v = await cmd("GET", key); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
const setJSON = (key, val, ...extra) => cmd("SET", key, JSON.stringify(val), ...extra);
const today = () => new Date().toISOString().slice(0, 10);

// Usage counters for the analytics panel. Never store message text or personal data here.
async function track(...names) {
  const d = today();
  const cmds = [];
  for (const n of names) { cmds.push(["HINCRBY", "app:stats:total", n, 1], ["HINCRBY", "app:stats:d:" + d, n, 1]); }
  cmds.push(["EXPIRE", "app:stats:d:" + d, 60 * 60 * 24 * 400]);
  try { await pipe(cmds); } catch (e) {}
}
// Simple fixed-window rate limit. Returns true when the call is allowed.
async function limit(key, max, seconds) {
  const k = "app:rl:" + key;
  const [n] = await pipe([["INCR", k], ["EXPIRE", k, seconds, "NX"]]);
  return n <= max;
}
module.exports = { cmd, pipe, getJSON, setJSON, track, limit, today };
