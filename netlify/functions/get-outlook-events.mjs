import { getValidAccessToken } from "./_outlookAuth.mjs";

function checkSecret(req) {
  const secret = process.env.APP_SECRET;
  if (!secret) return true;
  return req.headers.get("x-app-secret") === secret;
}

export default async (req) => {
  if (!checkSecret(req)) return new Response("Unauthorized", { status: 401 });

  const url = new URL(req.url);
  const start = url.searchParams.get("start"); // ISO date
  const end = url.searchParams.get("end");
  if (!start || !end) return new Response("Missing start/end", { status: 400 });

  const accessToken = await getValidAccessToken();
  if (!accessToken) {
    return new Response(JSON.stringify({ connected: false, events: [] }), {
      headers: { "content-type": "application/json" }
    });
  }

  const params = new URLSearchParams({
    startDateTime: start,
    endDateTime: end,
  });
  const graphRes = await fetch(`https://graph.microsoft.com/v1.0/me/calendarview?${params.toString()}&$orderby=start/dateTime&$top=100`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Prefer: 'outlook.timezone="UTC"',
    },
  });

  if (!graphRes.ok) {
    const errText = await graphRes.text();
    return new Response(JSON.stringify({ connected: true, events: [], error: errText }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  }

  const data = await graphRes.json();
  const events = (data.value || []).map(e => ({
    title: e.subject || "(Sans titre)",
    start: e.start?.dateTime + "Z",
    end: e.end?.dateTime + "Z",
    location: e.location?.displayName || "",
  }));

  return new Response(JSON.stringify({ connected: true, events }), {
    headers: { "content-type": "application/json" }
  });
};
