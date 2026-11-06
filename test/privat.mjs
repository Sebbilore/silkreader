// node test/privat.mjs – Privatmodus löscht Verlauf & Co., behält Einstellungen und Protokolle
import fs from 'fs'; import os from 'os'; import path from 'path'; import assert from 'assert';
import { createRequire } from 'module';
const { wipePrivate, FILES } = createRequire(import.meta.url)('../src/privat.js');
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'silk-'));
for (const f of [...FILES, 'settings.json', 'silkreader-errors.log', 'silkreader-times.log']) fs.writeFileSync(path.join(dir, f), 'x');
fs.mkdirSync(path.join(dir, 'Cache')); fs.writeFileSync(path.join(dir, 'Cache', 'a'), 'x');
wipePrivate(dir);
assert.deepStrictEqual(fs.readdirSync(dir).sort(), ['settings.json', 'silkreader-errors.log', 'silkreader-times.log']);
wipePrivate(dir); // zweimal ohne Fehler
console.log('privat ok');
