// Fristen-Netz und „In meiner Sprache“ (mit Test-Antworten)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
const fmt = (d) => `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
const soon = new Date(); soon.setDate(soon.getDate() + 2);
const later = new Date(); later.setDate(later.getDate() + 40);
const brief = (date, nr) => `Stadtwerke Musterstadt GmbH\nRechnungsnummer: RE-${nr}\n\nSehr geehrte Frau Beispiel,\n\nRechnungsbetrag: 98,90 €\n\nBitte überweisen Sie den Betrag bis zum ${fmt(date)} auf folgendes Konto:\nIBAN: DE89 3704 0044 0532 0130 00\n\nMit freundlichen Grüßen`;
const show = (text, title) => app.evaluate((_e, [t, ti]) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: ti, source: 'selection', pages: [t] }, autoStart: true }), [text, title]);
const pop = await (async () => { await show(brief(later, 1), 'Rechnung A'); return find('popup.html'); })();
await pop.waitForSelector('#moreBtn', { timeout: 20000 }).catch(async () => { console.log('DEBUG', errs, await pop.evaluate(() => document.body.innerText.slice(0, 400))); });
await sleep(400);
await show(brief(soon, 2), 'Rechnung B'); await sleep(300);
await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(400);

// 1) Fristen-Liste
const list = await app.evaluate(() => global.__silk.collectDeadlines());
ok('Beide Fristen gesammelt', list.length === 2 && list[0].days === 2 && list[1].days === 40, JSON.stringify(list.map((d) => [d.iso, d.days])));
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'deadlines' }));
await sleep(900);
const rows = await pop.evaluate(() => [...document.querySelectorAll('.fr')].map((r) => ({ soon: r.classList.contains('soon'), t: r.innerText.replace(/\s+/g, ' ') })));
ok('Fristen-Blase zeigt beide, die nahe ist markiert', rows.length === 2 && rows[0].soon && /in 2 Tagen/.test(rows[0].t), JSON.stringify(rows));
await pop.screenshot({ path: `${out}/v120-fristen.png` });
await pop.click('.fr .fchk'); await sleep(600);
const after = await pop.evaluate(() => ({ open: document.querySelectorAll('.fr:not(.done)').length, done: document.querySelectorAll('.fr.done').length }));
ok('Erledigt abhaken', after.open === 1 && after.done === 1, JSON.stringify(after));
// Erinnerung (falls Benachrichtigungen hier gehen) – gemeldete Fristen werden gemerkt
await pop.click('.fr.done .fchk', { force: true }).catch(() => {}); await sleep(400); // wieder offen
await app.evaluate(() => global.__silk.remindDeadlines());
const st = JSON.parse(fs.readFileSync(`${home}/.config/Silkreader/deadlines.json`, 'utf8'));
const supported = await app.evaluate(({ Notification }) => Notification.isSupported());
ok('Erinnerung 3 Tage vorher gemerkt', !supported || Object.values(st.told || {}).includes(1), `${supported ? 'Benachrichtigung unterstützt' : 'keine Benachrichtigungen unter Linux-Test'}: ${JSON.stringify(st.told)}`);
// Brief aus der Liste öffnen, zurück
await pop.click('.fr [data-act="open"]'); await sleep(600);
ok('Brief aus Fristen geöffnet', await pop.evaluate(() => !!document.querySelector('.letter')), await pop.evaluate(() => document.getElementById('title').textContent + ' | ' + document.body.innerText.slice(0, 200)));
await pop.click('#back'); await sleep(500);
ok('Zurück zur Fristen-Liste', (await pop.textContent('#title')) === 'Fristen');
// Knöpfe in der Benachrichtigung: „Brief öffnen“ und „Erledigt“
await app.evaluate(() => { const d = global.__silk.collectDeadlines()[0]; global.__silk.deadlineAction(d, 1); }); await sleep(900);
ok('Benachrichtigung → Brief öffnen', await pop.evaluate(() => !!document.querySelector('.letter')));
const openNow = async () => (await app.evaluate(() => global.__silk.collectDeadlines())).filter((d) => !d.done).length;
const before = await openNow();
await app.evaluate(() => { const d = global.__silk.collectDeadlines().find((x) => !x.done); global.__silk.deadlineAction(d, 0); }); await sleep(300);
const after2 = await openNow();
ok('Benachrichtigung → Erledigt', after2 === before - 1, `${before} → ${after2}`);
const doneKey = await app.evaluate(() => global.__silk.collectDeadlines({ withDone: true }).find((x) => x.done)?.key);
if (doneKey) await pop.evaluate((k) => window.spider.deadlineDone(k, false), doneKey); // wieder offen für die weiteren Schritte

// 2) In meiner Sprache
await show(brief(later, 3), 'Rechnung C'); await sleep(300);
await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(400);
await pop.click('[data-a="In meiner Sprache"]'); await sleep(400);
const chips = await pop.evaluate(() => [...document.querySelectorAll('.langpick [data-x]')].map((c) => c.textContent));
ok('Sprachauswahl', chips.includes('Українська') && chips.includes('العربية') && chips.includes('Türkçe'), chips.join(' '));
await pop.screenshot({ path: `${out}/v120-sprache.png` });
await pop.click('.langpick [data-x="ar"]');
await pop.waitForSelector('.out.rise', { timeout: 20000 }); await sleep(300);
ok('Erklärung erscheint (Schreibrichtung automatisch)', await pop.evaluate(() => document.querySelector('.out').getAttribute('dir') === 'auto' && document.querySelector('.out').textContent.length > 5));
const s2 = JSON.parse(fs.readFileSync(`${home}/.config/Silkreader/settings.json`, 'utf8'));
ok('Sprache gemerkt', s2.explainLang === 'ar', s2.explainLang);
await pop.click('#back'); await sleep(500);
ok('Zurück zum Ergebnis', await pop.evaluate(() => !!document.querySelector('.letter')));
// Ring: vorne die Kern-Aktionen, „Meine Briefe“ (Notizbuch + Fristen) vorne
await app.evaluate(() => global.__silk.openRing({ at: { x: 800, y: 500 } }));
const ring = await find('ring.html'); await sleep(500);
const labels = await ring.evaluate(() => [...document.querySelectorAll('.lb')].map((t) => t.textContent).join(', '));
ok('Ring Seite 1: Lesen, In meiner Sprache, Antworten, Meine Briefe, Foto, Mehr', labels === 'Lesen, In meiner Sprache, Antworten, Meine Briefe, Foto, Mehr', labels);
await app.evaluate(() => global.__silk.closeRing());

ok('keine Fehler im Fenster', !errs.length, errs.slice(0, 3).join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
