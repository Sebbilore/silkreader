// Sprache der Oberfläche (Deutsch / Englisch).
// Die App ist auf Deutsch geschrieben; dieses Wörterbuch übersetzt sichtbare Texte ins Englische.
// Im Browserfenster übersetzt es auch nachträglich eingefügte Texte automatisch (MutationObserver) –
// Inhalte von Dokumenten und KI-Ergebnisse bleiben unberührt (data-noi18n, genaue Treffer).
(function () {
  const EN = {
    // ---- allgemein ----
    'Silkreader': 'Silkreader',
    'Lesen': 'Read', 'Übersetzen': 'Translate', 'Einfach': 'Simplify', 'Antworten': 'Reply',
    'Bereich': 'Region', 'Ins Netz': 'To web', 'Notizbuch': 'Notebook', 'Mehr': 'More',
    'Datei lesen': 'Read file', 'Zwischenabl.': 'Clipboard', 'Lesemodus': 'Reading mode', 'Einstellungen': 'Settings',
    'Verstecken': 'Hide', 'Zurück': 'Back', 'Über': 'About',
    'Kopieren': 'Copy', 'Festhalten': 'Keep', 'Vorlesen': 'Read aloud', 'Stopp': 'Stop', 'Kürzer': 'Shorter',
    'Förmlicher': 'More formal', 'Lockerer': 'More casual', 'Erneut versuchen': 'Try again', 'OK': 'OK',
    '✓ Kopiert': '✓ Copied', 'Kopiert ✓': 'Copied ✓', '✓ Im Netz': '✓ In the web', '✓ geöffnet': '✓ opened', 'nicht möglich': 'not possible',
    'Löschen': 'Delete', 'Schließen (Esc)': 'Close (Esc)', 'Schließen': 'Close', 'Speichern': 'Save', 'Gespeichert ✓': 'Saved ✓',
    'Abbrechen': 'Cancel', 'Herunterladen': 'Download', 'Weiter': 'Next', "Los geht's": "Let's go",

    // ---- 1.19: Zahlen-Prüfung, Brief-Hilfe, Bewertung, Pro ----
    'Steht so nicht im Text – bitte prüfen': 'Not in the text like this – please check', 'Steht so im Text': 'Appears like this in the text',
    'Aus dem Text berechnet': 'Calculated from the text', 'Nicht im Text gefunden – bitte prüfen': 'Not found in the text – please check',
    'Gestrichelte Zahlen stehen so nicht im Text – bitte prüfen.': 'Underlined numbers do not appear like this in the text – please check.',
    '{a} bezahlen bis {d}': 'Pay {a} by {d}', '{a} bezahlen': 'Pay {a}', 'Bei Bedarf {w} einlegen bis {d}': 'If needed, file {w} by {d}',
    'Prüfen, ob du {w} einlegen willst': 'Check whether you want to file {w}', 'Frist beachten: {d}': 'Note the deadline: {d}',
    'An': 'To', 'Frist': 'Deadline', 'Verwendungszweck': 'Payment reference', 'Aktenzeichen': 'File number',
    'Rechnungsnummer': 'Invoice number', 'Kundennummer': 'Customer number', 'Steuernummer': 'Tax number',
    '(ab Briefdatum)': '(from the letter date)', '(ca., ab heute)': '(approx., from today)', 'Was muss ich tun?': 'What do I need to do?',
    'Mahnung': 'Payment reminder', 'Rechnung': 'Invoice', 'Bescheid': 'Official notice', 'Vertrag': 'Contract', 'Kündigung': 'Cancellation',
    'Antwort schreiben': 'Write a reply', '{w} schreiben': 'Write {w}',
    'Hilft dir die Spinne? Eine kurze Bewertung im Store hilft ihr sehr.': 'Is the spider helping you? A short review in the Store helps it a lot.',
    'Ja, bewerten': 'Yes, rate it', 'Geht so': 'So-so', 'Danke! 🕷': 'Thank you! 🕷', 'Schade – was können wir besser machen?': 'Too bad – what could we do better?',
    'Bisher gefunden': 'Found so far', 'Sucht Zahlen, Fristen und Details …': 'Looking for figures, deadlines and details …',
    '{f} gibt es mit Silkreader Pro.': '{f} is available with Silkreader Pro.', 'Einfach erklären': 'Simple explanations', 'Antworten schreiben': 'Writing replies',
    'Brief-Hilfe (Was muss ich tun?, IBAN, Widerspruch)': 'Letter help (what to do, IBAN, objection)', 'Gescannte PDFs und Bilder lesen': 'Reading scanned PDFs and images',
    'Gründliches KI-Modell': 'Thorough AI model',

    'Tipp: Mit dem gründlichen KI-Modell werden andere Sprachen deutlich besser.': 'Tip: other languages work much better with the thorough AI model.',
    'Mit Windows starten …': 'Start with Windows …',
    'Silkreader Pro': 'Silkreader Pro', 'Silkreader Pro ✓': 'Silkreader Pro ✓', 'Silkreader Pro …': 'Silkreader Pro …', 'Pro ist aktiv': 'Pro is active', 'Pro ist aktiv ✓': 'Pro is active ✓',
    'per Code, gültig bis {d}': 'via code, valid until {d}', 'per Code, unbegrenzt': 'via code, unlimited', 'über den Microsoft Store': 'via the Microsoft Store',
    'Mehr aus deinen Briefen holen.': 'Get more out of your letters.', 'Kommt bald': 'Coming soon',
    // ---- neues Design ----
    'Frage zum Text stellen': 'Ask about the text', 'Weitere Aktionen': 'More actions', 'Was du tun musst': 'What you need to do',
    'bis {d}': 'by {d}', 'noch {n} Tage': '{n} days left', 'Bei Bedarf {w} einlegen': 'If needed, file {w}', 'Frist beachten': 'Note the deadline',
    'In den Kalender': 'Add to calendar', 'Kündigen bis {d}': 'Cancel by {d}', 'Worum es geht': 'What it is about',
    'Mehr aus dem Text': 'More from the text', 'Weniger anzeigen': 'Show less',
    'KI-Ergebnis. Beträge und Fristen bitte im Original prüfen.': 'AI result. Please check amounts and deadlines in the original.',
    'Im Kalender geöffnet': 'Opened in calendar',
    'Hallo! Schön, dass du da bist.': 'Hello! Nice to see you.', 'Ich bin Silkreader, eine kleine Spinne. Ich lese deine Briefe hier auf dem PC und erkläre sie dir.': 'I am Silkreader, a little spider. I read your letters right here on your PC and explain them to you.',
    'Gern geschehen!': "You're welcome!", '42. Aber frag mich lieber etwas zu deinem Text.': '42. But better ask me something about your text.', 'Fliegen? Lieber Briefe. Und dich mag ich sowieso.': 'Flies? I prefer letters. And I like you anyway.',
    'Gebaut aus acht Beinen Neugier und sehr viel Seide.': 'Made of eight legs of curiosity and lots of silk.', 'Hatschi!': 'Achoo!', 'Hihi, das kitzelt!': 'Hehe, that tickles!', 'Mir ist schwindelig …': "I'm dizzy …", 'Noch wach? Ich auch …': 'Still up? Me too …', 'Darstellung': 'Appearance', 'Wie Windows': 'Use Windows setting', 'Hell': 'Light', 'Dunkel': 'Dark', 'KI': 'AI', 'Spinne und Verhalten': 'Spider and behaviour', 'Zum Ändern anklicken und neue Tasten drücken.': 'Click to change, then press the new keys.', 'abgelaufen': 'expired', 'sonst verlängert sich der Vertrag': 'otherwise the contract renews', 'Kopiert': 'Copied', 'Gespeichert': 'Saved', 'Im Netz': 'In the web',
    'Immer frei: Zusammenfassen, Fragen an den Text, Fristen, Notizbuch, In deiner Sprache.': 'Always free: summaries, questions about the text, deadlines, notebook, in your language.',
    'Pro im Microsoft Store holen': 'Get Pro in the Microsoft Store', 'Pro kaufen geht in der Silkreader-Version aus dem Microsoft Store.': 'Pro can be bought in the Microsoft Store version of Silkreader.', 'Silkreader im Microsoft Store öffnen': 'Open Silkreader in the Microsoft Store', 'Du hast einen Code?': 'Have a code?', 'Einlösen': 'Redeem',
    'Dieser Code ist unvollständig. Bitte genau so einfügen, wie du ihn bekommen hast.': 'This code is incomplete. Please paste it exactly as you received it.',
    'Dieser Code ist nicht gültig.': 'This code is not valid.',
    'Was muss ich tun? Betrag, Frist, IBAN zum Kopieren': 'What do I need to do? Amount, deadline, IBAN to copy', 'Mit Silkreader Pro anzeigen': 'Show with Silkreader Pro',
    'Vertrags-Check mit Kündigungs-Erinnerung': 'Contract check with cancellation reminder', 'Antwort-Vorlagen': 'Reply templates', 'Frag dein Notizbuch': 'Ask your notebook', 'Mappen': 'Folders',
    'Gehört zu Silkreader Pro': 'Part of Silkreader Pro', 'mehr': 'more',
    'Ratenzahlung': 'Instalments', 'Fristverlängerung': 'Extension', 'Rückfrage': 'Question', 'Kündigung schreiben': 'Write a cancellation', 'Vorlage:': 'Template:',
    '{n} Jahr': '{n} year', '{n} Jahre': '{n} years', '{n} Monat': '{n} month', '{n} Monate': '{n} months', 'Laufzeit': 'Term', 'Beginn': 'Start', 'Ende': 'End', 'Kündigungsfrist': 'Notice period',
    'Kündigen bis': 'Cancel by', 'verpasst': 'missed', 'Danach': 'Afterwards', 'verlängert sich um {m}': 'renews for {m}', 'läuft unbefristet weiter': 'continues indefinitely',
    'verlängert sich automatisch': 'renews automatically', 'Kosten': 'Cost', '{p} pro Monat': '{p} per month', 'Laufzeit und Kündigung': 'Term and cancellation',
    'Laufzeit, Kündigen bis, Verlängerung': 'Term, cancel by, renewal',
    'Preiserhöhungen sind möglich – bei einer Erhöhung hast du oft ein Sonderkündigungsrecht.': 'Price increases are possible – after an increase you often have a special right to cancel.',
    'Gut zu wissen: Bei Verträgen ab März 2022 kannst du nach der Mindestlaufzeit meist monatlich kündigen.': 'Good to know: for German contracts from March 2022 you can usually cancel monthly after the minimum term.',
    'Die Kündigungsfrist steht im Fristen-Netz – Silkreader erinnert dich rechtzeitig.': 'The cancellation deadline is in your deadline web – Silkreader reminds you in time.',
    'Spätestens kündigen, sonst verlängert sich der Vertrag.': 'Cancel by then, otherwise the contract renews.',
    'Suchen – oder fragen und Enter drücken …': 'Search – or ask and press Enter …', 'Alle': 'All', 'Keine Mappe': 'No folder', 'Mappe': 'Folder',
    'Die Spinne blättert im Notizbuch …': 'The spider is leafing through the notebook …', 'Im Notizbuch ist noch nichts gespeichert.': 'Nothing is saved in the notebook yet.',
    'Steuer': 'Taxes', 'Wohnung': 'Home', 'Verträge': 'Contracts', 'Versicherung': 'Insurance', 'Gesundheit': 'Health', 'Arbeit': 'Work', 'Bank': 'Bank', 'Sonstiges': 'Other',
    'Neue Datei – Klick zum Lesen': 'New file – click to read', 'Neue Downloads (PDF, Fotos) zum Lesen anbieten': 'Offer to read new downloads (PDFs, photos)',
    '0 Bytes ins Internet gesendet': '0 bytes sent to the internet', '{kb} KB an Claude gesendet': '{kb} KB sent to Claude',
    'Als PDF speichern': 'Save as PDF', 'Drucken': 'Print', '✓ gespeichert': '✓ saved', 'erklärt am {d}': 'explained on {d}',
    'Erstellt mit Silkreader. KI-Ergebnis – wichtige Angaben bitte im Original prüfen.': 'Made with Silkreader. AI result – please check important details in the original.',
    'Brief fotografieren': 'Photograph a letter', 'Brief fotografieren …': 'Photograph a letter …', 'Foto aufnehmen': 'Take photo', 'Nochmal': 'Retake', 'Lese …': 'Reading …',
    'Brief gerade in den Rahmen halten. Leertaste macht das Foto.': 'Hold the letter straight inside the frame. Space takes the photo.', 'Ist der Text gut lesbar?': 'Is the text easy to read?',
    'Keine Kamera gefunden oder der Zugriff ist gesperrt (Windows-Einstellungen → Datenschutz → Kamera).': 'No camera found or access is blocked (Windows Settings → Privacy → Camera).',
    'Alle Rechte vorbehalten': 'All rights reserved',
    'Sprache': 'Language', 'In meiner Sprache erklären': 'Explain in my language', 'Erklären auf …': 'Explain in …',
    'Fristen': 'Deadlines', 'Fristen ({n} bald)': 'Deadlines ({n} soon)', 'heute': 'today', 'morgen': 'tomorrow', 'in {n} Tagen': 'in {n} days',
    'Frist {w}: {t}': 'Deadline {w}: {t}', 'Wieder offen': 'Mark as open', 'Erledigt': 'Done', 'Brief öffnen': 'Open letter', 'Erledigt ({n})': 'Done ({n})',
    'Keine offenen Fristen. Lies einen Brief, eine Rechnung oder einen Bescheid – die Spinne sammelt die Fristen hier und erinnert dich rechtzeitig.': 'No open deadlines. Read a letter, an invoice or an official notice – the spider collects the deadlines here and reminds you in time.',
    // ---- Sprechblase ----
    'Die Spinne liest …': 'The spider is reading …', 'Die Spinne schreibt …': 'The spider is writing …',
    'Die Spinne sucht …': 'The spider is searching …', 'Die Spinne vergleicht …': 'The spider is comparing …',
    'Modell wird geladen …': 'Loading model …', 'Analysiere …': 'Analyzing …', 'Schreibt die Zusammenfassung …': 'Writing the summary …',
    'Mehr ▾': 'More ▾', 'Weniger ▴': 'Less ▴',
    'Kernaussagen': 'Key points', 'Erkenntnisse': 'Insights', 'Angaben': 'Figures', 'Gefundene Angaben': 'Figures found',
    'Das Wichtigste': 'The essentials', 'Unterschiede': 'Differences', 'Gemeinsam': 'In common',
    'Risiko': 'Risk', 'Chance': 'Opportunity', 'Handlung': 'Action', 'Beobachtung': 'Observation',
    '+ Kalender': '+ Calendar',
    'Frag den Text … (Enter)': 'Ask the text … (Enter)', 'Stelle zeigen →': 'Show passage →',
    'Auf dem Bildschirm zeigen': 'Show on screen', 'Im Lesemodus': 'In reading mode', 'nicht mehr auf dem Bildschirm': 'no longer on screen',
    'Diese Stelle steht so nicht wörtlich im Text.': 'This passage does not appear word for word in the text.',
    'Diese Stelle steht so nicht wörtlich im Text': 'This passage does not appear word for word in the text',
    'Nur der Anfang wurde bearbeitet (eingebautes Modell).': 'Only the beginning was processed (built-in model).',
    'KI-Ergebnis · wichtige Angaben bitte im Original prüfen': 'AI result · please check important details in the original',
    'Was soll ich lesen?': 'What should I read?', 'Text einfügen … (Enter)': 'Paste text … (Enter)',
    'Datei lesen …': 'Read file …', 'Bereich lesen': 'Read region', 'Zuletzt': 'Recent', 'Zuletzt gelesen': 'Recently read', 'Datei': 'File',
    'Erst Text markieren – oder hier einfügen:': 'Select some text first – or paste it here:',
    'Die Zwischenablage ist leer – Text hier einfügen:': 'The clipboard is empty – paste text here:',
    'Suchen …': 'Search …', 'Nichts gefunden.': 'Nothing found.', 'Nichts gefunden': 'Nothing found',
    'Noch nichts gelesen – die Spinne merkt sich hier die letzten 20 Texte.': 'Nothing read yet – the spider keeps your last 20 texts here.',
    'KI': 'AI', 'Eingebaut': 'Built-in', 'Klick auf die Spinne': 'Clicking the spider', 'Sprache der Ergebnisse': 'Language of results',
    'Sprache der App': 'App language',
    'Deutsch': 'German', 'Englisch': 'English', 'Französisch': 'French', 'Spanisch': 'Spanish', 'Italienisch': 'Italian', 'Wie das Dokument': 'Same as document',
    'Große Spinne liest mit': 'Big spider reads along', 'Kopierte Dateien ins Netz': 'Copied files into the web',
    'Bei kopiertem Text anbieten, ihn zu lesen': 'Offer to read copied text', 'Sparmodus': 'Power saving', '(nach Neustart)': '(after restart)',
    'Für Claude fehlt noch der Schlüssel –': 'Claude still needs an API key –', 'eintragen …': 'enter it …',
    'Tastenkürzel & mehr …': 'Shortcuts & more …', 'Alle Einstellungen …': 'All settings …',
    'Markierter Text': 'Selected text', 'Kopierter Text': 'Copied text', 'Eingefügter Text': 'Pasted text', 'Gezogener Text': 'Dropped text',
    'Aus der Zwischenablage': 'From the clipboard', 'Text aus der Zwischenablage': 'Text from the clipboard', 'Bildschirmausschnitt': 'Screen region',
    'Text aus dem Kokon': 'Text from the cocoon',
    'Übersetzung': 'Translation', 'Einfach erklärt': 'In plain words', 'Antwort-Entwurf': 'Reply draft', 'Vergleich': 'Comparison',
    'Kein Text erkannt': 'No text recognized', 'Datei konnte nicht gelesen werden': 'Could not read the file',
    'In diesem Bereich hat die Windows-Texterkennung keinen Text gefunden. Tipp: einen größeren Bereich wählen oder in den Einstellungen Claude nutzen – Claude kann auch Bilder lesen.':
      'Windows text recognition found no text in this region. Tip: choose a larger region, or use Claude in the settings – Claude can also read images.',
    'Kopiert – Klick zum Lesen': 'Copied – click to read',

    // ---- Über / Problem melden ----
    'Über Silkreader': 'About Silkreader', 'Eine Spinne, die für dich liest.': 'A spider that reads for you.',
    'Zusammenfassungen und Antworten erstellt eine KI. Sie kann sich irren – bei Verträgen, Fristen und Zahlen bitte immer das Original prüfen.':
      'Summaries and answers are written by an AI. It can be wrong – always check the original for contracts, deadlines and figures.',
    'Datenschutz': 'Privacy', 'Lizenzen': 'Licenses', 'Was ist neu?': "What's new?", 'Problem melden': 'Report a problem', 'Protokoll öffnen': 'Open log',
    'Kostenlos · MIT-Lizenz': 'Free · MIT license',
    'Beschreibe kurz, was passiert ist. Beim Senden öffnet sich GitHub im Browser – dort siehst du alles, bevor es abgeschickt wird (GitHub-Konto nötig).':
      'Briefly describe what happened. Sending opens GitHub in your browser – you can review everything there before it is submitted (GitHub account needed).',
    'Was ist passiert?': 'What happened?',
    'Protokoll der letzten Abläufe anhängen (keine Texte, nur technische Schritte)': 'Attach the log of recent steps (no texts, technical steps only)',
    'Im Browser öffnen': 'Open in browser',

    // ---- Spinne ----
    'Hier ablegen': 'Drop here', 'Klick: Lesen': 'Click: Read', 'Klick: Übersetzen': 'Click: Translate', 'Klick: Einfach': 'Click: Simplify', 'Klick: Antworten': 'Click: Reply',

    // ---- Bereich wählen ----
    'Bereich aufziehen, den die Spinne lesen soll. Esc bricht ab.': 'Drag over the area the spider should read. Esc cancels.', 'Bereich wählen': 'Choose region',

    // ---- Willkommen ----
    'Willkommen': 'Welcome', 'Hallo, ich bin Silkreader': "Hi, I'm Silkreader",
    'Ich hänge oben an deinem Bildschirm und lese für dich.': 'I hang at the top of your screen and read for you.',
    'Text markieren und auf mich klicken – ich fasse ihn zusammen.': 'Select text and click me – I will summarize it.',
    'Rechtsklick auf mich (oder Strg+Alt+Leertaste): mein Netz mit allen Aktionen.': 'Right-click me (or Ctrl+Alt+Space): my web with all actions.',
    'Dateien auf mich ziehen: Ich halte sie in meinem Netz fest.': 'Drag files onto me: I keep them in my web.',
    'Mit dem Mausrad auf mir wählst du, was ein Klick tut: lesen, übersetzen, vereinfachen, antworten.': 'Scroll on me to choose what a click does: read, translate, simplify, reply.',
    'Womit soll ich lesen?': 'What should I read with?',
    'Kostenlos und offline. Einmalig ca. 1 GB herunterladen – deine Texte bleiben auf dem PC.': 'Free and offline. One-time download of about 1 GB – your texts stay on your PC.',
    'Beste Qualität. Braucht einen API-Schlüssel von Anthropic (ein paar Cent pro Text). Deine Texte werden dafür an Anthropic geschickt.':
      'Best quality. Needs an API key from Anthropic (a few cents per text). Your texts are sent to Anthropic for this.',
    'Später entscheiden': 'Decide later', 'Das kannst du jederzeit in den Einstellungen ändern.': 'You can change this any time in the settings.',
    'Jetzt herunterladen': 'Download now', 'API-Schlüssel (sk-ant-…)': 'API key (sk-ant-…)', 'Schlüssel erstellen': 'Create a key',
    'Starte Download …': 'Starting download …', '✓ Fertig geladen': '✓ Download complete',
    'Deine Daten': 'Your data',
    'Bleibt auf deinem PC': 'Stays on your PC', 'Verlässt deinen PC nur, wenn du es willst': 'Only leaves your PC if you want it to',
    'Texte und Ergebnisse beim eingebauten Modell, dein Notizbuch (letzte 20 Texte) und angeheftete Dateien. Bildschirmfotos zum Finden der Markierung bleiben nur kurz im Arbeitsspeicher und werden nie gespeichert.':
      'Texts and results with the built-in model, your notebook (last 20 texts) and pinned files. Screenshots used to find your selection stay in memory for a moment and are never saved.',
    'Mit Claude gehen die Texte, die du lesen lässt, an Anthropic. Updates werden bei GitHub abgefragt, das eingebaute Modell einmalig von Hugging Face geladen. Keine Werbung, kein Tracking, kein Konto.':
      'With Claude, the texts you have read are sent to Anthropic. Updates are checked on GitHub, the built-in model is downloaded once from Hugging Face. No ads, no tracking, no account.',
    'Große Spinne liest mit (dafür kurz ein Bildschirmfoto der Markierung, nur im Arbeitsspeicher)': 'Big spider reads along (takes a brief screenshot of the selection, in memory only)',
    'Kopierte Dateien automatisch ins Netz hängen (liest dafür die Zwischenablage mit)': 'Automatically hang copied files in the web (watches the clipboard)',
    'Bei kopiertem Text anbieten, ihn zu lesen (liest dafür die Zwischenablage mit)': 'Offer to read copied text (watches the clipboard)',
    'KI kann sich irren – wichtige Angaben bitte im Original prüfen.': 'AI can make mistakes – please check important details in the original.',
    'Datenschutz im Detail': 'Privacy in detail',

    // ---- Einstellungen (Fenster) ----
    '🕷 Einstellungen': '🕷 Settings', 'Kostenlos und offline, direkt in der App': 'Free and offline, right inside the app',
    'Beste Qualität, braucht API-Schlüssel (ein paar Cent pro Analyse)': 'Best quality, needs an API key (a few cents per analysis)',
    'Für Profis: eigenes Modell über Ollama': 'For pros: your own model via Ollama',
    'Eingebautes KI-Modell': 'Built-in AI model', 'Schnell': 'Fast', 'Gründlich': 'Thorough',
    'Wird nur einmal geladen und dann auf diesem PC gespeichert. Läuft danach komplett offline; deine Texte verlassen den PC nicht. „Schnell“ antwortet meist in unter einer Minute, „Gründlich“ ist genauer, braucht aber länger und mehr Speicher (ab 8 GB RAM).':
      'Downloaded only once and stored on this PC. Runs fully offline afterwards; your texts never leave the PC. “Fast” usually answers in under a minute, “Thorough” is more accurate but slower and needs more memory (8 GB RAM or more).',
    'Lokales Modell': 'Local model', 'Neu laden': 'Reload', 'Ollama kostenlos installieren:': 'Install Ollama for free:',
    'Eingabeaufforderung öffnen (Windows-Taste, „cmd“ eingeben) und ein Modell laden:': 'Open the command prompt (Windows key, type “cmd”) and pull a model:',
    '(gut, ab 16 GB RAM) oder': '(good, 16 GB RAM or more) or', '(für schwächere PCs)': '(for less powerful PCs)', 'Hier auf ↻ klicken.': 'Click ↻ here.',
    'Anthropic API-Schlüssel': 'Anthropic API key', 'Erstellen unter': 'Create at', '→ API Keys. Wird verschlüsselt nur auf diesem PC gespeichert.': '→ API Keys. Stored encrypted on this PC only.',
    'Modell': 'Model',
    'Claude Opus 5.5 (beste Qualität)': 'Claude Opus 5.5 (best quality)', 'Claude Sonnet 5.5 (schneller, günstiger)': 'Claude Sonnet 5.5 (faster, cheaper)',
    'Claude Haiku 5.5 (sehr schnell, sehr günstig)': 'Claude Haiku 5.5 (very fast, very cheap)', 'Sprache der Analyse': 'Language of the analysis',
    'Spinnen-Animation: Eine große Spinne kriecht herein und liest den markierten Text (die kleine versteckt sich so lange)': 'Spider animation: a big spider crawls in and reads the selected text (the small one hides meanwhile)',
    'Kopierte Dateien (Strg+C im Explorer) automatisch ins Spinnennetz hängen': 'Automatically hang copied files (Ctrl+C in Explorer) in the spider web',
    'Bei kopiertem Text (Strg+C) anbieten, ihn zu lesen': 'Offer to read copied text (Ctrl+C)',
    'Sparmodus: ohne Grafikbeschleunigung – braucht weniger Arbeitsspeicher (wirkt nach einem Neustart von Silkreader)': 'Power saving: no graphics acceleration – uses less memory (takes effect after restarting Silkreader)',
    'Tastenkürzel': 'Shortcuts', '– zum Ändern anklicken und neue Tasten drücken': '– click to change and press new keys',
    'Klicken und neue Tasten drücken': 'Click and press new keys', 'Tasten drücken …': 'Press keys …', 'Mit Strg oder Alt!': 'With Ctrl or Alt!', 'Taste nicht möglich': 'Key not possible',
    '(von anderem Programm belegt – bitte ändern)': '(used by another program – please change)', ' ✓ erkannt': ' ✓ detected',
    'Suche Ollama …': 'Looking for Ollama …', 'Ollama wurde nicht gefunden. So geht’s:': 'Ollama was not found. Here is how:',
    'Ollama läuft, aber es ist noch kein Modell geladen:': 'Ollama is running, but no model is installed yet:',
    '•••••••• (gespeichert – leer lassen, um ihn zu behalten)': '•••••••• (saved – leave empty to keep it)',
    'Im Fenster: Analyse starten': 'In the window: start analysis', 'Im Fenster: schließen': 'In the window: close', 'Im Fenster: Datei öffnen': 'In the window: open file',
    'Im Fenster: Notizbuch': 'In the window: notebook', 'Im Fenster: Text in Kokon packen': 'In the window: put text in a cocoon', 'Im Fenster: Ergebnis kopieren': 'In the window: copy result',
    'Wirkt nach einem Neustart.': 'Takes effect after a restart.', 'Jetzt neu starten': 'Restart now',
    'Download abgebrochen.': 'Download canceled.',
    'Für diesen PC zu groß ({ram} GB Arbeitsspeicher, empfohlen ab {min} GB)': 'Too large for this PC ({ram} GB of memory, recommended from {min} GB)',
    'Dein PC hat wenig Arbeitsspeicher ({ram} GB) – Claude ist hier meist die bessere Wahl.': 'Your PC has little memory ({ram} GB) – Claude is usually the better choice here.',
    // Tastenkürzel-Beschreibungen
    'Markierten Text an die Spinne geben (Vorschau)': 'Give selected text to the spider', 'Markierten Text sofort analysieren': 'Analyze selected text right away', 'Markierten Text sofort lesen': 'Read selected text right away',
    'Markierten Text oder Datei in einen Kokon packen': 'Put selected text or file in a cocoon', 'Kokon-Ablage öffnen (Kopieren/Einfügen)': 'Open the cocoon menu (copy/paste)',
    'Spinne verstecken / zeigen': 'Hide / show the spider', 'Markierten Text übersetzen': 'Translate selected text', 'Markierten Text in leichter Sprache': 'Selected text in plain language',
    'Antwort auf markierte E-Mail entwerfen': 'Draft a reply to the selected e-mail', 'Bildschirmbereich lesen lassen': 'Read a screen region',
    'Notizbuch (letzte Analysen)': 'Notebook (recent analyses)', 'Spinnennetz-Ring am Mauszeiger (z. B. auf eine Maustaste legen)': 'Spider-web ring at the mouse pointer (e.g. assign to a mouse button)',

    // ---- Lesemodus (großes Fenster) ----
    'Was soll die Spinne lesen?': 'What should the spider read?', 'Text einfügen, oder eine PDF-, Word- oder Textdatei hierher ziehen.': 'Paste text, or drop a PDF, Word or text file here.',
    'Text hier einfügen (Strg+V) …': 'Paste text here (Ctrl+V) …', 'Analysieren': 'Analyze', 'Rechtsklick für Menü ·': 'Right-click for menu ·',
    'analysieren ·': 'analyze ·', 'schließen ·': 'close ·', 'Datei ·': 'file ·', 'Notizbuch ·': 'notebook ·', 'schließen': 'close', 'Notizbuch durchsuchen …': 'Search notebook …',
    'KI-Analyse': 'AI analysis', 'Animation überspringen': 'Skip animation', 'Ergebnis kopieren': 'Copy result', 'Bereit zum Analysieren': 'Ready to analyze', 'Bereit zum Lesen': 'Ready to read', 'Text einfügen oder eine PDF-, Word- oder Textdatei hierher ziehen.': 'Paste text or drag a PDF, Word or text file here.',
    'in Kokon packen': 'put in a cocoon', 'Einstellungen öffnen': 'Open settings', 'FEHLER': 'ERROR', 'FERTIG': 'DONE', 'SCANNING': 'SCANNING', 'Bereit': 'Ready', 'Liest …': 'Reading …', 'Fehler': 'Error', 'Fertig': 'Done', 'Nächste Fristen': 'Upcoming deadlines', 'Datei öffnen': 'Open file', 'liest sofort': 'reads right away', 'Keine offenen Fristen.': 'No open deadlines.', 'Noch nichts gelesen.': 'Nothing read yet.',
    'Darstellung gekürzt – analysiert wird das ganze Dokument.': 'Display shortened – the whole document is analyzed.',
    'Die Spinne liest das Dokument …': 'The spider is reading the document …', 'In einen Kokon gepackt 🕸': 'Put in a cocoon 🕸',
    'Noch keine Analysen – die Spinne merkt sich hier die letzten 20.': 'No analyses yet – the spider keeps the last 20 here.',

    // ---- Fehlermeldungen ----
    'Diese PDF enthält keinen auslesbaren Text (evtl. ein Scan).': 'This PDF contains no readable text (maybe a scan).',
    'Kein API-Schlüssel hinterlegt. Bitte in den Einstellungen eintragen – oder dort auf den kostenlosen lokalen Modus umstellen.': 'No API key saved. Please enter one in the settings – or switch to the free local mode there.',
    'Kein API-Schlüssel hinterlegt.': 'No API key saved.',
    'Claude hat die Analyse dieses Textes abgelehnt.': 'Claude declined to analyze this text.', 'Claude hat diese Anfrage abgelehnt.': 'Claude declined this request.',
    'Die Antwort wurde abgeschnitten – das Dokument ist zu umfangreich.': 'The answer was cut off – the document is too long.',
    'Ollama läuft nicht. Installiere es kostenlos von ollama.com, starte es und lade ein Modell (siehe Einstellungen).': 'Ollama is not running. Install it for free from ollama.com, start it and pull a model (see settings).',
    'Ollama läuft nicht.': 'Ollama is not running.',
    'Das lokale Modell hat keine gültige Antwort geliefert. Bitte erneut versuchen oder ein größeres Modell wählen.': 'The local model did not return a valid answer. Please try again or choose a larger model.',
    'Das eingebaute KI-Modell ist noch nicht heruntergeladen (Einstellungen → Herunterladen).': 'The built-in AI model has not been downloaded yet (Settings → Download).',
    'Der API-Schlüssel ist ungültig. Bitte in den Einstellungen prüfen.': 'The API key is invalid. Please check it in the settings.',
    'Zu viele Anfragen – bitte kurz warten und erneut versuchen.': 'Too many requests – please wait a moment and try again.',
    'Keine Verbindung zu Claude – Internetverbindung prüfen.': 'No connection to Claude – please check your internet connection.',

    // ---- 1.18: Nicht stören, Scans, Explorer, Privatmodus, Übung, Was ist neu ----
    'Mit Silkreader lesen': 'Read with Silkreader', 'Auf diesem Bild wurde kein Text erkannt.': 'No text was recognized in this image.',
    'Pause beenden': 'End pause', 'Nicht stören': 'Do not disturb', '1 Stunde': '1 hour', '3 Stunden': '3 hours', 'Bis morgen': 'Until tomorrow',
    'Privatmodus (nichts im Notizbuch speichern)': 'Private mode (keep nothing in the notebook)',
    'Privatmodus: nichts im Notizbuch speichern': 'Private mode: keep nothing in the notebook',
    'Privatmodus: Neue Texte werden nicht gespeichert.': 'Private mode: new texts are not saved.',
    'Bei Vollbild und Präsentationen ausblenden': 'Hide during fullscreen and presentations', 'In Bildschirmfreigaben unsichtbar': 'Invisible in screen shares',
    'Bei Vollbild, Präsentationen und Spielen automatisch ausblenden': 'Hide automatically during fullscreen, presentations and games',
    'In Bildschirmfreigaben (Teams, Zoom …) und Bildschirmfotos unsichtbar': 'Invisible in screen shares (Teams, Zoom …) and screenshots',
    'an Claude': 'to Claude', 'auf diesem PC': 'on this PC',
    'Dieser Text wird an Claude (Anthropic) geschickt.': 'This text is sent to Claude (Anthropic).', 'Dieser Text bleibt auf deinem PC.': 'This text stays on your PC.',
    'Neu in Silkreader {v}': 'New in Silkreader {v}', 'Alle Änderungen': 'All changes',
    'Probier es aus': 'Try it out', 'Markiere den Brief unten und klick dann auf mich – oben am Bildschirmrand.': 'Select the letter below, then click me – at the top of your screen.',
    'Text für mich markieren': 'Select the text for me', 'Jetzt oben auf die Spinne klicken.': 'Now click the spider at the top.',
    'Übung: Stromrechnung': 'Practice: electricity bill', 'Brief': 'Letter', 'Betrag': 'Amount', 'Neuer Abschlag': 'New instalment',

    // ---- Menüs, Tray, Dialoge (Hauptprozess) ----
    'Spinne anzeigen': 'Show spider', 'Markierten Text lesen': 'Read selected text', 'Lesemodus öffnen': 'Open reading mode', 'Weitere Funktionen': 'More functions',
    'Einstellungen …': 'Settings …', 'Protokoll öffnen (für Fehlersuche)': 'Open log (for troubleshooting)', 'Mit Windows starten': 'Start with Windows', 'Beenden': 'Quit',
    'Bildschirmbereich lesen': 'Read screen region', 'Spinnennetz-Ring öffnen': 'Open spider-web ring', 'Spinne ausblenden': 'Hide spider',
    'Öffnen': 'Open', 'Im Lesemodus öffnen': 'Open in reading mode', 'Im Ordner zeigen': 'Show in folder', 'Vergleichen mit …': 'Compare with …', 'Aus dem Netz nehmen': 'Remove from the web',
    'Noch leer – Datei oder Text auf die Spinne ziehen': 'Still empty – drag a file or text onto the spider', 'Alle Kokons entfernen': 'Remove all cocoons',
    'Neuer Text': 'New text', 'Aus Zwischenablage': 'From clipboard', 'Datei öffnen …': 'Open file …',
    'Dokument lesen': 'Read document', 'Dokument analysieren': 'Analyze document', 'Dokumente': 'Documents', 'Vergleich nicht möglich': 'Comparison not possible',
    'Silkreader-Update': 'Silkreader update', 'Jetzt neu starten und aktualisieren? Sonst wird das Update automatisch beim nächsten Beenden installiert.': 'Restart and update now? Otherwise the update is installed automatically the next time you quit.',
    'Später': 'Later', 'Die Update-Prüfung hat nicht geklappt.': 'The update check failed.', 'Updates gibt es nur in der installierten App.': 'Updates are only available in the installed app.',

    // ---- 1.22: einfacher bedienen ----
    'Zahlungsdaten': 'Payment details', 'Pro ansehen': 'See Pro', 'Vorlagen': 'Templates', 'In meiner Sprache': 'In my language',
    'Großes Fenster': 'Big window', 'Brief-Hilfe mit Pro': 'Letter help with Pro', 'Vertrags-Check mit Pro': 'Contract check with Pro',
    'Was du tun musst, bis wann, und die IBAN zum Kopieren.': 'What you need to do, by when, and the IBAN to copy.',
    'Kündigen bis wann, Verlängerung und eine Erinnerung, bevor es zu spät ist.': 'Cancel by when, renewal and a reminder before it is too late.',
    'Mehr Hilfe bei jedem Brief': 'More help with every letter',
    'Kommt bald im Microsoft Store. Mit einem Code geht es schon jetzt.': 'Coming soon to the Microsoft Store. With a code it works right now.',
    'Brief-Hilfe': 'Letter help', 'Was du tun musst, bis wann, IBAN zum Kopieren.': 'What you need to do, by when, IBAN to copy.',
    'Antwort, Widerspruch oder Ratenzahlung als fertiger Brief.': 'Reply, objection or instalment request as a finished letter.',
    'Übersetzen und einfach erklären': 'Translate and explain simply', 'Schwierige Texte verständlich, in jede Richtung.': 'Difficult texts made clear, in any direction.',
    'Vertrags-Check': 'Contract check', 'Kündigen bis wann? Mit Erinnerung, bevor es zu spät ist.': 'Cancel by when? With a reminder before it is too late.',
    'Briefe auf Papier lesen': 'Read paper letters', 'Scans, Fotos und die Webcam.': 'Scans, photos and the webcam.',
    'Gründliches KI-Modell und Mappen': 'Thorough AI model and folders', 'Genauer bei langen Texten, Ordnung im Notizbuch.': 'More accurate with long texts, order in the notebook.',
    'Immer kostenlos: Zusammenfassen, Fragen an den Text, Fristen, In meiner Sprache und das Notizbuch.': 'Always free: summaries, questions about the text, deadlines, in my language and the notebook.',
    'Vorlesen: Was du tun musst': 'Read aloud: what you need to do',
    'Fertig – {n} Seiten lesen': 'Done – read {n} pages',
    'Ist der Text gut lesbar? Hat der Brief mehr Seiten, nimm die nächste auf.': 'Is the text easy to read? If the letter has more pages, take the next one.',
    'Seite löschen': 'Delete page',
    'Seite {n}': 'Page {n}',
    'Seite {n} löschen': 'Delete page {n}',
    'Seite {n}: Brief gerade in den Rahmen halten.': 'Page {n}: hold the letter straight inside the frame.',
    '+ Weitere Seite': '+ Another page',
    'Aufgenommene Seiten': 'Captured pages',
    'Brief ({n} Seiten)': 'Letter ({n} pages)',
    'Das ist keine Silkreader-Lerndatei.': 'This is not a Silkreader learning file.',
    'Du wolltest diesen Brief jetzt lesen.': 'You wanted to read this letter now.',
    'Gelerntes laden': 'Load what I learned',
    'Gelerntes sichern': 'Back up what I learned',
    'Jetzt lesen': 'Read now',
    'Lernen ist ausgeschaltet (Einstellungen → Was ich gelernt habe).': 'Learning is turned off (Settings → What I have learned).',
    'Morgen': 'Tomorrow',
    'Später lesen: {t}': 'Read later: {t}',
    'Alle Fristen erledigt 🎉': 'All deadlines done 🎉',
    'Alle anzeigen': 'Show all',
    'Beim Melden öffnet sich GitHub im Browser – dort siehst du alles, bevor es abgeschickt wird.': 'Reporting opens GitHub in your browser – you see everything there before it is sent.',
    'Da ist leider etwas schiefgelaufen.': 'Sorry, something went wrong.',
    'Danke!': 'Thanks!',
    'Danke, ich merke mir das ✓': 'Thanks, I will remember that ✓',
    'Darf ich das Problem melden? Gesendet wird nur das Protokoll (Fehlermeldung, Windows-Version) – kein Brief und kein Text.': 'May I report the problem? Only the log is sent (error message, Windows version) – no letter and no text.',
    'Der {n}. Brief von {s} dieses Jahr.': 'Letter no. {n} from {s} this year.',
    'Diese Woche stehen keine Fristen an. Schönen Tag!': 'No deadlines this week. Have a nice day!',
    'Diese Woche stehen {n} Fristen an:': '{n} deadlines this week:',
    'Diese Woche steht 1 Frist an:': '1 deadline this week:',
    'Du hast diesen Monat {n} Briefe geschafft.': 'You handled {n} letters this month.',
    'Entfernen': 'Remove',
    'Frage sprechen': 'Speak your question',
    'Frage sprechen (Windows-Spracheingabe)': 'Speak your question (Windows voice typing)',
    'Gelernt:': 'Learned:',
    'Gut gemacht!': 'Well done!',
    'Guten Morgen!': 'Good morning!',
    'Ich erinnere dich {w} ✓': 'I will remind you {w} ✓',
    'Ich habe mich neu gestartet.': 'I have restarted.',
    'Ich habe typische Merkmale von Betrug gefunden:': 'I found typical signs of fraud:',
    'Ich halte den Brief solange als Zettel an meinem Faden fest.': 'Until then I keep the letter as a note on my thread.',
    'Ich merke mir das für ähnliche Briefe. Bleibt nur auf deinem PC.': 'I will remember this for similar letters. Stays on your PC only.',
    'Ja': 'Yes',
    'Ja, das war richtig': 'Yes, that was right',
    'Kommt einmal am Morgen, wenn Fristen anstehen. Abschaltbar in den Einstellungen.': 'Shows once in the morning when deadlines are coming up. Can be turned off in Settings.',
    'Korrigieren': 'Correct',
    'Mein Rat:': 'My advice:',
    'Nein': 'No',
    'Nein, da stimmt etwas nicht': 'No, something is wrong',
    'Nichts bezahlen und auf keinen Link klicken. Ruf den Absender über die Nummer auf seiner echten Webseite an.': 'Do not pay anything and do not click any link. Call the sender using the number on their real website.',
    'Pause': 'Pause',
    'Richtig wäre': 'Correct would be',
    'Später lesen': 'Read later',
    'Später lesen – erinnere mich': 'Read later – remind me',
    'Tempo': 'Speed',
    'Unterschreiben und zurückschicken': 'Sign and send back',
    'Unterschrift nötig': 'Signature needed',
    'Vorsicht: Das wirkt nicht echt': 'Careful: this does not look genuine',
    'War das richtig?': 'Was that right?',
    'Was genau gesendet wird': 'What exactly is sent',
    'Was passiert, wenn ich nichts tue?': 'What happens if I do nothing?',
    'Was stimmt nicht?': 'What is wrong?',
    'Zurück an:': 'Send back to:',
    'verglichen mit dem Brief vom {d}': 'compared with the letter of {d}',
    'Ändern kannst du sie in den Einstellungen unter „Erweitert“.': 'You can change them in Settings under “Advanced”.',
    'Geladen ✓': 'Loaded ✓',
    'Gesichert ✓': 'Backed up ✓',
    'Im Privatmodus lerne ich nichts dazu.': 'In private mode I do not learn anything new.',
    'Noch keine Absender – lies ein paar Briefe.': 'No senders yet – read a few letters.',
    'Noch keine Korrekturen. Unter jedem Ergebnis kannst du sagen, ob es richtig war.': 'No corrections yet. Below every result you can say whether it was right.',
    'Vergessen': 'Forget',
    'Wirklich alles Gelernte vergessen? Das Notizbuch bleibt erhalten.': 'Really forget everything learned? The notebook stays.',
    'Heute Abend': 'This evening',
    'Morgen früh': 'Tomorrow morning',
    'Am Wochenende': 'At the weekend',
    'Langsam': 'Slow',
    'Nein danke': 'No thanks',
    'Nie mehr fragen': 'Never ask again',
    'Absender': 'Sender',
    'Briefart': 'Letter type',
    'Aufgabe': 'Task',
    'Zusammenfassung': 'Summary',
    'Diese Hilfe': 'This help',
    'Blase schließen': 'Close bubble',
    'Frage abschicken': 'Send question',
    'auf Seite {n}': 'on page {n}',
    '„{w}“': '“{w}”',
    'Ort, Datum, Unterschrift': 'Place, date, signature',
    '{l} steigt von {a} auf {b}': '{l} rises from {a} to {b}',
    '{l} sinkt von {a} auf {b}': '{l} falls from {a} to {b}',
    'Abschlag': 'Instalment',
    'Beitrag': 'Contribution',
    'Miete': 'Rent',
    'Rate': 'Rate',
    'Monatsbeitrag': 'Monthly contribution',
    'Vorauszahlung': 'Advance payment',
    'Grundgebühr': 'Base fee',
    'Monatliche rate': 'Monthly rate',
    'Abschlagszahlung': 'Instalment',
    'Die IBAN ist aus einem anderen Land ({c}…), obwohl der Brief auf Deutsch ist.': 'The IBAN is from another country ({c}…) although the letter is in German.',
    'Du sollst sehr schnell zahlen oder handeln – Druck ist ein typisches Merkmal.': 'You are asked to pay or act very quickly – pressure is a typical sign.',
    'Bezahlt werden soll mit Gutschein- oder Guthabenkarten – das macht keine echte Firma oder Behörde.': 'Payment is requested with gift or prepaid cards – no real company or authority does that.',
    'Bezahlt werden soll mit Kryptowährung.': 'Payment is requested in cryptocurrency.',
    'Du sollst PIN, TAN, Passwort oder Kartendaten angeben – das fragt niemand Seriöses so ab.': 'You are asked for your PIN, TAN, password or card details – no reputable sender asks for that.',
    'Du sollst auf einen Link klicken.': 'You are asked to click a link.',
    'Ein Paket soll erst nach einer kleinen Gebühr zugestellt werden – eine bekannte Masche.': 'A parcel is only delivered after a small fee – a known scam.',
    'Für einen Gewinn oder eine Erbschaft soll vorher gezahlt werden.': 'You are asked to pay first for a prize or an inheritance.',
    'Erst kommt meist eine Zahlungserinnerung oder Mahnung.': 'Usually a payment reminder comes first.',
    'Es können Mahngebühren und Verzugszinsen dazukommen.': 'Reminder fees and default interest can be added.',
    'Danach kann die Forderung an ein Inkasso-Büro gehen – das wird deutlich teurer.': 'After that the claim can go to a debt collection agency – that gets much more expensive.',
    'Bei Strom, Gas oder Wasser kann nach mehreren Mahnungen eine Sperre angedroht werden – sie muss vorher angekündigt werden.': 'For electricity, gas or water, a cut-off can be threatened after several reminders – it must be announced in advance.',
    'Bei Mietschulden kann der Vermieter nach zwei offenen Monatsmieten kündigen.': 'With rent arrears, the landlord can terminate after two unpaid monthly rents.',
    'Zuletzt ist ein gerichtlicher Mahnbescheid möglich.': 'Finally, a court payment order is possible.',
    'Kannst du nicht alles zahlen? Unter „Antworten“ gibt es die Vorlage Ratenzahlung. Ist die Forderung falsch, widersprich schriftlich.': 'Can’t pay it all? Under “Reply” there is an instalment template. If the claim is wrong, object in writing.',
    'Nach Ablauf der Frist wird der Bescheid bestandskräftig – dann kannst du ihn meist nicht mehr anfechten.': 'After the deadline the notice becomes final – then you usually cannot challenge it any more.',
    'Eine geforderte Zahlung wird fällig; danach kommen Säumniszuschläge dazu.': 'A requested payment becomes due; late fees are added afterwards.',
    'Fehlen angeforderte Unterlagen, können Leistungen gekürzt oder gestoppt werden.': 'If requested documents are missing, benefits can be cut or stopped.',
    'Ist etwas unklar, ruf die Stelle an oder schreib eine Rückfrage – Beratungsstellen helfen oft kostenlos.': 'If something is unclear, call the office or send a question – advice centres often help for free.',
    'Gegen einen gerichtlichen Mahnbescheid kannst du innerhalb von 2 Wochen Widerspruch einlegen.': 'You can object to a court payment order within 2 weeks.',
    'Sonst folgt ein Vollstreckungsbescheid – dann kann gepfändet werden.': 'Otherwise an enforcement order follows – then assets can be seized.',
    'Wichtig: Gegen einen gerichtlichen Mahnbescheid hast du nur 2 Wochen für einen Widerspruch.': 'Important: you only have 2 weeks to object to a court payment order.',
    'Was ich gelernt habe': 'What I have learned',
    'Ich lerne aus deinen Korrekturen und den Briefen im Notizbuch. Alles bleibt auf diesem PC.': 'I learn from your corrections and the letters in the notebook. Everything stays on this PC.',
    'Aus meinen Briefen und Korrekturen lernen': 'Learn from my letters and corrections',
    'Absender und Korrekturen ansehen': 'View senders and corrections',
    'Korrekturen': 'Corrections',
    'Korrektur': 'Correction',
    'Alles vergessen': 'Forget everything',
    'Gelerntes sichern …': 'Back up what I learned …',
    'Gelerntes laden …': 'Load what I learned …',
    'Briefe gelesen': 'Letters read',
    'Absender erkannt': 'Senders recognised',
    '1 Brief': '1 letter',
    '{n} Briefe': '{n} letters',
    '1 Korrektur': '1 correction',
    '{n} Korrekturen': '{n} corrections',
    'Morgens kurz die Fristen der Woche zeigen': 'Show this week’s deadlines briefly in the morning',
    'Hoher Kontrast': 'High contrast',
    'Unterschrift nötig auf': 'Signature needed on',
    'In diesem Bereich hat die Windows-Texterkennung keinen Text gefunden. Tipp: einen größeren Bereich wählen oder näher heranzoomen.': 'Windows text recognition found no text in this area. Tip: choose a larger area or zoom in.',
    'Tipp:': 'Tip:', 'Rechtsklick auf die Spinne (oder lange drücken) öffnet das Spinnennetz mit allen Funktionen.': 'Right-click the spider (or long press) to open the spider web with all functions.',
    'Zieh eine PDF- oder Word-Datei auf die Spinne, dann lese ich sie.': 'Drag a PDF or Word file onto the spider and I will read it.',
    'Unter „…“ kann ich dir alles vorlesen oder in deiner Sprache zeigen.': 'Under “…” I can read everything aloud or show it in your language.',
    'Fristen aus deinen Briefen sammle ich im Spinnennetz unter Mehr → Fristen.': 'I collect deadlines from your letters in the spider web under More → Deadlines.',
    'Im Explorer geht es auch: Rechtsklick auf eine Datei → „Mit Silkreader lesen“.': 'Works in Explorer too: right-click a file → “Read with Silkreader”.',
    'Im Explorer geht es auch: Rechtsklick auf eine Datei → „Öffnen mit“ → Silkreader.': 'Works in Explorer too: right-click a file → “Open with” → Silkreader.',
    'Schrift zu klein? In den Einstellungen gibt es „Schriftgröße“.': 'Text too small? Settings has “Text size”.',
    'Ich lese Briefe, Rechnungen und Verträge für dich und sage dir, was zu tun ist. Direkt auf deinem PC.': 'I read letters, bills and contracts for you and tell you what to do. Right on your PC.',
    'Ich lade mein Wissen herunter': 'I am downloading my knowledge', '1 GB, nur einmal. Danach arbeite ich ganz ohne Internet.': '1 GB, only once. After that I work completely without internet.',
    'Später laden': 'Download later', 'Markiere den Brief unten mit der Maus.': 'Select the letter below with the mouse.', 'Klick auf die Spinne oben am Bildschirmrand.': 'Click the spider at the top of the screen.',
    'Fertig! Das kann ich': 'Done! Here is what I can do', 'Drei Dinge reichen, alles andere findest du später.': 'Three things are enough, you will find the rest later.',
    'Rechtsklick oder lange drücken': 'Right-click or long press', 'Alle Funktionen im Spinnennetz': 'All functions in the spider web', 'Datei draufziehen': 'Drag a file onto it',
    'PDF oder Word-Datei lesen': 'Read a PDF or Word file', 'Silkreader Pro kommt bald:': 'Silkreader Pro is coming soon:',
    'Brief-Hilfe, Antworten, Übersetzen und mehr. Du findest es im Spinnennetz unter Mehr.': 'Letter help, replies, translation and more. You will find it in the spider web under More.',
    'Alles bleibt auf deinem PC. KI kann sich irren – wichtige Angaben bitte im Original prüfen.': 'Everything stays on your PC. AI can make mistakes – please check important details in the original.',
    'KI wird geladen, {p}': 'Loading AI, {p}', '✓ Ich bin bereit': '✓ I am ready', 'Ab jetzt arbeite ich ganz ohne Internet.': 'From now on I work completely without internet.',
    'Der Download hat nicht geklappt. Bitte prüfe die Internetverbindung.': 'The download did not work. Please check your internet connection.', 'Nochmal versuchen': 'Try again', 'Silkreader Pro ist aktiv.': 'Silkreader Pro is active.', 'Du findest es im Spinnennetz unter Mehr.': 'You will find it in the spider web under More.',
    'kommt bald': 'coming soon', '✓ aktiv': '✓ active', 'Brief-Hilfe, Antworten, Übersetzen, Vertrags-Check und mehr.': 'Letter help, replies, translation, contract check and more.',
    'Code einlösen': 'Redeem code', 'KI auf diesem PC': 'AI on this PC', 'Alles läuft offline. Deine Briefe verlassen den PC nicht.': 'Everything runs offline. Your letters never leave the PC.',
    'Allgemein': 'General', 'Ergebnisse auf': 'Results in', 'Schriftgröße': 'Text size', 'Normal': 'Normal', 'Groß': 'Large', 'Sehr groß': 'Extra large',
    'Spinne': 'Spider', 'Große Spinne beim Lesen zeigen': 'Show the big spider while reading', 'Bei kopiertem Text fragen, ob ich lesen soll': 'Ask whether to read copied text',
    'Bei Vollbild und Präsentationen verstecken': 'Hide during full screen and presentations', 'Erweitert': 'Advanced',
    'Tastenkürzel, Privatmodus, Downloads, Sparmodus, Bildschirmfreigabe': 'Shortcuts, private mode, downloads, power saving, screen sharing', 'Verhalten': 'Behaviour',
    'Kopierte Dateien (Strg+C im Explorer) ins Spinnennetz hängen': 'Hang copied files (Ctrl+C in Explorer) in the spider web',
    'In Bildschirmfreigaben (Teams, Zoom …) unsichtbar': 'Invisible in screen sharing (Teams, Zoom …)', 'Sparmodus: braucht weniger Arbeitsspeicher (nach einem Neustart)': 'Power saving: uses less memory (after a restart)',
    'Andere KI': 'Other AI', 'Neu eingerichtet wird nur noch die eingebaute KI.': 'Only the built-in AI can be set up new.', 'Änderungen gelten sofort': 'Changes apply right away',
    'Aktiv': 'Active', 'Verwenden': 'Use', 'Lädt …': 'Loading …', 'Laden ({s})': 'Download ({s})',
    'Für die meisten Briefe, antwortet in Sekunden': 'For most letters, answers in seconds', 'Genauer bei langen Texten, braucht 8 GB Arbeitsspeicher': 'More accurate with long texts, needs 8 GB of memory',
    '{n} ist noch nicht geladen (einmalig {s}). Danach geht alles ohne Internet.': '{n} is not downloaded yet (once, {s}). After that everything works without internet.',
    'Ollama wurde nicht gefunden.': 'Ollama was not found.', 'Ollama läuft, aber es ist noch kein Modell geladen.': 'Ollama is running, but no model is loaded yet.', 'Im Fenster: Lesen starten': 'In the window: start reading',
  };

  // Texte mit Platzhaltern
  const PATTERNS = [
    [/^Klick: (.+)$/, (m) => `Click: ${tr(m[1])}`],
    [/^(?:(?:Strg|Alt|Umschalt|Win|Shift)\+)+[^\s]+$/, (m) => m[0].replace(/Strg/g, 'Ctrl').replace(/Umschalt/g, 'Shift').replace(/Leertaste/g, 'Space')],
    [/^Strg$/, () => 'Ctrl'], [/^Umschalt$/, () => 'Shift'],
    [/^([\d.,]+) Wörter(?: · (\d+) Seiten)?$/, (m) => `${m[1]} words${m[2] ? ` · ${m[2]} pages` : ''}`],
    [/^Seite (\d+)$/, (m) => `Page ${m[1]}`],
    [/^S\. \d+(?: · S\. \d+)*(?: · Stelle nicht gefunden)?$/, (m) => m[0].replace(/S\. /g, 'p. ').replace('Stelle nicht gefunden', 'passage not found')],
    [/^(\d+) von (\d+) Angaben gezeigt$/, (m) => `${m[1]} of ${m[2]} figures shown`],
    [/^KI analysiert … (.+) Zeichen Ergebnis empfangen$/, (m) => `AI is analyzing … ${m[1]} characters received`],
    [/^KI schreibt weiter … (.+) Zeichen$/, (m) => `AI is still writing … ${m[1]} characters`],
    [/^Liest Abschnitt (\d+) von (\d+) …$/, (m) => `Reading section ${m[1]} of ${m[2]} …`],
    [/^✓ (.+) ist bereit\.$/, (m) => `✓ ${tr(m[1])} is ready.`],
    [/^(.+): noch nicht heruntergeladen \(einmalig (.+)\)\.$/, (m) => `${tr(m[1])}: not downloaded yet (one-time ${m[2]}).`],
    [/^([\d.,]+) von ([\d.,]+) GB(.*)$/, (m) => `${m[1]} of ${m[2]} GB${m[3]}`],
    [/^✓ Ollama läuft · (\d+) Modell\(e\) installiert$/, (m) => `✓ Ollama is running · ${m[1]} model(s) installed`],
    [/^(.+) · (\d+[.,]?\d*) GB · ✓ geladen$/, (m) => `${m[1]} · ${m[2]} GB · ✓ downloaded`],
    [/^· ✓ geladen$/, () => '· ✓ downloaded'],
    [/^Download fehlgeschlagen: (.+)$/, (m) => `Download failed: ${m[1]}`],
    [/^Fehler von Claude: (.+)$/, (m) => `Error from Claude: ${m[1]}`],
    [/^Anfrage abgelehnt: (.+)$/, (m) => `Request rejected: ${m[1]}`],
    [/^Ollama-Fehler: (.+)$/, (m) => `Ollama error: ${m[1]}`],
    [/^Das eingebaute Modell ist bei der Analyse gestolpert: (.+)\. Bitte erneut versuchen\.$/, (m) => `The built-in model stumbled during the analysis: ${m[1]}. Please try again.`],
    [/^Das eingebaute KI-Modell ist noch nicht heruntergeladen \(einmalig (.+)\)\. Bitte in den Einstellungen auf „Herunterladen“ klicken\.$/,
      (m) => `The built-in AI model has not been downloaded yet (one-time ${m[1]}). Please click “Download” in the settings.`],
    [/^In Ollama ist noch kein Modell installiert\. Öffne die Eingabeaufforderung und gib ein: +ollama pull (.+)$/,
      (m) => `No model is installed in Ollama yet. Open the command prompt and enter:  ollama pull ${m[1]}`],
    [/^Zwischenablage lesen: „([\s\S]*)“$/, (m) => `Read clipboard: “${m[1]}”`],
    [/^Silkreader (.+) ist da! 🕷$/, (m) => `Silkreader ${m[1]} is here! 🕷`],
    [/^Du hast die neueste Version \((.+)\)\.$/, (m) => `You have the latest version (${m[1]}).`],
    [/^Version (.+) wird im Hintergrund heruntergeladen …$/, (m) => `Version ${m[1]} is downloading in the background …`],
    [/^Nach Updates suchen \(v(.+)\)$/, (m) => `Check for updates (v${m[1]})`],
    [/^Diese Tastenkürzel benutzt schon ein anderes Programm: (.+)\. In den Einstellungen kannst du andere wählen\.$/,
      (m) => `These shortcuts are already used by another program: ${m[1].replace(/Strg/g, 'Ctrl').replace(/Umschalt/g, 'Shift').replace(/Leertaste/g, 'Space')}. You can choose others in the settings.`],
    [/^(.*) \(fehlt\)$/, (m) => `${m[1]} (missing)`],
    [/^([\s\S]*?)( \(Datei fehlt\))?\nKlick: lesen · Ziehen: ablegen · Rechtsklick: kopieren und mehr$/,
      (m) => `${m[1]}${m[2] ? ' (file missing)' : ''}\nClick: read · Drag: drop · Right-click: copy and more`],
    [/^Version (\S+)$/, (m) => `Version ${m[1]}`],
    [/^Dieser Code ist am (.+) abgelaufen\.$/, (m) => `This code expired on ${m[1]}.`],
    [/^(.+) gibt es mit Silkreader Pro\.$/, (m) => `${tr(m[1])} is available with Silkreader Pro.`],
  ];

  let lang = 'de';
  function tr(s) {
    if (lang !== 'en' || s == null) return s;
    const str = String(s);
    const key = str.trim();
    if (!key) return s;
    if (Object.prototype.hasOwnProperty.call(EN, key)) return str.replace(key, EN[key]);
    for (const [re, fn] of PATTERNS) {
      const m = key.match(re);
      if (m) return str.replace(key, fn(m));
    }
    return s;
  }
  /** Übersetzt einen Text; {name} wird durch vars.name ersetzt */
  function T(s, vars) {
    let r = tr(s);
    if (vars) for (const k of Object.keys(vars)) r = String(r).split(`{${k}}`).join(vars[k]);
    return r;
  }

  // ---------- Browserfenster: sichtbare Texte automatisch übersetzen ----------
  const ATTRS = ['placeholder', 'title', 'aria-label'];
  // Texte in Eingabefeldern, Code und markierten Bereichen nie anfassen – Platzhalter/Tooltips schon
  const skip = (el) => el && el.closest && el.closest('[data-noi18n], script, style, code, textarea');
  const skipAttr = (el) => el && el.closest && el.closest('[data-noi18n], script, style');
  const attrs = (el) => {
    if (skipAttr(el)) return;
    for (const a of ATTRS) { const v = el.getAttribute(a); if (v) { const t = tr(v); if (t !== v) el.setAttribute(a, t); } }
  };
  function translateNode(n) {
    if (n.nodeType === 3) {
      if (skip(n.parentElement)) return;
      const t = tr(n.nodeValue);
      if (t !== n.nodeValue) n.nodeValue = t;
      return;
    }
    if (n.nodeType !== 1) return;
    attrs(n);
    if (skip(n)) return;
    if (n.tagName === 'OPTION' && n.textContent) { const t = tr(n.textContent); if (t !== n.textContent) n.textContent = t; return; }
    const walker = document.createTreeWalker(n, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    for (let c = walker.nextNode(); c; c = walker.nextNode()) {
      if (c.nodeType === 1) attrs(c);
      else if (!skip(c.parentElement)) {
        const t = tr(c.nodeValue);
        if (t !== c.nodeValue) c.nodeValue = t;
      }
    }
  }
  let observer = null;
  function auto() {
    if (lang !== 'en' || typeof document === 'undefined' || observer) return;
    document.documentElement.lang = 'en';
    const start = () => {
      translateNode(document.body);
      document.title = tr(document.title);
      observer = new MutationObserver((muts) => {
        for (const m of muts) {
          if (m.type === 'characterData') translateNode(m.target);
          else if (m.type === 'attributes') translateNode(m.target);
          else m.addedNodes.forEach(translateNode);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
    };
    if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  }

  const api = {
    EN, T, tr,
    setLang(l) { lang = l === 'en' ? 'en' : 'de'; },
    get lang() { return lang; },
    get locale() { return lang === 'en' ? 'en-GB' : 'de-DE'; },
    /** Sprache im laufenden Fenster wechseln (Inhalte danach neu aufbauen) */
    switch(l) {
      api.setLang(l);
      if (lang === 'en') auto();
      else if (observer) { observer.disconnect(); observer = null; document.documentElement.lang = 'de'; }
    },
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else {
    window.I18N = api;
    window.T = T;
    api.setLang(window.spider?.uiLang);
    auto();
  }
})();
