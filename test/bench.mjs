// KI-Test: alle Testbriefe mit echter KI lesen und messen – Betrag und Frist richtig, Aufgabe genannt,
// keine erfundenen Zahlen, Dauer. Vergleicht die eingebauten Modelle und (optional) neue Kandidaten.
// Aufruf: node test/bench.mjs <Ausgabeordner>   Umgebung: SILK_MODEL_DIR, BENCH_MODELS="fast,quality", BENCH_EXTRA="key=uri|datei;…",
//   BENCH_SPEED="alles,aus,ohne-lookup,ohne-keep,ohne-lean" (Tempo-Schalter vergleichen; Standard: alles)
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { _electron: electron } = require(process.env.PW_MODULE || 'playwright-core');
const electronPath = require('electron');
const enc = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A').replace(/::/g, ': :');
const out = path.resolve(process.argv[2] || 'bench');
fs.mkdirSync(out, { recursive: true });

const expect = JSON.parse(fs.readFileSync('test/letters/expect.json', 'utf8'));
const letters = Object.entries(expect).map(([name, e]) => ({ name, text: fs.readFileSync(`test/letters/${name}.txt`, 'utf8'), ...e }));
const MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
const dateRe = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new RegExp(`\\b0?${d}\\.\\s?(0?${m}\\.|\\s*${MONTHS[m - 1]})`, 'i'); };
const allText = (r) => [r.summary, ...(r.key_points || []), ...(r.findings || []).map((f) => `${f.title} ${f.detail || ''}`)].join(' \n ');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'silk-bench-'));
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ provider: 'builtin', builtinModel: 'fast', onboarded: 'test', uiLang: 'de', language: 'Deutsch' }));
const app = await electron.launch({ executablePath: electronPath, args: ['.'], env: { ...process.env, SILK_TEST: '1', SILK_USERDATA: userData } });
const silk = (fn, arg) => app.evaluate(fn, arg);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(5000);

const extra = (process.env.BENCH_EXTRA || '').split(';').map((x) => x.trim()).filter(Boolean).map((x) => { const [key, rest] = x.split('='); const [uri, file] = rest.split('|'); return { key, uri, file }; });
for (const m of extra) await silk((_e, mm) => global.__silk.addModel(mm.key, { uri: mm.uri, file: mm.file, name: mm.key }), m);
const SPEEDS = { alles: { lookup: true, keep: true, lean: true, twoStage: true }, aus: { lookup: false, keep: false, lean: false, twoStage: false },
  'ohne-lookup': { lookup: false, keep: true, lean: true, twoStage: true }, 'ohne-keep': { lookup: true, keep: false, lean: true, twoStage: true }, 'ohne-lean': { lookup: true, keep: true, lean: false, twoStage: true },
  'eine-stufe': { lookup: true, keep: true, lean: true, twoStage: false } };
const variants = (process.env.BENCH_SPEED || 'alles').split(',').map((x) => x.trim()).filter((x) => SPEEDS[x]);
const keys = [...(process.env.BENCH_MODELS || 'fast,quality').split(',').map((x) => x.trim()).filter(Boolean), ...extra.map((m) => m.key)];
const rows = [];
for (const key of keys) {
  let ready = await silk((_e, k) => global.__silk.modelReady(k), key);
  if (!ready) { const dl = await silk((_e, k) => global.__silk.downloadModel(k), key); ready = dl.ready; if (!ready) { console.log(`⚠️ ${key}: Download fehlgeschlagen – ${dl.error}`); rows.push({ key, error: dl.error }); continue; } }
  const used = await silk((_e, k) => global.__silk.setModel(k), key);
  for (const v of variants) {
  await silk((_e, o) => global.__silk.setSpeed(o), SPEEDS[v]);
  const label = variants.length > 1 ? `${key} · ${v}` : key;
  const res = { key: label, used: variants.length > 1 ? label : used, amount: [0, 0], date: [0, 0], task: [0, 0], clean: [0, 0], fixed: 0, ms: [], quick: [], more: [], tok: [], tps: [], details: [] };
  for (const L of letters) {
    try {
      const r = await silk((_e, t) => global.__silk.analyzeTimed({ title: 'Brief', source: 'text', pages: [t] }), L.text);
      const t = allText(r.result);
      const d = { letter: L.name, ms: r.ms, summary: r.result.summary };
      if (L.amount) { res.amount[1]++; if (t.includes(L.amount) || t.includes(L.amount.replace(/,00$/, ''))) res.amount[0]++; else d.amountMiss = L.amount; }
      if (L.date) { res.date[1]++; if (dateRe(L.date).test(t)) res.date[0]++; else d.dateMiss = L.date; }
      res.task[1]++; if (new RegExp(L.task, 'i').test(t)) res.task[0]++; else d.taskMiss = true;
      res.clean[1]++; if (!(r.result.checks?.unsure || []).length) res.clean[0]++; else d.unsure = r.result.checks.unsure;
      res.fixed += r.fixed || 0;
      res.ms.push(r.ms);
      if (r.quickMs) res.quick.push(r.quickMs);
      if (r.moreMs) res.more.push(r.moreMs);
      if (r.result.moreError) console.log(`::warning title=Details-Fehler ${label} ${L.name}::${enc(r.result.moreError.slice(0, 600))}`);
      if (r.gen) { res.tok.push(r.gen.outTokens); if (r.gen.genMs > 0) res.tps.push(r.gen.outTokens / (r.gen.genMs / 1000)); }
      res.details.push(d);
      console.log(`  ${label} · ${L.name}: ${(r.ms / 1000).toFixed(1)} s${r.gen ? ` (${r.gen.promptTokens} → ${r.gen.outTokens} Token, erstes nach ${(r.gen.firstMs / 1000).toFixed(1)} s)` : ''}${d.amountMiss ? ` · Betrag fehlt (${d.amountMiss})` : ''}${d.dateMiss ? ` · Frist fehlt (${d.dateMiss})` : ''}${d.taskMiss ? ' · keine Aufgabe' : ''}${d.unsure ? ` · erfunden: ${d.unsure.join(', ')}` : ''}`);
    } catch (e) { res.details.push({ letter: L.name, error: String(e.message || e).slice(0, 200) }); console.log(`  ${key} · ${L.name}: Fehler ${e.message}`); console.log(`::warning title=KI-Test-Fehler ${label} ${L.name}::${enc(String(e.message || e).slice(0, 600))}`); }
  }
  rows.push(res);
  }
}
await app.close();

const pct = ([a, b]) => (b ? `${a}/${b}` : '–');
const avg = (a) => (a.length ? `${(a.reduce((x, y) => x + y, 0) / a.length / 1000).toFixed(1)} s` : '–');
const mean = (a, f = (x) => x) => (a.length ? f(a.reduce((x, y) => x + y, 0) / a.length) : '–');
const table = ['| Modell | Betrag | Frist | Aufgabe | ohne erfundene Zahlen | nachgefragt | Ø Dauer | Ø erste Stichpunkte | Ø Details (Mehr) | Ø Token | Token/s |', '|---|---|---|---|---|---|---|---|---|---|---|',
  ...rows.map((r) => (r.error ? `| ${r.key} | Download fehlgeschlagen | | | | | | | | | |` : `| ${r.key}${r.used !== r.key ? ` (→ ${r.used})` : ''} | ${pct(r.amount)} | ${pct(r.date)} | ${pct(r.task)} | ${pct(r.clean)} | ${r.fixed} | ${avg(r.ms)} | ${avg(r.quick)} | ${avg(r.more)} | ${mean(r.tok, Math.round)} | ${mean(r.tps, (x) => x.toFixed(1))} |`))].join('\n');
console.log(`\n${table}`);
fs.writeFileSync(path.join(out, 'bench.json'), JSON.stringify(rows, null, 2));
fs.writeFileSync(path.join(out, 'bench.md'), `# KI-Test – ${new Date().toISOString().slice(0, 10)}\n\n${table}\n`);
if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## KI-Test mit ${letters.length} Testbriefen\n\n${table}\n`);
console.log(`::notice title=KI-Test::${enc(table)}`);
