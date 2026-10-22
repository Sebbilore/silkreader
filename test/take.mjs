import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = [process.argv[2], process.argv[3]];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', DISPLAY: process.env.DISPLAY } });
const errs = [];
app.process().stderr.on('data', (d) => { if (/Error|rror:/.test(d) && !/vulkan|GPU|gpu|dbus|Gtk/i.test(d)) errs.push(String(d).slice(0, 300)); });
app.on('window', (w) => w.on('pageerror', (e) => errs.push(String(e))));
await new Promise((r) => setTimeout(r, 3500));
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('settings')).forEach((w) => w.close()));
// "Fremdes Programm" mit markiertem Text simulieren
await app.evaluate(async ({ BrowserWindow }, text) => {
  const w = new BrowserWindow({ x: 60, y: 260, width: 900, height: 500, title: 'Editor' });
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<body style="font:18px Georgia;padding:30px"><p id=t>${text}</p></body>`));
  await w.webContents.executeJavaScript(`const r=document.createRange();r.selectNodeContents(document.getElementById('t'));getSelection().addRange(r);`);
  w.focus();
  globalThis.editor = w;
}, fs.readFileSync('test/sample.txt', 'utf8').split('\n\n').slice(0, 3).join(' '));
await app.evaluate(async ({ clipboard }) => clipboard.writeText('ALTE ZWISCHENABLAGE'));
await new Promise((r) => setTimeout(r, 800));
// Maus erst "beim Text" ruhen lassen, dann zur Spinne
execSync('xdotool mousemove 700 420'); await new Promise((r) => setTimeout(r, 600));
const rig = app.windows().find((w) => w.url().includes('bubble'));
const b = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getBounds());
const sp = await rig.evaluate(() => spiderPos);
execSync(`xdotool mousemove ${Math.round(b.x + sp.x)} ${Math.round(b.y + sp.y)}`); await new Promise((r) => setTimeout(r, 500));
const sp2 = await rig.evaluate(() => spiderPos);
execSync(`xdotool mousemove ${Math.round(b.x + sp2.x)} ${Math.round(b.y + sp2.y)} click 1`);
console.log('editor still focused after click:', await app.evaluate(() => globalThis.editor.isFocused()));
for (let i = 0; i < 30; i++) { execSync(`import -window root ${out}/s${String(i).padStart(2, '0')}.png`); await new Promise((r) => setTimeout(r, 120)); }
await new Promise((r) => setTimeout(r, 3000));
const main = app.windows().find((w) => w.url().includes('index.html'));
console.log('main visible:', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes('index.html') && w.isVisible())));
console.log('preview label:', await main.textContent('#scanLabel'), '| doc starts:', (await main.textContent('#doc')).trim().slice(0, 50));
console.log('clipboard restored:', JSON.stringify(await app.evaluate(async ({ clipboard }) => clipboard.readText())));
await main.screenshot({ path: `${out}/preview.png` });
await main.keyboard.press('Enter');
for (let i = 0; i < 40; i++) { if ((await main.textContent('#scanLabel')) === 'FERTIG') break; await new Promise((r) => setTimeout(r, 300)); }
console.log('after Enter:', await main.textContent('#scanLabel'), '|', await main.textContent('#counter'));
console.log('errors:', errs);
await app.close();
