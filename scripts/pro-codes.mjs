// Pro-Codes erzeugen. Braucht den privaten Schlüssel (Umgebungsvariable PRO_SIGNING_KEY, PEM-Text).
// Aufruf: node scripts/pro-codes.mjs <Anzahl> <Monate (0 = unbegrenzt)> [Notiz]
import { createRequire } from 'module';
const pro = createRequire(import.meta.url)('../src/pro.js');
const [count = '1', months = '0', note = ''] = process.argv.slice(2);
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
const n = Math.min(100, Math.max(1, Number(count) || 1)), m = Math.max(0, Number(months) || 0);
const lines = [];
for (let i = 0; i < n; i++) {
  const code = pro.makeCode(key, { months: m });
  const check = pro.checkCode(code);
  if (!check.ok) { console.error('Code passt nicht zum öffentlichen Schlüssel in src/pro.js'); process.exit(1); }
  lines.push(code);
}
const head = `${n} Pro-Code(s), ${m ? `gültig ${m} Monat(e) ab heute` : 'unbegrenzt'}${note ? ` – ${note}` : ''}`;
console.log([`## ${head}`, '', '```', ...lines, '```'].join('\n'));
