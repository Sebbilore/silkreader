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

const pop = await show(brief('55,00', '92,00', '15.12.2030', '3. Oktober 2030'), 'Original');
await pop.evaluate(() => { window.__said = []; window.speechSynthesis.speak = (u) => { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 50); }; window.speechSynthesis.cancel = () => {}; });
await pop.click('#moreActs'); await sleep(200);
ok('„Original vorlesen“ im Menü', !!(await pop.$('[data-a="Original vorlesen"]')));
await pop.click('[data-a="Original vorlesen"]'); await sleep(400);
const said = await pop.evaluate(() => window.__said[0] || '');
ok('liest den Originaltext (nicht die Zusammenfassung)', /Stadtwerke Musterstadt/.test(said) && said.length > 200, said.slice(0, 60));
ok('Mitlese-Feld mit Satz-Knöpfen', !!(await pop.$('#rPrev')) && !!(await pop.$('#rNext')));
await pop.evaluate(() => { document.getElementById('readAlong')._at = 0; });
await pop.click('#rNext'); await sleep(300);
const again = await pop.evaluate(() => window.__said.at(-1));
ok('„Nächster Satz“ springt vor', again.length < said.length && said.endsWith(again), `${again.length} < ${said.length}`);
await pop.screenshot({ path: `${out}/vorlesen-nachher.png` });
ok('keine Fehler im Fenster', errs.length === 0, errs.join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
