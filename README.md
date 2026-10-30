<p align="center"><img src="docs/images/icon.png" width="96" alt=""></p>

# 🕷 Silkreader

**English** · [Deutsch](README.de.md)

**A small spider that reads your letters.** It hangs at the top of your screen. Select some text, tap the spider – and it tells you what to do: what you have to pay, by when, and whether you can object. For invoices, reminders, official notices, contracts and any other text. The AI runs on your PC; nothing is sent to the internet.

<p align="center"><img src="docs/images/spider-moods.png" width="640" alt="The spider in different moods, with accessories"></p>

## What it does

- **What you need to do – right at the top:** amount, deadline with “12 days left”, IBAN to copy, add to calendar. This card comes from fixed rules and appears within a moment, while the AI is still reading.
- **The essentials in 3 bullet points.** Everything else under **“More from the letter”**: what happens if I do nothing, payment details, comparison with earlier letters, key points, figures and insights with the source passage. The AI only writes the details when you open them – that is why the result is quick.
- **Warns about scams** (foreign IBAN, gift cards, pressure, links, PIN/TAN) and notices when a **signature** is needed.
- **Ask the text** (with a quote as proof), **In my language** (Turkish, Arabic, Ukrainian, Russian, Polish, Romanian, English), **read aloud** with highlighting.
- **My letters:** every letter read, open deadlines with reminders, “Read later”.
- **Photograph a letter** (several pages), read a file, a screen region or the clipboard.
- **Learns – only on your PC:** “Was that right?” below every result; corrections are applied to the next letter from the same sender.

**Silkreader Pro** (coming soon): translate, explain simply, replies and templates, letter help, contract check, scanned PDFs, folders and the thorough AI model.

## Install

- **Microsoft Store (recommended):** https://apps.microsoft.com/detail/9PHKJW54RGDS
- **Installer:** [silkreader-download → Releases](https://github.com/Sebbilore/silkreader-download/releases/latest) → `Silkreader-Setup-….exe`
- **Mac (test version):** in the same place, `…-mac-arm64.dmg` (Apple silicon) or `…-mac-x64.dmg` (Intel)

Windows 10 (1809+) and 11, 64-bit, at least 4 GB of memory (8 GB recommended). Setup (3 steps) downloads the AI model once (1 GB). Updates install automatically and only if signed with the Silkreader certificate.

## How to use it

| | |
|---|---|
| **Select text, tap the spider** | A big spider crawls over the text; the speech bubble shows what to do right away |
| **Tap the spider with nothing selected** | Mini bubble: paste text, read a file, photograph a letter, recent letters |
| **Right-click, long press or Ctrl+Alt+Space** | Spider-web menu: Read, In my language, Reply, My letters, Photo, More |
| **Drag a file onto the spider** | It sticks in the web as a cocoon – tap it to read |
| **?** in the speech bubble | All keyboard shortcuts |

## Speed

Two-stage AI (key points and task first, details on demand): about 12 s per letter with the fast model on the test letters (1.22: ~30 s), about 32 s with the thorough model (1.22: ~130 s). The model is loaded only when reading is about to start and released after 3 minutes. Idle: about 70 MB of memory and under 1 % CPU. Power-saving mode turns on by itself on PCs with less than 6 GB of memory.

## Privacy

No servers of its own, no account, no ads, no tracking. Letters, notebook and everything learned stay on your PC. Details: [src/privacy.html](src/privacy.html) (also in the app under *About Silkreader*).

AI can make mistakes – always check important details (amounts, deadlines) in the original.

## Development

```bash
npm install
npm start            # run the app
npm run dist:win     # Windows installer
npm run dist:store   # Microsoft Store package (see electron-builder.store.js)
```

Tests: `test/*.mjs` (Linux, virtual display, mock AI), `test/windows.mjs` on a real Windows machine for every change, `test/bench.mjs` (AI test with real test letters: accuracy, duration, read/write time, tokens/s). Every step is timed in the app log (“Zeit …” lines).

The code and comments are in German. See [CHANGELOG.md](CHANGELOG.md), [SECURITY.md](SECURITY.md) and [LICENSE](LICENSE) (proprietary since 1.21; up to 1.20 MIT).
