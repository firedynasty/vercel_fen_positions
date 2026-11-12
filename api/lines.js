// Vercel Serverless Function — Supabase `chess_*` line tables (2-column storage)
//
// The flat sibling of /api/puzzles. Where `puzzles` splits a row into
// category + note + fen, a chess_* table stores just:
//
//   id | name | pgn
//
// `name` carries the whole human label ("cheescake_game: how to finish it").
// The page splits it back into category + note on the client (SB_SEP), so the
// browse dropdowns look the same either way — see sbAdapter() in index.html.
//
// Ported from react-chess-analysis_vercel/api/lines.js, with two additions this
// repo's UI needs: `bulk` and DELETE. Writes take the access code from the
// X-Access-Code header (what sbWriteFetch sends) or from `accessCode` in the
// body (what the other repo's lnPost sends); either is accepted.
//
// Env vars (Vercel -> Settings -> Environment Variables), same three as /api/puzzles:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ACCESS_CODE
//
// Only tables named chess_<letters/digits/underscores> are reachable, so this
// endpoint can never read or write `puzzles`, `games`, or anything else.
//
// Endpoints:
//   GET    /api/lines?action=tables
//   GET    /api/lines?action=list&table=chess_puzzles_redone[&cols=full][&limit=500]
//   GET    /api/lines?action=get&table=chess_puzzles_redone&id=12
//   GET    /api/lines?action=get&table=chess_puzzles_redone&name=spear
//   POST   /api/lines  { action:"save", table, name, pgn[, replace:true] }   (needs access code)
//   POST   /api/lines  { action:"bulk", table, rows:[{name,pgn}] }           (needs access code)
//   DELETE /api/lines?table=chess_puzzles_redone&id=12                           (needs access code)

import { timingSafeEqual } from 'node:crypto';

const TABLE_RE = /^chess_[a-z0-9_]+$/;
const MAX_PGN_CHARS = 200000;

// Writes need the shared ACCESS_CODE. Fails closed if it isn't configured.
// Accepts the header (this repo) or the body field (the other repo's contract).
function checkAccessCode(req, res) {
  const expected = process.env.ACCESS_CODE;
  if (!expected) {
    res.status(500).json({ error: 'ACCESS_CODE not set on server.' });
    return false;
  }
  const given = String(req.headers['x-access-code'] || (req.body && req.body.accessCode) || '');
  const a = Buffer.from(given), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    res.status(401).json({ error: 'Invalid access code' });
    return false;
  }
  return true;
}

// A name that is all digits would be ambiguous with a row # in the "get" call.
function badName(name) {
  const s = String(name || '').trim();
  if (!s) return 'name is required';
  if (/^\d+$/.test(s)) return "name can't be all digits (a number means the row #)";
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Access-Code');

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
      const { action, table, id, name, limit, cols } = req.query;

      if (action === 'tables') {
        // PostgREST publishes its schema at the API root (service_role only).
        // Offer chess_* tables that have name + pgn columns; fall back to chess_puzzles_redone.
        let names = [];
        try {
          const r = await fetch(`${url}/rest/v1/`, { headers });
          const spec = await r.json();
          const defs = (spec && spec.definitions) || {};
          names = Object.keys(defs).filter(n =>
            TABLE_RE.test(n) && defs[n].properties && defs[n].properties.name && defs[n].properties.pgn);
        } catch (e) { /* fall through to the default */ }
        if (!names.length) names = ['chess_puzzles_redone'];
        return res.status(200).json(names.sort());
      }

      if (!TABLE_RE.test(table || '')) {
        return res.status(400).json({ error: 'table must be named chess_<name>' });
      }

      if (action === 'list') {
        // cols=full adds the pgn to every row. The page needs it: it groups by the
        // category prefix of `name` and puts the pgn straight on the board, so one
        // full listing replaces a per-row fetch.
        const full = cols === 'full';
        const params = new URLSearchParams({
          select: full ? 'id,name,pgn' : 'id,name',
          order: 'id.asc',
          limit: String(Math.min(parseInt(limit, 10) || 1000, full ? 1000 : 2000)),
        });
        const r = await fetch(`${url}/rest/v1/${table}?${params}`, { headers });
        const rows = await r.json();
        return res.status(r.ok ? 200 : r.status).json(rows);
      }

      if (action === 'get') {
        const byName = !!name && !id;
        if (!byName && !/^\d+$/.test(String(id || ''))) {
          return res.status(400).json({ error: 'A row # (id) or a name is required' });
        }
        const params = new URLSearchParams({ select: '*', limit: '1' });
        params.set(byName ? 'name' : 'id', `eq.${byName ? name : id}`);
        const r = await fetch(`${url}/rest/v1/${table}?${params}`, { headers });
        const rows = await r.json();
        if (!r.ok) return res.status(r.status).json(rows);
        if (!rows.length) {
          return res.status(404).json({ error: byName ? `No row named "${name}" in ${table}` : `No row #${id} in ${table}` });
        }
        return res.status(200).json(rows[0]);
      }

      return res.status(400).json({ error: 'Unknown action. Use action=tables, action=list, or action=get' });
    }

    if (req.method === 'POST') {
      if (!checkAccessCode(req, res)) return;
      const { action, table, name, pgn, replace } = req.body || {};
      if (!TABLE_RE.test(table || '')) {
        return res.status(400).json({ error: 'table must be named chess_<name>' });
      }

      if (action === 'bulk') {
        const rows = (req.body.rows || [])
          .map(r => ({ name: String(r.name || '').trim(), pgn: String(r.pgn || '').trim() }))
          .filter(r => r.name && r.pgn);
        if (!rows.length) return res.status(400).json({ error: 'rows are required' });
        const bad = rows.map(r => badName(r.name)).find(Boolean);
        if (bad) return res.status(400).json({ error: bad });
        if (rows.some(r => r.pgn.length > MAX_PGN_CHARS)) {
          return res.status(413).json({ error: 'PGN too large' });
        }

        const r = await fetch(`${url}/rest/v1/${table}`, {
          method: 'POST',
          headers: { ...headers, Prefer: 'return=representation' },
          body: JSON.stringify(rows),
        });
        const created = await r.json();
        if (!r.ok) return res.status(r.status).json(created);
        return res.status(200).json({ success: true, added: created.length });
      }

      if (action !== 'save') return res.status(400).json({ error: 'Unknown action. Use action=save or action=bulk' });

      const bad = badName(name);
      if (bad) return res.status(400).json({ error: bad });
      if (!pgn) return res.status(400).json({ error: 'pgn is required' });
      if (String(pgn).length > MAX_PGN_CHARS) {
        return res.status(413).json({ error: 'PGN too large' });
      }

      // `name` is not unique, so a plain save always appends. replace:true needs a
      // unique index on name to merge instead of inserting a second row.
      const r = await fetch(`${url}/rest/v1/${table}${replace ? '?on_conflict=name' : ''}`, {
        method: 'POST',
        headers: { ...headers, Prefer: (replace ? 'resolution=merge-duplicates,' : '') + 'return=representation' },
        body: JSON.stringify([{ name: String(name).trim(), pgn: String(pgn) }]),
      });
      const created = await r.json();
      if (r.status === 409) {
        return res.status(409).json({ error: `A row named "${String(name).trim()}" already exists — pick another name` });
      }
      if (!r.ok) return res.status(r.status).json(created);
      return res.status(200).json({ success: true, row: created[0] });
    }

    if (req.method === 'DELETE') {
      if (!checkAccessCode(req, res)) return;
      const table = String(req.query.table || '');
      if (!TABLE_RE.test(table)) return res.status(400).json({ error: 'table must be named chess_<name>' });
      const id = String(req.query.id || '');
      if (!/^\d+$/.test(id)) return res.status(400).json({ error: 'A numeric id is required' });

      const r = await fetch(`${url}/rest/v1/${table}?id=eq.${id}`, {
        method: 'DELETE',
        headers: { ...headers, Prefer: 'return=representation' },
      });
      const deleted = await r.json();
      if (!r.ok) return res.status(r.status).json(deleted);
      if (!deleted.length) return res.status(404).json({ error: 'Row not found' });
      return res.status(200).json({ success: true, deleted: deleted[0].id });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
}
