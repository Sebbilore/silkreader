// 1.23: Lernen in der Blase (War das richtig? → Korrektur → nächster Brief), Absender-Vergleich, Betrug, Unterschrift, Folgen
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 1, tipsSeen: ['ring', 'drop', 'more', 'deadlines', 'explorer', 'font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
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
  await app.evaluate((_e, [t, ti]) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: ti, source: 'selection', pages: Array.isArray(t) ? t : [t] }, autoStart: true }), [text, title]);
  const pop = await find('popup.html'); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(500); return pop;
};
const brief = (betrag, abschlag, faellig, datum, extra = '') => `Stadtwerke Musterstadt GmbH
Postfach 10 20 30, 12345 Musterstadt
Musterstadt, ${datum}

Rechnungsnummer: RE-${betrag}

Sehr geehrte Frau Beispiel,

Ihre Stromrechnung. Rechnungsbetrag: ${betrag} €
Zahlungsziel: 01.11.2030. Fällig am ${faellig}.${extra}
Ab dem nächsten Monat beträgt Ihr Abschlag ${abschlag} € im Monat.
IBAN: DE89 3704 0044 0532 0130 00

Mit freundlichen Grüßen
Ihre Stadtwerke`;

// 1) Erster Brief, Korrektur der Frist
let pop = await show(brief('120,00', '84,00', '15.11.2030', '1. März 2030'), 'Rechnung März');
ok('Feedback-Zeile da', !!(await pop.$('#fb')));
const first = await pop.evaluate(() => document.querySelector('.letter .when2')?.textContent);
await pop.click('#fb [data-fb="0"]'); await sleep(300);
ok('Korrektur-Feld öffnet sich', !!(await pop.$('#fixV')));
await pop.click('#fixF [data-f="deadline"]');
await pop.fill('#fixV', '15.11.2030');
await pop.click('#fixGo'); await sleep(800);
const after = await pop.evaluate(() => ({ when: document.querySelector('.letter .when2')?.textContent, learned: document.querySelector('.learned')?.textContent || '' }));
ok('Frist nach Korrektur', /15\. November 2030/.test(after.when), `vorher: ${first} | nachher: ${after.when}`);
ok('„Gelernt“ steht dabei', /fällig am/i.test(after.learned), after.learned);
await pop.screenshot({ path: `${out}/v123-korrektur.png` });

// 2) Nächster Brief vom selben Absender: Regel greift, Vergleich und Zählung
pop = await show(brief('98,90', '92,00', '15.12.2030', '1. Oktober 2030'), 'Rechnung Oktober');
const R = await pop.evaluate(() => ({ when: document.querySelector('.letter .when2')?.textContent, learned: document.querySelector('.learned')?.textContent || '', senders: document.querySelector('.senders')?.innerText || '' }));
ok('Gelernte Regel beim nächsten Brief', /15\. Dezember 2030/.test(R.when) && /fällig am/i.test(R.learned), `${R.when} | ${R.learned}`);
ok('„2. Brief von …“', /2\. Brief von/.test(R.senders), R.senders);
ok('Abschlag steigt 84 → 92 (+9,5 %)', /84,00 €/.test(R.senders) && /92,00 €/.test(R.senders) && /\+9,5/.test(R.senders), R.senders.replace(/\n/g, ' | '));
await pop.screenshot({ path: `${out}/v123-gelernt.png` });
await pop.click('#sAll'); await sleep(700);
ok('„Alle anzeigen“ sucht im Notizbuch', (await pop.$$('#nbList .entry')).length === 2, String((await pop.$$('#nbList .entry')).length));

// 3) Betrug
pop = await show('Sehr geehrter Kunde,\n\nIhr Paket wartet im Zolllager. Die Zollgebühr von 2,99 € ist noch offen. Bitte zahlen Sie innerhalb von 24 Stunden, sonst geht das Paket zurück. Klicken Sie auf den Link: https://paket-zoll.xyz/pay\nZahlung bitte an IBAN: LT12 1000 0111 0100 1000\n\nMit freundlichen Grüßen\nIhr Paketdienst', 'Paket');
const sc = await pop.evaluate(() => document.querySelector('.scam')?.innerText || '');
ok('Betrugs-Warnung oben', /Vorsicht/.test(sc) && /Litauen|LT/.test(sc), sc.slice(0, 160).replace(/\n/g, ' | '));
await pop.screenshot({ path: `${out}/v123-betrug.png` });

// 4) Unterschrift + Folgen bei Mahnung
pop = await show(['Jobcenter Musterstadt\nAktenzeichen: 123A456\n\nSehr geehrte Frau Beispiel,\n\nIhr Weiterbewilligungsantrag liegt bei. Bitte füllen Sie ihn aus.', 'Bitte unterschreiben Sie den Antrag und senden Sie ihn bis zum 30.11.2030 zurück an: Jobcenter Musterstadt, Postfach 12 34\n\nOrt, Datum, Unterschrift\n\nMit freundlichen Grüßen\nIhr Jobcenter'], 'Antrag');
const sg = await pop.evaluate(() => ({ big: document.querySelector('.letter .big')?.textContent, note: document.querySelector('.signote')?.innerText || '' }));
ok('Unterschrift nötig erkannt', /Unterschreiben/.test(sg.big || '') || /Unterschrift nötig/.test(sg.note), JSON.stringify(sg));
ok('Seite und Adresse', /Seite 2/.test(sg.note) && /Jobcenter/.test(sg.note), sg.note);
pop = await show('Stadtwerke Musterstadt GmbH\n\nMahnung\n\nSehr geehrte Frau Beispiel,\n\nleider haben wir noch keine Zahlung erhalten. Offener Betrag: 103,90 € (inkl. Mahngebühr: 5,00 €). Bitte zahlen Sie bis zum 13.11.2030 für Ihren Strom.\nIBAN: DE89 3704 0044 0532 0130 00\n\nMit freundlichen Grüßen\nIhre Stadtwerke', 'Mahnung');
await pop.click('details.whatif summary'); await sleep(200);
const wi = await pop.evaluate(() => document.querySelector('details.whatif')?.innerText || '');
ok('„Was passiert, wenn ich nichts tue?“', /Inkasso/.test(wi) && /5,00/.test(wi) && /Sperre/.test(wi), wi.slice(0, 200).replace(/\n/g, ' | '));
await pop.screenshot({ path: `${out}/v123-mahnung.png` });

// 5) Einstellungen: Was ich gelernt habe
await pop.evaluate(() => window.spider.openSettings());
const st = await find('settings.html'); await sleep(1200);
const stats = await st.evaluate(() => document.getElementById('lStats').innerText.replace(/\n/g, ' '));
ok('Zahlen in den Einstellungen', /Korrektur/.test(stats) && /\b1\b/.test(stats), stats);
await st.click('#lDetails summary'); await sleep(200);
const senders = await st.evaluate(() => [...document.querySelectorAll('#lSenders [data-sender]')].map((x) => x.innerText.replace(/\n/g, ' ')));
ok('Absender gelistet', senders.some((x) => /Stadtwerke/.test(x)), JSON.stringify(senders));
await st.screenshot({ path: `${out}/v123-settings.png`, fullPage: true });
await st.click('#lCorr [data-corr] [data-forget]'); await sleep(400);
ok('Korrektur vergessen', (await st.$$('#lCorr [data-corr]')).length === 0);
await st.click('#learn'); await sleep(300);
ok('Lernen abschaltbar', JSON.parse(fs.readFileSync(`${home}/.config/Silkreader/settings.json`, 'utf8')).learn === false);
pop = await find('popup.html');
pop = await show(brief('77,00', '92,00', '15.12.2030', '2. Oktober 2030'), 'Rechnung ohne Lernen');
ok('Ohne Lernen keine Vergleiche', !(await pop.$('.senders')));

// 6) Später lesen: Zettel am Faden, Erinnerung öffnet den Brief
await pop.click('#moreActs'); await sleep(200);
const laterBtn = await pop.$('[data-a="Später lesen"]');
ok('„Später lesen“ im Menü', !!laterBtn);
await laterBtn?.click(); await sleep(300);
await pop.click('#laterBox [data-when="evening"]'); await sleep(500);
ok('Erinnerung bestätigt', /Ich erinnere dich/.test(await pop.textContent('#laterBox')));
const rig = await find('bubble.html');
ok('Zettel hängt am Faden', await rig.evaluate(() => document.getElementById('note').style.display !== 'none'));
await app.evaluate(() => { const l = global.__silk.loadBookmarks(); l[0].at = Date.now() - 1000; global.__silk.saveBookmarks(l); global.__silk.remindBookmarks(); });
await sleep(600);
await app.evaluate(() => { const b = global.__silk.loadBookmarks()[0]; if (b) global.__silk.openBookmark(b.id); }); // mit Benachrichtigung: Klick darauf
await sleep(900);
const opened = await pop.evaluate(() => document.getElementById('title').textContent);
ok('Erinnerung öffnet den Brief und entfernt den Zettel', /Rechnung|Nordlicht/.test(opened) && (await app.evaluate(() => global.__silk.loadBookmarks().length)) === 0, opened);
ok('Netz wächst mit gelesenen Briefen', await rig.evaluate(() => document.querySelectorAll('#growWeb path').length >= 1));
const at = await app.evaluate(() => { const n = new Date('2026-10-29T20:00:00'); return [global.__silk.remindAt('evening', n), global.__silk.remindAt('morning', n), global.__silk.remindAt('weekend', n)].map((x) => new Date(x).toString().slice(0, 21)); });
ok('Zeitpunkte: Abend / Morgen früh / Wochenende', /Fri Oct 30 2026 19:00/.test(at[0]) && /Fri Oct 30 2026 08:00/.test(at[1]) && /Sat Oct 31 2026 10:00/.test(at[2]), at.join(' | '));

// 7) Guten Morgen und „Alle Fristen erledigt“
ok('Guten Morgen (erzwungen)', await app.evaluate(() => global.__silk.maybeMorning({ force: true })));
await sleep(700);
const mo = await pop.evaluate(() => ({ t: document.getElementById('title').textContent, rows: document.querySelectorAll('.mrow').length }));
ok('Morgen-Blase', /Guten Morgen/.test(mo.t), JSON.stringify(mo));
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'deadlines' })); await sleep(700);
for (let i = 0; i < 30 && await pop.$('.fr:not(.done) .fchk'); i++) { await pop.click('.fr:not(.done) .fchk'); await sleep(500); }
ok('Alle Fristen erledigt 🎉', /Alle Fristen erledigt/.test(await pop.evaluate(() => document.body.innerText)));

ok('keine Fehler im Fenster', errs.length === 0, errs.join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
