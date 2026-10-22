// Silkreader – Hauptprozess
// Schwebendes Spinnen-Icon + Analysefenster. Texte kommen aus der Zwischenablage,
// per Drag & Drop oder über "Datei öffnen" und werden mit Claude analysiert.

const {
  app, BrowserWindow, ipcMain, clipboard, globalShortcut, Menu, Tray,
  dialog, screen, safeStorage, nativeImage, shell, desktopCapturer,
} = require('electron');
const path = require('path');
const fs = require('fs');
// Große Module erst laden, wenn sie gebraucht werden – das macht den Start schneller.
let Anthropic = null;
const loadAnthropic = () => (Anthropic ??= require('@anthropic-ai/sdk').default);
let autoUpdaterInstance = null;
const updater = () => (autoUpdaterInstance ??= require('electron-updater').autoUpdater);

const { grabSelection, copyFileToClipboard, warmUp: warmUpGrab, isMouseDown, selectionRects, clipboardSeq, readClipboardFiles, ownClipboardActive, helperAvailable } = require('./grab');
const { CocoonStore } = require('./cocoons');
const { scanSelection } = require('./selectionScan');
const { recognizeText } = require('./ocr');

// Globale Tastenkürzel. Strg+Alt statt Strg+Umschalt, weil viele Programme Strg+Umschalt
// selbst benutzen (z. B. Strg+Umschalt+Leertaste in Word, Strg+Umschalt+B in Chrome).
const SHORTCUTS = [
  { id: 'take', keys: 'CommandOrControl+Alt+S', label: 'Strg+Alt+S', desc: 'Markierten Text an die Spinne geben (Vorschau)' },
  { id: 'analyze', keys: 'CommandOrControl+Alt+A', label: 'Strg+Alt+A', desc: 'Markierten Text sofort analysieren' },
  { id: 'cocoon', keys: 'CommandOrControl+Alt+K', label: 'Strg+Alt+K', desc: 'Markierten Text oder Datei in einen Kokon packen' },
  { id: 'cocoons', keys: 'CommandOrControl+Alt+V', label: 'Strg+Alt+V', desc: 'Kokon-Ablage öffnen (Kopieren/Einfügen)' },
  { id: 'toggle', keys: 'CommandOrControl+Alt+H', label: 'Strg+Alt+H', desc: 'Spinne verstecken / zeigen' },
  { id: 'translate', keys: 'CommandOrControl+Alt+T', label: 'Strg+Alt+T', desc: 'Markierten Text übersetzen' },
  { id: 'simplify', keys: 'CommandOrControl+Alt+L', label: 'Strg+Alt+L', desc: 'Markierten Text in leichter Sprache' },
  { id: 'reply', keys: 'CommandOrControl+Alt+R', label: 'Strg+Alt+R', desc: 'Antwort auf markierte E-Mail entwerfen' },
  { id: 'region', keys: 'CommandOrControl+Alt+B', label: 'Strg+Alt+B', desc: 'Bildschirmbereich lesen lassen' },
  { id: 'notebook', keys: 'CommandOrControl+Alt+N', label: 'Strg+Alt+N', desc: 'Notizbuch (letzte Analysen)' },
];
// Hinweis: Strg+Alt+E/Q/M/2/3/7–0 sind auf deutschen Tastaturen AltGr-Zeichen (€, @, µ …) und daher tabu.
const HOTKEY = SHORTCUTS[0].keys;

// Kleine Aussetzer (z. B. ein Timer nach dem Schließen eines Fensters) sollen kein
// Fehlerfenster aufpoppen lassen – stattdessen in silkreader-errors.log festhalten.
function logError(err) {
  try {
    const file = path.join(app.getPath('userData'), 'silkreader-errors.log');
    fs.appendFileSync(file, `${new Date().toISOString()} ${err?.stack || err}\n`);
  } catch {}
}
process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);
const shortcutActions = {
  take: () => spiderTake({ fromHotkey: true }),
  analyze: () => spiderTake({ fromHotkey: true, autoStart: true }),
  cocoon: () => cocoonFromSelection(),
  cocoons: () => { bubbleWin.show(); Menu.buildFromTemplate(cocoonsMenuTemplate()).popup({ window: bubbleWin }); },
  toggle: () => (bubbleWin.isVisible() ? bubbleWin.hide() : bubbleWin.show()),
  translate: () => transformSelection('translate'),
  simplify: () => transformSelection('simplify'),
  reply: () => transformSelection('reply'),
  region: () => regionCapture(),
  notebook: () => showNotebook(),
};
// Eigene Tastenkürzel aus den Einstellungen übernehmen und alle (neu) anmelden
function registerShortcuts() {
  const custom = loadSettings().shortcuts || {};
  globalShortcut.unregisterAll();
  for (const sc of SHORTCUTS) {
    if (custom[sc.id]) { sc.keys = custom[sc.id].keys; sc.label = custom[sc.id].label; }
    try { shortcutStatus[sc.id] = globalShortcut.register(sc.keys, shortcutActions[sc.id]); } catch { shortcutStatus[sc.id] = false; }
    if (!shortcutStatus[sc.id]) console.warn('Tastenkürzel belegt:', sc.label);
  }
}
const shortcutStatus = {};
let cocoons = null;
const OLLAMA_URL = 'http://127.0.0.1:11434';

// Eingebautes KI-Modell (läuft mit llama.cpp direkt in der App, kostenlos und offline).
// Die Modelldatei wird einmalig aus der App heraus geladen und im Benutzerordner gespeichert.
const BUILTIN_MODELS = {
  fast: {
    name: 'Schnell (Qwen2.5 1.5B)',
    uri: 'hf:bartowski/Qwen2.5-1.5B-Instruct-GGUF:Q4_K_M',
    file: 'Qwen2.5-1.5B-Instruct-Q4_K_M.gguf',
    sizeLabel: '1 GB',
    chunkTokens: 2200,
  },
  quality: {
    name: 'Gründlich (Qwen3 4B)',
    uri: 'hf:unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M',
    file: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf',
    sizeLabel: '2,5 GB',
    chunkTokens: 3000,
  },
};
const MODELS = {
  'claude-opus-5-5': 'Claude Opus 5.5 (beste Qualität)',
  'claude-sonnet-5-5': 'Claude Sonnet 5.5 (schneller, günstiger)',
  'claude-haiku-5-5': 'Claude Haiku 5.5 (sehr schnell, sehr günstig)',
};

let bubbleWin = null;
let mainWin = null;
let settingsWin = null;
let tray = null;

// ---------- Einstellungen ----------

const settingsFile = () => path.join(app.getPath('userData'), 'settings.json');

function loadSettings() {
  const defaults = {
    provider: 'builtin', model: 'claude-opus-5-5', ollamaModel: 'gemma3:12b',
    language: 'Deutsch', apiKeyEnc: null, bubble: null,
  };
  try {
    return { ...defaults, ...JSON.parse(fs.readFileSync(settingsFile(), 'utf8')) };
  } catch {
    return defaults;
  }
}

function saveSettings(s) {
  fs.mkdirSync(path.dirname(settingsFile()), { recursive: true });
  fs.writeFileSync(settingsFile(), JSON.stringify(s, null, 2));
}

function getApiKey() {
  const s = loadSettings();
  if (!s.apiKeyEnc) return process.env.ANTHROPIC_API_KEY || null;
  const buf = Buffer.from(s.apiKeyEnc, 'base64');
  return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
}

function setApiKey(key) {
  const s = loadSettings();
  s.apiKeyEnc = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(key).toString('base64')
    : Buffer.from(key, 'utf8').toString('base64');
  saveSettings(s);
}

// ---------- Fenster ----------

// Die Spinne hängt an einem Faden vom oberen Bildschirmrand. Das Fenster ist größtenteils
// durchsichtig und lässt Klicks durch – nur über der Spinne selbst fängt es die Maus ab.
const RIG = { width: 220, height: 320, minLen: 24, maxLen: 230 };

function rigArea() {
  return screen.getPrimaryDisplay().workArea;
}

function createBubble() {
  const s = loadSettings();
  const area = rigArea();
  const x = Number.isFinite(s.rig?.x)
    ? Math.min(Math.max(s.rig.x, area.x - RIG.width / 2), area.x + area.width - RIG.width / 2)
    : area.x + area.width - RIG.width - 90;

  bubbleWin = new BrowserWindow({
    width: RIG.width, height: RIG.height, x: Math.round(x), y: area.y,
    frame: false, transparent: true, resizable: false, alwaysOnTop: true,
    skipTaskbar: true, hasShadow: false, focusable: false, maximizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  bubbleWin.setAlwaysOnTop(true, 'floating');
  bubbleWin.setVisibleOnAllWorkspaces(true);
  bubbleWin.setIgnoreMouseEvents(true, { forward: true });
  bubbleWin.loadFile(path.join(__dirname, 'bubble.html'));
  bubbleWin.webContents.on('did-finish-load', () => {
    bubbleWin.webContents.send('rig-init', { length: s.rig?.length ?? 90, minLen: RIG.minLen, maxLen: RIG.maxLen });
    sendCocoons();
  });

  // Mausposition regelmäßig an die Spinne schicken (Augen folgen dem Zeiger, Treffer-Test).
  // Ist die Maus weit weg, reicht seltenes Nachfragen – das spart Rechenzeit.
  let lastSent = 0, lastPos = null;
  const timer = setInterval(() => {
    if (!bubbleWin || bubbleWin.isDestroyed()) return clearInterval(timer);
    if (!bubbleWin.isVisible()) return;
    const c = screen.getCursorScreenPoint();
    recordCursor(c);
    const [wx, wy] = bubbleWin.getPosition();
    const x = c.x - wx, y = c.y - wy;
    const far = x < -300 || x > RIG.width + 300 || y > RIG.height + 300;
    const now = Date.now();
    if (far && now - lastSent < 150 && !dropZone) return; // weit weg: nur ~7× pro Sekunde nachsehen
    checkDropZone(x, y);
    if (lastPos && lastPos.x === x && lastPos.y === y) return; // Maus bewegt sich nicht
    if (far && now - lastSent < 400) return;
    lastSent = now;
    lastPos = { x, y };
    bubbleWin.webContents.send('cursor', { x, y });
  }, 40);
}

// Zieht jemand mit gedrückter Maustaste etwas in die Nähe der Spinne, wird das ganze Netz
// zur Ablagefläche – man muss die schaukelnde Spinne nicht mehr genau treffen.
let dropZone = false, btnPending = false, lastBtnCheck = 0;
function checkDropZone(x, y) {
  const near = x > -60 && x < RIG.width + 60 && y > -20 && y < RIG.height + 60;
  if (!near) { if (dropZone) setDropZone(false); return; }
  const now = Date.now();
  if (btnPending || now - lastBtnCheck < 120) return;
  lastBtnCheck = now;
  btnPending = true;
  isMouseDown().then((down) => {
    btnPending = false;
    if (down === null) return; // unbekannt (nicht Windows)
    if (down !== dropZone) setDropZone(down);
  });
}
function setDropZone(on) {
  dropZone = on;
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  if (on) bubbleWin.setIgnoreMouseEvents(false);
  bubbleWin.webContents.send('drop-zone', on);
}

function setBusy(busy) {
  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.webContents.send('busy', busy);
}

// Das Analysefenster wird beim Start unsichtbar vorbereitet und beim Schließen nur versteckt –
// so öffnet es sich danach ohne Verzögerung.
let quitting = false;
let rigHiddenForMain = false;
function createMain() {
  if (mainWin && !mainWin.isDestroyed()) return mainWin;
  mainWin = new BrowserWindow({
    show: false,
    width: 1280, height: 860, minWidth: 820, minHeight: 560,
    title: 'Silkreader', backgroundColor: '#0b0b10', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  mainWin.loadFile(path.join(__dirname, 'index.html'));
  mainWin.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    mainWin.hide();
  });
  mainWin.on('closed', () => { mainWin = null; if (rigHiddenForMain) { rigHiddenForMain = false; bubbleWin?.showInactive(); } });
  // Solange das Fenster offen ist, tobt die kleine Spinne darin herum statt am Bildschirmrand zu hängen
  const rigAway = () => { if (bubbleWin?.isVisible()) { rigHiddenForMain = true; bubbleWin.hide(); } };
  const rigBack = () => { if (rigHiddenForMain) { rigHiddenForMain = false; bubbleWin?.showInactive(); } };
  mainWin.on('show', () => { rigAway(); clearTimeout(mainWin.__freeTimer); });
  mainWin.on('restore', rigAway);
  mainWin.on('hide', () => { rigBack(); scheduleFree(mainWin, 3 * 60 * 1000); });
  mainWin.on('minimize', rigBack);
  return mainWin;
}

// Ein verstecktes Fenster nach einer Weile ganz schließen, damit es keinen Speicher belegt.
function scheduleFree(win, ms) {
  clearTimeout(win.__freeTimer);
  win.__freeTimer = setTimeout(() => {
    if (!win.isDestroyed() && !win.isVisible()) { win.removeAllListeners('close'); win.destroy(); }
  }, ms);
}

function showMain() {
  const w = createMain();
  w.show();
  w.focus();
  return w;
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return settingsWin.focus();
  settingsWin = new BrowserWindow({
    width: 580, height: 820, resizable: true, title: 'Einstellungen',
    backgroundColor: '#0b0b10', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// Öffnet das Analysefenster und übergibt ihm ein Dokument. Analysiert wird erst nach Enter
// (oder sofort, wenn autoStart gesetzt ist).
function showDocument(doc, { autoStart = false, result = null, focus = null } = {}) {
  if (!result) preloadBuiltinModel(); // gleich wird analysiert → Modell schon mal laden
  const win = showMain();
  const send = () => win.webContents.send('document', { doc, autoStart, result, focus });
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send);
  else send();
}

// ---------- Ergebnis-Sprechblase unter der Spinne ----------

const POPUP = { width: 420, height: 560 };
let popupWin = null;
function createPopup() {
  if (popupWin && !popupWin.isDestroyed()) return popupWin;
  popupWin = new BrowserWindow({
    width: POPUP.width, height: POPUP.height, show: false, frame: false, transparent: true, resizable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, maximizable: false, minimizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  popupWin.setAlwaysOnTop(true, 'floating');
  popupWin.loadFile(path.join(__dirname, 'popup.html'));
  popupWin.on('closed', () => { popupWin = null; });
  popupWin.on('hide', () => scheduleFree(popupWin, 90 * 1000));
  popupWin.on('show', () => clearTimeout(popupWin.__freeTimer));
  return popupWin;
}

function showPopup(doc, { autoStart = false } = {}) {
  preloadBuiltinModel();
  showPopupPayload({ kind: 'analyze', doc, autoStart });
}

// Sprechblase mit beliebigem Inhalt: analyze | transform | compare | message
function showPopupPayload(payload) {
  const win = createPopup();
  // Unter der Spinne platzieren, die Spitze zeigt auf sie
  const sp = spiderScreenPos();
  const area = screen.getDisplayNearestPoint(sp).workArea;
  const x = Math.round(Math.min(Math.max(sp.x - POPUP.width / 2, area.x + 6), area.x + area.width - POPUP.width - 6));
  const y = Math.round(Math.min(sp.y + 24, area.y + area.height - POPUP.height));
  win.setPosition(x, y);
  const arrow = Math.round(Math.min(Math.max(sp.x - x, 34), POPUP.width - 34));
  const send = () => {
    win.webContents.send('popup-doc', { ...payload, arrow });
    win.show();
    win.focus();
  };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send);
  else send();
}

// ---------- Übersetzen, leichte Sprache, Antwort-Entwurf (per Tastenkürzel) ----------
async function transformSelection(mode) {
  const grabbed = await grabSelection({ hotkey: true });
  if (!grabbed.text) { bubbleWin?.webContents.send('rig-trick', 'shrug'); return; }
  preloadBuiltinModel();
  showPopupPayload({ kind: 'transform', mode, title: TRANSFORMS[mode].title, text: grabbed.text });
}

function showNotebook() {
  const w = showMain();
  const send = () => w.webContents.send('show-notebook');
  if (w.webContents.isLoading()) w.webContents.once('did-finish-load', send); else send();
}

// ---------- Bildschirmbereich lesen (Texterkennung) ----------
async function regionCapture() {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const sf = display.scaleFactor || 1;
  // Erst das Bildschirmfoto (noch ohne Abdunklung), dann den Bereich wählen lassen
  let shot = null;
  try {
    const sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: Math.round(display.size.width * sf), height: Math.round(display.size.height * sf) } });
    shot = (sources.find((x) => String(x.display_id) === String(display.id)) || sources[0])?.thumbnail;
  } catch { shot = null; }
  if (!shot || shot.isEmpty()) return;
  const b = display.bounds;
  const win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height, frame: false, transparent: true, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, hasShadow: false, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  const rect = await new Promise((resolve) => {
    const onDone = (e, r) => { if (e.sender === win.webContents) { ipcMain.removeListener('region-done', onDone); resolve(r); } };
    ipcMain.on('region-done', onDone);
    win.on('closed', () => { ipcMain.removeListener('region-done', onDone); resolve(null); });
    win.once('ready-to-show', () => { win.show(); win.focus(); });
    win.loadFile(path.join(__dirname, 'region.html'));
  });
  if (!win.isDestroyed()) win.destroy();
  if (!rect) return;
  const k = shot.getSize().width / b.width;
  const crop = shot.crop({ x: Math.round(rect.x * k), y: Math.round(rect.y * k), width: Math.round(rect.w * k), height: Math.round(rect.h * k) });
  const file = path.join(app.getPath('temp'), `silkreader-bereich-${Date.now()}.png`);
  fs.writeFileSync(file, crop.toPNG());
  bubbleWin?.webContents.send('rig-trick', 'dance');
  const text = await recognizeText(file);
  if (text) {
    showPopup({ title: 'Bildschirmausschnitt', source: 'region', pages: [text] }, { autoStart: true });
  } else if (loadSettings().provider === 'claude') {
    // Ohne Texterkennung: Claude kann das Bild direkt ansehen
    showPopup({ title: 'Bildschirmausschnitt', source: 'region', pages: ['(Bild)'], image: crop.toPNG().toString('base64') }, { autoStart: true });
  } else {
    showPopupPayload({ kind: 'message', title: 'Kein Text erkannt', text: 'In diesem Bereich hat die Windows-Texterkennung keinen Text gefunden. Tipp: einen größeren Bereich wählen oder in den Einstellungen Claude nutzen – Claude kann auch Bilder lesen.' });
  }
  fs.unlink(file, () => {});
}

// ---------- Markieren & Spinne klicken ----------

// Verlauf der Mausposition: daraus lässt sich schätzen, wo der markierte Text auf dem
// Bildschirm steht (dort, wo die Maus zuletzt ruhig war, bevor sie zur Spinne kam).
const cursorHistory = [];
function recordCursor(c) {
  const now = Date.now();
  cursorHistory.push({ x: c.x, y: c.y, t: now });
  while (cursorHistory.length && now - cursorHistory[0].t > 8000) cursorHistory.shift();
}
function selectionAnchor(fromHotkey) {
  const c = screen.getCursorScreenPoint();
  if (fromHotkey) return c; // Tastenkürzel: Die Maus steht meist noch beim Text
  const [wx, wy] = bubbleWin.getPosition();
  const nearSpider = (p) => p.x > wx - 120 && p.x < wx + RIG.width + 120 && p.y < wy + RIG.height + 60;
  for (let i = cursorHistory.length - 1; i > 0; i--) {
    const a = cursorHistory[i], b = cursorHistory[i - 1];
    if (nearSpider(a)) continue;
    if (Math.hypot(a.x - b.x, a.y - b.y) < 4 && a.t - b.t >= 30) return a; // hier lag die Maus still
  }
  const area = screen.getPrimaryDisplay().workArea;
  return { x: area.x + area.width / 2, y: area.y + area.height / 2 };
}

function spiderScreenPos() {
  const [wx, wy] = bubbleWin.getPosition();
  return { x: wx + RIG.width / 2, y: wy + (loadSettings().rig?.length ?? 90) + 20 };
}

let taking = false;
async function spiderTake({ autoStart = false, fromHotkey = false } = {}) {
  if (taking) return;
  taking = true;
  try {
    preloadBuiltinModel();
    const anchor = selectionAnchor(fromHotkey);
    // Bildschirmfoto der Markierung gleich mit aufnehmen (nur im Speicher), solange sie sichtbar ist
    const wantAnimation = loadSettings().hatchAnimation !== false && bubbleWin?.isVisible();
    const scanned = wantAnimation ? scanSelection(anchor).catch(() => null) : Promise.resolve(null);
    const grabbed = await grabSelection({ hotkey: fromHotkey });
    // Analysiert wird nur markierter Text. Markierte Dateien werden festgehalten.
    if (!grabbed.text && grabbed.files.length) {
      grabbed.files.slice(0, 6).forEach((f) => cocoons.addFile(f));
      bubbleWin?.webContents.send('rig-trick', 'wrap');
      sendCocoons();
      return;
    }
    if (!grabbed.text) {
      showMain(); // nichts markiert → einfach die App öffnen
      return;
    }
    const doc = { title: 'Markierter Text', source: 'selection', pages: [grabbed.text] };

    if (wantAnimation) {
      // Die kleine Spinne erschrickt und versteckt sich, die große kriecht herein
      bubbleWin.webContents.send('rig-trick', 'scared');
      // Wortpositionen: 1. aus dem Bildschirmfoto (klappt überall), 2. von Windows (UI Automation)
      const fromScreen = await scanned;
      const rects = fromScreen?.length ? { words: fromScreen, dip: true } : await selectionRects();
      await runCrawlOverlay(anchor, rects);
      bubbleWin.webContents.send('rig-trick', 'return');
    }
    showPopup(doc, { autoStart: true }); // In der Sprechblase geht's direkt los – Enter nur im großen Fenster
  } finally {
    taking = false;
  }
}

// Bildschirmpixel (von UI Automation) in Electron-Koordinaten umrechnen
function toDipRects(list) {
  return (list || []).map(([x, y, w, h]) => {
    const r = process.platform === 'win32' ? screen.screenToDipRect(null, { x, y, width: w, height: h }) : { x, y, width: w, height: h };
    return [r.x, r.y, r.width, r.height];
  });
}

// Die große Spinne kriecht vom Bildschirmrand herein, liest die markierten Wörter und verschwindet wieder.
function runCrawlOverlay(anchorAbs, rects) {
  return new Promise((resolve) => {
    const words = rects?.dip ? rects.words : toDipRects(rects?.words);
    const lines = rects?.dip ? [] : toDipRects(rects?.lines);
    const first = words[0] || lines[0];
    if (first) anchorAbs = { x: first[0], y: first[1] };
    const b = screen.getDisplayNearestPoint(anchorAbs).bounds;
    const rel = (arr) => arr.map(([x, y, w, h]) => [x - b.x, y - b.y, w, h]);
    const win = new BrowserWindow({
      x: b.x, y: b.y, width: b.width, height: b.height, show: false,
      frame: false, transparent: true, resizable: false, movable: false, alwaysOnTop: true,
      skipTaskbar: true, focusable: false, hasShadow: false,
      webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
    });
    win.setAlwaysOnTop(true, 'screen-saver');
    win.setIgnoreMouseEvents(true);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      ipcMain.removeListener('overlay-done', onDone);
      if (!win.isDestroyed()) win.destroy();
      resolve();
    };
    const onDone = (e) => { if (e.sender === win.webContents) finish(); };
    ipcMain.on('overlay-done', onDone);
    setTimeout(finish, 12000);
    win.webContents.once('did-finish-load', () => {
      win.showInactive();
      win.webContents.send('overlay-start', {
        anchor: { x: anchorAbs.x - b.x, y: anchorAbs.y - b.y },
        width: b.width, height: b.height,
        words: rel(words), lines: rel(lines),
      });
    });
    win.loadFile(path.join(__dirname, 'overlay.html'));
  });
}

// Alte Bezeichnung, wird noch von Menüs benutzt
const analyzeClipboard = () => spiderTake();

// Strg+C auf Dateien/Ordner (z. B. im Explorer) → automatisch auch ins Spinnennetz
function watchCopiedFiles() {
  let lastSeq = null, checking = false;
  setInterval(async () => {
    if (checking || loadSettings().pinCopied === false) return;
    checking = true;
    try {
      const seq = await clipboardSeq();
      if (seq === null) return;
      if (lastSeq !== null && seq !== lastSeq && !ownClipboardActive()) {
        const files = await readClipboardFiles();
        if (files.length) {
          files.slice(0, 6).forEach((f) => cocoons.addFile(f));
          bubbleWin?.webContents.send('rig-trick', 'wrap');
          sendCocoons();
        }
      }
      lastSeq = seq;
    } finally { checking = false; }
  }, 900);
}

// ---------- Kokon-Ablage ----------

const iconCache = new Map();
async function iconFor(it) {
  if (it.type !== 'file' || it.missing) return null;
  if (iconCache.has(it.path)) return iconCache.get(it.path);
  let img = null;
  // Genau das Symbol, das auch der Explorer zeigt (Dokument, Ordner, Programm …)
  try { img = await app.getFileIcon(it.path, { size: 'large' }); } catch { img = null; }
  const url = img && !img.isEmpty() ? img.toDataURL() : null;
  iconCache.set(it.path, url);
  return url;
}

async function sendCocoons() {
  const isDir = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
  const list = await Promise.all(cocoons.list().map(async (it) => ({ ...it, icon: await iconFor(it), folder: it.type === 'file' && isDir(it.path) })));
  bubbleWin?.webContents.send('cocoons', list);
}

async function cocoonFromSelection({ hotkey = true } = {}) {
  const grabbed = await grabSelection({ hotkey });
  if (grabbed.files.length) grabbed.files.slice(0, 6).forEach((f) => cocoons.addFile(f));
  else if (grabbed.text) cocoons.addText(grabbed.text);
  else return;
  bubbleWin?.webContents.send('rig-trick', 'wrap');
  sendCocoons();
}

async function copyCocoon(id) {
  const it = cocoons.get(id);
  if (!it) return false;
  if (it.type === 'text') { await clipboard.writeText(it.text); return true; }
  return copyFileToClipboard(it.path);
}

const isFolder = (p) => { try { return fs.statSync(p).isDirectory(); } catch { return false; } };
function cocoonMenu(id) {
  const it = cocoons.get(id);
  if (!it) return [];
  return [
    { label: 'Kopieren', click: async () => { if (await copyCocoon(id)) bubbleWin?.webContents.send('cocoon-copied', id); } },
    ...(it.type === 'file' && isFolder(it.path) ? [{ label: 'Öffnen', click: () => shell.openPath(it.path) }] : [{ label: 'Analysieren', click: async () => {
      if (it.type === 'text') showDocument({ title: 'Text aus dem Kokon', source: 'cocoon', pages: [it.text] });
      else openFile(it.path);
    } }]),
    ...(it.type === 'file' ? [{ label: 'Im Ordner zeigen', click: () => shell.showItemInFolder(it.path) }] : []),
    ...(cocoons.list().length > 1 && !(it.type === 'file' && isFolder(it.path)) ? [{ label: 'Vergleichen mit …', submenu: cocoons.list()
      .filter((o) => o.id !== id && !(o.type === 'file' && isFolder(o.path)))
      .map((o) => ({ label: o.name, click: () => compareCocoons(id, o.id) })) }] : []),
    { type: 'separator' },
    { label: 'Aus dem Netz nehmen', click: () => { cocoons.remove(id); sendCocoons(); } },
  ];
}

async function cocoonDoc(it) {
  return it.type === 'text' ? { title: it.name, source: 'cocoon', pages: [it.text] } : readDocument(it.path);
}
async function compareCocoons(idA, idB) {
  try {
    const [a, b] = await Promise.all([cocoonDoc(cocoons.get(idA)), cocoonDoc(cocoons.get(idB))]);
    preloadBuiltinModel();
    showPopupPayload({ kind: 'compare', title: `${a.title} ↔ ${b.title}`, a, b });
  } catch (e) {
    dialog.showErrorBox('Vergleich nicht möglich', String(e.message || e));
  }
}

function cocoonsMenuTemplate() {
  const items = cocoons.list();
  if (!items.length) return [{ label: 'Noch leer – Datei oder Text auf die Spinne ziehen', enabled: false }];
  return [
    ...items.map((it) => ({ label: `${it.type === 'file' ? '📄' : '📝'} ${it.name}${it.missing ? ' (fehlt)' : ''}`, submenu: cocoonMenu(it.id) })),
    { type: 'separator' },
    { label: 'Alle Kokons entfernen', click: () => { cocoons.clear(); sendCocoons(); } },
  ];
}

async function pickFile() {
  const r = await dialog.showOpenDialog({
    title: 'Dokument analysieren',
    properties: ['openFile'],
    filters: [{ name: 'Dokumente', extensions: ['pdf', 'docx', 'txt', 'md', 'csv', 'json', 'html', 'log'] }],
  });
  if (!r.canceled && r.filePaths[0]) await openFile(r.filePaths[0]);
}

async function openFile(filePath, opts) {
  try {
    showDocument(await readDocument(filePath), opts);
  } catch (e) {
    dialog.showErrorBox('Datei konnte nicht gelesen werden', String(e.message || e));
  }
}

// ---------- Dateien lesen ----------

async function readDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const title = path.basename(filePath);
  const buf = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = text.map((t) => t.trim());
    if (!pages.some(Boolean)) throw new Error('Diese PDF enthält keinen auslesbaren Text (evtl. ein Scan).');
    return { title, source: 'pdf', pages };
  }
  if (ext === '.docx') {
    const mammoth = require('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return { title, source: 'docx', pages: [value.trim()] };
  }
  let text = buf.toString('utf8');
  if (ext === '.html' || ext === '.htm') text = text.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ');
  return { title, source: ext.slice(1) || 'text', pages: [text.trim()] };
}

// ---------- Claude-Analyse ----------

const ANALYSIS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'doc_type', 'summary', 'key_points', 'figures', 'findings'],
  properties: {
    title: { type: 'string', description: 'Kurzer, treffender Titel für das Dokument' },
    doc_type: { type: 'string', description: 'Art des Textes, z. B. Geschäftsbericht, Vertrag, Artikel, E-Mail' },
    summary: { type: 'string', description: 'Das Wichtigste in 3 bis 5 kurzen Stichpunkten in einfacher Sprache, jeder Stichpunkt in einer eigenen Zeile und mit "• " am Anfang' },
    key_points: { type: 'array', items: { type: 'string' }, description: 'Die wichtigsten Kernaussagen' },
    figures: {
      type: 'array',
      description: 'Wichtige Zahlen, Daten, Fristen, Namen oder Begriffe aus dem Text',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'value', 'quote', 'page'],
        properties: {
          label: { type: 'string', description: 'Was die Angabe bedeutet, z. B. "Nettogewinn"' },
          value: { type: 'string', description: 'Die Angabe kompakt, z. B. "$101,8 Mrd."' },
          quote: { type: 'string', description: 'Exakte, wörtliche Stelle aus dem Text (3–12 Wörter), unverändert kopiert' },
          page: { type: 'integer', description: 'Seitennummer (1, wenn es keine Seiten gibt)' },
        },
      },
    },
    findings: {
      type: 'array',
      description: 'Analytische Erkenntnisse: Auffälligkeiten, Risiken, Chancen, Widersprüche, nötige Handlungen',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['kind', 'title', 'detail', 'pages'],
        properties: {
          kind: { type: 'string', enum: ['Beobachtung', 'Risiko', 'Chance', 'Handlung', 'Widerspruch'] },
          title: { type: 'string', description: 'Erkenntnis in einem prägnanten Satz' },
          detail: { type: 'string', description: 'Kurze Begründung, ggf. mit Rechnung' },
          pages: { type: 'array', items: { type: 'integer' } },
        },
      },
    },
  },
};

function buildPrompt(doc, language, compact = false) {
  const body = doc.pages.length > 1
    ? doc.pages.map((p, i) => `<page number="${i + 1}">\n${p}\n</page>`).join('\n')
    : doc.pages[0];
  return [
    `Lies das folgende Dokument ("${doc.title}") vollständig und analysiere es wie ein erfahrener Analyst.`,
    `Antworte auf ${language}.`,
    '',
    'Liefere:',
    ...(compact ? [
      // Kurze Antwort für das eingebaute Modell: weniger Text = viel schneller
      '- "summary": das Wichtigste in 3 bis 5 kurzen Stichpunkten (jeder in eigener Zeile, mit "• " am Anfang) und höchstens 5 kurze Kernaussagen,',
      '- 4 bis 12 wichtige Angaben (Zahlen, Beträge, Daten, Fristen, Personen). Das Feld "quote" muss eine kurze wörtliche Stelle aus dem Dokument sein (3 bis 8 Wörter),',
      '- 3 bis 5 Erkenntnisse mit je einem kurzen Satz als Begründung.',
      'Fasse dich kurz.',
    ] : [
      '- "summary": das Wichtigste in 3 bis 5 kurzen Stichpunkten (jeder in eigener Zeile, mit "• " am Anfang), dazu die Kernaussagen,',
      '- 6 bis 30 wichtige Angaben (Zahlen, Beträge, Daten, Fristen, Personen, Begriffe) – je nach Länge und Dichte des Textes. Das Feld "quote" muss eine wörtliche, zusammenhängende Stelle aus dem Dokument sein (Zeichen für Zeichen kopiert), damit sie im Text markiert werden kann,',
      '- 3 bis 8 echte Erkenntnisse, die über bloßes Nacherzählen hinausgehen: Kennzahlen/Verhältnisse selbst ausrechnen, wo es sinnvoll ist, Risiken, Fristen, Widersprüche oder nötige Handlungen benennen.',
    ]),
    'Schreib in einfacher, verständlicher Sprache: kurze Sätze, Fachbegriffe kurz erklären.',
    'Erfinde nichts, was nicht im Text steht oder sich daraus ableiten lässt.',
    '',
    '<document>',
    body,
    '</document>',
  ].join('\n');
}

async function analyze(doc, onProgress) {
  // Entwicklungs-Hook: feste Antwort aus einer JSON-Datei statt API-Aufruf.
  if (process.env.SPIDER_MOCK) {
    const mock = fs.readFileSync(process.env.SPIDER_MOCK, 'utf8');
    for (let i = 0; i < mock.length; i += 200) { await new Promise((r) => setTimeout(r, 120)); onProgress(mock.slice(i, i + 200)); }
    return JSON.parse(mock);
  }
  const s = loadSettings();
  if (s.provider === 'builtin') return analyzeBuiltin(doc, s, onProgress);
  return s.provider === 'ollama' ? analyzeOllama(doc, s, onProgress) : analyzeClaude(doc, s, onProgress);
}

async function analyzeClaude(doc, s, onProgress) {
  const apiKey = getApiKey();
  if (!apiKey) throw Object.assign(new Error('Kein API-Schlüssel hinterlegt. Bitte in den Einstellungen eintragen – oder dort auf den kostenlosen lokalen Modus umstellen.'), { code: 'NO_KEY' });
  const client = new (loadAnthropic())({ apiKey });

  const params = {
    model: s.model,
    max_tokens: 32000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
    messages: [{ role: 'user', content: doc.image
      ? [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: doc.image } }, { type: 'text', text: buildPrompt({ ...doc, pages: ['(Text siehe Bild oben)'] }, s.language) }]
      : buildPrompt(doc, s.language) }],
  };
  // Haiku hat keinen serverseitigen Fallback – für Opus/Sonnet springt bei einer
  // Ablehnung automatisch ein passendes Ersatzmodell ein.
  if (s.model !== 'claude-haiku-5-5') {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  const stream = client.beta.messages.stream(params);
  stream.on('text', (delta) => onProgress(delta));
  const msg = await stream.finalMessage();

  if (msg.stop_reason === 'refusal') throw new Error('Claude hat die Analyse dieses Textes abgelehnt.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Die Antwort wurde abgeschnitten – das Dokument ist zu umfangreich.');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
}

// ---------- Kostenlos & eingebaut: llama.cpp ----------

const modelDir = () => path.join(app.getPath('userData'), 'models');
const modelPathFor = (key) => process.env.SILK_MODEL_PATH || path.join(modelDir(), BUILTIN_MODELS[key].file);
const modelReady = (key) => fs.existsSync(modelPathFor(key));
// Ohne Auswahl: das gründliche Modell, falls es schon da ist, sonst das schnelle.
const builtinKey = (s = loadSettings()) => (BUILTIN_MODELS[s.builtinModel] ? s.builtinModel : modelReady('quality') ? 'quality' : 'fast');
const builtinModelReady = () => modelReady(builtinKey());

let llamaRuntime = null; // { key, llama, model } – bleibt geladen, damit weitere Analysen sofort starten
let llamaLoading = null;
let modelDownload = null;
let modelDownloadCanceled = false;

async function loadBuiltinModel(key = builtinKey()) {
  if (llamaRuntime?.key === key) return llamaRuntime;
  if (llamaLoading?.key === key) return llamaLoading.promise;
  const promise = (async () => {
    await unloadBuiltinModel();
    const { getLlama } = await import('node-llama-cpp');
    const llama = await getLlama({ gpu: 'auto' }); // nutzt die Grafikkarte, falls möglich, sonst den Prozessor
    const model = await llama.loadModel({ modelPath: modelPathFor(key) });
    llamaRuntime = { key, llama, model };
    return llamaRuntime;
  })();
  llamaLoading = { key, promise };
  try { return await promise; } finally { llamaLoading = null; }
}

async function unloadBuiltinModel() {
  const rt = llamaRuntime;
  llamaRuntime = null;
  await rt?.model.dispose().catch(() => {});
}

// Das Modell belegt 1–2,5 GB Arbeitsspeicher. Deshalb wird es erst geladen, wenn sich eine
// Analyse anbahnt (Maus über der Spinne, Analysefenster offen …), und nach 10 Minuten ohne
// Benutzung wieder freigegeben – so bremst Silkreader den PC im Hintergrund nicht aus.
const MODEL_IDLE_MS = 3 * 60 * 1000;
let lastModelUse = 0;
let analysisRunning = 0;

function preloadBuiltinModel() {
  const s = loadSettings();
  if (s.provider !== 'builtin' || !builtinModelReady()) return;
  lastModelUse = Date.now();
  if (llamaRuntime?.key === builtinKey(s) || llamaLoading) return;
  loadBuiltinModel().catch((e) => console.error('Modell vorladen:', e));
}

setInterval(() => {
  if (llamaRuntime && !llamaLoading && !analysisRunning && Date.now() - lastModelUse > MODEL_IDLE_MS) {
    unloadBuiltinModel();
  }
}, 60 * 1000);

// ---- Eingebautes Modell: Dokument abschnittsweise lesen (bis zum Ende), dann zusammenfassen ----
// Alle Felder haben feste Höchstlängen – so wird jede Antwort garantiert fertig.
const str = (maxLength, description) => ({ type: 'string', maxLength, ...(description ? { description } : {}) });
const FIGURE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['label', 'value', 'quote', 'page'],
  properties: { label: str(60), value: str(40), quote: str(90, 'wörtliche Stelle aus dem Text, 3 bis 8 Wörter'), page: { type: 'integer' } },
};
const FINDING_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['kind', 'title', 'detail', 'pages'],
  properties: {
    kind: { type: 'string', enum: ['Beobachtung', 'Risiko', 'Chance', 'Handlung', 'Widerspruch'] },
    title: str(140), detail: str(220), pages: { type: 'array', items: { type: 'integer' }, maxItems: 4 },
  },
};
const NOTES_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['points', 'figures'],
  properties: {
    points: { type: 'array', items: str(200), maxItems: 4 },
    figures: { type: 'array', items: FIGURE_SCHEMA, maxItems: 5 },
  },
};
const FINAL_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'doc_type', 'summary', 'key_points', 'findings'],
  properties: {
    title: str(80), doc_type: str(40), summary: str(600, 'Das Wichtigste in 3 bis 5 kurzen Stichpunkten, jeder in eigener Zeile mit "• " am Anfang'),
    key_points: { type: 'array', items: str(170), maxItems: 6 },
    findings: { type: 'array', items: FINDING_SCHEMA, maxItems: 5 },
  },
};
const SHORT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'doc_type', 'summary', 'key_points', 'figures', 'findings'],
  properties: { ...FINAL_SCHEMA.properties, figures: { type: 'array', items: FIGURE_SCHEMA, maxItems: 8 } },
};

// Text in Abschnitte von höchstens maxTokens teilen (an Absatzgrenzen, mit Seitenangabe).
function splitIntoChunks(model, doc, maxTokens) {
  const chunks = [];
  let cur = [], curTokens = 0, firstPage = 1, lastPage = 1;
  const flush = () => {
    if (!cur.length) return;
    chunks.push({ text: cur.join('\n\n'), firstPage, lastPage });
    cur = []; curTokens = 0;
  };
  doc.pages.forEach((pageText, pi) => {
    const page = pi + 1;
    for (let para of pageText.split(/\n\s*\n/)) {
      para = para.trim();
      if (!para) continue;
      // Riesige Absätze in Stücke schneiden
      const pieces = [];
      const approxChars = maxTokens * 3;
      for (let k = 0; k < para.length; k += approxChars) pieces.push(para.slice(k, k + approxChars));
      for (const piece of pieces) {
        const t = model.tokenize(piece).length;
        if (curTokens + t > maxTokens) flush();
        if (!cur.length) firstPage = page;
        cur.push(doc.pages.length > 1 ? `[Seite ${page}] ${piece}` : piece);
        curTokens += t;
        lastPage = page;
      }
    }
  });
  flush();
  return chunks;
}

async function analyzeBuiltin(doc, s, onProgress) {
  const key = builtinKey(s);
  const info = BUILTIN_MODELS[key];
  if (!modelReady(key)) {
    throw Object.assign(new Error(`Das eingebaute KI-Modell ist noch nicht heruntergeladen (einmalig ${info.sizeLabel}). Bitte in den Einstellungen auf „Herunterladen“ klicken.`), { code: 'NO_MODEL' });
  }
  const { LlamaChatSession } = await import('node-llama-cpp');
  lastModelUse = Date.now();
  onProgress({ stage: 'Modell wird geladen …' });
  const { llama, model } = await loadBuiltinModel(key);

  const chunks = splitIntoChunks(model, doc, info.chunkTokens);
  const systemPrompt = `Du bist ein sorgfältiger Analyst. Antworte auf ${s.language} in einfacher, verständlicher Sprache, kurz und präzise, ausschließlich mit JSON nach dem Schema.`;
  let context = await model.createContext({ contextSize: info.chunkTokens + 2600, flashAttention: 'auto' });
  let session = new LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt });
  try {
    const ask = async (prompt, schema, maxTokens, stream) => {
      // Reicht der Platz nicht (z. B. viele Notizen am Schluss), größeren Kontext anlegen
      const need = model.tokenize(prompt).length + maxTokens + 400;
      if (need > context.contextSize) {
        await context.dispose();
        context = await model.createContext({ contextSize: Math.min(need, model.trainContextSize || need), flashAttention: 'auto' });
        session = new LlamaChatSession({ contextSequence: context.getSequence(), systemPrompt });
      }
      session.resetChatHistory();
      const grammar = await llama.createGrammarForJsonSchema(schema);
      const text = await session.prompt(prompt, {
        grammar, maxTokens, temperature: 0.2,
        onTextChunk: stream ? (c) => onProgress(c) : undefined,
      });
      return grammar.parse(text);
    };

    // Kurzes Dokument: ein Durchgang reicht
    if (chunks.length <= 1) {
      onProgress({ stage: 'Analysiere …', step: 1, steps: 1 });
      const r = await ask([
        `Analysiere das folgende Dokument („${doc.title}“).`,
        'Liefere Titel, Art, als "summary" das Wichtigste in 3 bis 5 kurzen Stichpunkten (jeder in eigener Zeile, mit "• " am Anfang), bis zu 6 Kernaussagen, bis zu 8 wichtige Angaben (Zahlen, Beträge, Fristen, Namen; "quote" = wörtliche Stelle aus dem Text) und bis zu 5 echte Erkenntnisse (Risiken, Chancen, nötige Handlungen; rechne Kennzahlen aus, wo sinnvoll).',
        '', '<document>', chunks[0]?.text || '', '</document>',
      ].join('\n'), SHORT_SCHEMA, 2200, true);
      return normalizeResult(r);
    }

    // Langes Dokument: jeden Abschnitt lesen und Notizen machen …
    const notes = [];
    const figures = [];
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      onProgress({ stage: `Liest Abschnitt ${i + 1} von ${chunks.length} …`, step: i + 1, steps: chunks.length + 1 });
      const n = await ask([
        `Abschnitt ${i + 1} von ${chunks.length} des Dokuments „${doc.title}“ (Seite ${c.firstPage}${c.lastPage !== c.firstPage ? `–${c.lastPage}` : ''}).`,
        'Notiere die bis zu 4 wichtigsten Aussagen als kurze Sätze und bis zu 5 wichtige Angaben (Zahlen, Beträge, Fristen, Namen) mit wörtlicher Fundstelle ("quote").',
        '', '<abschnitt>', c.text, '</abschnitt>',
      ].join('\n'), NOTES_SCHEMA, 700, false);
      notes.push(`Abschnitt ${i + 1} (S. ${c.firstPage}${c.lastPage !== c.firstPage ? `–${c.lastPage}` : ''}):\n- ${n.points.join('\n- ')}`
        + (n.figures.length ? `\n  Angaben: ${n.figures.map((f) => `${f.label}: ${f.value}`).join('; ')}` : ''));
      for (const f of n.figures) figures.push({ ...f, page: Math.min(c.lastPage, Math.max(c.firstPage, f.page || c.firstPage)) });
    }

    // … dann aus allen Notizen die Gesamtanalyse schreiben
    onProgress({ stage: 'Schreibt die Zusammenfassung …', step: chunks.length + 1, steps: chunks.length + 1 });
    const final = await ask([
      `Hier sind Notizen zu allen ${chunks.length} Abschnitten des Dokuments „${doc.title}“.`,
      'Erstelle daraus Titel, Art des Dokuments, als "summary" das Wichtigste aus dem GANZEN Dokument in 3 bis 5 kurzen Stichpunkten (jeder in eigener Zeile, mit "• " am Anfang), bis zu 6 Kernaussagen und bis zu 5 echte Erkenntnisse (Risiken, Chancen, Widersprüche, nötige Handlungen; rechne Kennzahlen aus, wo sinnvoll).',
      '', '<notizen>', notes.join('\n\n'), '</notizen>',
    ].join('\n'), FINAL_SCHEMA, 1300, true);

    // Angaben aus allen Abschnitten übernehmen (doppelte entfernen)
    const seen = new Set();
    const uniqueFigures = figures.filter((f) => {
      const k = `${f.label}|${f.value}`.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    }).slice(0, 20);
    return normalizeResult({ ...final, figures: uniqueFigures });
  } catch (e) {
    if (e.code) throw e;
    throw new Error(`Das eingebaute Modell ist bei der Analyse gestolpert: ${e.message || e}. Bitte erneut versuchen.`);
  } finally {
    await context.dispose();
  }
}

async function startModelDownload(sender, key) {
  if (modelDownload) return;
  const info = BUILTIN_MODELS[key] || BUILTIN_MODELS.fast;
  const send = (ch, d) => { if (!sender.isDestroyed()) sender.send(ch, d); };
  try {
    const { createModelDownloader } = await import('node-llama-cpp');
    fs.mkdirSync(modelDir(), { recursive: true });
    let lastProgress = Date.now();
    let stalled = false;
    const downloader = await Promise.race([
      createModelDownloader({
        modelUri: info.uri,
        dirPath: modelDir(),
        fileName: info.file,
        onProgress: ({ totalSize, downloadedSize, averageSpeed }) => {
          lastProgress = Date.now();
          send('model-progress', { total: totalSize, done: downloadedSize, speed: averageSpeed });
        },
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('keine Verbindung zum Download-Server (Hugging Face)')), 60000)),
    ]);
    modelDownload = downloader;
    modelDownloadCanceled = false;
    // Hängt der Download länger als 90 Sekunden, abbrechen und Fehler melden.
    const watchdog = setInterval(() => {
      if (Date.now() - lastProgress > 90000) { stalled = true; clearInterval(watchdog); downloader.cancel(); }
    }, 5000);
    try {
      await downloader.download();
    } finally {
      clearInterval(watchdog);
    }
    if (stalled) throw new Error('der Download ist hängen geblieben – bitte Internetverbindung prüfen und erneut versuchen');
    send('model-progress', { finished: true });
    preloadBuiltinModel();
  } catch (e) {
    send('model-progress', { error: modelDownloadCanceled && !String(e.message).includes('hängen') ? 'Download abgebrochen.' : `Download fehlgeschlagen: ${e.message || e}` });
  } finally {
    modelDownload = null;
  }
}

// ---------- Kostenlos & lokal: Ollama ----------

async function ollamaModels() {
  const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
  const { models } = await res.json();
  return models.map((m) => m.name);
}

async function analyzeOllama(doc, s, onProgress) {
  let installed;
  try {
    installed = await ollamaModels();
  } catch {
    throw Object.assign(new Error('Ollama läuft nicht. Installiere es kostenlos von ollama.com, starte es und lade ein Modell (siehe Einstellungen).'), { code: 'NO_OLLAMA' });
  }
  const model = installed.includes(s.ollamaModel) ? s.ollamaModel : installed[0];
  if (!model) {
    throw Object.assign(new Error(`In Ollama ist noch kein Modell installiert. Öffne die Eingabeaufforderung und gib ein:  ollama pull ${s.ollamaModel}`), { code: 'NO_OLLAMA' });
  }

  const prompt = buildPrompt(doc, s.language);
  // Kontextfenster an die Textlänge anpassen (ca. 3 Zeichen pro Token + Platz für die Antwort)
  const numCtx = Math.min(65536, Math.max(8192, Math.ceil(prompt.length / 3) + 6000));

  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      stream: true,
      format: ANALYSIS_SCHEMA,
      options: { num_ctx: numCtx, temperature: 0.2 },
      messages: [
        { role: 'system', content: 'Du bist ein sorgfältiger Analyst. Antworte ausschließlich mit JSON nach dem vorgegebenen Schema.' },
        { role: 'user', content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Ollama-Fehler: ${(await res.text()).slice(0, 300)}`);

  // Antwort kommt zeilenweise als JSON (NDJSON)
  let out = '', buf = '';
  const decoder = new TextDecoder();
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line) continue;
      const msg = JSON.parse(line);
      if (msg.error) throw new Error(`Ollama-Fehler: ${msg.error}`);
      out += msg.message?.content || '';
      onProgress(msg.message?.content || '');
    }
  }
  try {
    return normalizeResult(JSON.parse(out));
  } catch {
    throw new Error('Das lokale Modell hat keine gültige Antwort geliefert. Bitte erneut versuchen oder ein größeres Modell wählen.');
  }
}

// Kleinere lokale Modelle lassen manchmal Felder weg – fehlende Teile auffüllen.
function normalizeResult(r) {
  return {
    title: r.title || 'Analyse',
    doc_type: r.doc_type || 'Text',
    summary: Array.isArray(r.summary) ? r.summary.map((x) => `• ${x}`).join('\n') : r.summary || '',
    key_points: Array.isArray(r.key_points) ? r.key_points : [],
    figures: (Array.isArray(r.figures) ? r.figures : []).map((f) => ({
      label: String(f.label ?? ''), value: String(f.value ?? ''), quote: String(f.quote ?? ''), page: Number(f.page) || 1,
    })),
    findings: (Array.isArray(r.findings) ? r.findings : []).map((f) => ({
      kind: f.kind || 'Beobachtung', title: f.title || '', detail: f.detail || '', pages: Array.isArray(f.pages) ? f.pages : [],
    })),
  };
}

// Liest ein (evtl. noch unvollständiges) Textfeld aus halb fertigem JSON.
function partialField(json, name) {
  const m = json.match(new RegExp(`"${name}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)`));
  if (!m) return null;
  try { return JSON.parse(`"${m[1].replace(/\\+$/, (b) => (b.length % 2 ? b.slice(1) : b))}"`); } catch { return m[1]; }
}

function friendlyError(e) {
  if (e.code === 'NO_KEY' || e.code === 'NO_OLLAMA' || e.code === 'NO_MODEL') return e.message;
  if (Anthropic && e instanceof Anthropic.AuthenticationError) return 'Der API-Schlüssel ist ungültig. Bitte in den Einstellungen prüfen.';
  if (Anthropic && e instanceof Anthropic.RateLimitError) return 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.';
  if (Anthropic && e instanceof Anthropic.BadRequestError) return `Anfrage abgelehnt: ${e.message}`;
  if (Anthropic && e instanceof Anthropic.APIConnectionError) return 'Keine Verbindung zu Claude – Internetverbindung prüfen.';
  if (Anthropic && e instanceof Anthropic.APIError) return `Fehler von Claude: ${e.message}`;
  return String(e.message || e);
}

// ---------- Weitere KI-Aufgaben: Fragen, Übersetzen, Vereinfachen, Antworten, Vergleichen ----------

// Eine Anfrage an die eingestellte KI. "material" ist der (lange) Text; beim eingebauten Modell
// wird er bei Bedarf gekürzt. Mit schema kommt JSON zurück, sonst Text (gestreamt über onChunk).
async function llmGenerate({ instruction, material = '', schema = null, maxTokens = 1200, onChunk = () => {}, budget = null }) {
  const s = loadSettings();
  if (process.env.SPIDER_MOCK) return mockGenerate(instruction, schema, onChunk);
  const lang = `Antworte auf ${s.language}, in einfacher, klarer Sprache.`;

  if (s.provider === 'builtin') {
    const key = builtinKey(s);
    if (!modelReady(key)) throw Object.assign(new Error('Das eingebaute KI-Modell ist noch nicht heruntergeladen (Einstellungen → Herunterladen).'), { code: 'NO_MODEL' });
    const { LlamaChatSession } = await import('node-llama-cpp');
    lastModelUse = Date.now();
    const { llama, model } = await loadBuiltinModel(key);
    const limit = budget || Math.round(BUILTIN_MODELS[key].chunkTokens * 1.4);
    let text = material;
    let truncated = false;
    if (model.tokenize(text).length > limit) {
      text = model.detokenize(model.tokenize(text).slice(0, limit));
      truncated = true;
    }
    const prompt = `${instruction}\n${lang}${text ? `\n\n<text>\n${text}\n</text>` : ''}`;
    const ctx = await model.createContext({ contextSize: model.tokenize(prompt).length + maxTokens + 300, flashAttention: 'auto' });
    try {
      const session = new LlamaChatSession({ contextSequence: ctx.getSequence(), systemPrompt: 'Du bist ein hilfreicher, präziser Assistent.' });
      const grammar = schema ? await llama.createGrammarForJsonSchema(schema) : undefined;
      const out = await session.prompt(prompt, { grammar, maxTokens, temperature: 0.3, onTextChunk: onChunk });
      return { value: schema ? grammar.parse(out) : out.trim(), truncated };
    } finally {
      await ctx.dispose();
      lastModelUse = Date.now();
    }
  }

  const prompt = `${instruction}\n${lang}${material ? `\n\n<text>\n${material}\n</text>` : ''}`;
  if (s.provider === 'ollama') {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: s.ollamaModel, stream: true, ...(schema ? { format: schema } : {}), options: { num_ctx: Math.min(65536, Math.max(8192, Math.ceil(prompt.length / 3) + maxTokens + 500)) }, messages: [{ role: 'user', content: prompt }] }),
    }).catch(() => { throw Object.assign(new Error('Ollama läuft nicht.'), { code: 'NO_OLLAMA' }); });
    let out = '', buf = '';
    const dec = new TextDecoder();
    for await (const chunk of res.body) {
      buf += dec.decode(chunk, { stream: true });
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim(); buf = buf.slice(nl + 1);
        if (!line) continue;
        const piece = JSON.parse(line).message?.content || '';
        out += piece; onChunk(piece);
      }
    }
    return { value: schema ? JSON.parse(out) : out.trim(), truncated: false };
  }

  // Claude
  const apiKey = getApiKey();
  if (!apiKey) throw Object.assign(new Error('Kein API-Schlüssel hinterlegt.'), { code: 'NO_KEY' });
  const client = new (loadAnthropic())({ apiKey });
  const params = {
    model: s.model, max_tokens: Math.max(2000, maxTokens * 3),
    output_config: { effort: 'low', ...(schema ? { format: { type: 'json_schema', schema: toClaudeSchema(schema) } } : {}) },
    messages: [{ role: 'user', content: prompt }],
  };
  if (s.model !== 'claude-haiku-5-5') { params.betas = ['server-side-fallback-2026-07-01']; params.fallbacks = 'default'; }
  const stream = client.beta.messages.stream(params);
  stream.on('text', (d) => onChunk(d));
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('Claude hat diese Anfrage abgelehnt.');
  const out = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return { value: schema ? JSON.parse(out) : out.trim(), truncated: false };
}

// Claude-Schemas mögen keine Längen-/Anzahlgrenzen → für Claude entfernen
function toClaudeSchema(schema) {
  return JSON.parse(JSON.stringify(schema, (k, v) => (['maxLength', 'maxItems', 'minItems', 'description'].includes(k) ? undefined : v)));
}

// Testantworten (nur mit SPIDER_MOCK)
async function mockGenerate(instruction, schema, onChunk) {
  const reply = schema?.properties?.answer ? { answer: 'Die Dividende steigt auf 1,10 Euro je Aktie.', quote: 'Dividende von 1,10 Euro je Aktie' }
    : schema?.properties?.diff ? { title: 'Vergleich', same: ['Beide nennen 412 Millionen Euro Umsatz.'], diff: ['A erwähnt die Anleihe, B nicht.'], tip: 'A ist ausführlicher.' }
    : 'Dies ist ein Testtext der Spinne. Er wurde vereinfacht.';
  const text = typeof reply === 'string' ? reply : JSON.stringify(reply);
  for (let i = 0; i < text.length; i += 12) { await new Promise((r) => setTimeout(r, 15)); onChunk(text.slice(i, i + 12)); }
  return { value: reply, truncated: false };
}

// Für Fragen beim eingebauten Modell: die passendsten Abschnitte heraussuchen
function relevantMaterial(doc, question, maxChars) {
  const full = doc.pages.join('\n\n');
  if (full.length <= maxChars) return full;
  const words = new Set(question.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3));
  const parts = full.split(/\n\s*\n/).map((t, i) => ({ t, i, score: [...words].filter((w) => t.toLowerCase().includes(w)).length }));
  const chosen = [];
  let len = 0;
  for (const p of [...parts].sort((a, b) => b.score - a.score)) {
    if (len + p.t.length > maxChars) continue;
    chosen.push(p); len += p.t.length;
  }
  return chosen.sort((a, b) => a.i - b.i).map((p) => p.t).join('\n\n');
}

const ASK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['answer', 'quote'],
  properties: { answer: { type: 'string', maxLength: 500 }, quote: { type: 'string', maxLength: 140, description: 'wörtliche Stelle aus dem Text, die die Antwort belegt (oder leer)' } },
};
const COMPARE_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'same', 'diff', 'tip'],
  properties: {
    title: { type: 'string', maxLength: 80 },
    same: { type: 'array', items: { type: 'string', maxLength: 180 }, maxItems: 4 },
    diff: { type: 'array', items: { type: 'string', maxLength: 220 }, maxItems: 6 },
    tip: { type: 'string', maxLength: 240, description: 'kurzes Fazit: was ist besser/wichtiger' },
  },
};
const TRANSFORMS = {
  translate: { title: 'Übersetzung', instruction: 'Übersetze den folgenden Text ins Deutsche. Ist er schon auf Deutsch, übersetze ihn ins Englische. Gib nur die Übersetzung aus, ohne Kommentar.' },
  simplify: { title: 'Einfach erklärt', instruction: 'Schreibe den folgenden Text in einfacher Sprache neu: kurze Sätze, bekannte Wörter, Fachbegriffe kurz erklären. Gib nur den neuen Text aus.' },
  reply: { title: 'Antwort-Entwurf', instruction: 'Der folgende Text ist eine E-Mail oder Nachricht. Schreibe einen kurzen, freundlichen Antwortentwurf in derselben Sprache und im passenden Ton (Du oder Sie wie in der Nachricht). Gib nur den Entwurf aus, ohne Betreffzeile.' },
};

const friendlyErr = (e) => ({ ok: false, error: friendlyError(e), needsKey: ['NO_KEY', 'NO_OLLAMA', 'NO_MODEL'].includes(e.code) });

ipcMain.handle('ask', async (event, doc, question) => {
  try {
    setBusy(true);
    const s = loadSettings();
    const material = s.provider === 'builtin' ? relevantMaterial(doc, question, 9000) : doc.pages.join('\n\n');
    const { value } = await llmGenerate({
      instruction: `Beantworte diese Frage zum Text kurz und genau: „${question}“\nWenn der Text keine Antwort enthält, sag das ehrlich. Gib in "quote" die wörtliche Stelle an, die die Antwort belegt.`,
      material, schema: ASK_SCHEMA, maxTokens: 400,
    });
    return { ok: true, ...value };
  } catch (e) { return friendlyErr(e); } finally { setBusy(false); }
});

ipcMain.handle('transform', async (event, mode, text) => {
  try {
    setBusy(true);
    let out = '';
    const { value, truncated } = await llmGenerate({
      instruction: TRANSFORMS[mode].instruction, material: text, maxTokens: 1500,
      onChunk: (c) => { out += c; event.sender.send('transform-progress', out); },
    });
    return { ok: true, text: value, truncated };
  } catch (e) { return friendlyErr(e); } finally { setBusy(false); }
});

ipcMain.handle('compare', async (event, a, b) => {
  try {
    setBusy(true);
    const s = loadSettings();
    const cut = (d) => d.pages.join('\n\n').slice(0, s.provider === 'builtin' ? 7000 : 120000);
    const { value } = await llmGenerate({
      instruction: `Vergleiche die beiden Dokumente „${a.title}“ (A) und „${b.title}“ (B). Nenne Gemeinsamkeiten, die wichtigsten Unterschiede (mit konkreten Zahlen, wenn vorhanden) und ein kurzes Fazit.`,
      material: `--- Dokument A: ${a.title} ---\n${cut(a)}\n\n--- Dokument B: ${b.title} ---\n${cut(b)}`,
      schema: COMPARE_SCHEMA, maxTokens: 900, budget: 6000,
    });
    return { ok: true, result: value };
  } catch (e) { return friendlyErr(e); } finally { setBusy(false); }
});

// Termin als Kalenderdatei öffnen (Outlook/Windows-Kalender übernehmen ihn mit einem Klick)
ipcMain.handle('add-calendar', async (_e, { title, date, note }) => {
  const d = date.replace(/-/g, '');
  const next = new Date(`${date}T00:00:00`); next.setDate(next.getDate() + 1);
  const d2 = next.toISOString().slice(0, 10).replace(/-/g, '');
  const esc = (t) => String(t || '').replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n');
  const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Silkreader//DE', 'BEGIN:VEVENT',
    `UID:${Date.now()}@silkreader`, `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    `DTSTART;VALUE=DATE:${d}`, `DTEND;VALUE=DATE:${d2}`, `SUMMARY:${esc(title)}`, `DESCRIPTION:${esc(note)}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(title)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const file = path.join(app.getPath('temp'), `Silkreader-Frist-${d}.ics`);
  fs.writeFileSync(file, ics);
  const err = await shell.openPath(file);
  return !err;
});

// ---------- Notizbuch: die letzten 20 Analysen ----------
const historyFile = () => path.join(app.getPath('userData'), 'history.json');
function loadHistory() { try { return JSON.parse(fs.readFileSync(historyFile(), 'utf8')); } catch { return []; } }
function addHistory(doc, result) {
  const list = loadHistory().filter((h) => h.text !== doc.pages.join('\n\n').slice(0, 200000));
  list.unshift({ id: `${Date.now()}`, date: Date.now(), title: result.title || doc.title, docTitle: doc.title, pages: doc.pages.map((p) => p.slice(0, 100000)), text: doc.pages.join('\n\n').slice(0, 200000), result });
  fs.writeFileSync(historyFile(), JSON.stringify(list.slice(0, 20)));
}
ipcMain.handle('history-list', (_e, q = '') => {
  const needle = q.trim().toLowerCase();
  return loadHistory()
    .filter((h) => !needle || `${h.title} ${h.docTitle} ${h.result.summary} ${h.text.slice(0, 20000)}`.toLowerCase().includes(needle))
    .map((h) => ({ id: h.id, date: h.date, title: h.title, docTitle: h.docTitle, summary: h.result.summary }));
});
ipcMain.handle('history-open', (_e, id) => {
  const h = loadHistory().find((x) => x.id === id);
  if (h) showDocument({ title: h.docTitle, source: 'history', pages: h.pages }, { result: h.result });
});
ipcMain.handle('history-delete', (_e, id) => { fs.writeFileSync(historyFile(), JSON.stringify(loadHistory().filter((h) => h.id !== id))); });

// ---------- IPC ----------

ipcMain.handle('analyze', async (event, doc) => {
  try {
    setBusy(true);
    analysisRunning++;
    // Fortschritt: Zeichenzahl und – sobald die KI sie geschrieben hat – schon die Zusammenfassung,
    // damit man nicht bis zum Ende warten muss.
    let text = '', lastSent = 0;
    let stage = null;
    const result = await analyze(doc, (chunk) => {
      if (typeof chunk === 'object') { // Statusmeldung (z. B. „Liest Abschnitt 2 von 5“)
        stage = chunk;
        text = '';
        event.sender.send('progress', { chars: 0, stage });
        return;
      }
      text += chunk;
      const now = Date.now();
      if (now - lastSent < 150) return;
      lastSent = now;
      event.sender.send('progress', { chars: text.length, summary: partialField(text, 'summary'), stage });
    });
    try { addHistory(doc, result); } catch (e) { console.error('Notizbuch:', e); }
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: friendlyError(e), needsKey: e.code === 'NO_KEY' || e.code === 'NO_OLLAMA' || e.code === 'NO_MODEL' || Anthropic && e instanceof Anthropic.AuthenticationError };
  } finally {
    analysisRunning--;
    lastModelUse = Date.now();
    setBusy(false);
  }
});

ipcMain.handle('open-file', (_e, p) => openFile(p));
ipcMain.handle('pick-file', () => pickFile());
ipcMain.handle('analyze-clipboard', () => spiderTake());
ipcMain.handle('spider-take', () => spiderTake());
ipcMain.on('main-menu', (e) => {
  Menu.buildFromTemplate([
    { label: 'Neuer Text', accelerator: 'CommandOrControl+N', click: () => e.sender.send('menu', 'new') },
    { label: 'Aus Zwischenablage', accelerator: 'CommandOrControl+V', click: () => e.sender.send('menu', 'paste') },
    { label: 'Datei öffnen …', accelerator: 'CommandOrControl+O', click: () => pickFile() },
    { label: 'Notizbuch', accelerator: 'CommandOrControl+H', click: () => e.sender.send('show-notebook') },
    { type: 'separator' },
    { label: 'Ergebnis kopieren', accelerator: 'CommandOrControl+Shift+C', click: () => e.sender.send('menu', 'copy') },
    { label: 'Einstellungen …', accelerator: 'CommandOrControl+,', click: () => openSettings() },
  ]).popup({ window: BrowserWindow.fromWebContents(e.sender) });
});
ipcMain.handle('pin-selection', () => cocoonFromSelection({ hotkey: false }));
ipcMain.handle('hide-main', () => mainWin?.hide());
ipcMain.handle('popup-close', () => popupWin?.hide());
ipcMain.handle('popup-details', (_e, doc, result, focus) => { popupWin?.hide(); showDocument(doc, { result, focus }); });
ipcMain.handle('clipboard-preview', async () => {
  const text = String((await clipboard.readText()) || '').trim();
  if (text) showDocument({ title: 'Text aus der Zwischenablage', source: 'clipboard', pages: [text] });
});
ipcMain.handle('analyze-text', (_e, text) => showDocument({ title: 'Eingefügter Text', source: 'text', pages: [text] }));
ipcMain.on('overlay-done', () => {}); // eigentliche Behandlung in runHatchOverlay

ipcMain.handle('cocoon-list', () => cocoons.list());
ipcMain.handle('cocoon-add-files', (_e, paths) => {
  paths.filter((p) => p && fs.existsSync(p)).slice(0, 6).forEach((p) => cocoons.addFile(p));
  sendCocoons();
});
ipcMain.handle('cocoon-add-text', (_e, text) => { if (text?.trim()) cocoons.addText(text); sendCocoons(); });
ipcMain.handle('cocoon-copy', (_e, id) => copyCocoon(id));
ipcMain.on('cocoon-menu', (_e, id) => Menu.buildFromTemplate(cocoonMenu(id)).popup({ window: bubbleWin }));
// Kokon aus der Spinne herausziehen → echte Datei, die man überall ablegen kann
ipcMain.on('cocoon-drag', (e, id) => {
  const it = cocoons.get(id);
  if (!it) return;
  let file = it.path;
  if (it.type === 'text') {
    file = path.join(app.getPath('temp'), `Silkreader-Text-${id.slice(0, 8)}.txt`);
    fs.writeFileSync(file, it.text);
  }
  if (!file || !fs.existsSync(file)) return;
  e.sender.startDrag({ file, icon: nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png')) });
});
ipcMain.handle('shortcuts', () => SHORTCUTS.map((s) => ({ id: s.id, label: s.label, desc: s.desc, ok: shortcutStatus[s.id] !== false })));
ipcMain.handle('set-shortcut', (_e, id, keys, label) => {
  const st = loadSettings();
  st.shortcuts = { ...(st.shortcuts || {}), [id]: { keys, label } };
  saveSettings(st);
  registerShortcuts();
  return shortcutStatus[id] !== false;
});
ipcMain.handle('open-settings', () => openSettings());
ipcMain.handle('open-main', () => { const w = createMain(); w.show(); w.focus(); });

ipcMain.handle('get-settings', () => {
  const s = loadSettings();
  return {
    provider: s.provider, model: s.model, ollamaModel: s.ollamaModel, language: s.language,
    hatchAnimation: s.hatchAnimation !== false,
    lowPower: !!s.lowPower,
    pinCopied: s.pinCopied !== false,
    hasKey: !!getApiKey(), models: MODELS, hotkey: SHORTCUTS[0].label,
  };
});
ipcMain.handle('model-status', () => ({
  selected: builtinKey(),
  downloading: !!modelDownload,
  models: Object.fromEntries(Object.entries(BUILTIN_MODELS).map(([k, m]) => [k, { name: m.name, size: m.sizeLabel, ready: modelReady(k) }])),
}));
ipcMain.handle('model-download', (event, key) => { startModelDownload(event.sender, key); });
ipcMain.handle('model-cancel', async () => { modelDownloadCanceled = true; await modelDownload?.cancel(); });
ipcMain.handle('ollama-models', async () => {
  try { return { ok: true, models: await ollamaModels() }; } catch { return { ok: false, models: [] }; }
});
ipcMain.handle('save-settings', (_e, { provider, apiKey, model, ollamaModel, language, builtinModel, hatchAnimation, lowPower, pinCopied }) => {
  if (apiKey) setApiKey(apiKey.trim());
  const s = loadSettings();
  if (['builtin', 'claude', 'ollama'].includes(provider)) s.provider = provider;
  if (ollamaModel) s.ollamaModel = ollamaModel.trim();
  if (BUILTIN_MODELS[builtinModel]) s.builtinModel = builtinModel;
  if (typeof hatchAnimation === 'boolean') s.hatchAnimation = hatchAnimation;
  if (typeof lowPower === 'boolean') s.lowPower = lowPower;
  if (typeof pinCopied === 'boolean') s.pinCopied = pinCopied;
  if (model && MODELS[model]) s.model = model;
  if (language) s.language = language;
  saveSettings(s);
  preloadBuiltinModel();
  return true;
});
ipcMain.handle('open-external', (_e, url) => {
  if (url.startsWith('https://')) shell.openExternal(url);
});

ipcMain.on('bubble-menu', () => {
  Menu.buildFromTemplate([
    { label: 'Markierten Text nehmen', accelerator: HOTKEY, click: () => spiderTake() },
    { label: 'Spinnennetz', submenu: cocoonsMenuTemplate() },
    { label: 'Bildschirmbereich lesen', click: () => regionCapture() },
    { label: 'Notizbuch', click: () => showNotebook() },
    { label: 'Datei öffnen …', click: pickFile },
    { label: 'Analysefenster öffnen', click: () => showMain() },
    { type: 'separator' },
    { label: 'Einstellungen …', click: openSettings },
    { label: 'Spinne ausblenden', click: () => bubbleWin.hide() },
    { type: 'separator' },
    { label: 'Beenden', click: () => app.quit() },
  ]).popup({ window: bubbleWin });
});

// Fenster-Ziehen für das transparente Icon (ohne Rahmen).
// Nur über der Spinne Mausereignisse annehmen, sonst durchklicken lassen.
ipcMain.on('rig-hover', (_e, inside) => {
  bubbleWin?.setIgnoreMouseEvents(!inside, { forward: true });

});

// Ziehen: seitwärts wandert die Spinne am Rand entlang, hoch/runter ändert die Fadenlänge.
// Die Mausposition kommt vom Betriebssystem – zuverlässig auch bei Windows-Skalierung.
// Während die Maustaste gedrückt ist, verfolgt der Hauptprozess den Zeiger selbst –
// so klappt das Ziehen auch, wenn gerade ein anderes Fenster den Fokus hat.
let drag = null;
ipcMain.on('rig-drag-start', (_e, length) => {
  if (!bubbleWin || bubbleWin.isDestroyed()) return;
  if (drag) clearInterval(drag.timer); // doppelter Start: alten Timer nicht verwaist weiterlaufen lassen
  const c = screen.getCursorScreenPoint();
  const [x] = bubbleWin.getPosition();
  const d = drag = { cx: c.x, cy: c.y, x, length: Number(length) || 90, cur: Number(length) || 90, moved: false };
  d.timer = setInterval(() => {
    if (drag !== d || !bubbleWin || bubbleWin.isDestroyed()) { clearInterval(d.timer); return; }
    const p = screen.getCursorScreenPoint();
    const dx = p.x - drag.cx, dy = p.y - drag.cy;
    if (!drag.moved && Math.abs(dx) + Math.abs(dy) > 4) {
      drag.moved = true;
      bubbleWin.webContents.send('rig-dragging', true);
    }
    if (!drag.moved) return;
    const area = rigArea();
    const nx = Math.min(Math.max(drag.x + dx, area.x - RIG.width / 2), area.x + area.width - RIG.width / 2);
    bubbleWin.setPosition(Math.round(nx), area.y);
    drag.cur = Math.min(Math.max(drag.length + dy, RIG.minLen), RIG.maxLen);
    bubbleWin.webContents.send('thread-length', drag.cur);
  }, 16);
});
ipcMain.handle('rig-drag-end', () => endRigDrag());
function endRigDrag() {
  if (!drag) return { moved: false };
  clearInterval(drag.timer);
  const { moved, cur } = drag;
  drag = null;
  bubbleWin.webContents.send('rig-dragging', false);
  if (moved) {
    const [x] = bubbleWin.getPosition();
    const s = loadSettings();
    s.rig = { x, length: Math.round(cur) };
    saveSettings(s);
  }
  return { moved };
}

// ---------- Automatische Updates (GitHub Releases) ----------

let manualUpdateCheck = false;

function setupUpdates() {
  if (!app.isPackaged) return; // nur in der installierten App
  updater().autoDownload = true;
  updater().autoInstallOnAppQuit = true;

  updater().on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Silkreader-Update',
      message: `Silkreader ${info.version} ist da! 🕷`,
      detail: 'Jetzt neu starten und aktualisieren? Sonst wird das Update automatisch beim nächsten Beenden installiert.',
      buttons: ['Jetzt neu starten', 'Später'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) updater().quitAndInstall(true, true);
  });
  updater().on('update-not-available', () => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: `Du hast die neueste Version (${app.getVersion()}).` });
  });
  updater().on('update-available', (info) => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: `Version ${info.version} wird im Hintergrund heruntergeladen …` });
  });
  updater().on('error', (e) => {
    console.error('Update-Fehler:', e);
    if (!manualUpdateCheck) return; // automatische Prüfungen scheitern still (z. B. offline)
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'warning', title: 'Silkreader', message: 'Die Update-Prüfung hat nicht geklappt.', detail: String(e.message || e).slice(0, 400) });
  });

  const check = () => updater().checkForUpdates().catch(() => {});
  setTimeout(check, 15000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

function checkUpdatesNow() {
  if (!app.isPackaged) {
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: 'Updates gibt es nur in der installierten App.' });
    return;
  }
  manualUpdateCheck = true;
  updater().checkForUpdates().catch(() => {});
}

// ---------- Start ----------

// Sparmodus (Einstellungen): ohne Grafikbeschleunigung – spart den Grafik-Prozess (~100 MB).
// Muss vor dem Start feststehen, deshalb direkt aus der Einstellungsdatei gelesen.
try {
  const early = JSON.parse(fs.readFileSync(path.join(app.getPath('userData'), 'settings.json'), 'utf8'));
  if (early.lowPower || process.env.SILK_LOW_POWER) app.disableHardwareAcceleration();
} catch { if (process.env.SILK_LOW_POWER) app.disableHardwareAcceleration(); }

// Chromium hält sonst einen Reserve-Prozess (~60 MB) bereit, den Silkreader nicht braucht.
app.commandLine.appendSwitch('disable-features', 'SpareRendererForSitePerProcess');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { bubbleWin?.show(); showMain(); });

  app.whenReady().then(() => {
    cocoons = new CocoonStore(path.join(app.getPath('userData'), 'cocoons.json'));
    setTimeout(warmUpGrab, 2000); // Tastatur-Helfer vorab starten, damit der erste Klick sofort klappt
    // Ohne Helfer (nicht Windows oder blockiert) gibt es keine Ablagezone → Spinne bekommt größere Fangfläche
    setTimeout(() => { if (!helperAvailable()) bubbleWin?.webContents.send('drop-zone', 'unavailable'); }, 15000);
    watchCopiedFiles();
    createBubble();

    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(icon);
    tray.setToolTip(`Silkreader ${app.getVersion()}`);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Spinne anzeigen', click: () => bubbleWin.show() },
      { label: 'Markierten Text nehmen', click: () => spiderTake() },
      { label: 'Datei öffnen …', click: pickFile },
      { label: 'Einstellungen …', click: openSettings },
      { label: `Nach Updates suchen (v${app.getVersion()})`, click: checkUpdatesNow },
      {
        label: 'Mit Windows starten', type: 'checkbox',
        checked: app.getLoginItemSettings().openAtLogin,
        click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
      },
      { type: 'separator' },
      { label: 'Beenden', click: () => app.quit() },
    ]));
    tray.on('click', () => bubbleWin.show());

    registerShortcuts();
    // Analysefenster unsichtbar vorbereiten, damit es später sofort da ist
    // (Fenster werden erst bei Bedarf erzeugt und nach einer Weile im Hintergrund wieder freigegeben – spart RAM)
    setupUpdates();

    const s = loadSettings();
    if (s.provider === 'claude' && !getApiKey()) openSettings();
    if (s.provider === 'builtin' && !builtinModelReady()) openSettings();
    if (s.provider === 'ollama') ollamaModels().then((m) => { if (!m.length) openSettings(); }).catch(openSettings);
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  // Die App läuft im Hintergrund weiter, solange die Spinne da ist.
  app.on('window-all-closed', (e) => e?.preventDefault?.());
}

// Nur für automatische Tests: ein paar Funktionen erreichbar machen
if (process.env.SPIDER_MOCK) global.__silk = { showPopupPayload, showNotebook, addHistory, compareCocoons, get cocoons() { return cocoons; } };
