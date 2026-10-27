// Vertrags-Check, Vorlagen, Mappen, Frag dein Notizbuch (mit Test-Antworten, Pro an)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
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
const show = (text) => app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Markierter Text', source: 'selection', pages: [t] }, autoStart: true }), text);
const next = new Date(); next.setFullYear(next.getFullYear() + 1);
const vertrag = `Mobilfunk Muster GmbH – Vertragsbestätigung\nKundennummer: 4711-0815\n\nSehr geehrter Herr Muster,\n\nVertragsbeginn: 01.${String(next.getMonth() + 1).padStart(2, '0')}.${next.getFullYear() - 1}\nDie Mindestlaufzeit beträgt 24 Monate. Die Kündigungsfrist beträgt 1 Monat zum Ende der Mindestlaufzeit.\nWird nicht gekündigt, verlängert sich der Vertrag auf unbestimmte Zeit.\nDie monatliche Grundgebühr beträgt 29,99 €.\n\nMit freundlichen Grüßen`;
await show(vertrag);
const pop = await find('popup.html');
await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(500);
const C = await pop.evaluate(() => ({ card: !!document.querySelector('.letter.contract'), kv: document.querySelector('.letter.contract .kv')?.innerText.replace(/\s+/g, ' '), letter: !!document.querySelector('.letter:not(.contract) .kv') }));
ok('Vertragskarte mit Kündigen bis', C.card && /Kündigen bis/.test(C.kv) && /29,99 € pro Monat/.test(C.kv), C.kv);
ok('Keine doppelte Briefkarte beim Vertrag', !C.letter);
const dl = await app.evaluate(() => global.__silk.collectDeadlines());
ok('Kündigungsfrist im Fristen-Netz', dl.some((d) => /kündigen/i.test(d.sentence)), JSON.stringify(dl.map((d) => [d.iso, d.sentence.slice(0, 30)])));
// Kündigung per Vorlage
await pop.click('[data-tpl="cancel"]');
await pop.waitForSelector('.out.rise', { timeout: 20000 }); await sleep(300);
ok('Vorlage „Kündigung“ schreibt einen Entwurf', (await pop.textContent('#title')).length > 0 && (await pop.textContent('.out')).length > 5);
await pop.click('#back'); await sleep(500);
ok('Zurück zur Vertragskarte', await pop.evaluate(() => !!document.querySelector('.letter.contract')));
// Rechnung: Vorlagen-Zeile mit Ratenzahlung
const rechnung = 'Stadtwerke Musterstadt GmbH\nRechnungsnummer: RE-9\n\nSehr geehrte Frau Beispiel,\n\nRechnungsbetrag: 98,90 €\nBitte überweisen Sie den Betrag bis zum 15.11.2030.\nIBAN: DE89 3704 0044 0532 0130 00\n\nMit freundlichen Grüßen';
await show(rechnung); await sleep(300); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(400);
const tpl = await pop.evaluate(() => [...document.querySelectorAll('.tpl [data-tpl]')].map((b) => b.dataset.tpl));
ok('Rechnung: Vorlagen Ratenzahlung, Fristverlängerung, Rückfrage', ['installments', 'extension', 'question'].every((k) => tpl.includes(k)), tpl.join(','));
// Mappen
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'notebook' })); await sleep(900);
const folders = await pop.evaluate(() => [...document.querySelectorAll('#nbFolders [data-f]')].map((c) => c.textContent));
ok('Mappen automatisch (Verträge)', folders.includes('Verträge'), folders.join(','));
await pop.click('#nbFolders [data-f="Verträge"]'); await sleep(500);
ok('Filter nach Mappe', (await pop.$$('#nbList .entry')).length === 1);
await pop.click('#nbFolders [data-f=""]'); await sleep(500);
await pop.click('#nbList .entry .fold:not(.on)'); await sleep(300);
await pop.click('.fpick [data-set="Wohnung"]'); await sleep(600);
const f2 = await pop.evaluate(() => [...document.querySelectorAll('#nbFolders [data-f]')].map((c) => c.textContent));
ok('Mappe von Hand setzen', f2.includes('Wohnung'), f2.join(','));
await pop.screenshot({ path: `${out}/v121-notizbuch.png` });
// Frag dein Notizbuch
await pop.fill('#nbQ', 'Wann muss ich den Handyvertrag kündigen?'); await pop.press('#nbQ', 'Enter');
await pop.waitForSelector('#nbAnswer .a:not(.muted)', { timeout: 20000 });
const ans = await pop.evaluate(() => ({ t: document.querySelector('#nbAnswer .a').innerText, src: !!document.querySelector('#nbAnswer [data-open]') }));
ok('Notizbuch beantwortet Frage mit Quelle', ans.t.length > 5 && ans.src, ans.t.slice(0, 80));
await pop.click('#nbAnswer [data-open]'); await sleep(500);
ok('Quelle öffnet den Brief', await pop.evaluate(() => !!document.querySelector('#moreBtn')));
ok('keine Fehler im Fenster', !errs.length, errs.slice(0, 3).join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
