# Changelog

All notable changes to Silkreader. / Alle wichtigen Änderungen an Silkreader.


## 1.24.0
- **Faster AI:** compact JSON (no line breaks/indentation in the AI's answer) and exactly 3 key points. Measured on the test letters (same machine, alternating): fast model 15.1 s → 11.8 s, slowest letter 22.4 s → 14.2 s, 17.8 → 23.6 tokens/s; thorough model 51 s → 32 s, details 125 s → 63 s – same accuracy.
- **Smaller download:** Setup.exe 163 → 115 MB, Store 229 → 172 MB, Mac 159/175 → 113/129 MB (llama.cpp source bundle, unused Chromium locales, WebGPU shader compiler and library sources removed; maximum installer compression).
- **Idle:** the AI model is released reliably (1 minute after a mere hover preload, 3 minutes after reading); preloading only when the mouse rests on the spider.
- **Tap and drop zone** tighter, especially below the spider (tap zone 56 → 40 px; drop zone only down to just below the spider/web).
- AI library never tries to compile llama.cpp itself; “Zeit” timing lines in the log; KI-Test and size workflow for measuring.

## 1.23.0
- **About twice as fast:** the built-in AI writes the key points and the task first; the details (key points, figures, insights) only when you open “More from the letter”. Measured on the test letters: fast model 30 s → 18.5 s per letter, thorough model 133 s → 90 s – with the same or better accuracy.
- **Instant letter card:** amount, deadline, IBAN and scam warnings appear after 0.2 s, while the AI is still reading.
- **Back to the core:** the result shows the task and 3 key points, everything else is under “More from the letter”. “My letters” combines notebook, deadlines and “Read later”. The spider-web menu shows Read, In my language, Reply, My letters, Photo, More. The spider only asks what matters (reminder, objection, cancellation, already paid?).
- **Lighter:** faster start (update check and Store licence check after startup), calmer idle animation, power-saving mode turns on by itself on PCs with less than 6 GB of memory; GPU or CPU – whichever is faster on this PC – is measured once.
- Reading time shown below every result; timings of every step in the log.
- Removed: downloads watcher and cocoon comparison; folders only by hand; good-morning overview off by default.

## 1.22.0
- **The spider learns – locally:** “Was that right?” below every result; corrections (amount, deadline, sender, letter type, task, summary) become rules for the next letter from the same sender and hints for the AI. Sender profiles from all letters read (“3rd letter from … this year”, “instalment rises from 84 € to 92 € (+9.5 %)”). Settings → What I have learned: view, forget, back up. Nothing leaves the PC; off in private mode.
- **Letters:** “What happens if I do nothing?” (reminders, notices, court payment orders), scam check (foreign IBAN, gift cards, pressure, links, PIN/TAN), “Signature needed” with page and return address, multi-page photos.
- **Easier to use:** simpler settings (built-in AI only, applied instantly), text size, high contrast, setup in 3 steps, tips one at a time, read aloud with highlight and speed, speak a question (Windows voice typing), keyboard shortcuts with “?”, crash report on request. Pro page and Pro locks easier to find.
- **Spider:** good-morning overview, confetti when all deadlines are done, “Read later” note on the thread with reminder, growing web; bigger and smarter tap zone, long press opens the web.
- Deadline notifications with “Done” and “Open letter”.
- **Code protection** in the packaged app (obfuscated scripts, main process as V8 bytecode).
- **Mac test version** (Apple silicon and Intel) in the download repository.
- More test letters (job centre, tax office, health insurance, debt collection, broadcasting fee, fine).

## 1.21.0
- **New design:** calm, Windows 11 style; light and dark follow Windows or Settings → Appearance; pink only as a subtle brand colour. Results start with the task (“Pay 98.90 € by Sunday, 15 November”, days left, IBAN to copy, add to calendar). Footer with the main actions and a “…” menu; settings as Windows-style toggle rows; main window with sidebar, upcoming deadlines and recently read.
- **Calmer spider** (flat, single-colour legs) in the app, the app icon and the tiles; new animations.
- **Contract check:** term, start/end, notice period, cancel-by date, renewal, monthly cost and price changes – with a reminder in the deadline web. **Reply templates** (objection, instalments, extension, question, cancellation).
- **Notebook:** folders (sorted automatically) and “Ask your notebook”.
- **Downloads watcher**, **photograph a letter with the webcam**, **save as PDF / print**, “0 bytes sent to the internet”.
- **Silkreader Pro is coming soon** – Pro features can be unlocked with a personal code for now.
- Fixes: tax notices use “Einspruch” instead of “Widerspruch”; similar key points only once; customer and invoice numbers with spaces; autostart in the Store version via Windows settings.
- Updates, problem reports and the privacy policy now live in the public repository Sebbilore/silkreader-download. From 1.21 on, Silkreader is proprietary (versions up to 1.20 remain MIT).

## 1.20.0
- **In your language:** explain a letter in Turkish, Arabic, Ukrainian, Russian, Polish, Romanian or English (“Language” below a result or “Explain in my language” in the letter card). Checks that the answer is really in that language and retries once; uses the thorough model when it is downloaded.
- **Deadline web:** all deadlines from the notebook in one list (ring, tray, start bubble) – tick off, add to calendar, open the letter. Windows notification 3 days before and the day before.

## 1.19.0
- **Letter help:** invoices, payment reminders, official notices and contracts are recognized. The spider shows “What do I need to do?”, amount, recipient, IBAN and payment reference to copy, and the deadline with a calendar button. “Write a reply” and “Write an objection” draft the matching letter.
- **Number check:** every number in the result is compared with the original text (fixed rules, no AI). Figures get ✓ (in the text), ≈ (calculated) or ? (not found); uncertain numbers in the bullets are underlined.
- **Faster:** for short texts the built-in model writes the short summary first and then the details in the same pass – the document is only read once. Long documents show what was found while reading.
- **Deadlines:** also relative ones (“within 4 weeks”, counted from the letter date) and dates without a year (“by 15.11.”).
- **Store version:** asks once, after a few successful uses, for a review (“So-so” leads to “Report a problem”).
- Silkreader Pro is prepared but switched off – everything stays free.

## 1.18.0
- Hides automatically during fullscreen apps, presentations and games; invisible in screen shares and screenshots; “Do not disturb” for 1 h / 3 h / until tomorrow.
- Reads scanned PDFs and photos of documents (Windows text recognition).
- Explorer right-click: “Read with Silkreader”.
- Practice letter in the first-run setup (works even before an AI is set up).
- Private mode (notebook keeps nothing) and a small “on this PC / to Claude” indicator in the bubble.
- “What's new” bubble after updates.

## 1.17.0
- Built-in AI tested on real Windows (download, analysis, long documents, translation, reply drafts, memory and CPU) before every release; reading in Chrome and Edge tested too.
- Translation with the built-in model fixed: no more contradicting language instruction, direction detected automatically, retried if the model echoes the original.
- Built-in model: always 3–5 bullet points, figures are no longer left out, smaller sections for long documents, important one-off statements (resignations, deadlines, terminations …) are never lost.
- Measured on Windows: idle ≈ 240 MB RAM and ≈ 1 % CPU; analysis of a page ≈ 20–45 s with the fast model (CPU only).

## 1.16.0
- Automated tests on real Windows (GitHub Actions) before every release: real Notepad, real keyboard shortcuts and mouse clicks, ring hold-and-release, scroll tracking, OCR and update signature check.
- Hint for less powerful PCs (memory check, recommends “Fast” or Claude).
- Keyboard and screen reader: every result, notebook entry and choice is reachable with Tab and triggered with Enter/Space; the ring works with arrow keys and Enter; visible focus ring; respects Windows “Show animations” off.
- English README, issue templates, security policy.

## 1.15.1
- Fallback for the update signature check.

## 1.15.0
- No self-made root certificate is installed anymore; updates are verified against the pinned Silkreader certificate.
- First-run setup: how it works, choose the AI, privacy with explicit consent for clipboard features (off by default).
- English user interface, switchable without restart.
- Privacy page, “About Silkreader” with AI notice, MIT license and third-party notices, “Report a problem”.
- Hardening: no navigation to foreign pages, minimal permissions. Microsoft Store package prepared.

## 1.14.0
- The big spider comes for every task and follows the text while scrolling.
- Accessory shows the running task; mouse wheel mode switch only after resting on the spider.
- Faster click, less memory and CPU (idle 2.8 % → 1.6 %).
- Read aloud, “Copied – click to read”, Shorter/More formal/More casual.

## 1.13.0
- New design “Midnight silk”: glossy spider with moods and accessories, glass speech bubble on a silk thread, ring with dew drops, documents as cocoons, new icons.

## 1.12.0
- Everything through the spider: spider-web ring (Ctrl+Alt+Space), mini bubble instead of the app, mouse-wheel click modes, reading pinned documents in the bubble, magnifier for the source passage, notebook and settings as bubbles.

## 1.11.0
- More reliable shortcuts: selection via UI Automation, keystrokes via the Windows API instead of PowerShell, live “✓ detected” in the settings, log for troubleshooting.

## 1.10.0 – 1.10.1
- Minimalist design, ask the text, translate, plain language, reply drafts, deadlines to calendar, compare documents, notebook, screen-region OCR, Ctrl+C on files pins them.

## 1.1.0 – 1.9.0
- From the first hanging spider to whole-document analysis, the speech bubble, the spider web for files, exact word boxes on screen, the big crawling spider and lower memory use.
