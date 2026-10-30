// Tipp-Zone ausmessen: wie weit reicht der Bereich, in dem die Spinne Klicks annimmt (nach unten und zur Seite)?
// Aufruf: node test/zone.mjs <Ausgabeordner> <Home>
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 1, tipsSeen: ['ring', 'drop', 'more', 'deadlines', 'explorer', 'font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3500);
await app.evaluate(({ ipcMain }) => { global.__hover = null; ipcMain.on('rig-hover', (_e, v) => { global.__hover = v; }); });
const bubble = app.windows().find((w) => w.url().includes('bubble.html'));
// Spinne ruhig stellen (keine Kunststücke), dann ihre Position im Fenster holen
await sleep(500);
const sp = await bubble.evaluate(() => { const r = document.querySelector('#body')?.getBoundingClientRect?.(); return r ? { x: r.x + r.width / 2, y: r.y + r.height / 2 } : null; });
const at = async (x, y) => { await app.evaluate(({ BrowserWindow }, p) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble.html')).webContents.send('cursor', p), { x, y }); await sleep(120); return app.evaluate(() => global.__hover); };
const reach = async (dx, dy) => { let last = 0; for (let k = 0; k <= 160; k += 4) { await at(sp.x + dx * k, sp.y + dy * k); await at(sp.x + dx * k, sp.y + dy * k); if (await app.evaluate(() => global.__hover)) last = k; else if (k > 20) break; } await at(-500, -500); await sleep(300); return last; };
console.log('Spinne bei', JSON.stringify(sp));
const res = { unten: await reach(0, 1), seite: await reach(1, 0), oben: await reach(0, -1) };
console.log(`Reichweite der Tipp-Zone: unten ${res.unten} px, Seite ${res.seite} px, oben ${res.oben} px`);
fs.writeFileSync(`${out}/zone.json`, JSON.stringify(res));
await app.close();
