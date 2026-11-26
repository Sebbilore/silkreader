// Aufnahmen für den englischen Trailer: xvfb-run node scripts/trailer/shots.mjs <ordner> <home>
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 1, uiLang: 'en', language: 'en', tipsSeen: ['ring', 'drop', 'more', 'deadlines', 'explorer', 'font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '--force-device-scale-factor=3', '.'],
  env: { ...process.env, SPIDER_MOCK: 'scripts/trailer/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
console.log(app.windows().map((w) => w.url().split('/').pop()));
const show = async (file, title) => {
  const text = fs.readFileSync(file, 'utf8');
  await app.evaluate((_e, [t, ti]) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: ti, source: 'selection', pages: [t] }, autoStart: true }), [text, title]);
  const pop = await find('popup.html'); await pop.waitForSelector('#moreBtn', { timeout: 20000 });
  // Pro-Reiter (Translate, Simplify, Reply) ausblenden: nur kostenlose Funktionen zeigen
  await pop.evaluate(() => { for (const b of document.querySelectorAll('button,a,div,span')) if (/^(Translate|Simplify|Reply)$/.test(b.textContent.trim()) && !b.children.length) b.style.display = 'none'; document.querySelectorAll('.split').forEach((e) => { e.style.display = 'none'; }); });
  await sleep(3500); return pop;
};
let pop = await show('scripts/trailer/letters/mahnung.txt', 'Reminder');
await pop.click('.askq [data-q="no"]').catch(() => {}); await sleep(600);
console.log(await pop.evaluate(() => [...document.querySelectorAll('button')].filter((b) => b.offsetParent).map((b) => (b.id || b.className) + ':' + b.textContent.trim().slice(0, 25))));
await pop.screenshot({ path: `${out}/result.png` });
await pop.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 400; });
await sleep(400); await pop.screenshot({ path: `${out}/result-bullets.png` });
await pop.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = 0; });
await pop.click('text=Read aloud').catch((e) => console.log('read aloud', String(e).slice(0, 80))); await sleep(2500);
await pop.screenshot({ path: `${out}/readaloud.png` });
const bub = app.windows().find((w) => w.url().includes('bubble.html'));
if (bub) await bub.screenshot({ path: `${out}/spider.png` });
pop = await show('scripts/trailer/letters/betrug.txt', 'Scam');
await pop.evaluate(() => { document.querySelector('#title').textContent = 'Parcel fee notice'; });
await pop.screenshot({ path: `${out}/scam.png` });
await app.close();
