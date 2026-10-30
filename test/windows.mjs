// Echter Windows-Test (läuft auf GitHub Actions, windows-latest):
// Editor öffnen, Text markieren, echte Tasten und Mausbewegungen – und prüfen, ob Silkreader reagiert.
// Aufruf: node test/windows.mjs <Ausgabeordner> [signierte-setup.exe]
import { createRequire } from 'module';
import { execSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const require = createRequire(import.meta.url);
const { _electron: electron } = require(process.env.PW_MODULE || 'playwright-core');
const electronPath = require('electron');
const koffi = require('koffi');

// Abstürze des Tests selbst als Hinweis am Testlauf ausgeben
const crash = (e) => { console.log(`::error title=Test abgestürzt::${String(e?.stack || e).replace(/%/g, '%25').replace(/\r?\n/g, '%0A')}`); process.exit(1); };
process.on('uncaughtException', crash);
process.on('unhandledRejection', crash);

const out = path.resolve(process.argv[2] || 'win-test');
const signedExe = process.argv[3];
fs.mkdirSync(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Tastatur und Maus wie ein Mensch (user32) ----------
const user32 = koffi.load('user32.dll');
const keybd = user32.func('void __stdcall keybd_event(uint8_t, uint8_t, uint32_t, uintptr_t)');
const setCursor = user32.func('int __stdcall SetCursorPos(int, int)');
const mouseEvt = user32.func('void __stdcall mouse_event(uint32_t, uint32_t, uint32_t, int32_t, uintptr_t)');
const findWindow = user32.func('void* __stdcall FindWindowW(str16, str16)');
const setFg = user32.func('int __stdcall SetForegroundWindow(void*)');
const showWin = user32.func('int __stdcall ShowWindow(void*, int)');
const getFg = user32.func('void* __stdcall GetForegroundWindow()');
const bringTop = user32.func('int __stdcall BringWindowToTop(void*)');
const VK = { CTRL: 0x11, ALT: 0x12, SHIFT: 0x10, SPACE: 0x20, A: 0x41, T: 0x54, HOME: 0x24, END: 0x23, RIGHT: 0x27, DOWN: 0x28 };
const down = (k) => keybd(k, 0, 0, 0);
const up = (k) => keybd(k, 0, 2, 0);
const press = async (...keys) => { keys.forEach(down); await sleep(60); [...keys].reverse().forEach(up); await sleep(120); };
const click = async (x, y) => { setCursor(x, y); await sleep(150); mouseEvt(0x02, 0, 0, 0, 0); await sleep(60); mouseEvt(0x04, 0, 0, 0, 0); await sleep(150); };
const wheel = (delta) => mouseEvt(0x0800, 0, 0, delta, 0);

// ---------- Ergebnisse ----------
const results = [];
const check = (name, ok, detail = '', critical = true) => {
  results.push({ name, ok: !!ok, detail: String(detail).slice(0, 300), critical });
  console.log(`${ok ? '✅' : critical ? '❌' : '⚠️ '} ${name}${detail ? ` – ${String(detail).slice(0, 200)}` : ''}`);
};
const shot = (name) => { try { execSync(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms,System.Drawing; $b=[System.Windows.Forms.Screen]::PrimaryScreen.Bounds; $bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height; $g=[System.Drawing.Graphics]::FromImage($bmp); $g.CopyFromScreen($b.Location,[System.Drawing.Point]::Empty,$b.Size); $bmp.Save('${path.join(out, name)}.png')"`, { stdio: 'ignore' }); } catch {} };

// ---------- Editor mit Testtext ----------
const sample = fs.readFileSync('test/sample.txt', 'utf8');
const longText = Array.from({ length: 6 }, () => sample).join('\r\n\r\n');
const txt = path.join(os.tmpdir(), 'silkreader-test.txt');
fs.writeFileSync(txt, longText.replace(/\r?\n/g, '\r\n'), 'utf8');
spawn('notepad.exe', [txt], { detached: true, stdio: 'ignore' }).unref();
await sleep(2500);
const notepad = () => findWindow('Notepad', null);
const addr = (p) => (p ? koffi.address(p) : 0n);
const focusNotepad = async () => {
  const h = notepad();
  if (!h) return false;
  for (let i = 0; i < 6; i++) {
    showWin(h, 3); // maximiert
    // Vordergrund erzwingen: kurz Alt drücken erlaubt SetForegroundWindow
    down(VK.ALT); setFg(h); bringTop(h); up(VK.ALT);
    await sleep(350);
    if (addr(getFg()) === addr(h)) return true;
    // Notfalls in die Mitte des Editors klicken
    await click(500, 400);
    if (addr(getFg()) === addr(h)) return true;
  }
  return false;
};

// ---------- Silkreader starten ----------
const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'silk-'));
fs.writeFileSync(path.join(userData, 'settings.json'), JSON.stringify({ pinCopied: true, onboarded: 'test', uiLang: 'de' }));
const appEnv = { ...process.env, SPIDER_MOCK: 'test/mock.json', SILK_USERDATA: userData, SILK_MODEL_PATH: 'C:\\nonexistent' };
const app = await electron.launch({ executablePath: electronPath, args: ['.'], env: appEnv });
const errs = [];
app.on('window', (w) => w.on('pageerror', (e) => errs.push(String(e))));
const silk = (fn, arg) => app.evaluate(fn, arg);
const win = async (part) => { for (let i = 0; i < 80; i++) { const w = app.windows().find((x) => x.url().includes(part)); if (w) return w; await sleep(100); } return null; };
const visible = (part) => app.evaluate(({ BrowserWindow }, p) => BrowserWindow.getAllWindows().some((w) => w.webContents.getURL().includes(p) && w.isVisible()), part);
const popupTitle = async () => (await win('popup.html'))?.textContent('#title').catch(() => null);
const waitFor = async (fn, ms = 8000) => { const t = Date.now(); while (Date.now() - t < ms) { const v = await fn(); if (v) return v; await sleep(200); } return null; };
const hidePopup = () => app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((w) => w.webContents.getURL().includes('popup')).forEach((w) => w.hide()));

try {
  await sleep(4000);

  // 1) Windows-Bausteine
  let d = await silk(() => global.__silk.diag());
  check('Tastendrücke direkt über user32 (koffi)', d.winkeys, d.winkeysError || '');
  d = await waitFor(async () => { const x = await silk(() => global.__silk.diag()); return x.helper ? x : null; }, 30000) || d;
  check('PowerShell-Helfer läuft (UI Automation, Dateien)', d.helper);
  check('Tray-Symbol', d.tray);
  // Der PowerShell-Helfer übersetzt beim Start C#-Code – das kann auf frischen Rechnern einige Sekunden dauern
  const hd = await waitFor(() => silk(() => global.__silk.helperDiag()), 45000);
  check('UI Automation im Helfer geladen', /uia=True/i.test(hd || ''), hd || 'keine Antwort');
  const busy = Object.entries(d.shortcuts).filter(([, ok]) => !ok).map(([k]) => k);
  check('Alle Tastenkürzel angemeldet', !busy.length, busy.join(', '));

  // 2) Markierten Text holen – aus dem echten Editor
  check('Editor geöffnet', await focusNotepad());
  await press(VK.CTRL, VK.HOME);
  await press(VK.CTRL, VK.A);
  await sleep(300);
  shot('1-editor-markiert');
  let uia = null;
  for (let i = 0; i < 3 && !uia; i++) {
    if (i) { await focusNotepad(); await press(VK.CTRL, VK.A); await sleep(400); }
    uia = await silk(() => global.__silk.uia());
  }
  check('Markierung über UI Automation gelesen', uia && uia.includes('Nordlicht'), uia ? `${uia.length} Zeichen` : 'nichts');
  await focusNotepad();
  await press(VK.CTRL, VK.A); // Fokus-Klick kann die Markierung aufheben – neu markieren
  await sleep(200);
  const viaCopy = await silk(() => global.__silk.grab({ noUia: true }));
  check('Markierung über Strg+C gelesen (Zwischenablage danach wiederhergestellt)', viaCopy.text && viaCopy.text.includes('Nordlicht'), viaCopy.text ? `${viaCopy.text.length} Zeichen` : JSON.stringify(viaCopy));

  // 3) Echtes Tastenkürzel: Strg+Alt+T übersetzt die Markierung
  await focusNotepad();
  await press(VK.CTRL, VK.ALT, VK.T);
  const t1 = await waitFor(async () => ((await visible('popup.html')) && (await popupTitle())) || null, 15000);
  check('Tastenkürzel Strg+Alt+T → Übersetzung in der Sprechblase', t1 === 'Übersetzung', t1 || 'keine Blase');
  shot('2-kuerzel-uebersetzung');
  await hidePopup();

  // 4) Spinne anklicken (echter Mausklick) → große Spinne + Zusammenfassung
  await focusNotepad();
  await press(VK.CTRL, VK.A);
  const sp = await silk(() => global.__silk.spiderPos());
  await click(Math.round(sp.x), Math.round(sp.y));
  const overlay = await waitFor(() => visible('overlay.html'), 8000);
  check('Klick auf die Spinne → große Spinne läuft über den Text', overlay, '', false);
  shot('3-grosse-spinne');
  const t2 = await waitFor(async () => { const t = await popupTitle(); return (await visible('popup.html')) && t && !['Silkreader', 'Übersetzung', 'Markierter Text'].includes(t) ? t : null; }, 25000);
  check('… danach Ergebnis in der Sprechblase', !!t2, t2 || 'keine Blase');
  shot('4-ergebnis');
  await hidePopup();

  // 5) Spinnennetz-Ring: Strg+Alt+Leertaste gedrückt halten, nach unten links zum Notizbuch, loslassen
  setCursor(700, 450); await sleep(200);
  down(VK.CTRL); down(VK.ALT); down(VK.SPACE); await sleep(80); up(VK.SPACE);
  const ringOpen = await waitFor(() => visible('ring.html'), 4000);
  check('Ring öffnet sich am Mauszeiger', ringOpen);
  // Notizbuch liegt unten links (6 Felder: Lesen oben, dann im Uhrzeigersinn)
  for (let k = 1; k <= 10; k++) { setCursor(Math.round(700 - 7 * k), Math.round(450 + 4 * k)); await sleep(25); }
  await sleep(500);
  shot('5-ring');
  up(VK.ALT); up(VK.CTRL);
  const t3 = await waitFor(async () => ((await visible('popup.html')) && (await popupTitle()) === 'Notizbuch') || null, 5000);
  check('Ring: halten, Richtung wählen, loslassen → Notizbuch', t3, '', false);
  await hidePopup();
  await silk(() => global.__silk.closeRing());

  // 6) Große Spinne bleibt beim Scrollen auf dem Text
  await focusNotepad();
  await press(VK.CTRL, VK.HOME);
  for (let i = 0; i < 15; i++) await press(VK.DOWN);
  down(VK.SHIFT); for (let i = 0; i < 3; i++) { keybd(VK.DOWN, 0, 0, 0); keybd(VK.DOWN, 0, 2, 0); await sleep(40); } up(VK.SHIFT);
  await sleep(300);
  setCursor(600, 500);
  const shifts0 = await silk(() => global.__silk.shiftCount);
  const crawl = silk(() => global.__silk.crawlSelection());
  await sleep(1200);
  for (let i = 0; i < 2; i++) { wheel(-120); await sleep(600); }
  const found = await crawl;
  const shifts = (await silk(() => global.__silk.shiftCount)) - shifts0;
  check('Mitwandern beim Scrollen (Spinne folgt dem Text)', shifts > 0, `${shifts} Verschiebungen; UI Automation fand ${found?.words ?? 0} Wörter, ${found?.lines ?? 0} Zeilen`, false);
  shot('6-scrollen');

  // 6b) Browser: Chrome und Edge – Text auf einer Webseite markieren und lesen
  const html = path.join(os.tmpdir(), 'silkreader-browsertest.html');
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><title>Silkreader Browsertest</title>
    <body style="font:20px/1.6 Segoe UI,Arial;max-width:900px;margin:60px auto"><p id="t">${sample.split('\n').filter(Boolean).slice(0, 4).join('</p><p>')}</p></body>`);
  const browsers = [
    ['Chrome', 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', 'chrome', []],
    ['Edge', 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', 'msedge', ['--inprivate']],
  ];
  for (const [name, exe, proc, extra] of browsers) {
    if (!fs.existsSync(exe)) { check(`${name}: installiert`, false, exe, false); continue; }
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), `silk-${proc}-`));
    spawn(exe, ['--no-first-run', '--no-default-browser-check', '--disable-search-engine-choice-screen', '--disable-sync', '--start-maximized',
      `--user-data-dir=${profile}`, ...extra, '--new-window', `file:///${html.replace(/\\/g, '/')}`], { detached: true, stdio: 'ignore' }).unref();
    await sleep(6000);
    let title = '';
    for (let i = 0; i < 10 && !title; i++) {
      try { title = execSync(`powershell -NoProfile -Command "(Get-Process ${proc} -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*Silkreader Browsertest*' } | Select-Object -First 1).MainWindowTitle"`).toString().trim(); } catch {}
      if (!title) await sleep(1000);
    }
    const h = title ? findWindow(null, title) : null;
    if (!h) { check(`${name}: Fenster gefunden`, false, title || 'kein Fenster', false); try { execSync(`taskkill /IM ${proc}.exe /F`, { stdio: 'ignore' }); } catch {} continue; }
    showWin(h, 3); down(VK.ALT); setFg(h); bringTop(h); up(VK.ALT);
    await sleep(800);
    await click(700, 400); // in die Seite klicken (Fokus), dann alles markieren
    await press(VK.CTRL, VK.A);
    await sleep(500);
    shot(`7-${proc}-markiert`);
    let u = await silk(() => global.__silk.uia());
    if (!u) { await sleep(1500); u = await silk(() => global.__silk.uia()); } // Browser schalten Bedienhilfen erst auf Anfrage ein
    // Browser liefern über UI Automation oft keine Markierung – dann übernimmt Strg+C (nächste Prüfung)
    check(`${name}: Markierung über UI Automation (optional)`, true, u && u.includes('Nordlicht') ? `${u.length} Zeichen` : 'nicht verfügbar – Strg+C übernimmt', false);
    const g = await silk(() => global.__silk.grab({ noUia: true }));
    check(`${name}: Markierung über Strg+C`, g.text && g.text.includes('Nordlicht'), g.text ? `${g.text.length} Zeichen` : 'nichts', false);
    const boxes = await silk((_e, p) => global.__silk.scan(p), { x: 700, y: 400 });
    check(`${name}: markierte Wörter auf dem Bildschirm gefunden`, (boxes?.length || 0) > 10, `${boxes?.length || 0} Wortkästen`, false);
    // Wie ein Mensch: erst zur Spinne fahren (sie hält dann still), dann klicken
    let sp = await silk(() => global.__silk.spiderPos());
    setCursor(Math.round(sp.x), Math.round(sp.y) + 30); await sleep(700);
    sp = await silk(() => global.__silk.spiderPos());
    await click(Math.round(sp.x), Math.round(sp.y));
    const tb = await waitFor(async () => { const t = await popupTitle(); return (await visible('popup.html')) && t && !['Silkreader', 'Übersetzung', 'Markierter Text', 'Notizbuch'].includes(t) ? t : null; }, 25000);
    check(`${name}: Klick auf die Spinne → Ergebnis`, !!tb, tb || 'keine Blase', false);
    shot(`8-${proc}-ergebnis`);
    await hidePopup();
    await silk(() => global.__silk.showPopupPayload({ kind: 'message', title: 'Silkreader', text: '' })); // Titel zurücksetzen
    await hidePopup();
    try { execSync(`taskkill /IM ${proc}.exe /F`, { stdio: 'ignore' }); } catch {}
    await sleep(800);
  }

  // 7) Kopierte Datei landet im Spinnennetz
  const before = await silk(() => global.__silk.cocoons.list().length);
  execSync(`powershell -NoProfile -Command "Set-Clipboard -Path '${txt}'"`);
  const pinned = await waitFor(async () => (await silk(() => global.__silk.cocoons.list().length)) > before, 6000);
  check('Strg+C auf Datei → im Spinnennetz', pinned);

  // 8) Windows-Texterkennung
  try {
    const ocr = await silk(() => global.__silk.ocrSample());
    check('Windows-Texterkennung (OCR)', /Silkreader/i.test(ocr || ''), ocr || 'leer', false);
  } catch (e) { check('Windows-Texterkennung (OCR)', false, e.message, false); }

  // 9) Update-Signaturprüfung am echten Installer
  if (signedExe && fs.existsSync(signedExe)) {
    const okSigned = await silk((_e, f) => global.__silk.verify(f), signedExe);
    check('Update-Prüfung: echter Silkreader-Installer wird akzeptiert', okSigned === null, okSigned || '');
    const tampered = path.join(os.tmpdir(), 'silk-tampered.exe');
    const buf = fs.readFileSync(signedExe);
    buf[Math.floor(buf.length / 3)] ^= 0xff;
    fs.writeFileSync(tampered, buf);
    const bad = await silk((_e, f) => global.__silk.verify(f), tampered);
    check('Update-Prüfung: veränderter Installer wird abgelehnt', bad !== null, bad || 'angenommen!');
    const foreign = await silk((_e, f) => global.__silk.verify(f), electronPath);
    check('Update-Prüfung: fremd signierte Datei wird abgelehnt', foreign !== null, foreign || 'angenommen!');
  } else {
    check('Update-Signaturprüfung', false, 'kein signierter Installer übergeben', false);
  }

  // 10) Scans und Fotos, Explorer-Aufruf, Vollbild-Erkennung (1.18)
  const scan = await silk(() => global.__silk.makeScan());
  let tDoc = Date.now();
  const pngDoc = await silk((_e, f) => global.__silk.readFile(f), scan.png).catch((e) => ({ error: e.message }));
  const pngMs = Date.now() - tDoc;
  check('Foto eines Dokuments gelesen (Texterkennung)', /4711|Rechnung/i.test((pngDoc.pages || []).join(' ')), `${pngMs} ms – ${pngDoc.error || (pngDoc.pages || []).join(' ').slice(0, 80)}`, false);
  tDoc = Date.now();
  const pdfDoc = await silk((_e, f) => global.__silk.readFile(f), scan.pdf).catch((e) => ({ error: e.message }));
  check('Gescannte PDF gelesen (Texterkennung)', /4711|Rechnung/i.test((pdfDoc.pages || []).join(' ')), `${Date.now() - tDoc} ms – ${pdfDoc.error || (pdfDoc.pages || []).join(' ').slice(0, 80)}`, false);
  const fsBusy = await silk(() => global.__silk.fullscreenBusy());
  check('Vollbild-Erkennung abfragbar', typeof fsBusy === 'boolean', `gerade Vollbild: ${fsBusy}`, false);
  await hidePopup();
  spawn(electronPath, ['.', `--read=${txt}`], { env: appEnv, detached: true, stdio: 'ignore' }).unref();
  const t4 = await waitFor(async () => { const t = await popupTitle(); return (await visible('popup.html')) && t === path.basename(txt) ? t : null; }, 20000);
  check('Explorer „Mit Silkreader lesen“ (Start mit --read)', !!t4, t4 || 'keine Blase', false);

  check('Keine Fehler in den Fenstern', !errs.length, errs.join(' | '), false);
  const log = await silk(() => global.__silk.log());
  check('Protokoll: Wege der Textauswahl', true, (log.match(/(Auswahl per|UI Automation:|Helfer:) [^\n]*/g) || []).join(' · '), false);
} catch (e) {
  check('Testlauf', false, e.stack || e.message);
} finally {
  try { fs.copyFileSync(path.join(userData, 'silkreader-errors.log'), path.join(out, 'silkreader.log')); } catch {}
  await app.close().catch(() => {});
  try { execSync('taskkill /IM notepad.exe /F', { stdio: 'ignore' }); } catch {}
}

fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(results, null, 2));
const failed = results.filter((r) => !r.ok && r.critical);
const warned = results.filter((r) => !r.ok && !r.critical);
console.log(`\n${results.length - failed.length - warned.length}/${results.length} bestanden, ${warned.length} Warnung(en), ${failed.length} kritische Fehler`);
// Als Hinweise am Testlauf ausgeben (über die GitHub-Schnittstelle lesbar, auch ohne Log-Download)
const enc = (t) => String(t).replace(/%/g, '%25').replace(/\r/g, '').replace(/\n/g, '%0A').replace(/::/g, ': :');
console.log(`::notice title=Windows-Test (${results.length - failed.length - warned.length}/${results.length})::${enc(results.map((r) => `${r.ok ? 'OK ' : r.critical ? 'FEHLER ' : 'WARNUNG '} ${r.name}${r.detail ? ` – ${r.detail}` : ''}`).join('\n'))}`);
for (const r of failed.slice(0, 9)) console.log(`::error title=${enc(r.name)}::${enc(r.detail || 'fehlgeschlagen')}`);
for (const r of warned.slice(0, 9)) console.log(`::warning title=${enc(r.name)}::${enc(r.detail || 'fehlgeschlagen')}`);
// Kurzfassung für die GitHub-Übersicht
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Silkreader auf echtem Windows\n\n| | Prüfung | Details |\n|---|---|---|\n${results.map((r) => `| ${r.ok ? '✅' : r.critical ? '❌' : '⚠️'} | ${r.name} | ${r.detail.replace(/\|/g, '/').replace(/\n/g, ' ')} |`).join('\n')}\n`);
}
process.exit(failed.length ? 1 : 0);
