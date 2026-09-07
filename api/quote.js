// Fichier : api/quote.js
// Déployé sur Vercel. Renvoie le prix courant et la variation du jour pour un
// ticker, via Finnhub, avec la clé API gardée côté serveur.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const symbol = (req.query.symbol || '').toUpperCase();
  if (!symbol) return res.status(400).json({ error: 'Paramètre symbol manquant' });

  try {
    const url = 'https://finnhub.io/api/v1/quote?symbol=' + encodeURIComponent(symbol) +
      '&token=' + process.env.FINNHUB_API_KEY;
    const resp = await fetch(url);
    if (!resp.ok) return res.status(502).json({ error: 'Erreur Finnhub' });
    const data = await resp.json();

    if (data.c == null || data.c === 0) {
      return res.status(200).json({ price: null, changePercent: null });
    }

    res.setHeader('Cache-Control', 's-maxage=30, stale-while-revalidate=15');
    return res.status(200).json({
      price: data.c,
      changePercent: data.dp, // variation % depuis la clôture précédente
    });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
