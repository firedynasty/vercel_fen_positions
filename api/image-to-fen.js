const PROMPT = `You are a chess board recognizer. The image shows a chess position (a screenshot, diagram, or photo of a board).
Return the piece placement as a FEN string.

Rules:
- Read the board carefully square by square, rank by rank.
- Use standard FEN piece letters: uppercase = white (KQRBNP), lowercase = black (kqrbnp).
- Output ranks from 8 down to 1, from White's point of view. If the board is shown from Black's side
  (e.g. coordinates or context indicate it is flipped), re-orient it so the FEN is still rank 8 first, file a first.
- Do not invent pieces. Empty squares are counted as digits.
- If side to move, castling or en passant are not visible, use "w", "-" and "-" with "0 1".
Reply with JSON only: {"fen": "<full 6-field FEN>", "confidence": "high|medium|low", "notes": "<short note on anything uncertain>"}`;

function isValidPlacement(placement) {
  const ranks = placement.split('/');
  if (ranks.length !== 8) return false;
  for (const rank of ranks) {
    let count = 0;
    for (const ch of rank) {
      if (/[1-8]/.test(ch)) count += Number(ch);
      else if (/[pnbrqkPNBRQK]/.test(ch)) count += 1;
      else return false;
    }
    if (count !== 8) return false;
  }
  return true;
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

  const { image } = req.body || {};
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
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        temperature: 0,
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
    const fen = String(parsed.fen || '').trim();
    if (!isValidPlacement(fen.split(' ')[0])) {
      return res.status(422).json({ error: 'Model returned an invalid FEN', raw: fen });
    }

    return res.status(200).json({
      fen,
      confidence: parsed.confidence || 'unknown',
      notes: parsed.notes || ''
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
