// Markierten Text aus dem gerade aktiven Programm holen – ohne dass man selbst Strg+C drücken muss.
// Dazu wird kurz Strg+C an das aktive Fenster geschickt, der Text gelesen und die alte
// Zwischenablage danach wiederhergestellt.

const { clipboard, ClipboardItem } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let sendKeysScript = null;

function run(cmd, args, timeout = 4000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout }, (err, stdout) => resolve(err ? null : String(stdout)));
  });
}

function sendCopyKeystroke() {
  if (process.platform === 'win32') {
    if (!sendKeysScript) {
      sendKeysScript = path.join(os.tmpdir(), 'silkreader-copy.js');
      fs.writeFileSync(sendKeysScript, 'WScript.CreateObject("WScript.Shell").SendKeys("^c");');
    }
    return run('cscript', ['//nologo', '//E:jscript', sendKeysScript]);
  }
  if (process.platform === 'darwin') {
    return run('osascript', ['-e', 'tell application "System Events" to keystroke "c" using command down']);
  }
  return run('xdotool', ['key', '--clearmodifiers', 'ctrl+c']);
}

// Alte Zwischenablage merken (Text und Bilder). Dateien lassen sich so nicht sichern.
async function snapshotClipboard() {
  const snap = { text: null, image: null };
  try {
    snap.text = await clipboard.readText();
    const [item] = await clipboard.read();
    if (item?.types.includes('image/png')) snap.image = await item.getType('image/png');
  } catch { /* leer oder nicht lesbar */ }
  return snap;
}

async function restoreClipboard(snap) {
  try {
    if (snap.image) {
      const data = { 'image/png': snap.image };
      if (snap.text) data['text/plain'] = snap.text;
      await clipboard.write([new ClipboardItem(data)]);
    } else if (snap.text) {
      await clipboard.writeText(snap.text);
    } else {
      clipboard.clear();
    }
  } catch { /* nicht wiederherstellbar – dann bleibt der markierte Text drin */ }
}

/**
 * Holt den markierten Text bzw. die markierten Dateien.
 * @param {{ waitForKeys?: number }} opts  waitForKeys: kurz warten, bis Tastenkürzel losgelassen sind
 * @returns {Promise<{ text: string|null, files: string[] }>}
 */
async function grabSelection({ waitForKeys = 0 } = {}) {
  if (waitForKeys) await sleep(waitForKeys);
  const before = await snapshotClipboard();
  const marker = `silkreader-marker-${Date.now()}-${Math.random()}`;
  await clipboard.writeText(marker);
  await sendCopyKeystroke();

  let text = null;
  for (let i = 0; i < 15; i++) {
    await sleep(40);
    const t = await clipboard.readText();
    if (t !== marker) { text = t; break; }
  }
  // Wurden Dateien kopiert (z. B. im Explorer markiert)?
  let files = [];
  if (!text || !text.trim()) files = await readClipboardFiles();
  await restoreClipboard(before);
  return { text: text && text.trim() ? text.trim() : null, files };
}

async function readClipboardFiles() {
  if (process.platform !== 'win32') return [];
  const out = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command',
    'Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }']);
  return out ? out.split(/\r?\n/).map((s) => s.trim()).filter((p) => p && fs.existsSync(p)) : [];
}

/** Legt eine Datei in die Zwischenablage, sodass man sie im Explorer/Mail mit Strg+V einfügen kann. */
async function copyFileToClipboard(filePath) {
  if (process.platform === 'win32') {
    const escaped = filePath.replace(/'/g, "''");
    return (await run('powershell', ['-NoProfile', '-NonInteractive', '-Command', `Set-Clipboard -Path '${escaped}'`])) !== null;
  }
  if (process.platform === 'darwin') {
    return (await run('osascript', ['-e', `set the clipboard to (POSIX file "${filePath.replace(/"/g, '\\"')}")`])) !== null;
  }
  await clipboard.writeText(filePath);
  return true;
}

module.exports = { grabSelection, copyFileToClipboard };
