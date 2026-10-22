import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, HOME: process.argv[3] } });
await new Promise((r) => setTimeout(r, 4000));
const w = app.windows().find((x) => x.url().includes('settings'));
console.log('settings opened automatically:', !!w);
await w.screenshot({ path: process.argv[2] });
await app.close();
