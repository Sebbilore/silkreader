// Die kleine Spinne reagiert aufs Ergebnis: Frist morgen → Schild „Frist morgen!“ (mit Test-Antworten)
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
fs.mkdirSync(`${home}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${home}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true, uses: 3, askBack: false, tipsSeen: ['ring','drop','more','deadlines','explorer','font'], lastVersion: JSON.parse(fs.readFileSync('package.json', 'utf8')).version }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await sleep(3500);
const d = new Date(Date.now() + 864e5); const dd = `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
const t = `Stadtwerke Musterstadt GmbH\nPostfach 10 20 30, 12345 Musterstadt\n\nRechnungsnummer: RE-1\n\nSehr geehrte Frau Beispiel,\n\nIhre Stromrechnung. Rechnungsbetrag: 98,90 €\nBitte überweisen Sie den Betrag bis zum ${dd}.\nIBAN: DE89 3704 0044 0532 0130 00\n\nMit freundlichen Grüßen\nIhre Stadtwerke`;
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Brief', source: 'selection', pages: [t] }, autoStart: true }), t);
let pop; for (let i = 0; i < 50 && !pop; i++) { pop = app.windows().find((w) => w.url().includes('popup.html')); await sleep(100); }
await pop.waitForSelector('#moreBtn', { timeout: 20000 }); await sleep(400);
const b = app.windows().find((w) => w.url().includes('bubble.html'));
console.log('Ergebnis:', JSON.stringify(await pop.evaluate(() => ({ dl: result.letter?.deadlines?.[0], scam: !!result.scam }))), 'sichtbar:', await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).isVisible()));
const tip = await b.evaluate(() => ({ text: document.getElementById('modeTip').textContent, warn: document.getElementById('modeTip').classList.contains('warn'), on: document.getElementById('modeTip').classList.contains('on') }));
const ok = tip.on && tip.warn && /Frist morgen/.test(tip.text);
console.log('Schild:', JSON.stringify(tip), ok ? 'alles gut' : 'FEHL');
await b.screenshot({ path: `${out}/schild.png` });
await app.close();
process.exit(ok ? 0 : 1);
