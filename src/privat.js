// Privatmodus: beim Beenden alles löschen, was Texte oder Ergebnisse enthält. Einstellungen und Protokolle (Fehler, Zeiten) bleiben.
const fs = require('fs');
const path = require('path');
const FILES = ['history.json', 'bookmarks.json', 'cocoons.json', 'learn.json', 'deadlines.json'];
function wipePrivate(dir) {
  for (const f of FILES) fs.rmSync(path.join(dir, f), { force: true });
  for (const d of ['Cache', 'Session Storage', 'Local Storage']) { try { fs.rmSync(path.join(dir, d), { recursive: true, force: true }); } catch {} } // läuft noch → beim nächsten Start
}
module.exports = { wipePrivate, FILES };
