function getMetaImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
  const sourceUrl = req.query?.url;
  if (!sourceUrl || !/^https?:\/\//i.test(sourceUrl)) return res.status(400).json({ error: 'URL de source invalide' });

  try {
    const response = await fetch(sourceUrl, { headers: { 'User-Agent': 'Sentinelle image preview' } });
    if (!response.ok) return res.status(404).json({ image: null });
    const image = getMetaImage(await response.text());
    return res.status(image ? 200 : 404).json({ image: image ? new URL(image, sourceUrl).href : null });
  } catch (error) {
    return res.status(502).json({ error: error.message || String(error) });
  }
}
