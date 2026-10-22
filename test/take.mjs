import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = [process.argv[2], process.argv[3]];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', DISPLAY: process.env.DISPLAY } });
const errs = [];
app.process().stderr.on('data', (d) => { if (/Error|rror:/.test(d) && !/vulkan|GPU|gpu|dbus|Gtk/i.test(d)) errs.push(String(d).slice(0, 300)); });
app.on('window', (w) => { w.on('pageerror', (e) => errs.push(w.url().split('/').pop() + ': ' + String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(w.url().split('/').pop() + ': ' + m.text()); }); });
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
const pop = app.windows().find((w) => w.url().includes('popup'));
console.log('popup visible:', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes('popup') && w.isVisible())));
console.log('big window opened:', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes('index.html') && w.isVisible())));
console.log('popup started by itself:', !(await pop.$('#go')));
console.log('clipboard restored:', JSON.stringify(await app.evaluate(async ({ clipboard }) => clipboard.readText())));
await pop.waitForSelector('#foot:not(.hidden)', { timeout: 30000 });
console.log('result →', await pop.textContent('#title'), '| findings:', await pop.evaluate(() => document.querySelectorAll('.finding').length), '| chips:', await pop.evaluate(() => document.querySelectorAll('.chip').length), '| bullets:', await pop.evaluate(() => document.querySelectorAll('ul.sum li').length));
execSync(`import -window root ${out}/popup.png`);
await pop.click('li.jump[data-index="1"]');
await new Promise((r) => setTimeout(r, 5000));
const main = app.windows().find((w) => w.url().includes('index.html'));
console.log('focused item:', await main.evaluate(() => document.querySelector('.focus')?.textContent.trim()), '| highlighted words:', await main.evaluate(() => [...document.querySelectorAll('.w.flash')].map((e) => e.textContent).join(' ')));
console.log('details →', await main.textContent('#scanLabel'), '|', await main.textContent('#counter'), '| popup hidden:', !(await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes('popup') && w.isVisible()))));
console.log('errors:', errs);
await app.close();
