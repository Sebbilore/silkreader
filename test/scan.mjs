import { _electron as electron } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import { createRequire } from 'module';
const { findWords } = createRequire(import.meta.url)('../src/selectionScan.js');
const [home, theme] = process.argv.slice(2);
const app = await electron.launch({ executablePath: './node_modules/electron/dist/electron', args: ['--no-sandbox', '.'], env: { ...process.env, SPIDER_MOCK: 'test/mock.json', HOME: home, SILK_MODEL_PATH: '/nonexistent' } });
await new Promise((r) => setTimeout(r, 2500));
const res = await app.evaluate(async ({ BrowserWindow }, theme) => {
  const w = new BrowserWindow({ x: 50, y: 50, width: 900, height: 600, show: true, frame: false });
  const dark = theme === 'dark';
  const css = dark ? 'background:#1e1e24;color:#e8e8e8;' : 'background:#fff;color:#111;';
  await w.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(`<body style="${css}font:16px Segoe UI,Arial;padding:40px;margin:0">
    <p>Seitennavigation</p><p id=t>Das Geschäftsjahr 2025 war für die Nordlicht Energie AG das erfolgreichste der Firmengeschichte. Der Umsatz stieg um 18 Prozent auf 412 Millionen Euro, nachdem im Vorjahr noch 349 Millionen Euro erzielt worden waren. Treiber des Wachstums waren die neuen Windparks.</p><p>Nicht markiert.</p></body>`));
  w.focus();
  const truth = await w.webContents.executeJavaScript(`(() => {
    const t = document.getElementById('t'); const r = document.createRange(); r.selectNodeContents(t); getSelection().removeAllRanges(); getSelection().addRange(r);
    const out = []; const txt = t.firstChild; const re = /\\S+/g; let m;
    while ((m = re.exec(txt.data))) { const rr = document.createRange(); rr.setStart(txt, m.index); rr.setEnd(txt, m.index + m[0].length); for (const b of rr.getClientRects()) out.push([b.x, b.y, b.width, b.height]); }
    return out; })()`);
  await new Promise((r) => setTimeout(r, 300));
  const img = await w.webContents.capturePage();
  const sz = img.getSize();
  w.destroy();
  return { truth, bmp: img.toBitmap().toString('base64'), sz };
}, theme);
const k = res.sz.width / 900;
res.found = findWords(Buffer.from(res.bmp, 'base64'), res.sz.width, res.sz.height).map(([x, y, ww, h]) => [x / k, y / k, ww / k, h / k]);
const center = (r) => [r[0] + r[2] / 2, r[1] + r[3] / 2];
const inside = (p, r) => p[0] >= r[0] - 3 && p[0] <= r[0] + r[2] + 3 && p[1] >= r[1] - 3 && p[1] <= r[1] + r[3] + 3;
const hits = res.truth.filter((t) => res.found.some((f) => inside(center(t), f))).length;
const precise = res.found.filter((f) => res.truth.some((t) => inside(center(f), [t[0] - 4, t[1] - 6, t[2] + 8, t[3] + 12]))).length;
console.log(`${theme}: echte Wörter ${res.truth.length}, gefunden ${res.found.length}, getroffen ${hits}/${res.truth.length}, Kästen auf einem Wort ${precise}/${res.found.length}`);
await app.close().catch(() => {});
