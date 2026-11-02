// Pro-Codes erzeugen. Braucht den privaten Schlüssel (Umgebungsvariable PRO_SIGNING_KEY, PEM-Text).
// Aufruf: node scripts/pro-codes.mjs <Anzahl> <Dauer> [Notiz] [Bis-Datum]
//   Dauer: „lebenslang“ (Standard), „1 Woche“, „1 Monat“, „6 Monate“, „1 Jahr“, „30 Tage“ … (nur eine Zahl = Monate, 0 = unbegrenzt)
//   Bis-Datum (optional, ersetzt die Dauer): 2027-03-31 oder 31.03.2027 – gültig bis einschließlich diesem Tag
import { createRequire } from 'module';
const pro = createRequire(import.meta.url)('../src/pro.js');
const [count = '1', dauer = 'lebenslang', note = '', bis = ''] = process.argv.slice(2);
const key = process.env.PRO_SIGNING_KEY;
if (!key) { console.error('PRO_SIGNING_KEY fehlt'); process.exit(1); }
// Ungefährliche Beschreibung des eingetragenen Schlüssels (ohne Inhalt), falls er nicht passt
const body = key.replace(/-----(BEGIN|END)[^-]*-----/g, '').replace(/[^A-Za-z0-9+/=]/g, '');
if (body.length < 40) {
  const lines = key.split(/\r?\n/).map((l) => { const c = [...l]; const other = c.filter((x) => !/[A-Za-z0-9+/=\- ]/.test(x)); return `${c.length} Zeichen, davon ${c.filter((x) => /[A-Za-z0-9]/.test(x)).length} Buchstaben/Ziffern, andere: ${[...new Set(other.map((x) => `U+${x.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')}`))].slice(0, 6).join(' ') || '–'}`; });
  console.error(`Zeilen: ${lines.join(' | ')}`);
  console.error(`Schlüssel unbrauchbar: ${key.length} Zeichen, ${key.split(/\r?\n/).length} Zeile(n), Kopfzeile ${/BEGIN PRIVATE KEY/.test(key) ? 'ja' : 'nein'}, Schlüsselteil ${body.length} Zeichen (erwartet 64)`);
  process.exit(1);
}
// Gültigkeit bestimmen
function validity() {
  const b = bis.trim();
  if (b) {
    const m = b.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/) || b.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!m) { console.error(`Bis-Datum „${b}“ nicht verstanden – bitte so: 2027-03-31 oder 31.03.2027`); process.exit(1); }
    const [y, mo, d] = b.includes('-') ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
    const until = new Date(Date.UTC(+y, +mo - 1, +d, 23, 59));
    if (isNaN(until) || until < Date.now()) { console.error(`Bis-Datum „${b}“ liegt in der Vergangenheit oder gibt es nicht`); process.exit(1); }
    return { opts: { until }, text: 'gültig' };
  }
  const t = dauer.trim().toLowerCase();
  if (!t || t === '0' || t.startsWith('unbegrenzt') || t.startsWith('lebenslang') || t.startsWith('für immer')) return { opts: {}, text: 'lebenslang' };
  const m = t.match(/^(\d+)\s*(tag|woche|monat|jahr)?/);
  if (!m) { console.error(`Dauer „${dauer}“ nicht verstanden – z. B. „1 Monat“, „2 Wochen“, „1 Jahr“, „lebenslang“`); process.exit(1); }
  const n = Math.max(1, Number(m[1])), unit = m[2] || 'monat';
  const opts = unit === 'tag' ? { days: n } : unit === 'woche' ? { days: n * 7 } : unit === 'jahr' ? { months: n * 12 } : { months: n };
  const label = { tag: n === 1 ? 'Tag' : 'Tage', woche: n === 1 ? 'Woche' : 'Wochen', monat: n === 1 ? 'Monat' : 'Monate', jahr: n === 1 ? 'Jahr' : 'Jahre' }[unit];
  return { opts, text: `gültig ${n} ${label} ab heute` };
}
const { opts, text } = validity();
const n = Math.min(100, Math.max(1, Number(count) || 1));
const lines = [];
let until = null;
for (let i = 0; i < n; i++) {
  const code = pro.makeCode(key, opts);
  const check = pro.checkCode(code);
  if (!check.ok) { console.error('Code passt nicht zum öffentlichen Schlüssel in src/pro.js'); process.exit(1); }
  until = check.until;
  lines.push(code);
}
const lastDay = until && new Date(until.getTime() - 1).toLocaleDateString('de-DE', { timeZone: 'UTC' });
const head = `${n} Pro-Code(s), ${text}${lastDay ? ` bis einschließlich ${lastDay}` : ''}${note ? ` – ${note}` : ''}`;
console.log([`## ${head}`, '', '```', ...lines, '```'].join('\n'));
