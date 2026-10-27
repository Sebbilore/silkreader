// Silkreader Pro: Was ist frei, was gehört zu Pro, und ist Pro freigeschaltet?
// Freischalten geht auf zwei Wegen:
//   1. Pro-Code (z. B. für Freunde, Gewinnspiele, Creator): offline geprüft, mit Silkreaders öffentlichem Schlüssel signiert.
//      Erzeugt werden Codes nur mit dem privaten Schlüssel (GitHub-Workflow „Pro-Codes“).
//   2. Kauf im Microsoft Store: dauerhaftes Add-on. Die Lizenz fragt die App über Windows ab (nur in der Store-Version).
//      Gratis-Codes von Microsoft („Promotional codes“ im Partner Center) schalten dasselbe Add-on frei.
const crypto = require('crypto');

const ENABLED = true;
// Im Partner Center unter Add-ons: Produkt-ID (selbst gewählt) und Store-ID (9…, nach dem Anlegen sichtbar)
const ADDON_ID = 'silkreader.pro';
const ADDON_STORE_ID = ''; // ← nach dem Anlegen des Add-ons eintragen, sonst ist der Kaufen-Knopf aus
const PUBLIC_KEY = 'MCowBQYDK2VwAyEA6ZTFtnubZpFBiwrO2JRO5i0yZKh7xYDq0fKTdukrd4s=';

// Was Pro freischaltet
const FEATURES = {
  translate: 'Übersetzen',
  simplify: 'Einfach erklären',
  reply: 'Antworten schreiben',
  letter: 'Brief-Hilfe (Was muss ich tun?, IBAN, Widerspruch)',
  ocr: 'Gescannte PDFs und Bilder lesen',
  quality: 'Gründliches KI-Modell',
  contract: 'Vertrags-Check mit Kündigungs-Erinnerung',
  templates: 'Antwort-Vorlagen',
  askNotebook: 'Frag dein Notizbuch',
  folders: 'Mappen',
};

// ---------- Pro-Codes ----------
// Aufbau (vor der Signatur, 8 Byte): Version 1 | Art (1 = Pro) | Nummer (4 Byte) | gültig bis (Tage ab 1.1.2026, 0 = für immer)
// Dazu 64 Byte Ed25519-Signatur, alles in Crockford-Base32 mit Bindestrichen: SILK-XXXXX-XXXXX-…
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const EPOCH = Date.UTC(2026, 0, 1);
function b32encode(buf) {
  let bits = 0, val = 0, out = '';
  for (const b of buf) { val = (val << 8) | b; bits += 8; while (bits >= 5) { out += ALPHABET[(val >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) out += ALPHABET[(val << (5 - bits)) & 31];
  return out;
}
function b32decode(str) {
  const clean = str.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
  let bits = 0, val = 0; const out = [];
  for (const ch of clean) { const v = ALPHABET.indexOf(ch); if (v < 0) return null; val = (val << 5) | v; bits += 5; if (bits >= 8) { out.push((val >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
}
const group = (s) => `SILK-${s.match(/.{1,5}/g).join('-')}`;

/** Code prüfen → { ok, id, until (Date|null), error } */
function checkCode(code, now = Date.now()) {
  const raw = b32decode(String(code || '').trim().replace(/^SILK-?/i, ''));
  if (!raw || raw.length < 72) return { ok: false, error: 'Dieser Code ist unvollständig. Bitte genau so einfügen, wie du ihn bekommen hast.' };
  const data = raw.subarray(0, 8), sig = raw.subarray(8, 72);
  let valid = false;
  // Testschlüssel nur im Testmodus mit Beispiel-Antworten (dort gibt es ohnehin keine echte KI)
  const key = process.env.SPIDER_MOCK && process.env.SILK_PRO_PUBKEY ? process.env.SILK_PRO_PUBKEY : PUBLIC_KEY;
  try { valid = crypto.verify(null, data, crypto.createPublicKey({ key: Buffer.from(key, 'base64'), format: 'der', type: 'spki' }), sig); } catch { valid = false; }
  if (!valid || data[0] !== 1 || data[1] !== 1) return { ok: false, error: 'Dieser Code ist nicht gültig.' };
  const days = data.readUInt16BE(6);
  const until = days ? new Date(EPOCH + days * 864e5) : null;
  if (until && until.getTime() < now) return { ok: false, error: `Dieser Code ist am ${until.toLocaleDateString('de-DE')} abgelaufen.`, until };
  return { ok: true, id: data.readUInt32BE(2), until };
}
/** Code erzeugen (nur mit privatem Schlüssel, z. B. im GitHub-Workflow) */
function makeCode(privateKeyPem, { id = crypto.randomBytes(4).readUInt32BE(0), months = 0 } = {}) {
  const data = Buffer.alloc(8);
  data[0] = 1; data[1] = 1; data.writeUInt32BE(id >>> 0, 2);
  if (months) { const d = new Date(); d.setMonth(d.getMonth() + months); data.writeUInt16BE(Math.ceil((d.getTime() - EPOCH) / 864e5), 6); }
  const sig = crypto.sign(null, data, crypto.createPrivateKey(privateKeyPem));
  return group(b32encode(Buffer.concat([data, sig])));
}

// ---------- Microsoft-Store-Lizenz (über PowerShell und die Windows-Store-Schnittstelle) ----------
const STORE_SCRIPT = `
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]
function Await($op, $type) { $t = $asTask.MakeGenericMethod($type).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
[Windows.Services.Store.StoreContext,Windows.Services.Store,ContentType=WindowsRuntime] | Out-Null
$ctx = [Windows.Services.Store.StoreContext]::GetDefault()
$lic = Await ($ctx.GetAppLicenseAsync()) ([Windows.Services.Store.StoreAppLicense])
$on = $false
foreach ($kv in $lic.AddOnLicenses) { if ($kv.Value.InAppOfferToken -eq '${ADDON_ID}' -and $kv.Value.IsActive) { $on = $true } }
@{ active = $on; addOns = $lic.AddOnLicenses.Count } | ConvertTo-Json -Compress
`;
function checkStoreLicense(psEnv) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32' || !process.windowsStore) return resolve(null);
    const { execFile } = require('child_process');
    const encoded = Buffer.from(STORE_SCRIPT, 'utf16le').toString('base64');
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-EncodedCommand', encoded], { windowsHide: true, timeout: 20000, env: psEnv?.() || process.env }, (err, out) => {
      if (err) return resolve({ error: String(err.message || err).slice(0, 200) });
      try { resolve(JSON.parse(String(out).trim().split('\n').pop())); } catch { resolve({ error: 'Antwort nicht lesbar' }); }
    });
  });
}

// ---------- Zustand ----------
let state = { code: null, store: false };
/** Beim Start und nach Änderungen: gespeicherten Code prüfen, Store-Lizenz abfragen */
async function refresh(settings, { psEnv, log = () => {} } = {}) {
  const c = settings.proCode ? checkCode(settings.proCode) : null;
  state.code = c?.ok ? c : null;
  if (process.windowsStore) {
    const s = await checkStoreLicense(psEnv);
    if (s && !s.error) state.store = !!s.active;
    else if (s?.error) { log(`Store-Lizenz nicht abfragbar: ${s.error}`); state.store = !!settings.proStoreCache; }
  }
  return status();
}
const active = () => !ENABLED || !!state.code || state.store || !!process.env.SILK_PRO;
/** Darf diese Funktion benutzt werden? */
function allowed(feature) {
  if (!FEATURES[feature]) return true;
  return active();
}
function status() {
  return {
    enabled: ENABLED, active: active(),
    source: state.store ? 'store' : state.code ? 'code' : null,
    until: state.code?.until ? state.code.until.toISOString() : null,
    canBuy: !!(process.windowsStore && ADDON_STORE_ID),
    features: FEATURES,
  };
}
const storeLink = () => (ADDON_STORE_ID ? `ms-windows-store://pdp/?ProductId=${ADDON_STORE_ID}` : null);

module.exports = { ENABLED, ADDON_ID, FEATURES, allowed, active, status, refresh, checkCode, makeCode, storeLink, _state: state };
