import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
const SF = 1.25;
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron',
  args: ['--no-sandbox', `--force-device-scale-factor=${SF}`, '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: process.argv[2] } });
await new Promise((r) => setTimeout(r, 3000));
const pos = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getPosition());
const [x0, y0] = await pos();
console.log('start', [x0, y0]);
const px = Math.round((x0 + 28) * SF), py = Math.round((y0 + 28) * SF);
const x = (c) => execSync(`xdotool ${c}`);
x(`mousemove ${px} ${py}`); await new Promise((r) => setTimeout(r, 200));
x('mousedown 1');
for (let i = 1; i <= 20; i++) { x(`mousemove ${px - i * 13} ${py - i * 7}`); await new Promise((r) => setTimeout(r, 30)); }
x('mouseup 1');
await new Promise((r) => setTimeout(r, 400));
const [x1, y1] = await pos();
console.log('after drag', [x1, y1], 'expected about', [Math.round(x0 - 260 / SF), Math.round(y0 - 140 / SF)]);
const mainOpen = app.windows().some((w) => w.url().includes('index.html'));
console.log('click falsely triggered:', mainOpen, 'alive:', app.process().exitCode === null);
// echter Klick ohne Bewegung → Analysefenster öffnet sich
const cx = Math.round((x1 + 28) * SF), cy = Math.round((y1 + 28) * SF);
x(`mousemove ${cx} ${cy}`); await new Promise((r) => setTimeout(r, 200)); x('click 1');
await new Promise((r) => setTimeout(r, 1500));
console.log('click opens main window:', app.windows().some((w) => w.url().includes('index.html')));
await app.close();
