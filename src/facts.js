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
  /**
   * Prüft alle Zahlen im Ergebnis gegen den Originaltext.
   * figures[i].check: 'ok' (steht im Text), 'calc' (abgeleitet/gerechnet), 'missing' (nicht gefunden)
   * unsure: Liste von Zahlen aus Stichpunkten/Kernaussagen, die nicht im Text stehen
   */
  function verifyResult(result, text) {
    const src = numbersIn(text);
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
    const unsure = [...new Set(claims.flatMap((c) => unknownNumbers(c, src)))];
    // Erkenntnisse dürfen rechnen (Quoten, Verhältnisse) – nur Stichpunkte/Kernaussagen gelten als unsicher
    const strict = [result.summary, ...(result.key_points || [])];
    const unsureStrict = [...new Set(strict.flatMap((c) => unknownNumbers(c, src)))];
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
  function findDeadlines(text, { now = new Date(), max = 4 } = {}) {
    text = String(text || '');
    const today = new Date(now); today.setHours(0, 0, 0, 0);
    const base = letterDate(text);
    const out = [];
    const push = (date, start, end, extra = {}) => {
      if (isNaN(date) || date < today || date.getFullYear() > today.getFullYear() + 5) return;
      const sentence = sentenceAround(text, start, end);
      const key = iso(date);
      if (base && key === iso(base) && !DEADLINE_WORDS.test(sentence)) return; // Briefdatum selbst ist keine Frist
      if (out.some((o) => o.iso === key)) return;
      out.push({ iso: key, date, sentence, deadline: DEADLINE_WORDS.test(sentence), ...extra });
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
    ['rechnung', 'Rechnung', /\b(rechnung(snummer)?|rechnungsbetrag|zahlbar|invoice|gesamtbetrag|zu zahlen)\b/i],
    ['bescheid', 'Bescheid', /\b(bescheid|rechtsbehelfsbelehrung|widerspruch|einspruch|aktenzeichen|finanzamt|jobcenter|agentur für arbeit|behörde|bußgeld|anhörung|steuernummer|familienkasse|krankenkasse|rentenversicherung|landratsamt|bürgeramt)\b/i],
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
    if (!best || (best.n < 2 && !looksLikeLetter)) return null;
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
    const PRIO = /(gesamt|zu zahlen|offen|nachzahlung|rechnungsbetrag|forderung|amount due|total)/;
    const main = amounts.find((a) => PRIO.test(a.label)) || amounts.slice().sort((a, b) => b.value - a.value)[0] || null;
    const ibans = [...new Set([...text.matchAll(/\b[A-Z]{2}\d{2}(?:\s?[A-Z0-9]{4}){3,7}(?:\s?[A-Z0-9]{1,3})?\b/g)].map((m) => m[0].trim()).filter(ibanValid))];
    const ref = (re) => (text.match(re) || [])[1]?.trim() || '';
    const refs = [
      ['Verwendungszweck', ref(/verwendungszweck\s*:?\s*([^\n]{3,60})/i)],
      ['Aktenzeichen', ref(/(?:aktenzeichen|az\.|geschäftszeichen|unser zeichen)\s*:?\s*([A-Z0-9][^\n,;]{2,40})/i)],
      ['Rechnungsnummer', ref(/rechnungs(?:-?nr\.?|nummer)\s*:?\s*([A-Z0-9][A-Z0-9\-/]{2,30})/i)],
      ['Kundennummer', ref(/kunden(?:-?nr\.?|nummer)\s*:?\s*([A-Z0-9][A-Z0-9\-/]{2,30})/i)],
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

  const api = { numbersIn, unknownNumbers, verifyResult, findDeadlines, letterDate, letterFacts, ibanValid };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SilkFacts = api;
})(typeof window !== 'undefined' ? window : globalThis);
