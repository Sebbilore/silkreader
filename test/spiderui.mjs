// Alles über die Spinne: Mini-Blase, Notizbuch, Einstellungen, Lupe, Spinnennetz-Ring, Netz-Dokumente, Bildschirmstelle
import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { execSync } from 'child_process';
import fs from 'fs';
const [out, home] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
const errs = [];
const hook = (w) => { w.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); }); w.on('pageerror', (e) => errs.push(String(e))); };
app.windows().forEach(hook); app.on('window', hook);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const find = async (part) => { for (let i = 0; i < 60; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } };
const visible = (part) => app.evaluate(({ BrowserWindow }, p) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes(p) && w.isVisible()), part);
const bounds = (part) => app.evaluate(({ BrowserWindow }, p) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes(p))?.getBounds(), part);
const shot = (name) => execSync(`import -window root ${out}/${name}.png`);
await sleep(3000);
const text = fs.readFileSync('test/sample.txt', 'utf8');

// 1) Mini-Blase (Klick ohne Markierung)
await app.evaluate(({ clipboard }) => clipboard.writeText('Text aus der Zwischenablage für die Spinne'));
await app.evaluate(() => global.__silk.showHome());
const pop = await find('popup.html');
await sleep(900);
shot('1-home');
console.log('Mini-Blase:', await pop.evaluate(() => [...document.querySelectorAll('.chip')].map((c) => c.textContent).join('/')), '| Zwischenablage:', await pop.evaluate(() => !document.getElementById('clip').classList.contains('hidden')),
  '| Höhe', (await bounds('popup.html')).height);
await pop.fill('#homeIn', text);
await pop.press('#homeIn', 'Enter');
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
await sleep(500);
console.log('gelesen:', await pop.textContent('#title'), '| Zurück-Pfeil:', await pop.evaluate(() => !document.getElementById('back').classList.contains('hidden')), '| Höhe', (await bounds('popup.html')).height);

// 2) Lupe statt großes Fenster
await pop.click('#moreBtn');
await pop.click('.jump[data-type="point"][data-index="1"]');
await sleep(300);
console.log('Lupe:', await pop.evaluate(() => document.querySelector('.lupe mark')?.textContent), '| großes Fenster offen:', await visible('index.html'));
await pop.click('.jump[data-type="figure"][data-index="0"]');
await sleep(300);
console.log('Lupe Zahl:', await pop.evaluate(() => document.querySelector('.lupe mark')?.textContent));
shot('2-lupe');

// 3) Notizbuch in der Blase
await app.evaluate(() => global.__silk.showNotebook());
await sleep(700);
console.log('Notizbuch-Einträge:', await pop.evaluate(() => document.querySelectorAll('.entry').length));
await pop.click('.entry');
await sleep(500);
console.log('Eintrag geöffnet:', await pop.textContent('#title'));
await pop.click('#back');
await sleep(500);
console.log('zurück im Notizbuch:', await pop.textContent('#title'));

// 4) Spinnennetz-Ring mit echter Maus
await app.evaluate(() => global.__silk.openRing({ at: { x: 800, y: 500 } }));
const ring = await find('ring.html');
await sleep(600);
execSync('xdotool mousemove 800 430'); await sleep(250);
console.log('Ring sichtbar:', await visible('ring.html'), '| oben gewählt:', await ring.evaluate(() => document.querySelector('.slot.on')?.dataset.id));
shot('4-ring');
execSync('xdotool mousemove 748 448'); await sleep(200);
execSync('xdotool click 1'); await sleep(500); // „Mehr“ → zweite Seite
console.log('Seite 2:', await ring.evaluate(() => [...document.querySelectorAll('.slot')].map((s) => s.dataset.id).join(',')));
shot('4-ring2');
await ring.click('.slot[data-id="settings"]'); await sleep(900);
console.log('Ring zu:', !(await visible('ring.html')), '| Einstellungs-Blase:', await pop.textContent('#title'));
shot('4-settings');
const rig = await find('bubble.html');
await pop.click('[data-set="fontSize"] [data-v="large"]');
await sleep(500);
console.log('Schriftgröße gespeichert:', JSON.parse(fs.readFileSync(`${home}/.config/Silkreader/settings.json`, 'utf8')).fontSize, '| Zoom:', await pop.evaluate(() => document.documentElement.style.zoom), '| Breite:', await app.evaluate(() => global.__silk.popupWin?.getSize?.()[0] ?? null));
await pop.click('[data-set="fontSize"] [data-v="normal"]');
await sleep(300);

// Ring schließt mit Wegfahren
await app.evaluate(() => global.__silk.openRing({ at: { x: 800, y: 500 } }));
await sleep(700);
execSync('xdotool mousemove 1450 950'); await sleep(400);
console.log('Ring schließt beim Wegfahren:', !(await visible('ring.html')));

// 5) Dokument im Netz anklicken = lesen
const id = await app.evaluate((_e, t) => { const c = global.__silk.cocoons; c.addText(t); return c.list()[0].id; }, text);
await app.evaluate((_e, i) => global.__silk.readCocoon(i), id);
await sleep(600);
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
console.log('Netz-Dokument gelesen:', await pop.textContent('#title'));

// 6) Lupe: „Auf dem Bildschirm zeigen“ gibt es nicht mehr (große Spinne entfernt)
await app.evaluate((_e, t) => global.__silk.showPopupPayload({ kind: 'analyze', doc: { title: 'Markierter Text', source: 'selection', pages: [t] }, autoStart: true }), text);
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
await pop.click('#moreBtn');
await pop.click('.jump[data-type="point"][data-index="1"]');
console.log('Lupe offen, ohne „Auf dem Bildschirm zeigen“:', await pop.evaluate(() => !!document.querySelector('.lupe') && !document.querySelector('[data-l="screen"]')));

// 7) Accessoire zeigt die laufende Aufgabe
const send = (ch, v) => app.evaluate(({ BrowserWindow }, [ch, v]) => BrowserWindow.getAllWindows().find((w) => w.webContents.getURL().includes('bubble')).webContents.send(ch, v), [ch, v]);
await send('rig-task', 'translate'); await send('busy', true); await sleep(400);
console.log('Aufgabe Übersetzen → Accessoire:', await rig.evaluate(() => [...document.querySelectorAll('#acc > g.on')].map((g) => g.id).join(',')));
await send('rig-task', 'read'); await sleep(300);
console.log('Aufgabe Lesen → Accessoire:', await rig.evaluate(() => [...document.querySelectorAll('#acc > g.on')].map((g) => g.id).join(',')));
await send('busy', false); await sleep(4000);
console.log('nach der Aufgabe (Klick-Modus Lesen):', JSON.stringify(await rig.evaluate(() => [...document.querySelectorAll('#acc > g.on')].map((g) => g.id).join(','))));

// 8) Kopierter Text: Hinweis an der Spinne, Klick liest ihn
await send('rig-hint', 'Kopiert – Klick zum Lesen'); await sleep(300);
console.log('Hinweis sichtbar:', await rig.evaluate(() => document.getElementById('modeTip').classList.contains('on') && document.getElementById('modeTip').textContent));
await app.evaluate((_e, t) => { global.__silk.copiedOffer = { text: t, until: Date.now() + 9000 }; }, text);
await app.evaluate(({ clipboard }) => clipboard.writeText(''));
await app.evaluate(() => global.__silk.spiderTake());
await pop.waitForSelector('#moreBtn', { timeout: 20000 });
console.log('Klick liest kopierten Text:', await pop.textContent('#title'));

// 9) Vorlesen (Mund bewegt sich) – ohne Stimmen unter Linux nur: kein Fehler
await pop.click('[data-a="Vorlesen"]'); await sleep(600);
console.log('Vorlesen geklickt, Fehler bisher:', errs.length);

// 10) Umformen nachschärfen
await app.evaluate(() => global.__silk.showPopupPayload({ kind: 'transform', mode: 'reply', title: 'Antwort-Entwurf', text: 'Hallo, können wir morgen telefonieren?' }));
await pop.waitForSelector('[data-a="Kürzer"]', { timeout: 20000 });
console.log('Antwort-Knöpfe:', await pop.evaluate(() => [...document.querySelectorAll('.actions .link span')].map((s) => s.textContent).join(' · ')));
await pop.click('[data-a="Förmlicher"]');
await pop.waitForSelector('[data-a="Kürzer"]', { timeout: 20000 });
console.log('nachgeschärft:', await pop.evaluate(() => P.extra));

console.log('errors:', errs);
await app.close();
