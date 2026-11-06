// Schneller Test ohne Fenster: Auswertung der Outlook-Ausgabe. node test/outlook.mjs
import { createRequire } from 'module';
const { parse } = createRequire(import.meta.url)('../src/outlook.js');
let bad = 0;
const ok = (n, c) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${n}`); if (!c) bad++; };
const r = parse('﻿OK\r\nZahnarzt Termin\r\nHallo,\r\nIhr Termin ist am 12.11. um 9 Uhr.\r\n');
ok('Betreff und Text', r.subject === 'Zahnarzt Termin' && r.body.includes('12.11.'));
ok('keine Mail', parse('NOMAIL\n').error === 'no-mail');
ok('leerer Text', parse('OK\nBetreff\n\n').error === 'no-mail');
ok('Outlook fehlt (neues Outlook)', parse('NOOUTLOOK').error === 'no-outlook' && parse('').error === 'no-outlook');
process.exit(bad ? 1 : 0);
