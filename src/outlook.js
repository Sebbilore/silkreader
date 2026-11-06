// Klassisches Outlook (Windows): nur die gerade geöffnete oder allein markierte Mail lesen.
// Lokal per COM (PowerShell), ohne Anmeldung, nichts im Hintergrund, keine anderen Mails.
// Das neue Outlook hat keine solche Schnittstelle – dort bleibt Markieren oder Bildschirmbereich.
const { execFile } = require('child_process');
const { psEnv } = require('./psenv');

// GetActiveObject startet Outlook nicht, sondern verbindet sich nur mit einem laufenden.
const SCRIPT = `$ErrorActionPreference='Stop'
[Console]::OutputEncoding=[Text.Encoding]::UTF8
try { $o=[Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application') } catch { 'NOOUTLOOK'; exit }
$m=$null
try { $i=$o.ActiveInspector(); if($i){ $m=$i.CurrentItem } } catch {}
if(-not $m){ try { $e=$o.ActiveExplorer(); if($e -and $e.Selection.Count -eq 1){ $m=$e.Selection.Item(1) } } catch {} }
if(-not $m -or $m.Class -ne 43){ 'NOMAIL'; exit }
"OK"; $m.Subject; $m.Body`;

// Ausgabe des Skripts → { subject, body } oder { error: 'no-outlook' | 'no-mail' }
function parse(out) {
  const lines = String(out || '').replace(/^﻿/, '').replace(/\r/g, '').split('\n');
  const head = lines[0].trim();
  if (head === 'OK') {
    const body = lines.slice(2).join('\n').trim();
    return body ? { subject: lines[1].trim(), body: body.slice(0, 200000) } : { error: 'no-mail' };
  }
  return { error: head === 'NOMAIL' ? 'no-mail' : 'no-outlook' };
}

function readOpenMail() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') return resolve({ error: 'no-outlook' });
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-Command', SCRIPT], { windowsHide: true, timeout: 15000, maxBuffer: 20e6, env: psEnv() },
      (err, out) => resolve(err ? { error: 'no-outlook' } : parse(out)));
  });
}

module.exports = { readOpenMail, parse };
