// Erfundene Briefe als feste Testfälle (Jobcenter, Finanzamt, Krankenkasse, Inkasso, Rundfunk, Bußgeld) – ohne KI
import { createRequire } from 'module';
import fs from 'fs';
const F = createRequire(import.meta.url)('../src/facts.js');
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
const now = new Date('2026-10-25T10:00:00');
const read = (n) => fs.readFileSync(`test/letters/${n}.txt`, 'utf8');
const E = {
  jobcenter: { kind: 'bescheid', sender: /Jobcenter Musterstadt/, deadline: '2026-11-30', object: true, signature: true },
  finanzamt: { kind: 'bescheid', sender: /Finanzamt Musterstadt/, amount: 512, deadline: '2026-11-18', object: true, objection: 'Einspruch' },
  krankenkasse: { kind: 'bescheid', sender: /AOK Musterland/, recurring: 212.4, nothingToPay: true },
  inkasso: { kind: 'mahnung', sender: /Muster Inkasso/, amount: 148, deadline: '2026-11-05', iban: true, consequence: /Mahnbescheid|Inkasso/ },
  rundfunk: { kind: 'rechnung', sender: /Beitragsservice/, amount: 55.08, deadline: '2026-11-15' },
  bussgeld: { kind: 'bescheid', sender: /Bußgeldstelle|Stadt Musterstadt/, amount: 70, deadline: '2026-10-26' },
};
for (const [n, e] of Object.entries(E)) {
  const t = read(n);
  const L = F.letterFacts(t, { now });
  const s = F.senderOf(t);
  ok(`${n}: als Brief erkannt (${e.kind})`, L?.kind === e.kind, L?.kind);
  ok(`${n}: Absender`, e.sender.test(s?.name || ''), s?.name);
  if (e.amount) ok(`${n}: Betrag ${e.amount}`, L?.amount?.value === e.amount, JSON.stringify(L?.amount));
  if (e.deadline) ok(`${n}: Frist ${e.deadline}`, L?.deadlines.some((d) => d.iso === e.deadline), JSON.stringify(L?.deadlines.map((d) => d.iso)));
  if (e.object) ok(`${n}: Widerspruch/Einspruch möglich`, L?.canObject && (!e.objection || L.objection === e.objection), `${L?.canObject} ${L?.objection}`);
  if (e.iban) ok(`${n}: IBAN gefunden`, !!L?.iban);
  if (e.recurring) ok(`${n}: neuer Monatsbeitrag`, F.recurringAmount(t)?.value === e.recurring, JSON.stringify(F.recurringAmount(t)));
  ok(`${n}: Unterschrift ${e.signature ? 'nötig' : 'nicht nötig'}`, !!F.signatureNeeded([t]) === !!e.signature, JSON.stringify(F.signatureNeeded([t])));
  if (e.consequence) ok(`${n}: Folgen erklärt`, e.consequence.test((F.consequences(L.kind, t)?.steps || []).join(' ')));
  ok(`${n}: keine Betrugswarnung`, !F.scamCheck(t), JSON.stringify(F.scamCheck(t)));
}
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
