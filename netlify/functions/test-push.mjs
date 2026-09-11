import webpush from "web-push";
import { getStore } from "@netlify/blobs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-app-secret",
};


export default async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS_HEADERS });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });

  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contact@example.com";

  if (!pub || !priv) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Variables manquantes : VAPID_PUBLIC_KEY ou VAPID_PRIVATE_KEY n'est pas configurée sur Netlify."
    }), { status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS } });
  }

  try {
    webpush.setVapidDetails(subject, pub, priv);
  } catch (e) {
    return new Response(JSON.stringify({ ok:false, error: "Clés VAPID invalides : " + e.message }), {
      status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }

  const store = getStore("push-subscriptions");
  const { blobs } = await store.list();

  if (blobs.length === 0) {
    return new Response(JSON.stringify({ ok:false, error: "Aucun abonnement trouvé. Désactive puis réactive le rappel dans l'appli avant de retester." }), {
      status: 200, headers: { "content-type": "application/json", ...CORS_HEADERS }
    });
  }

  const results = [];
  for (const b of blobs) {
    const data = await store.get(b.key, { type: "json" });
    if (!data || !data.subscription) continue;
    try {
      await webpush.sendNotification(
        data.subscription,
        JSON.stringify({ title: "Test", body: "Si tu vois ceci, les notifications fonctionnent 🎉" }),
        { urgency: 'high', TTL: 60 }
      );
      results.push({ ok:true });
    } catch (err) {
      results.push({ ok:false, statusCode: err.statusCode, message: err.message, body: err.body });
      if (err.statusCode === 404 || err.statusCode === 410) await store.delete(b.key);
    }
  }

  return new Response(JSON.stringify({ ok: results.some(r=>r.ok), results }), {
    headers: { "content-type": "application/json", ...CORS_HEADERS }
  });
};
