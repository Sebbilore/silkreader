// Mac-Testversion auf echtem macOS: startet, Spinne und Blase, Brief lesen (Test-Antworten), Lernen,
// Texterkennung mit Apples Vision, Kürzel-Beschriftung (⌘ ⌥). Läuft auf der geschützten Fassung (Bytecode).
// Aufruf: node test/mac.mjs <Ausgabeordner>
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { _electron: electron } = require(process.env.PW_MODULE || 'playwright-core');
const electronPath = require('electron');
const enc = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A').replace(/::/g, ': :');
const crash = (e) => { console.log(`::error title=Mac-Test abgestürzt::${enc(e?.stack || e)}`); process.exit(1); };
process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);

const out = path.resolve(process.argv[2] || 'mac-test');
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let fails = 0;
const check = (name, ok, detail = '') => { console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` – ${String(detail).slice(0, 300)}` : ''}`); if (!ok) { fails++; console.log(`::error title=${enc(name)}::${enc(detail)}`); } };

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'silk-mac-'));
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ onboarded: 'test', uiLang: 'de', language: 'Deutsch', lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
// MAC_APP gesetzt: die fertig gebaute App aus der DMG testen (so wie Nutzer sie bekommen)
const packaged = process.env.MAC_APP;
const app = await electron.launch({ executablePath: packaged || electronPath, args: packaged ? [] : ['.'], env: { ...process.env, SPIDER_MOCK: path.resolve('test/mock.json'), SILK_USERDATA: userData } });
console.log(packaged ? `Teste die gebaute App: ${packaged}` : 'Teste den Quellcode');
// Bildschirmfoto vom ganzen Mac-Bildschirm (zeigt auch Menüleiste und Spinne)
const { execFileSync } = await import('child_process');
const screen = (name) => { try { execFileSync('screencapture', ['-x', path.join(out, `screen-${name}.png`)]); } catch (e) { console.log(`Bildschirmfoto ${name}: ${e.message}`); } };
const errs = [];
const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const find = async (part) => { for (let i = 0; i < 100; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } return null; };
await sleep(3500);

check('Spinne läuft', !!(await find('bubble.html')));
screen('1-start');
const diag = await app.evaluate(() => global.__silk.diag());
check('Symbol in der Menüleiste', diag.tray, JSON.stringify(diag));
if (packaged) {
  const asar = require('@electron/asar');
  const files = asar.listPackage(path.join(packaged, '..', '..', 'Resources', 'app.asar')).map((f) => f.replace(/\\/g, '/'));
  check('Geschützter Code (Bytecode) im Paket', files.includes('/src/main.jsc') && files.includes('/src/pro.jsc'), files.filter((f) => /\/src\/[a-z]+\.jsc?$/i.test(f)).join(' '));
}
check('Plattform ist macOS', (await app.evaluate(() => process.platform)) === 'darwin');
const brief = 'Stadtwerke Musterstadt GmbH\nMusterstadt, 20. Oktober 2026\n\nSehr geehrte Frau Beispiel,\n\nRechnungsbetrag: 98,90 €\nBitte überweisen Sie den Betrag bis zum 15.11.2030.\nIBAN: DE89 3704 0044 0532 0130 00\n\nMit freundlichen Grüßen\nIhre Stadtwerke';
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Brief', source: 'selection', pages: [t] }, autoStart: true }), brief);
const pop = await find('popup.html');
await pop.waitForSelector('#moreBtn', { timeout: 30000 });
await sleep(600);
check('Brief gelesen (Ergebnis-Blase)', !!(await pop.$('#moreBtn')));
check('Feedback „War das richtig?“', !!(await pop.$('#fb')));
await pop.screenshot({ path: path.join(out, 'mac-ergebnis.png') });
screen('2-ergebnis');
// Spinnennetz-Ring und Einstellungen
await app.evaluate(() => global.__silk.openRing({ at: { x: 700, y: 300 } }));
await sleep(900);
check('Spinnennetz-Ring öffnet', !!(await find('ring.html')));
screen('3-ring');
await app.evaluate(() => global.__silk.closeRing());
await pop.evaluate(() => window.spider.openSettings());
const st = await find('settings.html'); await sleep(1500);
check('Einstellungen öffnen', !!st && /Beim Anmelden starten/.test(await st.evaluate(() => document.body.innerText)), 'Mac-Beschriftung „Beim Anmelden starten“');
screen('4-einstellungen');
await st?.close();

// Texterkennung: ein Bild mit Text im Programm erzeugen und mit Apples Vision lesen
const png = path.join(out, 'ocr-probe.png');
const b64 = await app.evaluate(async ({ BrowserWindow }) => {
  const w = new BrowserWindow({ width: 900, height: 300, show: false });
  await w.loadURL('data:text/html,' + encodeURIComponent('<body style="margin:0;background:#fff;font:48px Helvetica;color:#000;padding:40px">Rechnungsbetrag 98,90 Euro<br>Fällig am 15.11.2030</body>'));
  await new Promise((r) => setTimeout(r, 800));
  const img = await w.webContents.capturePage();
  w.destroy();
  return img.toPNG().toString('base64');
});
fs.writeFileSync(png, Buffer.from(b64, 'base64'));
const text = await app.evaluate((_e, f) => global.__silk.ocrText(f), png);
check('Texterkennung (Apple Vision)', /98,90|Rechnungsbetrag|Euro|Stadtwerke|bezahlen/i.test(text), text.replace(/\n/g, ' | '));

const keys = await pop.evaluate(() => window.spider.shortcuts());
check('Kürzel mit ⌘/⌥ beschriftet', keys.every((k) => !/Strg/.test(k.label)), keys.map((k) => k.label).join(', '));
check('Keine Fehler in den Fenstern', errs.length === 0, errs.join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
