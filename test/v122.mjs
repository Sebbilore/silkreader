// 0 Bytes gesendet, PDF speichern, Kamera-Fenster (mit Test-Antworten)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.mkdirSync(`${home}/Downloads`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const pdfOut = `${home}/.config/export.pdf`;
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, XDG_DOWNLOAD_DIR: `${home}/Downloads`, SILK_MODEL_PATH: '/nonexistent', SILK_EXPORT_TO: pdfOut } });
const errs = [];
const hook = (w) => { w.on('pageerror', (e) => errs.push(String(e))); w.on('console', (m) => { if (m.type() === 'error' && !/getUserMedia|Requested device not found|NotFoundError/.test(m.text())) errs.push(m.text()); }); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
let fails = 0;
const ok = (name, cond, extra = '') => { console.log(`${cond ? 'OK  ' : 'FEHL'} ${name}${extra ? ` – ${extra}` : ''}`); if (!cond) fails++; };
await sleep(3000);
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => /settings|welcome/.test(w.webContents.getURL())).forEach((w) => w.close()));
// 1) 0 Bytes + PDF
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Bericht', source: 'selection', pages: [t] }, autoStart: true }), fs.readFileSync('test/sample.txt', 'utf8'));
const pop = await find('popup.html');
await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(400);
ok('„0 Bytes ins Internet gesendet“', /0 Bytes ins Internet gesendet/.test(await pop.textContent('.aiNote')));
await pop.click('#moreBtn'); await sleep(300);
await pop.click('#exPdf'); await sleep(2500);
const pdf = fs.existsSync(pdfOut) ? fs.readFileSync(pdfOut) : null;
ok('Als PDF gespeichert', pdf && pdf.slice(0, 4).toString() === '%PDF' && pdf.length > 5000, pdf ? `${pdf.length} Bytes` : 'fehlt');
// 3) Kamera-Fenster (hier ohne Kamera: freundliche Meldung, Abbrechen schließt)
await app.evaluate(() => global.__silk.openCamera());
const cam = await find('camera.html'); await sleep(1500);
const camText = await cam.evaluate(() => document.body.innerText);
ok('Kamera-Fenster öffnet (ohne Kamera: Hinweis)', /Kamera|Rahmen/.test(camText), camText.replace(/\s+/g, ' ').slice(0, 80));
await cam.click('#cancel'); await sleep(600);
ok('Abbrechen schließt das Kamera-Fenster', !app.windows().some((w) => w.url().includes('camera.html')));
ok('keine Fehler im Fenster', !errs.length, errs.slice(0, 3).join(' | '));
await app.close();
console.log(fails ? `${fails} Fehler` : 'alles gut');
process.exit(fails ? 1 : 0);
