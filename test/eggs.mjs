// Neue Animationen und kleine Überraschungen der Spinne
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '--force-device-scale-factor=3', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
await sleep(3500);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
const rig = await find('bubble');
await rig.evaluate(() => { nextTrick = 1e12; });
const snap = async (name) => {
  const b = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).getBounds());
  const p = await rig.evaluate(() => spiderPos);
  const S = 3, x = Math.round((b.x + p.x - 50) * S), y = Math.round((b.y + p.y - 60) * S);
  try { execSync(`import -window root -crop ${100 * S}x${100 * S}+${x}+${y} ${out}/egg-${name}.png`); } catch {}
};
const send = (t) => app.evaluate(({ BrowserWindow }, t) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).webContents.send('rig-trick', t), t);

// 1) Jede neue Animation läuft ohne Fehler
for (const t of ['stretch', 'heart', 'sneeze', 'twirl', 'look', 'drum', 'giggle', 'dizzy', 'party']) {
  await send(t); await sleep(t === 'sneeze' ? 1100 : 600);
  ok(`Animation „${t}“ läuft`, (await rig.evaluate(() => trick)) === t);
  await snap(t);
  await sleep(1400);
}
await sleep(2500);
// 2) Saison-Hüte
for (const s of ['halloween', 'xmas', 'newyear']) {
  await rig.evaluate((s) => { window.__season = s; }, s); await sleep(400);
  ok(`Hut zu ${s}`, await rig.evaluate((s) => document.getElementById({ halloween: 'accHalloween', xmas: 'accXmas', newyear: 'accNewyear' }[s]).classList.contains('on'), s));
  await snap(`hut-${s}`);
}
await rig.evaluate(() => { window.__season = null; });
// 3) Konami-Code im Fenster → Party
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Test', source: 'selection', pages: ['Der Umsatz stieg auf 412 Millionen Euro.'] }, autoStart: true }));
const pop = await find('popup.html');
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
await pop.click('#main');
for (const k of ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a']) await pop.keyboard.press(k);
await sleep(400);
ok('Konami-Code: Party', (await rig.evaluate(() => trick)) === 'party');
await sleep(3500);
// 4) Fragen an die Spinne ohne KI
await pop.fill('#askIn', 'Wer bist du?'); await pop.press('#askIn', 'Enter'); await sleep(500);
const a = await pop.textContent('#answers');
ok('Smalltalk: „Wer bist du?“', /kleine Spinne/.test(a), a.slice(0, 80));
await pop.screenshot({ path: `${out}/egg-smalltalk.png` });
// 5) Kitzeln: Maus schnell hin und her über der Spinne
const p = await rig.evaluate(() => spiderPos);
for (let i = 0; i < 12; i++) await rig.evaluate(([x, y]) => checkTickle({ x, y }), [p.x + (i % 2 ? 12 : -12), p.y]);
ok('Kitzeln: Kichern', (await rig.evaluate(() => trick)) === 'giggle');
ok('keine Fehler im Fenster', errs.length === 0, errs.join(' | ').slice(0, 300));
console.log(fails ? `${fails} Fehler` : 'alles OK');
await app.close();
process.exit(fails ? 1 : 0);
