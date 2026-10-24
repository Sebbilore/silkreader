// Bedienung ohne Maus: Ring mit Pfeiltasten und Enter, Ergebnis-Einträge mit Tab und Enter
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
const hook = (w) => w.on('pageerror', (e) => errs.push(String(e)));
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 60; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('settings')).forEach((w) => w.close()));

// Ring: → → Enter = zweites Feld (Übersetzen); ohne Markierung → Mini-Blase im Übersetzen-Modus
await app.evaluate(() => global.__silk.openRing({ at: { x: 800, y: 500 } }));
const ring = await find('ring.html');
await sleep(600);
execSync('xdotool key Right'); await sleep(150);
execSync('xdotool key Right'); await sleep(150);
console.log('Ring – gewählt:', await ring.evaluate(() => document.querySelector('.slot.on')?.dataset.id));
execSync('xdotool key Return'); await sleep(1500);
const pop = await find('popup.html');
console.log('Enter → Blase:', await pop.textContent('#title'), '| Modus:', await pop.evaluate(() => document.querySelector('.chip.on')?.dataset.m));

// Ergebnis: Tab bis zur ersten Kernaussage, Enter öffnet die Lupe
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Bericht', source: 'text', pages: [t] }, autoStart: true }), fs.readFileSync('test/sample.txt', 'utf8'));
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
await pop.click('#moreBtn');
await pop.evaluate(() => document.querySelector('.jump').focus());
console.log('Kernaussage fokussierbar:', await pop.evaluate(() => document.activeElement.classList.contains('jump') && document.activeElement.getAttribute('role')));
await pop.keyboard.press('Enter'); await sleep(300);
console.log('Enter → Lupe:', await pop.evaluate(() => !!document.querySelector('.lupe')));
console.log('Schließen-Knopf beschriftet:', await pop.evaluate(() => document.getElementById('close').getAttribute('aria-label')));
console.log('errors:', errs);
await app.close();
