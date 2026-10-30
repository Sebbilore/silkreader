// Lokales Lernen und neue feste Regeln (Absender, Vergleich, Betrug, Unterschrift, Folgen) – ohne KI
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';
const req = createRequire(import.meta.url);
const F = req('../src/facts.js');
const { createLearner } = req('../src/learn.js');
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
const now = new Date('2026-10-25T10:00:00');
const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'silk-learn-')), 'learn.json');
const L = createLearner(file);

const brief = (betrag, abschlag, faellig, briefdatum) => `Stadtwerke Musterstadt GmbH
Postfach 10 20 30
12345 Musterstadt

Datum: ${briefdatum}
Rechnung Nr. RE-${betrag}

Sehr geehrte Frau Beispiel,

Ihre Stromrechnung für den Abrechnungszeitraum. Rechnungsbetrag: ${betrag} €
Fällig am ${faellig}. Ab dem nächsten Monat beträgt Ihr Abschlag ${abschlag} € im Monat.
Bitte überweisen Sie den Betrag. IBAN: DE89 3704 0044 0532 0130 00

Mit freundlichen Grüßen
Ihre Stadtwerke`;

// 1) Absender und Vergleich
const b1 = brief('120,00', '84,00', '15.03.2026', '01.03.2026');
const b2 = brief('98,90', '92,00', '15.11.2026', '28.10.2026');
ok('Absender erkannt', F.senderOf(b1)?.name === 'Stadtwerke Musterstadt GmbH', JSON.stringify(F.senderOf(b1)));
ok('Abschlag erkannt', F.recurringAmount(b2)?.value === 92, JSON.stringify(F.recurringAmount(b2)));
L.observe(b1, F.letterFacts(b1, { now }), { date: new Date('2026-03-02').getTime() });
const ctx = L.context(b2, { now });
ok('„2. Brief dieses Jahr“', ctx?.nth === 2, JSON.stringify(ctx));
ok('Abschlag steigt 84 → 92 (+9,5 %)', ctx?.trend?.from === 84 && ctx.trend.to === 92 && ctx.trend.pct === 9.5, JSON.stringify(ctx?.trend));
L.observe(b2, F.letterFacts(b2, { now }), { date: now.getTime() });
ok('Nochmal derselbe Brief zählt nicht doppelt', L.context(b2, { now }).nth === 2);

// 2) Korrektur Frist → Regel „fällig am“ greift beim nächsten Brief
const letter2 = F.letterFacts(b2, { now });
const r = L.correct({ text: b2, field: 'deadline', wrong: letter2.deadlines[0]?.iso, right: '15.11.2026' });
ok('Korrektur gespeichert mit Regel', r.ok && r.correction.rule?.before?.includes('fällig'), JSON.stringify(r.correction?.rule));
const b3 = brief('101,10', '92,00', '15.12.2026', '20.11.2026').replace('Fällig am 15.12.2026.', 'Zahlungsziel laut Vertrag: 30.11.2026. Fällig am 15.12.2026.');
const a3 = L.apply(b3, F.letterFacts(b3, { now }));
ok('Regel angewendet: Datum nach „fällig am“', a3.letter.deadlines[0].iso === '2026-12-15' && a3.learned.length === 1, `${JSON.stringify(a3.letter.deadlines.map((d) => d.iso))} ${a3.learned.join(' ')}`);

// 3) Korrektur Betrag → Regel nach Stichwort
const b4 = 'Stadtwerke Musterstadt GmbH\n\nSehr geehrte Frau Beispiel,\nTeilbetrag Strom 40,00 €, Teilbetrag Gas 50,00 €, Gesamtbetrag 90,00 €. Bitte zahlen Sie bis zum 01.12.2026.\nMit freundlichen Grüßen';
L.correct({ text: b4, field: 'amount', wrong: '50,00 €', right: '90,00' });
const b5 = b4.replace('40,00', '41,00').replace('90,00', '91,00');
const L5 = F.letterFacts(b5, { now }) || { amount: { value: 50, text: '50,00 €', label: '' }, deadlines: [] };
const a5 = L.apply(b5, { ...L5, amount: { value: 50, text: '50,00 €', label: '' } });
ok('Regel angewendet: Betrag nach „gesamtbetrag“', a5.letter.amount.value === 91, JSON.stringify(a5.letter.amount));

// 4) Briefart und Absendername
L.correct({ text: b2, field: 'kind', right: 'Abschlagsrechnung' });
ok('Briefart übernommen', L.apply(b3, F.letterFacts(b3, { now })).letter.label === 'Abschlagsrechnung');
L.correct({ text: b2, field: 'summary', right: 'Der Abschlag ist keine Nachzahlung.' });
ok('Hinweis für die KI', /keine Nachzahlung/.test(L.hints(b3)) && /Rechnung/.test(L.hints(b3)), L.hints(b3).replace(/\n/g, ' | '));
const li = L.list();
ok('Liste für die Einstellungen', li.stats.senders === 1 && li.stats.corrections === 4 && li.senders[0].recurring.includes('→'), JSON.stringify(li.stats) + ' ' + li.senders[0].recurring);
L.forgetCorrection(li.corrections[0].id);
ok('Einzelne Korrektur vergessen', L.list().stats.corrections === 3);
const exp = L.exportData();
L.forgetAll();
ok('Alles vergessen', L.list().stats.letters === 0);
L.importData(exp);
ok('Sicherung wieder einlesen', L.list().stats.corrections === 3);

// 5) Betrug, Unterschrift, Folgen
const scam = 'Sehr geehrter Kunde,\nIhr Paket wartet. Die Zollgebühr von 2,99 € ist offen. Zahlen Sie innerhalb von 24 Stunden, klicken Sie auf den Link. IBAN: LT12 1000 0111 0100 1000';
ok('Betrug erkannt', F.scamCheck(scam)?.reasons.length >= 3, JSON.stringify(F.scamCheck(scam)?.reasons.map((x) => x.id)));
ok('Echter Brief: keine Warnung', !F.scamCheck(b2) && !F.scamCheck(fs.readFileSync('test/sample.txt', 'utf8')));
ok('Bank-Hinweis „niemals PIN“ ist kein Betrug', !F.scamCheck('Sehr geehrte Kundin, bitte bestätigen Sie den Termin. Wir fragen Sie niemals nach Ihrer PIN oder TAN. Klicken Sie nicht auf Links.'));
const sig = F.signatureNeeded(['Weiterbewilligungsantrag\nSehr geehrte Frau Beispiel,', 'Bitte unterschreiben Sie den Antrag und senden Sie ihn zurück an: Jobcenter Musterstadt, Postfach 12 34\n\nOrt, Datum, Unterschrift']);
ok('Unterschrift nötig, Seite 2, Rücksendeadresse', sig?.page === 2 && /Jobcenter/.test(sig.returnTo), JSON.stringify(sig));
ok('Ohne Unterschrift: nichts', !F.signatureNeeded([b2]));
const mahn = 'Stadtwerke\nMahnung\nSehr geehrte Frau Beispiel, der Betrag von 103,90 € ist offen. Mahngebühr: 5,00 €. Strom.';
const cq = F.consequences('mahnung', mahn);
ok('Folgen bei Mahnung (Gebühr, Inkasso, Sperre)', cq?.steps.length === 3 && /5,00/.test(cq.steps[0]) && /Sperre/.test(cq.steps[2]), JSON.stringify(cq?.steps));
ok('Folgen bei Bescheid', /bestandskräftig/.test(F.consequences('bescheid', 'Bescheid über Nachzahlung')?.steps[0] || ''));

console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
