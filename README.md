# 🕷 Silkreader

Eine kleine schwebende Spinne auf deinem Desktop. Klick sie an, und sie liest jeden Text oder jedes Dokument mit KI, wahlweise kostenlos auf deinem PC oder mit Claude. Dabei krabbelt sie animiert über den Text, markiert die wichtigen Stellen und liefert dir:

- **Zusammenfassung** und **Kernaussagen**
- **Wichtige Angaben** (Zahlen, Beträge, Fristen, Namen), jeweils mit Seitenzahl und markierter Fundstelle im Text
- **Erkenntnisse** wie Risiken, Chancen, Widersprüche und nötige Handlungen, inklusive selbst berechneter Kennzahlen

## Installation (Windows)

1. `Silkreader-Setup-1.4.1.exe` herunterladen.
2. Falls Windows blockiert: Rechtsklick auf die Datei → **Eigenschaften** → unten den Haken bei **„Zulassen“** setzen → OK.
3. Setup starten und durchklicken. Beim ersten Mal fragt Windows, ob du dem Zertifikat „Silkreader“ vertraust: **Ja**. Ab dann steht bei Windows „Herausgeber: Silkreader“, und Updates können ihre Echtheit prüfen.
4. Die Spinne erscheint oben am Bildschirmrand. Beim ersten Start öffnen sich die Einstellungen (siehe unten).
5. Optional: Rechtsklick auf das Spinnen-Symbol im Infobereich der Taskleiste → **Mit Windows starten**.

Deinstallieren geht wie bei jedem Programm über **Einstellungen → Apps**. Das Zertifikat entfernst du bei Bedarf mit `certutil -user -delstore Root 66923f7442aa9a51cee8ee2055b12e9fb722f9f1` (und dasselbe mit `TrustedPublisher` statt `Root`).

## Updates

Silkreader sucht beim Start und danach alle 4 Stunden nach neuen Versionen auf GitHub. Gibt es eine, wird sie im Hintergrund geladen. Danach fragt die App, ob sie gleich neu starten soll; sonst wird das Update beim nächsten Beenden installiert. Von Hand geht das per Rechtsklick auf das Spinnen-Symbol in der Taskleiste → **Nach Updates suchen**.

Updates werden nur installiert, wenn sie mit dem Silkreader-Zertifikat signiert sind.

## Kostenlos oder Claude?

| | **Eingebaut** (Standard) | **Claude** |
|---|---|---|
| Kosten | 0 € | ein paar Cent pro Analyse (API-Schlüssel) |
| Internet | nur einmal zum Herunterladen des Modells | nötig |
| Qualität | gut für Zusammenfassungen; sehr lange Dokumente werden gekürzt | deutlich gründlicher, ganze Dokumente |
| Tempo | „Schnell“: meist unter 1 Minute, „Gründlich“: länger (mit Grafikkarte deutlich schneller) | schnell |

**Eingebautes Modell einrichten (einmalig):** In den Einstellungen „Eingebaut“ wählen, dann **Schnell** (1 GB) oder **Gründlich** (2,5 GB) auswählen und auf **Herunterladen** klicken. Danach läuft alles offline auf deinem PC.

**Für Claude:** einen API-Schlüssel unter https://platform.claude.com/settings/keys erstellen und in den Einstellungen eintragen.

**Für Profis:** Unter „Ollama“ lässt sich auch ein eigenes Modell über [Ollama](https://ollama.com) nutzen.

## Bedienung

Die Spinne hängt an einem Faden vom oberen Bildschirmrand, schaukelt, schaut mit ihren Kulleraugen deinem Mauszeiger hinterher und macht ab und zu Kunststücke: Sie baut Spinnennetze, fängt Fliegen, springt Bungee, schlägt Saltos, tanzt und winkt dir zu, wenn du mit der Maus vorbeikommst. Lässt du sie lange in Ruhe, schläft sie ein (z z Z) und schreckt hoch, sobald die Maus kommt.

| Aktion | Ergebnis |
|---|---|
| **Text markieren, dann auf die Spinne klicken** | Die Spinne legt ein Ei, eine große Spinne schlüpft und läuft über den markierten Text. Danach zeigt das Fenster den Text, **Enter** startet die Analyse. Strg+C ist nicht nötig, deine Zwischenablage bleibt erhalten. Ist nichts markiert, zuckt die Spinne nur mit den Schultern ❓. |
| **Datei oder Text auf die Spinne ziehen** | Wird immer in einem Kokon festgehalten (zum späteren Kopieren). Analysieren geht per Rechtsklick auf den Kokon. |
| **Dateien im Explorer markieren, dann auf die Spinne klicken** | Werden ebenfalls festgehalten |
| **Kokon anklicken** | Inhalt in die Zwischenablage kopieren (Dateien lassen sich im Explorer mit Strg+V einfügen) |
| **Kokon herausziehen** | Datei direkt auf den Desktop, in einen Ordner oder in eine Mail ziehen |
| **Rechtsklick auf einen Kokon** | Kopieren, Analysieren, Im Ordner zeigen, Entfernen |
| **Spinne seitwärts ziehen** | Sie wandert am oberen Rand entlang (und schaukelt dabei ordentlich) |
| **Spinne hoch/runter ziehen** | Faden kürzer oder länger machen |
| **Rechtsklick** auf die Spinne | Menü mit Kokon-Ablage, Datei öffnen, Einstellungen … |

### Tastenkürzel

| Überall | |
|---|---|
| **Strg+Alt+S** | Markierten Text an die Spinne geben (Vorschau) |
| **Strg+Alt+A** | Markierten Text sofort analysieren |
| **Strg+Alt+K** | Markierten Text oder markierte Datei (z. B. im Explorer) in einen Kokon packen |
| **Strg+Alt+V** | Kokon-Ablage öffnen |
| **Strg+Alt+H** | Spinne verstecken / zeigen |

| Im Analysefenster | |
|---|---|
| **Enter** | Analyse starten |
| **Esc** | Fenster schließen |
| **Strg+O** | Datei öffnen |
| **Strg+N** | Neuer Text |
| **Strg+K** | Aktuellen Text in einen Kokon packen |
| **Strg+Umschalt+C** | Ergebnis kopieren |
| **Strg+,** | Einstellungen |

Der durchsichtige Bereich um die Spinne herum lässt Klicks durch, du kannst also ganz normal weiterarbeiten.

Im Analysefenster springt die Spinne beim Klick auf eine Angabe zur Fundstelle im Text. Über **Ergebnis kopieren** landet die Analyse als Markdown in der Zwischenablage.

## Neue Version veröffentlichen

1. In `package.json` die `version` erhöhen (z. B. `1.2.0`).
2. Committen und auf `main` pushen.
3. GitHub Actions merkt die neue Versionsnummer, baut, signiert und veröffentlicht sie automatisch als Release `v1.2.0`. Alle installierten Apps holen sie sich von selbst.

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

- `src/main.js`: Hauptprozess mit Spinnenfenster, Tastenkürzel, Dateien lesen und KI-Aufruf (eingebaut, Claude oder Ollama)
- `src/spider.js`: die animierte Spinne (Beine suchen sich Wörter als Halt)
- `src/app.js` und `src/index.html`: Analysefenster
- `src/bubble.html`: die Spinne am Bildschirmrand mit allen Kunststücken
- `src/settings.html`: Einstellungen
- `src/overlay.html`: Ei, Schlüpfen und die große Spinne, die über den Bildschirm läuft
- `src/grab.js`: markierten Text aus anderen Programmen holen
- `src/cocoons.js`: Kokon-Ablage
