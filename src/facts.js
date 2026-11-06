// Feste Regeln statt KI: Zahlen gegen den Originaltext prüfen, Fristen finden, Briefe (Rechnung, Bescheid,
// Vertrag …) erkennen und Zahlungsangaben herausziehen. Läuft im Hauptprozess und im Fenster (window.SilkFacts).
(function (root) {
  const MONTHS = { januar: 1, jan: 1, februar: 2, feb: 2, märz: 3, maerz: 3, mär: 3, april: 4, apr: 4, mai: 5, juni: 6, jun: 6, juli: 7, jul: 7, august: 8, aug: 8, september: 9, sep: 9, sept: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12,
    january: 1, february: 2, march: 3, may: 5, june: 6, july: 7, october: 10, december: 12 };
  const MONTH_RE = 'Januar|Februar|März|Maerz|April|Mai|Juni|Juli|August|September|Oktober|November|Dezember|January|February|March|May|June|July|October|December';

  // ---------- Zahlen prüfen ----------
  // „1.140“, „61,8“, „412“, „15.11.2026“ → vergleichbare Schlüssel. Datumsteile werden einzeln erfasst.
  const SCALE = { tsd: 1e3, tausend: 1e3, mio: 1e6, million: 1e6, millionen: 1e6, mrd: 1e9, milliarde: 1e9, milliarden: 1e9, bn: 1e9, billion: 1e9, k: 1e3, m: 1e6 };
  function numbersIn(text) {
    const out = new Set();
    const s = String(text || '');
    const re = /(\d{1,3}(?:,\d{3}){2,}|\d{1,3}(?:[.\s ]\d{3})+|\d+)(?:[,.](\d+))?(?:\s*(tsd|tausend|mio|millionen|million|mrd|milliarden|milliarde|bn|billion)\b\.?)?/gi;
    let m;
    while ((m = re.exec(s))) {
      const int = m[1].replace(/[.,\s ]/g, '');
      const val = Number(`${int}${m[2] ? `.${m[2]}` : ''}`);
      if (!isFinite(val)) continue;
      out.add(String(val));
      if (m[2]) { out.add(int); out.add(m[2].replace(/^0+(?=\d)/, '')); } // „15.11.“ ist auch 15 und 11
      const scale = m[3] ? SCALE[m[3].toLowerCase()] : 0;
      if (scale) out.add(String(Math.round(val * scale)));
    }
    // Datumsangaben zusätzlich als Tag/Monat/Jahr
    for (const d of s.matchAll(/(\d{1,2})\.\s?(\d{1,2})\.\s?(\d{2,4})?/g)) { out.add(String(+d[1])); out.add(String(+d[2])); if (d[3]) out.add(String(+d[3])); }
    return out;
  }
  // Zahlen, die so nicht im Text stehen (kleine Zahlen bis 10 werden nicht geprüft – „3 Punkte“, „2 Seiten“ …)
  function unknownNumbers(claim, sourceNums) {
    const bad = [];
    const s = String(claim || '');
    const re = /(\d{1,3}(?:,\d{3}){2,}|\d{1,3}(?:[.\s ]\d{3})+|\d+)(?:[,.](\d+))?(?:\s*(tsd|tausend|mio|millionen|million|mrd|milliarden|milliarde|bn|billion)\b\.?)?/gi;
    let m;
    while ((m = re.exec(s))) {
      const int = m[1].replace(/[.,\s ]/g, '');
      const val = Number(`${int}${m[2] ? `.${m[2]}` : ''}`);
      if (!isFinite(val) || val <= 10) continue;
      const scale = m[3] ? SCALE[m[3].toLowerCase()] : 0;
      const ok = sourceNums.has(String(val)) || (scale && sourceNums.has(String(Math.round(val * scale))))
        || (m[2] && sourceNums.has(int) && sourceNums.has(m[2].replace(/^0+(?=\d)/, '')));
      if (!ok) bad.push(m[0].trim());
    }
    return bad;
  }

  // ---------- Daten, Fristen und kleine Beträge prüfen ----------
  // Zahlenprüfung allein übersieht: ein Datum aus Teilen anderer Daten (22.11. statt 05.11.), eine andere Frist
  // („4 Wochen“ statt „4 Tage“) oder einen kleinen Betrag („3 €“). Diese drei Arten prüft factKeys/unknownFacts.
  const NUMWORDS = { ein: 1, eine: 1, einem: 1, einen: 1, einer: 1, zwei: 2, drei: 3, vier: 4, fünf: 5, sechs: 6, sieben: 7, acht: 8, neun: 9, zehn: 10, elf: 11, zwölf: 12, vierzehn: 14 };
  const DATE_RE = new RegExp(`(\\d{1,2})\\.\\s?(?:(\\d{1,2})\\.\\s?|\\s*(${MONTH_RE})\\b\\s*)(\\d{4})?`, 'gi');
  const SPAN_RE = /\b(\d{1,3}|ein|eine|einem|einen|einer|zwei|drei|vier|fünf|sechs|sieben|acht|neun|zehn|elf|zwölf|vierzehn)\s+(?:werk|kalender)?(tag|woche|monat|jahr)\w*/gi;
  const SMALL_RE = /(?<![\d.,])(\d{1,2}(?:,\d+)?)\s?(€|euro\b|eur\b|%|prozent\b)/gi;
  const dateKeys = (s) => [...String(s).matchAll(DATE_RE)].map((m) => {
    const mo = m[2] ? +m[2] : MONTHS[m[3].toLowerCase()];
    return { text: m[0].trim(), dm: `${+m[1]}.${mo}`, dmy: m[4] ? `${+m[1]}.${mo}.${m[4]}` : null };
  }).filter((d) => !d.dm.endsWith('.undefined') && +d.dm.split('.')[1] <= 12);
  const spanKeys = (s) => [...String(s).matchAll(SPAN_RE)].map((m) => {
    const n = NUMWORDS[m[1].toLowerCase()] || +m[1], u = m[2].toLowerCase();
    return { text: m[0].trim(), key: `${n}${u}`, eq: u === 'tag' ? `${n}d` : u === 'woche' ? `${n * 7}d` : u === 'monat' ? `${n}m` : `${n * 12}m` };
  });
  const smallKeys = (s) => [...String(s).matchAll(SMALL_RE)].map((m) => ({ text: m[0].trim(), key: `${m[1].replace(',', '.')}${/%|proz/i.test(m[2]) ? '%' : '€'}` }));
  /** Alles, was im Originaltext an Daten, Fristen und kleinen Beträgen steht (einmal pro Text bauen) */
  function factKeys(text) {
    const t = String(text || '');
    const dates = new Set(), spans = new Set(), small = new Set();
    for (const d of dateKeys(t)) { dates.add(d.dm); if (d.dmy) dates.add(d.dmy); }
    const base = letterDate(t); // „innerhalb von 4 Wochen“ ergibt ein errechnetes Datum – das darf die KI nennen
    if (base) for (const d of findDeadlines(t, { now: base, max: 20 })) { const x = d.date; dates.add(`${x.getDate()}.${x.getMonth() + 1}`); dates.add(`${x.getDate()}.${x.getMonth() + 1}.${x.getFullYear()}`); }
    for (const x of spanKeys(t)) { spans.add(x.key); spans.add(x.eq); }
    for (const x of smallKeys(t)) small.add(x.key);
    return { dates, spans, small };
  }
  /** Daten, Fristen und kleine Beträge im Satz der KI, die so nicht im Text stehen */
  function unknownFacts(claim, keys) {
    const bad = [];
    for (const d of dateKeys(claim)) if (!(d.dmy ? keys.dates.has(d.dmy) : keys.dates.has(d.dm))) bad.push(d.text);
    for (const x of spanKeys(claim)) if (!keys.spans.has(x.key) && !keys.spans.has(x.eq)) bad.push(x.text);
    for (const x of smallKeys(claim)) if (!keys.small.has(x.key)) bad.push(x.text);
    return bad;
  }

  /**
   * Prüft alle Zahlen im Ergebnis gegen den Originaltext.
   * figures[i].check: 'ok' (steht im Text), 'calc' (abgeleitet/gerechnet), 'missing' (nicht gefunden)
   * unsure: Liste von Zahlen aus Stichpunkten/Kernaussagen, die nicht im Text stehen
   */
  function verifyResult(result, text) {
    const src = numbersIn(text);
    const keys = factKeys(text);
    const flat = String(text || '').replace(/\s+/g, ' ').toLowerCase();
    const dollars = /\$|usd|dollar/i.test(text);
    const figures = (result.figures || []).map((f) => {
      const nums = unknownNumbers(f.value, src);
      const quoteOk = f.quote && flat.includes(String(f.quote).replace(/\s+/g, ' ').toLowerCase().trim());
      const hasNum = /\d{2,}/.test(f.value);
      let check = 'ok';
      if ((hasNum && nums.length) || (/\$/.test(f.value) && !dollars)) check = quoteOk ? 'calc' : 'missing';
      // Kleine Modelle schreiben Werte gern um („$412,000,000,000“) – steht die Fundstelle wörtlich im Text,
      // wird der Wert von dort übernommen
      if (check !== 'ok' && quoteOk) {
        const fromQuote = String(f.quote).match(/[-–+]?\d[\d.,]*(?:\s?(?:Mio\.?|Mrd\.?|Millionen|Milliarden|Tsd\.?))?(?:\s?(?:€|Euro|EUR|%|Prozent|\$|Dollar))?/);
        if (fromQuote) return { ...f, value: fromQuote[0].trim(), check: 'ok' };
      }
      return { ...f, check };
    });
    const claims = [result.summary, ...(result.key_points || []), ...(result.findings || []).map((x) => `${x.title} ${x.detail}`)];
    // bestätigte Fristen („14 Tage“ für „zwei Wochen“) nicht noch einmal als Zahl bemängeln
    const bad = (c) => [...unknownNumbers(spanKeys(c).filter((x) => keys.spans.has(x.key) || keys.spans.has(x.eq)).reduce((a, x) => a.replace(x.text, ''), String(c || '')), src), ...unknownFacts(c, keys)];
    const unsure = [...new Set(claims.flatMap(bad))];
    // Erkenntnisse dürfen rechnen (Quoten, Verhältnisse) – nur Stichpunkte/Kernaussagen gelten als unsicher
    const strict = [result.summary, ...(result.key_points || [])];
    const unsureStrict = [...new Set(strict.flatMap(bad))];
    return { ...result, figures, checks: { unsure: unsureStrict, calc: unsure.filter((u) => !unsureStrict.includes(u)) } };
  }

  // ---------- Fristen ----------
  function sentenceAround(text, start, end) {
    const from = Math.max(text.lastIndexOf('.', start - 2) + 1, text.lastIndexOf('\n', start - 1) + 1, start - 140);
    let to = text.indexOf('.', end + 1);
    to = Math.min(text.length, to < 0 ? text.length : to + 1, end + 170);
    const nl = text.indexOf('\n', end); if (nl >= 0 && nl < to) to = nl;
    return text.slice(from, to).replace(/\s+/g, ' ').trim();
  }
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const DEADLINE_WORDS = /(bis|spätestens|frist|fällig|zahlbar|binnen|innerhalb|einzureichen|widerspruch|einspruch|kündig|zahlen|überweisen|vorlegen|melden|termin|until|by|due|deadline|before|no later)/i;
  // Streng (für Texte, die kein Brief sind): „bis 2027“ oder „by 3 March“ in Artikeln ist kein Termin
  const DEADLINE_STRICT = /(termin|appointment|spätestens|frist|fällig|zahlbar|binnen|innerhalb|einzureichen|no later|deadline|\bdue\b)/i;
  /** Die KI nennt die Art des Textes: Artikel, Nachricht, Bericht … enthalten Daten, aber keine Termine für den Leser */
  const narrative = (docType) => /(artikel|article|wiki|nachricht|news|bericht|report|studie|blog|lexikon|essay|chronik|biograf|geschichte|buch|book)/i.test(String(docType || ''));
  /** Briefdatum: „Berlin, 3. Oktober 2026“, „Datum: 03.10.2026“ – sonst null */
  function letterDate(text) {
    const head = String(text || '').slice(0, 1500);
    const m = head.match(new RegExp(`(?:datum|date|vom|,)\\s*:?\\s*(\\d{1,2})\\.\\s?(?:(\\d{1,2})\\.\\s?|\\s*(${MONTH_RE})\\s+)(\\d{4})`, 'i'));
    if (!m) return null;
    const d = new Date(+m[4], (m[2] ? +m[2] : MONTHS[m[3].toLowerCase()]) - 1, +m[1]);
    return isNaN(d) ? null : d;
  }
  /**
   * Fristen und Termine im Text: feste Daten („bis zum 15.11.2026“, „15. November“) und relative
   * („innerhalb von 4 Wochen“, „binnen 14 Tagen“ – gerechnet ab Briefdatum, sonst ab heute).
   */
  function findDeadlines(text, { now = new Date(), max = 4, strict = false } = {}) {
    text = String(text || '');
    const WORDS_RE = strict ? DEADLINE_STRICT : DEADLINE_WORDS;
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const base = letterDate(text);
    const out = [];
    const push = (date, start, end, extra = {}) => {
      if (isNaN(date) || date < today || date.getFullYear() > today.getFullYear() + 5) return;
      const sentence = sentenceAround(text, start, end);
      const key = iso(date);
      if (base && key === iso(base) && !WORDS_RE.test(sentence)) return; // Briefdatum selbst ist keine Frist
      if (out.some((o) => o.iso === key)) return;
      out.push({ iso: key, date, sentence, deadline: WORDS_RE.test(sentence), ...extra });
    };
    // feste Daten (mit oder ohne Jahr)
    const re = new RegExp(`(\\d{1,2})\\.\\s?(?:(\\d{1,2})\\.\\s?|\\s*(${MONTH_RE})\\b\\s*)(\\d{4}|\\d{2}(?!\\d))?|(\\d{4})-(\\d{2})-(\\d{2})`, 'gi');
    let m;
    while ((m = re.exec(text)) && out.length < 20) {
      let d, mo, y;
      if (m[5]) { y = +m[5]; mo = +m[6]; d = +m[7]; }
      else {
        d = +m[1]; mo = m[2] ? +m[2] : MONTHS[m[3].toLowerCase()];
        if (m[4]) { y = +m[4]; if (y < 100) y += 2000; }
        else {
          // ohne Jahr nur, wenn es nach einer Frist klingt („bis zum 15.11.“) – sonst sind es oft Seiten- oder Versionsnummern
          if (!m[3] && !/(bis|zum|am|spätestens|fällig|vom)\s*(zum\s*)?$/i.test(text.slice(Math.max(0, m.index - 20), m.index))) continue;
          y = (base || today).getFullYear();
          if (new Date(y, mo - 1, d) < (base || today)) y++;
        }
      }
      if (!mo || mo > 12 || d > 31) continue;
      const date = new Date(y, mo - 1, d);
      if (date.getDate() !== d) continue;
      push(date, m.index, m.index + m[0].length);
    }
    // relative Fristen
    const rel = /(innerhalb|binnen|within)\s+(?:von\s+)?(\d{1,3}|einem|einer|zwei|drei|vier|sechs|one|two|three|four)\s+(tag|tage|tagen|woche|wochen|monat|monaten|monate|day|days|week|weeks|month|months)\b/gi;
    const WORDS = { einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, sechs: 6, one: 1, two: 2, three: 3, four: 4 };
    while ((m = rel.exec(text))) {
      const n = WORDS[m[2].toLowerCase()] || +m[2];
      const unit = m[3].toLowerCase();
      const date = new Date(base || today);
      if (/^(tag|day)/.test(unit)) date.setDate(date.getDate() + n);
      else if (/^(woche|week)/.test(unit)) date.setDate(date.getDate() + n * 7);
      else date.setMonth(date.getMonth() + n);
      push(date, m.index, m.index + m[0].length, { relative: true, fromLetter: !!base });
    }
    // Fristen zuerst, dann nach Datum
    return out.sort((a, b) => (b.deadline - a.deadline) || (a.date - b.date)).slice(0, max).sort((a, b) => a.date - b.date);
  }

  // ---------- Briefe ----------
  function ibanValid(raw) {
    const s = raw.replace(/\s+/g, '').toUpperCase();
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{10,30}$/.test(s)) return false;
    const r = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
    let mod = 0;
    for (const ch of r) mod = (mod * 10 + Number(ch)) % 97;
    return mod === 1;
  }
  const KINDS = [
    ['mahnung', 'Mahnung', /\b(mahnung|zahlungserinnerung|mahngebühr|letzte erinnerung|inkasso)\b/i],
    ['rechnung', 'Rechnung', /\b(rechnung(snummer)?|rechnungsbetrag|zahlbar|invoice|gesamtbetrag|zu zahlen|zahlungsaufforderung|rundfunkbeitrag|beitragsnummer|abschlagsrechnung)\b/i],
    ['bescheid', 'Bescheid', /\b(bescheid|rechtsbehelfsbelehrung|widerspruch|einspruch|aktenzeichen|finanzamt|jobcenter|agentur für arbeit|behörde|bußgeld|anhörung|steuernummer|familienkasse|krankenkasse|gesundheitskasse|pflegekasse|rentenversicherung|landratsamt|bürgeramt|beitragsbescheid|bußgeldstelle|verwarnungsgeld)\b/i],
    ['vertrag', 'Vertrag', /\b(vertrag|laufzeit|kündigungsfrist|vertragspartner|allgemeine geschäftsbedingungen|agb|mietvertrag|arbeitsvertrag)\b/i],
    ['kuendigung', 'Kündigung', /\b(kündigung|kündigen hiermit|kündigungsbestätigung)\b/i],
  ];
  /** Ist das ein Brief/Schreiben? Liefert Art, Beträge, IBAN, Zeichen, Fristen – oder null */
  function letterFacts(text, opts = {}) {
    text = String(text || '');
    if (text.length < 120) return null;
    const scores = KINDS.map(([id, label, re]) => ({ id, label, n: (text.match(new RegExp(re.source, 'gi')) || []).length }));
    const best = scores.filter((s) => s.n).sort((a, b) => b.n - a.n)[0];
    const looksLikeLetter = /\b(sehr geehrte|liebe[rs]?\s|guten tag|mit freundlichen grüßen|freundliche grüße|hochachtungsvoll|dear\s|sincerely)\b/i.test(text);
    if (!best && !looksLikeLetter) return null;
    if (best && best.n < 2 && !looksLikeLetter) return null;
    // Beträge mit Zusammenhang („Rechnungsbetrag 129,90 €“)
    const amounts = [];
    for (const m of text.matchAll(/(?:(€|EUR)\s?(\d{1,3}(?:\.\d{3})*(?:,\d{2})?|\d+(?:,\d{2})?)|(\d{1,3}(?:\.\d{3})*,\d{2}|\d+(?:,\d{2})?)\s?(€|EUR|Euro)(?![A-Za-z]))/g)) {
      const raw = m[2] || m[3];
      const value = Number(raw.replace(/\./g, '').replace(',', '.'));
      if (!value) continue;
      const ctx = text.slice(Math.max(0, m.index - 70), m.index).toLowerCase();
      const label = (ctx.match(/(gesamtbetrag|rechnungsbetrag|offener betrag|offene[rn]? (?:forderung|betrag)|zu zahlen(?:der betrag)?|nachzahlung|erstattung|summe|betrag|gebühr|mahngebühr|bußgeld|monatlich|beitrag|miete|guthaben|forderung|total|amount due)[^\n]{0,30}$/) || [])[1] || '';
      amounts.push({ value, text: `${raw} €`, label, index: m.index });
    }
    // Wichtigster Betrag: mit „zu zahlen/gesamt/offen“ markiert, sonst der größte
    // Reihenfolge zählt: „Offener Betrag 148 €“ schlägt „Hauptforderung 89 €“; bei Gleichstand der letzte (Summen stehen unten)
    const PRIO = [/(offen|zu zahlen|gesamt|amount due|total|endbetrag|zahlbetrag)/, /(nachzahlung|rechnungsbetrag)/, /(forderung)/];
    const rank = (a) => { const i = PRIO.findIndex((re) => re.test(a.label)); return i < 0 ? 99 : i; };
    const ranked = amounts.filter((a) => rank(a) < 99).sort((a, b) => rank(a) - rank(b) || b.index - a.index);
    const main = ranked[0] || amounts.slice().sort((a, b) => b.value - a.value)[0] || null;
    if (!best && !main && !findDeadlines(text, opts).some((d) => d.deadline)) return null; // Brief ohne Betrag und Frist: keine Karte
    const ibans = [...new Set([...text.matchAll(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g)].map((m) => m[0].trim()).filter(ibanValid))];
    const ref = (re) => (text.match(re) || [])[1]?.trim() || '';
    const refs = [
      ['Verwendungszweck', ref(/verwendungszweck\s*:?\s*([^\n]{3,60})/i)],
      ['Aktenzeichen', ref(/(?:aktenzeichen|az\.|geschäftszeichen|unser zeichen)\s*:?\s*([A-Z0-9][^\n,;]{2,40})/i)],
      ['Rechnungsnummer', ref(/rechnungs(?:-?nr\.?|nummer)\s*:?\s*([A-Z0-9][A-Z0-9\-/]{2,30}(?: \d{2,6}){0,4})/i)],
      ['Kundennummer', ref(/kunden(?:-?nr\.?|nummer)\s*:?\s*([A-Z0-9][A-Z0-9\-/]{1,30}(?: \d{2,6}){0,4})/i)],
      ['Steuernummer', ref(/steuernummer\s*:?\s*([\d/ ]{8,20})/i)],
    ].filter(([, v], i, all) => v && !all.slice(0, i).some(([, w]) => w === v)).map(([label, value]) => ({ label, value }));
    const recipient = ref(/(?:empfänger|kontoinhaber|zahlungsempfänger)\s*:?\s*([^\n]{3,60})/i);
    const deadlines = findDeadlines(text, opts).filter((d) => d.deadline);
    return {
      kind: best ? best.id : 'brief', label: best ? best.label : 'Brief',
      amount: main ? { value: main.value, text: main.text, label: main.label } : null,
      iban: ibans[0] || '', recipient, refs: refs.slice(0, 3), deadlines,
      canObject: /\b(widerspruch|einspruch|rechtsbehelfsbelehrung)\b/i.test(text),
      // Steuer- und Bußgeldsachen: „Einspruch“, sonst meist „Widerspruch“ – so wie es im Brief steht
      objection: /\beinspruch/i.test(text) && !/\bwiderspruch/i.test(text) ? 'Einspruch' : 'Widerspruch',
    };
  }

  // ---------- Verträge ----------
  const NUMW = { ein: 1, eine: 1, einen: 1, einem: 1, einer: 1, zwei: 2, drei: 3, vier: 4, sechs: 6, zwölf: 12, zwoelf: 12, vierundzwanzig: 24 };
  const num = (x) => NUMW[String(x).toLowerCase()] || Number(x);
  const months = (n, unit) => (/^jahr/i.test(unit) ? n * 12 : /^woche/i.test(unit) ? n / 4.345 : n);
  function parseDate(str) {
    const m = String(str).match(new RegExp(`(\\d{1,2})\\.\\s?(?:(\\d{1,2})\\.\\s?|\\s*(${MONTH_RE})\\s+)(\\d{4})`, 'i'));
    if (!m) return null;
    const d = new Date(+m[4], (m[2] ? +m[2] : MONTHS[m[3].toLowerCase()]) - 1, +m[1]);
    return isNaN(d) ? null : d;
  }
  const addMonths = (d, n) => { const x = new Date(d); const day = x.getDate(); x.setMonth(x.getMonth() + Math.round(n)); if (x.getDate() < day) x.setDate(0); return x; };
  /**
   * Vertrag erkennen: Laufzeit, Beginn, Kündigungsfrist, automatische Verlängerung, Kosten, Preisänderungen.
   * Daraus: Vertragsende und „kündigen spätestens am“. Gibt null zurück, wenn es kein Vertrag ist.
   */
  function contractFacts(text, { now = new Date() } = {}) {
    text = String(text || '');
    const flat = text.replace(/\s+/g, ' ');
    if (!/\b(vertrag|laufzeit|kündigungsfrist|mindestlaufzeit|abonnement|abo\b|tarif|mitgliedschaft)/i.test(flat)) return null;
    const N = '(\\d{1,3}|ein|eine|einen|einem|einer|zwei|drei|vier|sechs|zwölf|zwoelf|vierundzwanzig)';
    const U = '(monat(?:e|en)?|jahr(?:e|en)?|woche(?:n)?)';
    const find = (re) => flat.match(new RegExp(re, 'i'));
    let term = null, notice = null, renew = null, start = null, end = null;
    let m = find(`(?:mindest)?laufzeit[^.]{0,40}?${N}\\s*${U}`) || find(`${N}\\s*${U}\\s*(?:mindest)?laufzeit`) || find(`für (?:die dauer von )?${N}\\s*${U} abgeschlossen`);
    if (m) term = months(num(m[1]), m[2]);
    m = find(`kündigungsfrist[^.]{0,25}?${N}\\s*${U}`) || find(`(?:mit einer frist von|frist von)\\s*${N}\\s*${U}`) || find(`${N}\\s*${U} vor (?:ablauf|ende)`);
    if (m) notice = months(num(m[1]), m[2]);
    m = find(`verlängert sich[^.]{0,40}?(?:um|jeweils um)\\s*(?:weitere\\s*)?${N}\\s*${U}`);
    if (m) renew = { months: months(num(m[1]), m[2]) };
    else if (/verlängert sich[^.]{0,60}(?:auf )?unbestimmte zeit/i.test(flat)) renew = { indefinite: true };
    else if (/verlängert sich (?:automatisch|stillschweigend)/i.test(flat)) renew = { unknown: true };
    m = find('(?:vertragsbeginn|beginn(?: des vertrags)?|ab dem|gültig ab|startet am|beginnt am)\\s*:?\\s*(.{6,30})');
    if (m) start = parseDate(m[1]);
    m = find('(?:vertragsende|endet am|läuft bis|laufzeitende|bis zum)\\s*:?\\s*(.{6,30})');
    if (m) end = parseDate(m[1]);
    if (!end && start && term) end = addMonths(start, term);
    // Kosten: „monatlich 39,99 €“, „39,99 € pro Monat“, „Grundgebühr 9,99 €“
    m = find('(?:monatlich(?:e[rn]?)?\\s*(?:grundgebühr|beitrag|kosten|preis)?|grundgebühr|monatsbeitrag|beitrag)\\s*(?:beträgt|von|:)?\\s*(\\d{1,4}(?:,\\d{2})?)\\s*(?:€|eur|euro)') || find('(\\d{1,4}(?:,\\d{2})?)\\s*(?:€|eur|euro)\\s*(?:pro|im|je|/)\\s*monat');
    const monthly = m ? `${m[1]} €` : '';
    const priceChange = /(preisanpassung|preiserhöhung|preise? (?:anzupassen|zu erhöhen|ändern)|erhöht sich|neuer preis)/i.test(flat);
    if (!term && !notice && !renew && !end) return null;
    const cancelBy = end && notice != null ? addMonths(end, -notice) : null;
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    // Seit 1.3.2022: Verbraucherverträge verlängern sich nach der Mindestlaufzeit nur noch auf unbestimmte Zeit (monatlich kündbar)
    const monthlyAfter = !!(renew && !renew.months) || !!(start && start >= new Date(2022, 2, 1));
    const iso = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : null);
    return {
      term, notice, renew, start: iso(start), end: iso(end), cancelBy: iso(cancelBy),
      cancelPassed: !!(cancelBy && cancelBy < today), monthly, priceChange, monthlyAfter,
    };
  }

  // ---------- 1.22: Absender, wiederkehrende Beträge, Betrug, Unterschrift, Folgen ----------
  const ORG = /\b(gmbh|ag|kg|e\.\s?v\.|se|ug|ohg|mbh|amt|finanzamt|jobcenter|agentur für arbeit|stadtwerke|krankenkasse|aok|barmer|tk|dak|ikk|versicherung|bank|sparkasse|volksbank|kasse|verwaltung|gericht|behörde|stadt|gemeinde|landkreis|rentenversicherung|familienkasse|inkasso|hausverwaltung|vermieter|post|telekom|vodafone|o2|1&1|ewe|eon|e\.on|vattenfall|rundfunk|beitragsservice)\b/i;
  /** Absender eines Briefs (für „3. Brief von …“ und das Lernen): { key, name } oder null */
  function senderOf(text) {
    text = String(text || '');
    const head = text.split(/\b(sehr geehrte|liebe[rs]?\s|guten tag|hallo)\b/i)[0].slice(0, 1200);
    const lines = head.split(/\n+/).map((l) => l.trim().replace(/\s{2,}/g, ' ')).filter((l) => l.length >= 3 && l.length <= 70);
    let name = lines.find((l) => ORG.test(l) && !/^(an|herrn?|frau|z\.\s?hd|empfänger)\b/i.test(l) && !/\d{5}\s/.test(l));
    // Brieffuß / Grußformel: „Ihre Stadtwerke“, „Ihr Finanzamt Musterstadt“
    if (!name) {
      const m = text.match(/(?:mit freundlichen grüßen|freundliche grüße|hochachtungsvoll)[,\s]*\n?\s*(?:ihr[e]?\s+)?([^\n]{3,60})/i);
      if (m && ORG.test(m[1])) name = m[1].trim();
    }
    if (!name) {
      const m = text.match(/(?:kontoinhaber|zahlungsempfänger|empfänger)\s*:?\s*([^\n]{3,60})/i);
      if (m) name = m[1].trim();
    }
    if (!name) return null;
    name = name.replace(/^(ihre?|absender|von)\s*:?\s+/i, '').replace(/[,;|·].*$/, '').replace(/\s*[-–]\s*.*$/, (x) => (ORG.test(x) ? x : '')).trim();
    const key = name.toLowerCase().replace(/\b(gmbh|ag|kg|e\.\s?v\.|se|ug|mbh|co\.?|&)\b/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
    return key.length >= 3 ? { key, name } : null;
  }
  /** Wiederkehrender Betrag (Abschlag, Beitrag, Miete, Rate): der neue/aktuelle Wert, z. B. 92 */
  function recurringAmount(text) {
    const t = String(text || '');
    const re = /(abschlag|abschlagszahlung|monatsbeitrag|beitrag|miete|monatliche rate|rate|vorauszahlung|grundgebühr)[^.\n€]{0,60}?(\d{1,4}(?:\.\d{3})*(?:,\d{1,2})?)\s?(?:€|eur\b|euro)/gi;
    let m, last = null;
    while ((m = re.exec(t))) last = { label: m[1].toLowerCase(), value: Number(m[2].replace(/\./g, '').replace(',', '.')) };
    return last && last.value > 0 && last.value < 100000 ? last : null;
  }
  const COUNTRIES = { DE: 'Deutschland', AT: 'Österreich', CH: 'Schweiz', NL: 'den Niederlanden', LT: 'Litauen', LV: 'Lettland', EE: 'Estland', GB: 'Großbritannien', IE: 'Irland', CY: 'Zypern', MT: 'Malta', BG: 'Bulgarien', RO: 'Rumänien', PL: 'Polen', CZ: 'Tschechien', HU: 'Ungarn', ES: 'Spanien', PT: 'Portugal', FR: 'Frankreich', IT: 'Italien', BE: 'Belgien', LU: 'Luxemburg', GR: 'Griechenland', TR: 'der Türkei', UA: 'der Ukraine', HR: 'Kroatien', SK: 'der Slowakei', SI: 'Slowenien', FI: 'Finnland', SE: 'Schweden', DK: 'Dänemark', NO: 'Norwegen' };
  /** Echtheits-Check: typische Betrugsmerkmale. Liefert { reasons: [...] } ab zwei Merkmalen (oder einem sehr starken), sonst null */
  function scamCheck(text) {
    const t = String(text || '');
    const reasons = [];
    let strong = false;
    const german = /\b(sehr geehrte|bitte|ihr|ihre|zahlung|betrag)\b/i.test(t);
    const ibans = [...t.matchAll(/\b([A-Z]{2})\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g)].map((m) => m[1]).filter((c) => COUNTRIES[c]);
    const foreign = ibans.find((c) => !['DE', 'AT', 'CH'].includes(c));
    if (german && foreign) reasons.push({ id: 'iban', country: foreign, text: `Die IBAN ist aus ${COUNTRIES[foreign]} (${foreign}…), obwohl der Brief auf Deutsch ist.` });
    if (/\b(innerhalb|binnen)\s+(?:von\s+)?(24|48|12|2|3)\s*(stunden|std\.?)\b|\b(sofort|unverzüglich|umgehend)\b[^.]{0,60}\b(sonst|andernfalls|ansonsten)\b|\bheute noch\b/i.test(t))
      reasons.push({ id: 'urgent', text: 'Du sollst sehr schnell zahlen oder handeln – Druck ist ein typisches Merkmal.' });
    if (/\b(gutschein|gutscheinkarte|paysafe(?:card)?|google[\s-]?play[\s-]?karte|itunes|apple[\s-]?karte|steam[\s-]?karte|amazon[\s-]?gutschein|guthabenkarte|prepaid[\s-]?karte)\b/i.test(t) && /\b(zahl|bezahl|begleich|code|kaufen)/i.test(t)) { strong = true; reasons.push({ id: 'gift', text: 'Bezahlt werden soll mit Gutschein- oder Guthabenkarten – das macht keine echte Firma oder Behörde.' }); }
    if (/\b(bitcoin|btc|krypto|kryptowährung|wallet|ethereum|usdt)\b/i.test(t) && /\b(zahl|überweis|send)/i.test(t)) { strong = true; reasons.push({ id: 'crypto', text: 'Bezahlt werden soll mit Kryptowährung.' }); }
    if (/\b(pin|tan|passwort|kennwort|zugangsdaten|kreditkartennummer|cvv|prüfnummer)\b/i.test(t) && /\b(bestätigen|eingeben|angeben|mitteilen|senden|aktualisieren|verifizieren)\b/i.test(t)
      && !/\b(niemals|nie|keinesfalls)\b[^.]{0,80}\b(pin|tan|passwort|kennwort|zugangsdaten)\b/i.test(t)) { strong = true; reasons.push({ id: 'secret', text: 'Du sollst PIN, TAN, Passwort oder Kartendaten angeben – das fragt niemand Seriöses so ab.' }); }
    if (/(klicken sie|tippen sie|folgen sie)[^.]{0,40}\b(link|hier)\b|\bbit\.ly\b|\btinyurl\b|https?:\/\/\S*(?:\.xyz|\.top|\.click|\.info|-paket|-zoll|-verif)/i.test(t)) reasons.push({ id: 'link', text: 'Du sollst auf einen Link klicken.' });
    if (/\b(zollgebühr|zoll[\s-]?gebühren|paket (?:wartet|zurückgehalten|konnte nicht zugestellt))\b/i.test(t) && /\b(zahl|link|klick)/i.test(t)) reasons.push({ id: 'parcel', text: 'Ein Paket soll erst nach einer kleinen Gebühr zugestellt werden – eine bekannte Masche.' });
    if (/\b(gewonnen|gewinner|gewinnspiel|erbschaft)\b/i.test(t) && /\b(gebühr|bearbeitungsgebühr|vorab|zahl)/i.test(t)) { strong = true; reasons.push({ id: 'prize', text: 'Für einen Gewinn oder eine Erbschaft soll vorher gezahlt werden.' }); }
    return reasons.length >= 2 || (strong && reasons.length) ? { reasons } : null;
  }
  /** Unterschrift nötig? { page, where, returnTo } oder null */
  function signatureNeeded(pages) {
    pages = (Array.isArray(pages) ? pages : [String(pages || '')]).map(String);
    const all = pages.join('\n');
    if (!/(unterschreiben|unterzeichnen|unterschrift|eigenhändig|ort,?\s*datum)/i.test(all)) return null;
    if (!/(zurück(?:senden|schicken|geben)|zurück an|einreichen|unterschrieben (?:an|zurück)|senden sie[^.]{0,40}(?:an|zurück)|reichen sie[^.]{0,40}ein|unterschreiben sie|bitte unterschreiben|ort,?\s*datum,?\s*unterschrift)/i.test(all)) return null;
    let page = 0;
    pages.forEach((p, i) => { if (/(ort,?\s*datum|unterschrift|unterschreiben)/i.test(p)) page = i + 1; });
    const where = /ort,?\s*datum,?\s*unterschrift/i.test(all) ? 'Ort, Datum, Unterschrift' : '';
    const m = all.match(/(?:zurück an|senden sie (?:es|ihn|sie|das formular|den antrag|die unterlagen)?\s*(?:bitte\s*)?(?:unterschrieben\s*)?(?:zurück\s*)?an)\s*:?\s*([^\n.]{4,80})/i);
    return { page: pages.length > 1 ? page : 0, where, returnTo: m ? m[1].trim() : '' };
  }
  /** Was passiert, wenn ich nichts tue? Ruhige, allgemeine Hinweise nach Art des Briefs (keine Rechtsberatung) */
  function consequences(kind, text) {
    const t = String(text || '');
    const steps = [];
    let tip = '';
    if (kind === 'mahnung' || kind === 'rechnung') {
      const fee = (t.match(/mahngebühr[^\d]{0,30}(\d+,\d{2})\s?(?:€|eur|euro)/i) || [])[1];
      if (kind === 'rechnung') steps.push('Erst kommt meist eine Zahlungserinnerung oder Mahnung.');
      steps.push(fee ? `Es kommen weitere Mahngebühren dazu (hier schon ${fee} €), dazu Verzugszinsen.` : 'Es können Mahngebühren und Verzugszinsen dazukommen.');
      steps.push('Danach kann die Forderung an ein Inkasso-Büro gehen – das wird deutlich teurer.');
      if (/\b(strom|gas|energie|wasser|stadtwerke)\b/i.test(t)) steps.push('Bei Strom, Gas oder Wasser kann nach mehreren Mahnungen eine Sperre angedroht werden – sie muss vorher angekündigt werden.');
      else if (/\b(miete|vermieter|hausverwaltung)\b/i.test(t)) steps.push('Bei Mietschulden kann der Vermieter nach zwei offenen Monatsmieten kündigen.');
      else steps.push('Zuletzt ist ein gerichtlicher Mahnbescheid möglich.');
      tip = 'Kannst du nicht alles zahlen? Unter „Antworten“ gibt es die Vorlage Ratenzahlung. Ist die Forderung falsch, widersprich schriftlich.';
    } else if (kind === 'bescheid') {
      steps.push('Nach Ablauf der Frist wird der Bescheid bestandskräftig – dann kannst du ihn meist nicht mehr anfechten.');
      if (/(nachzahlung|zu zahlen|erstatten|rückforderung)/i.test(t)) steps.push('Eine geforderte Zahlung wird fällig; danach kommen Säumniszuschläge dazu.');
      if (/(mitwirkung|unterlagen|nachweise|vorlegen|einreichen)/i.test(t)) steps.push('Fehlen angeforderte Unterlagen, können Leistungen gekürzt oder gestoppt werden.');
      tip = 'Ist etwas unklar, ruf die Stelle an oder schreib eine Rückfrage – Beratungsstellen helfen oft kostenlos.';
    } else if (/mahnbescheid/i.test(t)) {
      steps.push('Gegen einen gerichtlichen Mahnbescheid kannst du innerhalb von 2 Wochen Widerspruch einlegen.');
      steps.push('Sonst folgt ein Vollstreckungsbescheid – dann kann gepfändet werden.');
    }
    if (/mahnbescheid/i.test(t) && kind !== 'bescheid' && !steps.some((s) => /2 Wochen/.test(s))) steps.unshift('Wichtig: Gegen einen gerichtlichen Mahnbescheid hast du nur 2 Wochen für einen Widerspruch.');
    return steps.length ? { steps, tip } : null;
  }

  /** Vorlesen: Anfang des vorigen/nächsten Satzes (dir -1/+1) ab Stelle `at`; kurz nach Satzanfang springt „zurück“ zum vorigen */
  function sentenceJump(text, at, dir) {
    const t = String(text || '');
    const starts = [0, ...[...t.matchAll(/[.!?…:]["“”)]?\s+(?=\S)/g)].map((m) => m.index + m[0].length)];
    if (dir > 0) return starts.find((x) => x > at) ?? null;
    const cur = starts.filter((x) => x <= at).pop() ?? 0;
    return at - cur > 12 ? cur : (starts.filter((x) => x < cur).pop() ?? 0);
  }
  const api = { COUNTRIES, sentenceJump, senderOf, recurringAmount, scamCheck, signatureNeeded, consequences, parseDate, contractFacts, numbersIn, unknownNumbers, verifyResult, findDeadlines, narrative, letterDate, letterFacts, ibanValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SilkFacts = api;
})(typeof window !== 'undefined' ? window : globalThis);
