# Security / Sicherheit

**Please do not report security issues in public issues.** Use GitHub's private reporting instead:
https://github.com/Sebbilore/silkreader/security/advisories/new

**Sicherheitslücken bitte nicht öffentlich melden**, sondern vertraulich über den Link oben.

Only the latest version receives fixes. / Korrekturen gibt es nur für die neueste Version.

What Silkreader does on your PC (for reviewers):
- Reads the selected text via Windows UI Automation or a short Ctrl+C (the clipboard is restored afterwards).
- Takes an in-memory screenshot to locate the selected words (never stored or sent).
- Registers global shortcuts; optionally watches the clipboard (opt-in).
- Talks to the network only for: Claude (if chosen), the one-time model download (Hugging Face), update checks (GitHub).
- Updates are only installed if signed with the pinned Silkreader certificate (or a valid publisher certificate).
