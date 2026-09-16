const crypto = require("node:crypto");

const HISTORY_KEY = "julio:public-chat:history";
const MAX_HISTORY = 120;
const MAX_NAME = 32;
const MAX_MESSAGE = 420;

function config() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

async function redis(command, args = []) {
  const store = config();
  if (!store) return null;
  const path = [command, ...args].map((value) => encodeURIComponent(String(value))).join("/");
  const response = await fetch(`${store.url}/${path}`, { headers: { Authorization: `Bearer ${store.token}` } });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error || "Storage request failed");
  return payload.result;
}

function clean(value, limit) {
  return String(value || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F<>]/g, "").trim().slice(0, limit);
}

function hasSpam(message) {
  return /(https?:\/\/|www\.)/i.test(message) || /(.)\1{14,}/u.test(message) || /(?:free money|click here|buy now)/i.test(message);
}

function visitorKey(request, clientId) {
  const forwarded = request.headers["x-forwarded-for"] || request.headers["x-real-ip"] || "anonymous";
  const ip = forwarded.split(",")[0].trim();
  return crypto.createHash("sha256").update(`${ip}:${clientId}`).digest("hex").slice(0, 28);
}

async function readHistory() {
  const raw = await redis("lrange", [HISTORY_KEY, 0, MAX_HISTORY - 1]);
  return (Array.isArray(raw) ? raw : []).map((value) => {
    try { return JSON.parse(value); } catch (_) { return null; }
  }).filter(Boolean);
}

function json(response, res, status = 200) {
  res.status(status);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  return res.json(response);
}

module.exports = async function handler(request, response) {
  if (request.method === "OPTIONS") return response.status(204).end();
  if (!config()) return json({ configured: false, messages: [], error: "Shared chat storage is not configured yet." }, response, request.method === "GET" ? 200 : 503);
  if (request.method === "GET") {
    try { return json({ configured: true, messages: await readHistory() }, response); } catch (_) { return json({ configured: true, messages: [], error: "The shared room is temporarily unavailable." }, response, 503); }
  }
  if (request.method !== "POST") return json({ error: "Method not allowed" }, response, 405);

  let payload = request.body;
  if (typeof payload === "string") {
    try { payload = JSON.parse(payload); } catch (_) { payload = null; }
  }
  if (!payload || typeof payload !== "object") return json({ error: "Send a valid JSON message." }, response, 400);
  const name = clean(payload.name, MAX_NAME);
  const message = clean(payload.message, MAX_MESSAGE);
  const clientId = clean(payload.clientId, 100);
  if (name.length < 2) return json({ error: "Your name needs at least 2 characters." }, response, 400);
  if (!message) return json({ error: "Write a message first." }, response, 400);
  if (hasSpam(message)) return json({ error: "Please keep the room link-free and human." }, response, 400);
  if (!clientId) return json({ error: "Refresh once, then try again." }, response, 400);

  const key = visitorKey(request, clientId);
  try {
    const allowed = await redis("set", [`julio:public-chat:rate:${key}`, "1", "EX", "12", "NX"]);
    if (allowed !== "OK") return json({ error: "Slow down a little - one message every 12 seconds." }, response, 429);
    const daily = await redis("incr", [`julio:public-chat:daily:${key}`]);
    if (Number(daily) === 1) await redis("expire", [`julio:public-chat:daily:${key}`, "86400"]);
    if (Number(daily) > 80) return json({ error: "Daily message limit reached for this device." }, response, 429);
    const entry = { id: crypto.randomUUID(), name, message, clientId, createdAt: new Date().toISOString() };
    await redis("lpush", [HISTORY_KEY, JSON.stringify(entry)]);
    await redis("ltrim", [HISTORY_KEY, 0, MAX_HISTORY - 1]);
    return json({ configured: true, message: entry, messages: await readHistory() }, response, 201);
  } catch (_) { return json({ error: "The room could not save that message. Try again shortly." }, response, 503); }
};
