// Redirige vers la page de connexion Microsoft. L'utilisateur se connecte avec son compte
// Outlook officiel ; cette appli ne voit jamais son mot de passe.
export default async (req) => {
  const clientId = process.env.MS_CLIENT_ID;
  const tenant = process.env.MS_TENANT || "common";
  const baseUrl = process.env.APP_BASE_URL; // ex: https://ton-site.netlify.app
  if (!clientId || !baseUrl) {
    return new Response("Configuration Microsoft manquante (MS_CLIENT_ID / APP_BASE_URL).", { status: 500 });
  }
  const redirectUri = `${baseUrl}/.netlify/functions/auth-callback`;
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: "offline_access User.Read Calendars.Read",
  });
  const authUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize?${params.toString()}`;
  return new Response(null, { status: 302, headers: { Location: authUrl } });
};
