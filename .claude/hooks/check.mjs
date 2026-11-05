// Claude-Code-Hook: schützt einige Dateien und prüft die Syntax nach jeder Änderung.
// PreToolUse:  sperrt Änderungen an package-lock.json und src/legal/ (Exit-Code 2 = blockiert).
// PostToolUse: node --check für .js/.mjs/.cjs, bash -n für .sh. Fehler gehen an Claude zurück.
import { spawnSync } from 'node:child_process';
import path from 'node:path';

let raw = '';
for await (const chunk of process.stdin) raw += chunk;
let input;
try { input = JSON.parse(raw); } catch { process.exit(0); }

const file = input?.tool_input?.file_path || input?.tool_input?.notebook_path;
if (!file) process.exit(0);
const rel = path.relative(input.cwd || process.cwd(), file).split(path.sep).join('/');

if (input.hook_event_name === 'PreToolUse') {
  if (rel === 'package-lock.json' || rel.startsWith('src/legal/')) {
    console.error(`${rel} ist geschützt. package-lock.json nur über npm ändern, src/legal/ nur über "npm run notices".`);
    process.exit(2);
  }
  process.exit(0);
}

let res;
if (/\.(m|c)?js$/.test(file)) res = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
else if (file.endsWith('.sh')) res = spawnSync('bash', ['-n', file], { encoding: 'utf8' });
if (res && !res.error && res.status !== 0) {
  console.error(`Syntaxfehler in ${rel}:\n${(res.stderr || res.stdout).trim()}`);
  process.exit(2);
}
