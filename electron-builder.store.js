// Microsoft-Store-Paket (MSIX/AppX) – der Store signiert die App selbst, eine SmartScreen-Warnung gibt es dann nicht.
// Die Werte stehen im Partner Center unter „Produktidentität“ und werden als Umgebungsvariablen übergeben:
//   STORE_IDENTITY_NAME, STORE_PUBLISHER (CN=…), STORE_PUBLISHER_NAME
// Bauen (unter Windows): npm run dist:store
const base = require('./package.json').build;

module.exports = {
  ...base,
  win: { ...base.win, target: ['appx'], signtoolOptions: undefined },
  appx: {
    identityName: process.env.STORE_IDENTITY_NAME || 'SebbiLore.Silkreader',
    publisher: process.env.STORE_PUBLISHER || 'CN=5B8315BE-3B5E-4EC9-8861-32B3317991B7',
    publisherDisplayName: process.env.STORE_PUBLISHER_NAME || 'SebbiLore',
    displayName: 'Silkreader',
    applicationId: 'Silkreader',
    backgroundColor: '#0c0c11',
    languages: ['de-DE', 'en-US'],
    // „Öffnen mit“ und Autostart (Registry-Einträge und setLoginItemSettings wirken in Store-Apps nicht)
    // Electron und die eingebaute KI brauchen mindestens Windows 10 1809
    minVersion: '10.0.17763.0',
    maxVersionTested: '10.0.26100.0',
    customExtensionsPath: 'build/appx-extensions.xml',
  },
  publish: null,
};
