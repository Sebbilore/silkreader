// Fehlerquote der Zahlenprüfung: typische KI-Fehler (falscher Betrag, verschobenes Datum, falsche Frist, falsche IBAN …)
// werden in richtige Angaben eingebaut. Gemessen wird, wie viele davon verifyResult gegen den Originaltext erkennt –
// und ob richtige Angaben fälschlich bemängelt werden. Ohne KI, läuft in Sekunden: node test/fehler.mjs
import { createRequire } from 'module';
import fs from 'fs';
const F = createRequire(import.meta.url)('../src/facts.js');
const docs = fs.readdirSync('test/letters').filter((f) => f.endsWith('.txt')).map((f) => fs.readFileSync(`test/letters/${f}`, 'utf8'));
docs.push(fs.readFileSync('test/sample.txt', 'utf8'));
docs.push('Hausverwaltung Muster, Musterstadt, 03.11.2026\nMahnung\nBitte zahlen Sie die Miete von 745,00 € innerhalb von 14 Tagen, spätestens bis 17.11.2026.\nIBAN: DE02 1203 0000 0000 2020 51\nWir gewähren eine Ratenzahlung über 3 Monate, danach kommen 12,50 € Gebühr dazu.');
docs.push('Muster Versicherung, 05.10.2026\nWiderspruch gegen Ihren Bescheid ist innerhalb von 4 Wochen möglich. Die Erstattung von 1.250,00 € erfolgt bis zum 30.11.2026, spätestens aber nach 21 Tagen.');

const flagged = (claim, text) => {
  const r = F.verifyResult({ summary: `• ${claim}`, key_points: [], findings: [], figures: [] }, text);
  return r.checks.unsure.length > 0;
};
const stats = {}; // Art → { total, caught }
let falseAlarms = 0, correctTotal = 0;
const pick = (arr, i) => arr[i % arr.length];

for (const text of docs) {
  const amounts = [...text.matchAll(/\d{1,3}(?:\.\d{3})*,\d{2} ?€/g)].map((m) => m[0]);
  const dates = [...text.matchAll(/\b(\d{2})\.(\d{2})\.(\d{4})\b/g)].map((m) => ({ s: m[0], d: +m[1], m: +m[2], y: +m[3] }));
  const spans = [...text.matchAll(/\b(\d{1,2}) (Tage|Tagen|Wochen|Monate|Monaten)\b/g)].map((m) => ({ s: m[0], n: +m[1], u: m[2] }));
  const iban = (text.match(/[A-Z]{2}\d{2}(?: ?\d{4}){4,6}(?: ?\d{1,4})?/) || [])[0];
  const add = (kind, claim, isError) => {
    if (!isError) { correctTotal++; if (flagged(claim, text)) { falseAlarms++; console.log('FALSCHER ALARM', kind, '–', claim); } return; }
    const s = (stats[kind] ||= { total: 0, caught: 0 });
    s.total++;
    if (flagged(claim, text)) s.caught++; else if (process.env.V) console.log('übersehen', kind, '–', claim);
  };
  // richtige Angaben
  amounts.slice(0, 3).forEach((a) => add('richtig', `Sie sollen ${a} zahlen.`, false));
  dates.slice(0, 3).forEach((d) => add('richtig', `Frist ist der ${d.s}.`, false));
  dates.slice(0, 2).forEach((d) => add('richtig', `Bis zum ${d.d}.${d.m}. erledigen.`, false));
  spans.slice(0, 2).forEach((s) => add('richtig', `Sie haben ${s.s} Zeit.`, false));
  if (iban) add('richtig', `IBAN: ${iban}`, false);
  // Fehler
  amounts.slice(0, 3).forEach((a, i) => {
    const digits = a.replace(/[^\d]/g, '');
    const wrong = a.replace(/\d/, (c) => String((+c + 3) % 10 || 1)); // erste Ziffer ändern
    if (!text.includes(wrong)) add('Betrag mit anderer Ziffer', `Sie sollen ${wrong} zahlen.`, true);
    if (digits.length > 3) add('Betrag gerundet', `Sie sollen etwa ${Math.round(parseFloat(a.replace(/\./g, '').replace(',', '.')) / 10) * 10 + 1} € zahlen.`, true);
    add('Betrag erfunden', `Dazu kommen ${37 + i * 11},50 € Gebühren.`, true);
    add('kleiner Betrag erfunden', `Dazu kommen ${3 + i} € Gebühren.`, true);
  });
  for (const a of dates.slice(0, 2)) {
    const other = dates.find((o) => o.d !== a.d && o.m !== a.m);
    if (other) add('Datum aus Teilen anderer Daten', `Frist ist der ${String(a.d).padStart(2, '0')}.${String(other.m).padStart(2, '0')}.${a.y}.`, true);
    const shifted = `${String(a.d + 1).padStart(2, '0')}.${String(a.m).padStart(2, '0')}.${a.y}`;
    if (!text.includes(shifted)) add('Datum um einen Tag verschoben', `Frist ist der ${shifted}.`, true);
    const wrongYear = `${String(a.d).padStart(2, '0')}.${String(a.m).padStart(2, '0')}.${a.y + 1}`;
    add('Datum mit falschem Jahr', `Frist ist der ${wrongYear}.`, true);
  }
  for (const s of spans.slice(0, 2)) {
    const n = s.n === 4 ? 6 : 4;
    add('Frist mit anderer kleiner Zahl', `Sie haben ${n} ${s.u} Zeit.`, true);
    const wrongUnit = /Tag/.test(s.u) ? 'Wochen' : 'Tage';
    add('Frist mit anderer Einheit', `Sie haben ${s.n} ${wrongUnit} Zeit.`, true);
  }
  if (iban) {
    const g = iban.replace(/\s/g, '');
    const wrong = g.slice(0, 8) + String((+g[8] + 1) % 10) + g.slice(9);
    add('IBAN mit anderer Ziffer', `IBAN: ${wrong.replace(/(.{4})/g, '$1 ').trim()}`, true);
    const swapped = g.slice(0, 4) + g.slice(8, 12) + g.slice(4, 8) + g.slice(12);
    add('IBAN mit vertauschten Blöcken', `IBAN: ${swapped.replace(/(.{4})/g, '$1 ').trim()}`, true);
  }
}
let total = 0, caught = 0;
for (const [k, s] of Object.entries(stats)) { total += s.total; caught += s.caught; console.log(`${k.padEnd(36)} ${s.caught}/${s.total} erkannt`); }
const missed = total - caught;
console.log(`\nFehler übersehen: ${missed}/${total} (${(100 * missed / total).toFixed(0)} %) · falsche Alarme bei richtigen Angaben: ${falseAlarms}/${correctTotal}`);
process.exit(falseAlarms || missed ? 1 : 0);
