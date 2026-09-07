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

function isGenericImage(image) {
  return /google\.(com|ca)|googleusercontent|gstatic|googlelogo|google-news|favicon|logo\.svg|spacer\.gif/i.test(image);
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
    const absoluteImage = image ? new URL(image, sourceUrl).href : null;
    if (!absoluteImage || isGenericImage(absoluteImage)) return res.status(404).json({ image: null });
    return res.status(200).json({ image: absoluteImage });
  } catch (error) {
    return res.status(502).json({ error: error.message || String(error) });
  }
}
