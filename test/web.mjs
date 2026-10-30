import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const [out, home, ...files] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
app.on('window', (w) => w.on('pageerror', (e) => errs.push(String(e))));
await new Promise((r) => setTimeout(r, 3500));
const rig = app.windows().find((w) => w.url().includes('bubble'));
rig.on('pageerror', (e) => errs.push(String(e)));
await rig.evaluate(() => { nextTrick = Infinity; });
// Dateien ablegen (wie per Drag & Drop) – direkt über den IPC-Handler
await app.evaluate(async ({ ipcMain }, paths) => { await ipcMain._invokeHandlers.get('cocoon-add-files')({}, paths); }, files);
await rig.evaluate(() => window.spider.cocoonAddText('Notiz: Rückruf bei Frau Meier'));
await new Promise((r) => setTimeout(r, 1200));
console.log('items:', await rig.evaluate(() => [...document.querySelectorAll('.item')].map((e) => e.title.split('\n')[0] + (e.querySelector('.ic').style.backgroundImage ? ' [Bild]' : ''))));
await rig.screenshot({ path: `${out}/web.png`, omitBackground: true });
// Ablagezone (Maustaste gedrückt in der Nähe)
await rig.evaluate(() => { dropZone = true; catching = true; updateHoldWeb(); });
await new Promise((r) => setTimeout(r, 500));
await rig.screenshot({ path: `${out}/zone.png`, omitBackground: true });
console.log('zone covers window:', await rig.evaluate(() => JSON.stringify(zoneRect())));
console.log('errors:', errs);
await app.close();
