# Changelog

All notable changes to Silkreader. / Alle wichtigen Änderungen an Silkreader.

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
