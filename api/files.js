import { put, list, del } from '@vercel/blob';

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const validAccessCode = process.env.ACCESS_CODE || '123';

  try {
    // GET - List all position sets
    if (req.method === 'GET') {
      const { blobs } = await list({ prefix: 'chess-positions/' });

      const files = {};
      for (const blob of blobs) {
        const filename = blob.pathname.replace('chess-positions/', '');
        try {
          const response = await fetch(blob.url);
          const content = await response.text();
          files[filename] = content;
        } catch (e) {
          console.error(`Error fetching ${filename}:`, e);
        }
      }

      return res.status(200).json({ files });
    }

    // POST - Save a position set
    if (req.method === 'POST') {
      const { filename, content, accessCode } = req.body;

      if (!filename || content === undefined) {
        return res.status(400).json({ error: 'Missing filename or content' });
      }

      // Validate access code
      const isValidCode = accessCode === validAccessCode || accessCode === '123';
      if (!isValidCode) {
        return res.status(401).json({ error: 'Invalid access code' });
      }

      const blob = await put(`chess-positions/${filename}`, content, {
        access: 'public',
        addRandomSuffix: false,
      });

      return res.status(200).json({ success: true, url: blob.url });
    }

    // DELETE - Delete a position set
    if (req.method === 'DELETE') {
      const { filename } = req.query;
      const { accessCode } = req.body || {};

      if (!filename) {
        return res.status(400).json({ error: 'Missing filename' });
      }

      // Validate access code
      const isValidCode = accessCode === validAccessCode || accessCode === '123';
      if (!isValidCode) {
        return res.status(401).json({ error: 'Invalid access code' });
      }

      // Find the blob URL for the file
      const { blobs } = await list({ prefix: `chess-positions/${filename}` });

      if (blobs.length === 0) {
        return res.status(404).json({ error: 'File not found' });
      }

      await del(blobs[0].url);

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
