# Silkreader

Desktop-Spinne (Electron), die markierten Text, Fotos, PDFs und Bildschirmbereiche vorliest, zusammenfasst und übersetzt. Installer und Download-Seite liegen im Repo `silkreader-download` (z. B. `install-mac.sh`).

## Aufbau
- `src/main.js`: Hauptprozess (ca. 3.500 Zeilen). Nie komplett lesen, sondern mit `grep -n` die Stelle suchen und nur den Bereich lesen.
- `src/preload.js`: Brücke zu den Fenstern. `src/*.html`: Fenster (bubble, popup, settings, welcome, region, ...).
- `src/i18n.js`: Die Oberfläche ist auf Deutsch geschrieben. Jeder neue sichtbare Text braucht hier einen englischen Eintrag.
- `src/whatsnew.js` und `CHANGELOG.md`: Neuigkeiten pro Version.
- `src/legal/`: wird mit `npm run notices` erzeugt, nicht von Hand ändern.
- `build/`: Icons, Signier- und Schutzskripte für electron-builder. `.github/workflows/`: CI (Mac, Windows, Store, Release).

## Tests
- Schnelle Prüfungen ohne Fenster: `node test/facts.mjs`, `node test/letters.mjs`, `node test/learn.mjs`.
- UI-Tests starten Electron über Playwright und speichern Screenshots: `node test/<name>.mjs <ausgabeordner>` (z. B. `test/e2e.mjs`). Unter Linux mit `xvfb-run` starten. `SPIDER_MOCK=test/mock.json` ersetzt echte KI-Antworten.
- Nach Änderungen die passenden Tests ausführen, bei UI-Änderungen einen Screenshot zeigen.

## Regeln
- Kein Apple-Developerkonto: Mac-Probleme mit Code und Installer lösen, nicht mit Signierung.
- Texte für Nutzer auf Deutsch, einfach und beruhigend. Datenschutz offen erklären: Nur Markiertes wird kopiert, nichts wird verschickt.
- `package-lock.json` nur über npm ändern. Ein Hook in `.claude/settings.json` sperrt direkte Änderungen und prüft die Syntax von .js- und .sh-Dateien.
- Sparsam lesen: große Dateien und Logs mit grep, head oder tail filtern, Befehle leise ausführen.

## Möglichst wenig Code (nach Ponytail)
- Erst den betroffenen Code lesen und den Ablauf verstehen, dann entscheiden.
- Vor neuem Code der Reihe nach prüfen: Wird es überhaupt gebraucht? Gibt es das schon im Projekt? Kann es Node/Electron selbst oder eine vorhandene Abhängigkeit? Geht es in einer Zeile? Erst dann das Kleinste schreiben, das funktioniert.
- Keine neuen Abhängigkeiten ohne Rückfrage.
- Nie an Sicherheit, Datenschutz, Datenverlust-Schutz oder Barrierefreiheit sparen.
- Logik mit Verzweigung, Schleife oder Parser bekommt einen kleinen Test.

## Store und Bilder
- Bei jeder neuen Version `store/STORE.md` (Store-Texte, Neuerungen DE/EN, Paketinfos, Checkliste) und `store/BILDER.md` (Vorher/Nachher-Bilder, Dateien in `store/bilder/<Version>/`) aktualisieren und eine Kopie nach `/mnt/project-files/store/` legen. Dazu die zwei Artifacts neu veröffentlichen (gleiche Links, nicht neu anlegen): `python3 /mnt/project-files/store/artifact-bauen.py store <Ordner>` baut `store.html` und `bilder.html`. Store: https://claude.ai/artifact/8KVsbhhyR9ZUhs8Gp5U8Um, Bilder: https://claude.ai/artifact/KWACfnaGP6RQQoJBwKmM1L (Designdokument bleibt getrennt).
- Neue Bilder immer auch in `store/bilder/<Version>/` und in den Projektordner `/mnt/project-files/Silkreader-Bilder/` (gleiche Struktur, Namen `<Thema>-vorher.png` / `-nachher.png`, Store-Bilder in `Store/`) legen und `bilder/index.md` ergänzen.
- Interaktive Bildübersicht (Design-Canvas, neue Bilder dort hochladen und als Artboard ergänzen, gleicher Link): https://claude.ai/artifact/RxJqqvFxFavgQprohENe8n
