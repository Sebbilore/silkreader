// Nach dem Lesen: oben wieder die Auswahl Einfach / Antworten
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
const pop = await show();
ok('Oben: ganze Auswahl', (await pop.$$('#after .chip')).length === 4);
await pop.screenshot({ path: `${out}/after-nachher.png` });
await pop.click('[data-after="simplify"]');
await pop.waitForSelector('.out', { timeout: 15000 }); await sleep(300);
ok('Einfach schreibt Text', (await pop.textContent('.out')).length > 0);
await pop.click('#back'); await pop.waitForSelector('#after', { timeout: 5000 });
await pop.click('[data-after="reply"]');
await pop.waitForSelector('.out', { timeout: 15000 });
ok('Antworten schreibt Entwurf', (await pop.textContent('.out')).length > 0);
ok('Keine Fehler', errs.length === 0, errs.join(' | '));
await app.close(); process.exit(fails ? 1 : 0);
