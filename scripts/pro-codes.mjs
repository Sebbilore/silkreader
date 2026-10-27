// Pro-Codes erzeugen. Braucht den privaten Schlüssel (Umgebungsvariable PRO_SIGNING_KEY, PEM-Text).
// Aufruf: node scripts/pro-codes.mjs <Anzahl> <Monate (0 = unbegrenzt)> [Notiz]
import { createRequire } from 'module';
const pro = createRequire(import.meta.url)('../src/pro.js');
const [count = '1', months = '0', note = ''] = process.argv.slice(2);
const key = process.env.PRO_SIGNING_KEY;
if (!key) { console.error('PRO_SIGNING_KEY fehlt'); process.exit(1); }
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
