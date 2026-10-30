// Startzeit bis die Spinne sichtbar ist und Arbeitsspeicher nach 8 s Leerlauf (je Prozess). Aufruf: node test/startbench.mjs [Durchläufe]
import { createRequire } from 'module'; import fs from 'fs'; import os from 'os'; import path from 'path';
const require = createRequire(import.meta.url);
const { _electron: electron } = require(process.env.PW_MODULE || 'playwright-core'); const electronPath = require('electron');
const runs = +process.argv[2] || 3; const res = [];
for (let i = 0; i < runs; i++) {
  const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'sb-'));
  fs.writeFileSync(path.join(ud, 'settings.json'), JSON.stringify({ onboarded: 'test', uiLang: 'de', language: 'Deutsch', lastVersion: JSON.parse(fs.readFileSync('package.json','utf8')).version }));
  const t0 = Date.now();
  const app = await electron.launch({ executablePath: electronPath, args: ['.'], env: { ...process.env, SPIDER_MOCK: path.resolve('test/mock.json'), SILK_USERDATA: ud } });
  let w; for (;;) { w = app.windows().find((x) => x.url().includes('bubble.html')); if (w) break; await new Promise(r => setTimeout(r, 20)); }
  await w.waitForLoadState('load'); const tStart = Date.now() - t0;
  await new Promise(r => setTimeout(r, 8000));
  // Prozessor im Leerlauf über 10 s (der erste Aufruf setzt den Zähler zurück)
  await app.evaluate(({ app }) => app.getAppMetrics());
  await new Promise(r => setTimeout(r, 10000));
  const m = await app.evaluate(({ app, BrowserWindow }) => { const ws = BrowserWindow.getAllWindows().map(w => ({ pid: w.webContents.getOSProcessId(), url: w.webContents.getURL().split('/').pop(), vis: w.isVisible() })); return app.getAppMetrics().map(p => ({ t: p.type, mem: p.memory.workingSetSize, cpu: p.cpu.percentCPUUsage, win: ws.filter(w => w.pid === p.pid) })); }); if (i === 0) console.log(JSON.stringify(m.map(p => [p.t, Math.round(p.mem/1024), p.win.map(w => w.url + (w.vis ? '' : '(hidden)')).join(',')])));
  const mem = Math.round(m.reduce((a, p) => a + p.mem, 0) / 1024); const cpu = m.reduce((a, p) => a + p.cpu, 0).toFixed(1);
  res.push({ tStart, mem, cpu, procs: m.length }); await app.close();
}
console.log(JSON.stringify(res));
const med = (k) => res.map(r => +r[k]).sort((a,b)=>a-b)[Math.floor(res.length/2)];
console.log(`Median Start ${med('tStart')} ms, Speicher ${med('mem')} MB, CPU ${med('cpu')} %, Prozesse ${med('procs')}`);
