const PROMPT = `Transcribe this chess board image literally, exactly as drawn on screen: do not re-orient, rotate or flip it, and ignore any rank/file labels.
Go row by row from the TOP row to the BOTTOM row, and within each row from the LEFT column to the RIGHT column.
Return JSON: {"rows": [8 strings, each exactly 8 characters]}.
Use "." for an empty square, uppercase KQRBNP for white pieces and lowercase kqrbnp for black pieces. Do not invent pieces.`;

// Models the page's dropdown may request; anything else falls back to the default
const ALLOWED_MODELS = ['gpt-4o-mini', 'gpt-4.1', 'gpt-5.4-mini', 'gpt-5.4', 'gpt-5.5'];
const DEFAULT_MODEL = process.env.OPENAI_MODEL || 'gpt-5.4';

// Build the FEN in code from the 64-square grid; models miscount FEN digits
function rowsToPlacement(rows) {
  if (!Array.isArray(rows) || rows.length !== 8) return null;
  const ranks = [];
  for (const row of rows) {
    if (typeof row !== 'string' || !/^[.pnbrqkPNBRQK]{8}$/.test(row)) return null;
    ranks.push(row.replace(/\.+/g, (m) => m.length));
  }
  return ranks.join('/');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const { image, model } = req.body || {};
  if (typeof image !== 'string' || !image.startsWith('data:image/')) {
    return res.status(400).json({ error: 'Expected "image" as a data:image/... URL' });
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: image, detail: 'high' } }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(502).json({ error: data?.error?.message || 'OpenAI request failed' });
    }

    const parsed = JSON.parse(data.choices?.[0]?.message?.content || '{}');
    const placement = rowsToPlacement(parsed.rows);
    if (!placement) {
      return res.status(422).json({ error: 'Model returned an invalid board', raw: parsed.rows });
    }

    return res.status(200).json({ fen: placement + ' w - - 0 1', confidence: 'n/a', notes: '' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
