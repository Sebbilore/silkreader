// Codeschutz beim Bauen: macht den Programmcode im fertigen Paket schwer lesbar.
// 1. Alle Skripte (auch die in den HTML-Seiten) werden verschleiert: Namen verwürfelt, Texte verschlüsselt.
// 2. Die Programmlogik des Hauptprozesses (Lizenz, Lernen, Analyse …) wird zusätzlich zu V8-Bytecode
//    übersetzt – im Paket liegt dann kein lesbares JavaScript mehr, nur noch ein kleiner Lader.
// Läuft NUR auf einer Wegwerf-Kopie (GitHub Actions) und verändert src/ direkt. Lokal nur mit --force.
const fs = require('fs');
const path = require('path');

if (!process.env.CI && !process.argv.includes('--force')) {
  console.error('protect.js verändert src/ unwiderruflich – nur in der CI oder mit --force auf einer Kopie ausführen.');
  process.exit(1);
}
const root = path.resolve(process.argv.find((a) => a.startsWith('--root='))?.slice(7) || path.join(__dirname, '..'));
const SRC = path.join(root, 'src');
const Obf = require(path.join(root, 'node_modules', 'javascript-obfuscator'));

// Hauptprozess-Module: verschleiert und dann als Bytecode (nur im Hauptprozess geladen)
const BYTECODE = ['main.js', 'pro.js', 'learn.js', 'grab.js', 'ocr.js', 'cocoons.js', 'selectionScan.js', 'winkeys.js', 'psenv.js', 'whatsnew.js'];
// Nicht anfassen: Vorladeskript (läuft in jedem Fenster sehr früh, muss klein und robust bleiben)
const SKIP = ['preload.js'];

const OPTIONS = {
  compact: true,
  identifierNamesGenerator: 'hexadecimal',
  renameGlobals: false, // Fenster teilen sich globale Namen (T, silkIcon, I18N, SilkFacts …)
  stringArray: true,
  stringArrayEncoding: ['base64'],
  stringArrayThreshold: 0.8,
  stringArrayWrappersCount: 1,
  splitStrings: false,
  controlFlowFlattening: false, // würde die Spinnen-Animation bremsen
  deadCodeInjection: false,
  selfDefending: false,
  debugProtection: false,
  transformObjectKeys: false,
  unicodeEscapeSequence: false,
  numbersToExpressions: false,
  simplify: true,
  seed: 7,
};
// Jede Datei bekommt eigene Hilfsnamen – sonst überschreiben sich Skripte, die im selben Fenster laufen
let fileNo = 0;
const obfuscate = (code, target) => Obf.obfuscate(code, { ...OPTIONS, target, identifiersPrefix: `s${(fileNo++).toString(36)}`, seed: 7 + fileNo }).getObfuscatedCode();

let count = 0;
// 1) Skript-Dateien
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.js') && !SKIP.includes(x))) {
  const p = path.join(SRC, f);
  const code = fs.readFileSync(p, 'utf8');
  fs.writeFileSync(p, obfuscate(code, BYTECODE.includes(f) ? 'node' : 'browser-no-eval'));
  count++;
}
// 2) Skripte in den HTML-Seiten (nicht die mit src=… oder fremdem Typ)
for (const f of fs.readdirSync(SRC).filter((x) => x.endsWith('.html'))) {
  const p = path.join(SRC, f);
  let html = fs.readFileSync(p, 'utf8');
  let n = 0;
  html = html.replace(/<script(\s[^>]*)?>([\s\S]*?)<\/script>/g, (all, attrs = '', body) => {
    if (/\bsrc=/.test(attrs) || (/\btype=/.test(attrs) && !/type="module"/.test(attrs)) || !body.trim()) return all;
    n++;
    return `<script${attrs}>${obfuscate(body, 'browser-no-eval')}</script>`;
  });
  if (n) { fs.writeFileSync(p, html); count += n; }
}
console.log(`verschleiert: ${count} Skripte`);

// 3) Bytecode für den Hauptprozess (mit derselben Electron-Version, die die App ausliefert)
(async () => {
  const bytenode = require(path.join(root, 'node_modules', 'bytenode'));
  const electronPath = require(path.join(root, 'node_modules', 'electron'));
  for (const f of BYTECODE) {
    const p = path.join(SRC, f);
    if (!fs.existsSync(p)) continue;
    const out = p.replace(/\.js$/, '.jsc');
    await bytenode.compileFile({ filename: p, output: out, electronMain: true, electronPath });
    const name = path.basename(out);
    fs.writeFileSync(p, f === 'main.js'
      ? `require('bytenode');\nrequire('./${name}');\n`
      : `require('bytenode');\nmodule.exports = require('./${name}');\n`);
    console.log(`Bytecode: ${f} → ${name} (${Math.round(fs.statSync(out).size / 1024)} KB)`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
