# 🕷 Silkreader

Eine kleine schwebende Spinne auf deinem Desktop. Klick sie an, und sie liest jeden Text oder jedes Dokument mit KI, wahlweise kostenlos auf deinem PC oder mit Claude. Dabei krabbelt sie animiert über den Text, markiert die wichtigen Stellen und liefert dir:

- **Zusammenfassung** und **Kernaussagen**
- **Wichtige Angaben** (Zahlen, Beträge, Fristen, Namen), jeweils mit Seitenzahl und markierter Fundstelle im Text
- **Erkenntnisse** wie Risiken, Chancen, Widersprüche und nötige Handlungen, inklusive selbst berechneter Kennzahlen

## Installation (Windows)

1. `Silkreader-Setup-1.9.0.exe` herunterladen.
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
| Qualität | gut; liest lange Dokumente abschnittsweise komplett bis zum Ende | deutlich gründlicher |
| Tempo | „Schnell“: meist unter 1 Minute, „Gründlich“: länger (mit Grafikkarte deutlich schneller) | schnell |

**Eingebautes Modell einrichten (einmalig):** In den Einstellungen „Eingebaut“ wählen, dann **Schnell** (1 GB) oder **Gründlich** (2,5 GB) auswählen und auf **Herunterladen** klicken. Danach läuft alles offline auf deinem PC.

**Für Claude:** einen API-Schlüssel unter https://platform.claude.com/settings/keys erstellen und in den Einstellungen eintragen.

**Für Profis:** Unter „Ollama“ lässt sich auch ein eigenes Modell über [Ollama](https://ollama.com) nutzen.

## Bedienung

Ist das große Fenster offen, tollt die kleine Spinne darin herum (hüpft, schlägt Saltos, seilt sich ab, lugt hinter dem Rand hervor, schläft ein). Sonst hängt sie an einem Faden vom oberen Bildschirmrand, schaukelt, schaut mit ihren Kulleraugen deinem Mauszeiger hinterher und macht ab und zu Kunststücke: Sie baut Spinnennetze, fängt Fliegen, springt Bungee, schlägt Saltos, tanzt und winkt dir zu, wenn du mit der Maus vorbeikommst. Lässt du sie lange in Ruhe, schläft sie ein (z z Z) und schreckt hoch, sobald die Maus kommt.

| Aktion | Ergebnis |
|---|---|
| **Text markieren, dann auf die Spinne klicken** | Die kleine Spinne erschrickt und versteckt sich, eine große Spinne kriecht vom Bildschirmrand herein und liest Wort für Wort über den markierten Text (die genauen Wortpositionen erkennt die App an der Markierungsfarbe auf dem Bildschirm – das Bildschirmfoto bleibt nur kurz im Speicher; ersatzweise über Windows UI Automation). Danach erscheint unter der Spinne eine kleine Sprechblase, die Analyse startet sofort, und das Ergebnis erscheint direkt dort – das Wichtigste in einfachen Stichpunkten („Details“ öffnet das große Fenster mit markierten Fundstellen). Strg+C ist nicht nötig, deine Zwischenablage bleibt erhalten. Ist nichts markiert, erscheint eine kleine Blase: Text einfügen, Zwischenablage oder Datei lesen, zuletzt Gelesenes. |
| **Auf eine Info im Ergebnis klicken** | Eine Lupe klappt auf und zeigt die Originalstelle. „Auf dem Bildschirm zeigen“: Die große Spinne läuft im Originalprogramm zu der Stelle |
| **Mausrad auf der Spinne** | Klick-Modus wechseln: Lesen, Übersetzen, Einfach oder Antworten (kleines Abzeichen an der Spinne) |
| **Datei oder Text zur Spinne ziehen** | Sobald man mit gedrückter Maustaste in die Nähe kommt, spannt sie ihr Netz auf („Hier ablegen“) – man muss die Spinne nicht treffen. Das Dokument klebt danach mit Vorschaubild im Netz. |
| **Dateien oder Ordner im Explorer markieren, dann auf die Spinne oder das Netz klicken** | Werden im Netz festgehalten (mit dem echten Datei- bzw. Ordnersymbol) |
| **Dokument im Netz anklicken** | In der Sprechblase lesen (schon gelesen und unverändert: sofort aus dem Notizbuch) |
| **Dokument aus dem Netz ziehen** | Datei direkt auf den Desktop, in einen Ordner oder in eine Mail ziehen |
| **Rechtsklick auf ein Dokument im Netz** | Kopieren (dann im Explorer mit Strg+V einfügen), Lesen, Im Lesemodus öffnen, Im Ordner zeigen, Vergleichen, Entfernen |
| **Spinne seitwärts ziehen** | Sie wandert am oberen Rand entlang (und schaukelt dabei ordentlich) |
| **Spinne hoch/runter ziehen** | Faden kürzer oder länger machen |
| **Rechtsklick** auf die Spinne | Spinnennetz-Ring mit allen Aktionen (siehe unten) |
| **Datei im Explorer mit Strg+C kopieren** | Landet automatisch im Netz (abschaltbar in den Einstellungen) |
| **„Mehr ▾“ in der Sprechblase** | Kernaussagen, Erkenntnisse und Zahlen – die Sprechblase zeigt sonst nur das Wichtigste |
| **„Frag den Text …“ in der Sprechblase** | Frage eintippen, Enter – die Spinne antwortet und zeigt auf Wunsch die Stelle im Text |
| **📅 Frist in der Sprechblase** | Erkannte Termine mit einem Klick als Kalendereintrag (mit Erinnerung einen Tag vorher) |
| **Rechtsklick auf ein Dokument im Netz → Vergleichen mit …** | Zwei Dokumente vergleichen: Unterschiede und Gemeinsamkeiten |

Die kleine Spinne zeigt, was sie tut: konzentriert beim Lesen, stolz wenn sie fertig ist, verschlafen nach einer Weile, erschrocken wenn die große Spinne kommt. Je Klick-Modus trägt sie ein Accessoire: Lesebrille (beim Lesen), Weltkugel-Mütze (Übersetzen), Glühbirne (Einfach), Brief (Antworten).

Die Spinne wird nach 30 Sekunden halb durchsichtig und kommt zurück, sobald die Maus in die Nähe kommt. Das Netz ist zusammengeklappt (nur ein kleiner Zähler) und öffnet sich, wenn die Maus darüber fährt.

### Spinnennetz-Ring

Alles, was die Spinne kann, liegt in einem runden Netz – wie ein Aktionsring: **Strg+Alt+Leertaste** öffnet es direkt am Mauszeiger, ein Rechtsklick auf die Spinne um die Spinne herum.

- **Kurz tippen:** Das Netz bleibt offen, Aktion anklicken.
- **Gedrückt halten:** Maus in Richtung der Aktion bewegen und loslassen (Windows).
- Erste Seite: Lesen, Übersetzen, Einfach, Antworten, Bereich, Ins Netz, Notizbuch, Mehr. Unter „Mehr“: Datei lesen, Zwischenablage, Lesemodus, Einstellungen, Verstecken.
- Esc, Klick in die Mitte oder Wegfahren schließt das Netz.

**Tipp für Logitech-Mäuse (z. B. MX Master):** In Logi Options+ eine Taste – oder einen Platz im Aktionsring – auf den Tastendruck *Strg+Alt+Leertaste* legen. Dann öffnet diese Maustaste das Spinnennetz.

Das große Fenster ist nur noch ein optionaler **Lesemodus** für lange Dokumente (über den Ring unter „Mehr“ oder „Lesemodus“ in der Sprechblase).

### Tastenkürzel

Alle globalen Kürzel lassen sich in den Einstellungen ändern (anklicken, neue Tasten drücken).

| Überall | |
|---|---|
| **Strg+Alt+S** | Markierten Text an die Spinne geben (Vorschau) |
| **Strg+Alt+A** | Markierten Text sofort analysieren |
| **Strg+Alt+K** | Markierten Text oder markierte Datei (z. B. im Explorer) in einen Kokon packen |
| **Strg+Alt+V** | Kokon-Ablage öffnen |
| **Strg+Alt+H** | Spinne verstecken / zeigen |
| **Strg+Alt+T** | Markierten Text übersetzen |
| **Strg+Alt+L** | Markierten Text in einfache Sprache umschreiben |
| **Strg+Alt+R** | Antwort-Entwurf auf eine markierte E-Mail |
| **Strg+Alt+B** | Bildschirmbereich aufziehen und lesen lassen (Windows-Texterkennung) |
| **Strg+Alt+N** | Notizbuch: die letzten 20 Analysen mit Suche (als Sprechblase) |
| **Strg+Alt+Leertaste** | Spinnennetz-Ring am Mauszeiger |

Zum Ausprobieren: Einstellungen öffnen und ein Kürzel drücken – dahinter erscheint „✓ erkannt“, und die Spinne hüpft kurz. Klappt etwas nicht, steht im Protokoll (Rechtsklick aufs Tray-Symbol → „Protokoll öffnen“), ob das Kürzel ankam und ob markierter Text gefunden wurde.

Hinweis: Kürzel mit Strg+Umschalt werden oft schon von Word oder Chrome belegt, und auf deutschen Tastaturen ist Strg+Alt gleich AltGr – deshalb meiden die Standardkürzel Buchstaben wie E, Q, M und Ziffern.

| Im Analysefenster | |
|---|---|
| **Enter** | Analyse starten (nur im großen Fenster nötig) |
| **Esc** | Fenster schließen |
| **Rechtsklick** | Menü (das Fenster hat keine Kopfleiste mehr) |
| **Strg+O** | Datei öffnen |
| **Strg+H** | Notizbuch |
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
- `src/overlay.html`: die große Spinne, die über den markierten Text auf dem Bildschirm kriecht
- `src/mascot.js`: die kleine Spinne, die im Analysefenster herumtollt
- `src/popup.html`: Sprechblase unter der Spinne (Ergebnis, Lupe, Mini-Blase, Notizbuch, Einstellungen)
- `src/ring.html`: Spinnennetz-Ring
- `src/theme.css` und `src/icons.js`: gemeinsame Farben, Schrift, Formen, Bewegungen und Symbole („Mitternachtsseide“)
- `src/grab.js`: markierten Text aus anderen Programmen holen (zuerst direkt über UI Automation, sonst per Strg+C)
- `src/winkeys.js`: Tastendrücke direkt über die Windows-API (ohne PowerShell)
- `src/selectionScan.js`: markierte Wörter auf dem Bildschirm finden (über die Markierungsfarbe)
- `src/cocoons.js`: Kokon-Ablage
- `src/ocr.js` und `src/region.html`: Bildschirmbereich auswählen und mit der Windows-Texterkennung lesen
