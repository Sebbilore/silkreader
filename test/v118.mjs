// Kurztest 1.18: Übung in der Ersteinrichtung, Privatmodus, Anzeige lokal/Cloud, Was ist neu
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', SILK_WELCOME: '1' } });
const errs = [];
const hook = (w) => w.on('pageerror', (e) => errs.push(String(e)));
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
await sleep(2500);

// 1) Übung: Schritt 4, Text markieren, Spinne „anklicken“ → Beispiel-Ergebnis (noch keine KI)
const wel = await find('welcome.html');
for (let i = 0; i < 3; i++) { await wel.click('#next'); await sleep(300); }
console.log('Schritt 4:', await wel.textContent('#s4 h1'));
await wel.click('#selAll');
await sleep(300);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('welcome')).focus());
await sleep(300);
await app.evaluate(() => global.__silk.spiderTake());
const pop = await find('popup.html');
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
console.log('Übung → Ergebnis:', await pop.textContent('#title'), '|', (await pop.textContent('.lead')).slice(0, 60));
execSync(`import -window root ${out}/practice.png`);
await wel.click('#next'); await sleep(500);

// 2) Anzeige lokal/Cloud
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Bericht', source: 'text', pages: [t] }, autoStart: true }), fs.readFileSync('test/sample.txt', 'utf8'));
await sleep(600);
console.log('Anzeige:', await pop.evaluate(() => document.getElementById('where').textContent));
await pop.waitForSelector('#moreBtn', { timeout: 20000 });

// 3) Privatmodus: nichts im Notizbuch
const n0 = await pop.evaluate(async () => (await window.spider.historyList('')).length);
await pop.evaluate(() => window.spider.saveSettings({ privateMode: true }));
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Geheim', source: 'text', pages: [t + ' geheim'] }, autoStart: true }), fs.readFileSync('test/sample.txt', 'utf8'));
await sleep(800);
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
const n1 = await pop.evaluate(async () => (await window.spider.historyList('')).length);
console.log('Privatmodus – Notizbuch vorher/nachher:', n0, n1);

// 4) Was ist neu
await app.evaluate(() => global.__silk.maybeShowWhatsNew());
await pop.evaluate(() => window.spider.saveSettings({ privateMode: false }));
const settingsFile = `${home}/.config/Silkreader/settings.json`;
const st = JSON.parse(fs.readFileSync(settingsFile, 'utf8')); st.lastVersion = '1.17.0'; fs.writeFileSync(settingsFile, JSON.stringify(st));
await app.evaluate(() => global.__silk.maybeShowWhatsNew());
await sleep(5000);
console.log('Was ist neu:', await pop.textContent('#title'), '|', await pop.evaluate(() => document.querySelectorAll('.news li').length), 'Punkte');
execSync(`import -window root ${out}/whatsnew.png`);
console.log('errors:', errs);
await app.close();
