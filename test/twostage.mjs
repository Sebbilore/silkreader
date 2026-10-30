// Zwei Stufen: oben sofort Stichpunkte und Aufgabe, die Details kommen erst bei „Mehr aus dem Brief“ (mit Test-Antworten)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 1, askBack: false, tipsSeen: ['ring', 'drop', 'more', 'deadlines', 'explorer', 'font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', SILK_MOCK_TWOSTAGE: '1', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = []; const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (p) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(p)); if (w) return w; await sleep(100); } };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
const text = fs.readFileSync('test/letters/inkasso.txt', 'utf8').replace(/2026/g, '2030');
const show = async () => {
  await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Brief', source: 'selection', pages: [t] }, autoStart: true }), text);
  const pop = await find('popup.html'); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(500); return pop;
};
let pop = await show();
ok('Oben: Brief-Karte und Stichpunkte', !!(await pop.$('.letter .big')) && (await pop.$$('ul.lead li')).length >= 1);
ok('Details noch nicht geschrieben', !!(await pop.$('#morePending')) && !(await pop.$('#details [data-type="point"]')));
const took = await pop.evaluate(() => document.querySelector('.aiNote .took')?.textContent || '');
ok('Gebrauchte Zeit klein angezeigt', /gelesen/.test(took), took);
await pop.click('#moreBtn');
await pop.waitForSelector('#details [data-type="point"]', { timeout: 15000 }); await sleep(300);
ok('Bei „Mehr“: Details da, Bereich bleibt offen', await pop.evaluate(() => document.getElementById('details').classList.contains('open') && !document.getElementById('morePending')));
ok('Zeit bleibt stehen', /gelesen/.test(await pop.evaluate(() => document.querySelector('.aiNote .took')?.textContent || '')));
await pop.screenshot({ path: `${out}/twostage-mehr.png` });
// Notizbuch hat die Details nachgetragen → beim nächsten Öffnen aus dem Notizbuch sofort da
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'notebook' })); await sleep(800);
pop = await find('popup.html');
await pop.click('#nbList .entry'); await pop.waitForSelector('#moreBtn', { timeout: 10000 }); await sleep(300);
ok('Aus dem Notizbuch: Details schon da', !(await pop.$('#morePending')) && !!(await pop.$('#details [data-type="point"]')));
ok('keine Fehler im Fenster', errs.length === 0, errs.join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
