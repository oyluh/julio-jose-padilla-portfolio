const crypto = require("node:crypto");

const MAX_MESSAGE = 600;
const MAX_HISTORY = 8;const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

function json(payload, response, status = 200) {
  response.status(status);
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store");
  return response.json(payload);
}

function clean(value, limit) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/g, "").trim().slice(0, limit);
}

function hasSpam(message) {
  return /(https?:\/\/|www\.)/i.test(message) || /(.)\1{18,}/u.test(message);
}

function visitorKey(request, clientId) {
  const forwarded = request.headers["x-forwarded-for"] || request.headers["x-real-ip"] || "anonymous";
  const ip = String(forwarded).split(",")[0].trim();
  return crypto.createHash("sha256").update(ip + ":" + clientId).digest("hex").slice(0, 28);
}

function redisConfig() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(command, args = []) {
  const store = redisConfig();
  if (!store) return null;
  const path = [command, ...args].map((value) => encodeURIComponent(String(value))).join("/");
  const result = await fetch(store.url + "/" + path, { headers: { Authorization: "Bearer " + store.token } });
  const payload = await result.json();
  if (!result.ok || payload.error) throw new Error(payload.error || "Rate limit storage failed");
  return payload.result;
}

function validHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-MAX_HISTORY).map((item) => ({
    role: item?.role === "model" ? "model" : "user",
    parts: [{ text: clean(item?.text, MAX_MESSAGE) }],
  })).filter((item) => item.parts[0].text);
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, response, 405);

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return json({ error: "Piyu is waiting for GEMINI_API_KEY in Vercel." }, response, 503);

  let payload = request.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (_) { payload = null; }
  }
  const message = clean(payload?.message, MAX_MESSAGE);
  const clientId = clean(payload?.clientId, 100);
  if (message.length < 2) return json({ error: "Write a little more so Piyu can help." }, response, 400);
  if (hasSpam(message)) return json({ error: "Please keep Piyu’s chat link-free and human." }, response, 400);
  if (!clientId) return json({ error: "Refresh once, then try again." }, response, 400);

  const key = visitorKey(request, clientId);
  try {
    const allowed = await redis("set", ["julio:piyu:rate:" + key, "1", "EX", "8", "NX"]);
    if (redisConfig() && allowed !== "OK") return json({ error: "Piyu needs a tiny breather. Try again in a few seconds." }, response, 429);

    const prompt = "You are Piyu, Julio Jose Padilla's cheerful portfolio assistant. Answer questions about Julio, his AI engineering and workflow automation work, projects, skills, background, or how to contact him. Keep answers warm, concise, and useful (under 120 words). If a question is unrelated, politely steer it back to Julio's portfolio. Never invent private details, credentials, employment, pricing, or guarantees. Do not provide unsafe instructions or ask for sensitive personal data.\n\nVisitor message:\n" + message;
    const contents = [...validHistory(payload?.history), { role: "user", parts: [{ text: prompt }] }];
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + encodeURIComponent(MODEL) + ":generateContent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 220 },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    });
    const result = await upstream.json();
    if (!upstream.ok) {
      console.error("Gemini upstream error", {
        status: upstream.status,
        model: MODEL,
        error: result?.error?.message || "Unknown Gemini error",
      });
      return json({ error: "Piyu is temporarily unavailable. Try again shortly." }, response, 502);
    }
    const answer = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!answer) return json({ error: "Piyu could not form a reply to that yet." }, response, 502);
    return json({ reply: answer, model: MODEL }, response);
  } catch (_) {
    return json({ error: "Piyu is temporarily unavailable. Try again shortly." }, response, 503);
  }
};
