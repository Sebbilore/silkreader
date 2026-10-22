// Silkreader – Hauptprozess
// Schwebendes Spinnen-Icon + Analysefenster. Texte kommen aus der Zwischenablage,
// per Drag & Drop oder über "Datei öffnen" und werden mit Claude analysiert.

const {
  app, BrowserWindow, ipcMain, clipboard, globalShortcut, Menu, Tray,
  dialog, screen, safeStorage, nativeImage, shell,
} = require('electron');
const path = require('path');
const fs = require('fs');
const Anthropic = require('@anthropic-ai/sdk').default;
const { autoUpdater } = require('electron-updater');

const HOTKEY = 'CommandOrControl+Shift+Space';
const OLLAMA_URL = 'http://127.0.0.1:11434';
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
    provider: 'ollama', model: 'claude-opus-5-5', ollamaModel: 'gemma3:12b',
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
const RIG = { width: 140, height: 320, minLen: 24, maxLen: 230 };

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
    skipTaskbar: true, hasShadow: false, focusable: true, maximizable: false,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  bubbleWin.setAlwaysOnTop(true, 'floating');
  bubbleWin.setVisibleOnAllWorkspaces(true);
  bubbleWin.setIgnoreMouseEvents(true, { forward: true });
  bubbleWin.loadFile(path.join(__dirname, 'bubble.html'));
  bubbleWin.webContents.on('did-finish-load', () => {
    bubbleWin.webContents.send('rig-init', { length: s.rig?.length ?? 90, minLen: RIG.minLen, maxLen: RIG.maxLen });
  });

  // Mausposition regelmäßig an die Spinne schicken (Augen folgen dem Zeiger, Treffer-Test).
  const timer = setInterval(() => {
    if (!bubbleWin || bubbleWin.isDestroyed()) return clearInterval(timer);
    if (!bubbleWin.isVisible()) return;
    const c = screen.getCursorScreenPoint();
    const [wx, wy] = bubbleWin.getPosition();
    bubbleWin.webContents.send('cursor', { x: c.x - wx, y: c.y - wy });
  }, 40);
}

function setBusy(busy) {
  if (bubbleWin && !bubbleWin.isDestroyed()) bubbleWin.webContents.send('busy', busy);
}

function createMain() {
  if (mainWin && !mainWin.isDestroyed()) return mainWin;
  mainWin = new BrowserWindow({
    width: 1280, height: 860, minWidth: 820, minHeight: 560,
    title: 'Silkreader', backgroundColor: '#0b0b10', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  mainWin.loadFile(path.join(__dirname, 'index.html'));
  mainWin.on('closed', () => { mainWin = null; });
  return mainWin;
}

function openSettings() {
  if (settingsWin && !settingsWin.isDestroyed()) return settingsWin.focus();
  settingsWin = new BrowserWindow({
    width: 560, height: 680, resizable: true, title: 'Einstellungen',
    backgroundColor: '#0b0b10', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') },
  });
  settingsWin.loadFile(path.join(__dirname, 'settings.html'));
  settingsWin.on('closed', () => { settingsWin = null; });
}

// Öffnet das Analysefenster und übergibt ihm ein Dokument.
function showDocument(doc) {
  const win = createMain();
  const send = () => { win.show(); win.focus(); win.webContents.send('document', doc); };
  if (win.webContents.isLoading()) win.webContents.once('did-finish-load', send);
  else send();
}

async function analyzeClipboard() {
  // readText() liefert in dieser Electron-Version ein Promise
  const text = String((await clipboard.readText()) || '').trim();
  if (!text) {
    // Nichts kopiert → Analysefenster mit Eingabefeld zeigen.
    const w = createMain();
    w.show();
    w.focus();
    return;
  }
  showDocument({ title: 'Text aus der Zwischenablage', source: 'clipboard', pages: [text] });
}

async function pickFile() {
  const r = await dialog.showOpenDialog({
    title: 'Dokument analysieren',
    properties: ['openFile'],
    filters: [{ name: 'Dokumente', extensions: ['pdf', 'docx', 'txt', 'md', 'csv', 'json', 'html', 'log'] }],
  });
  if (!r.canceled && r.filePaths[0]) await openFile(r.filePaths[0]);
}

async function openFile(filePath) {
  try {
    showDocument(await readDocument(filePath));
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
    summary: { type: 'string', description: 'Zusammenfassung in 3–6 Sätzen' },
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

function buildPrompt(doc, language) {
  const body = doc.pages.length > 1
    ? doc.pages.map((p, i) => `<page number="${i + 1}">\n${p}\n</page>`).join('\n')
    : doc.pages[0];
  return [
    `Lies das folgende Dokument ("${doc.title}") vollständig und analysiere es wie ein erfahrener Analyst.`,
    `Antworte auf ${language}.`,
    '',
    'Liefere:',
    '- eine prägnante Zusammenfassung und die Kernaussagen,',
    '- 6 bis 30 wichtige Angaben (Zahlen, Beträge, Daten, Fristen, Personen, Begriffe) – je nach Länge und Dichte des Textes. Das Feld "quote" muss eine wörtliche, zusammenhängende Stelle aus dem Dokument sein (Zeichen für Zeichen kopiert), damit sie im Text markiert werden kann,',
    '- 3 bis 8 echte Erkenntnisse, die über bloßes Nacherzählen hinausgehen: Kennzahlen/Verhältnisse selbst ausrechnen, wo es sinnvoll ist, Risiken, Fristen, Widersprüche oder nötige Handlungen benennen.',
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
    for (let n = 1; n <= 8; n++) { await new Promise((r) => setTimeout(r, 500)); onProgress(n * 400); }
    return JSON.parse(fs.readFileSync(process.env.SPIDER_MOCK, 'utf8'));
  }
  const s = loadSettings();
  return s.provider === 'ollama' ? analyzeOllama(doc, s, onProgress) : analyzeClaude(doc, s, onProgress);
}

async function analyzeClaude(doc, s, onProgress) {
  const apiKey = getApiKey();
  if (!apiKey) throw Object.assign(new Error('Kein API-Schlüssel hinterlegt. Bitte in den Einstellungen eintragen – oder dort auf den kostenlosen lokalen Modus umstellen.'), { code: 'NO_KEY' });
  const client = new Anthropic({ apiKey });

  const params = {
    model: s.model,
    max_tokens: 32000,
    output_config: { effort: 'medium', format: { type: 'json_schema', schema: ANALYSIS_SCHEMA } },
    messages: [{ role: 'user', content: buildPrompt(doc, s.language) }],
  };
  // Haiku hat keinen serverseitigen Fallback – für Opus/Sonnet springt bei einer
  // Ablehnung automatisch ein passendes Ersatzmodell ein.
  if (s.model !== 'claude-haiku-5-5') {
    params.betas = ['server-side-fallback-2026-07-01'];
    params.fallbacks = 'default';
  }

  const stream = client.beta.messages.stream(params);
  let chars = 0;
  stream.on('text', (delta) => { chars += delta.length; onProgress(chars); });
  const msg = await stream.finalMessage();

  if (msg.stop_reason === 'refusal') throw new Error('Claude hat die Analyse dieses Textes abgelehnt.');
  if (msg.stop_reason === 'max_tokens') throw new Error('Die Antwort wurde abgeschnitten – das Dokument ist zu umfangreich.');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  return JSON.parse(text);
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
      onProgress(out.length);
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
    summary: r.summary || '',
    key_points: Array.isArray(r.key_points) ? r.key_points : [],
    figures: (Array.isArray(r.figures) ? r.figures : []).map((f) => ({
      label: String(f.label ?? ''), value: String(f.value ?? ''), quote: String(f.quote ?? ''), page: Number(f.page) || 1,
    })),
    findings: (Array.isArray(r.findings) ? r.findings : []).map((f) => ({
      kind: f.kind || 'Beobachtung', title: f.title || '', detail: f.detail || '', pages: Array.isArray(f.pages) ? f.pages : [],
    })),
  };
}

function friendlyError(e) {
  if (e.code === 'NO_KEY' || e.code === 'NO_OLLAMA') return e.message;
  if (e instanceof Anthropic.AuthenticationError) return 'Der API-Schlüssel ist ungültig. Bitte in den Einstellungen prüfen.';
  if (e instanceof Anthropic.RateLimitError) return 'Zu viele Anfragen – bitte kurz warten und erneut versuchen.';
  if (e instanceof Anthropic.BadRequestError) return `Anfrage abgelehnt: ${e.message}`;
  if (e instanceof Anthropic.APIConnectionError) return 'Keine Verbindung zu Claude – Internetverbindung prüfen.';
  if (e instanceof Anthropic.APIError) return `Fehler von Claude: ${e.message}`;
  return String(e.message || e);
}

// ---------- IPC ----------

ipcMain.handle('analyze', async (event, doc) => {
  try {
    setBusy(true);
    const result = await analyze(doc, (n) => event.sender.send('progress', n));
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: friendlyError(e), needsKey: e.code === 'NO_KEY' || e.code === 'NO_OLLAMA' || e instanceof Anthropic.AuthenticationError };
  } finally {
    setBusy(false);
  }
});

ipcMain.handle('open-file', (_e, p) => openFile(p));
ipcMain.handle('pick-file', () => pickFile());
ipcMain.handle('analyze-clipboard', () => analyzeClipboard());
ipcMain.handle('analyze-text', (_e, text) => showDocument({ title: 'Eingefügter Text', source: 'text', pages: [text] }));
ipcMain.handle('open-settings', () => openSettings());
ipcMain.handle('open-main', () => { const w = createMain(); w.show(); w.focus(); });

ipcMain.handle('get-settings', () => {
  const s = loadSettings();
  return {
    provider: s.provider, model: s.model, ollamaModel: s.ollamaModel, language: s.language,
    hasKey: !!getApiKey(), models: MODELS, hotkey: 'Strg+Umschalt+Leertaste',
  };
});
ipcMain.handle('ollama-models', async () => {
  try { return { ok: true, models: await ollamaModels() }; } catch { return { ok: false, models: [] }; }
});
ipcMain.handle('save-settings', (_e, { provider, apiKey, model, ollamaModel, language }) => {
  if (apiKey) setApiKey(apiKey.trim());
  const s = loadSettings();
  if (provider === 'claude' || provider === 'ollama') s.provider = provider;
  if (ollamaModel) s.ollamaModel = ollamaModel.trim();
  if (model && MODELS[model]) s.model = model;
  if (language) s.language = language;
  saveSettings(s);
  return true;
});
ipcMain.handle('open-external', (_e, url) => {
  if (url.startsWith('https://')) shell.openExternal(url);
});

ipcMain.on('bubble-menu', () => {
  Menu.buildFromTemplate([
    { label: 'Zwischenablage analysieren', accelerator: HOTKEY, click: analyzeClipboard },
    { label: 'Datei öffnen …', click: pickFile },
    { label: 'Analysefenster öffnen', click: () => createMain().show() },
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
  const c = screen.getCursorScreenPoint();
  const [x] = bubbleWin.getPosition();
  drag = { cx: c.x, cy: c.y, x, length: Number(length) || 90, cur: Number(length) || 90, moved: false };
  drag.timer = setInterval(() => {
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
ipcMain.handle('rig-drag-end', () => {
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
});

// ---------- Automatische Updates (GitHub Releases) ----------

let manualUpdateCheck = false;

function setupUpdates() {
  if (!app.isPackaged) return; // nur in der installierten App
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('update-downloaded', async (info) => {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      title: 'Silkreader-Update',
      message: `Silkreader ${info.version} ist da! 🕷`,
      detail: 'Jetzt neu starten und aktualisieren? Sonst wird das Update automatisch beim nächsten Beenden installiert.',
      buttons: ['Jetzt neu starten', 'Später'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) autoUpdater.quitAndInstall(true, true);
  });
  autoUpdater.on('update-not-available', () => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: `Du hast die neueste Version (${app.getVersion()}).` });
  });
  autoUpdater.on('update-available', (info) => {
    if (!manualUpdateCheck) return;
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: `Version ${info.version} wird im Hintergrund heruntergeladen …` });
  });
  autoUpdater.on('error', (e) => {
    console.error('Update-Fehler:', e);
    if (!manualUpdateCheck) return; // automatische Prüfungen scheitern still (z. B. offline)
    manualUpdateCheck = false;
    dialog.showMessageBox({ type: 'warning', title: 'Silkreader', message: 'Die Update-Prüfung hat nicht geklappt.', detail: String(e.message || e).slice(0, 400) });
  });

  const check = () => autoUpdater.checkForUpdates().catch(() => {});
  setTimeout(check, 15000);
  setInterval(check, 4 * 60 * 60 * 1000);
}

function checkUpdatesNow() {
  if (!app.isPackaged) {
    dialog.showMessageBox({ type: 'info', title: 'Silkreader', message: 'Updates gibt es nur in der installierten App.' });
    return;
  }
  manualUpdateCheck = true;
  autoUpdater.checkForUpdates().catch(() => {});
}

// ---------- Start ----------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => { bubbleWin?.show(); createMain().show(); });

  app.whenReady().then(() => {
    createBubble();

    const icon = nativeImage.createFromPath(path.join(__dirname, 'assets', 'tray.png'));
    tray = new Tray(icon);
    tray.setToolTip(`Silkreader ${app.getVersion()}`);
    tray.setContextMenu(Menu.buildFromTemplate([
      { label: 'Spinne anzeigen', click: () => bubbleWin.show() },
      { label: 'Zwischenablage analysieren', click: analyzeClipboard },
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

    globalShortcut.register(HOTKEY, analyzeClipboard);
    setupUpdates();

    const s = loadSettings();
    if (s.provider === 'claude' && !getApiKey()) openSettings();
    if (s.provider === 'ollama') ollamaModels().then((m) => { if (!m.length) openSettings(); }).catch(openSettings);
  });

  app.on('will-quit', () => globalShortcut.unregisterAll());
  // Die App läuft im Hintergrund weiter, solange die Spinne da ist.
  app.on('window-all-closed', (e) => e?.preventDefault?.());
}
