const crypto = require("node:crypto");

const WINDOW_SECONDS = 60 * 60 * 24 * 30;
const VISITOR_TOTAL_KEY = "julio:site:visitors:total";

function getRedis() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ""), token };
}

function getClientIp(request) {
  const forwarded = request.headers["x-forwarded-for"] || request.headers["x-real-ip"] || "";
  return String(forwarded).split(",")[0].trim() || "unknown";
}

async function redisCommand(redis, command) {
  const response = await fetch(redis.url + "/" + command.map((value) => encodeURIComponent(value)).join("/"), {
    headers: { Authorization: "Bearer " + redis.token },
  });
  if (!response.ok) throw new Error("Redis request failed: " + response.status);
  return response.json();
}

module.exports = async function handler(request, response) {
  if (request.method !== "GET") return response.status(405).json({ error: "Method not allowed" });
  const redis = getRedis();
  if (!redis) return response.status(200).json({ configured: false, count: null, counted: false });

  const clientId = String(request.query?.clientId || "").slice(0, 128);
  const userAgent = String(request.headers["user-agent"] || "").slice(0, 300);
  if (!clientId || /bot|crawler|spider|headless|preview/i.test(userAgent)) {
    const total = await redisCommand(redis, ["GET", VISITOR_TOTAL_KEY]);
    return response.status(200).json({ configured: true, count: Number(total.result || 0), counted: false });
  }

  const identity = getClientIp(request) + "|" + userAgent + "|" + clientId;
  const digest = crypto.createHash("sha256").update(identity).digest("hex");
  const marker = await redisCommand(redis, ["SET", "julio:site:visitor:" + digest, "1", "EX", String(WINDOW_SECONDS), "NX"]);
  const counted = marker.result === "OK";
  if (counted) await redisCommand(redis, ["INCR", VISITOR_TOTAL_KEY]);
  const total = await redisCommand(redis, ["GET", VISITOR_TOTAL_KEY]);
  return response.status(200).json({ configured: true, count: Number(total.result || 0), counted });
};
