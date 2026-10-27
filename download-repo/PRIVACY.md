# Datenschutz / Privacy – Silkreader

_English below._

Kurz gesagt: Silkreader hat keine eigenen Server, kein Konto, keine Werbung und kein Tracking.

## Was auf deinem PC bleibt

- Texte und Ergebnisse beim eingebauten Modell: Die KI läuft vollständig auf deinem PC.
- Notizbuch: die letzten 20 gelesenen Texte samt Ergebnis, gespeichert in `%APPDATA%\Silkreader\history.json`.
- Spinnennetz: angeheftete Dateien (nur der Pfad) und Texte in `cocoons.json`.
- Einstellungen in `settings.json`; ein Claude-API-Schlüssel wird mit Windows verschlüsselt gespeichert.
- Protokoll (silkreader-errors.log): technische Abläufe und Fehler, keine gelesenen Texte.
- Bildschirmfotos: Um die markierten Wörter zu finden, wertet Silkreader kurz ein Bildschirmfoto im Arbeitsspeicher aus. Es wird nie gespeichert oder verschickt. Abschaltbar („Große Spinne liest mit“).
- Zwischenablage: Nur wenn du es einschaltest, schaut Silkreader nach, ob du Dateien oder längere Texte kopiert hast. Beim Lesen markierter Texte wird die Zwischenablage kurz benutzt und danach wiederhergestellt.

## Was deinen PC verlässt – nur wenn du es nutzt

- Claude (Anthropic): Wählst du Claude, werden die Texte, die du lesen, übersetzen oder befragen lässt, an Anthropic geschickt und dort verarbeitet. Es gelten die Datenschutzbestimmungen von Anthropic.
- Ollama: läuft lokal auf deinem PC; Silkreader spricht es nur über 127.0.0.1 an.
- Modell-Download: Das eingebaute Modell wird einmalig von Hugging Face geladen.
- Updates: Silkreader fragt bei GitHub nach neuen Versionen. Dabei sieht GitHub wie bei jedem Webseitenaufruf deine IP-Adresse.
- Problem melden: öffnet GitHub im Browser. Es wird nichts automatisch verschickt – du siehst alles, bevor du es absendest.
- Microsoft-Store-Version: Updates kommen über den Microsoft Store, nicht über GitHub.

## Löschen

Notizbuch-Einträge lassen sich einzeln löschen. Beim Deinstallieren bleiben deine Daten in `%APPDATA%\Silkreader` erhalten – lösche diesen Ordner, um alles zu entfernen. Bei der Microsoft-Store-Version entfernt Windows die Daten beim Deinstallieren automatisch.

## KI-Hinweis

Zusammenfassungen, Übersetzungen und Antworten erstellt eine KI. Sie kann sich irren oder Dinge auslassen. Prüfe wichtige Angaben – besonders bei Verträgen, Fristen und Zahlen – immer im Original.

---

## Privacy at Silkreader

In short: Silkreader has no servers of its own, no account, no ads and no tracking.

## What stays on your PC

- Texts and results with the built-in model: the AI runs entirely on your PC.
- Notebook: your last 20 texts with their results, stored in `%APPDATA%\Silkreader\history.json`.
- Spider web: pinned files (path only) and texts in `cocoons.json`.
- Settings in `settings.json`; a Claude API key is stored encrypted by Windows.
- Log (silkreader-errors.log): technical steps and errors, never the texts you read.
- Screenshots: to find the selected words, Silkreader briefly analyzes a screenshot in memory. It is never saved or sent. Can be turned off (“Big spider reads along”).
- Clipboard: only if you turn it on, Silkreader checks whether you copied files or longer texts. When reading a selection, the clipboard is used briefly and restored afterwards.

## What leaves your PC – only if you use it

- Claude (Anthropic): if you choose Claude, the texts you have read, translated or questioned are sent to and processed by Anthropic. Anthropic’s privacy policy applies.
- Ollama: runs locally on your PC; Silkreader only talks to it via 127.0.0.1.
- Model download: the built-in model is downloaded once from Hugging Face.
- Updates: Silkreader asks GitHub for new versions. Like any web request, GitHub sees your IP address.
- Report a problem: opens GitHub in your browser. Nothing is sent automatically – you review everything before submitting.
- Microsoft Store version: updates come through the Microsoft Store, not GitHub.

## Deleting

Notebook entries can be deleted one by one. Uninstalling keeps your data in `%APPDATA%\Silkreader` – delete that folder to remove everything. With the Microsoft Store version, Windows removes the data automatically when uninstalling.

## About AI

Summaries, translations and answers are written by an AI. It can be wrong or leave things out. Always check important details – especially contracts, deadlines and figures – in the original.

Kontakt / Contact: https://github.com/Sebbilore/silkreader-download/issues
