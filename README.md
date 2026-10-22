# 🕷 Silkreader

Eine kleine schwebende Spinne auf deinem Desktop. Klick sie an, und sie liest jeden Text oder jedes Dokument mit KI, wahlweise kostenlos auf deinem PC oder mit Claude. Dabei krabbelt sie animiert über den Text, markiert die wichtigen Stellen und liefert dir:

- **Zusammenfassung** und **Kernaussagen**
- **Wichtige Angaben** (Zahlen, Beträge, Fristen, Namen), jeweils mit Seitenzahl und markierter Fundstelle im Text
- **Erkenntnisse** wie Risiken, Chancen, Widersprüche und nötige Handlungen, inklusive selbst berechneter Kennzahlen

## Installation (Windows)

1. `Silkreader-Setup-1.1.1.exe` herunterladen.
2. Falls Windows blockiert: Rechtsklick auf die Datei → **Eigenschaften** → unten den Haken bei **„Zulassen“** setzen → OK.
3. Setup starten und durchklicken. Beim ersten Mal fragt Windows, ob du dem Zertifikat „Silkreader“ vertraust: **Ja**. Ab dann steht bei Windows „Herausgeber: Silkreader“, und Updates können ihre Echtheit prüfen.
4. Die Spinne erscheint oben am Bildschirmrand. Beim ersten Start öffnen sich die Einstellungen (siehe unten).
5. Optional: Rechtsklick auf das Spinnen-Symbol im Infobereich der Taskleiste → **Mit Windows starten**.

Deinstallieren geht wie bei jedem Programm über **Einstellungen → Apps**. Das Zertifikat entfernst du bei Bedarf mit `certutil -user -delstore Root 66923f7442aa9a51cee8ee2055b12e9fb722f9f1` (und dasselbe mit `TrustedPublisher` statt `Root`).

## Updates

Silkreader sucht beim Start und danach alle 4 Stunden nach neuen Versionen auf GitHub. Gibt es eine, wird sie im Hintergrund geladen. Danach fragt die App, ob sie gleich neu starten soll; sonst wird das Update beim nächsten Beenden installiert. Von Hand geht das per Rechtsklick auf das Spinnen-Symbol in der Taskleiste → **Nach Updates suchen**.

Updates werden nur installiert, wenn sie mit dem Silkreader-Zertifikat signiert sind.

## Kostenlos oder Claude?

| | **Lokal: kostenlos** (Standard) | **Claude** |
|---|---|---|
| Kosten | 0 € | ein paar Cent pro Analyse (API-Schlüssel) |
| Internet | nicht nötig, Texte bleiben auf deinem PC | nötig |
| Qualität | gut für Zusammenfassungen, schwächer bei Rechnungen und langen Dokumenten | deutlich gründlicher |
| Tempo | hängt vom PC ab (mit Grafikkarte schnell, sonst eher 1–3 Minuten) | schnell |

**Einrichtung für den kostenlosen Modus (einmalig):**

1. [Ollama](https://ollama.com/download) herunterladen und installieren (kostenlos, Open Source).
2. Eingabeaufforderung öffnen (Windows-Taste → `cmd`) und ein Modell laden:
   - `ollama pull gemma3:12b`: gute Qualität, ab ca. 16 GB RAM
   - `ollama pull gemma3:4b`: für schwächere PCs (8 GB RAM)
3. In den Einstellungen der Spinne auf ↻ klicken und das Modell auswählen.

**Für Claude:** einen API-Schlüssel unter https://platform.claude.com/settings/keys erstellen und in den Einstellungen eintragen.

## Bedienung

Die Spinne hängt an einem Faden vom oberen Bildschirmrand, schaukelt, schaut mit ihren Kulleraugen deinem Mauszeiger hinterher und macht ab und zu Kunststücke.

| Aktion | Ergebnis |
|---|---|
| **Klick** auf die Spinne | Sie flitzt hoch und analysiert den Text in der Zwischenablage (vorher Text markieren und Strg+C drücken) |
| **Strg + Umschalt + Leertaste** | Dasselbe, von überall aus |
| **Datei auf die Spinne ziehen** | Sie breitet die Beine aus und fängt die Datei: PDF, Word (.docx), TXT, Markdown, CSV, HTML … |
| **Spinne seitwärts ziehen** | Sie wandert am oberen Rand entlang (und schaukelt dabei ordentlich) |
| **Spinne hoch/runter ziehen** | Faden kürzer oder länger machen |
| **Rechtsklick** auf die Spinne | Menü: Datei öffnen, Analysefenster, Einstellungen, ausblenden, beenden |

Der durchsichtige Bereich um die Spinne herum lässt Klicks durch, du kannst also ganz normal weiterarbeiten.

Im Analysefenster springt die Spinne beim Klick auf eine Angabe zur Fundstelle im Text. Über **Ergebnis kopieren** landet die Analyse als Markdown in der Zwischenablage.

## Neue Version veröffentlichen

1. In `package.json` die `version` erhöhen (z. B. `1.2.0`).
2. Committen, Tag setzen und pushen:
   ```bash
   git commit -am "Version 1.2.0"
   git tag v1.2.0
   git push && git push --tags
   ```
3. GitHub Actions baut, signiert und veröffentlicht die neue Version automatisch als Release. Alle installierten Apps holen sie sich von selbst.

Dafür braucht das Repository zwei Secrets (**Settings → Secrets and variables → Actions**): `SILKREADER_PFX_BASE64` (das Signatur-Zertifikat als Base64) und `SILKREADER_PFX_PASSWORD`.

## Selbst bauen / weiterentwickeln

Dafür brauchst du [Node.js](https://nodejs.org) ab Version 20.

```bash
npm install
npm start            # App starten
npm run dist:win     # Windows-Installer (Setup.exe) bauen (unter Windows)
npm run dist:mac     # macOS (.dmg), muss auf einem Mac gebaut werden
```

Aufbau:

- `src/main.js`: Hauptprozess mit schwebendem Fenster, Tastenkürzel, Dateien lesen und KI-Aufruf (Ollama oder Claude)
- `src/spider.js`: die animierte Spinne (Beine suchen sich Wörter als Halt)
- `src/app.js` und `src/index.html`: Analysefenster
- `src/bubble.html`: das schwebende Icon
- `src/settings.html`: Einstellungen
