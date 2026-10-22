// Neue Funktionen: Sprechblase (Mehr, Fragen, Fristen), Umformen, Vergleich, Notizbuch, Beine
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const out = process.argv[2];
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', ANTHROPIC_API_KEY: 'x' } });
const errs = [];
const hook = (w) => { w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); w.on('pageerror', (e) => errs.push(String(e))); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 40; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(150); } };
await sleep(2500);
const text = fs.readFileSync('test/sample.txt', 'utf8').replace('Im Jahr 2027', 'Bis zum 30.06.2027');
const mock = JSON.parse(fs.readFileSync('test/mock.json', 'utf8'));

// 1) Analyse in der Sprechblase
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Bericht', source: 'text', pages: [t] }, autoStart: true }), text);
const pop = await find('popup.html');
await sleep(3500);
await pop.screenshot({ path: `${out}/pop-analyze.png` });
console.log('bold numbers:', await pop.evaluate(() => document.querySelectorAll('b, strong').length));
console.log('deadline:', await pop.evaluate(() => document.body.innerText.match(/📅[^\n]*/)?.[0] || 'none'));
const more = pop.getByText('Mehr ▾');
console.log('mehr:', await more.count());
if (await more.count()) { await more.first().click(); await sleep(400); await pop.screenshot({ path: `${out}/pop-more.png` }); }
const input = pop.locator('input');
await input.fill('Wie hoch ist die Dividende?');
await input.press('Enter');
await sleep(2500);
await pop.screenshot({ path: `${out}/pop-ask.png` });
console.log('answer:', await pop.evaluate(() => document.body.innerText.includes('1,10 Euro')));

// 2) Umformen
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'transform', mode: 'simplify', title: 'Einfache Sprache', text: 'Die Nettoverschuldung stieg signifikant.' }));
await sleep(2500);
await pop.screenshot({ path: `${out}/pop-transform.png` });
console.log('transform:', await pop.evaluate(() => document.body.innerText.includes('vereinfacht')));

// 3) Vergleich
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'compare', title: 'A ↔ B', a: { title: 'A', pages: ['Umsatz 412 Mio. Anleihe.'] }, b: { title: 'B', pages: ['Umsatz 412 Mio.'] } }));
await sleep(2500);
await pop.screenshot({ path: `${out}/pop-compare.png` });
console.log('compare:', await pop.evaluate(() => document.body.innerText.includes('Anleihe')));

// 4) Notizbuch
await app.evaluate((_e, [t, r]) => global.__silk.addHistory({ title: 'Bericht', source: 'text', pages: [t] }, r), [text, mock]);
await app.evaluate(() => global.__silk.showNotebook());
const main = await find('index.html');
await sleep(1500);
await main.screenshot({ path: `${out}/notebook.png` });
console.log('notebook items:', await main.evaluate(() => document.querySelectorAll('.nbItem').length));
await main.fill('#nbSearch', 'xyzunbekannt'); await sleep(300);
console.log('search none:', await main.evaluate(() => document.querySelectorAll('.nbItem').length));
await main.fill('#nbSearch', 'dividende'); await sleep(300);
await main.press('#nbSearch', 'Enter');
await sleep(3000);
console.log('opened from notebook:', await main.evaluate(() => document.getElementById('docTitle').textContent));

// 5) Beine beim Laufen: Einzelbilder
for (let i = 0; i < 4; i++) {
  await main.evaluate((i) => document.querySelectorAll('.jump')[i]?.click(), i);
  for (let f = 0; f < 5; f++) { await sleep(110); await main.screenshot({ path: `${out}/walk-${i}-${f}.png` }); }
  await sleep(1800);
}
console.log('errors:', errs);
await app.close();
