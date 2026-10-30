// Bildvergleich: kleine Spinne in allen Stimmungen und Modi, Kokons im Netz
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '--force-device-scale-factor=3', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
app.on('window', (w) => w.on('pageerror', (e) => errs.push(String(e))));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3500);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('settings')).forEach((w) => w.close()));
const rig = app.windows().find((w) => w.url().includes('bubble'));
rig.on('pageerror', (e) => errs.push(String(e)));
await rig.evaluate(() => { nextTrick = 1e12; });
const snap = async (name) => {
  const b = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getBounds());
  const p = await rig.evaluate(() => spiderPos);
  const S = 3, x = Math.round((b.x + p.x - 45) * S), y = Math.round((b.y + p.y - 50) * S);
  execSync(`import -window root -crop ${90 * S}x${90 * S}+${x}+${y} ${out}/${name}.png`);
};
const send = (ch, v) => app.evaluate(({ BrowserWindow }, [ch, v]) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).webContents.send(ch, v), [ch, v]);
await sleep(800);
await snap('a-happy');
await rig.evaluate(() => setClickMode('read', false)); await rig.evaluate(() => { glassesUntil = performance.now() + 5000; }); await sleep(300); await snap('b-read');
await send('busy', true); await sleep(500); await snap('c-focus');
await send('busy', false); await sleep(1200); await snap('d-proud');
await sleep(2500);
await send('rig-trick', 'scared'); await sleep(250); await snap('e-scared');
await send('rig-trick', 'return'); await sleep(2500);
await rig.evaluate(() => { lastActivity = performance.now() - 70000; }); await sleep(500); await snap('f-sleepy');
await rig.evaluate(() => { lastActivity = performance.now(); });
for (const m of ['translate', 'simplify', 'reply']) { await rig.evaluate((m) => setClickMode(m, false), m); await sleep(400); await snap(`g-${m}`); }
await rig.evaluate(() => setClickMode('read', false));
// Kokons
const dir = `${home}/docs`; fs.mkdirSync(dir, { recursive: true });
for (const n of ['Bericht.pdf', 'Angebot.docx', 'Notizen.txt']) fs.writeFileSync(`${dir}/${n}`, 'x');
await app.evaluate((_e, files) => { const c = global.__silk.cocoons; files.forEach((f) => c.addFile(f)); c.addText('Ein kurzer Text'); }, ['Bericht.pdf', 'Angebot.docx', 'Notizen.txt'].map((n) => `${dir}/${n}`));
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')); w.webContents.send('cocoons', global.__silk.cocoons.list().map((it) => ({ ...it }))); });
await rig.evaluate(() => { webOpenUntil = performance.now() + 60000; updateHoldWeb(); });
await sleep(1200);
const b = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getBounds());
execSync(`import -window root -crop ${220 * 3}x${170 * 3}+${b.x * 3}+${b.y * 3} ${out}/h-cocoons.png`);
console.log('errors:', errs);
await app.close();
