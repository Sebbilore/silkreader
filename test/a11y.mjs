// Barrierefreiheit (WCAG 2.1 AA) mit axe-core: Ergebnis-Blase, Start-Blase, Meine Briefe, Einstellungen, Spinnennetz – hell und dunkel
// Aufruf: node test/a11y.mjs <Ausgabeordner> <Home>
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [, home] = process.argv.slice(2);
const axe = fs.readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
let total = 0;
for (const theme of ['light', 'dark']) {
fs.mkdirSync(`${home}/${theme}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/${theme}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 3, theme, askBack: true, tipsSeen: ['ring','drop','more','deadlines','explorer','font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: `${home}/${theme}`, SILK_MODEL_PATH: '/nonexistent' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (p) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(p)); if (w) return w; await sleep(100); } };
await sleep(3500);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
const run = async (w, name) => {
  await w.evaluate(axe);
  const r = await w.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations.map((v) => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, ex: v.nodes.slice(0, 3).map((x) => (x.target.join(' ') + ' — ' + (x.failureSummary || '').split('\n').slice(1, 2).join('')).slice(0, 220)) })));
  total += r.length;
  console.log(`${r.length ? 'FEHL' : 'OK  '} ${name} (${theme}): ${r.length} Regelverstöße`);
  for (const v of r) console.log(`- [${v.impact}] ${v.id} ×${v.n}: ${v.help}\n    ${v.ex.join('\n    ')}`);
};
const t = fs.readFileSync('test/letters/inkasso.txt', 'utf8').replace(/2026/g, '2030');
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Brief', source: 'selection', pages: [t] }, autoStart: true }), t);
const pop = await find('popup.html'); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(800);
await pop.click('#moreBtn'); await sleep(300);
await run(pop, 'Ergebnis-Blase');
await app.evaluate(() => global.__silk.showHome()); await sleep(600); await run(pop, 'Start-Blase');
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'notebook' })); await sleep(600); await run(pop, 'Meine Briefe');
await pop.evaluate(() => window.spider.openSettings()); const st = await find('settings.html'); await sleep(1200); await run(st, 'Einstellungen');
await app.evaluate(() => global.__silk.openRing({ at: { x: 700, y: 400 } })); const ring = await find('ring.html'); await sleep(600); await run(ring, 'Spinnennetz-Menü');
await app.close();
}
console.log(total ? `${total} Fehler` : 'alles gut');
process.exit(total ? 1 : 0);
