// Echte KI auf echtem Windows: eingebautes Modell laden (oder aus dem Cache), echte Texte analysieren,
// übersetzen und dabei Dauer, Arbeitsspeicher und Prozessorlast messen.
// Aufruf: node test/windows-ai.mjs <Ausgabeordner>   (Umgebung: SILK_MODEL_DIR = Modell-Ordner)
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { _electron: electron } = require(process.env.PW_MODULE || 'playwright-core');
const electronPath = require('electron');
const enc = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A').replace(/::/g, ': :');
const crash = (e) => { console.log(`::error title=KI-Test abgestürzt::${enc(e?.stack || e)}`); process.exit(1); };
process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);

const out = path.resolve(process.argv[2] || 'win-ai');
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, detail = '', critical = true) => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 1500), critical });
  console.log(`${ok ? '✅' : critical ? '❌' : '⚠️ '} ${name}${detail ? ` – ${String(detail).slice(0, 300)}` : ''}`);
};

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'silk-ai-'));
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ provider: 'builtin', builtinModel: 'fast', onboarded: 'test', uiLang: 'de', language: 'Deutsch' }));
const app = await electron.launch({ executablePath: electronPath, args: ['.'], env: { ...process.env, SILK_TEST: '1', SILK_USERDATA: userData } });
const silk = (fn, arg) => app.evaluate(fn, arg);

// Verbrauch während einer Aufgabe mitschreiben (Höchstwerte)
async function measure(task) {
  let peakMb = 0, cpuSum = 0, n = 0, stop = false;
  const sampler = (async () => { while (!stop) { const m = await silk(() => global.__silk.metrics()).catch(() => null); if (m) { peakMb = Math.max(peakMb, m.mb); cpuSum += m.cpu; n++; } await sleep(1000); } })();
  try { return { value: await task(), peakMb, avgCpu: n ? +(cpuSum / n).toFixed(1) : 0 }; } finally { stop = true; await sampler; }
}

try {
  await sleep(5000);
  // 1) Leerlauf mit echter App (ohne Modell im Speicher)
  await silk(() => global.__silk.metrics());
  let cpu = 0, mb = 0;
  for (let i = 0; i < 10; i++) { await sleep(1000); const m = await silk(() => global.__silk.metrics()); cpu += m.cpu; mb = m.mb; }
  const idle = await silk(() => global.__silk.metrics());
  check('Leerlauf auf Windows: Arbeitsspeicher', mb < 700, `${mb} MB (${idle.procs} Prozesse: ${JSON.stringify(idle.byType)})`, false);
  check('Leerlauf auf Windows: Prozessor', cpu / 10 < 5, `Ø ${(cpu / 10).toFixed(1)} %`, false);

  // 2) Modell laden (aus dem Cache oder von Hugging Face)
  let ready = await silk(() => global.__silk.modelReady('fast'));
  if (!ready) {
    const t0 = Date.now();
    const dl = await silk(() => global.__silk.downloadModel('fast'));
    ready = dl.ready;
    check('Eingebautes Modell heruntergeladen', ready, ready ? `${Math.round((Date.now() - t0) / 1000)} s` : dl.error, false);
  } else check('Eingebautes Modell aus dem Cache', true);
  if (!ready) throw Object.assign(new Error('Modell nicht verfügbar – KI-Prüfungen übersprungen'), { skip: true });

  // 3) Echte Analyse des Beispieltextes
  const sample = fs.readFileSync('test/sample.txt', 'utf8');
  const a = await measure(() => silk((_e, t) => global.__silk.analyzeTimed({ title: 'Jahresbericht', source: 'text', pages: [t] }), sample));
  const r = a.value.result;
  const bullets = String(r.summary || '').split(/\n|•/).filter((x) => x.trim()).length;
  check('Echte Analyse liefert ein Ergebnis', r && r.summary && bullets >= 2, `${(a.value.ms / 1000).toFixed(1)} s, ${bullets} Stichpunkte: ${String(r.summary).slice(0, 160)}`);
  check('Ergebnis enthält Angaben (Zahlen mit Fundstelle)', (r.figures || []).length >= 2, `${(r.figures || []).length} Angaben: ${(r.figures || []).slice(0, 4).map((f) => `${f.label}=${f.value}`).join(', ')}`, false);
  check('Analyse: Dauer (kurzer Text, nur Prozessor)', a.value.ms < 180000, `${(a.value.ms / 1000).toFixed(1)} s`, false);
  check('Kurzfassung kommt vor den Details', a.value.quickMs && a.value.quickMs < a.value.ms * 0.7, `Kurzfassung nach ${((a.value.quickMs || 0) / 1000).toFixed(1)} s, fertig nach ${(a.value.ms / 1000).toFixed(1)} s`, false);
  const unsure = r.checks?.unsure || [];
  check('Zahlen-Prüfung: keine erfundenen Zahlen in den Stichpunkten', unsure.length === 0, unsure.length ? `nicht im Text: ${unsure.join(', ')}` : `${(r.figures || []).map((f) => f.check).join(' ')}`, false);

  // Brief: Rechnung mit IBAN und Frist
  const brief = 'Stadtwerke Musterstadt GmbH\nMusterstadt, 20. Oktober 2026\n\nRechnungsnummer: RE-2026-4711\n\nSehr geehrte Frau Beispiel,\n\nfür Ihren Stromverbrauch im September berechnen wir Ihnen 98,90 €.\nRechnungsbetrag: 98,90 €\n\nBitte überweisen Sie den Betrag bis zum 15.11.2030 auf folgendes Konto:\nEmpfänger: Stadtwerke Musterstadt GmbH\nIBAN: DE89 3704 0044 0532 0130 00\nVerwendungszweck: RE-2026-4711\n\nMit freundlichen Grüßen\nIhre Stadtwerke';
  const lb = await silk((_e, t) => global.__silk.analyzeTimed({ title: 'Brief', source: 'text', pages: [t] }), brief);
  const L = lb.result.letter;
  check('Brief erkannt: Rechnung, Betrag, IBAN, Frist', L?.kind === 'rechnung' && L.amount?.value === 98.9 && L.iban && L.deadlines.length, `${(lb.ms / 1000).toFixed(1)} s (Kurzfassung ${((lb.quickMs || 0) / 1000).toFixed(1)} s) | ${String(lb.result.summary).slice(0, 140)} | Handlungen: ${(lb.result.findings || []).filter((f) => f.kind === 'Handlung').map((f) => f.title).join(' / ')}`);
  check('Analyse: Arbeitsspeicher (Spitze)', a.peakMb < 4000, `${a.peakMb} MB, Prozessor Ø ${a.avgCpu} %`, false);

  // 4) Langes Dokument: wird bis zum Ende gelesen (abschnittsweise)
  const long = Array.from({ length: 5 }, (_, i) => sample.replace(/2025/g, String(2021 + i))).join('\n\n') + '\n\nSchlusssatz: Der Vorstand tritt am 31. Dezember 2030 geschlossen zurück.';
  const b = await measure(() => silk((_e, t) => global.__silk.analyzeTimed({ title: 'Langer Bericht', source: 'text', pages: [t] }), long));
  const lr = b.value.result;
  check('Langes Dokument bis zum Ende gelesen', /2030|zurück/i.test(JSON.stringify(lr)), `${(b.value.ms / 1000).toFixed(1)} s, Spitze ${b.peakMb} MB | Kernaussagen: ${(lr.key_points || []).join(' / ')} | Notizen: ${b.value.notes || ''}`, false);

  // 5) Übersetzen mit echter KI
  // Wie der Knopf „Übersetzen“: deutscher Text bei Ergebnissprache Deutsch → ins Englische
  const t = await silk(() => global.__silk.transformTimed('translate', 'Der Umsatz stieg um 18 Prozent auf 412 Millionen Euro. Die Dividende steigt auf 1,10 Euro je Aktie.'));
  check('Übersetzen mit echter KI (Deutsch → Englisch)', /revenue|sales|turnover|dividend/i.test(t.text || '') && !/Umsatz/.test(t.text || ''), `${(t.ms / 1000).toFixed(1)} s: ${String(t.text).slice(0, 160)}`);
  const t2 = await silk(() => global.__silk.transformTimed('translate', 'Revenue rose by 18 percent to 412 million euros.'));
  // Jede richtige deutsche Wortwahl zählt (Umsatz, Einnahmen, Erlöse …) – nur Englisch darf es nicht mehr sein
  check('Übersetzen mit echter KI (Englisch → Deutsch)', /Umsatz|Einnahmen|Erlös|stieg|gestiegen|gesteigert|Prozent|Millionen/i.test(t2.text || '') && !/\b(revenue|rose|million)\b/i.test(t2.text || ''), `${(t2.ms / 1000).toFixed(1)} s: ${String(t2.text).slice(0, 160)}`);
  const rp = await silk(() => global.__silk.transformTimed('reply', 'Hallo Frau Weber, können wir den Termin am Donnerstag auf 14 Uhr verschieben? Viele Grüße, Jan'));
  check('Antwort-Entwurf mit echter KI', (rp.text || '').length > 30 && /Donnerstag|14|Termin/i.test(rp.text || ''), `${(rp.ms / 1000).toFixed(1)} s: ${String(rp.text).slice(0, 160)}`, false);
  const sm = await silk(() => global.__silk.transformTimed('simplify', 'Die Nettoverschuldung erhöhte sich infolge des negativen Free Cashflows auf 238 Millionen Euro.'));
  check('Einfache Sprache mit echter KI', (sm.text || '').length > 20, `${(sm.ms / 1000).toFixed(1)} s: ${String(sm.text).slice(0, 160)}`, false);
  // In meiner Sprache: Brief für Menschen erklären, die kaum Deutsch können – erst mit dem schnellen, dann mit dem gründlichen Modell
  const LANGS = [['uk', /[іїєґ]/i, 'Ukrainisch'], ['tr', /[ğışİ]/, 'Türkisch'], ['ar', /[\u0600-\u06FF]{3}/, 'Arabisch']];
  const explainAll = async (label) => {
    for (const [code, re, name] of LANGS) {
      const ex = await silk((_e, [c, t]) => global.__silk.transformTimed(`explain:${c}`, t), [code, brief]);
      check(`Brief auf ${name} erklären (${label})`, re.test(ex.text || '') && /98[,.]90/.test(ex.text || ''), `${(ex.ms / 1000).toFixed(1)} s: ${String(ex.text).replace(/\s+/g, ' ').slice(0, 260)}`, false);
    }
  };
  await explainAll('schnelles Modell');
  let q = await silk(() => global.__silk.modelReady('quality'));
  if (!q) { const t0 = Date.now(); const dq = await silk(() => global.__silk.downloadModel('quality')); q = dq.ready; check('Gründliches Modell heruntergeladen', q, q ? `${Math.round((Date.now() - t0) / 1000)} s` : dq.error, false); }
  if (q) await explainAll('gründliches Modell');

  // 6) Nach der Arbeit: Modell wird nach 3 Minuten wieder freigegeben – hier nur Momentaufnahme
  const after = await silk(() => global.__silk.metrics());
  check('Arbeitsspeicher direkt nach der Analyse', true, `${after.mb} MB (Modell bleibt 3 Minuten geladen)`, false);
} catch (e) {
  if (e.skip) check('KI-Prüfungen', false, e.message, false);
  else check('KI-Testlauf', false, e.stack || e.message);
} finally {
  await app.close().catch(() => {});
}

const failed = results.filter((r) => !r.ok && r.critical);
const warned = results.filter((r) => !r.ok && !r.critical);
fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(results, null, 2));
console.log(`::notice title=KI auf Windows (${results.length - failed.length - warned.length}/${results.length})::${enc(results.map((r) => `${r.ok ? 'OK ' : r.critical ? 'FEHLER ' : 'WARNUNG '} ${r.name}${r.detail ? ` – ${r.detail}` : ''}`).join('\n'))}`);
// Eigener Bericht für die Erklärungen in anderen Sprachen (der Gesamtbericht wird bei GitHub gekürzt)
const ex = results.filter((r) => /erklären|Gründliches/.test(r.name));
if (ex.length) console.log(`::notice title=Erklären in anderen Sprachen::${enc(ex.map((r) => `${r.ok ? 'OK ' : 'WARNUNG '} ${r.name} – ${String(r.detail).slice(0, 300)}`).join('\n'))}`);
for (const r of failed.slice(0, 9)) console.log(`::error title=${enc(r.name)}::${enc(r.detail || 'fehlgeschlagen')}`);
process.exit(failed.length ? 1 : 0);
