const { redis } = require("./_store");

// Contact details are kept in their own list, with no link to survey answers.
const LIST = "survey:contacts";

module.exports = async (req, res) => {
  if (req.method !== "POST") { res.setHeader("Allow", "POST"); return res.status(405).json({ error: "method_not_allowed" }); }
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = null; } }
  if (!body || typeof body !== "object") return res.status(400).json({ error: "bad_request" });
  if (body.website) return res.status(200).json({ ok: true });
  const contact = typeof body.contact === "string" ? body.contact.trim().slice(0, 80) : "";
  const email = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(contact);
  const digits = contact.replace(/\D/g, "");
  const phone = /^[+\d\s().-]+$/.test(contact) && digits.length >= 9 && digits.length <= 15;
  if (!email && !phone) return res.status(400).json({ error: "invalid_contact" });
  const wants = Array.isArray(body.wants) ? body.wants.filter((w) => w === "talk" || w === "results") : [];
  try {
    // Only the day is stored, not the time, so a contact can't be matched to an answer by timestamp.
    await redis(["RPUSH", LIST, JSON.stringify({ contact, wants, receivedOn: new Date().toISOString().slice(0, 10) })]);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: "could_not_save" });
  }
};
