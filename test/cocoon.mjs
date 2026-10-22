import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, home] = [process.argv[2], process.argv[3]];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
app.on('window', (w) => w.on('pageerror', (e) => errs.push(String(e))));
await new Promise((r) => setTimeout(r, 3500));
const rig = app.windows().find((w) => w.url().includes('bubble'));
rig.on('pageerror', (e) => errs.push(String(e)));
await rig.evaluate(() => { nextTrick = Infinity; });
// Drop simulieren: Auswahl erscheint
// Text auf die Spinne fallen lassen → wird sofort festgehalten
await rig.evaluate(() => { const dt = new DataTransfer(); dt.setData('text/plain', 'Kündigungsfrist: 3 Monate zum Quartalsende'); window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, cancelable: true })); });
await new Promise((r) => setTimeout(r, 600));
await rig.evaluate(() => window.spider.cocoonAddFiles([]));
await app.evaluate(() => {}); 
await rig.evaluate(() => window.spider.cocoonAddText('Zweiter Schnipsel mit IBAN DE12 3456'));
await new Promise((r) => setTimeout(r, 500));
console.log('cocoons rendered:', await rig.evaluate(() => document.querySelectorAll('.cocoon').length));
const ok = await rig.evaluate(async () => { const c = document.querySelector('.cocoon'); c.click(); await new Promise((r) => setTimeout(r, 300)); return !!c.querySelector('b'); });
console.log('click copies + flash:', ok, '| clipboard:', JSON.stringify(await app.evaluate(async ({ clipboard }) => clipboard.readText())));
await rig.screenshot({ path: `${out}/cocoons.png`, omitBackground: true });
// Bleibt nach Neustart erhalten?
console.log('stored:', (await rig.evaluate(() => window.spider.cocoonList())).map((c) => c.name));
console.log('errors:', errs);
await app.close();
