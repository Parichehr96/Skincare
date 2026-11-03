// Sends the sign-in code. Uses Resend if RESEND_API_KEY is set, otherwise SMTP (for example Gmail
// with an app password) if SMTP_USER and SMTP_PASS are set. Returns { sent, provider }.
function provider() {
  if (process.env.RESEND_API_KEY) return "resend";
  if (process.env.SMTP_USER && process.env.SMTP_PASS) return "smtp";
  return null;
}
async function sendCode(email, code) {
  const subject = `${code} is your Skin Peers code`;
  const text = `Your sign-in code is ${code}.\n\nIt works for 10 minutes. If you didn't ask for it, you can ignore this email.\n\nSkin Peers`;
  const html = `<div style="font-family:Arial,sans-serif;font-size:16px;color:#15241C"><p>Your sign-in code is</p><p style="font-size:32px;font-weight:700;letter-spacing:6px;margin:8px 0 16px">${code}</p><p style="color:#53645B">It works for 10 minutes. If you didn't ask for it, you can ignore this email.</p></div>`;
  const p = provider();
  if (p === "resend") {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM || "Skin Peers <onboarding@resend.dev>", to: [email], subject, text, html })
    });
    if (!r.ok) throw new Error("mail_failed_" + r.status);
    return { sent: true, provider: p };
  }
  if (p === "smtp") {
    const nodemailer = require("nodemailer");
    const t = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com", port: Number(process.env.SMTP_PORT || 465), secure: (process.env.SMTP_PORT || "465") === "465",
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await t.sendMail({ from: process.env.MAIL_FROM || `Skin Peers <${process.env.SMTP_USER}>`, to: email, subject, text, html });
    return { sent: true, provider: p };
  }
  return { sent: false, provider: null };
}
module.exports = { sendCode, provider };
