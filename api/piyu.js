const crypto = require("node:crypto");

const MAX_MESSAGE = 600;
const MAX_HISTORY = 8;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";

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
  return crypto.createHash("sha256").update(`${ip}:${clientId}`).digest("hex").slice(0, 28);
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
  const result = await fetch(`${store.url}/${path}`, { headers: { Authorization: `Bearer ${store.token}` } });
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

function fallbackReply(message) {
  const text = message.toLowerCase();
  if (/who are you/i.test(text)) {
    return "I’m Piyu, Julio’s portfolio assistant. I can explain his projects, AI engineering work, automation skills, and how to contact him.";
  }
  if (/\b(who|about|julio|background|experience|bio|him|he)\b/i.test(text)) {
    return "Julio Jose Padilla is an AI engineer and automation builder who creates intelligent agents, workflow systems, and clear full-stack products. He is based in Antipolo, Philippines, and is available for smart collaborations.";
  }
  if (/project|work|portfolio|built|builds|system|website/i.test(text)) {
    return "Julio’s work includes a recruitment portal with AI voice interviews, an OpenClaw AI agent ecosystem, an instructional media center management system, and client website delivery.";
  }
  if (/skill|stack|technology|tech|tool|language|php|javascript|sql|automation|ai/i.test(text)) {
    return "Julio works across AI agents, workflow automation, full-stack web development, PHP, SQL, JavaScript, Gemini, Vapi, n8n, webhooks, and Vercel-based delivery.";
  }
  if (/contact|email|hire|collab|collaborat|reach|get in touch/i.test(text)) {
    return "You can contact Julio through the Contact Me section of this portfolio or email padillajuliojose@gmail.com for a collaboration conversation.";
  }
  if (/money|price|cost|salary|pay|pricing/i.test(text)) {
    return "I can help with Julio’s portfolio, projects, skills, or automation work. For pricing or collaboration details, please use the contact form.";
  }
  return "I can help with Julio’s portfolio, AI projects, workflow automations, and ways to get in touch. Try asking about a specific project or skill.";
}

function shouldUseKeywordFallback(message) {
  return /\b(who are you|what is ai|can you give me money|give me money|money|price|cost|salary|pay|pricing)\b/i.test(message);
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
    const allowed = await redis("set", [`julio:piyu:rate:${key}`, "1", "EX", "8", "NX"]);
    if (redisConfig() && allowed !== "OK") return json({ error: "Piyu needs a tiny breather. Try again in a few seconds." }, response, 429);

    if (shouldUseKeywordFallback(message)) {
      return json({ reply: fallbackReply(message), model: "piyu-keyword-fallback" }, response);
    }

    const prompt = `You are Piyu, Julio Jose Padilla's cheerful portfolio assistant. Answer questions about Julio, his AI engineering and workflow automation work, projects, skills, background, or how to contact him. Give a complete, warm, useful answer in 2–5 short sentences (under 100 words). Finish the answer before stopping. If a question is unrelated, politely steer it back to Julio's portfolio. Never invent private details, credentials, employment, pricing, or guarantees. Do not provide unsafe instructions or ask for sensitive personal data.\n\nVisitor message:\n${message}`;
    const contents = [...validHistory(payload?.history), { role: "user", parts: [{ text: prompt }] }];
    const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
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
      if (upstream.status === 429) return json({ error: "Gemini is rate-limiting this request. Wait a moment, then try again." }, response, 429);
      if (upstream.status === 401 || upstream.status === 403) return json({ error: "Piyu cannot reach Gemini with the current API key. Check GEMINI_API_KEY in Vercel." }, response, 502);
      if (upstream.status === 404) return json({ error: `The configured Gemini model (${MODEL}) is unavailable. Update GEMINI_MODEL in Vercel.` }, response, 502);
      return json({ reply: fallbackReply(message), model: "piyu-fallback" }, response);
    }
    const answer = result?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("").trim();
    if (!answer) return json({ error: "Piyu could not form a reply to that yet." }, response, 502);
    if (/[']$|\b(?:don't|doesn't|can't|can|and|or|to|of|with|any)$/i.test(answer)) {
      return json({ reply: fallbackReply(message), model: "piyu-complete-fallback" }, response);
    }
    return json({ reply: answer, model: MODEL }, response);
  } catch (_) {
    return json({ reply: fallbackReply(message), model: "piyu-fallback" }, response);
  }
};
