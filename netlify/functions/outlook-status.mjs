import { getStore } from "@netlify/blobs";

function checkSecret(req) {
  const secret = process.env.APP_SECRET;
  if (!secret) return true;
  return req.headers.get("x-app-secret") === secret;
}

export default async (req) => {
  if (!checkSecret(req)) return new Response("Unauthorized", { status: 401 });
  const store = getStore("outlook-auth");
  const tokens = await store.get("tokens", { type: "json" });
  return new Response(JSON.stringify({ connected: !!tokens }), {
    headers: { "content-type": "application/json" }
  });
};
