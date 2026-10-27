// Shared helper: talks to Upstash Redis over its REST API (no packages needed).
// Vercel names these settings differently depending on how the database was connected,
// so look for any REST URL / token pair instead of one fixed name.
function findEnv() {
  const env = process.env;
  const keys = Object.keys(env);
  const pick = (names, test) => {
    for (const n of names) if (env[n]) return env[n];
    const k = keys.find(test);
    return k ? env[k] : undefined;
  };
  const url = pick(["KV_REST_API_URL", "UPSTASH_REDIS_REST_URL"], (k) => /REST_(API_)?URL$/.test(k) && /^https:/.test(env[k] || ""));
  const token = pick(["KV_REST_API_TOKEN", "UPSTASH_REDIS_REST_TOKEN"], (k) => /REST_(API_)?TOKEN$/.test(k) && !/READ_ONLY/.test(k));
  return { url, token };
}
const LIST = "survey:responses";

async function redis(command) {
  const { url, token } = findEnv();
  if (!url || !token) throw new Error("storage_not_configured");
  const r = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  if (!r.ok) throw new Error("storage_failed_" + r.status);
  return (await r.json()).result;
}

module.exports = { redis, LIST, findEnv };
