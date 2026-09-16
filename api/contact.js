const crypto = require("node:crypto");

const MAX_NAME = 80;
const MAX_EMAIL = 160;
const MAX_MESSAGE = 1200;
const ALLOWED_TYPES = new Set(["AI integration", "Web development", "Automation", "Design", "Other inquiry"]);

function clean(value, limit) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/g, "").trim().slice(0, limit);
}

function json(res, body, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.json(body);
}

function escaped(value) {
  return value.replace(/[&<>\"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" }[character]));
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return json(response, { error: "Method not allowed" }, 405);

  let payload = request.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (_) { payload = null; }
  }
  if (!payload || typeof payload !== "object") return json(response, { error: "Send a valid inquiry." }, 400);
  if (clean(payload.company, 120)) return json(response, { received: true }, 200);

  const name = clean(payload.name, MAX_NAME);
  const email = clean(payload.email, MAX_EMAIL).toLowerCase();
  const projectType = clean(payload.projectType, 40);
  const message = clean(payload.message, MAX_MESSAGE);
  if (name.length < 2) return json(response, { error: "Add your name so Julio knows who to reply to." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json(response, { error: "Add a valid reply email." }, 400);
  if (!ALLOWED_TYPES.has(projectType)) return json(response, { error: "Choose a project direction." }, 400);
  if (message.length < 8) return json(response, { error: "Add a little more context to the message." }, 400);
  if (/(https?:\/\/|www\.)/i.test(message) || /(.)\1{20,}/u.test(message)) return json(response, { error: "Please keep the inquiry link-light and human." }, 400);

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL || "padillajuliojose@gmail.com";
  const from = process.env.CONTACT_FROM_EMAIL;
  if (!apiKey || !from) return json(response, { configured: false, error: "Email delivery is not configured yet." }, 503);

  const requestId = crypto.randomUUID();
  const responseFromResend = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      reply_to: email,
      subject: `[Portfolio] ${projectType} · ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nProject type: ${projectType}\nRequest ID: ${requestId}\n\n${message}`,
      html: `<p><strong>Name:</strong> ${escaped(name)}</p><p><strong>Email:</strong> ${escaped(email)}</p><p><strong>Project type:</strong> ${escaped(projectType)}</p><p><strong>Request ID:</strong> ${requestId}</p><hr><p>${escaped(message).replace(/\n/g, "<br>")}</p>`,
    }),
  });
  if (!responseFromResend.ok) return json(response, { error: "The signal could not reach the inbox. Try the email link instead." }, 502);
  return json(response, { sent: true }, 201);
};
