import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
// Ersteinrichtung ist schon durch (sonst öffnet sich zuerst „Willkommen“), das Modell fehlt → Einstellungen öffnen sich von selbst
fs.mkdirSync(`${process.argv[3]}/.config/Silkreader`, { recursive: true });
fs.writeFileSync(`${process.argv[3]}/.config/Silkreader/settings.json`, JSON.stringify({ onboarded: true }));
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, HOME: process.argv[3], SILK_MODEL_PATH: '/nonexistent' } });
await new Promise((r) => setTimeout(r, 4000));
const w = app.windows().find((x) => x.url().includes('settings'));
console.log('settings opened automatically:', !!w);
await w.screenshot({ path: process.argv[2] });
await app.close();
