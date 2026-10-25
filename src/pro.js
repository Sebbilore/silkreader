// Silkreader Pro – vorbereitet, aber noch AUS: Solange ENABLED false ist, ist alles für alle frei.
// Zum Einschalten:
//   1. Im Partner Center unter „Add-ons“ ein dauerhaftes Add-on (Durable) mit der Produkt-ID unten anlegen.
//   2. ENABLED auf true setzen und licensed() an die Windows-Store-Lizenzprüfung anbinden
//      (Windows.Services.Store.StoreContext → GetAppLicenseAsync().AddOnLicenses[ADDON_ID].IsActive).
//   3. Die Kaufseite mit purchase() öffnen.
// Die GitHub-Version bleibt frei (dort gibt es keinen Store-Kauf).

const ENABLED = false;
const ADDON_ID = 'silkreader.pro';

// Was Pro freischaltet (Gratis: markieren, zusammenfassen, Fragen stellen, Notizbuch, Fristen)
const FEATURES = {
  translate: 'Übersetzen',
  simplify: 'Einfach erklären',
  reply: 'Antworten schreiben',
  letter: 'Brief-Hilfe (Was muss ich tun?, IBAN, Widerspruch)',
  ocr: 'Gescannte PDFs und Bilder lesen',
  quality: 'Gründliches KI-Modell',
};

let cached = null;
/** Hat der Nutzer Pro gekauft? (später: Store-Lizenz, zwischengespeichert) */
function licensed() {
  if (cached !== null) return cached;
  cached = false;
  return cached;
}
/** Darf diese Funktion benutzt werden? */
function allowed(feature, { store = !!process.windowsStore } = {}) {
  if (!ENABLED || !store || !FEATURES[feature]) return true;
  return licensed();
}

module.exports = { ENABLED, ADDON_ID, FEATURES, allowed, licensed };
