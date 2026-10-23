// Tastendrücke und Maus-/Zwischenablage-Status direkt über die Windows-API (user32.dll).
// Läuft im Hauptprozess, ganz ohne PowerShell – klappt daher auch auf Firmen-PCs,
// auf denen PowerShell-Skripte eingeschränkt sind. Fehlt etwas, liefert load() null.

let api;
function load() {
  if (api !== undefined) return api;
  api = null;
  if (process.platform !== 'win32') return api;
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    api = {
      keybd_event: user32.func('void __stdcall keybd_event(uint8_t bVk, uint8_t bScan, uint32_t dwFlags, uintptr_t dwExtraInfo)'),
      GetAsyncKeyState: user32.func('int16_t __stdcall GetAsyncKeyState(int vKey)'),
      GetClipboardSequenceNumber: user32.func('uint32_t __stdcall GetClipboardSequenceNumber()'),
    };
  } catch (e) {
    api = null;
    load.error = e;
  }
  return api;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const down = (vk) => (api.GetAsyncKeyState(vk) & 0x8000) !== 0;

/** Strg+C an das aktive Fenster schicken. Nach einem Tastenkürzel erst warten, bis alle Tasten los sind. */
async function copy(hotkey) {
  if (!load()) return false;
  if (hotkey) {
    // Unbelegte Taste antippen: verhindert, dass das Loslassen von Alt die Menüleiste öffnet
    api.keybd_event(0xe8, 0, 0, 0);
    api.keybd_event(0xe8, 0, 2, 0);
    const until = Date.now() + 2000;
    while (Date.now() < until && [0x10, 0x11, 0x12, 0x5b, 0x5c].some(down)) await sleep(15);
    await sleep(40);
  }
  api.keybd_event(0x11, 0x1d, 0, 0);
  api.keybd_event(0x43, 0x2e, 0, 0);
  api.keybd_event(0x43, 0x2e, 2, 0);
  api.keybd_event(0x11, 0x1d, 2, 0);
  return true;
}

const leftDown = () => (load() ? down(0x01) : null);
const clipboardSeq = () => (load() ? api.GetClipboardSequenceNumber() : null);

module.exports = { load, copy, leftDown, clipboardSeq };
