// Shared helper: talks to Upstash Redis over its REST API (no packages needed).
const URL_ = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const LIST = "survey:responses";

async function redis(command) {
  if (!URL_ || !TOKEN) throw new Error("storage_not_configured");
  const r = await fetch(URL_, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command)
  });
  if (!r.ok) throw new Error("storage_failed_" + r.status);
  return (await r.json()).result;
}

module.exports = { redis, LIST };
