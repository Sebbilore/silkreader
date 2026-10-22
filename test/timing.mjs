import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [dir, home] = [process.argv[2], process.argv[3]];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', dir], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
await new Promise((r) => setTimeout(r, 3000));
const rig = app.windows().find((w) => w.url().includes('bubble'));
await rig.evaluate((t) => window.spider.analyzeText(t), fs.readFileSync('test/sample.txt', 'utf8'));
await new Promise((r) => setTimeout(r, 1000));
const main = app.windows().find((w) => w.url().includes('index.html'));
const t0 = Date.now();
let firstSummary = null, results = null, done = null;
while (Date.now() - t0 < 60000) {
  const st = await main.evaluate(() => ({ live: !!document.querySelector('#status .summary'), sum: !!document.querySelector('#panelBody > .summary, #panelBody div > .summary') && !document.querySelector('#status'), label: document.getElementById('scanLabel').textContent }));
  if (st.live && firstSummary === null) firstSummary = Date.now() - t0;
  if (st.sum && results === null) results = Date.now() - t0;
  if (st.label === 'FERTIG') { done = Date.now() - t0; break; }
  await new Promise((r) => setTimeout(r, 50));
}
console.log(dir === '.' ? 'NEU ' : 'ALT ', 'Zusammenfassung live:', firstSummary ?? '–', 'ms | Ergebnis sichtbar:', results, 'ms | alles fertig:', done, 'ms');
await app.close();
