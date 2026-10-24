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
    'Datei lesen …': 'Read file …', 'Bereich lesen': 'Read region', 'Zuletzt': 'Recent',
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
    'Tastenkürzel & mehr …': 'Shortcuts & more …',
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
    'Bereich aufziehen, den die Spinne lesen soll · Esc = abbrechen': 'Drag over the area the spider should read · Esc = cancel', 'Bereich wählen': 'Choose region',

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
    // Tastenkürzel-Beschreibungen
    'Markierten Text an die Spinne geben (Vorschau)': 'Give selected text to the spider', 'Markierten Text sofort analysieren': 'Analyze selected text right away',
    'Markierten Text oder Datei in einen Kokon packen': 'Put selected text or file in a cocoon', 'Kokon-Ablage öffnen (Kopieren/Einfügen)': 'Open the cocoon menu (copy/paste)',
    'Spinne verstecken / zeigen': 'Hide / show the spider', 'Markierten Text übersetzen': 'Translate selected text', 'Markierten Text in leichter Sprache': 'Selected text in plain language',
    'Antwort auf markierte E-Mail entwerfen': 'Draft a reply to the selected e-mail', 'Bildschirmbereich lesen lassen': 'Read a screen region',
    'Notizbuch (letzte Analysen)': 'Notebook (recent analyses)', 'Spinnennetz-Ring am Mauszeiger (z. B. auf eine Maustaste legen)': 'Spider-web ring at the mouse pointer (e.g. assign to a mouse button)',

    // ---- Lesemodus (großes Fenster) ----
    'Was soll die Spinne lesen?': 'What should the spider read?', 'Text einfügen, oder eine PDF-, Word- oder Textdatei hierher ziehen.': 'Paste text, or drop a PDF, Word or text file here.',
    'Text hier einfügen (Strg+V) …': 'Paste text here (Ctrl+V) …', 'Analysieren': 'Analyze', 'Rechtsklick für Menü ·': 'Right-click for menu ·',
    'analysieren ·': 'analyze ·', 'schließen ·': 'close ·', 'Datei ·': 'file ·', 'Notizbuch ·': 'notebook ·', 'schließen': 'close', 'Notizbuch durchsuchen …': 'Search notebook …',
    'KI-Analyse': 'AI analysis', 'Animation überspringen': 'Skip animation', 'Ergebnis kopieren': 'Copy result', 'Bereit zum Analysieren': 'Ready to analyze',
    'in Kokon packen': 'put in a cocoon', 'Einstellungen öffnen': 'Open settings', 'FEHLER': 'ERROR', 'FERTIG': 'DONE', 'SCANNING': 'SCANNING',
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
