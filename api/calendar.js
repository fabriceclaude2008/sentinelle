// Fichier : api/calendar.js
// Déployé sur Vercel. Récupère le calendrier économique des 7 prochains jours
// via Financial Modeling Prep, avec la clé API gardée côté serveur — aucun
// visiteur du site n'a besoin d'en fournir une.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 6);
    const fmt = (d) => d.toISOString().slice(0, 10);

    const url = 'https://financialmodelingprep.com/api/v3/economic_calendar?from=' +
      fmt(from) + '&to=' + fmt(to) + '&apikey=' + process.env.FMP_API_KEY;

    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      return res.status(502).json({ error: 'Erreur FMP', detail: txt });
    }
    const data = await resp.json();

    // Normalise vers le format attendu par le frontend
    const events = (Array.isArray(data) ? data : []).map(ev => ({
      time: ev.date,
      country: ev.country,
      event: ev.event,
      impact: (ev.impact || '').toLowerCase(), // 'low' | 'medium' | 'high'
      prev: ev.previous,
      estimate: ev.estimate,
      actual: ev.actual,
    }));

    // Cache 5 minutes côté CDN Vercel pour ménager le quota FMP
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');
    return res.status(200).json({ events });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
