import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
const [out, home, SF] = [process.argv[2], process.argv[3], Number(process.argv[4] || 1)];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron',
  args: ['--no-sandbox', `--force-device-scale-factor=${SF}`, '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home } });
const errs = [];
app.process().stderr.on('data', (d) => { if (/Error/.test(d)) errs.push(String(d).slice(0, 300)); });
await new Promise((r) => setTimeout(r, 2500));
const rig = app.windows().find((w) => w.url().includes('bubble'));
rig.on('pageerror', (e) => errs.push(String(e)));
const bounds = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getBounds());
console.log('window', await bounds());
let n = 0;
const shot = async () => rig.screenshot({ path: `${out}/f${String(n++).padStart(3, '0')}.png`, omitBackground: true });
for (let i = 0; i < 14; i++) { await shot(); await new Promise((r) => setTimeout(r, 70)); }
for (const t of ['wave', 'flip', 'yoyo', 'dance', 'peek']) {
  await rig.evaluate((t) => doTrick(t), t);
  for (let i = 0; i < 16; i++) { await shot(); await new Promise((r) => setTimeout(r, 70)); }
}
await rig.evaluate(() => { busy = true; });
for (let i = 0; i < 12; i++) { await shot(); await new Promise((r) => setTimeout(r, 70)); }
await rig.evaluate(() => { busy = false; });
// Klick-Durchlässigkeit + echter Klick
const b = await bounds();
const sp = await rig.evaluate(() => spiderPos);
const px = (x) => Math.round(x * SF);
execSync(`xdotool mousemove ${px(b.x + 10)} ${px(b.y + 250)}`); await new Promise((r) => setTimeout(r, 300));
console.log('empty area ignores mouse (inside=false):', await rig.evaluate(() => wasInside === false));
const sp2 = await rig.evaluate(() => spiderPos);
execSync(`xdotool mousemove ${px(b.x + sp2.x)} ${px(b.y + sp2.y)}`); await new Promise((r) => setTimeout(r, 600));
console.log('over spider: inside', await rig.evaluate(() => wasInside), 'hover', await rig.evaluate(() => hover));
const sp3 = await rig.evaluate(() => spiderPos);
execSync(`xdotool mousemove ${px(b.x + sp3.x)} ${px(b.y + sp3.y)} click 1`); await new Promise((r) => setTimeout(r, 2500));
console.log('click opened main window:', app.windows().some((w) => w.url().includes('index.html')));
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.webContents.getURL().includes('bubble')).forEach((w) => w.setPosition(0, 400)));
// Ziehen: 200 nach links, 60 nach unten
const sp4 = await rig.evaluate(() => spiderPos); const b4 = await bounds();
const sx = px(b4.x + sp4.x), sy = px(b4.y + sp4.y);
execSync(`xdotool mousemove ${sx} ${sy}`); await new Promise((r) => setTimeout(r, 400));
execSync('xdotool mousedown 1');
for (let i = 1; i <= 20; i++) { execSync(`xdotool mousemove ${sx - i * 10} ${sy + i * 3}`); await new Promise((r) => setTimeout(r, 30)); }
for (let i = 0; i < 10; i++) { await shot(); await new Promise((r) => setTimeout(r, 60)); }
execSync('xdotool mouseup 1');
for (let i = 0; i < 20; i++) { await shot(); await new Promise((r) => setTimeout(r, 70)); }
const b5 = await bounds();
console.log('after drag: window x', b4.x, '→', b5.x, '(expected ~', Math.round(b4.x - 200 / SF), ') length', await rig.evaluate(() => Math.round(baseLen)));
console.log('errors:', errs);
await app.close();
