// Signiert Windows-Dateien mit osslsigncode (Zertifikat aus CSC_LINK / CSC_KEY_PASSWORD).
// Ohne CSC_LINK wird nicht signiert.
const { execFileSync } = require('child_process');
const fs = require('fs');

exports.default = async function sign(configuration) {
  const pfx = process.env.CSC_LINK;
  if (!pfx) return;
  const file = configuration.path;
  const tmp = `${file}.signed`;
  const args = ['sign', '-pkcs12', pfx, '-pass', process.env.CSC_KEY_PASSWORD || '',
    '-h', 'sha256', '-n', 'Silkreader', '-in', file, '-out', tmp];
  if (process.env.TIMESTAMP_URL) args.push('-ts', process.env.TIMESTAMP_URL);
  execFileSync('osslsigncode', args, { stdio: 'inherit' });
  fs.renameSync(tmp, file);
};
