// Erzeugt src/legal/THIRD_PARTY_NOTICES.txt aus allen Paketen, die in der App landen (ohne Entwicklungswerkzeuge).
// Aufruf: node scripts/notices.mjs
import fs from 'fs';
import path from 'path';

const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const entries = Object.entries(lock.packages)
  .filter(([p, info]) => p.startsWith('node_modules/') && !info.dev && !info.devOptional && !p.includes('-cuda') && !/arm64|armv7l|linux|darwin|mac/.test(p.split('node_modules/').pop()))
  .map(([p, info]) => ({ dir: p, name: p.split('node_modules/').pop(), version: info.version, license: info.license }))
  .sort((a, b) => a.name.localeCompare(b.name));

const licenseText = (dir) => {
  if (!fs.existsSync(dir)) return null;
  const f = fs.readdirSync(dir).find((n) => /^(licen[cs]e|copying)(\.(md|txt))?$/i.test(n));
  return f ? fs.readFileSync(path.join(dir, f), 'utf8').trim() : null;
};

let out = `Silkreader – Lizenzen von Drittanbietern / Third-party notices
=====================================================================

Silkreader selbst steht unter der MIT-Lizenz (siehe LICENSE).
Silkreader enthält bzw. nutzt die folgenden Programme und Bibliotheken anderer Autorinnen und Autoren.
Electron und Chromium bringen ihre eigenen Lizenzdateien mit (LICENSE.electron.txt und LICENSES.chromium.html
im Installationsordner).

KI-Modelle (werden auf Wunsch einmalig aus dem Internet geladen, nicht mit der App ausgeliefert)
-------------------------------------------------------------------------------------------------
- Qwen2.5-1.5B-Instruct (Alibaba Cloud / Qwen Team) – Apache License 2.0
  GGUF-Fassung: bartowski/Qwen2.5-1.5B-Instruct-GGUF
- Qwen3-4B-Instruct-2507 (Alibaba Cloud / Qwen Team) – Apache License 2.0
  GGUF-Fassung: unsloth/Qwen3-4B-Instruct-2507-GGUF
- llama.cpp (Georgi Gerganov und Mitwirkende) – MIT License, enthalten in node-llama-cpp

`;
const seen = new Set();
for (const e of entries) {
  const key = `${e.name}@${e.version}`;
  if (seen.has(key)) continue;
  seen.add(key);
  const text = licenseText(e.dir);
  out += `\n\n${'-'.repeat(72)}\n${e.name} ${e.version}  –  ${e.license || 'siehe Lizenztext'}\n${'-'.repeat(72)}\n`;
  out += text ? `${text}\n` : '(Kein Lizenztext im Paket enthalten – Lizenz laut Paketangabe.)\n';
}
fs.mkdirSync('src/legal', { recursive: true });
fs.writeFileSync('src/legal/THIRD_PARTY_NOTICES.txt', out);
console.log(`${seen.size} Pakete, ${(out.length / 1024).toFixed(0)} KB`);
