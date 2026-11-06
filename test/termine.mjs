// Nachfrage bei Terminen und Fristen: nichts wird ohne Ja gespeichert. xvfb-run node test/termine.mjs <ordner> <home>
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 1, tipsSeen: ['ring', 'drop', 'more', 'deadlines', 'explorer', 'font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock-mail.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', SILK_REPAIR: '1', SILK_CACHE: '1' } });
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

// Outlook-Mail mit Termin: Spinne fragt „Soll ich mir das merken?“; Ja speichert, Nein nicht
const mail = (was, tag) => `Praxis Dr. Muster\n\nSehr geehrte Frau Beispiel,\n\nIhr Termin: ${was} am ${tag} um 9 Uhr. Bitte sagen Sie spätestens 2 Tage vorher ab.\n\nMit freundlichen Grüßen\nPraxis Dr. Muster`;
let pop = await show(mail('Zahnarzt Kontrolle', '12.11.2030'), 'Zahnarzt Termin');
ok('Frage „merken?“ bei Termin', /merken/.test(await q(pop)), await q(pop));
await pop.screenshot({ path: `${out}/termin-frage.png` });
ok('vorher nichts gespeichert', (await pop.evaluate(() => window.spider.deadlinesList())).length === 0);
await pop.click('.askq [data-q="yes"]'); await sleep(900); await pop.screenshot({ path: `${out}/termin-ja.png` });
ok('nach Ja gemerkt', (await pop.evaluate(() => window.spider.deadlinesList())).some((d) => d.iso === '2030-11-12'));
pop = await show(mail('Hautarzt', '20.12.2030'), 'Hautarzt Termin');
await pop.click('.askq [data-q="no"]'); await sleep(500);
ok('nach Nein nicht gemerkt', !(await pop.evaluate(() => window.spider.deadlinesList())).some((d) => d.iso === '2030-12-20'));
console.log(errs.length ? 'Fehler: ' + errs.join(' | ') : 'keine Konsolenfehler');
await app.close(); process.exit(fails ? 1 : 0);
