# Microsoft Store – alles für Silkreader an einem Ort

Fortlaufendes Dokument: Bei jeder neuen Version aktualisieren (Checkliste unten). Bilder: siehe `store/BILDER.md`.

## Stand

| | |
|---|---|
| Veröffentlicht im Store | 1.25.x (`package.json` auf main: 1.25.1) |
| In Vorbereitung | 1.28.0 auf GitHub veröffentlicht. Store-Paket 1.28.0 gebaut am 6. Nov., Probe-Installation grün (Actions „Store-Paket“, Lauf 42191863621, Entwurfs-Release `store-v1.28.0`, bereit zum Hochladen im Partner Center). 1.29.0 inkl. Aufräumen (U1–U4) wird veröffentlicht, Store-Paket 1.29.0 wird neu gebaut |
| Produkt-ID (Store-Link) | 9PHKJW54RGDS – https://apps.microsoft.com/detail/9PHKJW54RGDS |
| Pro-Add-on | `silkreader.pro`, Store-ID 9NBHSZQJ7CJP (Pro ist noch „bald“) |
| Paketname (Identity/Name) | SebbiLore.Silkreader |
| Herausgeber (Publisher) | CN=5B8315BE-3B5E-4EC9-8861-32B3317991B7, Anzeigename SebbiLore |
| Sprachen | de-DE, en-US |
| Windows mindestens | 10.0.17763.0 (1809), getestet bis 10.0.26100.0 |
| Paket bauen | Actions → „Store-Paket“ (`.github/workflows/store.yml`) → Entwurfs-Release `store-v<Version>` mit `Silkreader-Store-<Version>.msix`; baut, installiert und startet es zur Probe |
| Store-Logos | `build/appx/` (StoreLogo, Square44x44, Square150x150, Wide310x150, SmallTile, LargeTile) |
| Datenschutzhinweis | App: `src/privacy.html`; Text: `PRIVACY.md` (DE/EN). Öffentliche Datenschutz-URL fürs Partner Center: **fehlt** (vermutlich `https://github.com/Sebbilore/silkreader-download/blob/main/PRIVACY.md`, bitte prüfen) |
| Screenshots für den Store | **fehlt**, siehe „Bilder für den Store“ |
| Kategorie, Altersfreigabe, Preis | **fehlt** (nicht im Repo dokumentiert; Silkreader ist kostenlos) |
| Updates | Kommen über den Store; der eingebaute Updater ist in der Store-Version aus |

## Bilder für den Store (Partner Center → Store-Eintrag → Bilder)

Größen nach meinem Wissen über das Partner Center, bitte dort beim Hochladen gegenprüfen. Was Sebastian zusätzlich an Bildern hat und noch nicht im Repo liegt, bitte in `store/bilder/` ablegen und hier eintragen.

| Bild | Anforderung (Partner Center) | Vorhanden im Repo | Status |
|---|---|---|---|
| Screenshots | mindestens 1, bis zu 10, PNG, mind. 1366×768 (besser 16:9, gern 1920×1080) | Nur kleine Design-Bilder (z. B. Sprechblase 430×385, Willkommen 900×525) – zu klein | **fehlt** |
| Store-Logo 1:1 | 300×300 (oder größer, quadratisch) | `build/icon.png` 1024×1024 (kann verkleinert werden) | vorhanden, nicht hochgeladen geprüft |
| Poster 2:3 | 720×1080, optional | – | **fehlt** |
| Box-Art 1:1 | 1080×1080, optional | – | **fehlt** |
| Titelbild 16:9 | 1920×1080 oder 3840×2160, optional | – | **fehlt** |
| Paket-Logos (im .msix) | 44, 50, 71, 150, 310, 310×150 | `build/appx/*.png` (alle sechs) | vorhanden |
| Vektor-Icon | – | `build/icon.svg` | vorhanden |

Passende Bildinhalte (aus der App, DE und EN): Sprechblase mit Ergebnis, Willkommen, Spinnennetz-Ring, Kokons, Stimmungen der Spinne, Einstellungen. Die vorhandenen Bilder liegen unter `store/bilder/` und sind in `store/BILDER.md` verglichen; für den Store müssen sie als echte Bildschirmfotos in Mindestgröße neu aufgenommen werden (UI-Tests können Screenshots speichern: `node test/e2e.mjs <Ordner>`).

Hinweis: Die fünf Dateien in `uploads/hearth/` (Stand 5. Nov.) sind keine Silkreader-Bilder (Screenshots der Claude-Einstellungen und ein Skill-Archiv) und wurden hier nicht verwendet.

## Bei jedem Update zu tun

1. Version in `package.json` erhöhen, `CHANGELOG.md` und `src/whatsnew.js` ergänzen.
2. Unten „Neuerungen“ (DE und EN) in kurzem Stil neu schreiben: erste Zeile „Version X.Y – …“, dann Punkte mit „•“, max. 1500 Zeichen. Beschreibung, Produktfeatures und Suchbegriffe nur ändern, wenn sich Funktionen ändern.
3. Store-Paket bauen (Actions → „Store-Paket“, wird bei jeder neuen Version immer mitgebaut), Probelauf muss grün sein.
4. Partner Center: neue Einreichung → Paket (`.msix`) hochladen, Neuerungen DE/EN einfügen, Screenshots prüfen, einreichen.
5. Store-Bilder prüfen (Tabelle „Bilder für den Store“), `store/BILDER.md` und Bilder in `store/bilder/<Version>/` aktualisieren.

## Neuerungen 1.29.0

### Deutsch
Version 1.29 – sicherer und besser vorlesen
• Die Spinne prüft jetzt auch Daten, Fristen („4 Wochen“) und kleine Beträge gegen deinen Originaltext und markiert, was nicht stimmt.
• Neu: „Original vorlesen“ – der Text wird so vorgelesen, wie er dasteht, ohne KI.
• Beim Vorlesen: einen Satz zurück oder vor springen.
• Neu: Kombi-Modus – erst schnell lesen (vorläufig), bei „Mehr“ liest das gründliche Modell genauer.
• Neu: Geöffnete Mail im klassischen Outlook lesen (Strg+Alt+O) – nur diese eine Mail, nur auf Knopfdruck, direkt auf dem PC.
• Gedrehte Scans (PDF und Foto) werden erkannt. Beim Datei-Lesen zeigt die Spinne sofort, dass sie arbeitet.
• Bei Terminen und Fristen fragt die Spinne kurz nach, ob sie sie merken soll. Ohne Ja wird nichts gespeichert.
• Die Morgenmeldung der Fristen ist jetzt standardmäßig an (abschaltbar).
• Privatmodus löscht beim Beenden alles Gespeicherte.
• Aufgeräumt: jede Aktion nur einmal. „Merken“ legt einen Brief in „Meine Briefe“ und fragt, ob die Spinne erinnern soll.

### English
Version 1.29 – safer checks and better reading aloud
• Silkreader now also checks dates, deadlines ("4 weeks") and small amounts against your original text and marks what does not match.
• New: "Read original aloud" – the text is read exactly as written, without AI.
• While reading aloud: jump back or forward by one sentence.
• New: Combo mode – reads fast first (preliminary), with "More" the thorough model reads more carefully.
• New: read the open e-mail in classic Outlook (Ctrl+Alt+O) – only that one e-mail, only when you press the key, directly on your PC.
• Rotated scans (PDF and photo) are now recognised. When reading a file the spider shows at once that it is working.
• For dates and deadlines the spider asks briefly whether to remember them. Nothing is saved without your Yes.
• The morning deadline summary is now on by default (can be turned off).
• Private mode deletes everything saved when you quit.
• Tidier: every action only once. "Save" puts a letter in My letters and asks if the spider should remind you.

## Neuerungen 1.28.0 (Entwurf, erst mit dem Release einreichen)

### Deutsch
Version 1.28 – neue KI-Modelle
• Schnell nutzt jetzt Qwen3.5 2B, Gründlich Qwen3.5 4B: bessere Texte, besseres Deutsch.
• Wer schon ein Modell hatte, bekommt das neue automatisch im Hintergrund. Du musst nichts tun, und es wird nichts verschickt außer dem Modell-Download. Das alte bleibt, bis das neue da ist.

### English
Version 1.28 – new AI models
• Fast now uses Qwen3.5 2B, Thorough uses Qwen3.5 4B: better text and better German.
• If you already had a model, the new one is downloaded automatically in the background. You do not need to do anything, and nothing is sent except the model download. The old one stays until the new one is ready.

## Neuerungen 1.27.0 (Entwurf, erst mit dem Release einreichen)

### Deutsch
Version 1.27 – klügere Termine
• Nach dem Lesen zeigt das Ergebnis oben wieder die Auswahl: Lesen, Übersetzen, Einfach und Antworten.
• Artikel, zum Beispiel aus Wikipedia, schlagen keine Fristen mehr vor. Nur Briefe und Bescheide mit echten Fristwörtern tun das.

### English
Version 1.27 – smarter dates
• After reading, the result shows the choice at the top again: Read, Translate, Simple and Reply.
• Articles, for example from Wikipedia, no longer suggest deadlines. Only letters and notices with real deadline words do.

## Neuerungen 1.26.0 (Entwurf, erst mit dem Release einreichen)

### Deutsch
Version 1.26 – ruhiger, nur noch auf deinem PC
• Silkreader liest jetzt nur noch mit dem Modell auf deinem PC. Claude und Ollama gibt es nicht mehr. Ein früher gespeicherter API-Schlüssel wurde gelöscht. Es wird weiterhin nichts ins Internet gesendet.
• Neu: Der Kontrastmodus von Windows wird unterstützt, Screenreader können die Spinne benennen.
• Die Pro-Karte in den Einstellungen ist ruhiger geworden.

### English
Version 1.26 – calmer, only on your PC
• Silkreader now reads only with the model on your PC. Claude and Ollama are gone. An API key you saved earlier has been deleted. Still nothing is sent over the internet.
• New: Windows high-contrast mode is supported, and screen readers can name the spider.
• The Pro card in Settings is calmer now.

---

## Texte der veröffentlichten Version 1.25 (Stand 1.25.0)

Zum Kopieren ins Partner Center (Store-Einträge → Deutsch / Englisch).

---

## Deutsch

### Kurzbeschreibung (Short description)

Eine kleine Spinne liest deine Briefe: Text markieren, antippen – und du weißt, was zu tun ist. Betrag, Frist und IBAN sofort oben. Die KI läuft auf deinem PC, nichts geht ins Internet.

### Beschreibung (Description)

Rechnung, Mahnung, Bescheid vom Amt oder ein Vertrag voller Fachwörter? Silkreader ist eine kleine Spinne, die oben an deinem Bildschirm hängt. Markiere den Text, tipp die Spinne an – und sie sagt dir in einfachen Worten, was drinsteht und was du tun musst.

WAS DU TUN MUSST – SOFORT OBEN
• Betrag, Frist mit „noch 12 Tage“ und IBAN zum Kopieren
• Mit einem Klick in den Kalender
• „Was passiert, wenn ich nichts tue?“ bei Mahnungen und Bescheiden

DAS WICHTIGSTE IN 3 STICHPUNKTEN
Kein langes Lesen: Oben stehen die Aufgabe und die drei wichtigsten Punkte. Alles Weitere – Zahlungsdaten, Vergleich mit früheren Briefen, Kernaussagen mit Fundstelle – unter „Mehr aus dem Brief“.

SCHÜTZT DICH
• Warnt vor Betrugs-Briefen (fremde IBAN, Gutscheinkarten, Zeitdruck, Links, PIN-Abfrage)
• Erkennt, wenn eine Unterschrift nötig ist – mit Seite und Rücksendeadresse
• Erinnert dich rechtzeitig an Fristen

IN DEINER SPRACHE
Lass dir deutsche Briefe auf Türkisch, Arabisch, Ukrainisch, Russisch, Polnisch, Rumänisch oder Englisch erklären – oder vorlesen.

MEINE BRIEFE
Alle gelesenen Briefe an einem Ort, mit Suche, offenen Fristen und „Später lesen“. Stell Fragen an den Text – die Spinne zeigt dir die passende Stelle.

LERNT MIT – NUR AUF DEINEM PC
Unter jedem Ergebnis fragst du „War das richtig?“. Korrigierst du einen Betrag oder eine Frist, macht die Spinne es beim nächsten Brief vom selben Absender richtig.

PRIVAT UND SCHNELL
• Die KI läuft direkt auf deinem PC – deine Briefe verlassen ihn nie. 0 Bytes ins Internet.
• Kein Konto, keine Werbung, kein Tracking
• Betrag und Frist stehen nach einem Augenblick da, die Zusammenfassung meist nach 10 bis 20 Sekunden
• Braucht im Leerlauf kaum Leistung, mit Sparmodus für ältere PCs

SO EINFACH
• Text markieren, Spinne antippen
• Brief mit der Webcam fotografieren (auch mehrere Seiten), PDF oder Word-Datei öffnen, Bildschirmbereich lesen
• Große Schrift, hoher Kontrast und Vorlesen mit Markierung

Silkreader ist kostenlos. Silkreader Pro (bald) ergänzt Übersetzen, Einfach erklären, Antwort-Vorlagen (Widerspruch, Ratenzahlung, Kündigung), Vertrags-Check mit Kündigungs-Erinnerung, gescannte PDFs und ein gründlicheres KI-Modell.

Hinweis: KI kann sich irren. Wichtige Angaben wie Beträge und Fristen bitte im Original prüfen. Silkreader ersetzt keine Rechtsberatung.

### Neuerungen in dieser Version (What's new, max. 1500 Zeichen)

Version 1.25 – sofort da, neue graue Darstellungen
• Sofort da: Ein Klick auf die Spinne öffnet die Sprechblase ohne Wartezeit, Betrag und Frist stehen nach einem Augenblick oben.
• Fotos, Bildschirmbereiche und gescannte PDFs werden schneller gelesen.
• Neu: „Hell · Grau“ und „Dunkel · Grau“ – ruhiges Grau statt Pink, auch für die Spinne.
• Alle Fristen auf einmal in den Kalender, Antworten direkt als E-Mail öffnen.
• Die Spinne hält bei einer nahen Frist ein Schild hoch und warnt bei Betrugsverdacht.

Aus Version 1.24: noch schneller, ein Viertel kleinerer Download, sparsamer im Hintergrund.

### Produktfeatures (Product features, je max. 200 Zeichen)

1. Sagt dir sofort, was zu tun ist: Betrag, Frist und IBAN zum Kopieren
2. Das Wichtigste aus jedem Brief in 3 einfachen Stichpunkten
3. Warnt vor Betrugs-Briefen und erkennt, wenn eine Unterschrift nötig ist
4. Erinnert dich rechtzeitig an Fristen
5. Erklärt Briefe auf Türkisch, Arabisch, Ukrainisch, Russisch, Polnisch und mehr
6. KI läuft auf deinem PC – deine Briefe gehen nicht ins Internet
7. Brief fotografieren, PDF oder Word öffnen, Bildschirmbereich lesen
8. Lernt aus deinen Korrekturen – nur lokal
9. Vorlesen, große Schrift und hoher Kontrast
10. Kostenlos, ohne Konto und ohne Werbung

### Suchbegriffe (Search terms, max. 7)

Brief verstehen · Behördenbrief · Rechnung · Mahnung · Bescheid erklären · Frist · einfache Sprache

---

## English

### Short description

A small spider reads your letters: select the text, tap it – and you know what to do. Amount, deadline and IBAN right at the top. The AI runs on your PC; nothing goes to the internet.

### Description

An invoice, a payment reminder, an official notice or a contract full of jargon? Silkreader is a small spider that hangs at the top of your screen. Select the text, tap the spider – and it tells you in plain words what it says and what you need to do.

WHAT YOU NEED TO DO – RIGHT AT THE TOP
• Amount, deadline with “12 days left” and the IBAN to copy
• Add it to your calendar with one click
• “What happens if I do nothing?” for reminders and official notices

THE ESSENTIALS IN 3 BULLET POINTS
No long reading: the task and the three most important points come first. Everything else – payment details, comparison with earlier letters, key points with the source passage – is under “More from the letter”.

PROTECTS YOU
• Warns about scam letters (foreign IBAN, gift cards, pressure, links, PIN requests)
• Notices when a signature is needed – with page and return address
• Reminds you of deadlines in time

IN YOUR LANGUAGE
Have German letters explained in Turkish, Arabic, Ukrainian, Russian, Polish, Romanian or English – or read aloud.

MY LETTERS
All letters you have read in one place, with search, open deadlines and “Read later”. Ask questions about the text – the spider shows you the matching passage.

LEARNS – ONLY ON YOUR PC
Below every result: “Was that right?” If you correct an amount or a deadline, the spider gets it right for the next letter from the same sender.

PRIVATE AND FAST
• The AI runs right on your PC – your letters never leave it. 0 bytes sent to the internet.
• No account, no ads, no tracking
• Amount and deadline appear within a moment, the summary usually within 10 to 20 seconds
• Uses hardly any power when idle, with a power-saving mode for older PCs

SIMPLE
• Select text, tap the spider
• Photograph a letter with your webcam (several pages too), open a PDF or Word file, read a screen region
• Large text, high contrast and read-aloud with highlighting

Silkreader is free. Silkreader Pro (coming soon) adds translation, plain-language explanations, reply templates (objection, instalments, cancellation), a contract check with cancellation reminder, scanned PDFs and a more thorough AI model.

Note: AI can make mistakes. Please check important details such as amounts and deadlines in the original. Silkreader is not legal advice.

### What's new in this version

Version 1.25 – instant, new grey appearances
• Instant: a click on the spider opens the speech bubble right away; amount and deadline appear a moment later.
• Photos, screen regions and scanned PDFs are read faster.
• New: “Light · Grey” and “Dark · Grey” – calm grey instead of pink, the spider included.
• Add all deadlines to your calendar at once, open replies directly as an e-mail.
• The spider holds up a sign when a deadline is near and warns on suspected scams.

From version 1.24: even faster, a quarter smaller download, lighter in the background.

### Product features

1. Tells you right away what to do: amount, deadline and IBAN to copy
2. The essentials of every letter in 3 plain bullet points
3. Warns about scam letters and notices when a signature is needed
4. Reminds you of deadlines in time
5. Explains letters in Turkish, Arabic, Ukrainian, Russian, Polish and more
6. The AI runs on your PC – your letters don't go to the internet
7. Photograph a letter, open a PDF or Word file, read a screen region
8. Learns from your corrections – only locally
9. Read aloud, large text and high contrast
10. Free, no account, no ads

### Search terms

understand letters · German letters · invoice · payment reminder · official notice · deadline · plain language
