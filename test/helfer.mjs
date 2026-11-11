// Antwort des PowerShell-Helfers auf „files“ (nie leer, damit die Warteschlange nicht verrutscht)
import { createRequire } from 'module';
import assert from 'assert';
import fs from 'fs';
// grab.js braucht Electron nur zur Laufzeit; hier genügt eine leere Attrappe
const req = createRequire(import.meta.url);
const Module = req('module');
const load = Module._load;
Module._load = (n, ...a) => (n === 'electron' ? {} : load(n, ...a));
const { parseFilesReply } = createRequire(import.meta.url)('../src/grab.js');
const f = 'test/sample.txt';
assert.deepEqual(parseFilesReply('F'), []);
assert.deepEqual(parseFilesReply(`F${f}|nicht-da.pdf`), [f]);
assert.ok(fs.existsSync(f));
console.log('OK  Helfer-Antwort files');
