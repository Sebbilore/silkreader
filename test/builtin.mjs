import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [home, model] = [process.argv[2], process.argv[3]];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, HOME: home, SILK_MODEL_PATH: model } });
const errs = [];
app.process().stderr.on('data', (d) => { if (/rror/.test(d)) errs.push(String(d).slice(0, 400)); });
await new Promise((r) => setTimeout(r, 3000));
console.log('windows at start:', app.windows().map((w) => w.url().split('/').pop()));
const rig = app.windows().find((w) => w.url().includes('bubble'));
const t0 = Date.now();
await rig.evaluate(() => window.spider.analyzeText('Der Umsatz stieg 2025 auf 412 Millionen Euro. Der Gewinn lag bei 39,2 Millionen Euro. Die Dividende steigt auf 1,10 Euro.'));
await new Promise((r) => setTimeout(r, 1500));
const main = app.windows().find((w) => w.url().includes('index.html'));
await main.waitForSelector('#btnGo'); await main.keyboard.press('Enter');
let status = '';
for (let i = 0; i < 120; i++) {
  status = await main.textContent('#scanLabel');
  if (status !== 'Liest …') break;
  if (i % 10 === 0) console.log('  …', (await main.textContent('#panelBody')).trim().slice(0, 90));
  await new Promise((r) => setTimeout(r, 1000));
}
console.log('after', Math.round((Date.now() - t0) / 1000), 's →', status);
console.log((await main.textContent('#panelBody')).trim().replace(/\s+/g, ' ').slice(0, 500));
console.log('errors:', errs);
await app.close();
