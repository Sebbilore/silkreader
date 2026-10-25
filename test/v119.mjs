// 1.19: Brief-Hilfe, Zahlen-Prüfung, Bewertungs-Frage, Pro vorbereitet (mit Test-Antworten)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 4, lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', SILK_REVIEW: '1' } });
const errs = [];
const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));

const brief = `Stadtwerke Musterstadt GmbH
Musterstadt, 20. Oktober 2026

Rechnungsnummer: RE-2026-4711

Sehr geehrte Frau Beispiel,

für Ihren Stromverbrauch im September berechnen wir Ihnen 98,90 €.
Rechnungsbetrag: 98,90 €

Bitte überweisen Sie den Betrag bis zum 15.11.2030 auf folgendes Konto:
Empfänger: Stadtwerke Musterstadt GmbH
IBAN: DE89 3704 0044 0532 0130 00
Verwendungszweck: RE-2026-4711

Mit freundlichen Grüßen
Ihre Stadtwerke`;
const show = (text, title) => app.evaluate((_e, [t, ti]) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: ti, source: 'selection', pages: [t] }, autoStart: true }), [text, title]);

// 1) Brief
await show(brief, 'Markierter Text');
const pop = await find('popup.html');
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
await sleep(800);
const L = await pop.evaluate(() => ({
  card: !!document.querySelector('.letter'), kind: document.querySelector('.letter .lh b')?.textContent,
  todo: [...document.querySelectorAll('.todo li')].map((l) => l.textContent), kv: document.querySelector('.kv')?.innerText,
  reply: !!document.getElementById('lReply'), unsure: document.querySelectorAll('.unsure').length, ck: [...document.querySelectorAll('.ck')].map((c) => c.textContent).join(''),
}));
ok('Brief-Karte da', L.card && L.kind === 'Rechnung', L.kind);
ok('To-do: bezahlen bis', L.todo.some((t) => /98,90 € bezahlen bis 15\.11\.2030/.test(t)), JSON.stringify(L.todo));
ok('IBAN und Verwendungszweck', /DE89 3704/.test(L.kv) && /RE-2026-4711/.test(L.kv), L.kv?.replace(/\n/g, ' | '));
ok('Antwort-Knopf', L.reply);
// Test-Antworten passen nicht zum Brief → die Zahlen müssen als unsicher markiert sein
ok('Fremde Zahlen markiert', L.unsure > 0 && L.ck.includes('?'), `unsicher ${L.unsure}, Marken ${L.ck}`);
execSync(`import -window root ${out}/v119-brief.png`);
await pop.click('[data-copy]'); await sleep(400);
ok('IBAN kopiert', (await app.evaluate(({ clipboard }) => clipboard.readText())) === 'DE89370400440532013000');

// 2) Passender Text: keine unsicheren Zahlen, Angaben mit ✓
await show(fs.readFileSync('test/sample.txt', 'utf8'), 'Jahresbericht');
await sleep(300);
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
await sleep(600);
const S = await pop.evaluate(() => ({ unsure: document.querySelectorAll('.unsure').length, ck: [...document.querySelectorAll('.ck')].map((c) => c.textContent).join(''), letter: !!document.querySelector('.letter') }));
ok('Bericht: keine Brief-Karte', !S.letter);
ok('Bericht: Zahlen geprüft', S.unsure === 0 && S.ck.length >= 4 && !S.ck.includes('?'), `unsicher ${S.unsure}, Marken ${S.ck}`);

// 3) Bewertungs-Frage (nach 5 erfolgreichen Nutzungen; Testschalter SILK_REVIEW statt Store)
const R = await pop.evaluate(() => !!document.querySelector('.review'));
ok('Bewertungs-Frage erscheint', R);
execSync(`import -window root ${out}/v119-review.png`);
await pop.click('.review [data-r="later"]');
const st = JSON.parse(fs.readFileSync(`${home}/.config/Silkreader/settings.json`, 'utf8'));
ok('„Später“ gemerkt', st.reviewLater === 1 && !st.reviewDone && st.uses >= 5, JSON.stringify({ uses: st.uses, later: st.reviewLater }));
await show(fs.readFileSync('test/sample.txt', 'utf8'), 'Nochmal');
await sleep(300); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(500);
ok('Nach „Später“ nicht gleich wieder', !(await pop.evaluate(() => !!document.querySelector('.review'))));

// 4) Antwort auf den Brief → Zurück führt zum Ergebnis
await show(brief, 'Markierter Text');
await sleep(300); await pop.waitForSelector('#lReply', { timeout: 20000 });
await pop.click('#lReply');
await pop.waitForSelector('.out', { timeout: 20000 });
await sleep(800);
await pop.click('#back');
await sleep(500);
ok('Zurück zum Brief-Ergebnis', await pop.evaluate(() => !!document.querySelector('.letter')));

ok('keine Fehler im Fenster', !errs.length, errs.slice(0, 3).join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
