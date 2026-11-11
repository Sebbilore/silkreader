// Gedrehte Scans: PowerShell-Funktion für die Windows-Texterkennung. Sie liest ein Bild zuerst aufrecht und nur bei
// schlechtem Ergebnis um 90°, 180° und 270° gedreht (spart Zeit), und nimmt die Drehung mit den meisten echten Wörtern.
const WORD = '\\p{L}{3,}'; // „echtes Wort“ = mindestens 3 Buchstaben am Stück
const GOOD = 40; // so viele Wort-Buchstaben reichen: dann ist die Seite richtig herum

/** Punkte für einen erkannten Text: Buchstaben in Wörtern ab 3 Zeichen. Falsch gedrehter Text ergibt fast nur Kauderwelsch. */
const ocrScore = (text) => (String(text).match(new RegExp(WORD, 'gu')) || []).reduce((n, w) => n + w.length, 0);

const PS_RECOG = `
function SilkRecog($decoder, $engine, [bool]$keep = $false) {
  foreach ($n in 'BitmapTransform', 'BitmapRotation', 'ExifOrientationMode', 'ColorManagementMode') { $null = Invoke-Expression "[Windows.Graphics.Imaging.$n, Windows.Graphics, ContentType = WindowsRuntime]" }
  $best = ''; $bs = -1
  # PDF: die Drehung der ersten Seite zuerst probieren; reicht sie, ist die Seite fertig (spart 3/4 der Zeit)
  $order = if ($keep -and $null -ne $script:silkRot) { @($script:silkRot) + @(0..3 | Where-Object { $_ -ne $script:silkRot }) } else { 0..3 }
  foreach ($r in $order) {
    $tr = New-Object Windows.Graphics.Imaging.BitmapTransform
    $tr.Rotation = [Windows.Graphics.Imaging.BitmapRotation]$r
    $t = $asTask.MakeGenericMethod([Windows.Graphics.Imaging.SoftwareBitmap]).Invoke($null, @($decoder.GetSoftwareBitmapAsync($decoder.BitmapPixelFormat, $decoder.BitmapAlphaMode, $tr, [Windows.Graphics.Imaging.ExifOrientationMode]::RespectExifOrientation, [Windows.Graphics.Imaging.ColorManagementMode]::DoNotColorManage)))
    $t.Wait(-1) | Out-Null
    $t2 = $asTask.MakeGenericMethod([Windows.Media.Ocr.OcrResult]).Invoke($null, @($engine.RecognizeAsync($t.Result)))
    $t2.Wait(-1) | Out-Null
    $text = ($t2.Result.Lines | ForEach-Object { $_.Text }) -join [char]10
    $s = 0
    foreach ($m in [regex]::Matches($text, '${WORD}')) { $s += $m.Length }
    if ($s -gt $bs) { $best = $text; $bs = $s; if ($keep) { $script:silkRot = $r } }
    if ($bs -ge ${GOOD}) { break }
  }
  return $best
}
`;

module.exports = { PS_RECOG, ocrScore, GOOD };
