import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [dir, home] = [process.argv[2], process.argv[3]];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', dir], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
await new Promise((r) => setTimeout(r, 5000));
// Einstellungsfenster schließen, damit nur die Spinne läuft
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => !w.webContents.getURL().includes('bubble')).forEach((w) => w.close()));
const rig = app.windows().find((w) => w.url().includes('bubble'));
await rig.evaluate((sl) => { if (typeof nextTrick !== 'undefined') nextTrick = Infinity; if (sl) { lastActivity = -1e9; } }, process.argv[4] === 'sleep'); // keine Tricks während der Messung
await new Promise((r) => setTimeout(r, 2000));
const sample = () => app.evaluate(({ app }) => app.getAppMetrics().reduce((s, m) => s + m.cpu.percentCPUUsage, 0));
await sample();
let total = 0;
for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 1000)); total += await sample(); }
console.log(dir, 'Ø CPU idle (alle Prozesse):', (total / 10).toFixed(1), '%');
await app.close();
