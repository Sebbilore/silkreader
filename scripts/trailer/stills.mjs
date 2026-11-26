// Standbilder (3840x2160) für den Trailer: node scripts/trailer/stills.mjs <aufnahmen> <ausgabe>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const [shots, out, logo] = process.argv.slice(2).map((p) => path.resolve(p));
const img = (f) => `file://${shots}/${f}`;
const CSS = `*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;position:relative;overflow:hidden;font-family:Inter,sans-serif;background:linear-gradient(135deg,#fbf8f6,#efe8e4)}
.abs{position:absolute}.popup{position:absolute;left:150px;top:60px;height:960px;filter:drop-shadow(0 12px 30px rgba(0,0,0,.18))}
.paper{position:absolute;left:150px;top:60px;width:760px;height:960px;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:56px 64px;font-size:25px;line-height:1.5;color:#222}
.paper small{color:#777;font-size:18px}.paper h3{font-size:28px;margin:30px 0 20px}.paper p{margin:0 0 16px}
mark{background:#a8cdfa;color:#111;padding:2px 0}
.spider{position:absolute;left:775px;top:0;width:440px;mix-blend-mode:multiply}
.cursor{position:absolute;width:34px}
.ring{position:absolute;border:4px solid #d6246e;border-radius:50%;opacity:.55}`;
const letter = (mark) => `<div class="paper"><small>Stadtwerke Musterstadt GmbH · Postfach 10 20 30 · 12345 Musterstadt</small>
<p style="margin-top:28px">Frau Erika Beispiel<br>Lindenweg 7<br>12345 Musterstadt</p><p style="text-align:right"><small>Musterstadt, 24.11.2026</small></p>
<h3>Zahlungserinnerung zur Rechnung RE-2026-4471</h3><p>Sehr geehrte Frau Beispiel,</p>
${mark ? '<mark>' : ''}<p style="display:inline">zu unserer Stromrechnung vom 02.11.2026 konnten wir leider noch keinen Zahlungseingang feststellen. Der offene Betrag beträgt 55,00 €. Bitte überweisen Sie den Betrag bis zum 04.12.2026 auf unser Konto.</p>${mark ? '</mark>' : ''}
<p style="margin-top:16px">IBAN: DE89 3704 0044 0532 0130 00<br>Verwendungszweck: RE-2026-4471</p><p>Sollten Sie bereits gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.</p><p>Mit freundlichen Grüßen<br>Ihre Stadtwerke Musterstadt</p></div>`;
const arrow = (x, y) => `<svg class="cursor" style="left:${x}px;top:${y}px" viewBox="0 0 24 24"><path d="M3 2l17 9-7.5 2L9 21z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg>`;
const popup = (f) => `<img class="popup" src="${img(f)}">`;
const pages = {
  s1: letter(false),
  s2: letter(true) + arrow(826, 650) + `<img class="spider" src="${img('spider.png')}">`,
  s3: letter(true) + `<div class="ring" style="left:905px;top:115px;width:170px;height:170px"></div><div class="ring" style="left:870px;top:80px;width:240px;height:240px;opacity:.3"></div><img class="spider" src="${img('spider.png')}">` + arrow(1000, 220),
  s4: popup('result.png'), s5: popup('readaloud.png'), s6: popup('scam.png'),
  s7: `<div class="abs" style="left:560px;top:130px;width:800px;display:flex;justify-content:center"><svg width="150" height="190" viewBox="0 0 24 24" fill="none" stroke="#d6246e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></div><img class="abs" src="${img('zero-bytes.png')}" style="left:690px;top:380px;width:540px;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,.14);border:1px solid #e6e0dc">`,
  s8: `<img class="abs" src="file://${logo}" style="left:830px;top:140px;width:260px;border-radius:52px;box-shadow:0 12px 40px rgba(0,0,0,.2)">`,
};
fs.mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 });
for (const [k, html] of Object.entries(pages)) {
  fs.writeFileSync(`${out}/${k}.html`, `<meta charset="utf-8"><style>${CSS}</style><body>${html}</body>`); await pg.goto(`file://${out}/${k}.html`); await pg.waitForTimeout(300);
  await pg.screenshot({ path: `${out}/${k}.png` });
}
await b.close();
