import { getStore } from "@netlify/blobs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-app-secret",
};


function checkSecret(req) {
  const secret = process.env.APP_SECRET;
  if (!secret) return true;
  return req.headers.get("x-app-secret") === secret;
}

export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  if (!checkSecret(req)) return new Response("Unauthorized", { status: 401, headers: CORS_HEADERS });
  let body;
  try { body = await req.json(); } catch (e) { return new Response("Invalid JSON", { status: 400, headers: CORS_HEADERS }); }
  const { subscription, hourUTC, minuteUTC } = body || {};
  if (!subscription || !subscription.endpoint || typeof hourUTC !== "number") {
    return new Response("Missing subscription or time", { status: 400, headers: CORS_HEADERS });
  }
  const store = getStore("push-subscriptions");
  const key = Buffer.from(subscription.endpoint).toString("base64url").slice(0, 200);
  await store.setJSON(key, { subscription, hourUTC, minuteUTC: minuteUTC || 0 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json", ...CORS_HEADERS } });
};
