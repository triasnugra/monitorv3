// Tarik journal.json + metadata tiap mesin. Gagal -> data lama dipertahankan, ditandai basi.
import fs from 'node:fs'; import zlib from 'node:zlib'; import crypto from 'node:crypto';
const cfg = JSON.parse(fs.readFileSync('config.json')).mesin;
const META = ['forward-protocol.json', 'forward-protocol-v2.json', 'forward-report.json', 'forward-report-v2.json', 'gate-log.json', 'funnel.json', 'scan-log.json'];
fs.mkdirSync('data/raw', { recursive: true }); fs.mkdirSync('data/snapshots', { recursive: true });
const LF = 'data/fetch-log.json', log = fs.existsSync(LF) ? JSON.parse(fs.readFileSync(LF)) : {};
const get = async u => { const r = await fetch(u + '?_=' + Date.now(), { signal: AbortSignal.timeout(30000) }); if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); };
const sha = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
const now = new Date();
for (const [m, c] of Object.entries(cfg)) {
  const L = log[m] = log[m] || {}, f = `data/raw/${m}.json`;
  try {
    const txt = await get(c.base + 'journal.json'), j = JSON.parse(txt);
    if (!Array.isArray(j) || !j.length) throw new Error('journal kosong / bukan array');
    const old = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null;
    if (old && sha(old) !== sha(txt)) {
      const snap = `data/snapshots/${m}-${now.toISOString().slice(0, 10)}.json.gz`;
      if (!fs.existsSync(snap)) fs.writeFileSync(snap, zlib.gzipSync(old)); // jejak versi sebelum ditimpa
      const n0 = JSON.parse(old).length; if (j.length < n0) L.warn = `baris berkurang ${n0} -> ${j.length} (${now.toISOString()})`;
    }
    fs.writeFileSync(f, txt);
    Object.assign(L, { ok: true, lastOk: now.toISOString(), rows: j.length, sha: sha(txt), error: null });
  } catch (e) { Object.assign(L, { ok: false, error: String(e.message || e), lastTry: now.toISOString() }); console.log(m, 'GAGAL:', L.error); }
  for (const mf of META) { try { fs.writeFileSync(`data/raw/${m}__${mf}`, await get(c.base + mf)); } catch { /* tidak ada: abaikan */ } }
}
fs.writeFileSync(LF, JSON.stringify(log, null, 1));
