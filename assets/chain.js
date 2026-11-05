// Verifikasi hash-chain di klien. eliz = forward-lib.verifyChain; crypto = journal-lib.verifyJournal.
const hex = async s => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))].map(b => b.toString(16).padStart(2, '0')).join('');
const SEAL = ['id', 't', 'due', 'agen', 'aset', 'arah', 'entry', 'sl', 'tp', 'harga_awal', 'alasan', 'alert', 'engine'];
const SEAL2 = [...SEAL, 'trig', 'score', 'grade', 'age'];
const IMM = ['aset', 'arah', 't', 'tf', 'kind', 'harga_awal', 'mode', 'entry', 'sl', 'tp', 'tps', 'engine', 'seq', 'prev'];
export async function verifyEliz(rows) {
  const f = rows.filter(r => r.fwd).sort((a, b) => a.seq - b.seq), err = []; let prev = 'GENESIS';
  for (let i = 0; i < f.length; i++) {
    const r = f[i];
    if (r.seq !== i + 1) err.push(`${r.id}: seq ${r.seq}, harapan ${i + 1}`);
    if (r.prev !== prev) err.push(`${r.id}: tautan prev putus`);
    const canon = JSON.stringify((r.sv === 2 ? SEAL2 : SEAL).map(k => (r[k] === undefined ? null : r[k])));
    if (r.h !== (await hex(`${prev}|${r.seq}|${canon}`)).slice(0, 20)) err.push(`${r.id}: isi berubah`);
    prev = r.h;
  }
  return { ok: !err.length, n: f.length, tidakTersegel: rows.length - f.length, err };
}
export async function verifyCrypto(rows) {
  const err = []; let prev = null;
  for (let i = 0; i < rows.length; i++) {
    const e = rows[i], o = {}; for (const k of IMM) o[k] = e[k] === undefined ? null : e[k];
    if (e.seq !== i + 1) err.push(`${e.id}: seq ${e.seq}, harapan ${i + 1}`);
    if ((e.prev ?? null) !== prev) err.push(`${e.id}: prev tidak cocok`);
    if (e.h !== (await hex(JSON.stringify(o))).slice(0, 20)) err.push(`${e.id}: isi berubah`);
    prev = e.h;
  }
  return { ok: !err.length, n: rows.length, tidakTersegel: 0, err };
}
