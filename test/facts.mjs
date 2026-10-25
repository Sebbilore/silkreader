// Feste Regeln (ohne KI): Zahlenprüfung, Fristen, Briefe
import { createRequire } from 'module';
const F = createRequire(import.meta.url)('../src/facts.js');
import fs from 'fs';
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
const now = new Date('2026-10-25T10:00:00');

const sample = fs.readFileSync('test/sample.txt', 'utf8');
const mock = JSON.parse(fs.readFileSync('test/mock.json', 'utf8'));
const v = F.verifyResult(mock, sample);
ok('Mock-Angaben stehen im Text', v.figures.every((f) => f.check !== 'missing'), JSON.stringify(v.figures.filter((f) => f.check === 'missing').map((f) => f.value)));
ok('Stichpunkte ohne unsichere Zahlen', v.checks.unsure.length === 0, JSON.stringify(v.checks.unsure));
const fake = F.verifyResult({ summary: '• Umsatz 512 Mio. €\n• 18 % Wachstum', key_points: [], findings: [], figures: [{ label: 'Umsatz', value: '512 Mio. €', quote: 'erfunden', page: 1 }] }, sample);
ok('Erfundene Zahl erkannt', fake.checks.unsure.includes('512 Mio.') && fake.figures[0].check === 'missing', JSON.stringify(fake.checks));

const dollar = F.verifyResult({ summary: '', key_points: [], findings: [], figures: [{ label: 'Umsatz', value: '$412,000,000,000', quote: 'auf 412 Millionen Euro', page: 1 }, { label: 'EBIT', value: '$61,8M', quote: 'gibt es nicht', page: 1 }] }, sample);
ok('Umgeschriebener Wert aus der Fundstelle repariert', dollar.figures[0].value === '412 Millionen Euro' && dollar.figures[0].check === 'ok', JSON.stringify(dollar.figures[0]));
ok('Dollar ohne Fundstelle als unsicher', dollar.figures[1].check === 'missing', JSON.stringify(dollar.figures[1]));

const brief = `Stadtwerke Musterstadt GmbH
Musterstadt, 20. Oktober 2026

Rechnungsnummer: RE-2026-4711
Kundennummer: 123456

Sehr geehrte Frau Beispiel,

für Ihren Stromverbrauch im September berechnen wir Ihnen folgende Beträge:
Grundpreis 12,50 €
Arbeitspreis 86,40 €
Rechnungsbetrag: 98,90 €

Bitte überweisen Sie den Betrag bis zum 15.11.2026 auf folgendes Konto:
Empfänger: Stadtwerke Musterstadt GmbH
IBAN: DE89 3704 0044 0532 0130 00
Verwendungszweck: RE-2026-4711

Mit freundlichen Grüßen
Ihre Stadtwerke`;
const L = F.letterFacts(brief, { now });
ok('Rechnung erkannt', L?.kind === 'rechnung', L?.kind);
ok('Betrag 98,90 €', L?.amount?.value === 98.9, JSON.stringify(L?.amount));
ok('IBAN gültig erkannt', L?.iban === 'DE89 3704 0044 0532 0130 00', L?.iban);
ok('Frist 15.11.2026', L?.deadlines.some((d) => d.iso === '2026-11-15'), JSON.stringify(L?.deadlines.map((d) => d.iso)));
ok('Briefdatum ist keine Frist', !L?.deadlines.some((d) => d.iso === '2026-10-20'));
ok('Verwendungszweck', L?.refs.some((r) => r.label === 'Verwendungszweck' && r.value.includes('RE-2026-4711')), JSON.stringify(L?.refs));
ok('Empfänger', /Stadtwerke/.test(L?.recipient), L?.recipient);
ok('Falsche IBAN abgelehnt', !F.ibanValid('DE89 3704 0044 0532 0130 01'));

const bescheid = `Finanzamt Musterstadt
Datum: 01.10.2026
Steuernummer: 123/456/78901

Bescheid über Einkommensteuer 2025

Sehr geehrter Herr Muster,
die Einkommensteuer wird auf 4.210 € festgesetzt. Es ergibt sich eine Nachzahlung von 312,00 €.
Die Nachzahlung ist innerhalb von einem Monat zu zahlen.

Rechtsbehelfsbelehrung: Gegen diesen Bescheid ist der Einspruch zulässig. Er ist binnen eines Monats nach Bekanntgabe einzulegen.`;
const B = F.letterFacts(bescheid, { now });
ok('Bescheid erkannt', B?.kind === 'bescheid', B?.kind);
ok('Einspruch möglich', B?.canObject === true);
ok('Nachzahlung 312 €', B?.amount?.value === 312, JSON.stringify(B?.amount));
ok('Relative Frist ab Briefdatum (01.11.2026)', B?.deadlines.some((d) => d.iso === '2026-11-01' && d.relative), JSON.stringify(B?.deadlines.map((d) => d.iso)));

ok('Kein Brief bei Artikel', F.letterFacts(sample, { now }) === null);
const dl = F.findDeadlines('Die Unterlagen sind bis zum 3.12. vorzulegen. Version 2.4 erschien am Montag.', { now });
ok('Frist ohne Jahr', dl.length === 1 && dl[0].iso === '2026-12-03', JSON.stringify(dl.map((d) => d.iso)));
ok('Versionsnummer keine Frist', F.findDeadlines('Siehe Kapitel 4.2. und Abschnitt 3.1.', { now }).length === 0);

console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
