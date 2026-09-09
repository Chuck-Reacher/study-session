import { getStore } from "@netlify/blobs";

function checkSecret(req) {
  const secret = process.env.APP_SECRET;
  if (!secret) return true;
  return req.headers.get("x-app-secret") === secret;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!checkSecret(req)) return new Response("Unauthorized", { status: 401 });
  let body;
  try { body = await req.json(); } catch (e) { return new Response("Invalid JSON", { status: 400 }); }
  const { subscription, hourUTC, minuteUTC } = body || {};
  if (!subscription || !subscription.endpoint || typeof hourUTC !== "number") {
    return new Response("Missing subscription or time", { status: 400 });
  }
  const store = getStore("push-subscriptions");
  const key = Buffer.from(subscription.endpoint).toString("base64url").slice(0, 200);
  await store.setJSON(key, { subscription, hourUTC, minuteUTC: minuteUTC || 0 });
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
