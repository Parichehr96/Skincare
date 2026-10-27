const { redis, LIST } = require("./_store");

const COLS = ["receivedAt","group","lang","v","durationSec","product","q1","q2","q3","q4","q5","q6","q7","q8","q9","q10","q11","q12","q13","q14","q15"];
const cell = (v) => {
  if (v == null) return "";
  const s = Array.isArray(v) ? v.join(";") : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

module.exports = async (req, res) => {
  const key = process.env.EXPORT_KEY;
  if (!key || key.length < 16 || req.query.key !== key) return res.status(401).send("Not allowed");
  try {
    const contacts = req.query.type === "contacts";
    const cols = contacts ? ["receivedOn", "contact", "wants"] : COLS;
    const rows = (await redis(["LRANGE", contacts ? "survey:contacts" : LIST, "0", "-1"])) || [];
    const lines = [cols.join(",")];
    for (const raw of rows) {
      let r; try { r = JSON.parse(raw); } catch (e) { continue; }
      lines.push(cols.map((c) => cell(r[c])).join(","));
    }
    if (req.query.format === "count") return res.status(200).json({ responses: rows.length });
    if (req.query.format === "json" && !contacts) {
      const list = [];
      for (const raw of rows) { try { list.push(JSON.parse(raw)); } catch (e) {} }
      let contactCount = 0;
      try { contactCount = (await redis(["LLEN", "survey:contacts"])) || 0; } catch (e) {}
      res.setHeader("Cache-Control", "no-store");
      return res.status(200).json({ responses: list, contacts: contactCount, at: new Date().toISOString() });
    }
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="skincare-survey-${contacts ? "contacts" : "responses"}.csv"`);
    res.setHeader("Cache-Control", "no-store");
    return res.status(200).send("﻿" + lines.join("\r\n"));
  } catch (e) {
    console.error(e.message);
    return res.status(500).send("Could not read responses");
  }
};
