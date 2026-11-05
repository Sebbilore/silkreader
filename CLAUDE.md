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
