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

// Automatische Tests: SPIDER_MOCK = Test-Antworten statt KI, SILK_TEST = echte KI, aber Test-Schnittstelle an
const TESTING = !!(process.env.SPIDER_MOCK || process.env.SILK_TEST);
// Aus dem Microsoft Store installiert: Updates, Autostart und „Öffnen mit“ regelt dann Windows selbst
const STORE = !!process.windowsStore;
// In Tests ist Pro freigeschaltet – außer der Test prüft gerade die Sperre (SILK_PRO_OFF)
if (TESTING && !process.env.SILK_PRO_OFF) process.env.SILK_PRO = '1';
const winkeys = require('./winkeys');
const I18N = require('./i18n');
const T = I18N.T;
// Sprache der Oberfläche: Einstellung oder Windows-Sprache (Deutsch → de, sonst Englisch)
function uiLang() {
  const l = loadSettings().uiLang;
  if (l === 'de' || l === 'en') return l;
  if (TESTING) return 'de'; // automatische Tests laufen auf Deutsch
  try { return app.getLocale().toLowerCase().startsWith('de') ? 'de' : 'en'; } catch { return 'de'; }
}
const { setLogger, helperDiag, uiaSelectedText, grabSelection, copyFileToClipboard, warmUp: warmUpGrab, isMouseDown, selectionRects, clipboardSeq, readClipboardFiles, ownClipboardActive, helperAvailable } = require('./grab');
const { CocoonStore } = require('./cocoons');
const { scanSelection } = require('./selectionScan');
const { recognizeText, recognizePdf } = require('./ocr');
const WHATS_NEW = require('./whatsnew');
const facts = require('./facts');
const pro = require('./pro');

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
  { id: 'ring', keys: 'CommandOrControl+Alt+Space', label: 'Strg+Alt+Leertaste', desc: 'Spinnennetz-Ring am Mauszeiger (z. B. auf eine Maustaste legen)' },
];
// Hinweis: Strg+Alt+E/Q/M/2/3/7–0 sind auf deutschen Tastaturen AltGr-Zeichen (€, @, µ …) und daher tabu.
const HOTKEY = SHORTCUTS[0].keys;

// Kleine Aussetzer (z. B. ein Timer nach dem Schließen eines Fensters) sollen kein
// Fehlerfenster aufpoppen lassen – stattdessen in silkreader-errors.log festhalten.
function logLine(msg) {
  try {
    const file = path.join(app.getPath('userData'), 'silkreader-errors.log');
    if (fs.existsSync(file) && fs.statSync(file).size > 300000) fs.renameSync(file, `${file}.old`);
    fs.appendFileSync(file, `${new Date().toISOString()} ${msg}\n`);
  } catch {}
}
const logError = (err) => logLine(`FEHLER ${err?.stack || err}`);
if (TESTING && process.env.SILK_USERDATA) app.setPath('userData', process.env.SILK_USERDATA);
process.on('uncaughtException', logError);
process.on('unhandledRejection', logError);

// ---------- Absicherung ----------
// Fenster der App zeigen nur eigene Seiten: keine Navigation zu fremden Adressen, keine neuen Fenster.
// Links (https) öffnen im normalen Browser.
app.on('web-contents-created', (_e, wc) => {
  wc.setWindowOpenHandler(({ url }) => {
    if (/^https:\/\//.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  wc.on('will-navigate', (ev, url) => { if (!url.startsWith('file://')) ev.preventDefault(); });
  wc.on('will-attach-webview', (ev) => ev.preventDefault());
});
const shortcutActions = {
  take: () => spiderTake({ fromHotkey: true, mode: 'read' }),
  analyze: () => spiderTake({ fromHotkey: true, autoStart: true, mode: 'read' }),
  cocoon: () => cocoonFromSelection(),
  cocoons: () => { bubbleWin.show(); Menu.buildFromTemplate(cocoonsMenuTemplate()).popup({ window: bubbleWin }); },
  toggle: () => (bubbleWin.isVisible() ? bubbleWin.hide() : bubbleWin.show()),
  translate: () => transformSelection('translate'),
  simplify: () => transformSelection('simplify'),
  reply: () => transformSelection('reply'),
  region: () => regionCapture(),
  notebook: () => showNotebook(),
  ring: () => openRing({ viaHotkey: true }),
};
// Eigene Tastenkürzel aus den Einstellungen übernehmen und alle (neu) anmelden
function registerShortcuts(notify = false) {
  const custom = loadSettings().shortcuts || {};
  globalShortcut.unregisterAll();
  for (const sc of SHORTCUTS) {
    if (custom[sc.id]) { sc.keys = custom[sc.id].keys; sc.label = custom[sc.id].label; }
    try { shortcutStatus[sc.id] = globalShortcut.register(sc.keys, () => fireShortcut(sc)); } catch { shortcutStatus[sc.id] = false; }
    logLine(`Kürzel ${sc.label} (${sc.keys}): ${shortcutStatus[sc.id] ? 'angemeldet' : 'BELEGT – von einem anderen Programm benutzt'}`);
  }
  const busy = SHORTCUTS.filter((sc) => !shortcutStatus[sc.id]);
  if (notify && busy.length && tray && !tray.isDestroyed()) {
    try { tray.displayBalloon({ title: 'Silkreader', content: T(`Diese Tastenkürzel benutzt schon ein anderes Programm: ${busy.map((b) => b.label).join(', ')}. In den Einstellungen kannst du andere wählen.`) }); } catch {}
  }
}
// Jeder Tastendruck: sofort sichtbare Rückmeldung (Spinne hüpft), Protokoll, dann die Aktion
function fireShortcut(sc) {
  logLine(`Kürzel gedrückt: ${sc.label}`);
  settingsWin?.webContents.send('shortcut-fired', sc.id);
  if (!['toggle', 'ring'].includes(sc.id) && bubbleWin?.isVisible()) bubbleWin.webContents.send('rig-trick', 'yoyo');
  Promise.resolve().then(() => shortcutActions[sc.id]()).catch(logError);
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
    chunkTokens: 1500, // kleinere Abschnitte: das kleine Modell übersieht sonst einzelne Aussagen
    genTokens: 2200,   // so viel Text darf beim Übersetzen, Fragen usw. auf einmal hinein
    minRamGB: 4,
  },
  quality: {
    name: 'Gründlich (Qwen3 4B)',
    uri: 'hf:unsloth/Qwen3-4B-Instruct-2507-GGUF:Q4_K_M',
    file: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf',
    sizeLabel: '2,5 GB',
    chunkTokens: 3000,
    minRamGB: 8,
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
  protectFromCapture(bubbleWin);
  bubbleWin.setIgnoreMouseEvents(true, { forward: true });
  bubbleWin.loadFile(path.join(__dirname, 'bubble.html'));
  bubbleWin.webContents.on('did-finish-load', () => {
    bubbleWin.webContents.send('rig-init', { length: loadSettings().rig?.length ?? 90, minLen: RIG.minLen, maxLen: RIG.maxLen, clickMode: clickMode() });
    sendCocoons();
  });

  // Mausposition regelmäßig an die Spinne schicken (Augen folgen dem Zeiger, Treffer-Test).
  // Ist die Maus weit weg, reicht seltenes Nachfragen – das spart Rechenzeit.
  // Abfragetakt passt sich an: nah 25×/s, weit weg und still nur 4×/s.
  let lastSent = 0, lastPos = null, lastRaw = null, delay = 40;
  const loop = () => {
    if (!bubbleWin || bubbleWin.isDestroyed()) return;
    setTimeout(loop, delay);
    tick();
  };
  const tick = () => {
    if (!bubbleWin.isVisible()) { delay = 300; return; }
    const c = screen.getCursorScreenPoint();
    const still = lastRaw && lastRaw.x === c.x && lastRaw.y === c.y;
    lastRaw = c;
    recordCursor(c);
    const [wx, wy] = bubbleWin.getPosition();
    const x = c.x - wx, y = c.y - wy;
    const far = x < -300 || x > RIG.width + 300 || y > RIG.height + 300;
    delay = dropZone || !far ? 40 : still ? 250 : 120;
    const now = Date.now();
    if (far && now - lastSent < 150 && !dropZone) return; // weit weg: nur ~7× pro Sekunde nachsehen
    checkDropZone(x, y);
    if (lastPos && lastPos.x === x && lastPos.y === y) return; // Maus bewegt sich nicht
    if (far && now - lastSent < 400) return;
    lastSent = now;
    lastPos = { x, y };
    bubbleWin.webContents.send('cursor', { x, y });
  };
  loop();
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
    width: 580, height: 820, resizable: true, title: T('Einstellungen'),
    backgroundColor: '#0b0b10', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
  settingsWin.on('closed', () => {
    settingsWin = null;
    if (recordingShortcut) { recordingShortcut = false; registerShortcuts(); } // Aufnahme abgebrochen
  });
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
  protectFromCapture(popupWin);
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
  const y = Math.round(Math.min(sp.y + 24, area.y + area.height - 260));
  win.setBounds({ x, y, width: POPUP.width, height: Math.min(POPUP.height, area.y + area.height - y) });
  const arrow = Math.round(Math.min(Math.max(sp.x - x, 34), POPUP.width - 34));
  const send = () => {
    win.webContents.send('popup-doc', { ...payload, arrow });
    win.show();
    win.focus();
  };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send);
  else send();
}

// Die Blase wächst mit ihrem Inhalt (der durchsichtige Rest würde sonst Klicks schlucken)
ipcMain.on('popup-size', (_e, h) => {
  if (!popupWin || popupWin.isDestroyed()) return;
  const [x, y] = popupWin.getPosition();
  const area = screen.getDisplayNearestPoint({ x, y }).workArea;
  const height = Math.round(Math.max(120, Math.min(Number(h) || POPUP.height, POPUP.height, area.y + area.height - y)));
  if (popupWin.getSize()[1] !== height) popupWin.setBounds({ x, y, width: POPUP.width, height });
});

// Mini-Blase statt App: Text einfügen, Zwischenablage, Datei, zuletzt Gelesenes
function showHome(opts = {}) {
  showPopupPayload({ kind: 'home', mode: opts.mode || clickMode(), hint: opts.hint || '' });
}

// ---------- Übersetzen, leichte Sprache, Antwort-Entwurf (per Tastenkürzel) ----------
async function transformSelection(mode, grabbed = null) {
  grabbed = grabbed || await grabSelection({ hotkey: true });
  if (!grabbed.text) {
    bubbleWin?.webContents.send('rig-trick', 'shrug');
    showHome({ mode, hint: 'Erst Text markieren – oder hier einfügen:' });
    return;
  }
  preloadBuiltinModel();
  showPopupPayload({ kind: 'transform', mode, title: TRANSFORMS[mode].title, text: grabbed.text });
}

// Notizbuch als Sprechblase (das große Fenster hat seins weiterhin unter Strg+H)
function showNotebook() {
  showPopupPayload({ kind: 'notebook' });
}

// Was ein einfacher Klick auf die Spinne tut (mit dem Mausrad auf der Spinne umschaltbar)
const CLICK_MODES = ['read', 'translate', 'simplify', 'reply'];
const clickMode = () => (CLICK_MODES.includes(loadSettings().clickMode) ? loadSettings().clickMode : 'read');
ipcMain.handle('set-click-mode', (_e, mode) => {
  if (!CLICK_MODES.includes(mode)) return clickMode();
  const st = loadSettings();
  st.clickMode = mode;
  saveSettings(st);
  bubbleWin?.webContents.send('click-mode', mode);
  return mode;
});

// ---------- Spinnennetz-Ring (wie ein Aktionsring, direkt am Mauszeiger) ----------
const RING_SIZE = 300;
const RING_KEYS = ['Left', 'Right', 'Up', 'Down', 'Tab', 'Shift+Tab', 'Return', 'Space'];
let ringWin = null, ring = null;
function createRing() {
  if (ringWin && !ringWin.isDestroyed()) return ringWin;
  ringWin = new BrowserWindow({
    width: RING_SIZE, height: RING_SIZE, show: false, frame: false, transparent: true, resizable: false, movable: false,
    alwaysOnTop: true, skipTaskbar: true, focusable: false, hasShadow: false, maximizable: false, minimizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  ringWin.setAlwaysOnTop(true, 'screen-saver');
  protectFromCapture(ringWin);
  ringWin.loadFile(path.join(__dirname, 'ring.html'));
  ringWin.on('closed', () => { ringWin = null; ring = null; });
  ringWin.on('hide', () => scheduleFree(ringWin, 60 * 1000));
  ringWin.on('show', () => clearTimeout(ringWin.__freeTimer));
  return ringWin;
}
function openRing({ at = null, viaHotkey = false } = {}) {
  if (ring) { closeRing(); return; } // nochmal drücken = zu
  const win = createRing();
  const c = at || screen.getCursorScreenPoint();
  const area = screen.getDisplayNearestPoint(c).bounds;
  const x = Math.round(Math.min(Math.max(c.x - RING_SIZE / 2, area.x), area.x + area.width - RING_SIZE));
  const y = Math.round(Math.min(Math.max(c.y - RING_SIZE / 2, area.y), area.y + area.height - RING_SIZE));
  win.setBounds({ x, y, width: RING_SIZE, height: RING_SIZE });
  const r = ring = { hover: null, opened: Date.now(), center: { x: x + RING_SIZE / 2, y: y + RING_SIZE / 2 }, lastMove: Date.now(), lastCursor: c };
  const show = () => { if (ring !== r) return; win.webContents.send('ring-open', { page: 0 }); win.showInactive(); };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', show); else show();
  try { globalShortcut.register('Escape', closeRing); } catch {}
  // Tastatur: Pfeiltasten wählen ein Feld, Enter führt es aus (nur solange der Ring offen ist)
  for (const k of RING_KEYS) { try { globalShortcut.register(k, () => { if (ringWin && !ringWin.isDestroyed()) ringWin.webContents.send('ring-key', k); }); } catch {} }
  // Gedrückt halten → Richtung wählen → loslassen (nur Windows, braucht den Tastenstatus)
  let holding = viaHotkey && winkeys.load();
  r.timer = setInterval(() => {
    if (ring !== r) return clearInterval(r.timer);
    const p = screen.getCursorScreenPoint();
    if (p.x !== r.lastCursor.x || p.y !== r.lastCursor.y) { r.lastMove = Date.now(); r.lastCursor = p; }
    if (holding && !winkeys.modifiersDown()) {
      holding = false;
      if (Date.now() - r.opened > 300 && r.hover) win.webContents.send('ring-release');
    }
    // weit weggefahren (nachdem die Maus schon im Netz war) oder lange nichts getan → Netz einrollen
    const dist = Math.hypot(p.x - r.center.x, p.y - r.center.y);
    if (dist < RING_SIZE / 2) r.entered = true;
    if ((r.entered && dist > RING_SIZE * 0.95) || Date.now() - r.lastMove > 12000) closeRing();
  }, 40);
}
function closeRing() {
  if (!ring) return;
  clearInterval(ring.timer);
  ring = null;
  try { globalShortcut.unregister('Escape'); } catch {}
  for (const k of RING_KEYS) { try { globalShortcut.unregister(k); } catch {} }
  if (ringWin && !ringWin.isDestroyed()) ringWin.hide();
}
ipcMain.on('ring-hover', (_e, id) => { if (ring) ring.hover = id; });
ipcMain.on('prewarm', () => { createPopup(); });
ipcMain.on('ui-lang', (e) => { e.returnValue = uiLang(); });
ipcMain.on('rig-talk', (_e, on) => bubbleWin?.webContents.send('rig-talk', !!on));
ipcMain.on('ring-action', (_e, id) => {
  closeRing();
  if (id) runRingAction(id).catch(logError);
});
async function runRingAction(id) {
  logLine(`Ring: ${id}`);
  switch (id) {
    case 'read': return spiderTake({ fromHotkey: true, mode: 'read' });
    case 'translate': case 'simplify': case 'reply': return transformSelection(id);
    case 'region': return regionCapture();
    case 'pin': {
      const before = cocoons.list().length;
      await cocoonFromSelection({ hotkey: true });
      if (cocoons.list().length === before) bubbleWin?.webContents.send('rig-trick', 'shrug');
      return;
    }
    case 'notebook': return showNotebook();
    case 'deadlines': return showPopupPayload({ kind: 'deadlines' });
    case 'file': return pickFileToBubble();
    case 'clip': {
      const text = String((await clipboard.readText()) || '').trim();
      if (!text) return showHome({ hint: 'Die Zwischenablage ist leer – Text hier einfügen:' });
      return showPopup({ title: 'Aus der Zwischenablage', source: 'clipboard', pages: [text] }, { autoStart: true });
    }
    case 'reader': return showMain();
    case 'settings': return showPopupPayload({ kind: 'settings' });
    case 'hide': return bubbleWin?.hide();
    case 'about': return showPopupPayload({ kind: 'about' });
  }
}

function buildTrayMenu() {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: T('Spinne anzeigen'), click: () => bubbleWin.show() },
    { label: T('Markierten Text lesen'), click: () => spiderTake({ mode: 'read' }) },
    { label: T('Datei lesen …'), click: pickFileToBubble },
    { label: T('Brief fotografieren …'), click: () => openCamera() },
    { label: T('Lesemodus öffnen'), click: () => showMain() },
    { label: deadlinesSoon ? T('Fristen ({n} bald)', { n: deadlinesSoon }) : T('Fristen'), click: () => showPopupPayload({ kind: 'deadlines' }) },
    { label: T('Weitere Funktionen'), submenu: classicMenu() },
    { label: T('Einstellungen …'), click: openSettings },
    { type: 'separator' },
    pauseUntil > Date.now()
      ? { label: T('Pause beenden'), click: () => pauseSpider(0) }
      : { label: T('Nicht stören'), submenu: [
        { label: T('1 Stunde'), click: () => pauseSpider(3600e3) },
        { label: T('3 Stunden'), click: () => pauseSpider(3 * 3600e3) },
        { label: T('Bis morgen'), click: () => { const t = new Date(); t.setHours(24, 0, 0, 0); pauseSpider(t - Date.now() + 8 * 3600e3); } },
      ] },
    { label: T('Privatmodus (nichts im Notizbuch speichern)'), type: 'checkbox', checked: !!loadSettings().privateMode,
      click: (item) => { const st = loadSettings(); st.privateMode = item.checked; saveSettings(st); } },
    { type: 'separator' },
    { label: pro.active() ? T('Silkreader Pro ✓') : T('Silkreader Pro …'), click: () => showPopupPayload({ kind: 'pro' }) },
    { label: T('Über Silkreader'), click: () => showPopupPayload({ kind: 'about' }) },
    { label: T('Problem melden'), click: () => showPopupPayload({ kind: 'report' }) },
    ...(STORE ? [] : [{ label: T(`Nach Updates suchen (v${app.getVersion()})`), click: checkUpdatesNow }]),
    { label: T('Protokoll öffnen (für Fehlersuche)'), click: openLog },
    ...(STORE ? [{ label: T('Mit Windows starten …'), click: () => shell.openExternal('ms-settings:startupapps') }] : [{
      label: T('Mit Windows starten'), type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => app.setLoginItemSettings({ openAtLogin: item.checked }),
    }]),
    { type: 'separator' },
    { label: T('Beenden'), click: () => app.quit() },
  ]));
}
const logFile = () => path.join(app.getPath('userData'), 'silkreader-errors.log');
const openLog = () => { if (!fs.existsSync(logFile())) logLine('Protokoll geöffnet'); shell.openPath(logFile()); };

// ---------- Erster Start: Willkommen, KI wählen, Datenschutz ----------
let welcomeWin = null;
function showWelcome() {
  if (welcomeWin && !welcomeWin.isDestroyed()) return welcomeWin.focus();
  welcomeWin = new BrowserWindow({
    width: 560, height: 640, resizable: false, maximizable: false, minimizable: false, title: T('Willkommen'),
    backgroundColor: '#0c0c11', autoHideMenuBar: true, show: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  welcomeWin.loadFile(path.join(__dirname, 'welcome.html'));
  welcomeWin.once('ready-to-show', () => welcomeWin.show());
  welcomeWin.on('closed', () => {
    welcomeWin = null;
    // Ohne „Los geht's“ geschlossen: beim nächsten Start nochmal fragen, Zwischenablage bleibt aus
  });
}
ipcMain.handle('welcome-state', () => {
  const st = loadSettings();
  return {
    provider: st.provider, hasKey: !!getApiKey(), modelReady: builtinModelReady(),
    hatchAnimation: st.hatchAnimation !== false, pinCopied: st.pinCopied === true, copyHint: st.copyHint === true,
  };
});
ipcMain.on('welcome-done', (_e, prefs) => {
  const st = loadSettings();
  st.onboarded = app.getVersion();
  st.lastVersion = app.getVersion();
  for (const k of ['hatchAnimation', 'pinCopied', 'copyHint']) if (typeof prefs?.[k] === 'boolean') st[k] = prefs[k];
  saveSettings(st);
  logLine('Willkommen abgeschlossen');
  welcomeWin?.close();
  bubbleWin?.show();
  bubbleWin?.webContents.send('rig-trick', 'hello');
});
// Datenschutz-Entscheidungen schon vor dem Übungsschritt übernehmen (z. B. „Große Spinne liest mit“)
ipcMain.on('welcome-prefs', (_e, prefs) => {
  const st = loadSettings();
  for (const k of ['hatchAnimation', 'pinCopied', 'copyHint']) if (typeof prefs?.[k] === 'boolean') st[k] = prefs[k];
  saveSettings(st);
});
ipcMain.handle('set-ui-lang', (_e, l) => {
  if (l !== 'de' && l !== 'en') return uiLang();
  const st = loadSettings();
  const before = uiLang();
  st.uiLang = l;
  // Ergebnis-Sprache mitziehen, solange sie noch auf der Voreinstellung der alten Sprache steht
  if (!st.languageSet && st.language === (before === 'en' ? 'Englisch' : 'Deutsch')) st.language = l === 'en' ? 'Englisch' : 'Deutsch';
  saveSettings(st);
  I18N.setLang(l);
  buildTrayMenu();
  // Andere Fenster in der neuen Sprache neu laden (die Sprechblase baut sich selbst neu auf)
  bubbleWin?.webContents.reload();
  if (ringWin && !ringWin.isDestroyed()) ringWin.destroy();
  for (const w of [mainWin, settingsWin]) if (w && !w.isDestroyed()) w.webContents.reload();
  return l;
});

// Datenschutz und Lizenzen in kleinen Fenstern
function openDoc(file, title, size = { width: 680, height: 720 }) {
  const w = new BrowserWindow({ ...size, title, backgroundColor: '#0c0c11', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false } });
  w.loadFile(path.join(__dirname, file));
  return w;
}
ipcMain.handle('open-privacy', () => { openDoc('privacy.html', T('Datenschutz')); });
ipcMain.handle('open-licenses', () => { openDoc('legal/THIRD_PARTY_NOTICES.txt', T('Lizenzen'), { width: 760, height: 760 }); });
ipcMain.handle('open-log', () => openLog());
ipcMain.handle('app-info', () => ({ version: app.getVersion(), platform: `${process.platform} ${require('os').release()}` }));

// Problem melden: GitHub öffnet sich im Browser – nichts wird automatisch verschickt
ipcMain.handle('report-problem', (_e, { text, withLog }) => {
  const st = loadSettings();
  let log = '';
  if (withLog) {
    try { log = fs.readFileSync(logFile(), 'utf8').split('\n').filter(Boolean).slice(-40).join('\n'); } catch {}
  }
  const head = `**Was ist passiert? / What happened?**\n${String(text || '').slice(0, 2000)}\n\n**System**\nSilkreader ${app.getVersion()} · ${process.platform} ${require('os').release()} · ${process.arch} · KI: ${st.provider} · ${uiLang()}`;
  let body = head + (log ? `\n\n**Protokoll / Log**\n\`\`\`\n${log}\n\`\`\`` : '');
  const url = (b) => `https://github.com/Sebbilore/silkreader/issues/new?title=${encodeURIComponent(`Problem: ${String(text || '').split('\n')[0].slice(0, 60)}`)}&body=${encodeURIComponent(b)}`;
  while (url(body).length > 7500 && log) { log = log.split('\n').slice(5).join('\n'); body = head + `\n\n**Protokoll / Log**\n\`\`\`\n${log}\n\`\`\``; }
  shell.openExternal(url(body));
  return true;
});

// „Mit Silkreader lesen“ im Explorer-Rechtsklick: Silkreader wird mit --read <Datei> gestartet
// Chromium sortiert Schalter beim Weiterreichen um – deshalb „--read=<Datei>“ und als Rückfall jede vorhandene Datei nach --read
const fileFromArgs = (argv) => {
  const eq = argv.find((a) => a.startsWith('--read='));
  if (eq) return eq.slice(7).replace(/^"|"$/g, '');
  if (!argv.includes('--read') && !STORE) return null; // Store-App: Windows übergibt bei „Öffnen mit“ nur den Pfad
  // argv[0] ist die App selbst; nur Dateitypen annehmen, die Silkreader lesen kann
  return argv.slice(1).find((a) => !a.startsWith('-') && MENU_EXT.includes(path.extname(a).toLowerCase()) && fs.existsSync(a) && fs.statSync(a).isFile()) || null;
};
async function readFileToBubble(file) {
  logLine('Datei aus dem Explorer');
  bubbleWin?.showInactive();
  try { showPopup(await readFileDoc(file), { autoStart: true }); }
  catch (e) { showPopupPayload(e.code === 'PRO' ? { kind: 'pro', feature: e.feature } : { kind: 'message', title: 'Datei konnte nicht gelesen werden', text: String(e.message || e) }); }
}
const MENU_EXT = ['.pdf', '.docx', '.txt', '.md', '.png', '.jpg', '.jpeg'];
// Eintrag im Explorer-Kontextmenü anlegen (nur installierte App, nur für den eigenen Benutzer)
function registerExplorerMenu() {
  if (process.platform !== 'win32' || !app.isPackaged || STORE) return; // Store-App: Registry ist dort abgeschottet
  const label = T('Mit Silkreader lesen');
  const stamp = `v2|${process.execPath}|${label}`;
  const st = loadSettings();
  if (st.explorerMenu === stamp) return;
  const exe = process.execPath.replace(/\\/g, '\\\\');
  let reg = 'Windows Registry Editor Version 5.00\r\n';
  for (const ext of MENU_EXT) {
    const key = `HKEY_CURRENT_USER\\Software\\Classes\\SystemFileAssociations\\${ext}\\shell\\Silkreader`;
    reg += `\r\n[${key}]\r\n@="${label}"\r\n"Icon"="\\"${exe}\\",0"\r\n\r\n[${key}\\command]\r\n@="\\"${exe}\\" --read=\\"%1\\""\r\n`;
  }
  const file = path.join(app.getPath('temp'), 'silkreader-menu.reg');
  fs.writeFileSync(file, `\ufeff${reg}`, 'utf16le');
  require('child_process').execFile('reg', ['import', file], { windowsHide: true }, (err) => {
    fs.unlink(file, () => {});
    if (err) return logLine(`Explorer-Menü nicht eingetragen: ${err.message}`);
    const s2 = loadSettings(); s2.explorerMenu = stamp; saveSettings(s2);
    logLine('Explorer-Menü „Mit Silkreader lesen“ eingetragen');
  });
}

// ---------- Nicht stören: Vollbild, Präsentation, Spiele, Bildschirmfreigabe ----------
let hiddenForFullscreen = false, pauseUntil = 0, pauseTimer = null;
function watchFullscreen() {
  if (process.platform !== 'win32') return;
  setInterval(() => {
    if (!bubbleWin || bubbleWin.isDestroyed() || loadSettings().hideFullscreen === false) return;
    const busy = winkeys.fullscreenBusy();
    if (busy && bubbleWin.isVisible() && !hiddenForFullscreen) {
      hiddenForFullscreen = true;
      bubbleWin.hide();
      logLine('Vollbild/Präsentation erkannt: Spinne ausgeblendet');
    } else if (!busy && hiddenForFullscreen) {
      hiddenForFullscreen = false;
      if (Date.now() >= pauseUntil && !rigHiddenForMain) bubbleWin.showInactive();
    }
  }, 2000);
}
// In Bildschirmfreigaben (Teams, Zoom …) und Bildschirmfotos unsichtbar – nur man selbst sieht die Spinne
function protectFromCapture(win) {
  if (process.platform === 'win32' && win && !win.isDestroyed()) win.setContentProtection(loadSettings().hideInShare !== false);
}
function pauseSpider(ms) {
  clearTimeout(pauseTimer);
  if (!ms) { pauseUntil = 0; bubbleWin?.showInactive(); buildTrayMenu(); return; }
  pauseUntil = Date.now() + ms;
  bubbleWin?.hide();
  pauseTimer = setTimeout(() => { pauseUntil = 0; if (!hiddenForFullscreen) bubbleWin?.showInactive(); buildTrayMenu(); }, ms);
  buildTrayMenu();
}

// ---------- Was ist neu? (nach einem Update einmal zeigen) ----------
function maybeShowWhatsNew() {
  const st = loadSettings();
  const v = app.getVersion();
  if (st.lastVersion === v) return;
  st.lastVersion = v;
  saveSettings(st);
  const items = WHATS_NEW[v]?.[uiLang()] || WHATS_NEW[v]?.de;
  if (st.onboarded && items) setTimeout(() => showPopupPayload({ kind: 'whatsnew', version: v, items }), 4000);
}

// ---------- Übung in der Ersteinrichtung ----------
// Ist noch keine KI eingerichtet, zeigt die Spinne beim Übungstext ein Beispiel-Ergebnis
function aiReady() {
  const st = loadSettings();
  return st.provider === 'claude' ? !!getApiKey() : st.provider === 'ollama' ? true : builtinModelReady();
}
const PRACTICE_MARK = /Stromrechnung für März|electricity bill for March/;
function practiceResult(text) {
  const en = uiLang() === 'en';
  return {
    title: en ? 'Practice: electricity bill' : 'Übung: Stromrechnung', doc_type: en ? 'Letter' : 'Brief',
    summary: en ? '• The March bill is 84.20 euros.\n• Pay by 15 December 2026.\n• From January the monthly instalment rises to 92 euros.'
      : '• Die Rechnung für März beträgt 84,20 Euro.\n• Zahlen bis zum 15. Dezember 2026.\n• Ab Januar steigt der Abschlag auf 92 Euro im Monat.',
    key_points: [], findings: [],
    figures: [{ label: en ? 'Amount' : 'Betrag', value: '84,20 €', quote: '84,20 Euro', page: 1 }, { label: en ? 'New instalment' : 'Neuer Abschlag', value: '92 €', quote: '92 Euro', page: 1 }],
    note: en ? 'This is a sample result. As soon as an AI is set up, the spider really reads.' : 'Das ist ein Beispiel-Ergebnis. Sobald eine KI eingerichtet ist, liest die Spinne wirklich.',
  };
}

// Datei auswählen und direkt in der Sprechblase lesen
async function pickFileToBubble() {
  const r = await dialog.showOpenDialog({
    title: T('Dokument lesen'),
    properties: ['openFile'],
    filters: [{ name: T('Dokumente'), extensions: DOC_EXT }],
  });
  if (r.canceled || !r.filePaths[0]) return;
  try { showPopup(await readFileDoc(r.filePaths[0]), { autoStart: true }); }
  catch (e) { showPopupPayload({ kind: 'message', title: 'Datei konnte nicht gelesen werden', text: String(e.message || e) }); }
}
async function readFileDoc(filePath) {
  const doc = await readDocument(filePath);
  doc.path = filePath;
  try { doc.mtime = fs.statSync(filePath).mtimeMs; } catch {}
  return doc;
}

// ---------- Bildschirmbereich lesen (Texterkennung) ----------
async function regionCapture() {
  if (!pro.allowed('ocr')) return showPopupPayload({ kind: 'pro', feature: 'ocr' });
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
// Wo stand der zuletzt gelesene markierte Text auf dem Bildschirm? (für „Auf dem Bildschirm zeigen“)
let lastScreenSel = null;
async function spiderTake({ autoStart = false, fromHotkey = false, mode = null } = {}) {
  mode = mode || clickMode();
  // Falls ein früherer Durchgang hängen geblieben ist, nicht für immer blockieren
  if (taking && Date.now() - taking < 20000) return;
  taking = Date.now();
  try {
    preloadBuiltinModel();
    const anchor = selectionAnchor(fromHotkey);
    // Bildschirmfoto der Markierung gleich mit aufnehmen (nur im Speicher), solange sie sichtbar ist
    const wantAnimation = loadSettings().hatchAnimation !== false && bubbleWin?.isVisible();
    const scanned = wantAnimation ? scanSelection(anchor).catch(() => null) : Promise.resolve(null);
    const overlay = wantAnimation ? prepareOverlay(anchor) : null;
    const grabbed = await grabSelection({ hotkey: fromHotkey });
    logLine(`Lesen: Modus ${mode}, Animation ${wantAnimation ? 'an' : 'aus'}, Text ${grabbed.text ? grabbed.text.length : 0} Zeichen, Dateien ${grabbed.files.length}`);
    if (!grabbed.text) overlay?.destroy();
    // Nichts markiert, aber eben ein längerer Text kopiert? Dann den lesen.
    if (!grabbed.text && !grabbed.files.length && copiedOffer && Date.now() < copiedOffer.until) {
      grabbed.text = copiedOffer.text;
      copiedOffer = null;
      bubbleWin?.webContents.send('rig-hint', null);
      if (mode !== 'read') return transformSelection(mode, grabbed);
      return showPopup({ title: 'Kopierter Text', source: 'clipboard', pages: [grabbed.text] }, { autoStart: true });
    }
    // Nichts markiert, aber gerade eine neue Datei heruntergeladen? Dann die lesen.
    if (!grabbed.text && !grabbed.files.length && downloadOffer && Date.now() < downloadOffer.until) {
      const file = downloadOffer.file;
      downloadOffer = null;
      bubbleWin?.webContents.send('rig-hint', null);
      return readFileToBubble(file);
    }
    // Analysiert wird nur markierter Text. Markierte Dateien werden festgehalten.
    if (!grabbed.text && grabbed.files.length) {
      grabbed.files.slice(0, 6).forEach((f) => cocoons.addFile(f));
      bubbleWin?.webContents.send('rig-trick', 'wrap');
      sendCocoons();
      return;
    }
    if (!grabbed.text) {
      showHome(); // nichts markiert → kleine Blase: einfügen, Zwischenablage, Datei, zuletzt Gelesenes
      return;
    }
    const doc = { title: 'Markierter Text', source: 'selection', pages: [grabbed.text] };
    // Übungsbrief aus der Ersteinrichtung, aber noch keine KI: große Spinne liest trotzdem, dann ein Beispiel-Ergebnis
    const practice = PRACTICE_MARK.test(grabbed.text) && !aiReady();

    if (wantAnimation) {
      // Die kleine Spinne erschrickt und versteckt sich, die große kriecht herein
      bubbleWin.webContents.send('rig-trick', 'scared');
      // Wortpositionen: 1. aus dem Bildschirmfoto (klappt überall), 2. von Windows (UI Automation)
      const fromScreen = await scanned;
      const rects = fromScreen?.length ? { words: fromScreen, dip: true } : await selectionRects();
      const dipWords = rects?.dip ? rects.words : toDipRects(rects?.words);
      if (dipWords?.length) {
        lastScreenSel = { text: grabbed.text, words: dipWords, time: Date.now() };
        doc.screenAt = lastScreenSel.time;
      }
      await runCrawlOverlay(anchor, rects, overlay);
      bubbleWin.webContents.send('rig-trick', 'return');
    }
    if (practice) return showPopupPayload({ kind: 'analyze', doc, result: practiceResult(grabbed.text) });
    if (mode !== 'read') return transformSelection(mode, grabbed);
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
// Das Overlay-Fenster schon laden, während der markierte Text geholt wird (spart spürbar Zeit)
function prepareOverlay(near) {
  const b = screen.getDisplayNearestPoint(near || screen.getCursorScreenPoint()).bounds;
  const win = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height, show: false,
    frame: false, transparent: true, resizable: false, movable: false, alwaysOnTop: true,
    skipTaskbar: true, focusable: false, hasShadow: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setIgnoreMouseEvents(true);
  // Unter Windows taucht das Overlay so nicht in Bildschirmfotos auf – wichtig, damit wir die Markierung beim Scrollen wiederfinden
  if (process.platform === 'win32') win.setContentProtection(true);
  win.__loaded = new Promise((r) => win.webContents.once('did-finish-load', r));
  win.loadFile(path.join(__dirname, 'overlay.html'));
  return win;
}

// Bewegt sich die Seite (Scrollen), wandert die Markierung mit – die große Spinne soll auf dem Text bleiben.
// Windows: über UI Automation (genaue Wortpositionen) oder ein neues Bildschirmfoto der Markierungsfarbe.
function trackSelectionMove(rects, near, onShift) {
  if (process.platform !== 'win32') return () => {};
  const base = rects?.dip ? rects.words?.[0] : toDipRects([rects?.words?.[0] || rects?.lines?.[0]].filter(Boolean))[0];
  if (!base) return () => {};
  const viaUia = !rects.dip;
  let stopped = false, busy = false, misses = 0, last = [0, 0];
  const timer = setInterval(async () => {
    if (stopped || busy) return;
    busy = true;
    try {
      let first = null;
      if (viaUia) {
        const r = await selectionRects();
        const w = r?.words?.[0] || r?.lines?.[0];
        if (w) first = toDipRects([w])[0];
      } else {
        first = (await scanSelection(near))?.[0] || null;
      }
      if (stopped) return;
      if (!first) { if (++misses >= 3) stop(); return; } // Markierung weg (z. B. weggescrollt): einfach nicht mehr folgen
      misses = 0;
      const dx = Math.round(first[0] - base[0]), dy = Math.round(first[1] - base[1]);
      if (Math.abs(dx - last[0]) + Math.abs(dy - last[1]) >= 2) { last = [dx, dy]; onShift(dx, dy); }
    } catch { /* nächster Versuch */ } finally { busy = false; }
  }, 280);
  const stop = () => { stopped = true; clearInterval(timer); };
  return stop;
}

function runCrawlOverlay(anchorAbs, rects, prepared = null) {
  return new Promise((resolve) => {
    const words = rects?.dip ? rects.words : toDipRects(rects?.words);
    const lines = rects?.dip ? [] : toDipRects(rects?.lines);
    const first = words[0] || lines[0];
    if (first) anchorAbs = { x: first[0], y: first[1] };
    const b = screen.getDisplayNearestPoint(anchorAbs).bounds;
    const rel = (arr) => arr.map(([x, y, w, h]) => [x - b.x, y - b.y, w, h]);
    const win = prepared && !prepared.isDestroyed() ? prepared : prepareOverlay(anchorAbs);
    const wb = win.getBounds();
    if (wb.x !== b.x || wb.y !== b.y || wb.width !== b.width || wb.height !== b.height) win.setBounds(b);
    let done = false, stopTrack = () => {};
    const finish = () => {
      if (done) return;
      done = true;
      stopTrack();
      ipcMain.removeListener('overlay-done', onDone);
      if (!win.isDestroyed()) win.destroy();
      resolve();
    };
    const onDone = (e) => { if (e.sender === win.webContents) finish(); };
    ipcMain.on('overlay-done', onDone);
    setTimeout(finish, 12000);
    win.__loaded.then(() => {
      if (done || win.isDestroyed()) return;
      win.showInactive();
      win.webContents.send('overlay-start', {
        anchor: { x: anchorAbs.x - b.x, y: anchorAbs.y - b.y },
        width: b.width, height: b.height,
        words: rel(words), lines: rel(lines),
      });
      stopTrack = trackSelectionMove(rects, anchorAbs, (dx, dy) => {
        if (TESTING) global.__shiftCount = (global.__shiftCount || 0) + 1;
        if (!win.isDestroyed()) win.webContents.send('overlay-shift', { dx, dy });
      });
    });
  });
}

// Alte Bezeichnung, wird noch von Menüs benutzt
const analyzeClipboard = () => spiderTake();

// Strg+C auf Dateien/Ordner (z. B. im Explorer) → automatisch auch ins Spinnennetz
// Längerer Text kopiert → die Spinne bietet an, ihn zu lesen (ein Klick genügt)
let copiedOffer = null;
function watchCopiedFiles() {
  let lastSeq = null, checking = false;
  setInterval(async () => {
    const st = loadSettings();
    if (checking || (st.pinCopied === false && st.copyHint === false)) return;
    checking = true;
    try {
      const seq = await clipboardSeq();
      if (seq === null) return;
      if (lastSeq !== null && seq !== lastSeq && !ownClipboardActive()) {
        const files = st.pinCopied === false ? [] : await readClipboardFiles();
        if (files.length) {
          files.slice(0, 6).forEach((f) => cocoons.addFile(f));
          bubbleWin?.webContents.send('rig-trick', 'wrap');
          sendCocoons();
        } else if (st.copyHint !== false && bubbleWin?.isVisible()) {
          const text = String((await clipboard.readText()) || '').trim();
          if (text.length >= 280) {
            copiedOffer = { text, until: Date.now() + 9000 };
            bubbleWin.webContents.send('rig-hint', 'Kopiert – Klick zum Lesen');
          }
        }
      }
      lastSeq = seq;
    } finally { checking = false; }
  }, 900);
}

// ---------- Brief mit der Webcam fotografieren (Texterkennung = Pro) ----------
let cameraWin = null;
function openCamera() {
  if (!pro.allowed('ocr')) return showPopupPayload({ kind: 'pro', feature: 'ocr' });
  if (cameraWin && !cameraWin.isDestroyed()) { cameraWin.focus(); return; }
  cameraWin = new BrowserWindow({
    width: 900, height: 680, title: T('Brief fotografieren'), backgroundColor: '#0c0c11', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), spellcheck: false },
  });
  cameraWin.loadFile(path.join(__dirname, 'camera.html'));
  cameraWin.on('closed', () => { cameraWin = null; });
}
ipcMain.on('camera-done', async (e, dataUrl) => {
  if (!cameraWin || e.sender !== cameraWin.webContents) return;
  cameraWin.close();
  if (!dataUrl || !String(dataUrl).startsWith('data:image/png;base64,')) return;
  const file = path.join(app.getPath('temp'), `silkreader-foto-${Date.now()}.png`);
  fs.writeFileSync(file, Buffer.from(dataUrl.split(',')[1], 'base64'));
  try { await readFileToBubble(file); } finally { setTimeout(() => fs.unlink(file, () => {}), 60000); }
});
ipcMain.handle('open-camera', () => openCamera());

// ---------- Ordner-Wächter: neue Datei im Download-Ordner → „Klick zum Lesen“ ----------
// Nur wenn eingeschaltet. Wartet, bis die Datei fertig geladen ist (Größe bleibt gleich), und ignoriert halbe Downloads.
let downloadOffer = null;
const WATCH_EXT = ['.pdf', '.docx', '.png', '.jpg', '.jpeg'];
function watchDownloads() {
  let watcher = null, dir = null;
  const seen = new Map();
  const offer = async (file) => {
    try {
      const a = fs.statSync(file); await new Promise((r) => setTimeout(r, 1500));
      const b = fs.statSync(file);
      if (!b.isFile() || a.size !== b.size || b.size < 200 || Date.now() - b.mtimeMs > 60000) return;
      downloadOffer = { file, until: Date.now() + 15000 };
      logLine('Neue Datei im Download-Ordner – angeboten');
      if (bubbleWin?.isVisible()) bubbleWin.webContents.send('rig-hint', T('Neue Datei – Klick zum Lesen'));
    } catch { /* schon wieder weg */ }
  };
  const start = () => {
    const want = loadSettings().watchDownloads === true;
    if (!want) { watcher?.close(); watcher = null; return; }
    if (watcher) return;
    try {
      dir = app.getPath('downloads');
      watcher = fs.watch(dir, (_ev, name) => {
        if (!name || !WATCH_EXT.includes(path.extname(name).toLowerCase()) || /\.(crdownload|part|tmp)$/i.test(name)) return;
        const file = path.join(dir, name);
        if (Date.now() - (seen.get(file) || 0) < 10000) return;
        seen.set(file, Date.now());
        setTimeout(() => offer(file), 800);
      });
      watcher.on('error', () => { watcher = null; });
    } catch (e) { logLine(`Download-Ordner nicht beobachtbar: ${e.message}`); }
  };
  start();
  setInterval(start, 5000); // Einstellung an/aus ohne Neustart
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
    { label: T('Kopieren'), click: async () => { if (await copyCocoon(id)) bubbleWin?.webContents.send('cocoon-copied', id); } },
    ...(it.type === 'file' && isFolder(it.path) ? [{ label: T('Öffnen'), click: () => shell.openPath(it.path) }] : [
      { label: T('Lesen'), click: () => readCocoon(id) },
      { label: T('Im Lesemodus öffnen'), click: async () => showDocument(await cocoonDoc(it)) },
    ]),
    ...(it.type === 'file' ? [{ label: T('Im Ordner zeigen'), click: () => shell.showItemInFolder(it.path) }] : []),
    ...(cocoons.list().length > 1 && !(it.type === 'file' && isFolder(it.path)) ? [{ label: T('Vergleichen mit …'), submenu: cocoons.list()
      .filter((o) => o.id !== id && !(o.type === 'file' && isFolder(o.path)))
      .map((o) => ({ label: o.name, click: () => compareCocoons(id, o.id) })) }] : []),
    { type: 'separator' },
    { label: T('Aus dem Netz nehmen'), click: () => { cocoons.remove(id); sendCocoons(); } },
  ];
}

async function cocoonDoc(it) {
  return it.type === 'text' ? { title: it.name, source: 'cocoon', pages: [it.text] } : readFileDoc(it.path);
}
// Dokument im Netz anklicken: in der Sprechblase lesen (schon gelesen und unverändert → sofort aus dem Notizbuch)
async function readCocoon(id) {
  const it = cocoons.get(id);
  if (!it) return;
  if (it.type === 'file' && isFolder(it.path)) { shell.openPath(it.path); return; }
  try {
    const doc = await cocoonDoc(it);
    const known = doc.path && loadHistory().find((h) => h.path === doc.path && h.mtime === doc.mtime);
    if (known) showPopupPayload({ kind: 'analyze', doc, result: known.result });
    else showPopup(doc, { autoStart: true });
  } catch (e) {
    showPopupPayload({ kind: 'message', title: 'Datei konnte nicht gelesen werden', text: String(e.message || e) });
  }
}
ipcMain.handle('cocoon-read', (_e, id) => readCocoon(id));
async function compareCocoons(idA, idB) {
  try {
    const [a, b] = await Promise.all([cocoonDoc(cocoons.get(idA)), cocoonDoc(cocoons.get(idB))]);
    preloadBuiltinModel();
    showPopupPayload({ kind: 'compare', title: `${a.title} ↔ ${b.title}`, a, b });
  } catch (e) {
    dialog.showErrorBox(T('Vergleich nicht möglich'), String(e.message || e));
  }
}

function cocoonsMenuTemplate() {
  const items = cocoons.list();
  if (!items.length) return [{ label: T('Noch leer – Datei oder Text auf die Spinne ziehen'), enabled: false }];
  return [
    ...items.map((it) => ({ label: T(`${it.type === 'file' ? '📄' : '📝'} ${it.name}${it.missing ? ' (fehlt)' : ''}`), submenu: cocoonMenu(it.id) })),
    { type: 'separator' },
    { label: T('Alle Kokons entfernen'), click: () => { cocoons.clear(); sendCocoons(); } },
  ];
}

async function pickFile() {
  const r = await dialog.showOpenDialog({
    title: T('Dokument analysieren'),
    properties: ['openFile'],
    filters: [{ name: T('Dokumente'), extensions: DOC_EXT }],
  });
  if (!r.canceled && r.filePaths[0]) await openFile(r.filePaths[0]);
}

async function openFile(filePath, opts) {
  try {
    showDocument(await readDocument(filePath), opts);
  } catch (e) {
    dialog.showErrorBox(T('Datei konnte nicht gelesen werden'), String(e.message || e));
  }
}

// ---------- Dateien lesen ----------

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.bmp', '.gif', '.tif', '.tiff'];
const DOC_EXT = ['pdf', 'docx', 'txt', 'md', 'csv', 'json', 'html', 'log', 'png', 'jpg', 'jpeg', 'bmp', 'gif', 'tif', 'tiff'];
async function readDocument(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const title = path.basename(filePath);
  const buf = fs.readFileSync(filePath);

  if (ext === '.pdf') {
    const { extractText, getDocumentProxy } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: false });
    const pages = text.map((t) => t.trim());
    if (!pages.some(Boolean)) {
      // Gescannte PDF (nur Bilder): mit der Windows-Texterkennung lesen
      if (!pro.allowed('ocr')) throw Object.assign(new Error(T('{f} gibt es mit Silkreader Pro.', { f: T(pro.FEATURES.ocr) })), { code: 'PRO', feature: 'ocr' });
      const scanned = await recognizePdf(filePath);
      if (scanned.some(Boolean)) return { title, source: 'pdf', pages: scanned, ocr: true };
      throw new Error('Diese PDF enthält keinen auslesbaren Text (evtl. ein Scan).');
    }
    return { title, source: 'pdf', pages };
  }
  if (IMAGE_EXT.includes(ext)) {
    // Foto oder Bildschirmfoto eines Dokuments
    if (!pro.allowed('ocr')) throw Object.assign(new Error(T('{f} gibt es mit Silkreader Pro.', { f: T(pro.FEATURES.ocr) })), { code: 'PRO', feature: 'ocr' });
    const text = await recognizeText(filePath);
    if (!text.trim()) throw new Error('Auf diesem Bild wurde kein Text erkannt.');
    return { title, source: 'image', pages: [text.trim()], ocr: true };
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

const modelDir = () => (TESTING && process.env.SILK_MODEL_DIR) || path.join(app.getPath('userData'), 'models');
const modelPathFor = (key) => process.env.SILK_MODEL_PATH || path.join(modelDir(), BUILTIN_MODELS[key].file);
const modelReady = (key) => fs.existsSync(modelPathFor(key));
// Ohne Auswahl: das gründliche Modell, falls es schon da ist, sonst das schnelle.
const builtinKey = (s = loadSettings()) => {
  const want = BUILTIN_MODELS[s.builtinModel] ? s.builtinModel : modelReady('quality') ? 'quality' : 'fast';
  return want === 'quality' && !pro.allowed('quality') && modelReady('fast') ? 'fast' : want; // gründliches Modell gehört zu Pro
};
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
    logLine(`KI-Modell ${key} geladen (Grafikkarte: ${llama.gpu || 'keine, Prozessor'})`);
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
// Eingebautes (kleines) Modell: Stichpunkte als Liste mit 3–5 Einträgen erzwingen (sonst kommt manchmal nur einer),
// und enthält der Text Zahlen, auch Angaben (es lässt sie sonst gern weg)
const BULLETS = { type: 'array', items: str(140), minItems: 3, maxItems: 5 };
const BUILTIN_FINAL_SCHEMA = { ...FINAL_SCHEMA, properties: { ...FINAL_SCHEMA.properties, summary: BULLETS } };
const SHORT_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['title', 'doc_type', 'summary', 'key_points', 'figures', 'findings'],
  properties: { ...FINAL_SCHEMA.properties, figures: { type: 'array', items: FIGURE_SCHEMA, maxItems: 8 } },
};
const BUILTIN_SHORT_SCHEMA = { ...SHORT_SCHEMA, properties: { ...SHORT_SCHEMA.properties, summary: BULLETS } };
const SHORT_SCHEMA_NUMBERS = { ...BUILTIN_SHORT_SCHEMA, properties: { ...BUILTIN_SHORT_SCHEMA.properties, figures: { type: 'array', items: FIGURE_SCHEMA, minItems: 2, maxItems: 8 } } };

// Ereignis-Sätze (Rücktritt, Kündigung, Frist, Ablauf … mit Datum oder Jahr) aus dem Originaltext, die im Ergebnis
// fehlen, als Kernaussage ergänzen – kleine Modelle überlesen solche Einzelsätze gern, sie sind aber oft das Wichtigste.
const EVENT_WORDS = /(rücktritt|tritt\s.*zurück|zurücktreten|kündig|frist|endet|läuft\s.*aus|ausläuft|befristet|insolvenz|verschoben|gestrichen|eingestellt|übernahme|fusion|schließ|entlass|klage|strafe|mahnung|zahlbar|fällig|resign|terminat|deadline|expire|due\b|insolven|lawsuit)/i;
function addEventSentences(result, text) {
  const words = (t) => new Set(String(t).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []);
  const covered = words([result.summary, ...(result.key_points || []), ...(result.findings || []).map((f) => `${f.title} ${f.detail}`)].join(' '));
  // Sätze trennen – aber nicht nach Ordnungszahlen wie „am 31. Dezember“ oder Abkürzungen wie „Mio.“
  const pieces = String(text).replace(/\s+/g, ' ').split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ])/);
  const sentences = [];
  for (const p of pieces) {
    const prev = sentences[sentences.length - 1];
    if (prev && /(\b\d{1,2}\.|\b(Mio|Mrd|ca|bzw|Nr|Abs|Dr|Hr|Fr|z\.\s?B|d\.\s?h)\.)$/i.test(prev)) sentences[sentences.length - 1] = `${prev} ${p}`;
    else sentences.push(p);
  }
  const hits = [];
  for (const raw of sentences) {
    const sent = raw.trim();
    if (sent.length < 25 || sent.length > 260 || !EVENT_WORDS.test(sent) || !/\b(19|20)\d{2}\b|\d{1,2}\.\s?\d{1,2}\.|\b\d{1,2}\.\s?(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)/i.test(sent)) continue;
    const w = words(sent);
    let known = 0;
    for (const x of w) if (covered.has(x)) known++;
    if (w.size && known / w.size < 0.5 && !hits.some((h) => h === sent)) hits.push(sent);
  }
  if (!hits.length) return result;
  const extra = hits.slice(-2);
  return { ...result, key_points: [...(result.key_points || []).slice(0, 9 - extra.length), ...extra] };
}

// Aussagen, die nur in EINEM Abschnitt stehen (z. B. ein Rücktritt am Ende), gehen in der Gesamtzusammenfassung
// eines kleinen Modells leicht verloren. Fehlen sie dort, werden sie als Kernaussage ergänzt.
function addExclusivePoints(final, chunkPoints) {
  const words = (t) => new Set(String(t).toLowerCase().match(/[\p{L}\p{N}]{4,}/gu) || []);
  const overlap = (a, b) => { const A = words(a), B = words(b); if (!A.size) return 1; let n = 0; for (const w of A) if (B.has(w)) n++; return n / A.size; };
  const covered = [...(Array.isArray(final.summary) ? final.summary : [final.summary]), ...(final.key_points || [])].join(' ');
  const keyPoints = [...(final.key_points || [])];
  const extra = [];
  chunkPoints.forEach((pts, i) => {
    for (const p of pts || []) {
      const elsewhere = chunkPoints.some((other, j) => j !== i && (other || []).some((q) => overlap(p, q) > 0.5));
      if (!elsewhere && overlap(p, covered) < 0.5) extra.push({ p, i });
    }
  });
  // Spätere Abschnitte zuerst (dort steht Wichtiges oft zuletzt), höchstens 3 Ergänzungen
  extra.sort((a, b) => b.i - a.i).slice(0, 3).forEach(({ p }) => keyPoints.push(p));
  return keyPoints.slice(0, 9);
}

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
        onTextChunk: typeof stream === 'function' ? stream : stream ? (c) => onProgress(c) : undefined,
      });
      return grammar.parse(text);
    };

    // Kurzes Dokument: ein Durchgang. Die Stichpunkte stehen im JSON vorn – sobald sie fertig sind,
    // erscheinen sie als Kurzfassung, während die KI die Details weiterschreibt.
    if (chunks.length <= 1) {
      const docText = chunks[0]?.text || '';
      onProgress({ stage: 'Analysiere …', step: 1, steps: 1 });
      let streamed = '', quickSent = false;
      const r = await ask([
        `Analysiere das folgende Dokument („${doc.title}“).`,
        'Liefere Titel, Art, als "summary" das Wichtigste in 3 bis 5 kurzen Stichpunkten, bis zu 6 weitere Kernaussagen, bis zu 8 wichtige Angaben (Zahlen, Beträge, Fristen, Namen; "value" genau so wie im Text, z. B. „412 Millionen Euro“; "quote" = wörtliche Stelle aus dem Text) und bis zu 5 echte Erkenntnisse (Risiken, Chancen, nötige Handlungen; rechne Kennzahlen aus, wo sinnvoll).',
        'Ist es ein Brief, eine Rechnung oder ein Bescheid: Was muss der Empfänger tun? Das gehört als Erkenntnis der Art „Handlung“ dazu (als konkreter Satz).',
        '', '<document>', docText, '</document>',
      ].join('\n'), /\d[\d.,]*\s?(%|€|Euro|Mio|Mrd|Prozent|Tage|\d{4})/.test(docText) ? SHORT_SCHEMA_NUMBERS : BUILTIN_SHORT_SCHEMA, 2200, (c) => {
        onProgress(c);
        if (quickSent) return;
        streamed += c;
        const m = streamed.match(/"summary"\s*:\s*(\[(?:[^\]"]|"(?:[^"\\]|\\.)*")*\])/);
        if (!m) return;
        quickSent = true;
        try { onProgress({ quick: normalizeResult({ title: partialField(streamed, 'title'), summary: JSON.parse(m[1]) }) }); } catch {}
        onProgress({ stage: 'Sucht Zahlen, Fristen und Details …', step: 1, steps: 1 });
      });
      return addEventSentences(normalizeResult(r), doc.pages.join('\n'));
    }

    // Langes Dokument: jeden Abschnitt lesen und Notizen machen …
    const notes = [];
    const figures = [];
    const chunkPoints = []; // Aussagen je Abschnitt (für den Abgleich am Schluss)
    for (let i = 0; i < chunks.length; i++) {
      const c = chunks[i];
      onProgress({ stage: `Liest Abschnitt ${i + 1} von ${chunks.length} …`, step: i + 1, steps: chunks.length + 1 });
      const n = await ask([
        `Abschnitt ${i + 1} von ${chunks.length} des Dokuments „${doc.title}“ (Seite ${c.firstPage}${c.lastPage !== c.firstPage ? `–${c.lastPage}` : ''}).`,
        'Notiere die bis zu 5 wichtigsten Aussagen als kurze Sätze und bis zu 5 wichtige Angaben (Zahlen, Beträge, Fristen, Namen) mit wörtlicher Fundstelle ("quote").',
        'Übersieh keine Ereignisse oder Entscheidungen (z. B. Rücktritte, Kündigungen, Fristen, Änderungen) – auch nicht, wenn sie nur in einem Satz am Ende stehen.',
        '', '<abschnitt>', c.text, '</abschnitt>',
      ].join('\n'), NOTES_SCHEMA, 700, false);
      chunkPoints.push(n.points);
      onProgress({ notes: n.points }); // Zwischenstand schon zeigen, während die Spinne weiterliest
      if (TESTING) global.__lastNotes = chunkPoints.map((p, k) => `A${k + 1}: ${p.join(' | ')}`).join(' || ');
      notes.push(`Abschnitt ${i + 1} (S. ${c.firstPage}${c.lastPage !== c.firstPage ? `–${c.lastPage}` : ''}):\n- ${n.points.join('\n- ')}`
        + (n.figures.length ? `\n  Angaben: ${n.figures.map((f) => `${f.label}: ${f.value}`).join('; ')}` : ''));
      for (const f of n.figures) figures.push({ ...f, chunk: i, page: Math.min(c.lastPage, Math.max(c.firstPage, f.page || c.firstPage)) });
    }

    // … dann aus allen Notizen die Gesamtanalyse schreiben
    onProgress({ stage: 'Schreibt die Zusammenfassung …', step: chunks.length + 1, steps: chunks.length + 1 });
    const final = await ask([
      `Hier sind Notizen zu allen ${chunks.length} Abschnitten des Dokuments „${doc.title}“.`,
      'Erstelle daraus Titel, Art des Dokuments, als "summary" das Wichtigste aus dem GANZEN Dokument in 3 bis 5 kurzen Stichpunkten, bis zu 6 Kernaussagen und bis zu 5 echte Erkenntnisse (Risiken, Chancen, Widersprüche, nötige Handlungen; rechne Kennzahlen aus, wo sinnvoll).',
      'Wichtig: Berücksichtige alle Abschnitte gleich, auch den letzten. Aussagen, die nur in EINEM Abschnitt vorkommen (z. B. Rücktritte, Fristen, Kündigungen, Ausnahmen – oft am Ende), sind meist besonders wichtig und gehören in die Stichpunkte oder Kernaussagen. Wiederholungen nur einmal nennen.',
      '', '<notizen>', notes.join('\n\n'), '</notizen>',
    ].join('\n'), BUILTIN_FINAL_SCHEMA, 1300, true);

    // Angaben aus allen Abschnitten übernehmen (doppelte entfernen)
    const seen = new Set();
    const unique = figures.filter((f) => {
      const k = `${f.label}|${f.value}`.toLowerCase();
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    // Abwechselnd aus allen Abschnitten nehmen, damit auch Angaben vom Ende des Dokuments dabei sind
    const byChunk = chunks.map((_, i) => unique.filter((f) => f.chunk === i));
    const uniqueFigures = [];
    for (let round = 0; uniqueFigures.length < 20 && byChunk.some((l) => l.length > round); round++) {
      for (const l of byChunk) if (l[round] && uniqueFigures.length < 20) uniqueFigures.push(l[round]);
    }
    uniqueFigures.sort((a, b) => a.chunk - b.chunk || 0).forEach((f) => delete f.chunk);
    return addEventSentences(normalizeResult({ ...final, key_points: addExclusivePoints(final, chunkPoints), figures: uniqueFigures }), doc.pages.join('\n'));
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
// Kernaussagen ohne Wiederholungen und ohne Platzhalter wie „quote“
function uniqueTexts(list) {
  const kept = [];
  const words = (t) => new Set(t.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
  return list.map((t) => String(t || '').trim()).filter((t) => {
    const k = t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    if (k.length < 12 || /^(quote|label|value|text)$/.test(k)) return false;
    // fast gleiche Aussagen (kleine Modelle wiederholen sich gern mit anderen Worten) nur einmal
    const w = words(t);
    const similar = kept.some((o) => { let n = 0; for (const x of w) if (o.has(x)) n++; return n / Math.max(1, Math.min(w.size, o.size)) > 0.75; });
    if (similar) return false;
    kept.push(w);
    return true;
  });
}
function normalizeResult(r) {
  return {
    title: r.title || 'Analyse',
    doc_type: r.doc_type || 'Text',
    summary: Array.isArray(r.summary) ? r.summary.map((x) => `• ${x}`).join('\n') : r.summary || '',
    key_points: uniqueTexts(Array.isArray(r.key_points) ? r.key_points : []),
    figures: (Array.isArray(r.figures) ? r.figures : []).map((f) => ({
      label: String(f.label ?? ''), value: String(f.value ?? ''), quote: String(f.quote ?? ''), page: Number(f.page) || 1,
    })),
    findings: (Array.isArray(r.findings) ? r.findings : []).map((f) => ({
      kind: f.kind || 'Beobachtung', title: f.title || '', detail: f.detail || '', pages: Array.isArray(f.pages) ? f.pages : [],
    })).filter((f) => f.title.trim().length > 12 && f.title.trim() !== f.kind), // kleine Modelle schreiben manchmal nur „Handlung“
  };
}

// Liest ein (evtl. noch unvollständiges) Textfeld aus halb fertigem JSON.
function partialField(json, name) {
  const unq = (v) => { try { return JSON.parse(`"${v.replace(/\\+$/, (b) => (b.length % 2 ? b.slice(1) : b))}"`); } catch { return v; } };
  // Liste von Stichpunkten (eingebautes Modell): fertige und angefangene Einträge zeigen
  const arr = json.match(new RegExp(`"${name}"\\s*:\\s*\\[([\\s\\S]*)`));
  if (arr) {
    const body = arr[1].split(/\]\s*[,}]/)[0];
    const items = [...body.matchAll(/"((?:[^"\\]|\\.)*)"?/g)].map((x) => unq(x[1])).filter(Boolean);
    return items.length ? items.map((x) => `• ${x}`).join('\n') : null;
  }
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
async function llmGenerate({ instruction, material = '', schema = null, maxTokens = 1200, onChunk = () => {}, budget = null, langHint = true, modelKey = null }) {
  const s = loadSettings();
  if (process.env.SPIDER_MOCK) return mockGenerate(instruction, schema, onChunk);
  // Nicht beim Übersetzen/Antworten: dort legt die Aufgabe die Sprache fest (sonst widerspricht sich die Anweisung)
  const lang = langHint ? `Antworte auf ${s.language}, in einfacher, klarer Sprache.` : 'Antworte klar und natürlich.';

  if (s.provider === 'builtin') {
    const key = modelKey && modelReady(modelKey) ? modelKey : builtinKey(s);
    if (!modelReady(key)) throw Object.assign(new Error('Das eingebaute KI-Modell ist noch nicht heruntergeladen (Einstellungen → Herunterladen).'), { code: 'NO_MODEL' });
    const { LlamaChatSession } = await import('node-llama-cpp');
    lastModelUse = Date.now();
    const { llama, model } = await loadBuiltinModel(key);
    const limit = budget || Math.round((BUILTIN_MODELS[key].genTokens || BUILTIN_MODELS[key].chunkTokens) * 1.4);
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
  reply: { title: 'Antwort-Entwurf', instruction: 'Der folgende Text ist eine E-Mail, Nachricht oder ein Brief. Schreibe einen kurzen, freundlichen Antwortentwurf in derselben Sprache und im passenden Ton (Du oder Sie wie im Text). Bei einem Brief (z. B. von einer Firma oder Behörde): mit Anrede und Grußformel, nenne den Bezug (Aktenzeichen, Kunden- oder Rechnungsnummer, Datum des Schreibens) und setze fehlende persönliche Angaben als [Platzhalter]. Gib nur den Entwurf aus, ohne Betreffzeile.' },
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

ipcMain.handle('transform', async (event, mode, text, extra = '') => {
  if (mode.startsWith('explain:')) { const s = loadSettings(); s.explainLang = mode.slice(8); saveSettings(s); }
  if (!pro.allowed(mode.split(':')[0])) return { ok: false, error: T('{f} gibt es mit Silkreader Pro.', { f: T(pro.FEATURES[mode]) }), pro: mode };
  try {
    bubbleWin?.webContents.send('rig-task', mode.startsWith('explain:') ? 'translate' : mode);
    setBusy(true);
    let out = '';
    const { value, truncated, fastModel } = await runTransform(mode, text, extra, (c) => { out += c; event.sender.send('transform-progress', out); });
    countSuccess();
    return { ok: true, text: value, truncated, fastModel: !!fastModel };
  } catch (e) { return friendlyErr(e); } finally { setBusy(false); }
});

// Übersetzen / einfache Sprache / Antwort-Entwurf
// „In deiner Sprache“: Briefe für Menschen erklären, die kaum Deutsch können
const EXPLAIN_LANGS = {
  tr: ['Türkçe', 'Turkish', /[ğışİ]/], ar: ['العربية', 'Arabic', /[\u0600-\u06FF]{3}/],
  uk: ['Українська', 'Ukrainian', /[іїєґ]/i, /[ыэъё]/i], ru: ['Русский', 'Russian', /[ыэъ]/i, /[іїєґ]/i],
  pl: ['Polski', 'Polish', /[ąęłńśźż]/i], ro: ['Română', 'Romanian', /[ăâîșțşţ]/i],
  en: ['English', 'English', /\b(the|and|you|is|to)\b/i],
};
// Andere Sprachen kann das gründliche Modell deutlich besser – ist es geladen (und genug Arbeitsspeicher da), nimmt die Erklärung es
const explainModel = () => (modelReady('quality') && pro.allowed('quality') && ramGB() >= BUILTIN_MODELS.quality.minRamGB ? 'quality' : null);
function runExplain(code, text, extra = '', onChunk = () => {}) {
  const [, lang, looksRight, looksWrong] = EXPLAIN_LANGS[code] || EXPLAIN_LANGS.en;
  const instr = `Explain the following text (for example a letter from an authority, a company or a doctor) to someone who barely understands German. Write ONLY in ${lang}, in short and simple sentences. Say what it is about, what the recipient has to do, by when, and how much it costs (if stated). Keep numbers, amounts, dates, names, reference numbers and IBAN exactly as in the text. Do not invent names, places or facts that are not in the text, and do not address the reader by name. Output only the explanation.`;
  const modelKey = explainModel();
  const count = (re, t) => (t.match(new RegExp(re.source, 'gi')) || []).length;
  const right = (t) => looksRight.test(t) && (!looksWrong || count(looksRight, t) >= count(looksWrong, t));
  const run = (i) => llmGenerate({ instruction: i + (extra ? ` ${extra}` : ''), material: text, maxTokens: 1500, langHint: false, onChunk, modelKey });
  return run(instr).then(async (r) => {
    // Kleine Modelle rutschen manchmal ins Deutsche (oder ins Russische statt Ukrainische) – dann einmal deutlicher nachfassen
    const out = { ...r, fastModel: loadSettings().provider === 'builtin' && !modelKey };
    if (right(String(r.value || ''))) return out;
    const again = await run(`${instr} IMPORTANT: The answer must be written in ${lang}${looksWrong ? ` (not Russian, not German)` : ', not in German'}.`);
    return right(String(again.value || '')) ? { ...out, ...again } : out;
  });
}
function runTransform(mode, text, extra = '', onChunk = () => {}) {
  if (mode.startsWith('explain:')) return runExplain(mode.slice(8), text, extra, onChunk);
  const st = loadSettings();
  const target = !st.language || st.language === 'der Sprache des Dokuments' ? (uiLang() === 'en' ? 'Englisch' : 'Deutsch') : st.language;
  const other = target === 'Deutsch' ? 'Englische' : 'Deutsche';
  // Kleine Modelle kommen mit „falls schon Deutsch, dann …“ durcheinander – deshalb die Richtung selbst festlegen
  const into = mode === 'translate' ? (looksLike(text) === (target === 'Deutsch' ? 'de' : target === 'Englisch' ? 'en' : '') ? other : `${target}e`) : null;
  const instruction = mode === 'translate'
    ? `Übersetze den folgenden Text ins ${into}. Gib nur die Übersetzung aus – ohne Überschrift, ohne Erklärung, ohne den Originaltext.`
    : TRANSFORMS[mode].instruction;
  const run = (instr) => llmGenerate({ instruction: instr + (extra ? ` ${extra}` : ''), material: text, maxTokens: 1500, langHint: mode === 'simplify', onChunk });
  if (mode !== 'translate') return run(instruction);
  return run(instruction).then(async (r) => {
    let value = cleanTranslation(String(r.value || ''));
    // Kleine Modelle geben manchmal einfach den Originaltext zurück – dann einmal mit englischer Anweisung nachfassen
    const src = looksLike(text);
    if (src && looksLike(value) === src) {
      const lang = { Englische: 'English', Deutsche: 'German', Französische: 'French', Spanische: 'Spanish', Italienische: 'Italian' }[into] || into;
      const again = await run(`Translate the following text into ${lang}. Output only the ${lang} translation – no heading, no explanation, no original text.`);
      value = cleanTranslation(String(again.value || '')) || value;
      return { ...again, value };
    }
    return { ...r, value };
  });
}
// Grobe Spracherkennung (Deutsch/Englisch) über häufige Wörter
function looksLike(text) {
  const t = ` ${String(text).toLowerCase()} `;
  const count = (ws) => ws.reduce((n, w) => n + (t.split(` ${w} `).length - 1), 0);
  const de = count(['der', 'die', 'das', 'und', 'ist', 'nicht', 'mit', 'auf', 'für', 'ein', 'eine', 'den', 'von', 'zu', 'im', 'sich', 'auch']) + (/[äöüß]/.test(t) ? 2 : 0);
  const en = count(['the', 'and', 'is', 'not', 'with', 'on', 'for', 'a', 'an', 'of', 'to', 'in', 'by', 'it', 'that', 'this', 'are']);
  return de > en ? 'de' : en > de ? 'en' : '';
}
// Vorspann wie „Englische Übersetzung:“ oder „Translation:“ entfernen
function cleanTranslation(t) {
  return t.replace(/^\s*[^\n]{0,40}(übersetzung|translation|übersetzt|translated)[^\n]{0,30}:\s*\n?/i, '').trim();
}

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

// ---------- Silkreader Pro: Status, Code einlösen, kaufen ----------
const refreshPro = () => pro.refresh(loadSettings(), { psEnv: require('./psenv').psEnv, log: logLine }).then((st) => {
  const s = loadSettings();
  if (STORE && !!s.proStoreCache !== (st.source === 'store')) { s.proStoreCache = st.source === 'store'; saveSettings(s); } // falls Windows später mal nicht antwortet
  buildTrayMenu();
  return st;
});
ipcMain.handle('pro-state', () => pro.status());
ipcMain.handle('pro-redeem', async (_e, code) => {
  const c = pro.checkCode(code);
  if (!c.ok) return { ok: false, error: T(c.error) };
  const s = loadSettings(); s.proCode = String(code).trim(); saveSettings(s);
  logLine(`Pro-Code eingelöst (Nr. ${c.id})`);
  return { ok: true, status: await refreshPro() };
});
ipcMain.handle('pro-buy', () => { const link = pro.storeLink(); if (link) shell.openExternal(link); return !!link; });
ipcMain.handle('pro-refresh', () => refreshPro());
ipcMain.handle('pro-show', (_e, feature) => showPopupPayload({ kind: 'pro', feature: feature || null }));

// ---------- Ergebnis als PDF speichern oder drucken (hell, gut lesbar, für Papier) ----------
function resultHtml(doc, r) {
  const e = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const bullets = String(r.summary || '').split(/\n+|\s*•\s*/).map((t) => t.trim()).filter(Boolean);
  const day = (iso) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(uiLang() === 'en' ? 'en-GB' : 'de-DE') : '');
  const rows = (list) => `<table>${list.filter(([, v]) => v).map(([k, v]) => `<tr><th>${e(k)}</th><td>${e(v)}</td></tr>`).join('')}</table>`;
  const L = r.letter, C = r.contract;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    body { font: 12.5pt/1.5 "Segoe UI", Arial, sans-serif; color: #1a1a1a; margin: 0; }
    h1 { font-size: 19pt; margin: 0 0 2pt; } .sub { color: #666; font-size: 10pt; margin-bottom: 14pt; }
    h2 { font-size: 12pt; margin: 16pt 0 6pt; color: #c2185b; text-transform: uppercase; letter-spacing: .5pt; }
    ul { margin: 0; padding-left: 16pt; } li { margin: 3pt 0; } table { border-collapse: collapse; } th { text-align: left; color: #666; font-weight: 500; padding: 2pt 14pt 2pt 0; vertical-align: top; } td { padding: 2pt 0; font-weight: 600; }
    .foot { margin-top: 22pt; padding-top: 8pt; border-top: 1px solid #ccc; color: #777; font-size: 9pt; }
  </style></head><body>
    <h1>${e(r.title || doc.title)}</h1><div class="sub">${e(doc.title)} · ${T('erklärt am {d}', { d: new Date().toLocaleDateString(uiLang() === 'en' ? 'en-GB' : 'de-DE') })}</div>
    <h2>${T('Das Wichtigste')}</h2><ul>${bullets.map((b) => `<li>${e(b)}</li>`).join('')}</ul>
    ${L ? `<h2>${T('Was muss ich tun?')}</h2>${rows([[T('Betrag'), L.amount?.text], [T('An'), L.recipient], ['IBAN', L.iban], ...L.refs.map((x) => [T(x.label), x.value]), [T('Frist'), day(L.deadlines[0]?.iso)]])}` : ''}
    ${C ? `<h2>${T('Vertrag')}</h2>${rows([[T('Ende'), day(C.end)], [T('Kündigen bis'), day(C.cancelBy)], [T('Kosten'), C.monthly]])}` : ''}
    ${(r.key_points || []).length ? `<h2>${T('Kernaussagen')}</h2><ul>${r.key_points.map((p) => `<li>${e(p)}</li>`).join('')}</ul>` : ''}
    ${(r.findings || []).length ? `<h2>${T('Erkenntnisse')}</h2><ul>${r.findings.map((f) => `<li><b>${e(f.title)}</b>${f.detail ? ` – ${e(f.detail)}` : ''}</li>`).join('')}</ul>` : ''}
    <div class="foot">${T('Erstellt mit Silkreader. KI-Ergebnis – wichtige Angaben bitte im Original prüfen.')}</div>
  </body></html>`;
}
ipcMain.handle('export-result', async (_e, doc, r, how) => {
  const win = new BrowserWindow({ show: false, webPreferences: { javascript: false } });
  try {
    await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(resultHtml(doc, r))}`);
    if (how === 'print') return await new Promise((res) => win.webContents.print({}, (ok) => res(ok)));
    const pdf = await win.webContents.printToPDF({ pageSize: 'A4', margins: { top: 0.6, bottom: 0.6, left: 0.7, right: 0.7 } });
    if (TESTING && process.env.SILK_EXPORT_TO) { fs.writeFileSync(process.env.SILK_EXPORT_TO, pdf); return true; }
    const name = `${String(r.title || doc.title || 'Silkreader').replace(/[\\/:*?"<>|]+/g, ' ').trim().slice(0, 60)} – erklärt.pdf`;
    const { canceled, filePath } = await dialog.showSaveDialog(popupWin && !popupWin.isDestroyed() ? popupWin : undefined, { defaultPath: path.join(app.getPath('documents'), name), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, pdf);
    shell.showItemInFolder(filePath);
    return true;
  } catch (e) { logLine(`Export: ${e.message}`); return false; } finally { win.destroy(); }
});

// ---------- Bewertung im Store: nach ein paar erfolgreichen Nutzungen einmal freundlich fragen ----------
// Nur in der Store-Version (dort kann man bewerten). „Geht so“ führt zu „Problem melden“ statt in den Store.
const STORE_PRODUCT_ID = '9PHKJW54RGDS';
const REVIEW_AFTER = 5;
function countSuccess() {
  const s = loadSettings();
  s.uses = (s.uses || 0) + 1;
  saveSettings(s);
}
ipcMain.handle('review-state', () => {
  const s = loadSettings();
  if (!(STORE || process.env.SILK_REVIEW) || s.reviewDone || (s.uses || 0) < REVIEW_AFTER) return false;
  return Date.now() - (s.reviewLaterAt || 0) > 7 * 24 * 3600e3; // nach „Später“ frühestens in einer Woche wieder
});
ipcMain.handle('review-answer', (_e, answer) => {
  const s = loadSettings();
  if (answer === 'later') {
    s.reviewLater = (s.reviewLater || 0) + 1;
    s.reviewLaterAt = Date.now();
    if (s.reviewLater >= 2) s.reviewDone = true; // zweimal „Später“ → nie wieder fragen
  } else s.reviewDone = true;
  saveSettings(s);
  logLine(`Bewertungs-Frage: ${answer}`);
  if (answer === 'yes') shell.openExternal(`ms-windows-store://review/?ProductId=${STORE_PRODUCT_ID}`).catch(() => {});
});

// ---------- Fristen-Netz: alle Fristen aus dem Notizbuch, mit Erinnerung ----------
// Fristen kommen aus den gelesenen Briefen (feste Regeln, keine KI). Erledigte und bereits gemeldete
// Fristen stehen in deadlines.json – die Texte selbst bleiben im Notizbuch.
const deadlinesFile = () => path.join(app.getPath('userData'), 'deadlines.json');
function loadDeadlineState() { try { return { done: {}, told: {}, ...JSON.parse(fs.readFileSync(deadlinesFile(), 'utf8')) }; } catch { return { done: {}, told: {} }; } }
function saveDeadlineState(st) { fs.writeFileSync(deadlinesFile(), JSON.stringify(st)); }
const dayStart = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
function collectDeadlines({ withDone = false } = {}) {
  const st = loadDeadlineState();
  const today = dayStart(new Date());
  const out = [];
  for (const h of loadHistory()) {
    const found = facts.findDeadlines(h.text || '', { max: 6, now: new Date(h.date || Date.now()) }).filter((d) => d.deadline);
    // Vertrag: „kündigen spätestens am“ als eigene Frist
    const c = h.result?.contract;
    if (c?.cancelBy && !c.cancelPassed) found.push({ iso: c.cancelBy, sentence: T('Spätestens kündigen, sonst verlängert sich der Vertrag.'), deadline: true, contract: true });
    for (const d of found) {
      const key = `${h.id}|${d.iso}`;
      const date = dayStart(`${d.iso}T00:00:00`);
      if (date < today) continue;
      if (st.done[key] && !withDone) continue;
      out.push({ key, iso: d.iso, days: Math.round((date - today) / 864e5), sentence: d.sentence, relative: !!d.relative, title: h.title || h.docTitle, histId: h.id, done: !!st.done[key] });
    }
  }
  return out.sort((a, b) => a.iso.localeCompare(b.iso));
}
ipcMain.handle('deadlines-list', () => collectDeadlines({ withDone: true }));
ipcMain.handle('deadline-done', (_e, key, done = true) => {
  const st = loadDeadlineState();
  if (done) st.done[key] = Date.now(); else delete st.done[key];
  saveDeadlineState(st);
  updateDeadlineBadge();
});
// Erinnerung als Windows-Benachrichtigung: 3 Tage vorher und am Tag davor (je einmal)
function remindDeadlines() {
  const { Notification } = require('electron');
  if (!Notification.isSupported()) return;
  const st = loadDeadlineState();
  let changed = false;
  for (const d of collectDeadlines()) {
    const stage = d.days <= 1 ? 2 : d.days <= 3 ? 1 : 0;
    if (!stage || (st.told[d.key] || 0) >= stage) continue;
    st.told[d.key] = stage; changed = true;
    const when = d.days === 0 ? T('heute') : d.days === 1 ? T('morgen') : T('in {n} Tagen', { n: d.days });
    const n = new Notification({ title: T('Frist {w}: {t}', { w: when, t: d.title }), body: d.sentence.slice(0, 180), silent: false });
    n.on('click', () => showPopupPayload({ kind: 'deadlines' }));
    n.show();
    logLine(`Frist-Erinnerung (${when})`);
  }
  if (changed) saveDeadlineState(st);
}
// Zahl der offenen Fristen der nächsten 7 Tage für das Tray-Menü
let deadlinesSoon = 0;
function updateDeadlineBadge() {
  const n = collectDeadlines().filter((d) => d.days <= 7).length;
  if (n !== deadlinesSoon) { deadlinesSoon = n; buildTrayMenu(); }
}
function watchDeadlines() {
  const tick = () => { try { remindDeadlines(); updateDeadlineBadge(); } catch (e) { logLine(`Fristen: ${e.message}`); } };
  setTimeout(tick, 60 * 1000);
  setInterval(tick, 60 * 60 * 1000);
}

// ---------- Notizbuch: die letzten 20 Analysen ----------
const historyFile = () => path.join(app.getPath('userData'), 'history.json');
function loadHistory() { try { return JSON.parse(fs.readFileSync(historyFile(), 'utf8')); } catch { return []; } }
// Mappen (Pro): Briefe nach Thema. Was in einer Mappe liegt, bleibt (bis 200), sonst nur die letzten 20.
const FOLDERS = ['Steuer', 'Wohnung', 'Verträge', 'Versicherung', 'Gesundheit', 'Arbeit', 'Bank', 'Sonstiges'];
function guessFolder(text, result) {
  const t = `${result?.doc_type || ''} ${result?.title || ''} ${String(text).slice(0, 4000)}`.toLowerCase();
  if (/finanzamt|steuerbescheid|einkommensteuer|steuernummer|lohnsteuer/.test(t)) return 'Steuer';
  if (/vermieter|mietvertrag|nebenkosten|betriebskosten|wohnung|miete\b/.test(t)) return 'Wohnung';
  if (/krankenkasse|arzt|praxis|befund|klinik|rezept|therapie/.test(t)) return 'Gesundheit';
  if (/versicherung|police|versicherungsschein|schadensfall/.test(t)) return 'Versicherung';
  if (/arbeitgeber|arbeitsvertrag|gehalt|lohnabrechnung|kündigung des arbeits/.test(t)) return 'Arbeit';
  if (/kontoauszug|kredit|darlehen|girokonto|sparkasse|bank\b/.test(t)) return 'Bank';
  if (/vertrag|tarif|laufzeit|mobilfunk|strom|gas\b|internet|abonnement|mitgliedschaft/.test(t)) return 'Verträge';
  return null;
}
function trimHistory(list) {
  const filed = list.filter((h) => h.folder).slice(0, 200), loose = list.filter((h) => !h.folder).slice(0, 20);
  const keep = new Set([...filed, ...loose].map((h) => h.id));
  return list.filter((h) => keep.has(h.id));
}
function addHistory(doc, result) {
  if (loadSettings().privateMode) return; // Privatmodus: nichts merken
  const text = doc.pages.join('\n\n').slice(0, 200000);
  const old = loadHistory();
  const before = old.find((h) => h.text === text);
  const list = old.filter((h) => h.text !== text);
  const folder = before?.folder || (pro.allowed('folders') ? guessFolder(text, result) : null);
  list.unshift({ id: `${Date.now()}`, date: Date.now(), title: result.title || doc.title, docTitle: doc.title, path: doc.path, mtime: doc.mtime, pages: doc.pages.map((p) => p.slice(0, 100000)), text, result, folder });
  fs.writeFileSync(historyFile(), JSON.stringify(trimHistory(list)));
}
ipcMain.handle('history-folder', (_e, id, folder) => {
  if (!pro.allowed('folders')) return { ok: false, pro: 'folders' };
  const list = loadHistory();
  const h = list.find((x) => x.id === id);
  if (h) { h.folder = FOLDERS.includes(folder) ? folder : null; fs.writeFileSync(historyFile(), JSON.stringify(trimHistory(list))); }
  return { ok: true };
});
ipcMain.handle('folders', () => ({ all: FOLDERS, used: [...new Set(loadHistory().map((h) => h.folder).filter(Boolean))], allowed: pro.allowed('folders') }));

// Frag dein Notizbuch (Pro): die passendsten gespeicherten Texte heraussuchen und daraus antworten
const NOTEBOOK_SCHEMA = {
  type: 'object', additionalProperties: false, required: ['answer', 'source'],
  properties: { answer: { type: 'string', maxLength: 600 }, source: { type: 'string', maxLength: 120, description: 'Titel des Dokuments, aus dem die Antwort stammt (oder leer)' } },
};
ipcMain.handle('notebook-ask', async (_e, question) => {
  if (!pro.allowed('askNotebook')) return { ok: false, pro: 'askNotebook' };
  const list = loadHistory();
  if (!list.length) return { ok: true, answer: T('Im Notizbuch ist noch nichts gespeichert.'), sources: [] };
  const words = [...new Set(String(question).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3))];
  const scored = list.map((h) => {
    const hay = `${h.title} ${h.docTitle} ${h.folder || ''} ${h.result?.summary || ''} ${(h.result?.key_points || []).join(' ')} ${h.text.slice(0, 30000)}`.toLowerCase();
    return { h, score: words.reduce((n, w) => n + (hay.includes(w) ? (String(h.title).toLowerCase().includes(w) ? 3 : 1) : 0), 0) };
  }).sort((a, b) => b.score - a.score || b.h.date - a.h.date).slice(0, 3);
  const material = scored.map(({ h }) => {
    const r = h.result || {};
    const c = r.contract ? `\nVertrag: Ende ${r.contract.end || '?'}, kündigen bis ${r.contract.cancelBy || '?'}, Kosten ${r.contract.monthly || '?'}` : '';
    const doc = { pages: [h.text] };
    return `### ${h.title} (gelesen am ${new Date(h.date).toLocaleDateString('de-DE')})\n${r.summary || ''}${c}\n${(r.figures || []).map((f) => `${f.label}: ${f.value}`).join('; ')}\nAuszug:\n${relevantMaterial(doc, question, 1800)}`;
  }).join('\n\n');
  try {
    setBusy(true);
    const { value } = await llmGenerate({
      instruction: `Hier sind Auszüge aus gespeicherten Briefen und Dokumenten. Beantworte kurz und genau: „${question}“\nWenn die Auszüge keine Antwort enthalten, sag das ehrlich. Gib in "source" den Titel des Dokuments an, aus dem die Antwort stammt.`,
      material, schema: NOTEBOOK_SCHEMA, maxTokens: 400,
    });
    countSuccess();
    const src = scored.find(({ h }) => value.source && (h.title.includes(value.source) || value.source.includes(h.title)))?.h || scored[0]?.h;
    return { ok: true, answer: value.answer, sources: src ? [{ id: src.id, title: src.title }] : [] };
  } catch (e) { return friendlyErr(e); } finally { setBusy(false); }
});
ipcMain.handle('history-list', (_e, q = '', folder = null) => {
  const needle = q.trim().toLowerCase();
  return loadHistory()
    .filter((h) => !folder || h.folder === folder)
    .filter((h) => !needle || `${h.title} ${h.docTitle} ${h.result.summary} ${h.text.slice(0, 20000)}`.toLowerCase().includes(needle))
    .map((h) => ({ id: h.id, date: h.date, title: h.title, docTitle: h.docTitle, summary: h.result.summary, folder: h.folder || null }));
});
ipcMain.handle('history-get', (_e, id) => {
  const h = loadHistory().find((x) => x.id === id);
  return h ? { doc: { title: h.docTitle, source: 'history', pages: h.pages, path: h.path, mtime: h.mtime }, result: h.result } : null;
});
ipcMain.handle('history-open', (_e, id) => {
  const h = loadHistory().find((x) => x.id === id);
  if (h) showDocument({ title: h.docTitle, source: 'history', pages: h.pages }, { result: h.result });
});
ipcMain.handle('history-delete', (_e, id) => { fs.writeFileSync(historyFile(), JSON.stringify(loadHistory().filter((h) => h.id !== id))); });

// ---------- IPC ----------

ipcMain.handle('analyze', async (event, doc) => {
  try {
    bubbleWin?.webContents.send('rig-task', 'read');
    setBusy(true);
    analysisRunning++;
    // Fortschritt: Zeichenzahl und – sobald die KI sie geschrieben hat – schon die Zusammenfassung,
    // damit man nicht bis zum Ende warten muss.
    let text = '', lastSent = 0;
    let stage = null;
    let result = await analyze(doc, (chunk) => {
      if (chunk?.quick || chunk?.notes) { event.sender.send('progress', chunk); return; } // Kurzfassung / Zwischenstand
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
    // Feste Regeln obendrauf: Zahlen gegen den Originaltext prüfen, Briefe (Rechnung, Bescheid …) erkennen
    try {
      const text = doc.pages.join('\n');
      const contract = facts.contractFacts(text);
      let letter = facts.letterFacts(text);
      if (contract && letter && ['vertrag', 'kuendigung'].includes(letter.kind)) letter = null; // Verträge bekommen die Vertragskarte
      result = {
        ...facts.verifyResult(result, text),
        letter: pro.allowed('letter') ? letter : null, letterLocked: !!letter && !pro.allowed('letter') ? letter.label : null,
        contract: pro.allowed('contract') ? contract : null, contractLocked: !!contract && !pro.allowed('contract'),
      };
    } catch (e) { logLine(`Prüfung fehlgeschlagen: ${e.message}`); }
    // Wie viel ging dabei ins Internet? Eingebautes Modell und Ollama (lokal): nichts. Claude: der Text selbst.
    const prov = loadSettings().provider;
    result.sentBytes = prov === 'claude' && !process.env.SPIDER_MOCK ? Buffer.byteLength(doc.pages.join('\n'), 'utf8') : 0;
    try { addHistory(doc, result); updateDeadlineBadge(); } catch (e) { console.error('Notizbuch:', e); }
    countSuccess();
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
    { label: T('Neuer Text'), accelerator: 'CommandOrControl+N', click: () => e.sender.send('menu', 'new') },
    { label: T('Aus Zwischenablage'), accelerator: 'CommandOrControl+V', click: () => e.sender.send('menu', 'paste') },
    { label: T('Datei öffnen …'), accelerator: 'CommandOrControl+O', click: () => pickFile() },
    { label: T('Notizbuch'), accelerator: 'CommandOrControl+H', click: () => e.sender.send('show-notebook') },
    { type: 'separator' },
    { label: T('Ergebnis kopieren'), accelerator: 'CommandOrControl+Shift+C', click: () => e.sender.send('menu', 'copy') },
    { label: T('Einstellungen …'), accelerator: 'CommandOrControl+,', click: () => openSettings() },
  ]).popup({ window: BrowserWindow.fromWebContents(e.sender) });
});
ipcMain.handle('pin-selection', () => cocoonFromSelection({ hotkey: false }));
ipcMain.handle('clipboard-text', async () => String((await clipboard.readText()) || ''));
ipcMain.handle('pick-file-bubble', async () => {
  const r = await dialog.showOpenDialog(popupWin && !popupWin.isDestroyed() ? popupWin : undefined, {
    title: T('Dokument lesen'), properties: ['openFile'],
    filters: [{ name: T('Dokumente'), extensions: DOC_EXT }],
  });
  if (r.canceled || !r.filePaths[0]) return { ok: false };
  try { return { ok: true, doc: await readFileDoc(r.filePaths[0]) }; } catch (e) { return { ok: false, error: String(e.message || e), pro: e.code === 'PRO' ? e.feature : null }; }
});
ipcMain.handle('region-capture', () => { popupWin?.hide(); return regionCapture(); });
ipcMain.handle('open-reader', (_e, doc, result, focus) => {
  popupWin?.hide();
  if (doc) showDocument(doc, { result, focus }); else showMain();
});
// Fundstelle direkt auf dem Bildschirm zeigen: die große Spinne läuft zu den Wörtern im Originalprogramm
ipcMain.handle('show-on-screen', async (_e, { screenAt, start, end }) => {
  const sel = lastScreenSel;
  if (!sel || sel.time !== screenAt || Date.now() - sel.time > 5 * 60 * 1000) return false;
  const words = (str) => (str.match(/\S+/g) || []).length;
  const total = Math.max(1, words(sel.text));
  const ratio = sel.words.length / total;
  const a = Math.max(0, Math.floor(words(sel.text.slice(0, start)) * ratio));
  const b = Math.min(sel.words.length, Math.max(a + 1, Math.ceil(words(sel.text.slice(0, end)) * ratio)));
  bubbleWin?.webContents.send('rig-trick', 'scared');
  await runCrawlOverlay({ x: sel.words[a][0], y: sel.words[a][1] }, { words: sel.words.slice(a, b), dip: true });
  bubbleWin?.webContents.send('rig-trick', 'return');
  return true;
});
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
ipcMain.handle('shortcuts', () => SHORTCUTS.map((s) => ({ id: s.id, label: s.label, desc: T(s.desc), ok: shortcutStatus[s.id] !== false })));
// Während in den Einstellungen ein neues Kürzel aufgenommen wird, dürfen die alten es nicht abfangen
let recordingShortcut = false;
ipcMain.on('shortcut-recording', (_e, on) => { recordingShortcut = on; if (on) globalShortcut.unregisterAll(); else registerShortcuts(); });
ipcMain.handle('set-shortcut', (_e, id, keys, label) => {
  const st = loadSettings();
  st.shortcuts = { ...(st.shortcuts || {}), [id]: { keys, label } };
  saveSettings(st);
  recordingShortcut = false;
  registerShortcuts();
  return shortcutStatus[id] !== false;
});
ipcMain.handle('open-settings', () => openSettings());
ipcMain.handle('open-main', () => { const w = createMain(); w.show(); w.focus(); });

ipcMain.handle('get-settings', () => {
  const s = loadSettings();
  return {
    uiLang: uiLang(),
    provider: s.provider, model: s.model, ollamaModel: s.ollamaModel, language: s.language,
    hatchAnimation: s.hatchAnimation !== false,
    lowPower: !!s.lowPower,
    pinCopied: s.pinCopied !== false,
    copyHint: s.copyHint !== false,
    privateMode: !!s.privateMode,
    hideFullscreen: s.hideFullscreen !== false,
    hideInShare: s.hideInShare !== false,
    watchDownloads: s.watchDownloads === true,
    clickMode: clickMode(),
    explainLang: s.explainLang || null,
    qualityReady: modelReady('quality'), qualityPossible: ramGB() >= BUILTIN_MODELS.quality.minRamGB,
    explainLangs: Object.fromEntries(Object.entries(EXPLAIN_LANGS).map(([k, v]) => [k, v[0]])),
    hasKey: !!getApiKey(), models: MODELS, hotkey: SHORTCUTS[0].label,
  };
});
// Arbeitsspeicher des PCs (gerundet, in GB) – für Empfehlungen bei schwächeren PCs
const ramGB = () => Math.round(require('os').totalmem() / 1024 ** 3);
ipcMain.handle('model-status', () => ({
  selected: builtinKey(),
  downloading: !!modelDownload,
  ramGB: ramGB(),
  models: Object.fromEntries(Object.entries(BUILTIN_MODELS).map(([k, m]) => [k, { name: m.name, size: m.sizeLabel, ready: modelReady(k), tooBig: ramGB() < m.minRamGB, minRamGB: m.minRamGB, locked: !pro.allowed(k) }])),
}));
ipcMain.handle('model-download', (event, key) => { startModelDownload(event.sender, key); });
ipcMain.handle('model-cancel', async () => { modelDownloadCanceled = true; await modelDownload?.cancel(); });
ipcMain.handle('ollama-models', async () => {
  try { return { ok: true, models: await ollamaModels() }; } catch { return { ok: false, models: [] }; }
});
ipcMain.handle('save-settings', (_e, { provider, apiKey, model, ollamaModel, language, builtinModel, hatchAnimation, lowPower, pinCopied, copyHint, privateMode, hideFullscreen, hideInShare, watchDownloads, clickMode: cm }) => {
  if (apiKey) setApiKey(apiKey.trim());
  const s = loadSettings();
  if (['builtin', 'claude', 'ollama'].includes(provider)) s.provider = provider;
  if (ollamaModel) s.ollamaModel = ollamaModel.trim();
  if (BUILTIN_MODELS[builtinModel]) s.builtinModel = builtinModel;
  if (typeof hatchAnimation === 'boolean') s.hatchAnimation = hatchAnimation;
  if (typeof lowPower === 'boolean') s.lowPower = lowPower;
  if (typeof pinCopied === 'boolean') s.pinCopied = pinCopied;
  if (typeof copyHint === 'boolean') s.copyHint = copyHint;
  if (typeof privateMode === 'boolean') s.privateMode = privateMode;
  if (typeof hideFullscreen === 'boolean') s.hideFullscreen = hideFullscreen;
  if (typeof watchDownloads === 'boolean') s.watchDownloads = watchDownloads;
  if (typeof hideInShare === 'boolean') { s.hideInShare = hideInShare; setImmediate(() => [bubbleWin, popupWin, ringWin].forEach(protectFromCapture)); }
  if (CLICK_MODES.includes(cm)) { s.clickMode = cm; bubbleWin?.webContents.send('click-mode', cm); }
  if (model && MODELS[model]) s.model = model;
  if (language) { if (language !== s.language) s.languageSet = true; s.language = language; }
  saveSettings(s);
  preloadBuiltinModel();
  return true;
});
ipcMain.handle('open-external', (_e, url) => {
  if (url.startsWith('https://')) shell.openExternal(url);
});

ipcMain.on('bubble-menu', () => openRing({ at: spiderScreenPos() }));
// Altes Menü (noch über das Tray-Symbol erreichbar)
function classicMenu() {
  return Menu.buildFromTemplate([
    { label: T('Bildschirmbereich lesen'), click: () => regionCapture() },
    { label: T('Notizbuch'), click: () => showNotebook() },
    { label: T('Spinnennetz-Ring öffnen'), click: () => openRing({ at: spiderScreenPos() }) },
    { label: T('Spinne ausblenden'), click: () => bubbleWin.hide() },
  ]);
}

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

// Updates prüfen: Die Datei muss mit unserem Silkreader-Zertifikat signiert sein (fest hinterlegter Fingerabdruck) –
// dafür muss kein Zertifikat mehr als vertrauenswürdige Stammstelle installiert werden. Eine später gekaufte,
// anerkannte Signatur (Status „gültig“ und Herausgeber „Silkreader“) wird ebenfalls akzeptiert.
const PINNED_CERTS = ['66923F7442AA9A51CEE8EE2055B12E9FB722F9F1'];
let defaultVerify = null; // Prüfung von electron-updater als Rückfallebene
function verifyUpdateSignature(publisherNames, file) {
  const fallback = (why) => {
    logLine(`Eigene Signaturprüfung nicht möglich (${why}) – nutze Standardprüfung`);
    return defaultVerify ? defaultVerify(publisherNames, file) : `Signatur nicht prüfbar: ${why}`;
  };
  return new Promise((resolve) => {
    const ps = `Get-AuthenticodeSignature -LiteralPath '${file.replace(/'/g, "''")}' | ForEach-Object { [pscustomobject]@{ s = [int]$_.Status; t = $_.SignerCertificate.Thumbprint; n = $_.SignerCertificate.Subject } } | ConvertTo-Json -Compress`;
    require('child_process').execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true, timeout: 30000, env: require('./psenv').psEnv() }, (err, out) => {
      if (err) return resolve(fallback(err.message));
      let d;
      try { d = JSON.parse(String(out).trim()); } catch { return resolve(fallback('Ausgabe nicht lesbar')); }
      const thumb = String(d?.t || '').toUpperCase();
      // 0 = gültig, 1/4 = nur die Vertrauenskette fehlt (selbst erstelltes Zertifikat); 2/3 = unsigniert/verändert → ablehnen
      if (PINNED_CERTS.includes(thumb) && [0, 1, 4].includes(d.s)) return resolve(null);
      if (d?.s === 0 && publisherNames.some((n) => String(d.n || '').includes(`CN=${n.replace(/^CN=/, '').split(',')[0]}`))) return resolve(null);
      logLine(`Update abgelehnt: Signatur ${JSON.stringify(d)}`);
      resolve(`Update nicht vertrauenswürdig signiert (Status ${d?.s})`);
    });
  });
}

function setupUpdates() {
  if (!app.isPackaged || STORE) return; // nur in der installierten App; Store-Versionen aktualisiert der Store
  if (process.platform === 'win32') {
    defaultVerify = updater().verifyUpdateCodeSignature;
    updater().verifyUpdateCodeSignature = verifyUpdateSignature;
  }
  updater().autoDownload = true;
  updater().autoInstallOnAppQuit = true;

  updater().on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: T('Silkreader-Update'),
      message: T(`Silkreader ${info.version} ist da! 🕷`),
      detail: T('Jetzt neu starten und aktualisieren? Sonst wird das Update automatisch beim nächsten Beenden installiert.'),
      buttons: [T('Jetzt neu starten'), T('Später')],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) updater().quitAndInstall(true, true);
  });
  updater().on('update-not-available', () => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: T(`Du hast die neueste Version (${app.getVersion()}).`) });
  });
  updater().on('update-available', (info) => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: T(`Version ${info.version} wird im Hintergrund heruntergeladen …`) });
  });
  updater().on('error', (e) => {
    console.error('Update-Fehler:', e);
    if (!manualUpdateCheck) return; // automatische Prüfungen scheitern still (z. B. offline)
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'warning', title: 'Silkreader', message: T('Die Update-Prüfung hat nicht geklappt.'), detail: String(e.message || e).slice(0, 400) });
  });

  const check = () => updater().checkForUpdates().catch(() => {});
  setTimeout(check, 15000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

function checkUpdatesNow() {
  if (!app.isPackaged) {
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: T('Updates gibt es nur in der installierten App.') });
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
app.commandLine.appendSwitch('enable-features', 'NetworkServiceInProcess2');

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (_e, argv) => {
    const f = fileFromArgs(argv);
    if (f) readFileToBubble(f);
    else { bubbleWin?.show(); showHome(); }
  });

  app.whenReady().then(() => {
    I18N.setLang(uiLang());
    // Webseiten-Berechtigungen: nur Schreiben in die Zwischenablage (Kopieren-Knöpfe), sonst nichts
    const { session: ses } = require('electron');
    const camOk = (wc, perm) => perm === 'media' && !!cameraWin && !cameraWin.isDestroyed() && wc === cameraWin.webContents;
    ses.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['clipboard-sanitized-write'].includes(perm) || camOk(wc, perm)));
    ses.defaultSession.setPermissionCheckHandler((wc, perm) => ['clipboard-sanitized-write'].includes(perm) || camOk(wc, perm));
    cocoons = new CocoonStore(path.join(app.getPath('userData'), 'cocoons.json'));
    setTimeout(warmUpGrab, 2000); // Tastatur-Helfer vorab starten, damit der erste Klick sofort klappt
    // Ohne Helfer (nicht Windows oder blockiert) gibt es keine Ablagezone → Spinne bekommt größere Fangfläche
    setTimeout(() => { if (!helperAvailable()) bubbleWin?.webContents.send('drop-zone', 'unavailable'); }, 15000);
    watchCopiedFiles();
    createBubble();

    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(icon);
    tray.setToolTip(`Silkreader ${app.getVersion()}`);
    buildTrayMenu();
    tray.on('click', () => bubbleWin.show());

    setLogger(logLine);
    logLine(`Start Silkreader ${app.getVersion()} (${process.platform} ${require('os').release()})${STORE ? ' – Microsoft-Store-Version' : ''}`);
    registerShortcuts(true);
    // Analysefenster unsichtbar vorbereiten, damit es später sofort da ist
    // (Fenster werden erst bei Bedarf erzeugt und nach einer Weile im Hintergrund wieder freigegeben – spart RAM)
    setupUpdates();

    registerExplorerMenu();
    watchFullscreen();
    watchDeadlines();
    watchDownloads();
    refreshPro().catch((e) => logLine(`Pro: ${e.message}`));
    const startFile = fileFromArgs(process.argv);
    if (startFile) setTimeout(() => readFileToBubble(startFile), 1500);
    const s = loadSettings();
    if (!s.onboarded && (!TESTING || process.env.SILK_WELCOME)) { showWelcome(); return; }
    maybeShowWhatsNew();
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
if (TESTING) global.__silk = { showPopupPayload, showNotebook, showHome, openRing, closeRing, runRingAction, readCocoon, addHistory, compareCocoons,
  get cocoons() { return cocoons; }, get lastScreenSel() { return lastScreenSel; }, set lastScreenSel(v) { lastScreenSel = v; },
  set copiedOffer(v) { copiedOffer = v; },
  get downloadOffer() { return downloadOffer; }, spiderTake, runCrawlOverlay,
  // Für die Windows-Tests: Diagnose und direkte Aufrufe der Windows-Bausteine
  diag: () => ({ winkeys: !!winkeys.load(), winkeysError: winkeys.load.error?.message || null, helper: helperAvailable(),
    shortcuts: { ...shortcutStatus }, tray: !!tray && !tray.isDestroyed(), lang: uiLang(), userData: app.getPath('userData') }),
  grab: (o) => grabSelection(o), uia: () => uiaSelectedText(), helperDiag: () => helperDiag(),
  log: () => { try { return fs.readFileSync(path.join(app.getPath('userData'), 'silkreader-errors.log'), 'utf8'); } catch { return ''; } }, rects: () => selectionRects(), scan: (p) => scanSelection(p),
  verify: (file) => verifyUpdateSignature(['Silkreader'], file),
  spiderPos: () => spiderScreenPos(),
  modelReady: (k = 'fast') => modelReady(k),
  readFile: (f) => readFileDoc(f),
  fullscreenBusy: () => winkeys.fullscreenBusy(),
  protectedWindows: () => [bubbleWin, popupWin].filter((w) => w && !w.isDestroyed()).length,
  maybeShowWhatsNew: () => maybeShowWhatsNew(),
  async makeScan() {
    // Bild-PDF ohne Textebene erzeugen (wie ein Scan) und dazu ein PNG – für den OCR-Test
    const w = new BrowserWindow({ width: 800, height: 300, show: false, webPreferences: { offscreen: true } });
    await w.loadURL('data:text/html,' + encodeURIComponent('<body style="margin:0;background:#fff;font:44px Arial;padding:30px">Rechnung Nummer 4711<br>Betrag 84 Euro</body>'));
    await new Promise((r) => setTimeout(r, 400));
    const png = (await w.capturePage()).toPNG();
    const pngFile = path.join(app.getPath('temp'), 'silk-scan.png');
    fs.writeFileSync(pngFile, png);
    await w.loadURL('data:text/html,' + encodeURIComponent(`<body style="margin:0"><img src="data:image/png;base64,${png.toString('base64')}" style="width:100%"></body>`));
    const pdf = await w.webContents.printToPDF({ printBackground: true });
    w.destroy();
    const pdfFile = path.join(app.getPath('temp'), 'silk-scan.pdf');
    fs.writeFileSync(pdfFile, pdf);
    return { png: pngFile, pdf: pdfFile };
  },
  async downloadModel(k = 'fast') {
    let last = 0;
    const sender = { isDestroyed: () => false, send: (_ch, p) => { if (p?.error) global.__dlError = p.error; if (p?.done) last = p.done; } };
    await startModelDownload(sender, k);
    return { ready: modelReady(k), error: global.__dlError || null, bytes: last };
  },
  remindDeadlines: () => remindDeadlines(),
  openCamera: () => openCamera(),
  proStatus: () => pro.status(),
  refreshPro: () => refreshPro(),
  collectDeadlines: () => collectDeadlines({ withDone: true }),
  async analyzeTimed(doc) {
    const t0 = Date.now();
    global.__lastNotes = '';
    let quickMs = null;
    const result = await analyze(doc, (c) => { if (c?.quick && quickMs === null) quickMs = Date.now() - t0; });
    const text = doc.pages.join('\n');
    return { ms: Date.now() - t0, quickMs, result: { ...facts.verifyResult(result, text), letter: facts.letterFacts(text) }, notes: global.__lastNotes };
  },
  async transformTimed(mode, text) {
    const t0 = Date.now();
    const { value } = await runTransform(mode, text);
    return { ms: Date.now() - t0, text: value };
  },
  metrics: () => {
    const m = app.getAppMetrics();
    return { mb: Math.round(m.reduce((s, x) => s + x.memory.workingSetSize, 0) / 1024), cpu: +m.reduce((s, x) => s + x.cpu.percentCPUUsage, 0).toFixed(2), procs: m.length,
      byType: m.reduce((o, x) => { const k = x.type + (x.serviceName ? `:${x.serviceName}` : ''); o[k] = (o[k] || 0) + Math.round(x.memory.workingSetSize / 1024); return o; }, {}) };
  },
  get shiftCount() { return global.__shiftCount || 0; },
  async crawlSelection() {
    const r = await selectionRects();
    if (!r) return { words: 0, lines: 0 };
    await runCrawlOverlay(screen.getCursorScreenPoint(), r);
    return { words: r.words?.length || 0, lines: r.lines?.length || 0 };
  },
  async ocrSample() {
    // Text in einem unsichtbaren Fenster zeichnen, abfotografieren und mit der Windows-Texterkennung lesen
    const w = new BrowserWindow({ width: 640, height: 160, show: false, webPreferences: { offscreen: true } });
    await w.loadURL('data:text/html,' + encodeURIComponent('<body style="margin:0;background:#fff;font:48px Segoe UI,Arial">Silkreader liest 2026</body>'));
    await new Promise((r) => setTimeout(r, 400));
    const img = await w.capturePage();
    w.destroy();
    const file = path.join(app.getPath('temp'), `silk-ocr-${Date.now()}.png`);
    fs.writeFileSync(file, img.toPNG());
    try { return await recognizeText(file); } finally { fs.unlink(file, () => {}); }
  },
};
