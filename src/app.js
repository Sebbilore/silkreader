import { Spider } from './spider.js';
import { Mascot } from './mascot.js';

const $ = (id) => document.getElementById(id);
const MAX_WORDS = 25000; // so viele Wörter werden höchstens dargestellt (analysiert wird alles)

let spider = null;
let words = [];      // { el, norm, page }
let current = null;  // aktuelles Dokument
let result = null;
let run = 0;         // erhöht sich bei jeder neuen Analyse → alte Animationen brechen ab
let skip = false;
let wanderTimer = null;

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
// Zusammenfassung in Stichpunkte zerlegen ("• …" je Zeile; Fließtext → nach Sätzen)
function bullets(text) {
  let parts = String(text || '').split(/\n+|\s*•\s*/).map((t) => t.replace(/^[-–*]\s+/, '').trim()).filter(Boolean);
  if (parts.length === 1 && parts[0].length > 160) parts = parts[0].split(/(?<=[.!?])\s+(?=[A-ZÄÖÜ0-9])/);
  return parts;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, skip ? 0 : ms));

// ---------- Ansichten ----------

function showStart() {
  run++;
  stopWander();
  $('start').style.display = 'flex';
  $('analysis').style.display = 'none';
  $('input').focus();
}

function showAnalysis() {
  $('start').style.display = 'none';
  $('analysis').style.display = 'flex';
}

// ---------- Dokument darstellen ----------

let renderedDoc = null;
function renderDocument(doc) {
  renderedDoc = doc;
  const container = $('doc');
  spider?.destroy();
  let count = 0;
  const html = [];
  doc.pages.forEach((text, i) => {
    if (count >= MAX_WORDS) return;
    const paras = text.split(/\n\s*\n|\r\n\s*\r\n/);
    const ps = [];
    for (const para of paras) {
      if (count >= MAX_WORDS) break;
      const lines = para.split(/\n/).map((line) => line.split(/\s+/).filter(Boolean).map((w) => {
        count++;
        return `<span class="w">${esc(w)}</span>`;
      }).join(' '));
      ps.push(`<p>${lines.join('<br>')}</p>`);
    }
    const no = doc.pages.length > 1 ? `<div class="page-no">Seite ${i + 1}</div>` : '';
    html.push(`<div class="page" data-page="${i + 1}">${no}${ps.join('')}</div>`);
  });
  if (count >= MAX_WORDS) html.push('<div class="truncated">Darstellung gekürzt – analysiert wird das ganze Dokument.</div>');
  container.innerHTML = html.join('');

  words = [];
  container.querySelectorAll('.page').forEach((pg) => {
    const page = Number(pg.dataset.page);
    pg.querySelectorAll('span.w').forEach((el) => words.push({ el, norm: norm(el.textContent), page }));
  });

  $('docScroll').scrollTop = 0;
  spider = new Spider($('docScroll'), container);
  spider.index();
}

// Findet die zitierte Stelle im Text (tolerant gegenüber Satzzeichen und kleinen Abweichungen).
function locate(quote, page) {
  const q = quote.split(/\s+/).map(norm).filter(Boolean);
  if (!q.length || !words.length) return null;
  const search = (from, to) => {
    let best = null, bestScore = 0;
    for (let i = from; i < to; i++) {
      if (words[i].norm !== q[0] && words[i].norm !== q[1]) continue;
      const start = words[i].norm === q[0] ? i : i - 1;
      if (start < 0) continue;
      let score = 0;
      for (let k = 0; k < q.length && start + k < words.length; k++) if (words[start + k].norm === q[k]) score++;
      if (score > bestScore) { bestScore = score; best = start; if (score === q.length) break; }
    }
    const needed = q.length <= 2 ? q.length : Math.max(2, Math.ceil(q.length * 0.6));
    return bestScore >= needed ? { start: best, len: Math.min(q.length, words.length - best) } : null;
  };
  // erst auf der angegebenen Seite suchen, dann im ganzen Dokument
  const onPage = words.reduce((acc, w, i) => {
    if (w.page === page) { acc[0] = Math.min(acc[0], i); acc[1] = i + 1; }
    return acc;
  }, [Infinity, 0]);
  return (onPage[0] < onPage[1] && search(onPage[0], onPage[1])) || search(0, words.length);
}

// ---------- Spinne liest (während Claude arbeitet) ----------

function startWander() {
  stopWander();
  if (!spider || !spider.words.length) return;
  const sw = spider.words;
  let idx = 0;
  const first = sw[0];
  spider.teleport(first.x + 60, first.y + 40);
  spider.show();

  const step = () => {
    idx = (idx + 10 + Math.floor(Math.random() * 30)) % sw.length;
    const w = sw[idx];
    spider.moveTo(w.x + (Math.random() - 0.5) * 80, w.y);
    // ab und zu gelb markieren, wie ein Leser mit Textmarker
    if (Math.random() < 0.35) {
      const n = 1 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n && idx + k < sw.length; k++) sw[idx + k].el.classList.add('scan');
    }
    wanderTimer = setTimeout(step, 550 + Math.random() * 450);
  };
  step();
}

function stopWander() {
  clearTimeout(wanderTimer);
  wanderTimer = null;
  if (spider) spider.minGap = 0;
}

// ---------- Analyse ----------

// Vorschau: Text anzeigen, analysiert wird erst nach Enter. So öffnet sich das Fenster ohne Ruckeln.
let pending = null;
function showPreview(doc) {
  run++;
  stopWander();
  pending = doc;
  current = doc;
  result = null;
  showAnalysis();
  renderDocument(doc);
  spider.hide();
  $('docTitle').innerHTML = `${esc(doc.title)}`;
  $('scanLabel').textContent = 'BEREIT';
  $('counter').textContent = `${words.length.toLocaleString('de-DE')} Wörter${doc.pages.length > 1 ? ` · ${doc.pages.length} Seiten` : ''}`;
  $('bar').classList.remove('indeterminate');
  $('bar').firstElementChild.style.width = '0';
  $('btnSkip').classList.add('hidden');
  $('btnCopy').classList.add('hidden');
  $('panelBody').innerHTML = `<div class="ready">
      <div class="ready-icon">🕷</div>
      <div class="ready-title">Bereit zum Analysieren</div>
      <button class="primary big" id="btnGo">Analysieren <kbd>Enter</kbd></button>
      <div class="ready-keys"><kbd>Esc</kbd> schließen · <kbd>Strg</kbd>+<kbd>K</kbd> in Kokon packen</div>
    </div>`;
  $('btnGo').addEventListener('click', startPending);
  window.focus();
}
function startPending() {
  if (!pending) return;
  const doc = pending;
  pending = null;
  startAnalysis(doc);
}

async function startAnalysis(doc) {
  const myRun = ++run;
  pending = null;
  current = doc;
  result = null;
  skip = false;
  showAnalysis();
  if (renderedDoc !== doc) renderDocument(doc);

  $('docTitle').innerHTML = `${esc(doc.title)}`;
  $('scanLabel').textContent = 'SCANNING';
  $('counter').textContent = `${words.length.toLocaleString('de-DE')} Wörter${doc.pages.length > 1 ? ` · ${doc.pages.length} Seiten` : ''}`;
  $('bar').classList.add('indeterminate');
  $('bar').firstElementChild.style.width = '';
  $('btnSkip').classList.remove('hidden');
  $('btnCopy').classList.add('hidden');
  $('panelBody').innerHTML = '<div class="status" id="status">Die Spinne liest das Dokument …</div>';

  requestAnimationFrame(startWander);
  window.__mascot?.setBusy(true);

  const res = await window.spider.analyze(doc);
  window.__mascot?.setBusy(false);
  if (myRun !== run) return;
  stopWander();

  if (!res.ok) {
    spider.hide();
    $('bar').classList.remove('indeterminate');
    $('scanLabel').textContent = 'FEHLER';
    $('panelBody').innerHTML = `<div class="error">${esc(res.error)}<div class="row">
      ${res.needsKey ? '<button class="primary" id="errSettings">Einstellungen öffnen</button>' : ''}
      <button id="errRetry">Erneut versuchen</button></div></div>`;
    $('errSettings')?.addEventListener('click', () => window.spider.openSettings());
    $('errRetry').addEventListener('click', () => startAnalysis(current));
    return;
  }

  result = res.result;
  await presentResult(result, myRun);
}

async function presentResult(r, myRun) {
  document.querySelectorAll('.w.scan').forEach((el) => el.classList.remove('scan'));
  $('docTitle').innerHTML = `${esc(r.title)}<br><small>${esc(r.doc_type)} · ${esc(current.title)}</small>`;
  $('bar').classList.remove('indeterminate');
  $('btnCopy').classList.remove('hidden');

  // Zusammenfassung & Erkenntnisse sofort zeigen – die Angaben folgen animiert darunter.
  const body = $('panelBody');
  body.innerHTML = `${r.note ? `<div class="status">ℹ️ ${esc(r.note)}</div>` : ''}
    <h3>Das Wichtigste</h3><ul class="summary-list">${bullets(r.summary).map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    <h3>Kernaussagen</h3><ul class="points">${r.key_points.map((p, i) => `<li class="jump" data-type="point" data-index="${i}" style="animation-delay:${i * 60}ms">${esc(p)}</li>`).join('')}</ul>
    <h3>Erkenntnisse</h3>${r.findings.map((f, i) => `
      <div class="finding jump" data-type="finding" data-index="${i}" style="animation-delay:${i * 80}ms">
        <span class="kind ${esc(f.kind)}">${esc(f.kind)}</span>
        <div class="t">${esc(f.title)}</div>
        <div class="d">${esc(f.detail)}</div>
        ${f.pages.length ? `<div class="p">${f.pages.map((p) => `S. ${p}`).join(' · ')}</div>` : ''}
      </div>`).join('')}
    <h3>Gefundene Angaben</h3><div id="figs"></div>`;
  body.scrollTop = 0;
  body.querySelectorAll('.jump').forEach((row) => row.addEventListener('click', () => {
    skip = true; // laufende Tour abkürzen
    focusItem({ type: row.dataset.type, index: Number(row.dataset.index) }, row);
  }));
  const figs = $('figs');
  const total = r.figures.length;
  const setCount = (n) => {
    $('counter').textContent = `${n} von ${total} Angaben gezeigt`;
    $('bar').firstElementChild.style.width = `${total ? (n / total) * 100 : 100}%`;
  };
  setCount(0);

  // Die ganze Spinnen-Tour dauert höchstens ~4 Sekunden, egal wie viele Angaben es sind.
  const perFigure = total ? Math.max(120, Math.min(550, 4000 / total)) : 0;
  spider.speed = 1400;
  for (let i = 0; i < total; i++) {
    if (myRun !== run) return;
    const f = r.figures[i];
    const loc = locate(f.quote, f.page);
    if (loc && !skip) await walkTo(loc, perFigure);
    if (myRun !== run) return;
    if (loc) markHit(loc, !skip);
    figs.appendChild(figureRow(f, loc));
    setCount(i + 1);
    if (!skip) await sleep(40);
  }
  spider.speed = 340;

  if (myRun !== run) return;
  $('scanLabel').textContent = 'FERTIG';
  $('btnSkip').classList.add('hidden');
}

// Findet die Textstelle, zu der eine zusammengefasste Aussage gehört: der Satz mit den
// meisten gemeinsamen Wörtern (Zahlen zählen doppelt).
function findPassage(text) {
  const q = new Set(text.split(/\s+/).map(norm).filter((w) => w.length >= 4 || /\d/.test(w)));
  if (!q.size || !words.length) return null;
  let best = null, bestScore = 0, start = 0;
  const flush = (end) => {
    let score = 0;
    const seen = new Set();
    for (let k = start; k <= end; k++) {
      const w = words[k].norm;
      if (q.has(w) && !seen.has(w)) { seen.add(w); score += /\d/.test(w) ? 2 : 1; }
    }
    // kurze Sätze leicht bevorzugen
    const adj = score / Math.sqrt(Math.max(6, end - start + 1) / 6);
    if (adj > bestScore) { bestScore = adj; best = { start, len: Math.min(end - start + 1, 45) }; }
  };
  for (let k = 0; k < words.length; k++) {
    if (/[.!?:;]$/.test(words[k].el.textContent) || k === words.length - 1 || words[k + 1]?.page !== words[k].page) {
      flush(k);
      start = k + 1;
    }
  }
  return bestScore >= 1.5 ? best : null;
}

// Spinne zur Fundstelle eines Ergebnis-Eintrags schicken
async function focusItem(focus, rowEl) {
  if (!result || !focus) return;
  let loc = null;
  if (focus.type === 'figure') {
    const f = result.figures[focus.index];
    loc = f && (locate(f.quote, f.page) || findPassage(`${f.label} ${f.value}`));
  } else if (focus.type === 'point') {
    loc = findPassage(result.key_points[focus.index] || '');
  } else if (focus.type === 'finding') {
    const f = result.findings[focus.index];
    loc = f && findPassage(`${f.title} ${f.detail}`);
  } else if (focus.type === 'summary') {
    loc = findPassage(result.summary);
  } else if (focus.type === 'quote') {
    loc = locate(focus.quote, 1) || findPassage(focus.quote);
  }
  document.querySelectorAll('.focus').forEach((e) => e.classList.remove('focus'));
  rowEl?.classList.add('focus');
  if (!loc) { toast('Diese Stelle steht so nicht wörtlich im Text'); return; }
  const el = words[loc.start].el;
  $('docScroll').scrollTo({ top: el.offsetTop - $('docScroll').clientHeight / 3, behavior: 'smooth' });
  spider.speed = 900;
  await walkTo(loc, 2200);
  markHit(loc, true);
}

function walkTo(loc, maxMs = 2600) {
  return new Promise((resolve) => {
    const w = words[loc.start].el;
    const x = w.offsetLeft + w.offsetWidth / 2;
    const y = w.offsetTop + w.offsetHeight / 2;
    // weite Sprünge: Spinne kurz ausblenden und neu absetzen statt endlos zu laufen
    if (Math.abs(spider.y - y) > 2500) {
      spider.teleport(x, y - 200);
    }
    spider.show();
    spider.follow = true;
    let done = false;
    const finish = () => { if (!done) { done = true; resolve(); } };
    spider.moveTo(x, y + 26, finish);
    setTimeout(finish, maxMs);
  });
}

function markHit(loc, flash) {
  for (let k = 0; k < loc.len; k++) {
    const el = words[loc.start + k].el;
    el.classList.add('hit');
    if (flash) { el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  }
}

function figureRow(f, loc) {
  const row = document.createElement('div');
  row.className = 'fig';
  row.title = `„${f.quote}“`;
  row.innerHTML = `<div class="label">${esc(f.label)}</div><div class="value">${esc(f.value)}</div>
    <div class="src ${loc ? '' : 'missing'}">S. ${f.page}${loc ? '' : ' · Stelle nicht gefunden'}</div>`;
  if (loc) {
    row.addEventListener('click', async () => {
      document.querySelectorAll('.fig.active').forEach((e) => e.classList.remove('active'));
      row.classList.add('active');
      const el = words[loc.start].el;
      $('docScroll').scrollTo({ top: el.offsetTop - $('docScroll').clientHeight / 2, behavior: 'smooth' });
      await walkTo(loc);
      markHit(loc, true);
    });
  }
  return row;
}

function resultMarkdown(r) {
  return [
    `# ${r.title}`, `_${r.doc_type} · ${current.title}_`, '',
    '## Das Wichtigste', ...bullets(r.summary).map((b) => `- ${b}`), '',
    '## Kernaussagen', ...r.key_points.map((p) => `- ${p}`), '',
    '## Angaben', ...r.figures.map((f) => `- **${f.label}:** ${f.value} (S. ${f.page})`), '',
    '## Erkenntnisse', ...r.findings.map((f) => `- **[${f.kind}] ${f.title}** – ${f.detail}`),
  ].join('\n');
}

// ---------- Bedienung ----------

$('btnAnalyze').addEventListener('click', () => {
  const text = $('input').value.trim();
  if (text) showPreview({ title: 'Eingefügter Text', source: 'text', pages: [text] });
});
$('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('btnAnalyze').click();
});
// Keine Kopfleiste: alles über Rechtsklick und Tastenkürzel
window.addEventListener('contextmenu', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  e.preventDefault();
  window.spider.mainMenu();
});
window.spider.onMenu((action) => {
  if (action === 'new') showStart();
  else if (action === 'paste') window.spider.clipboardPreview();
  else if (action === 'copy') $('btnCopy').click();
});

// ---------- Notizbuch: die letzten 20 Analysen ----------
const nb = $('notebook');
let nbSel = 0;
async function renderNotebook() {
  const items = await window.spider.historyList($('nbSearch').value);
  const list = $('nbList');
  nbSel = Math.min(nbSel, Math.max(0, items.length - 1));
  if (!items.length) {
    list.innerHTML = `<div class="nbEmpty">${$('nbSearch').value ? 'Nichts gefunden' : 'Noch keine Analysen – die Spinne merkt sich hier die letzten 20.'}</div>`;
    return;
  }
  list.innerHTML = items.map((h, i) => `<div class="nbItem${i === nbSel ? ' sel' : ''}" data-id="${esc(h.id)}">
    <div class="t"><b>${esc(h.title || h.docTitle)}</b><span>${esc(bullets(h.summary || '')[0] || '')}</span></div>
    <small>${new Date(h.date).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}</small>
    <button class="del" title="Löschen">✕</button></div>`).join('');
}
function openNotebook() {
  nb.classList.add('open');
  $('nbSearch').value = '';
  nbSel = 0;
  renderNotebook();
  $('nbSearch').focus();
}
const closeNotebook = () => nb.classList.remove('open');
nb.addEventListener('click', async (e) => {
  if (e.target === nb) return closeNotebook();
  const item = e.target.closest('.nbItem');
  if (!item) return;
  if (e.target.classList.contains('del')) { await window.spider.historyDelete(item.dataset.id); renderNotebook(); return; }
  closeNotebook();
  window.spider.historyOpen(item.dataset.id);
});
$('nbSearch').addEventListener('input', () => { nbSel = 0; renderNotebook(); });
$('nbSearch').addEventListener('keydown', (e) => {
  const items = [...document.querySelectorAll('.nbItem')];
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    nbSel = Math.max(0, Math.min(items.length - 1, nbSel + (e.key === 'ArrowDown' ? 1 : -1)));
    items.forEach((el, i) => el.classList.toggle('sel', i === nbSel));
    items[nbSel]?.scrollIntoView({ block: 'nearest' });
  } else if (e.key === 'Enter' && items[nbSel]) {
    e.preventDefault();
    closeNotebook();
    window.spider.historyOpen(items[nbSel].dataset.id);
  } else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeNotebook(); }
});
window.spider.onShowNotebook(openNotebook);

$('btnSkip').addEventListener('click', () => { skip = true; });
$('btnCopy').addEventListener('click', async () => {
  if (!result) return;
  await navigator.clipboard.writeText(resultMarkdown(result));
  $('btnCopy').textContent = 'Kopiert ✓';
  setTimeout(() => { $('btnCopy').textContent = 'Ergebnis kopieren'; }, 1500);
});

// Dateien überall ins Fenster ziehen
const drop = $('drop');
window.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
window.addEventListener('dragleave', (e) => { if (!e.relatedTarget) drop.classList.remove('over'); });
window.addEventListener('drop', (e) => {
  e.preventDefault();
  drop.classList.remove('over');
  const file = e.dataTransfer.files[0];
  if (file) window.spider.openFile(file);
  else {
    const text = e.dataTransfer.getData('text/plain');
    if (text) showPreview({ title: 'Gezogener Text', source: 'text', pages: [text] });
  }
});

window.addEventListener('resize', () => spider?.index());
window.spider.onDocument(({ doc, autoStart, result: r, focus }) => {
  if (r) showWithResult(doc, r, focus); // aus der Sprechblase: Ergebnis gibt es schon
  else if (autoStart) startAnalysis(doc);
  else showPreview(doc);
});

function showWithResult(doc, r, focus) {
  const myRun = ++run;
  pending = null;
  stopWander();
  current = doc;
  result = r;
  skip = false;
  showAnalysis();
  renderDocument(doc);
  spider.show();
  const first = spider.words[0];
  if (first) spider.teleport(first.x + 60, first.y + 40);
  if (focus) {
    // Direkt zur angeklickten Stelle: Tour überspringen, dann hinlaufen
    skip = true;
    presentResult(r, myRun).then(() => {
      skip = false;
      const sel = focus.type === 'figure' ? `#figs .fig:nth-child(${focus.index + 1})` : `.jump[data-type="${focus.type}"][data-index="${focus.index}"]`;
      focusItem(focus, document.querySelector(sel));
    });
  } else {
    presentResult(r, myRun);
  }
}

// Tastenkürzel im Analysefenster
window.addEventListener('keydown', async (e) => {
  const typing = e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT';
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Enter' && !typing && pending) { e.preventDefault(); startPending(); return; }
  if (nb.classList.contains('open')) return;
  if (mod && e.key.toLowerCase() === 'h') { e.preventDefault(); openNotebook(); return; }
  if (e.key === 'Escape') { e.preventDefault(); if (pending || result) window.spider.closeWindow(); else showStart(); return; }
  if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); window.spider.pickFile(); return; }
  if (mod && e.key.toLowerCase() === 'n') { e.preventDefault(); showStart(); return; }
  if (mod && e.key === ',') { e.preventDefault(); window.spider.openSettings(); return; }
  if (mod && e.key.toLowerCase() === 'k' && current) {
    e.preventDefault();
    await window.spider.cocoonAddText(current.pages.join('\n\n'));
    toast('In einen Kokon gepackt 🕸');
    return;
  }
  if (mod && e.shiftKey && e.key.toLowerCase() === 'c' && result) { e.preventDefault(); $('btnCopy').click(); return; }
  if (mod && e.key.toLowerCase() === 'v' && !typing && $('start').style.display !== 'none') {
    // Strg+V auf der Startseite: Text direkt übernehmen
    $('input').focus();
  }
});

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}
window.spider.onProgress(({ chars, summary }) => {
  const s = $('status');
  if (!s) return;
  if (summary) {
    // Zusammenfassung schon live anzeigen, während die KI noch weiterschreibt
    s.innerHTML = `<h3>Das Wichtigste</h3><ul class="summary-list">${bullets(summary).map((b) => `<li>${esc(b)}</li>`).join('')}</ul><span class="cursor">▍</span>
      <div class="status">KI schreibt weiter … ${chars.toLocaleString('de-DE')} Zeichen</div>`;
  } else {
    s.textContent = `KI analysiert … ${chars.toLocaleString('de-DE')} Zeichen Ergebnis empfangen`;
  }
});

showStart();

// Die kleine Spinne tollt im Fenster herum (rechts das Ergebnis-Panel freilassen)
const mascot = new Mascot({
  ceiling: 0,
  rightInset: () => ($('analysis').style.display !== 'none' ? $('panel').offsetWidth : 0),
});
window.__mascot = mascot;
