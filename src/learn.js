// Lokales Lernen: Silkreader merkt sich Absender, Beträge und die Korrekturen des Nutzers –
// nur auf diesem PC (learn.json im App-Ordner). Das KI-Modell selbst wird nicht verändert:
// Gelerntes wird beim nächsten Brief als feste Regel angewendet und der KI als Hinweis mitgegeben.
const fs = require('fs');
const facts = require('./facts');

const MAX_LETTERS = 40; // je Absender
const MAX_CORRECTIONS = 300;
const FIELDS = ['amount', 'deadline', 'sender', 'kind', 'task', 'summary'];
const AMOUNT_WORDS = /(gesamtbetrag|rechnungsbetrag|offener betrag|zu zahlen(?:der betrag)?|nachzahlung|forderung|summe|endbetrag|zahlbetrag|abschlag|beitrag|miete|erstattung|guthaben|betrag)/i;

const hash = (t) => { let h = 5381; const s = String(t); for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(36); };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const esc = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const money = (v) => `${Number(v).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
const parseMoney = (s) => { const m = String(s).replace(/\s/g, '').match(/(\d{1,3}(?:\.\d{3})*(?:,\d{1,2})?|\d+(?:[.,]\d{1,2})?)/); return m ? Number(m[1].replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')) : null; };
// „15.11.2026“, „15. November 2026“, „2026-11-15“ → Date
function parseDay(s) {
  s = String(s || '').trim();
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})/);
  if (m) return new Date(+m[3] < 100 ? 2000 + +m[3] : +m[3], +m[2] - 1, +m[1]);
  return facts.parseDate(s);
}
// Alle Schreibweisen eines Datums im Text finden („15.11.2026“, „15. November 2026“)
const MONTH_NAMES = ['januar', 'februar', 'märz', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'dezember'];
function findDate(text, d) {
  const dd = d.getDate(), mm = d.getMonth() + 1, y = d.getFullYear();
  const re = new RegExp(`\\b0?${dd}\\.\\s?(?:0?${mm}\\.\\s?(?:${y}|${String(y).slice(2)})\\b|\\s*${MONTH_NAMES[mm - 1]}\\s+${y})`, 'i');
  const m = re.exec(text);
  return m ? { index: m.index, length: m[0].length } : null;
}
// Die zwei, drei Wörter direkt vor einer Stelle („fällig am“, „zahlbar bis“)
function wordsBefore(text, index) {
  // nur im selben Satzteil suchen (nicht über Beträge, Zeilen oder Satzenden hinweg)
  const before = text.slice(Math.max(0, index - 40), index).split(/[\n.;:€\d]/).pop().replace(/\s+/g, ' ');
  const words = before.split(/[^\p{L}]+/u).filter(Boolean).slice(-3);
  while (words.length > 1 && words[0].length < 3) words.shift();
  return words.join(' ').toLowerCase();
}

function createLearner(file) {
  const load = () => { try { return { senders: {}, corrections: [], feedback: { up: 0, down: 0 }, ...JSON.parse(fs.readFileSync(file, 'utf8')) }; } catch { return { senders: {}, corrections: [], feedback: { up: 0, down: 0 } }; } };
  const save = (d) => fs.writeFileSync(file, JSON.stringify(d));
  const nameFor = (d, s) => d.corrections.slice().reverse().find((c) => c.key === s.key && c.field === 'sender')?.right || s.name;

  /** Gelesenen Brief merken (Absender, Art, Betrag, wiederkehrender Betrag) */
  function observe(text, letter, { date = Date.now() } = {}) {
    const s = facts.senderOf(text);
    if (!s) return null;
    const d = load();
    const p = d.senders[s.key] || (d.senders[s.key] = { name: s.name, letters: [] });
    const h = hash(text);
    p.letters = p.letters.filter((l) => l.h !== h);
    const rec = facts.recurringAmount(text);
    p.letters.push({ h, date, kind: letter?.label || null, amount: letter?.amount?.value ?? null, recurring: rec ? rec.value : null, recurringLabel: rec ? rec.label : null });
    p.letters = p.letters.slice(-MAX_LETTERS);
    save(d);
    return s;
  }

  /** Zusammenhang: „3. Brief von … dieses Jahr“ und „Abschlag steigt von 84 € auf 92 €“ */
  function context(text, { now = new Date() } = {}) {
    const s = facts.senderOf(text);
    if (!s) return null;
    const d = load();
    const p = d.senders[s.key];
    const h = hash(text);
    const prev = (p?.letters || []).filter((l) => l.h !== h);
    const year = now.getFullYear();
    const thisYear = prev.filter((l) => new Date(l.date).getFullYear() === year).length + 1;
    const out = { key: s.key, name: nameFor(d, s), nth: thisYear, total: prev.length + 1, trend: null };
    const rec = facts.recurringAmount(text);
    const last = prev.slice().reverse().find((l) => l.recurring != null && (!rec || !l.recurringLabel || l.recurringLabel === rec.label || /abschlag|beitrag|rate|miete/.test(l.recurringLabel)));
    if (rec && last && Math.abs(last.recurring - rec.value) >= 0.01) {
      out.trend = { label: rec.label, from: last.recurring, to: rec.value, fromText: money(last.recurring), toText: money(rec.value), pct: Math.round(((rec.value - last.recurring) / last.recurring) * 1000) / 10, since: last.date };
    }
    return out;
  }

  /** Korrektur des Nutzers merken – möglichst als Regel, die auch beim nächsten Brief greift */
  function correct({ text, field, wrong = '', right = '' }) {
    if (!FIELDS.includes(field)) return { ok: false, error: 'Unbekanntes Feld' };
    right = String(right || '').trim().slice(0, 400);
    if (!right) return { ok: false, error: 'Bitte gib an, was richtig wäre.' };
    text = String(text || '');
    const s = facts.senderOf(text) || { key: '', name: '' };
    const c = { id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`, key: s.key, name: s.name, field, wrong: String(wrong).slice(0, 200), right, h: hash(text), date: Date.now(), rule: null };
    if (field === 'amount') {
      const v = parseMoney(right);
      if (v == null) return { ok: false, error: 'Bitte gib einen Betrag an, z. B. 98,90.' };
      c.value = v;
      const str = v.toLocaleString('de-DE', { minimumFractionDigits: 2 });
      const at = text.indexOf(str) >= 0 ? text.indexOf(str) : text.indexOf(String(v).replace('.', ','));
      if (at >= 0) {
        // das letzte ganze Stichwort vor dem Betrag („Gesamtbetrag“, nicht „Teilbetrag“)
        const win = text.slice(Math.max(0, at - 40), at);
        const all = [...win.matchAll(new RegExp(`(?<![\\p{L}])${AMOUNT_WORDS.source}`, 'giu'))];
        if (all.length) c.rule = { word: all[all.length - 1][1].toLowerCase() };
      }
    } else if (field === 'deadline') {
      const day = parseDay(right);
      if (!day || isNaN(day)) return { ok: false, error: 'Bitte gib ein Datum an, z. B. 15.11.2026.' };
      c.iso = iso(day);
      const w0 = parseDay(wrong); if (w0 && !isNaN(w0)) c.wrongIso = iso(w0);
      const at = findDate(text, day);
      if (at) { const w = wordsBefore(text, at.index); if (w.length >= 3) c.rule = { before: w }; }
    } else if (field === 'kind' || field === 'sender') c.rule = { value: right };
    else c.rule = { hint: right };
    const d = load();
    d.corrections.push(c);
    d.corrections = d.corrections.slice(-MAX_CORRECTIONS);
    save(d);
    return { ok: true, correction: c, explain: explain(c) };
  }

  function explain(c, name = c.name) {
    const who = name ? `Bei ${name}` : 'Bei diesem Absender';
    if (c.field === 'amount') return c.rule ? `${who} zählt der Betrag nach „${c.rule.word}“.` : `Betrag korrigiert auf ${money(c.value)}.`;
    if (c.field === 'deadline') return c.rule ? `${who} zählt das Datum nach „${c.rule.before}“.` : 'Frist korrigiert.';
    if (c.field === 'kind') return `${who} ist es ein „${c.right}“.`;
    if (c.field === 'sender') return `Absender heißt „${c.right}“.`;
    return `${who} merke ich mir: „${c.right.slice(0, 80)}${c.right.length > 80 ? '…' : ''}“`;
  }

  /** Gelerntes auf einen neuen Brief anwenden. Liefert { letter, learned: [Sätze], name } */
  function apply(text, letter) {
    text = String(text || '');
    const s = facts.senderOf(text);
    const d = load();
    const h = hash(text);
    const mine = d.corrections.filter((c) => c.h === h || (s && c.key && c.key === s.key));
    if (!mine.length) return { letter, learned: [], name: s ? nameFor(d, s) : null };
    const L = letter ? JSON.parse(JSON.stringify(letter)) : null;
    const learned = [];
    const name = s ? nameFor(d, s) : null;
    // je Feld gilt die jüngste Korrektur; die für genau diesen Brief vor der allgemeinen Regel
    const latest = (field) => mine.filter((c) => c.field === field).sort((a, b) => (a.h === h) - (b.h === h) || a.date - b.date).pop();
    const kind = latest('kind');
    if (L && kind) { L.label = kind.right; learned.push(explain(kind, name)); }
    const amt = latest('amount');
    if (L && amt) {
      let found = null;
      if (amt.h === h) found = { value: amt.value, text: money(amt.value).replace('.', ','), label: L.amount?.label || '' };
      else if (amt.rule) {
        const m = text.match(new RegExp(`(?<![\\p{L}])${esc(amt.rule.word)}[^\\d\\n]{0,40}(\\d{1,3}(?:\\.\\d{3})*,\\d{2}|\\d+(?:,\\d{2})?)\\s?(?:€|eur|euro)`, 'iu'));
        if (m) { const v = Number(m[1].replace(/\./g, '').replace(',', '.')); found = { value: v, text: `${m[1]} €`, label: amt.rule.word }; }
      }
      if (found && (!L.amount || Math.abs(L.amount.value - found.value) > 0.001)) { L.amount = found; learned.push(explain(amt, name)); }
    }
    const dl = latest('deadline');
    if (L && dl) {
      let day = null, sentence = '';
      if (dl.h === h) { day = parseDay(dl.iso); sentence = `Frist (von dir korrigiert): ${dl.right}`; }
      else if (dl.rule) {
        const m = text.match(new RegExp(`${dl.rule.before.split(' ').map(esc).join('[^\\p{L}]+')}[^\\d\\n]{0,15}((\\d{1,2})\\.\\s?(\\d{1,2})\\.\\s?(\\d{2,4})|\\d{1,2}\\.\\s*\\p{L}+\\s+\\d{4})`, 'iu'));
        if (m) { day = parseDay(m[1]); sentence = m[0]; }
      }
      if (day && !isNaN(day)) {
        const key = iso(day);
        if (L.deadlines?.[0]?.iso !== key) {
          L.deadlines = [{ iso: key, sentence, deadline: true, learned: true }, ...(L.deadlines || []).filter((x) => x.iso !== key && x.iso !== dl.wrongIso)];
          learned.push(explain(dl, name));
        }
      }
    }
    return { letter: L, learned, name };
  }

  /** Hinweise für die KI aus früheren Korrekturen (Aufgabe, Zusammenfassung) zu diesem Absender */
  function hints(text) {
    const s = facts.senderOf(text);
    if (!s) return '';
    const d = load();
    const list = d.corrections.filter((c) => c.key === s.key && (c.field === 'task' || c.field === 'summary')).slice(-3);
    const p = d.senders[s.key];
    const kinds = [...new Set((p?.letters || []).map((l) => l.kind).filter(Boolean))];
    const lines = [];
    if (kinds.length) lines.push(`Frühere Briefe dieses Absenders (${nameFor(d, s)}) waren: ${kinds.join(', ')}.`);
    for (const c of list) lines.push(`Der Nutzer hat früher korrigiert (${c.field === 'task' ? 'Aufgabe' : 'Zusammenfassung'}): „${c.right}“. Beachte das, wenn es auch hier passt.`);
    return lines.join('\n');
  }

  function feedback(good) { const d = load(); d.feedback[good ? 'up' : 'down'] = (d.feedback[good ? 'up' : 'down'] || 0) + 1; save(d); }

  /** Für die Einstellungen: Zahlen, Absender, Korrekturen */
  function list() {
    const d = load();
    const senders = Object.entries(d.senders).map(([key, p]) => {
      const rec = p.letters.filter((l) => l.recurring != null);
      const kinds = [...new Set(p.letters.map((l) => l.kind).filter(Boolean))];
      return {
        key, name: d.corrections.slice().reverse().find((c) => c.key === key && c.field === 'sender')?.right || p.name, count: p.letters.length, kinds,
        recurring: rec.length >= 2 && rec[0].recurring !== rec[rec.length - 1].recurring ? `${money(rec[0].recurring)} → ${money(rec[rec.length - 1].recurring)}` : rec.length ? money(rec[rec.length - 1].recurring) : '',
        corrections: d.corrections.filter((c) => c.key === key).length, last: Math.max(...p.letters.map((l) => l.date)),
      };
    }).sort((a, b) => b.last - a.last);
    const letters = senders.reduce((n, s) => n + s.count, 0);
    return {
      stats: { letters, senders: senders.length, corrections: d.corrections.length, up: d.feedback.up || 0, down: d.feedback.down || 0 },
      senders, corrections: d.corrections.slice().reverse().map((c) => ({ id: c.id, field: c.field, name: c.name, right: c.right, wrong: c.wrong, date: c.date, explain: explain(c) })),
    };
  }
  function forgetSender(key) { const d = load(); delete d.senders[key]; d.corrections = d.corrections.filter((c) => c.key !== key); save(d); }
  function forgetCorrection(id) { const d = load(); d.corrections = d.corrections.filter((c) => c.id !== id); save(d); }
  function forgetAll() { try { fs.unlinkSync(file); } catch {} }
  const exportData = () => JSON.stringify(load(), null, 2);
  function importData(json) {
    const x = JSON.parse(json);
    if (!x || typeof x !== 'object' || !x.senders || !Array.isArray(x.corrections)) throw new Error('Keine Silkreader-Lerndatei');
    const d = load();
    for (const [k, p] of Object.entries(x.senders)) if (!d.senders[k]) d.senders[k] = p;
    const ids = new Set(d.corrections.map((c) => c.id));
    d.corrections.push(...x.corrections.filter((c) => !ids.has(c.id) && FIELDS.includes(c.field)));
    save(d);
  }
  return { observe, context, correct, apply, hints, feedback, list, forgetSender, forgetCorrection, forgetAll, exportData, importData };
}

module.exports = { createLearner, hash };
