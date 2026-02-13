export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const appKey = process.env.REACT_APP_DROPBOX_APP_KEY;
  if (!appKey) {
    return res.status(500).json({ error: 'REACT_APP_DROPBOX_APP_KEY not configured' });
  }

  return res.status(200).json({ appKey });
}
