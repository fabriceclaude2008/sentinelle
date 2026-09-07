// Calendrier Myfxbook normalise pour l'interface du site.
const WIDGET_URL = 'https://widget.mfbcdn.net/widget/calendar.html?lang=en&impacts=1,2,3&symbols=AUD,CAD,CHF,CNY,EUR,GBP,JPY,NZD,USD';

function decodeHtml(value) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

function cleanText(value) {
  return decodeHtml(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(name + '=["\\\']([^"\\\']*)["\\\']', 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function parseEvents(html) {
  const events = [];
  const rows = html.match(/<tr\b[^>]*data-calendar-row[^>]*>[\s\S]*?<\/tr>/gi) || [];
  rows.forEach(row => {
    const openingTag = row.match(/<tr\b[^>]*>/i)?.[0] || '';
    const firstCellTag = row.match(/<td\b[^>]*>/i)?.[0] || '';
    const cells = [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => cleanText(match[1]));
    const timestamp = Number(attribute(firstCellTag, 'data-event-date'));
    const eventCell = cells[2] || '';
    const currency = eventCell.match(/\b[A-Z]{3}\b/)?.[0] || '';
    const event = eventCell.replace(currency, '').trim();
    if (!event || !Number.isFinite(timestamp)) return;

    events.push({
      id: attribute(openingTag, 'data-calendar-row'),
      date: new Date(timestamp).toISOString(),
      currency,
      event,
      impact: (attribute(openingTag, 'data-impact') || 'low').toLowerCase(),
      previous: cells[4] || '',
      estimate: cells[5] || '',
      actual: cells[6] || '',
      ended: attribute(openingTag, 'data-event-ended') === 'true',
    });
  });
  return events;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60');

  try {
    const response = await fetch(WIDGET_URL, { headers: { 'User-Agent': 'Sentinelle calendar' } });
    if (!response.ok) return res.status(502).json({ error: 'Myfxbook a répondu HTTP ' + response.status });
    const events = parseEvents(await response.text());
    return res.status(200).json({ source: 'Myfxbook', updatedAt: new Date().toISOString(), events });
  } catch (error) {
    return res.status(502).json({ error: error.message || String(error) });
  }
}
