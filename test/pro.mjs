// Silkreader Pro: Sperren ohne Pro, Code einlösen (mit Testschlüssel und Beispiel-Antworten)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createRequire } from 'module';
import crypto from 'crypto';
import fs from 'fs';
const pro = createRequire(import.meta.url)('../src/pro.js');
const [out, home] = process.argv.slice(2);
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
const pub = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
const priv = privateKey.export({ type: 'pkcs8', format: 'pem' });
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', SILK_PRO_OFF: '1', SILK_PRO_PUBKEY: pub } });
const errs = [];
const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
ok('Ohne Code: Pro aus', !(await app.evaluate(() => global.__silk.proStatus())).active);

// 1) Übersetzen → Pro-Blase
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'transform', mode: 'translate', text: 'Hallo Welt, das ist ein Test.', title: 'Übersetzung' }));
const pop = await find('popup.html');
await pop.waitForSelector('.pro-list', { timeout: 15000 });
ok('Übersetzen zeigt Pro-Hinweis', /Übersetzen gibt es mit Silkreader Pro/.test(await pop.textContent('.pro-why')));
await pop.screenshot({ path: `${out}/pro-hinweis.png` });

// 2) Brief ohne Pro → kleiner Hinweis statt Karte
const brief = 'Stadtwerke Musterstadt GmbH\nRechnungsnummer: RE-1\n\nSehr geehrte Frau Beispiel,\n\nRechnungsbetrag: 98,90 €\nBitte überweisen Sie den Betrag bis zum 15.11.2030.\nIBAN: DE89 3704 0044 0532 0130 00\n\nMit freundlichen Grüßen';
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Brief', source: 'selection', pages: [t] }, autoStart: true }), brief);
await sleep(300); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(400);
ok('Brief: gesperrter Hinweis statt Karte', await pop.evaluate(() => !!document.querySelector('.letter.locked') && !document.querySelector('.kv')));

// 3) Falscher und richtiger Code
await pop.click('#lPro'); await sleep(500);
await pop.fill('#proCode', 'SILK-1234-5678'); await pop.click('#proRedeem'); await sleep(400);
ok('Falscher Code abgelehnt', /unvollständig|nicht gültig/.test(await pop.textContent('#proMsg')));
const forged = pro.makeCode(crypto.generateKeyPairSync('ed25519').privateKey.export({ type: 'pkcs8', format: 'pem' }));
await pop.fill('#proCode', forged); await pop.click('#proRedeem'); await sleep(400);
ok('Gefälschter Code abgelehnt', /nicht gültig/.test(await pop.textContent('#proMsg')));
const code = pro.makeCode(priv, { months: 3 });
await pop.fill('#proCode', code); await pop.click('#proRedeem'); await sleep(600);
const st = await app.evaluate(() => global.__silk.proStatus());
ok('Echter Code schaltet Pro frei (3 Monate)', st.active && st.source === 'code' && st.until, JSON.stringify({ active: st.active, until: st.until }));
ok('Blase zeigt „Pro ist aktiv“', /Pro ist aktiv/.test(await pop.textContent('#main')));
await pop.screenshot({ path: `${out}/pro-aktiv.png` });
// Zurück zum Brief: jetzt mit Karte
await pop.click('#back'); await sleep(400);
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Brief', source: 'selection', pages: [t] }, autoStart: true }), brief);
await sleep(300); await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(400);
ok('Mit Pro: Brief-Karte da', await pop.evaluate(() => !!document.querySelector('.letter .kv')));
// Code bleibt nach Neustart gespeichert
const saved = JSON.parse(fs.readFileSync(`${home}/.config/Silkreader/settings.json`, 'utf8'));
ok('Code gespeichert', saved.proCode === code);
ok('keine Fehler im Fenster', !errs.length, errs.slice(0, 3).join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
