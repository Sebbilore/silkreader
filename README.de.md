<p align="center"><img src="docs/images/icon.png" width="96" alt=""></p>

# 🕷 Silkreader

[English](README.md) · **Deutsch**

Eine kleine Spinne hängt oben an deinem Bildschirm. Markiere einen Text, klick sie an, und sie liest ihn für dich – wahlweise kostenlos und offline auf deinem PC oder mit Claude. Eine große Spinne krabbelt dabei über die markierten Wörter, danach erscheint das Ergebnis in einer Sprechblase:

- **Das Wichtigste** in einfachen Stichpunkten, auf Wunsch **Kernaussagen**, **Erkenntnisse** und **Zahlen** mit Fundstelle
- **Fragen an den Text**, **Übersetzen**, **einfache Sprache**, **Antwort-Entwürfe**, **Vorlesen**
- Dateien im **Spinnennetz** festhalten, **Notizbuch** der letzten 20 Texte, **Fristen** in den Kalender

<p align="center"><img src="docs/images/spider-moods.png" width="640" alt="Die Spinne in verschiedenen Stimmungen und mit Accessoires"></p>

## Installation (Windows)

1. Die neueste `Silkreader-Setup-….exe` unter [Releases](https://github.com/Sebbilore/silkreader/releases/latest) herunterladen.
2. Setup starten. Zeigt Windows „Der Computer wurde durch Windows geschützt“, auf **Weitere Informationen → Trotzdem ausführen** klicken (die App ist noch nicht mit einem gekauften Zertifikat signiert).
3. Die Spinne erscheint oben am Bildschirmrand, und die **Ersteinrichtung** erklärt alles: Bedienung, Wahl der KI und was mit deinen Daten passiert.
4. Optional: Rechtsklick auf das Spinnen-Symbol im Infobereich der Taskleiste → **Mit Windows starten**.

Deinstallieren geht wie bei jedem Programm über **Einstellungen → Apps**. Deine Daten liegen in `%APPDATA%\Silkreader` – den Ordner löschen, um alles zu entfernen.

## Updates

Silkreader sucht beim Start und danach alle 4 Stunden nach neuen Versionen auf GitHub. Gibt es eine, wird sie im Hintergrund geladen. Danach fragt die App, ob sie gleich neu starten soll; sonst wird das Update beim nächsten Beenden installiert. Von Hand geht das per Rechtsklick auf das Spinnen-Symbol in der Taskleiste → **Nach Updates suchen**.

Updates werden nur installiert, wenn sie mit dem Silkreader-Zertifikat signiert sind (die App prüft den hinterlegten Fingerabdruck selbst).

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
| **Mausrad auf der Spinne** (kurz auf ihr ruhen, dann drehen) | Klick-Modus wechseln: Lesen, Übersetzen, Einfach oder Antworten. Beim Scrollen über die Spinne hinweg ändert sich nichts |
| **Längeren Text kopieren** (Strg+C) | Die Spinne winkt: „Kopiert – Klick zum Lesen“. Ein Klick auf sie liest den kopierten Text |
| **„Vorlesen“ in der Sprechblase** | Die Spinne liest das Ergebnis mit der Windows-Stimme vor und bewegt dabei den Mund |
| **„Kürzer“, „Förmlicher“, „Lockerer“** | Übersetzungen und Antwort-Entwürfe mit einem Klick nachschärfen |
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

Die kleine Spinne zeigt, was sie tut: konzentriert beim Lesen, stolz wenn sie fertig ist, verschlafen nach einer Weile, erschrocken wenn die große Spinne kommt. Ihr Accessoire zeigt, was sie gerade tut: Lesebrille beim Lesen, Weltkugel-Mütze beim Übersetzen, Glühbirne bei „Einfach“, Brief beim Antworten. In Ruhe trägt sie das Accessoire ihres Klick-Modus. Die große Spinne kommt bei jeder Aufgabe und bleibt auf dem Text, auch wenn man die Seite scrollt (Windows).

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

## Sprache, Datenschutz, Lizenzen

- **Deutsch und Englisch:** Die Oberfläche richtet sich nach der Windows-Sprache und lässt sich in der Ersteinrichtung oder den Einstellungen umschalten (`src/i18n.js`).
- **Ersteinrichtung:** Beim ersten Start erklärt die Spinne die Bedienung, man wählt die KI und stimmt bewusst zu, ob die Zwischenablage mitgelesen werden darf (standardmäßig aus).
- **Datenschutz:** `src/privacy.html` (auch über „Über Silkreader“ erreichbar). Keine eigenen Server, kein Tracking.
- **Lizenz:** MIT (`LICENSE`). Fremdlizenzen in `src/legal/THIRD_PARTY_NOTICES.txt` – nach dem Ändern von Abhängigkeiten neu erzeugen mit `npm run notices`.
- **Problem melden:** öffnet ein vorausgefülltes GitHub-Issue im Browser; nichts wird automatisch verschickt.

## Für die Öffentlichkeit: Signatur

- Der Installer installiert **kein** eigenes Stammzertifikat mehr. Updates prüft die App selbst über den hinterlegten Fingerabdruck des Silkreader-Zertifikats (`PINNED_CERTS` in `src/main.js`); eine echte, anerkannte Signatur mit Herausgeber „Silkreader“ wird ebenfalls akzeptiert.
- Bis zu einer echten Signatur zeigt Windows SmartScreen „Unbekannter Herausgeber“.
- **Echtes Zertifikat:** In den GitHub-Secrets das Zertifikat austauschen; `publisherName` in `package.json` muss zum Zertifikat passen.
- **Microsoft Store:** `npm run dist:store` (unter Windows) baut ein MSIX/AppX-Paket. Die Werte aus dem Partner Center als Umgebungsvariablen `STORE_IDENTITY_NAME`, `STORE_PUBLISHER`, `STORE_PUBLISHER_NAME` setzen (siehe `electron-builder.store.js`).

## Neue Version veröffentlichen

1. In `package.json` die `version` erhöhen (z. B. `1.2.0`).
2. Committen und auf `main` pushen.
3. GitHub Actions merkt die neue Versionsnummer, baut, signiert und veröffentlicht sie automatisch als Release `v1.2.0`. Alle installierten Apps holen sie sich von selbst.

Dafür braucht das Repository zwei Secrets (**Settings → Secrets and variables → Actions**): `SILKREADER_PFX_BASE64` (das Signatur-Zertifikat als Base64) und `SILKREADER_PFX_PASSWORD`.

## Tests

- `test/*.mjs` laufen unter Linux mit einem virtuellen Bildschirm (Xvfb) und Test-Antworten statt echter KI.
- `test/windows.mjs` läuft bei jeder Änderung und vor jedem Release automatisch auf einem echten Windows-PC bei GitHub (Workflow „Windows-Test“): echter Editor, echte Tastenkürzel und Mausklicks, Ring, Mitwandern beim Scrollen, Texterkennung, Update-Signaturprüfung. Schlägt dort etwas Wichtiges fehl, wird nichts veröffentlicht.

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
- `src/welcome.html`, `src/privacy.html`: Ersteinrichtung und Datenschutz
- `src/i18n.js`: Übersetzungen (Deutsch/Englisch)
- `src/theme.css` und `src/icons.js`: gemeinsame Farben, Schrift, Formen, Bewegungen und Symbole („Mitternachtsseide“)
- `src/grab.js`: markierten Text aus anderen Programmen holen (zuerst direkt über UI Automation, sonst per Strg+C)
- `src/winkeys.js`: Tastendrücke direkt über die Windows-API (ohne PowerShell)
- `src/selectionScan.js`: markierte Wörter auf dem Bildschirm finden (über die Markierungsfarbe)
- `src/cocoons.js`: Kokon-Ablage
- `src/ocr.js` und `src/region.html`: Bildschirmbereich auswählen und mit der Windows-Texterkennung lesen
