import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const error = url.searchParams.get("error_description");
  const baseUrl = process.env.APP_BASE_URL;

  if (error) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${baseUrl}/index.html?outlook=error&msg=${encodeURIComponent(error)}` }
    });
  }
  if (!code) return new Response("Code manquant", { status: 400 });

  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  const tenant = process.env.MS_TENANT || "common";
  const redirectUri = `${baseUrl}/.netlify/functions/auth-callback`;

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    scope: "offline_access User.Read Calendars.Read",
  });

  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok) {
    return new Response(null, {
      status: 302,
      headers: { Location: `${baseUrl}/index.html?outlook=error&msg=${encodeURIComponent(tokenData.error_description || "token_error")}` }
    });
  }

  const store = getStore("outlook-auth");
  await store.setJSON("tokens", {
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expires_at: Date.now() + (tokenData.expires_in * 1000),
  });

  return new Response(null, { status: 302, headers: { Location: `${baseUrl}/index.html?outlook=connected` } });
};
