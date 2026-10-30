// Ersteinrichtung + englische Oberfläche: findet übrig gebliebene deutsche Texte
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent', SILK_WELCOME: '1' } });
const errs = [];
const hook = (w) => { w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); w.on('pageerror', (e) => errs.push(String(e))); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
const settings = () => JSON.parse(fs.readFileSync(`${home}/.config/Silkreader/settings.json`, 'utf8'));
// Deutsche Reste: sichtbarer Text außerhalb von [data-noi18n]
const german = (page) => page.evaluate(() => {
  const bad = /[äöüÄÖÜß]|\b(der|die|das|und|nicht|ist|ein|eine|mit|auf|für|zu|oder|Spinne|lesen|Lesen|Netz|Klick|öffnen|Datei|Einstellungen|Zwischenablage|Schließen|Zurück|Weiter|Kopieren)\b/;
  const out = new Set();
  const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.parentElement.closest('[data-noi18n], script, style')) continue;
    const el = n.parentElement; const cs = getComputedStyle(el);
    if (cs.display === 'none' || el.closest('.hidden')) continue;
    const t = n.nodeValue.trim(); if (t && bad.test(t)) out.add(t.slice(0, 90));
  }
  document.querySelectorAll('[placeholder],[title]').forEach((e) => { for (const a of ['placeholder', 'title']) { const v = e.getAttribute(a); if (v && bad.test(v) && !e.closest('[data-noi18n]')) out.add(`@${a}: ${v.slice(0, 80)}`); } });
  return [...out];
});
await sleep(2500);

// 1) Willkommen → auf Englisch umschalten
const wel = await find('welcome.html');
await sleep(600);
console.log('Willkommen (de):', await wel.textContent('h1'));
await wel.click('[data-l="en"]');
await sleep(1200);
const wel2 = await find('welcome.html');
console.log('Welcome (en):', await wel2.textContent('#s1 h1'), '| Deutsch übrig:', JSON.stringify(await german(wel2)));
execSync(`import -window root ${out}/w1.png`);
await wel2.click('#next'); await sleep(400);
console.log('Schritt 2:', await wel2.textContent('#s2 h1'), '| Deutsch übrig:', JSON.stringify(await german(wel2)));
await wel2.click('#next'); await sleep(400);
console.log('Schritt 3:', await wel2.textContent('#s3 h1'), '| Deutsch übrig:', JSON.stringify(await german(wel2)));
execSync(`import -window root ${out}/w3.png`);
await wel2.click('#next'); await sleep(800);
const st = settings();
console.log('nach „Let\'s go“:', JSON.stringify({ onboarded: st.onboarded, uiLang: st.uiLang, language: st.language, pinCopied: st.pinCopied, copyHint: st.copyHint }), '| Willkommen zu:', !app.windows().some((w) => w.url().includes('welcome')));

// 2) Englische Sprechblasen
const pop0 = async (payload) => { await app.evaluate((_e, p) => global.__silk.showPopupPayload(p), payload); await sleep(900); return find('popup.html'); };
let pop = await pop0({ kind: 'home', mode: 'read' });
console.log('Home:', await pop.textContent('#title'), '| Deutsch übrig:', JSON.stringify(await german(pop)));
execSync(`import -window root ${out}/e-home.png`);
await pop0({ kind: 'settings' });
console.log('Settings-Blase:', await pop.textContent('#title'), '| Deutsch übrig:', JSON.stringify(await german(pop)));
await pop0({ kind: 'about' });
console.log('About:', await pop.textContent('#title'), '| Deutsch übrig:', JSON.stringify(await german(pop)));
execSync(`import -window root ${out}/e-about.png`);
await pop0({ kind: 'report' });
console.log('Report:', await pop.textContent('#title'), '| Deutsch übrig:', JSON.stringify(await german(pop)));
await pop0({ kind: 'notebook' });
console.log('Notebook:', await pop.textContent('#title'), '| Deutsch übrig:', JSON.stringify(await german(pop)));
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Markierter Text', source: 'selection', pages: [t] }, autoStart: true }), fs.readFileSync('test/sample.txt', 'utf8'));
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
await pop.click('#moreBtn');
console.log('Ergebnis:', await pop.textContent('#title'), '| Deutsch übrig (ohne KI-Text):', JSON.stringify(await german(pop)));
execSync(`import -window root ${out}/e-result.png`);

// 3) Ring (beide Seiten)
await app.evaluate(() => global.__silk.openRing({ at: { x: 800, y: 500 } }));
const ring = await find('ring.html');
await sleep(600);
console.log('Ring:', await ring.evaluate(() => [...document.querySelectorAll('.lb')].map((t) => t.textContent).join(', ')));
await app.evaluate(() => global.__silk.closeRing());

// 4) Einstellungsfenster und Lesemodus
await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows().find((x) => x.webContents.getURL().includes('popup')); w.webContents.executeJavaScript('window.spider.openSettings()'); });
const set = await find('settings.html');
await sleep(1500);
console.log('Settings-Fenster: Deutsch übrig:', JSON.stringify(await german(set)));
await app.evaluate(() => global.__silk.runRingAction('reader'));
const main = await find('index.html');
await sleep(1200);
console.log('Lesemodus: Deutsch übrig:', JSON.stringify(await german(main)));
// 5) Tray-Menü / Kürzel-Texte (Hauptprozess)
console.log('Kürzel:', JSON.stringify((await set.evaluate(() => window.spider.shortcuts())).slice(0, 3).map((k) => k.desc)));
console.log('errors:', errs);
await app.close();
