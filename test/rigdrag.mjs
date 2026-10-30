import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
const [home, SF, clickFirst] = [process.argv[2], Number(process.argv[3]), process.argv[4] === '1'];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron',
  args: ['--no-sandbox', `--force-device-scale-factor=${SF}`, '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home } });
await new Promise((r) => setTimeout(r, 2500));
const rig = app.windows().find((w) => w.url().includes('bubble'));
await rig.evaluate(() => { window.__ev = {}; window.__log = []; ['pointerdown', 'pointerup', 'lostpointercapture', 'blur'].forEach((t) => window.addEventListener(t, (e) => window.__log.push(t + '@' + Math.round(performance.now()) + ':' + e.screenX), true)); });
const bounds = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getBounds());
const px = (x) => Math.round(x * SF);
if (clickFirst) { const b = await bounds(); const s = await rig.evaluate(() => spiderPos); execSync(`xdotool mousemove ${px(b.x + s.x)} ${px(b.y + s.y)}`); await new Promise((r) => setTimeout(r, 500)); execSync('xdotool click 1'); await new Promise((r) => setTimeout(r, 2500)); await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.webContents.getURL().includes('bubble')).forEach((w) => w.setPosition(0, 400))); }
await new Promise((r) => setTimeout(r, 1500));
const b4 = await bounds(); const sp4 = await rig.evaluate(() => spiderPos);
const sx = px(b4.x + sp4.x), sy = px(b4.y + sp4.y);
execSync(`xdotool mousemove ${sx} ${sy}`); await new Promise((r) => setTimeout(r, 500));
console.log('inside before down:', await rig.evaluate(() => wasInside));
execSync('xdotool mousedown 1');
for (let i = 1; i <= 20; i++) { execSync(`xdotool mousemove ${sx - i * 10} ${sy + i * 3}`); await new Promise((r) => setTimeout(r, 30)); }
execSync('xdotool mouseup 1');
await new Promise((r) => setTimeout(r, 500));
console.log('log', JSON.stringify(await rig.evaluate(() => window.__log)), 'x', b4.x, '→', (await bounds()).x, 'len', await rig.evaluate(() => Math.round(baseLen)));
await app.close();
