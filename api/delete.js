// Deletes one answer, or one sign-up. Used by the delete buttons in results.html.
// POST { key, raw, list? } where raw is the stored item exactly as /api/export?format=json returned it,
// and list is "contacts" for a sign-up (anything else means an answer).
const { redis, LIST } = require("./_store");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const key = process.env.EXPORT_KEY;
  if (!key || key.length < 16 || !body || body.key !== key) return res.status(401).json({ error: "not_allowed" });
  if (typeof body.raw !== "string" || !body.raw || body.raw.length > 10000) return res.status(400).json({ error: "bad_request" });
  try {
    const target = body.list === "contacts" ? "survey:contacts" : LIST;
    const removed = await redis(["LREM", target, "1", body.raw]);
    return res.status(200).json({ ok: true, removed: removed || 0 });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: "could_not_delete" });
  }
};
