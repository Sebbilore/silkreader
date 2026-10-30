// 1.23: Die Spinne fragt nach (nur noch das Wichtigste: Erinnerung, Widerspruch, schon bezahlt?), „Nicht mehr fragen“,
// Selbstkontrolle der Zahlen, „Sofort da“ (schon gelesen), Antwort mit Beleg aus dem Text
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 1, tipsSeen: ['ring', 'drop', 'more', 'deadlines', 'explorer', 'font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', SILK_REPAIR: '1', SILK_CACHE: '1' } });
const errs = [];
const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
const show = async (text, title = 'Brief') => {
  await app.evaluate((_e, [t, ti]) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: ti, source: 'selection', pages: [t] }, autoStart: true }), [text, title]);
  const pop = await find('popup.html'); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(900); return pop;
};
const q = (pop) => pop.evaluate(() => document.querySelector('.askq p')?.textContent || '');
const brief = (betrag, abschlag, faellig) => `Stadtwerke Musterstadt GmbH\nPostfach 10 20 30, 12345 Musterstadt\n\nRechnungsnummer: RE-${betrag}\n\nSehr geehrte Frau Beispiel,\n\nIhre Stromrechnung. Rechnungsbetrag: ${betrag} €\nBitte überweisen Sie den Betrag bis zum ${faellig}.\nAb dem nächsten Monat beträgt Ihr Abschlag ${abschlag} € im Monat.\nIBAN: DE89 3704 0044 0532 0130 00\n\nMit freundlichen Grüßen\nIhre Stadtwerke`;

// 1) Rechnung → „Soll ich dich erinnern?“, Selbstkontrolle
let pop = await show(brief('98,90', '84,00', '15.11.2030'), 'Rechnung 1');
ok('Frage „erinnern“ nach Rechnung', /3 Tage vorher erinnern/.test(await q(pop)), await q(pop));
ok('Schlank: höchstens 3 Stichpunkte oben', (await pop.$$eval('ul.lead:not(#details ul) li', (l) => l.length)) <= 3);
ok('Zusätze stecken unter „Mehr aus dem Brief“', /Mehr aus dem Brief/.test(await pop.textContent('#moreBtn')) && !(await pop.isVisible('#fb')));
await pop.click('#moreBtn'); await sleep(200);
ok('Mehr aus dem Brief: Zahlungsdaten und Feedback', await pop.isVisible('#fb') && !!(await pop.$('#details .paydata')));
const ck = await pop.evaluate(() => document.querySelector('.checks')?.innerText || '');
ok('Selbstkontrolle sichtbar (Nachgefragt/geprüft)', /Nachgefragt|Zahlen geprüft/.test(ck), ck);
await pop.screenshot({ path: `${out}/v124-frage.png` });
await pop.click('.askq [data-q="yes"]'); await sleep(500);
ok('Erinnerung bestätigt', /Ich erinnere dich/.test(await pop.evaluate(() => document.getElementById('askBack').innerText)));
// 2) Derselbe Text nochmal → sofort da
pop = await show(brief('98,90', '84,00', '15.11.2030'), 'Rechnung 1');
ok('„Sofort da“ beim zweiten Mal', /Sofort da/.test(await pop.evaluate(() => document.querySelector('.checks')?.innerText || '')));
// 3) „Nicht mehr fragen“ → Erinnerungsfrage kommt nicht mehr; „Betrag gestiegen“ fragt nicht mehr nach
await pop.click('.askq [data-q="mute"]').catch(() => {}); await sleep(300);
pop = await show(brief('77,00', '92,00', '15.12.2030'), 'Rechnung 2');
const q2 = await q(pop);
ok('Gemutete Frage kommt nicht wieder', !/erinnern/.test(q2), q2);
ok('Keine Frage zu „Betrag gestiegen“ (nur noch Kern-Fragen)', !/gestiegen/.test(q2), q2);
// 4) Bescheid → Widerspruch/Einspruch
pop = await show(fs.readFileSync('test/letters/finanzamt.txt', 'utf8').replace(/2026/g, '2030'), 'Bescheid');
const q3 = await q(pop);
ok('Frage „Einspruch“ beim Bescheid', /Einspruch/.test(q3), q3);
await pop.click('.askq [data-q="yes"]');
await pop.waitForSelector('.out.rise', { timeout: 20000 }); await sleep(300);
ok('Einspruch wird geschrieben', (await pop.textContent('.out')).length > 5);
// 5) Betrug → Hilfe
pop = await show('Sehr geehrter Kunde,\n\nIhr Paket wartet. Die Zollgebühr von 2,99 € ist offen. Zahlen Sie innerhalb von 24 Stunden, klicken Sie auf den Link: https://paket-zoll.xyz\nIBAN: LT12 1000 0111 0100 1000\n\nMit freundlichen Grüßen', 'Paket');
ok('Betrug: Warnung statt Frage', !(await pop.$('.askq')) && !!(await pop.$('.scam')));
await pop.click('.scam summary'); await sleep(200);
ok('Hilfe zum echten Absender in der Warnung', /Webseite des Absenders/.test(await pop.textContent('.scam')));
// 6) Antwort mit Beleg (Stelle steht im Text) und ohne (steht nicht im Text)
pop = await show(fs.readFileSync('test/sample.txt', 'utf8'), 'Bericht');
await pop.fill('#askIn', 'Wie hoch ist die Dividende?'); await pop.press('#askIn', 'Enter');
await pop.waitForSelector('#answers .a:not(.muted)', { timeout: 15000 }); await sleep(300);
ok('Beleg aus dem Text', !!(await pop.$('#answers .proof')), await pop.evaluate(() => document.getElementById('answers').innerText));
pop = await show(brief('55,00', '92,00', '15.12.2030'), 'Rechnung 3');
await pop.fill('#askIn', 'Was kostet das?'); await pop.press('#askIn', 'Enter');
await pop.waitForSelector('#answers .a:not(.muted)', { timeout: 15000 }); await sleep(300);
ok('Kein falscher Beleg, wenn die Stelle nicht im Text steht', !(await pop.$('#answers .proof')) && !!(await pop.$('#answers .proof0')));
// 7) Frist morgen → die Spinne fragt „schon erledigt?“
const due = new Date(Date.now() + 864e5); const dd = `${String(due.getDate()).padStart(2, '0')}.${String(due.getMonth() + 1).padStart(2, '0')}.${due.getFullYear()}`;
pop = await show(brief('12,34', '92,00', dd), 'Rechnung morgen');
const d = await app.evaluate((_e, iso) => global.__silk.collectDeadlines().find((x) => x.iso === iso && !x.done), `${due.getFullYear()}-${String(due.getMonth() + 1).padStart(2, '0')}-${String(due.getDate()).padStart(2, '0')}`);
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes('popup')); w?.hide(); });
ok('Frist für morgen gefunden', !!d);
ok('Spinne fragt „schon erledigt?“', await app.evaluate((_e, dl) => global.__silk.askPaid(dl), d));
await sleep(800); pop = await find('popup.html');
ok('Frage-Blase mit Knöpfen', !!(await pop.$('#pqYes')), await pop.textContent('#title'));
await sleep(500); await pop.click('#pqYes', { force: true }); await sleep(700);
ok('Abgehakt', (await app.evaluate((_e, k) => global.__silk.collectDeadlines().find((x) => x.key === k)?.done, d.key)) === true);
// 8) Abschalten
await pop.evaluate(() => window.spider.saveSettings({ askBack: false }));
pop = await show(brief('66,00', '92,00', '15.12.2030'), 'Rechnung 4');
ok('Abgeschaltet: keine Frage', !(await pop.$('.askq')));

ok('keine Fehler im Fenster', errs.length === 0, errs.join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
