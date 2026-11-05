import { verifyEliz, verifyCrypto } from './chain.js';
const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const MS = ['tn', 'tnv2', 'tnv2c2', 'dseek', 'chatgpt', 'crypto', 'grox'], NOW = Date.now(), COL = ['#3fb68b', '#5aa9e6', '#e0b04a', '#c678dd', '#e5605c', '#56d4dd', '#a3a3a3'];
const J = async u => { try { const r = await fetch(u + '?_=' + NOW); return r.ok ? await r.json() : null; } catch { return null; } };
const FIL = r => ['TP', 'SL', 'KEDALUWARSA_TERISI'].includes(r.status_monitor), SIG = r => !['NO_TRADE', 'TIDAK_VALID'].includes(r.status_monitor);
const f2 = (x, d = 2) => (Number.isFinite(x) ? (x >= 0 ? '+' : '') + x.toFixed(d) : '–'), pc = x => (Number.isFinite(x) ? (x * 100).toFixed(0) + '%' : '–');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const wk = t => Math.floor((t - 4 * 864e5) / (7 * 864e5)), dt = t => new Date(t).toISOString().slice(0, 16).replace('T', ' ');
const cl = x => (x > 0 ? 'g' : x < 0 ? 'r' : '');
function wilson(k, n) { if (!n) return null; const z = 1.96, p = k / n, d = 1 + z * z / n, c = p + z * z / (2 * n), m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)); return [(c - m) / d, (c + m) / d]; }
function boot(f) {
  const m = new Map(); for (const r of f) { const k = wk(r.t), o = m.get(k) || { s: 0, n: 0 }; o.s += r.R_net; o.n++; m.set(k, o); }
  const c = [...m.values()]; if (c.length < 2) return { w: c.length };
  let a = 1; const rnd = () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const B = 3000, x = new Float64Array(B);
  for (let b = 0; b < B; b++) { let S = 0, N = 0; for (let i = 0; i < c.length; i++) { const p = c[(rnd() * c.length) | 0]; S += p.s; N += p.n; } x[b] = N ? S / N : 0; }
  x.sort(); return { lo: x[Math.floor(.025 * B)], hi: x[Math.floor(.975 * B)], w: c.length };
}
function stats(rows) {
  const s = rows.filter(SIG), f = s.filter(FIL).sort((a, b) => a.tx - b.tx), n = f.length, tp = f.filter(r => r.status_monitor === 'TP').length, sl = f.filter(r => r.status_monitor === 'SL').length;
  const wb = tp + f.filter(r => r.status_monitor === 'KEDALUWARSA_TERISI' && r.R_net > 0).length, nt = s.filter(r => r.status_monitor === 'TIDAK_TERISI').length;
  const R = f.map(r => r.R_net), sum = R.reduce((a, b) => a + b, 0), gw = R.filter(x => x > 0).reduce((a, b) => a + b, 0), gl = -R.filter(x => x < 0).reduce((a, b) => a + b, 0);
  let c = 0, pk = 0, dd = 0; for (const x of R) { c += x; pk = Math.max(pk, c); dd = Math.max(dd, pk - c); }
  return { N: s.length, open: s.filter(r => r.status_monitor === 'OPEN').length, n, tp, sl, wb, res: n + nt, fill: n + nt ? n / (n + nt) : NaN, gross: n ? f.reduce((a, r) => a + r.R_monitor, 0) / n : NaN,
    net: n ? sum / n : NaN, sum, pf: gl ? gw / gl : n ? Infinity : NaN, dd, wa: wilson(tp, tp + sl), wbc: wilson(wb, n), ci: boot(f), f };
}
const ci = c => (c ? `[${pc(c[0])}–${pc(c[1])}]` : '');
const td = (v, n, cls = '') => `<td class="${cls}">${v}<small>${n ?? ''}</small></td>`;
let D, LOG, RAW = {};
const scoped = () => D.rows.filter(r => $('#scope').value === 'a' || r.kept);
function lb() {
  const rows = scoped(), H = ['Mesin', 'N sinyal', 'N terisi', 'Fill-rate', 'Win-rate (a) TP vs SL', 'Win-rate (b) +kedaluwarsa', 'Avg R kotor', 'Avg R net', 'Expectancy net CI95', 'Profit factor', 'Max DD (R)', 'Update'];
  let h = `<table><tr>${H.map(x => `<th>${x}</th>`).join('')}</tr>`;
  for (const m of MS) {
    const mr = rows.filter(r => r.mesin === m), s = stats(mr), L = LOG[m] || {};
    if (!mr.length) { h += `<tr><td>${m}</td><td colspan="11" style="text-align:left" class="y">tidak tersedia${m === 'grox' ? ' (jurnal hanya di localStorage; aktifkan Action scan di repo grox)' : ''}</td></tr>`; continue; }
    const small = s.n < 30 ? '<span class="tag">sampel kecil</span>' : '', age = L.lastOk ? (NOW - Date.parse(L.lastOk)) / 36e5 : NaN;
    const e = s.ci.lo !== undefined ? `${f2(s.ci.lo)} … ${f2(s.ci.hi)}` : 'n/a';
    h += `<tr><td>${m}${small}</td>${td(s.N, `open ${s.open}`)}${td(s.n, '')}${td(pc(s.fill), `n=${s.res}`)}${td(pc(s.tp / (s.tp + s.sl)), `${ci(s.wa)} n=${s.tp + s.sl}`)}${td(pc(s.wb / s.n), `${ci(s.wbc)} n=${s.n}`)}${td(f2(s.gross), `n=${s.n}`, cl(s.gross))}${td(f2(s.net), `n=${s.n}`, cl(s.net))}${td(e, `n=${s.n}, ${s.ci.w ?? 0} minggu`, cl(s.ci.lo))}${td(Number.isFinite(s.pf) ? s.pf.toFixed(2) : '∞', `n=${s.n}`)}${td(s.dd.toFixed(1), `n=${s.n}`)}<td class="${age > 6 ? 'y' : ''}">${Number.isFinite(age) ? age.toFixed(1) + ' jam' : '–'}</td></tr>`;
  }
  $('#lbt').innerHTML = h + '</table>';
}
async function pr() {
  let h = '';
  for (const P of D.protocols) {
    const rep = await J(`data/raw/${P.mesin}__${P.report}`), f = D.rows.filter(r => r.mesin === P.mesin && r.proto === P.id && r.kept && FIL(r)), s = stats(D.rows.filter(r => r.mesin === P.mesin && r.proto === P.id && r.kept));
    const w = new Set(f.map(r => wk(r.t))).size, ready = f.length >= P.min_trade && w >= P.min_minggu, b = (v, mx) => `<div class="bar"><i style="width:${Math.min(100, 100 * v / mx)}%"></i></div>`;
    h += `<div class="card"><b>${P.mesin}</b> · ${esc(P.id)} · engine <code>${P.engine}</code> · mulai ${esc(P.mulai)}<br>Trade terisi ${f.length}/${P.min_trade}${b(f.length, P.min_trade)}Minggu berbeda ${w}/${P.min_minggu}${b(w, P.min_minggu)}`;
    h += ready ? `<p>Syarat terpenuhi. Batas bawah CI95 expectancy net: <b class="${cl(s.ci.lo)}">${f2(s.ci.lo)}</b> → ${s.ci.lo > 0 ? 'LULUS' : 'belum lulus'}</p>` : `<p class="y">Belum layak dinilai: angka kinerja disembunyikan sampai KEDUA syarat terpenuhi.</p>`;
    h += rep ? `<small>Mesin (forward-report ${esc(rep.dibuat)}): terisi ${rep.counts.terisi}, minggu ${rep.counts.minggu_berbeda}, tercatat ${rep.counts.tercatat_sesuai_protokol}, dedupe ${rep.counts.dilewati_dedupe}, chain ${rep.chain.ok ? 'OK' : 'BERMASALAH'} (n=${rep.chain.n}). Monitor: tercatat ${D.rows.filter(r => r.mesin === P.mesin && r.proto === P.id && r.kept).length}.</small>` : '<small>forward-report tidak tersedia</small>';
    h += '</div>';
  }
  $('#prt').innerHTML = (h || '<p>Tidak ada protokol.</p>') + '<p><small>crypto dan grox tidak punya forward-protocol: tidak ada syarat yang bisa dibandingkan.</small></p>';
}
let chart;
function eq() {
  const rows = scoped(), on = new Set($$('#eqc input:checked').map(i => i.value)); if (!$('#eqc').innerHTML) { $('#eqc').innerHTML = MS.map((m, i) => `<label style="color:${COL[i]};margin-right:10px"><input type="checkbox" value="${m}" checked> ${m}</label>`).join(''); $$('#eqc input').forEach(i => i.onchange = eq); MS.forEach(m => on.add(m)); }
  const ds = MS.map((m, i) => { let c = 0; const pts = rows.filter(r => r.mesin === m && FIL(r)).sort((a, b) => a.tx - b.tx).map(r => ({ x: r.tx, y: +(c += r.R_net).toFixed(3) })); return { label: m, data: pts, borderColor: COL[i], backgroundColor: COL[i], pointRadius: 0, stepped: true, hidden: !on.has(m) }; }).filter(d => d.data.length);
  chart?.destroy(); chart = new Chart($('#eqx'), { type: 'line', data: { datasets: ds }, options: { parsing: false, scales: { x: { type: 'linear', ticks: { callback: v => new Date(v).toISOString().slice(5, 10), color: '#8b98a8' } }, y: { title: { display: true, text: 'R net kumulatif', color: '#8b98a8' }, ticks: { color: '#8b98a8' } } }, plugins: { legend: { labels: { color: '#dbe2ea' } } } } });
}
function co() {
  const g = {}; for (const r of D.rows.filter(SIG)) (g[r.aset + '|' + r.arah] ??= []).push(r);
  const ev = []; for (const a of Object.values(g)) { a.sort((x, y) => x.t - y.t); const used = new Set(); for (const r of a) { if (used.has(r)) continue; const w = a.filter(x => !used.has(x) && x.t >= r.t && x.t <= r.t + 864e5), mem = [], sm = new Set(), kf = new Set(); for (const x of w) { used.add(x); const k = [x.entry, x.sl, x.tp].join('|'); if (sm.has(x.mesin) || (x.fork_dup && kf.has(k))) continue; sm.add(x.mesin); if (x.fork_dup) kf.add(k); mem.push(x); } if (mem.length >= 2) ev.push(mem); } }
  let h = '<table><tr><th>Konsensus</th><th>Kejadian</th><th>Trade terisi</th><th>Win-rate (a)</th><th>Avg R net</th></tr>';
  for (const k of [2, 3, 4]) { const E = ev.filter(m => m.length >= k), s = stats(E.flat()); h += `<tr><td>≥${k} mesin</td><td>${E.length}</td>${td(s.n, '')}${td(pc(s.tp / (s.tp + s.sl)), `${ci(s.wa)} n=${s.tp + s.sl}`)}${td(f2(s.net), `n=${s.n}`, cl(s.net))}</tr>`; }
  $('#cot').innerHTML = h + '</table><p><small>Jendela 24 jam sejak sinyal pertama; mesin dengan sinyal identik (flag fork) dihitung satu suara. Baris yang sama bisa muncul di beberapa tingkat.</small></p>';
}
const DIM = { aset: r => r.aset, arah: r => r.arah, hari: r => ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'][new Date(r.t).getUTCDay()], jam: r => String(new Date(r.t).getUTCHours()).padStart(2, '0'), minggu: r => new Date(wk(r.t) * 7 * 864e5 + 4 * 864e5).toISOString().slice(0, 10), kind: r => r.kind, tipe: r => r.tipe, tf: r => r.tf, mode: r => r.mode };
function bd() {
  const m = $('#bm').value, k = $('#bk').value, rows = scoped().filter(r => (!m || r.mesin === m) && FIL(r) && DIM[k](r) != null), g = {};
  for (const r of rows) (g[DIM[k](r)] ??= []).push(r);
  const keys = Object.keys(g).sort(['aset', 'kind', 'tipe'].includes(k) ? (a, b) => g[b].length - g[a].length : undefined);
  $('#bdt').innerHTML = `<table><tr><th>${k}</th><th>N terisi</th><th>Win-rate (a)</th><th>Avg R net</th><th>Σ R net</th></tr>` + keys.map(x => { const s = stats(g[x]); return `<tr><td>${esc(x)}${s.n < 30 ? '<span class="tag">kecil</span>' : ''}</td><td>${s.n}</td>${td(pc(s.tp / (s.tp + s.sl)), `n=${s.tp + s.sl}`)}${td(f2(s.net), `n=${s.n}`, cl(s.net))}<td class="${cl(s.sum)}">${f2(s.sum)}</td></tr>`; }).join('') + '</table>';
}
function tb() {
  const m = $('#fm').value, a = $('#fa').value.trim().toUpperCase(), st = $('#fs').value, d1 = $('#fd1').value ? Date.parse($('#fd1').value) : 0, d2 = $('#fd2').value ? Date.parse($('#fd2').value) + 864e5 : 1e15;
  const rows = D.rows.filter(r => (!m || r.mesin === m) && (!a || r.aset === a) && (!st || r.status_monitor === st) && r.t >= d1 && r.t < d2).sort((x, y) => y.t - x.t); tb.rows = rows;
  $('#fn').textContent = `${rows.length} baris`;
  $('#tbt').innerHTML = '<table><tr><th>Waktu UTC</th><th>Mesin</th><th>Aset</th><th>Arah</th><th>Entry</th><th>SL</th><th>TP</th><th>Status mesin</th><th>Status monitor</th><th>R kotor</th><th>R net</th><th>Catatan</th></tr>' + rows.slice(0, 500).map(r => `<tr><td>${dt(r.t)}</td><td>${r.mesin}</td><td>${esc(r.aset)}</td><td>${r.arah}</td><td>${r.entry}</td><td>${r.sl}</td><td>${r.tp}</td><td>${r.status_mesin ?? '–'}</td><td>${r.status_monitor}</td><td class="${cl(r.R_monitor)}">${f2(r.R_monitor)}</td><td class="${cl(r.R_net)}">${f2(r.R_net)}</td><td>${r.fork_dup ? '<span class="tag">fork</span>' : ''}${esc(r.ket || '')}</td></tr>`).join('') + '</table>' + (rows.length > 500 ? '<small>Menampilkan 500 pertama; CSV memuat semua.</small>' : '');
}
function csv() {
  const K = ['id', 'mesin', 'aset', 'arah', 'entry', 'sl', 'tp', 't', 'due', 'status_mesin', 'R_mesin', 'status_monitor', 'R_monitor', 'R_net', 'tx', 'kept', 'proto', 'fork_dup', 'kind', 'tipe', 'tf', 'mode', 'ket'];
  const q = v => (v == null ? '' : /[",\n]/.test(v) ? `"${String(v).replace(/"/g, '""')}"` : v);
  const b = new Blob([[K.join(','), ...tb.rows.map(r => K.map(k => q(r[k])).join(','))].join('\n')], { type: 'text/csv' }), a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'sinyal.csv'; a.click();
}
async function au() {
  const list = (t, rows, cols) => `<details><summary>${t} (${rows.length})</summary><div class="sc"><table><tr>${cols.map(c => `<th>${c[0]}</th>`).join('')}</tr>${rows.slice(0, 60).map(r => `<tr>${cols.map(c => `<td>${esc(c[1](r))}</td>`).join('')}</tr>`).join('')}</table></div></details>`;
  const a = D.rows.filter(r => r.status_mesin && r.status_mesin !== r.status_monitor && r.status_mesin !== 'NO_TRADE'), pairs = {}; for (const r of a) { const k = `${r.mesin}: ${r.status_mesin} → ${r.status_monitor}`; pairs[k] = (pairs[k] || 0) + 1; }
  let h = `<h3>(a) status_mesin ≠ status_monitor: ${a.length}</h3><p><small>Wajar untuk dseek (batal 72 jam) dan tnv2c2 (batal bila TP tanpa isi): aturan mereka beda dari baku.</small></p><ul>${Object.entries(pairs).sort((x, y) => y[1] - x[1]).map(([k, v]) => `<li>${esc(k)}: ${v}</li>`).join('')}</ul>` + list('Daftar', a, [['Mesin', r => r.mesin], ['Aset', r => r.aset], ['Waktu', r => dt(r.t)], ['Mesin', r => r.status_mesin], ['Monitor', r => r.status_monitor]]);
  h += '<h3>(b) Integritas hash-chain (diverifikasi di browser)</h3><table><tr><th>Mesin</th><th>Hasil</th><th>Tersegel</th><th>Tidak tersegel</th><th>Error</th></tr>';
  const inc = []; for (const m of MS) { const raw = await J(`data/raw/${m}.json`); if (!raw) continue; if (m === 'grox') { h += '<tr><td>grox</td><td class="y">tanpa hash-chain</td><td>0</td><td>' + raw.length + '</td><td></td></tr>'; continue; } const v = m === 'crypto' ? await verifyCrypto(raw) : await verifyEliz(raw); h += `<tr><td>${m}</td><td class="${v.ok ? 'g' : 'r'}">${v.ok ? 'OK' : 'GAGAL'}</td><td>${v.n}</td><td>${v.tidakTersegel}</td><td>${esc(v.err.slice(0, 3).join('; '))}</td></tr>`; }
  h += '</table>';
  const inv = D.rows.filter(r => r.status_monitor === 'TIDAK_VALID'); h += `<h3>(c) Sinyal tanpa data lengkap / tidak valid: ${inv.length}</h3>` + list('Daftar', inv, [['Mesin', r => r.mesin], ['Aset', r => r.aset], ['Waktu', r => dt(r.t)], ['Ket', r => r.ket]]);
  h += '<h3>(d) Jumlah baris mesin vs monitor</h3><table><tr><th>Mesin</th><th>Baris jurnal</th><th>Duplikat dibuang</th><th>Di monitor</th><th>NO_TRADE</th><th>Tidak valid</th><th>Kept protokol</th><th>Tercatat forward-report</th></tr>';
  for (const m of MS) { if (D.rawN[m] == null) continue; const r = D.rows.filter(x => x.mesin === m), P = D.protocols.filter(p => p.mesin === m), reps = await Promise.all(P.map(p => J(`data/raw/${m}__${p.report}`))); h += `<tr><td>${m}</td><td>${D.rawN[m]}</td><td>${D.dupes[m]}</td><td>${r.length}</td><td>${r.filter(x => x.status_monitor === 'NO_TRADE').length}</td><td>${r.filter(x => x.status_monitor === 'TIDAK_VALID').length}</td><td>${P.length ? P.map(p => r.filter(x => x.proto === p.id && x.kept).length).join(' / ') : '–'}</td><td>${reps.length ? reps.map(x => x?.counts?.tercatat_sesuai_protokol ?? '?').join(' / ') : '–'}</td></tr>`; }
  h += '</table>';
  const st = D.rows.filter(r => r.status_mesin === 'OPEN' && r.due < NOW); h += `<h3>(e) "menunggu" yang sudah lewat due: ${st.length}</h3>` + list('Daftar', st, [['Mesin', r => r.mesin], ['Aset', r => r.aset], ['Due', r => dt(r.due)], ['Monitor', r => r.status_monitor]]);
  $('#aut').innerHTML = h;
}
async function init() {
  [D, LOG] = await Promise.all([J('data/graded.json'), J('data/fetch-log.json')]); LOG ||= {};
  if (!D) { $('#gen').textContent = 'data/graded.json belum ada. Jalankan Action "update-monitor" dulu.'; return; }
  $('#gen').textContent = `Data dinilai: ${dt(Date.parse(D.generated))} UTC · aturan ${D.rules} · biaya ${D.cost_pct}%`;
  const W = []; for (const m of MS) { const L = LOG[m]; if (!L) { if (m === 'grox') W.push('grox: tidak tersedia'); continue; } if (L.ok === false) W.push(`${m}: BASI, fetch gagal (${L.error}); memakai data lama dari ${L.lastOk ?? '?'}`); else if (NOW - Date.parse(L.lastOk) > 6 * 36e5) W.push(`${m}: data ${((NOW - Date.parse(L.lastOk)) / 36e5).toFixed(1)} jam lalu (>6 jam)`); if (L.warn) W.push(`${m}: ${L.warn}`); }
  if (NOW - Date.parse(D.generated) > 6 * 36e5) W.push('graded.json lebih dari 6 jam');
  $('#warn').innerHTML = W.map(w => `<div>${esc(w)}</div>`).join('');
  for (const m of MS) $('#fm').add(new Option(m, m)), $('#bm').add(new Option(m, m)); $('#bm').insertAdjacentHTML('afterbegin', '<option value="">Semua</option>'); $('#bm').value = '';
  for (const s of ['TP', 'SL', 'KEDALUWARSA_TERISI', 'TIDAK_TERISI', 'OPEN', 'NO_TRADE', 'TIDAK_VALID']) $('#fs').add(new Option(s, s));
  for (const k of Object.keys(DIM)) $('#bk').add(new Option(k, k));
  const go = t => { $$('section').forEach(s => s.classList.toggle('on', s.id === t)); $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.t === t)); location.hash = t; if (t === 'eq') eq(); };
  $$('#nav button').forEach(b => b.onclick = () => go(b.dataset.t));
  $('#scope').onchange = () => { lb(); bd(); if ($('#eq').classList.contains('on')) eq(); };
  ['#bm', '#bk'].forEach(s => $(s).onchange = bd); ['#fm', '#fa', '#fs', '#fd1', '#fd2'].forEach(s => $(s).oninput = tb); $('#csv').onclick = csv;
  lb(); bd(); tb(); co(); pr(); au(); go(location.hash.slice(1) || 'lb');
}
init();
