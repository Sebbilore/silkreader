// Markierten Text aus dem gerade aktiven Programm holen – ohne dass man selbst Strg+C drücken muss.
// Dazu wird kurz Strg+C an das aktive Fenster geschickt, der Text gelesen und die alte
// Zwischenablage danach wiederhergestellt.

const { clipboard, ClipboardItem } = require('electron');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function run(cmd, args, timeout = 4000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout }, (err, stdout) => resolve(err ? null : String(stdout)));
  });
}

// Windows: Ein kleiner PowerShell-Helfer läuft im Hintergrund und drückt auf Zuruf Strg+C –
// direkt über die Windows-Tastaturfunktion. (Das alte WScript-SendKeys schaltet bei jedem
// Aufruf NumLock um, deshalb wird es nicht mehr benutzt.)
const PS_HELPER = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public static class SilkKeys {
  [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
  [DllImport("user32.dll")] static extern short GetAsyncKeyState(int vKey);
  public static bool LeftDown() { return (GetAsyncKeyState(0x01) & 0x8000) != 0; }
  public static void Copy() {
    keybd_event(0x11, 0x1D, 0, UIntPtr.Zero);
    keybd_event(0x43, 0x2E, 0, UIntPtr.Zero);
    keybd_event(0x43, 0x2E, 2, UIntPtr.Zero);
    keybd_event(0x11, 0x1D, 2, UIntPtr.Zero);
  }
}
"@
[Console]::Out.WriteLine('ready')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  try {
    if ($line -eq 'copy') { [SilkKeys]::Copy(); [Console]::Out.WriteLine('ok') }
    elseif ($line -eq 'btn') { if ([SilkKeys]::LeftDown()) { [Console]::Out.WriteLine('down') } else { [Console]::Out.WriteLine('up') } }
    else { [Console]::Out.WriteLine('ok') }
  } catch { [Console]::Out.WriteLine('err') }
}
`;

let helper = null;
function startWindowsHelper() {
  if (helper) return helper;
  // Als -EncodedCommand statt als Skriptdatei: so greifen keine Skript-Sperren (Execution Policy).
  const encoded = Buffer.from(PS_HELPER, 'utf16le').toString('base64');
  const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true });
  const h = { proc, ready: false, waiting: [], buf: '' };
  proc.stdout.on('data', (d) => {
    h.buf += d;
    let nl;
    while ((nl = h.buf.indexOf('\n')) >= 0) {
      const line = h.buf.slice(0, nl).trim();
      h.buf = h.buf.slice(nl + 1);
      if (line === 'ready') h.ready = true;
      else if (line) h.waiting.shift()?.(line);
    }
  });
  const reset = () => { h.waiting.splice(0).forEach((r) => r()); if (helper === h) helper = null; };
  proc.on('exit', reset);
  proc.on('error', reset);
  helper = h;
  return h;
}

// Schickt einen Befehl an den Helfer und wartet auf seine eine Antwortzeile.
function helperCommand(cmd, timeoutMs) {
  return new Promise((resolve) => {
    const h = startWindowsHelper();
    let done = false;
    const finish = (v) => { if (!done) { done = true; resolve(v); } };
    const timer = setTimeout(() => finish(null), timeoutMs);
    h.waiting.push((line) => { clearTimeout(timer); finish(line); });
    try { h.proc.stdin.write(`${cmd}\n`); } catch { finish(null); }
  });
}

const windowsCopy = () => helperCommand('copy', 2500); // beim ersten Mal startet der Helfer ggf. noch

/** Ist die linke Maustaste gerade gedrückt? (null = unbekannt, z. B. nicht Windows) */
async function isMouseDown() {
  if (process.platform !== 'win32') return null;
  if (!helper) { startWindowsHelper(); return null; } // Helfer (neu) starten, nächstes Mal klappt's
  if (!helper.ready) return null;
  const r = await helperCommand('btn', 300);
  return r === 'down' ? true : r === 'up' ? false : null;
}

/** Startet den Windows-Helfer vorab, damit der erste Klick nicht warten muss. */
function warmUp() {
  if (process.platform === 'win32') startWindowsHelper();
}

function sendCopyKeystroke() {
  if (process.platform === 'win32') return windowsCopy();
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

module.exports = { grabSelection, copyFileToClipboard, warmUp, isMouseDown, helperAvailable: () => process.platform === 'win32' && !!helper?.ready };
