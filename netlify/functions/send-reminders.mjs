import webpush from "web-push";
import { getStore } from "@netlify/blobs";

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || "mailto:contact@example.com",
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

export default async () => {
  const store = getStore("push-subscriptions");
  const now = new Date();
  const nowH = now.getUTCHours();
  const nowM = now.getUTCMinutes();

  const { blobs } = await store.list();
  let sent = 0;

  for (const b of blobs) {
    const data = await store.get(b.key, { type: "json" });
    if (!data || !data.subscription) continue;

    const target = data.hourUTC * 60 + (data.minuteUTC || 0);
    const current = nowH * 60 + nowM;
    const diff = Math.min(Math.abs(current - target), 1440 - Math.abs(current - target));
    if (diff > 8) continue;

    try {
      await webpush.sendNotification(
        data.subscription,
        JSON.stringify({
          title: "Study Session",
          body: "C'est l'heure de ton programme du jour 📚"
        })
      );
      sent++;
    } catch (err) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        await store.delete(b.key);
      }
    }
  }

  return new Response(JSON.stringify({ sent }), { headers: { "content-type": "application/json" } });
};

export const config = { schedule: "*/15 * * * *" };
