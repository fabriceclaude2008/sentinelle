// Fichier : api/chat.js
// Déployé sur Vercel. Utilise l'API Gemini de Google (palier gratuit) —
// la clé reste côté serveur, jamais exposée aux visiteurs du site.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'GEMINI_API_KEY n’est pas configurée dans Vercel.' });

  try {
    const { question, article, history } = req.body;

    const systemInstruction = "Tu es un analyste financier qui répond à des questions sur une nouvelle précise. " +
      "Reste factuel, nuancé, et ne donne jamais d'ordre d'achat ou de vente ferme — présente des éléments " +
      "pour et contre, et rappelle les limites de l'information disponible. Réponds en français, de façon concise.";

    const contextMsg = "Nouvelle concernée :\nTitre : " + (article?.title || '') +
      "\nRésumé : " + (article?.description || '(aucun)') +
      "\nSource : " + (article?.source || 'inconnue');

    // Gemini utilise les rôles 'user' et 'model' (pas 'assistant')
    const contents = [
      { role: 'user', parts: [{ text: contextMsg }] },
      { role: 'model', parts: [{ text: "Compris, je réponds à tes questions sur cette nouvelle." }] },
    ];
    (history || []).forEach(m => {
      contents.push({ role: m.role === 'user' ? 'user' : 'model', parts: [{ text: m.text }] });
    });
    contents.push({ role: 'user', parts: [{ text: question }] });

    const model = 'gemini-flash-latest'; // alias Google — pointe toujours vers le Flash gratuit courant
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent';

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents,
        generationConfig: { maxOutputTokens: 1600, temperature: 0.55 },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return res.status(502).json({ error: 'Erreur API Gemini', detail: errText });
    }

    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const finishReason = data?.candidates?.[0]?.finishReason || 'UNKNOWN';
    return res.status(200).json({ reply: text || '(réponse vide)', finishReason });

  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
