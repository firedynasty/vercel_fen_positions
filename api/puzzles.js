// Vercel Serverless Function — Supabase `puzzles` table proxy
// Keeps SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY server-side. service_role
// is required (not the anon key) because RLS on `puzzles` has no
// anon/authenticated policies — same pattern as react-chess-analysis_vercel's
// api/games.js.
//
// Set in Vercel dashboard -> Settings -> Environment Variables:
//   SUPABASE_URL = https://xxxx.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY = your-service-role-key
//
// Endpoints:
//   GET  /api/puzzles?action=categories
//   GET  /api/puzzles?action=list&category=X
//   GET  /api/puzzles?action=get&id=123
//   POST /api/puzzles   { action: "save", category, note, fen }
//   POST /api/puzzles   { action: "sync", categories: { name: [{ fen, note }, ...] }, dryRun }
//   DELETE /api/puzzles?id=123
//
// Source of truth is Dropbox /study/chess/<category>.csv (fen,note). "sync" makes
// the table match those CSVs (see syncPuzzles below); the page reads the table so
// ?id= links and Load by ID work without a Dropbox sign-in.

const LIST_COLUMNS = 'id,category,note,fen,position,created_at';
// position = the row's line number in its CSV (set by sync; save appends at the end).
// Needs: alter table puzzles add column position integer; update puzzles set position = id;
const LIST_ORDER = 'position.asc.nullslast,id.asc';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    return res.status(500).json({ error: 'Supabase env vars not set on server.' });
  }
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  try {
    if (req.method === 'GET') {
      const { action, category, id } = req.query;

      if (action === 'categories') {
        // No native DISTINCT over REST — pull just the column and de-dupe here.
        const params = new URLSearchParams({ select: 'category', order: 'category.asc' });
        const r = await fetch(`${url}/rest/v1/puzzles?${params}`, { headers });
        const rows = await r.json();
        if (!r.ok) return res.status(r.status).json(rows);
        const categories = [...new Set(rows.map((row) => row.category))];
        return res.status(200).json(categories);
      }

      if (action === 'list') {
        const params = new URLSearchParams({ select: LIST_COLUMNS, order: LIST_ORDER });
        if (category) params.set('category', `eq.${category}`);
        const r = await fetch(`${url}/rest/v1/puzzles?${params}`, { headers });
        const rows = await r.json();
        return res.status(r.ok ? 200 : r.status).json(rows);
      }

      if (action === 'get') {
        if (!id) return res.status(400).json({ error: 'id required' });
        const params = new URLSearchParams({ select: '*', id: `eq.${id}`, limit: '1' });
        const r = await fetch(`${url}/rest/v1/puzzles?${params}`, { headers });
        const rows = await r.json();
        if (!r.ok) return res.status(r.status).json(rows);
        if (!rows.length) return res.status(404).json({ error: 'Puzzle not found' });
        return res.status(200).json(rows[0]);
      }

      return res.status(400).json({ error: 'Unknown action. Use action=categories, action=list, or action=get' });
    }

    if (req.method === 'POST') {
      const { action, category, note, fen } = req.body || {};
      if (action === 'sync') {
        const { categories, dryRun } = req.body;
        return res.status(200).json(await syncPuzzles(url, headers, categories, !!dryRun));
      }
      if (action !== 'save') return res.status(400).json({ error: 'Unknown action. Use action=save or action=sync' });
      if (!category || !fen) {
        return res.status(400).json({ error: 'category and fen are required' });
      }

      // New puzzles go to the end of their category.
      const last = await fetch(`${url}/rest/v1/puzzles?${new URLSearchParams({
        select: 'position', category: `eq.${category}`, order: 'position.desc.nullslast', limit: '1',
      })}`, { headers });
      const lastRows = await last.json();
      if (!last.ok) return res.status(last.status).json(lastRows);
      const position = ((lastRows[0] && lastRows[0].position) || 0) + 1;

      const r = await fetch(`${url}/rest/v1/puzzles`, {
        method: 'POST',
        headers: { ...headers, Prefer: 'return=representation' },
        body: JSON.stringify([{ category, note: note || null, fen, position }]),
      });
      const created = await r.json();
      if (!r.ok) return res.status(r.status).json(created);
      return res.status(200).json({ success: true, puzzle: created[0] });
    }

    if (req.method === 'DELETE') {
      const id = String(req.query.id || '');
      if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'A numeric id is required' });

      const r = await fetch(`${url}/rest/v1/puzzles?id=eq.${id}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=representation' },
      });
      const deleted = await r.json();
      if (!r.ok) return res.status(r.status).json(deleted);
      if (!deleted.length) return res.status(404).json({ error: 'Puzzle not found' });
      return res.status(200).json({ success: true, deleted: deleted[0].id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}

// Make the table match the CSVs: { category: [{ fen, note }, ...] } in file order.
// Rows are matched by FEN (same category first, then any category), so a matched
// puzzle keeps its id and ?id= links survive reorders, note edits and moves
// between CSVs. Unmatched CSV rows are inserted; unmatched table rows deleted.
async function syncPuzzles(url, headers, categories, dryRun) {
  if (!categories || typeof categories !== 'object') throw new Error('categories required');
  const wanted = [];
  for (const [category, rows] of Object.entries(categories)) {
    (rows || []).forEach((r, i) => {
      const fen = String(r.fen || '').trim();
      if (fen) wanted.push({ category, fen, note: String(r.note || '').trim() || null, position: i + 1 });
    });
  }
  // A Dropbox read that came back empty must never wipe the table.
  if (!wanted.length) throw new Error('No puzzles in the CSVs; refusing to delete everything');

  const r = await fetch(`${url}/rest/v1/puzzles?select=id,category,note,fen,position&order=id.asc`, { headers });
  const existing = await r.json();
  if (!r.ok) throw new Error(existing.message || `Supabase error ${r.status}`);

  const unused = new Map(existing.map((row) => [row.id, row]));
  const take = (pred) => {
    for (const row of unused.values()) if (pred(row)) { unused.delete(row.id); return row; }
    return null;
  };
  const inserts = [], updates = [];
  // Pass 1: same category + FEN. Pass 2: FEN moved to another category.
  const matched = new Map();
  wanted.forEach((w, i) => {
    const row = take((e) => e.category === w.category && e.fen.trim() === w.fen);
    if (row) matched.set(i, row);
  });
  wanted.forEach((w, i) => {
    const row = matched.get(i) || take((e) => e.fen.trim() === w.fen);
    if (!row) { inserts.push(w); return; }
    const patch = {};
    if (row.category !== w.category) patch.category = w.category;
    if ((row.note || null) !== w.note) patch.note = w.note;
    if (row.position !== w.position) patch.position = w.position;
    if (Object.keys(patch).length) updates.push({ id: row.id, patch });
  });
  const deletes = [...unused.values()];

  const plan = {
    add: inserts.length, update: updates.length, delete: deletes.length,
    deleted: deletes.map((d) => ({ id: d.id, category: d.category, note: d.note })),
  };
  if (dryRun) return plan;

  if (deletes.length) {
    const d = await fetch(`${url}/rest/v1/puzzles?id=in.(${deletes.map((x) => x.id).join(',')})`, { method: 'DELETE', headers });
    if (!d.ok) throw new Error(`Delete failed: ${d.status} ${await d.text()}`);
  }
  for (let i = 0; i < updates.length; i += 10) {
    await Promise.all(updates.slice(i, i + 10).map(async (u) => {
      const p = await fetch(`${url}/rest/v1/puzzles?id=eq.${u.id}`, { method: 'PATCH', headers, body: JSON.stringify(u.patch) });
      if (!p.ok) throw new Error(`Update ${u.id} failed: ${p.status} ${await p.text()}`);
    }));
  }
  if (inserts.length) {
    const ins = await fetch(`${url}/rest/v1/puzzles`, { method: 'POST', headers, body: JSON.stringify(inserts) });
    if (!ins.ok) throw new Error(`Insert failed: ${ins.status} ${await ins.text()}`);
  }
  return plan;
}
