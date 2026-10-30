<p align="center"><img src="docs/images/icon.png" width="96" alt=""></p>

# 🕷 Silkreader

[English](README.md) · **Deutsch**

**Eine kleine Spinne, die deine Briefe liest.** Sie hängt oben an deinem Bildschirm. Markiere einen Text, tipp sie an – und sie sagt dir, was zu tun ist: was du bezahlen musst, bis wann, und ob du widersprechen kannst. Für Rechnungen, Mahnungen, Bescheide, Verträge und jeden anderen Text. Die KI läuft auf deinem PC, nichts geht ins Internet.

<p align="center"><img src="docs/images/spider-moods.png" width="640" alt="Die Spinne in verschiedenen Stimmungen und mit Accessoires"></p>

## Was die Spinne kann

- **Was du tun musst – sofort oben:** Betrag, Frist mit „noch 12 Tage“, IBAN zum Kopieren, „In den Kalender“. Diese Karte kommt aus festen Regeln und steht nach einem Augenblick da, während die KI noch liest.
- **Das Wichtigste in 3 Stichpunkten.** Alles Weitere unter **„Mehr aus dem Brief“**: Was passiert, wenn ich nichts tue? Zahlungsdaten, Vergleich mit früheren Briefen („Abschlag steigt um 9,5 %“), Kernaussagen, Angaben und Erkenntnisse mit Fundstelle. Die Details schreibt die KI erst, wenn man sie öffnet – deshalb ist das Ergebnis schnell da.
- **Warnt vor Betrug** (fremde IBAN, Gutscheinkarten, Zeitdruck, Links, PIN/TAN) und erkennt, wenn eine **Unterschrift** nötig ist (mit Seite und Rücksendeadresse).
- **Fragen an den Text** (mit Beleg aus dem Text), **In meiner Sprache** (Türkisch, Arabisch, Ukrainisch, Russisch, Polnisch, Rumänisch, Englisch), **Vorlesen** mit mitlaufender Markierung.
- **Meine Briefe:** alle gelesenen Briefe mit Suche, offene Fristen mit Erinnerung, „Später lesen“.
- **Brief fotografieren** (auch mehrere Seiten), Datei, Bildschirmbereich oder Zwischenablage lesen.
- **Lernt mit – nur auf deinem PC:** „War das richtig?“ unter jedem Ergebnis. Korrigierst du Betrag, Frist oder Briefart, macht sie es beim nächsten Brief vom selben Absender richtig.
- **Fragt nur, wenn es passt:** „Soll ich dich 3 Tage vorher erinnern?“, „Willst du widersprechen?“, „Schon bezahlt?“.

**Silkreader Pro** (kommt bald): Übersetzen, Einfach erklären, Antworten und Vorlagen, Brief-Hilfe, Vertrags-Check, gescannte PDFs, Mappen und das gründliche KI-Modell.

## Installation

- **Microsoft Store (empfohlen):** https://apps.microsoft.com/detail/9PHKJW54RGDS
- **Installer:** [Silkreader-download → Releases](https://github.com/Sebbilore/silkreader-download/releases/latest) → `Silkreader-Setup-….exe`. Zeigt Windows „Der Computer wurde durch Windows geschützt“: **Weitere Informationen → Trotzdem ausführen**.
- **Mac (Testversion):** ebenfalls dort, `…-mac-arm64.dmg` (Apple-Chip) oder `…-mac-x64.dmg` (Intel).

Windows 10 (ab 1809) und 11, 64 Bit, mindestens 4 GB Arbeitsspeicher (empfohlen 8 GB). Die Ersteinrichtung (3 Schritte) lädt einmalig das KI-Modell (1 GB). Updates kommen automatisch und werden nur installiert, wenn sie mit dem Silkreader-Zertifikat signiert sind.

## Bedienung

| | |
|---|---|
| **Text markieren, Spinne antippen** | Eine große Spinne krabbelt über den Text, oben in der Sprechblase steht sofort, was zu tun ist |
| **Spinne antippen, ohne Markierung** | Mini-Blase: Text einfügen, Datei lesen, Brief fotografieren, zuletzt Gelesenes |
| **Rechtsklick, lange drücken oder Strg+Alt+Leertaste** | Spinnennetz-Menü: Lesen, In meiner Sprache, Antworten, Meine Briefe, Foto, Mehr (Bereich, Datei, Großes Fenster, Pro, Einstellungen, Verstecken) |
| **Datei auf die Spinne ziehen** | Sie hält sie als Kokon im Netz fest – antippen zum Lesen |
| **Auf eine Angabe im Ergebnis klicken** | Eine Lupe zeigt die Originalstelle |
| **?** in der Sprechblase | Alle Tastenkürzel |

Tastenkürzel (einstellbar): **Strg+Alt+A** lesen · **S** an die Spinne geben · **T** übersetzen · **L** einfache Sprache · **R** antworten · **B** Bildschirmbereich · **N** Meine Briefe · **K** im Netz festhalten · **H** Spinne verstecken · **Leertaste** Spinnennetz.

## Tempo und Sparsamkeit

- Die eingebaute KI arbeitet in zwei Stufen: erst Stichpunkte und Aufgabe, die Details erst bei „Mehr“. Im KI-Test mit den Testbriefen: schnelles Modell ~12 s pro Brief (1.22: ~30 s), gründliches ~32 s (1.22: ~130 s).
- Das Modell wird erst geladen, wenn sich ein Lesen anbahnt (Maus über der Spinne), und nach 3 Minuten Ruhe wieder freigegeben. Grafikkarte oder Prozessor – die App misst einmal, was auf diesem PC schneller ist.
- Im Leerlauf (Modell freigegeben): rund 70 MB Arbeitsspeicher und unter 1 % Prozessor (Windows-Task-Manager). Auf PCs mit weniger als 6 GB Arbeitsspeicher schaltet sich der Sparmodus von selbst ein.
- Unter jedem Ergebnis steht klein, wie lange das Lesen gedauert hat.

## Sprache, Datenschutz, Lizenzen

- **Deutsch und Englisch:** Die Oberfläche richtet sich nach der Windows-Sprache und lässt sich in der Ersteinrichtung oder den Einstellungen umschalten (`src/i18n.js`).
- **Ersteinrichtung:** Beim ersten Start erklärt die Spinne die Bedienung, man wählt die KI und stimmt bewusst zu, ob die Zwischenablage mitgelesen werden darf (standardmäßig aus).
- **Datenschutz:** `src/privacy.html` (auch über „Über Silkreader“ erreichbar). Keine eigenen Server, kein Tracking.
- **Lizenz:** proprietär ab 1.21 (`LICENSE`; bis 1.20 MIT, siehe `LICENSE-MIT-bis-1.20.txt`). Der Code wird beim Bauen geschützt (`build/protect.js`: verschleiert, Hauptprozess als V8-Bytecode). Fremdlizenzen in `src/legal/THIRD_PARTY_NOTICES.txt` – nach dem Ändern von Abhängigkeiten neu erzeugen mit `npm run notices`.
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
- `test/bench.mjs` (KI-Test): liest alle Testbriefe aus `test/letters/` mit der echten KI und misst Betrag, Frist, Aufgabe, erfundene Zahlen, Dauer, Einlesen/Schreiben und Token/s. Läuft im Windows-Test mit; der Workflow „KI-Vergleich“ vergleicht Modelle und Tempo-Schalter (`BENCH_SPEED`).
- `test/startbench.mjs`: Startzeit, Arbeitsspeicher und Prozessorlast im Leerlauf.
- Im Protokoll der App (Hilfe → Protokoll öffnen) stehen „Zeit …“-Zeilen für jeden Schritt (Start, Markierung, Modell laden, Einlesen, Schreiben, Prüfen).
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

- `src/main.js`: Hauptprozess mit Spinnenfenster, Tastenkürzel, Dateien lesen und KI-Aufruf (eingebaute KI in zwei Stufen; Claude und Ollama nur noch für Profis)
- `src/facts.js`: feste Regeln für Briefe (Betrag, Frist, IBAN, Betrugs-Check, Unterschrift, Verträge) – ohne KI, sofort
- `src/learn.js`: lokales Lernen aus Korrekturen und Absender-Profilen
- `src/pro.js`: Silkreader Pro (Codes und Store-Add-on)
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
