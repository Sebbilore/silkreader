import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
const SF = Number(process.argv[3]);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron',
  args: ['--no-sandbox', `--force-device-scale-factor=${SF}`, '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: process.argv[2] } });
const errs = [];
app.process().stderr.on('data', (d) => { if (/Error/.test(d)) errs.push(String(d).slice(0, 200)); });
await new Promise((r) => setTimeout(r, 3000));
const [x0, y0] = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getPosition());
const cx = Math.round((x0 + 28) * SF), cy = Math.round((y0 + 28) * SF);
const click = async () => { execSync(`xdotool mousemove ${cx} ${cy}`); await new Promise((r) => setTimeout(r, 300)); execSync('xdotool click 1'); await new Promise((r) => setTimeout(r, 2500)); };
await click();
const main = () => app.windows().find((w) => w.url().includes('index.html'));
console.log('empty clipboard → main window with input:', !!main() && await main().isVisible('#start'));
await app.evaluate(({ clipboard }) => clipboard.writeText('Der Umsatz stieg auf 412 Millionen Euro. Der Gewinn lag bei 39,2 Millionen Euro.'));
await click();
console.log('filled clipboard → analysis shown:', await main().isVisible('#analysis'), '|', (await main().textContent('#docScroll')).slice(0, 40));
console.log('errors:', errs);
await app.close();
