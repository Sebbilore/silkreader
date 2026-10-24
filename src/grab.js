// Markierten Text aus dem gerade aktiven Programm holen – ohne dass man selbst Strg+C drücken muss.
// Dazu wird kurz Strg+C an das aktive Fenster geschickt, der Text gelesen und die alte
// Zwischenablage danach wiederhergestellt.

const { clipboard, ClipboardItem } = require('electron');
const { execFile, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');
const winkeys = require('./winkeys');
const { psEnv } = require('./psenv');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let log = () => {};
const setLogger = (fn) => { log = fn; };

function run(cmd, args, timeout = 4000) {
  return new Promise((resolve) => {
    execFile(cmd, args, { windowsHide: true, timeout, env: psEnv() }, (err, stdout) => resolve(err ? null : String(stdout)));
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
  [DllImport("user32.dll")] static extern uint GetClipboardSequenceNumber();
  public static uint Seq() { return GetClipboardSequenceNumber(); }
  public static bool LeftDown() { return (GetAsyncKeyState(0x01) & 0x8000) != 0; }
  static bool Down(int vk) { return (GetAsyncKeyState(vk) & 0x8000) != 0; }
  // Verhindert, dass das Loslassen von Alt die Menüleiste des Programms öffnet (unbelegte Taste 0xE8)
  public static void MaskMenu() { keybd_event(0xE8, 0, 0, UIntPtr.Zero); keybd_event(0xE8, 0, 2, UIntPtr.Zero); }
  // Warten, bis Umschalt, Strg, Alt und Windows-Taste losgelassen sind
  public static void WaitModifiersUp(int ms) {
    DateTime until = DateTime.Now.AddMilliseconds(ms);
    while (DateTime.Now < until) {
      if (!Down(0x10) && !Down(0x11) && !Down(0x12) && !Down(0x5B) && !Down(0x5C)) return;
      System.Threading.Thread.Sleep(15);
    }
  }
  public static void Copy() {
    keybd_event(0x11, 0x1D, 0, UIntPtr.Zero);
    keybd_event(0x43, 0x2E, 0, UIntPtr.Zero);
    keybd_event(0x43, 0x2E, 2, UIntPtr.Zero);
    keybd_event(0x11, 0x1D, 2, UIntPtr.Zero);
  }
}
"@
try { Add-Type -AssemblyName System.Windows.Forms } catch { }
# Wo steht der markierte Text auf dem Bildschirm? (UI Automation – wie Bildschirmleser)
$uia = $true
try {
Add-Type -ReferencedAssemblies UIAutomationClient, UIAutomationTypes, WindowsBase -TypeDefinition @"
using System;
using System.Text;
using System.Globalization;
using System.Windows.Automation;
using System.Windows.Automation.Text;
public static class SilkText {
  static string R(System.Windows.Rect rc) {
    return string.Format(CultureInfo.InvariantCulture, "[{0:0},{1:0},{2:0},{3:0}]", rc.X, rc.Y, rc.Width, rc.Height);
  }
  static TextPattern Find() {
    AutomationElement el = AutomationElement.FocusedElement;
    TextPattern tp = null;
    for (int i = 0; el != null && i < 8 && tp == null; i++) {
      object p;
      if (el.TryGetCurrentPattern(TextPattern.Pattern, out p)) tp = (TextPattern)p;
      else el = TreeWalker.ControlViewWalker.GetParent(el);
    }
    return tp;
  }
  // Markierten Text direkt vom Programm erfragen – ganz ohne Tastendruck (Base64, "-" = nichts)
  public static string SelectedText(int max) {
    try {
      TextPattern tp = Find();
      if (tp == null) return "-";
      TextPatternRange[] sels = tp.GetSelection();
      if (sels == null || sels.Length == 0) return "-";
      StringBuilder sb = new StringBuilder();
      foreach (TextPatternRange s in sels) { sb.Append(s.GetText(max)); if (sb.Length >= max) break; }
      string t = sb.ToString();
      if (t.Trim().Length == 0) return "-";
      return Convert.ToBase64String(Encoding.UTF8.GetBytes(t));
    } catch { return "-"; }
  }
  public static string Selection(int max) {
    try {
      TextPattern tp = Find();
      if (tp == null) return "{}";
      TextPatternRange[] sels = tp.GetSelection();
      if (sels == null || sels.Length == 0) return "{}";
      TextPatternRange sel = sels[0];
      StringBuilder lines = new StringBuilder();
      foreach (System.Windows.Rect rc in sel.GetBoundingRectangles()) {
        if (rc.Width > 1 && rc.Height > 1) { if (lines.Length > 0) lines.Append(','); lines.Append(R(rc)); }
      }
      StringBuilder words = new StringBuilder();
      int n = 0;
      TextPatternRange r = sel.Clone();
      r.MoveEndpointByRange(TextPatternRangeEndpoint.End, r, TextPatternRangeEndpoint.Start);
      DateTime until = DateTime.Now.AddMilliseconds(1500);
      while (n < max && DateTime.Now < until) {
        r.ExpandToEnclosingUnit(TextUnit.Word);
        if (r.CompareEndpoints(TextPatternRangeEndpoint.Start, sel, TextPatternRangeEndpoint.End) >= 0) break;
        foreach (System.Windows.Rect rc in r.GetBoundingRectangles()) {
          if (rc.Width > 1 && rc.Height > 1) { if (n > 0) words.Append(','); words.Append(R(rc)); n++; }
        }
        if (r.Move(TextUnit.Word, 1) == 0) break;
      }
      return "{\\"lines\\":[" + lines.ToString() + "],\\"words\\":[" + words.ToString() + "]}";
    } catch { return "{}"; }
  }
}
"@
} catch { $uia = $false }
[Console]::Out.WriteLine('ready')
while ($true) {
  $line = [Console]::In.ReadLine()
  if ($line -eq $null) { break }
  try {
    if ($line -eq 'copy') { [SilkKeys]::Copy(); [Console]::Out.WriteLine('ok') }
    elseif ($line -eq 'hotcopy') { [SilkKeys]::MaskMenu(); [SilkKeys]::WaitModifiersUp(2000); Start-Sleep -Milliseconds 40; [SilkKeys]::Copy(); [Console]::Out.WriteLine('ok') }
    elseif ($line -eq 'seltext') { if ($uia) { [Console]::Out.WriteLine([SilkText]::SelectedText(300000)) } else { [Console]::Out.WriteLine('-') } }
    elseif ($line -eq 'diag') { [Console]::Out.WriteLine("uia=$uia ps=$($PSVersionTable.PSVersion)") }
    elseif ($line -eq 'seq') { [Console]::Out.WriteLine([SilkKeys]::Seq()) }
    elseif ($line -eq 'files') { $l = [System.Windows.Forms.Clipboard]::GetFileDropList(); [Console]::Out.WriteLine((@($l) -join '|')) }
    elseif ($line -eq 'rects') { if ($uia) { [Console]::Out.WriteLine([SilkText]::Selection(160)) } else { [Console]::Out.WriteLine('{}') } }
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
  const proc = spawn('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true, env: psEnv() });
  const h = { proc, ready: false, waiting: [], buf: '' };
  proc.stdout.on('data', (d) => {
    h.buf += d;
    let nl;
    while ((nl = h.buf.indexOf('\n')) >= 0) {
      const line = h.buf.slice(0, nl).trim();
      h.buf = h.buf.slice(nl + 1);
      if (line === 'ready') { h.ready = true; log('PowerShell-Helfer bereit'); }
      else if (line) h.waiting.shift()?.(line);
    }
  });
  let errText = '';
  proc.stderr?.on('data', (d) => { if (errText.length < 600) errText += d; });
  const reset = (why) => {
    log(`PowerShell-Helfer beendet (${why}) ${errText.replace(/\s+/g, ' ').slice(0, 500)}`);
    h.waiting.splice(0).forEach((r) => r());
    if (helper === h) helper = null;
  };
  proc.on('exit', (code) => reset(`Code ${code}`));
  proc.on('error', (e) => reset(e.message));
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

const windowsCopy = (hotkey) => helperCommand(hotkey ? 'hotcopy' : 'copy', hotkey ? 4500 : 2500); // beim ersten Mal startet der Helfer ggf. noch

/**
 * Bildschirm-Rechtecke der markierten Wörter (und Zeilen) im aktiven Programm.
 * Liefert { words: [[x,y,w,h]…], lines: […] } in Bildschirmpixeln oder null.
 */
async function selectionRects() {
  if (process.platform !== 'win32' || !helper?.ready) return null;
  const r = await helperCommand('rects', 2500);
  try {
    const j = JSON.parse(r || '{}');
    return j.words?.length || j.lines?.length ? j : null;
  } catch { return null; }
}

/** Ist die linke Maustaste gerade gedrückt? (null = unbekannt, z. B. nicht Windows) */
async function isMouseDown() {
  if (process.platform !== 'win32') return null;
  if (winkeys.load()) return winkeys.leftDown();
  if (!helper) { startWindowsHelper(); return null; } // Helfer (neu) starten, nächstes Mal klappt's
  if (!helper.ready) return null;
  const r = await helperCommand('btn', 300);
  return r === 'down' ? true : r === 'up' ? false : null;
}

/** Startet den Windows-Helfer vorab, damit der erste Klick nicht warten muss. */
function warmUp() {
  if (process.platform !== 'win32') return;
  log(winkeys.load() ? 'Tastatur: direkt über Windows (user32)' : `Tastatur: PowerShell-Helfer (user32 nicht ladbar: ${winkeys.load.error?.message || '?'})`);
  startWindowsHelper();
}

function sendCopyKeystroke(hotkey) {
  if (process.platform === 'win32') return winkeys.load() ? winkeys.copy(hotkey) : windowsCopy(hotkey);
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
// Eigene Zwischenablage-Aktionen sollen den "Strg+C → ins Netz"-Wächter nicht auslösen
let ownClipboardUntil = 0;
const ownClipboardActive = () => Date.now() < ownClipboardUntil;

/** Zähler, den Windows bei jeder Änderung der Zwischenablage erhöht (sehr billig abzufragen). */
/** Zustand des PowerShell-Helfers (für die Tests): z. B. "uia=True ps=5.1…" */
async function helperDiag() {
  if (process.platform !== 'win32' || !helper?.ready) return null;
  return helperCommand('diag', 3000);
}

async function clipboardSeq() {
  if (process.platform !== 'win32') return null;
  if (winkeys.load()) return winkeys.clipboardSeq();
  if (!helper?.ready) return null;
  const r = await helperCommand('seq', 500);
  return r && /^\d+$/.test(r) ? Number(r) : null;
}

/** Markierten Text über UI Automation lesen (kein Strg+C nötig). null = unbekannt/nichts. */
async function uiaSelectedText() {
  if (process.platform !== 'win32' || !helper?.ready) return null;
  const r = await helperCommand('seltext', 1500);
  if (!r || r === '-' || r === 'err') return null;
  try { const t = Buffer.from(r, 'base64').toString('utf8').trim(); return t || null; } catch { return null; }
}

async function grabSelection({ hotkey = false, noUia = false } = {}) {
  // 1. Weg: das Programm direkt fragen – zuverlässig auch bei Tastenkürzeln, Zwischenablage bleibt unberührt
  const direct = noUia ? null : await uiaSelectedText();
  log(`Auswahl per UI Automation: ${direct ? `${direct.length} Zeichen` : 'nichts'}`);
  if (direct && direct.length > 1) return { text: direct, files: [] };
  ownClipboardUntil = Date.now() + 6000;
  // Per Tastenkürzel ausgelöst: Auf Windows wartet der Helfer selbst, bis die Tasten losgelassen sind
  if (hotkey && process.platform !== 'win32') await sleep(350);
  const before = await snapshotClipboard();
  const marker = `silkreader-marker-${Date.now()}-${Math.random()}`;
  await clipboard.writeText(marker);
  const seq0 = winkeys.load() ? winkeys.clipboardSeq() : null;
  await sendCopyKeystroke(hotkey);

  let text = null;
  for (let i = 0; i < 30; i++) { // manche Programme (Word, Browser) brauchen etwas länger
    await sleep(40);
    // Windows zählt jede Änderung der Zwischenablage: bleibt der Zähler stehen, wurde nichts kopiert → nicht unnötig warten
    if (seq0 !== null && winkeys.clipboardSeq() === seq0) { if (i >= 8) break; continue; }
    const t = await clipboard.readText();
    if (t !== marker) { text = t; break; }
  }
  // Wurden Dateien kopiert (z. B. im Explorer markiert)?
  let files = [];
  if (!text || !text.trim()) files = await readClipboardFiles();
  await restoreClipboard(before);
  log(`Auswahl per Strg+C: ${text && text !== marker ? `${text.length} Zeichen` : 'nichts'}, Dateien: ${files.length}`);
  ownClipboardUntil = Date.now() + 1500;
  return { text: text && text.trim() ? text.trim() : null, files };
}

async function readClipboardFiles() {
  if (process.platform !== 'win32') return [];
  if (helper?.ready) {
    // schnell über den Helfer (läuft schon)
    const r = await helperCommand('files', 1500);
    if (r !== null && r !== 'err') return r.split('|').map((x) => x.trim()).filter((p) => p && fs.existsSync(p));
  }
  const out = await run('powershell', ['-NoProfile', '-NonInteractive', '-Command',
    'Get-Clipboard -Format FileDropList | ForEach-Object { $_.FullName }']);
  return out ? out.split(/\r?\n/).map((s) => s.trim()).filter((p) => p && fs.existsSync(p)) : [];
}

/** Legt eine Datei in die Zwischenablage, sodass man sie im Explorer/Mail mit Strg+V einfügen kann. */
async function copyFileToClipboard(filePath) {
  ownClipboardUntil = Date.now() + 3000;
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

module.exports = { setLogger, helperDiag, uiaSelectedText, grabSelection, copyFileToClipboard, warmUp, isMouseDown, selectionRects, clipboardSeq, readClipboardFiles, ownClipboardActive, helperAvailable: () => process.platform === 'win32' && (!!winkeys.load() || !!helper?.ready) };
