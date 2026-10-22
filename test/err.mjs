import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'],
  env: { ...process.env, ANTHROPIC_API_KEY: 'sk-ant-invalid' } });
await new Promise((r) => setTimeout(r, 2500));
const bubble = app.windows().find((w) => w.url().includes('bubble'));
await bubble.evaluate(() => window.spider.analyzeText('Testtext mit 42 Euro.'));
await new Promise((r) => setTimeout(r, 8000));
const main = app.windows().find((w) => w.url().includes('index.html'));
console.log(await main.textContent('#panelBody'));
await app.close();
