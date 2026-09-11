// Netlify Function — /.netlify/functions/fetch-ics
// Lit un calendrier publié au format ICS (lien "Publier un calendrier" d'Outlook)
// et renvoie les événements qui tombent dans la plage [start, end] demandée.
// Aucune connexion, aucun jeton : le lien ICS suffit (c'est Outlook qui le protège).

function unfoldICS(text) {
  return text.replace(/\r\n/g, '\n').replace(/\n[ \t]/g, '');
}

function parseICSDate(raw) {
  if (!raw) return null;
  const clean = raw.replace('Z', '');
  const y = clean.slice(0,4), mo = clean.slice(4,6), d = clean.slice(6,8);
  if (clean.length === 8) {
    return new Date(Date.UTC(+y, +mo - 1, +d)).toISOString();
  }
  const h = clean.slice(9,11) || '00', mi = clean.slice(11,13) || '00', s = clean.slice(13,15) || '00';
  const iso = `${y}-${mo}-${d}T${h}:${mi}:${s}Z`;
  return new Date(iso).toISOString();
}

function parseEvents(icsText) {
  const text = unfoldICS(icsText);
  const blocks = text.split('BEGIN:VEVENT').slice(1);
  const events = [];
  for (const block of blocks) {
    const body = block.split('END:VEVENT')[0];
    const getField = (name) => {
      const re = new RegExp('^' + name + '(?:;[^:]*)?:(.*)$', 'm');
      const m = body.match(re);
      return m ? m[1].trim() : null;
    };
    const summary = getField('SUMMARY');
    const dtstartRaw = (body.match(/^DTSTART[^:]*:([\d TZ]+)$/m) || [])[1];
    const dtendRaw = (body.match(/^DTEND[^:]*:([\d TZ]+)$/m) || [])[1];
    const location = getField('LOCATION');
    if (!summary || !dtstartRaw) continue;
    const start = parseICSDate(dtstartRaw.trim());
    const end = dtendRaw ? parseICSDate(dtendRaw.trim()) : start;
    if (!start) continue;
    events.push({ title: summary.replace(/\\,/g, ','), start, end, location: location || '' });
  }
  return events;
}

export default async (req) => {
  const url = new URL(req.url);
  const icsUrl = url.searchParams.get('url');
  const start = url.searchParams.get('start');
  const end = url.searchParams.get('end');

  if (!icsUrl) {
    return new Response(JSON.stringify({ error: 'Lien ICS manquant.' }), { headers: { 'content-type': 'application/json' } });
  }
  if (!/^https?:\/\//i.test(icsUrl)) {
    return new Response(JSON.stringify({ error: 'Lien ICS invalide (doit commencer par http:// ou https://).' }), { headers: { 'content-type': 'application/json' } });
  }

  let icsText;
  try {
    const res = await fetch(icsUrl, { headers: { 'User-Agent': 'StudySessionApp/1.0' } });
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `Le calendrier a répondu avec une erreur (${res.status}). Vérifie que le lien est correct et toujours actif.` }), { headers: { 'content-type': 'application/json' } });
    }
    icsText = await res.text();
  } catch (e) {
    return new Response(JSON.stringify({ error: "Impossible d'accéder à ce lien. Vérifie qu'il est complet et public." }), { headers: { 'content-type': 'application/json' } });
  }

  let events;
  try {
    events = parseEvents(icsText);
  } catch (e) {
    return new Response(JSON.stringify({ error: 'Le fichier reçu ne ressemble pas à un calendrier ICS valide.' }), { headers: { 'content-type': 'application/json' } });
  }

  if (start && end) {
    const s = new Date(start).getTime(), e = new Date(end).getTime();
    events = events.filter(ev => {
      const t = new Date(ev.start).getTime();
      return t >= s && t <= e;
    });
  }

  events.sort((a, b) => new Date(a.start) - new Date(b.start));

  return new Response(JSON.stringify({ events }), { headers: { 'content-type': 'application/json' } });
};
