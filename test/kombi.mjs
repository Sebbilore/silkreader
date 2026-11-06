// Kombi: schnelles Ergebnis ist „vorläufig“, „Mehr“ lässt das gründliche Modell genauer lesen (mit Test-Antworten, Modelldateien nur Attrappen)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.mkdirSync(`${home}/models`, { recursive: true }); for (const f of ['Qwen3.5-2B-Q4_K_M.gguf', 'Qwen3.5-4B-Q4_K_M.gguf']) fs.writeFileSync(`${home}/models/${f}`, 'x');
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ builtinModel: 'combo', provider: 'builtin', lowPower: false, onboarded: true, uses: 1, askBack: false, tipsSeen: ['ring', 'drop', 'more', 'deadlines', 'explorer', 'font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', SILK_MOCK_TWOSTAGE: '1', HOME: home, SILK_MODEL_DIR: `${home}/models` } });
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
ok('Vorläufig-Hinweis steht da', /Vorläufig/.test(await pop.evaluate(() => document.querySelector('.aiNote')?.textContent || '')));
await pop.screenshot({ path: `${out}/kombi-vorlaeufig.png` });
await pop.click('#moreBtn');
await pop.waitForSelector('#morePending', { timeout: 5000 });
ok('Blase: „Ich lese genauer“', /genauer/.test(await pop.evaluate(() => document.getElementById('morePending')?.textContent || '')));
await pop.screenshot({ path: `${out}/kombi-genauer.png` });
await pop.waitForSelector('#details [data-type="point"]', { timeout: 15000 }); await sleep(300);
ok('Nach „Mehr“: nicht mehr vorläufig, Details da', await pop.evaluate(() => !/Vorläufig/.test(document.querySelector('.aiNote').textContent) && !document.getElementById('morePending')));
await pop.screenshot({ path: `${out}/kombi-fertig.png` });
ok('keine Fehler im Fenster', errs.length === 0, errs.join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
