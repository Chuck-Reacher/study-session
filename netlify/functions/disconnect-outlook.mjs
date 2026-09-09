import { getStore } from "@netlify/blobs";

function checkSecret(req) {
  const secret = process.env.APP_SECRET;
  if (!secret) return true;
  return req.headers.get("x-app-secret") === secret;
}

export default async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (!checkSecret(req)) return new Response("Unauthorized", { status: 401 });
  const store = getStore("outlook-auth");
  await store.delete("tokens");
  return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
};
