// Deletes all survey answers and sign-ups. Used by the "Delete all answers" button on results.html.
// Needs a POST with the export key and the word DELETE in the body, so it can't be triggered by opening a link.
const { redis } = require("./_store");

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  const key = process.env.EXPORT_KEY;
  if (!key || key.length < 16 || !body || body.key !== key) return res.status(401).json({ error: "not_allowed" });
  if (body.confirm !== "DELETE") return res.status(400).json({ error: "confirm_required" });
  try {
    const responses = (await redis(["LLEN", "survey:responses"])) || 0;
    const contacts = (await redis(["LLEN", "survey:contacts"])) || 0;
    await redis(["DEL", "survey:responses", "survey:contacts"]);
    return res.status(200).json({ ok: true, deleted: { responses, contacts } });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: "could_not_delete" });
  }
};
