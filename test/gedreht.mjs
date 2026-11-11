// Auswahl bei gedrehten Scans: aufrechter Text zählt deutlich mehr als Kauderwelsch einer falschen Drehung
import { createRequire } from 'module';
import assert from 'assert';
const { ocrScore, GOOD, PS_RECOG } = createRequire(import.meta.url)('../src/ocrps.js');
const upright = 'Sehr geehrte Frau Beispiel, hiermit teilen wir Ihnen mit, dass die Rechnung bezahlt wurde.';
const sideways = 'S e h r  g e e h r t e  1 l I |  i, ~ Il 0 O ,  . ; r f';
const watermark = 'Mit CamScanner gescannt';
assert.ok(ocrScore(upright) >= GOOD, 'aufrechter Text ist gut genug');
assert.ok(ocrScore(sideways) < ocrScore(upright) / 4, 'gedrehter Text ergibt viel weniger Punkte');
assert.ok(ocrScore(watermark) < GOOD, 'nur Wasserzeichen ist zu wenig: es wird gedreht probiert');
assert.equal(ocrScore(''), 0);
assert.ok(PS_RECOG.includes('\\p{L}{3,}') && PS_RECOG.includes(`-ge ${GOOD}`), 'PowerShell nutzt dieselben Werte');
assert.ok(PS_RECOG.includes('$script:silkRot'), 'PDF: Drehung der ersten Seite wird gemerkt');
console.log('OK  gedrehte Scans: Auswahl');
