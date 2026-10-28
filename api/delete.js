// Deletes one answer. Used by the delete button on each row of results.html.
// POST { key, raw } where raw is the stored answer exactly as /api/export?format=json returned it.
const { redis, LIST } = require("./_store");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const key = process.env.EXPORT_KEY;
  if (!key || key.length < 16 || !body || body.key !== key) return res.status(401).json({ error: "not_allowed" });
  if (typeof body.raw !== "string" || !body.raw || body.raw.length > 10000) return res.status(400).json({ error: "bad_request" });
  try {
    const removed = await redis(["LREM", LIST, "1", body.raw]);
    return res.status(200).json({ ok: true, removed: removed || 0 });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: "could_not_delete" });
  }
};
