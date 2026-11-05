# Silkreader Tempo-Test – misst die KI-Geschwindigkeit auf DIESEM Windows-PC (nicht auf dem GitHub-Rechner).
# Richtet alles selbst ein (Quellcode, Bibliotheken, KI-Modelle), startet den Test und schreibt einen Bericht auf den Desktop.
#
# Aufruf (PowerShell):  powershell -ExecutionPolicy Bypass -File scripts\tempo-test.ps1
# Oder ohne Repo:       irm https://raw.githubusercontent.com/Sebbilore/silkreader/main/scripts/tempo-test.ps1 -OutFile tempo-test.ps1; powershell -ExecutionPolicy Bypass -File .\tempo-test.ps1
#
# Braucht: Git und Node.js 22 oder neuer (winget install Git.Git / winget install OpenJS.NodeJS.LTS), ca. 8 GB frei, Internet beim ersten Mal.
# Dauer: erster Lauf 20–40 Minuten (KI-Modelle ca. 4 GB laden), danach etwa 10–25 Minuten.
# Es werden nur Testbriefe aus dem Quellcode gelesen – nichts von deinen Dateien, nichts wird hochgeladen.
param(
  [string]$Ordner = (Join-Path $env:USERPROFILE 'silkreader-tempo'),
  [string]$Modelle = 'fast,quality',      # eingebaute Modelle: fast = schnell, quality = gründlich
  [string]$Tempo = 'alles'                # Tempo-Schalter (siehe test/bench.mjs), Standard = wie in der App
)
$ErrorActionPreference = 'Stop'
$ProgressPreference = 'SilentlyContinue'

function Brauche($name, $hinweis) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) { throw "$name fehlt. $hinweis" }
}
Brauche git 'Installieren mit: winget install Git.Git'
Brauche node 'Installieren mit: winget install OpenJS.NodeJS.LTS (Version 22 oder neuer)'
$nodeMajor = [int]((node --version) -replace '^v(\d+)\..*', '$1')
if ($nodeMajor -lt 22) { throw "Node.js $nodeMajor ist zu alt, bitte Version 22 oder neuer installieren." }

# --- Dieser PC (für den Vergleich) ---
$cpu = (Get-CimInstance Win32_Processor | Select-Object -First 1)
$ramGb = [math]::Round((Get-CimInstance Win32_ComputerSystem).TotalPhysicalMemory / 1GB, 1)
$gpu = (Get-CimInstance Win32_VideoController | ForEach-Object { $_.Name }) -join ', '
$netz = (Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue) -ne $null
$pc = [ordered]@{
  'Prozessor' = $cpu.Name.Trim()
  'Kerne / Threads' = "$($cpu.NumberOfCores) / $($cpu.NumberOfLogicalProcessors)"
  'Arbeitsspeicher' = "$ramGb GB"
  'Grafik' = $gpu
  'Windows' = [System.Environment]::OSVersion.VersionString
  'Notebook (Akku)' = $(if ($netz) { 'ja – für faire Werte bitte am Netzteil und im Modus „Beste Leistung“ messen' } else { 'nein' })
  'Datum' = (Get-Date -Format 'dd.MM.yyyy HH:mm')
}
Write-Host "`n=== Dieser PC ===" -ForegroundColor Cyan
$pc.GetEnumerator() | ForEach-Object { Write-Host ("{0,-18} {1}" -f $_.Key, $_.Value) }

# --- Quellcode holen (eigener Ordner, wird bei jedem Lauf auf den neuesten Stand gebracht) ---
New-Item -ItemType Directory -Force -Path $Ordner | Out-Null
$repo = Join-Path $Ordner 'silkreader'
if (-not (Test-Path (Join-Path $repo '.git'))) {
  Write-Host "`n=== Quellcode laden ===" -ForegroundColor Cyan
  git clone --depth 1 https://github.com/Sebbilore/silkreader.git $repo
  if ($LASTEXITCODE -ne 0) { throw 'Der Quellcode ließ sich nicht laden. Internet prüfen.' }
} else {
  Write-Host "`n=== Quellcode aktualisieren ===" -ForegroundColor Cyan
  git -C $repo fetch --depth 1 origin main
  git -C $repo reset --hard origin/main   # nur in diesem Testordner; node_modules bleiben erhalten
}
$version = (Get-Content (Join-Path $repo 'package.json') -Raw | ConvertFrom-Json).version
Write-Host "Silkreader-Version: $version"

Push-Location $repo
try {
  Write-Host "`n=== Bibliotheken installieren (beim ersten Mal einige Minuten) ===" -ForegroundColor Cyan
  npm ci --no-audit --no-fund
  if ($LASTEXITCODE -ne 0) { throw 'npm ci ist fehlgeschlagen.' }
  npm i --no-save --no-audit --no-fund playwright-core@1.56.1
  if ($LASTEXITCODE -ne 0) { throw 'Das Testwerkzeug ließ sich nicht installieren.' }
  # Wie beim Bauen der echten App: Codeschutz anwenden, damit gemessen wird, was Nutzer bekommen
  node build/protect.js

  $env:SILK_MODEL_DIR = Join-Path $Ordner 'modelle'
  $env:BENCH_MODELS = $Modelle
  $env:BENCH_SPEED = $Tempo
  $ergebnis = Join-Path $Ordner 'ergebnis'
  $logDatei = Join-Path $Ordner 'tempo-log.txt'

  Write-Host "`n=== KI-Test läuft (die Spinne öffnet kurz Fenster – bitte nichts anklicken) ===" -ForegroundColor Cyan
  Write-Host 'Beim ersten Mal werden die KI-Modelle geladen (ca. 4 GB), das dauert am längsten.'
  node test/bench.mjs $ergebnis 2>&1 | Tee-Object -FilePath $logDatei
  $testCode = $LASTEXITCODE
} finally { Pop-Location }

# --- Bericht schreiben ---
function Entschluesseln($t) { ($t -replace '%0A', "`n") -replace '%25', '%' }
$zeilen = Get-Content $logDatei
$tabelle = $null; $zeit = New-Object System.Collections.Generic.List[string]; $fehler = New-Object System.Collections.Generic.List[string]
foreach ($z in $zeilen) {
  if ($z -match '^::notice title=KI-Test::(.*)$') { $tabelle = Entschluesseln $Matches[1] }
  elseif ($z -match '^::notice title=Zeit-Protokoll[^:]*::(.*)$') { $zeit.Add((Entschluesseln $Matches[1])) }
  elseif ($z -match '^::(error|warning) title=([^:]*)::(.*)$') { $fehler.Add("$($Matches[2]): $(Entschluesseln $Matches[3])") }
}
$bericht = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Silkreader-Tempo-Ergebnis.md'
$md = New-Object System.Collections.Generic.List[string]
$md.Add("# Silkreader $version – Tempo auf diesem PC"); $md.Add('')
$md.Add('## Dieser PC'); $md.Add('')
$pc.GetEnumerator() | ForEach-Object { $md.Add("- **$($_.Key):** $($_.Value)") }
$md.Add(''); $md.Add('## KI-Test (Mittel über alle Testbriefe)'); $md.Add('')
if ($tabelle) { $md.Add($tabelle) } else { $md.Add('_Keine Ergebnistabelle – der Test ist nicht durchgelaufen, siehe Fehler unten._') }
$md.Add(''); $md.Add('Zum Vergleich: der GitHub-Lauf „KI-Vergleich“ derselben Version (Windows-Testrechner, 4 Kerne, ohne Grafikkarte) – Actions → KI-Vergleich → letzter Lauf → Zusammenfassung.')
if ($fehler.Count) { $md.Add(''); $md.Add('## Fehler und Warnungen'); $md.Add(''); $fehler | ForEach-Object { $md.Add("- $_") } }
$md.Add(''); $md.Add('## Gelogte Zeiten (Rohdaten)'); $md.Add(''); $md.Add('```'); $zeit | ForEach-Object { $md.Add($_) }; $md.Add('```')
Set-Content -Path $bericht -Value $md -Encoding UTF8

Write-Host "`n=== Fertig ===" -ForegroundColor Green
if ($tabelle) { Write-Host $tabelle }
Write-Host "Bericht: $bericht"
if ($testCode -ne 0) { Write-Host 'Der Test meldete Fehler – Einzelheiten im Bericht.' -ForegroundColor Yellow; exit $testCode }
