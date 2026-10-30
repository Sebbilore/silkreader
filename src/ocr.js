// Texterkennung (OCR) mit der in Windows eingebauten Texterkennung (Windows.Media.Ocr).
// Kein Download, keine Internetverbindung nötig. Läuft über Windows PowerShell 5.1.

const { psEnv } = require('./psenv');
const { execFile } = require('child_process');

const OCR_SCRIPT = (file) => `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('${file.replace(/'/g, "''")}')) ([Windows.Storage.StorageFile])
$stream = Await ($file.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
$decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($stream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
$result.Lines | ForEach-Object { $_.Text }
`;

// macOS: Apples eingebaute Texterkennung (Vision), offline – über JavaScript for Automation, ohne Zusatzprogramm
const MAC_OCR = `
ObjC.import('Vision'); ObjC.import('AppKit');
function run(argv) {
  const url = $.NSURL.fileURLWithPath(argv[0]);
  const handler = $.VNImageRequestHandler.alloc.initWithURLOptions(url, $.NSDictionary.dictionary);
  const req = $.VNRecognizeTextRequest.alloc.init;
  req.recognitionLevel = 0; // genau
  req.usesLanguageCorrection = true;
  try { req.recognitionLanguages = $(['de-DE', 'en-US']); } catch (e) {}
  if (!handler.performRequestsError($([req]), null)) return '';
  const out = [];
  const res = req.results;
  for (let i = 0; i < res.count; i++) { const c = res.objectAtIndex(i).topCandidates(1); if (c.count) out.push(c.objectAtIndex(0).string.js); }
  return out.join('\\n');
}`;
function recognizeTextMac(file) {
  return new Promise((resolve) => {
    execFile('osascript', ['-l', 'JavaScript', '-e', MAC_OCR, file], { timeout: 30000, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => resolve(err ? '' : String(stdout).replace(/\\n/g, '\n').trim()));
  });
}

/** Liefert den erkannten Text oder '' (z. B. keine Texterkennung verfügbar). */
async function recognizeText(file) {
  if (process.platform === 'darwin') return recognizeTextMac(file);
  if (process.platform !== 'win32') return '';
  // Läuft der PowerShell-Helfer schon, erkennt er den Text – ohne eine neue PowerShell zu starten
  const fast = await require('./grab').helperOcr(file);
  if (fast !== null) return fast;
  return recognizeTextSpawn(file);
}
function recognizeTextSpawn(file) {
  const encoded = Buffer.from(OCR_SCRIPT(file), 'utf16le').toString('base64');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: 30000, encoding: 'utf8', maxBuffer: 10 * 1024 * 1024, env: psEnv() },
      (err, stdout) => resolve(err ? '' : String(stdout).trim()));
  });
}

// Gescannte PDFs: jede Seite mit der in Windows eingebauten PDF-Anzeige (Windows.Data.Pdf) als Bild
// berechnen und dann mit der Texterkennung lesen. Seiten werden durch @@SEITE@@ getrennt ausgegeben.
const PDF_SCRIPT = (file, maxPages) => `
$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$ext = [System.WindowsRuntimeSystemExtensions].GetMethods()
$asTask = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
$asAction = ($ext | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncAction' })[0]
function Await($op, [Type]$type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
function AwaitAction($op) { $t = $asAction.Invoke($null, @($op)); $t.Wait(-1) | Out-Null }
$null = [Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfDocument, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Data.Pdf.PdfPageRenderOptions, Windows.Data.Pdf, ContentType = WindowsRuntime]
$null = [Windows.Storage.Streams.InMemoryRandomAccessStream, Windows.Storage.Streams, ContentType = WindowsRuntime]
$null = [Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
$null = [Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
$file = Await ([Windows.Storage.StorageFile]::GetFileFromPathAsync('${file.replace(/'/g, "''")}')) ([Windows.Storage.StorageFile])
$pdf = Await ([Windows.Data.Pdf.PdfDocument]::LoadFromFileAsync($file)) ([Windows.Data.Pdf.PdfDocument])
$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
$n = [Math]::Min([int]$pdf.PageCount, ${maxPages})
for ($i = 0; $i -lt $n; $i++) {
  $page = $pdf.GetPage([uint32]$i)
  $opts = New-Object Windows.Data.Pdf.PdfPageRenderOptions
  $opts.DestinationWidth = [uint32][Math]::Min(2400, [Math]::Max(1200, $page.Size.Width * 2.5))
  $ms = New-Object Windows.Storage.Streams.InMemoryRandomAccessStream
  AwaitAction ($page.RenderToStreamAsync($ms, $opts))
  $decoder = Await ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($ms)) ([Windows.Graphics.Imaging.BitmapDecoder])
  $bitmap = Await ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
  $result = Await ($engine.RecognizeAsync($bitmap)) ([Windows.Media.Ocr.OcrResult])
  [Console]::Out.WriteLine('@@SEITE@@')
  $result.Lines | ForEach-Object { $_.Text }
}
`;

/** Liest eine gescannte PDF per Texterkennung. Liefert eine Liste von Seitentexten (leer, wenn nicht möglich). */
function recognizePdf(file, maxPages = 30) {
  if (process.platform !== 'win32') return Promise.resolve([]);
  const encoded = Buffer.from(PDF_SCRIPT(file, maxPages), 'utf16le').toString('base64');
  return new Promise((resolve) => {
    execFile('powershell', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded],
      { windowsHide: true, timeout: 180000, encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, env: psEnv() },
      (err, stdout) => resolve(err ? [] : String(stdout).split('@@SEITE@@').slice(1).map((t) => t.trim())));
  });
}

module.exports = { recognizeText, recognizeTextSpawn, recognizePdf };
