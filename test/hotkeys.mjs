// Echte globale Tastendrücke: Kürzel kommt an, Spinne reagiert, Einstellungen zeigen „erkannt“, Protokoll
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
app.on('window', (w) => w.on('pageerror', (e) => errs.push(String(e))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3500);
const set = app.windows().find((w) => w.url().includes('settings'));
const rig = app.windows().find((w) => w.url().includes('bubble'));
await rig.evaluate(() => { window.__t = []; window.spider.onRigTrick((t) => window.__t.push(t)); });
// Strg+Alt+N → Notizbuch
execSync('xdotool key ctrl+alt+n');
await sleep(1500);
console.log('Einstellungen zeigen:', await set.evaluate(() => document.querySelector('.fired[data-for="notebook"]')?.textContent));
console.log('Notizbuch offen:', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes('index.html') && w.isVisible())));
console.log('Spinne reagiert:', await rig.evaluate(() => window.__t.join(',')));
const log = fs.readFileSync(`${home}/.config/Silkreader/silkreader-errors.log`, 'utf8');
console.log('Protokoll:\n' + log.split('\n').filter((l) => /Kürzel gedrückt|BELEGT|Start/.test(l)).slice(-4).join('\n'));
console.log('errors:', errs);
await app.close();
