import { Spider } from './spider.js';

const $ = (id) => document.getElementById(id);
const MAX_WORDS = 25000; // so viele Wörter werden höchstens dargestellt (analysiert wird alles)

let spider = null;
let words = [];      // { el, norm, page }
let current = null;  // aktuelles Dokument
let result = null;
let run = 0;         // erhöht sich bei jeder neuen Analyse → alte Animationen brechen ab
let skip = false;
let wanderTimer = null;

const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
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

function renderDocument(doc) {
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
  spider.minGap = 33; // während die KI rechnet: 30 fps reichen und lassen ihr mehr Rechenzeit
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

async function startAnalysis(doc) {
  const myRun = ++run;
  current = doc;
  result = null;
  skip = false;
  showAnalysis();
  renderDocument(doc);

  $('docTitle').innerHTML = `${esc(doc.title)}`;
  $('scanLabel').textContent = 'SCANNING';
  window.spider.getSettings().then(showModel);
  $('counter').textContent = `${words.length.toLocaleString('de-DE')} Wörter${doc.pages.length > 1 ? ` · ${doc.pages.length} Seiten` : ''}`;
  $('bar').classList.add('indeterminate');
  $('bar').firstElementChild.style.width = '';
  $('btnSkip').classList.remove('hidden');
  $('btnCopy').classList.add('hidden');
  $('panelBody').innerHTML = '<div class="status" id="status">Die Spinne liest das Dokument …</div>';

  requestAnimationFrame(startWander);

  const res = await window.spider.analyze(doc);
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
  const body = $('panelBody');
  body.innerHTML = '<h3>Gefundene Angaben</h3><div id="figs"></div>';
  const figs = $('figs');
  const total = r.figures.length;
  const setCount = (n) => {
    $('counter').textContent = `${n} von ${total} Angaben gezeigt`;
    $('bar').firstElementChild.style.width = `${total ? (n / total) * 100 : 100}%`;
  };
  setCount(0);

  for (let i = 0; i < total; i++) {
    if (myRun !== run) return;
    const f = r.figures[i];
    const loc = locate(f.quote, f.page);
    if (loc && !skip) await walkTo(loc);
    if (myRun !== run) return;
    if (loc) markHit(loc, !skip);
    figs.appendChild(figureRow(f, loc));
    setCount(i + 1);
    if (!skip) figs.lastElementChild.scrollIntoView({ block: 'nearest' });
    await sleep(loc ? 260 : 120);
  }

  if (myRun !== run) return;
  $('scanLabel').textContent = 'FERTIG';
  $('btnSkip').classList.add('hidden');
  $('btnCopy').classList.remove('hidden');

  const sum = document.createElement('div');
  sum.innerHTML = `<h3>Zusammenfassung</h3><div class="summary">${esc(r.summary)}</div>
    <h3>Kernaussagen</h3><ul class="points">${r.key_points.map((p, i) => `<li style="animation-delay:${i * 80}ms">${esc(p)}</li>`).join('')}</ul>
    <h3>Erkenntnisse</h3>${r.findings.map((f, i) => `
      <div class="finding" style="animation-delay:${i * 120}ms">
        <span class="kind ${esc(f.kind)}">${esc(f.kind)}</span>
        <div class="t">${esc(f.title)}</div>
        <div class="d">${esc(f.detail)}</div>
        ${f.pages.length ? `<div class="p">${f.pages.map((p) => `S. ${p}`).join(' · ')}</div>` : ''}
      </div>`).join('')}`;
  if (r.note) {
    const n = document.createElement('div');
    n.className = 'status';
    n.textContent = 'ℹ️ ' + r.note;
    sum.prepend(n);
  }
  body.prepend(sum);
  body.scrollTop = 0;
}

function walkTo(loc) {
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
    setTimeout(finish, 2600);
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
    '## Zusammenfassung', r.summary, '',
    '## Kernaussagen', ...r.key_points.map((p) => `- ${p}`), '',
    '## Angaben', ...r.figures.map((f) => `- **${f.label}:** ${f.value} (S. ${f.page})`), '',
    '## Erkenntnisse', ...r.findings.map((f) => `- **[${f.kind}] ${f.title}** – ${f.detail}`),
  ].join('\n');
}

// ---------- Bedienung ----------

$('btnAnalyze').addEventListener('click', () => {
  const text = $('input').value.trim();
  if (text) startAnalysis({ title: 'Eingefügter Text', source: 'text', pages: [text] });
});
$('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) $('btnAnalyze').click();
});
$('btnNew').addEventListener('click', showStart);
$('btnClip').addEventListener('click', () => window.spider.analyzeClipboard());
$('btnFile').addEventListener('click', () => window.spider.pickFile());
$('btnFile2').addEventListener('click', () => window.spider.pickFile());
$('btnSettings').addEventListener('click', () => window.spider.openSettings());
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
    if (text) startAnalysis({ title: 'Gezogener Text', source: 'text', pages: [text] });
  }
});

window.addEventListener('resize', () => spider?.index());
window.spider.onDocument((doc) => startAnalysis(doc));
window.spider.onProgress((n) => {
  const s = $('status');
  if (s) s.textContent = `KI analysiert … ${n.toLocaleString('de-DE')} Zeichen Ergebnis empfangen`;
});

function showModel(s) {
  $('modelName').textContent = s.provider === 'builtin'
    ? '· Eingebautes Modell · kostenlos'
    : s.provider === 'ollama'
    ? `· Lokal (${s.ollamaModel}) · kostenlos`
    : `· ${s.models[s.model]?.split(' (')[0] || s.model}`;
}
window.spider.getSettings().then(showModel);
showStart();
