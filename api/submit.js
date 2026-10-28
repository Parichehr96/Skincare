const { redis, LIST } = require("./_store");

const QUESTIONS = ["q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12","q13","q14","q15"];

function clean(body) {
  const out = {};
  for (const k of QUESTIONS) {
    const v = body[k];
    if (Array.isArray(v)) out[k] = v.filter((x) => typeof x === "string").slice(0, 12).map((x) => x.slice(0, 40));
    else if (typeof v === "string") out[k] = v.slice(0, k === "q15" ? 1000 : 40);
  }
  if (typeof body.q5o === "string") out.q5o = body.q5o.slice(0, 40);
  if (typeof body.product === "string") out.product = body.product.slice(0, 20);
  if (typeof body.group === "string") out.group = body.group.toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 32);
  if (typeof body.lang === "string") out.lang = body.lang.slice(0, 5);
  if (Number.isFinite(body.durationSec)) out.durationSec = Math.max(0, Math.min(86400, Math.round(body.durationSec)));
  if (Number.isFinite(body.v)) out.v = body.v;
  out.receivedAt = new Date().toISOString();
  return out;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== "object" || Array.isArray(body)) return res.status(400).json({ error: "bad_request" });
  if (JSON.stringify(body).length > 8000) return res.status(413).json({ error: "too_large" });
  if (body.website) return res.status(200).json({ ok: true }); // spam bots fill the hidden field
  try {
    await redis(["RPUSH", LIST, JSON.stringify(clean(body))]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: "could_not_save" });
  }
};
