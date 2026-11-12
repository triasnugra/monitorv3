// Normalisasi + grading seragam (aturan baku trade-sim.mjs, candle Binance 1H + 1m) -> data/graded.json
import fs from 'node:fs';
import { gradeTrade, mapK, H1 } from './trade-sim.mjs';
import { buildCanonical } from './signals-core.mjs';
const RULES = 'baku-1-5.v1', FEE = 0.05, SLIP = 0.05, COST = 2 * FEE + SLIP; // % per trade (2 sisi + slip), sama dgn protokol
const cfg = JSON.parse(fs.readFileSync('config.json')).mesin, NOW = Date.now();
const rd = f => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f)) : null);
const prev = rd('data/graded.json'), cache = new Map();
if (prev && prev.rules === RULES) for (const r of prev.rows) if (r._fp && r.status_monitor !== 'OPEN') cache.set(r.id, r);
const HOSTS = ['https://data-api.binance.vision', 'https://api.binance.com', 'https://api1.binance.com', 'https://api2.binance.com'];
const sleep = ms => new Promise(r => setTimeout(r, ms)); let hi = 0;
async function bj(p) {
  let last;
  for (let a = 0; a < 5; a++) for (let t = 0; t < HOSTS.length; t++) {
    const h = HOSTS[(hi + t) % HOSTS.length];
    try {
      const r = await fetch(`${h}/api/v3/${p}`, { signal: AbortSignal.timeout(20000) });
      if (r.status === 429 || r.status === 418) { await sleep(2500 * (a + 1)); continue; }
      if (r.status === 400) throw Object.assign(new Error('simbol tidak dikenal'), { fatal: 1 });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      hi = (hi + t) % HOSTS.length; await sleep(60); return await r.json();
    } catch (e) { if (e.fatal) throw e; last = e; }
  }
  throw last;
}
const SM = { TP: 'TP', SL: 'SL', kedaluwarsa: 'KEDALUWARSA_TERISI', 'tidak terisi': 'TIDAK_TERISI', menunggu: 'OPEN', NO_TRADE: 'NO_TRADE', 'tidak valid': 'TIDAK_VALID' };
const FIL = s => s === 'TP' || s === 'SL' || s === 'KEDALUWARSA_TERISI';
const rows = [], dupes = {}, rawN = {};
for (const [m, c] of Object.entries(cfg)) {
  const j = rd(`data/raw/${m}.json`); if (!j) continue;
  rawN[m] = j.length; dupes[m] = 0; const seen = new Set();
  for (const x of j) {
    const k = `${x.aset}|${x.arah}|${x.t}`; if (seen.has(k)) { dupes[m]++; continue; } seen.add(k);
    const r = { id: `${m}|${x.id}`, mesin: m, aset: x.aset, arah: x.arah, entry: +x.entry, sl: +x.sl, tp: +x.tp, t: +x.t, due: +x.due,
      status_mesin: c.type === 'crypto' ? null : SM[x.hasil] || x.hasil, R_mesin: c.type === 'crypto' || x.R === '' ? null : x.R,
      agen: x.agen ?? null, engine: x.engine ?? null, fwd: x.fwd ? 1 : 0, tx_mesin: x.tx ?? null, hasil_mesin: x.hasil ?? null };
    if (c.type === 'crypto') Object.assign(r, { kind: x.kind, tipe: x.tipe, tf: x.tf, mode: x.mode });
    rows.push(r);
  }
}
// Sumber data tunggal (signals-core.mjs): kepemilikan analisis + tanggal UTC/WIB, sama untuk semua monitor.
const KJ = {}, KP = {};
for (const m of Object.keys(cfg)) {
  const j = rd(`data/raw/${m}.json`); if (!j) continue; KJ[m] = j;
  KP[m] = ['forward-protocol.json', 'forward-protocol-v2.json'].map(f => rd(`data/raw/${m}__${f}`)).filter(Boolean);
}
const KAN = buildCanonical(KJ, KP), kmap = new Map(KAN.rows.map(k => [`${k.mesin}|${k.aset}|${k.arah}|${k.t}`, k]));
for (const r of rows) {
  const k = kmap.get(`${r.mesin}|${String(r.aset).toUpperCase()}|${r.arah}|${r.t}`);
  r.milik = k ? k.milik : 'tidak_diketahui'; r.legacy = k?.legacy ? 1 : 0;
  r.tanggal_utc = k?.tanggal_utc ?? null; r.tanggal_wib = k?.tanggal_wib ?? null;
}
// Baris yang dibuang kanonik sebagai kembar (dua agen mencatat setup sama <= 60 dtk, mis. tnv2) tidak dihitung dua kali.
for (let i = rows.length - 1; i >= 0; i--) if (rows[i].milik === 'tidak_diketahui' && Number.isFinite(rows[i].t)) { dupes[rows[i].mesin]++; rows.splice(i, 1); }
const bad = r => !['LONG', 'SHORT'].includes(r.arah) || ![r.entry, r.sl, r.tp, r.t, r.due].every(Number.isFinite) || r.entry === r.sl || !r.aset
  || (r.arah === 'LONG' ? !(r.sl < r.entry && r.tp > r.entry) : !(r.sl > r.entry && r.tp < r.entry));
const fp = r => [r.entry, r.sl, r.tp, r.t, r.due].join('|');
const todo = [];
for (const r of rows) {
  if (r.status_mesin === 'NO_TRADE') { r.status_monitor = 'NO_TRADE'; r.R_monitor = 0; continue; }
  if (bad(r)) { r.status_monitor = 'TIDAK_VALID'; r.ket = 'data tidak lengkap/urutan salah'; r.R_monitor = 0; continue; }
  const c = cache.get(r.id);
  if (c && c._fp === fp(r)) { Object.assign(r, { status_monitor: c.status_monitor, R_monitor: c.R_monitor, tx: c.tx, ket: c.ket, _fp: c._fp }); continue; }
  todo.push(r);
}
console.log('baris', rows.length, 'perlu dinilai', todo.length);
async function grade(r) {
  const sym = r.aset + 'USDT', t0 = Math.floor(r.t / H1) * H1;
  try {
    const g = await gradeTrade(r, { now: NOW,
      h1: async () => (await bj(`klines?symbol=${sym}&interval=1h&startTime=${t0}&limit=1000`)).map(mapK),
      m1: async (a, b) => (await bj(`klines?symbol=${sym}&interval=1m&startTime=${a}&endTime=${b}&limit=1000`)).map(mapK) });
    if (!g) { r.status_monitor = 'OPEN'; r.R_monitor = 0; return; }
    r.status_monitor = SM[g.hasil]; r.R_monitor = +g.R.toFixed(4); r.tx = g.t; r._fp = fp(r);
  } catch (e) { r.status_monitor = 'TIDAK_VALID'; r.ket = 'candle gagal: ' + e.message; r.R_monitor = 0; }
}
let q = 0; await Promise.all(Array.from({ length: 4 }, async () => { while (q < todo.length) await grade(todo[q++]); }));
for (const r of rows) { // R sesudah biaya: R - biaya% / jarak-risiko%
  r.R_net = FIL(r.status_monitor) ? +(r.R_monitor - COST / ((Math.abs(r.entry - r.sl) / r.entry) * 100)).toFixed(4) : 0;
  if (r.status_monitor === 'OPEN') delete r._fp;
}
// Flag fork: sinyal identik (aset,arah,entry,sl,tp) di >=2 mesin eliz => bukan bukti independen
const key2 = r => [r.aset, r.arah, r.entry, r.sl, r.tp].join('|'), g2 = new Map();
for (const r of rows) if (cfg[r.mesin].type === 'eliz') (g2.get(key2(r)) || g2.set(key2(r), new Set()).get(key2(r))).add(r.mesin);
for (const r of rows) r.fork_dup = cfg[r.mesin].type === 'eliz' && g2.get(key2(r)).size > 1 ? 1 : 0;
// Protokol dibaca dari file (tanpa hardcode). pickSignals = salinan forward-lib, memakai hasil/tx MESIN agar cocok dgn forward-report.
const protocols = [], RES = h => ['TP', 'SL', 'kedaluwarsa', 'tidak terisi'].includes(h);
for (const m of Object.keys(cfg)) {
  const mr = rows.filter(r => r.mesin === m), ps = [];
  for (const f of ['forward-protocol.json', 'forward-protocol-v2.json']) { const P = rd(`data/raw/${m}__${f}`); if (P && P.engine) ps.push({ f, P }); }
  ps.sort((a, b) => (b.P.mulai_ms || 0) - (a.P.mulai_ms || 0)); ps.length = Math.min(ps.length, 1); // hanya protokol aktif
  for (const r of mr) { r.proto = null; r.kept = ps.length ? 0 : 1; }
  for (const { f, P } of ps) {
    const same = mr.filter(r => r.fwd && r.agen === P.agen && r.t >= P.mulai_ms && ['LONG', 'SHORT'].includes(r.arah) && !['tidak valid', 'NO_TRADE'].includes(r.hasil_mesin) && r.engine === P.engine).sort((a, b) => a.t - b.t);
    const busy = new Map(), one = P.aturan?.satu_order_aktif_per_koin;
    for (const r of same) {
      r.proto = f;
      if (one && r.t < (busy.get(r.aset) ?? 0)) { r.kept = 0; continue; }
      r.kept = 1; busy.set(r.aset, RES(r.hasil_mesin) ? (r.tx_mesin ?? r.due) : Infinity);
    }
    protocols.push({ mesin: m, id: f, report: f.includes('v2') ? 'forward-report-v2.json' : 'forward-report.json', engine: P.engine, agen: P.agen, mulai: P.mulai, mulai_ms: P.mulai_ms,
      min_trade: P.syarat_evaluasi?.min_trade_terisi, min_minggu: P.syarat_evaluasi?.min_minggu_berbeda, versi: P.versi });
  }
}
fs.writeFileSync('data/graded.json', JSON.stringify({ generated: new Date(NOW).toISOString(), rules: RULES, cost_pct: COST, rawN, dupes, protocols, kanonik: { aturan: KAN.aturan, hash_v1: KAN.hash_v1, laporan: KAN.laporan, peringatan: KAN.peringatan }, rows }));
console.log('selesai', rows.length);
