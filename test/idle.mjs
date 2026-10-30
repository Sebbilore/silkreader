import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [home, mode] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', ...(process.env.EXTRA ? process.env.EXTRA.split(' ') : []), '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
await new Promise((r) => setTimeout(r, 5000));
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('settings')).forEach((w) => w.close()));
const rig = app.windows().find((w) => w.url().includes('bubble'));
await rig.evaluate(async () => { nextTrick = Infinity; for (const t of ['Vertrag.pdf', 'Notiz']) await window.spider.cocoonAddText(t); });
if (process.env.FADE) await rig.evaluate(() => { lastNear = performance.now() - 40000; });
await new Promise((r) => setTimeout(r, 4000));
const metrics = () => app.evaluate(({ app }) => app.getAppMetrics().map((m) => ({ type: m.type + (m.serviceName ? `:${m.serviceName}` : ''), mem: Math.round(m.memory.workingSetSize / 1024), cpu: m.cpu.percentCPUUsage })));
await metrics();
let cpu = 0, last;
for (let i = 0; i < 10; i++) { await new Promise((r) => setTimeout(r, 1000)); last = await metrics(); cpu += last.reduce((s, m) => s + m.cpu, 0); }
const byType = {};
for (const m of last) byType[m.type] = (byType[m.type] || 0) + m.mem;
const cpuBy = {}; for (const m of last) cpuBy[m.type] = +(((cpuBy[m.type] || 0) + m.cpu)).toFixed(2);
console.log('CPU je Prozess (letzte Sekunde):', JSON.stringify(cpuBy));
console.log(mode, '| Prozesse:', last.length, '| RAM gesamt:', last.reduce((s, m) => s + m.mem, 0), 'MB', JSON.stringify(byType), '| CPU Ø', (cpu / 10).toFixed(1), '%');
await app.close().catch(() => {});
