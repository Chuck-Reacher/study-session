import { getStore } from "@netlify/blobs";

export async function getValidAccessToken() {
  const store = getStore("outlook-auth");
  const tokens = await store.get("tokens", { type: "json" });
  if (!tokens) return null;

  if (tokens.expires_at > Date.now() + 60000) {
    return tokens.access_token;
  }

  // Le jeton d'accès a expiré : on le renouvelle avec le refresh_token (sans redemander de connexion).
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenant = process.env.MS_TENANT || "common";

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "refresh_token",
    refresh_token: tokens.refresh_token,
    scope: "offline_access User.Read Calendars.Read",
  });

  const res = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await res.json();
  if (!res.ok) return null;

  await store.setJSON("tokens", {
    access_token: data.access_token,
    refresh_token: data.refresh_token || tokens.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}
