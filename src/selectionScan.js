// Findet die markierten Wörter direkt auf dem Bildschirm: Ein Bildschirmfoto wird (nur im
// Speicher) nach der typischen Markierungsfarbe durchsucht. Daraus ergeben sich die Zeilen
// und – über die Lücken zwischen den Wörtern – die einzelnen Wörter. Das klappt in jedem
// Programm, auch dort, wo Windows die Textpositionen nicht verrät.

const { desktopCapturer, screen } = require('electron');

/** Liefert [[x, y, w, h], …] in Electron-Koordinaten (DIP) oder null. */
async function scanSelection(nearPoint) {
  const display = screen.getDisplayNearestPoint(nearPoint);
  const sf = display.scaleFactor || 1;
  const W = Math.round(display.size.width * sf), H = Math.round(display.size.height * sf);
  let sources;
  try {
    sources = await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: W, height: H } });
  } catch { return null; }
  const src = sources.find((s) => String(s.display_id) === String(display.id)) || sources[0];
  if (!src || src.thumbnail.isEmpty()) return null;
  const size = src.thumbnail.getSize();
  const px = src.thumbnail.toBitmap(); // BGRA
  const words = findWords(px, size.width, size.height);
  if (!words.length) return null;
  const k = size.width / display.bounds.width; // Bildpixel pro DIP
  return words.map(([x, y, w, h]) => [display.bounds.x + x / k, display.bounds.y + y / k, w / k, h / k]);
}

// ---- reine Bildanalyse (ohne Electron, damit sie testbar ist) ----
function findWords(px, W, H) {
  // 1) Markierungsfarbe bestimmen: häufigster deutlich blauer Farbton
  const hist = new Map();
  for (let i = 0; i < W * H * 4; i += 16) { // jedes 4. Pixel reicht zum Zählen
    const b = px[i], g = px[i + 1], r = px[i + 2];
    if (b > 90 && b > r + 40 && b > g + 10) {
      const key = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      hist.set(key, (hist.get(key) || 0) + 1);
    }
  }
  let best = -1, bestN = 0;
  for (const [key, n] of hist) if (n > bestN) { bestN = n; best = key; }
  if (bestN < 150) return [];
  const sr = ((best >> 10) & 31) * 8 + 4, sg = ((best >> 5) & 31) * 8 + 4, sb = (best & 31) * 8 + 4;
  const isSel = (i) => Math.abs(px[i + 2] - sr) + Math.abs(px[i + 1] - sg) + Math.abs(px[i] - sb) < 42;

  // 2) Zeilen: Bänder aus Pixelreihen mit viel Markierungsfarbe
  const rowCount = new Uint32Array(H);
  for (let y = 0; y < H; y++) {
    let n = 0;
    for (let x = 0, i = y * W * 4; x < W; x++, i += 4) if (isSel(i)) n++;
    rowCount[y] = n;
  }
  const bands = [];
  for (let y = 0; y < H; y++) {
    if (rowCount[y] < 12) continue;
    let y1 = y;
    while (y1 + 1 < H && (rowCount[y1 + 1] >= 12 || (y1 + 2 < H && rowCount[y1 + 2] >= 12))) y1++;
    if (y1 - y + 1 >= 8) bands.push([y, y1]);
    y = y1;
  }

  // 2b) Zusammenhängende Markierungsblöcke in einzelne Textzeilen teilen:
  //     Reihen ohne Schriftpixel (nur Markierungsfarbe) liegen zwischen den Zeilen.
  const lines = [];
  for (const [y0, y1] of bands) {
    const textRows = [];
    for (let y = y0; y <= y1; y++) {
      let first = -1, last = -1;
      const base = y * W * 4;
      for (let x = 0, i = base; x < W; x++, i += 4) if (isSel(i)) { if (first < 0) first = x; last = x; }
      let ink = 0;
      for (let x = first, i = base + first * 4; x <= last; x++, i += 4) if (!isSel(i)) ink++;
      textRows.push(ink > 1);
    }
    let start = -1;
    for (let k = 0; k <= textRows.length; k++) {
      if (k < textRows.length && textRows[k]) { if (start < 0) start = k; }
      else if (start >= 0) {
        const a = start, b = k - 1;
        if (b - a + 1 >= 4) lines.push([y0 + a, y0 + b]);
        start = -1;
      }
    }
  }
  // Zeilen um den halben Abstand nach oben/unten aufweiten (wie die Markierung selbst)
  const pad = lines.map(([a, b]) => Math.max(2, Math.round((b - a + 1) * 0.25)));

  // 3) Wörter: Spalten ohne Schriftpixel trennen die Wörter
  const words = [];
  lines.slice(0, 80).forEach(([ly0, ly1], li) => {
    const y0 = Math.max(0, ly0 - pad[li]), y1 = Math.min(H - 1, ly1 + pad[li]);
    const h = ly1 - ly0 + 1;
    let xa = -1, xb = -1;
    const ink = new Uint16Array(W), sel = new Uint16Array(W);
    for (let x = 0; x < W; x++) {
      let ni = 0, ns = 0;
      for (let y = ly0, i = (ly0 * W + x) * 4; y <= ly1; y++, i += W * 4) { if (isSel(i)) ns++; else ni++; }
      ink[x] = ni; sel[x] = ns;
      if (ns >= h * 0.3) { if (xa < 0) xa = x; xb = x; }
    }
    if (xa < 0 || xb - xa < 6) return;
    const gapMin = Math.max(3, Math.round(h * 0.28));
    let start = -1, gap = 0;
    for (let x = xa; x <= xb + 1; x++) {
      if (x <= xb && ink[x] > 0) { if (start < 0) start = x; gap = 0; }
      else if (start >= 0) {
        gap++;
        if (gap >= gapMin || x > xb) {
          const end = x - gap;
          if (end - start >= 2) words.push([start - 2, y0, end - start + 5, y1 - y0 + 1]);
          start = -1; gap = 0;
        }
      }
    }
  });
  return words.slice(0, 400);
}

module.exports = { scanSelection, findWords };
