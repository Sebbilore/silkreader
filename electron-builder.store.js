// Microsoft-Store-Paket (MSIX/AppX) – der Store signiert die App selbst, eine SmartScreen-Warnung gibt es dann nicht.
// Die Werte stehen im Partner Center unter „Produktidentität“ und werden als Umgebungsvariablen übergeben:
//   STORE_IDENTITY_NAME, STORE_PUBLISHER (CN=…), STORE_PUBLISHER_NAME
// Bauen (unter Windows): npm run dist:store
const base = require('./package.json').build;

module.exports = {
  ...base,
  win: { ...base.win, target: ['appx'], signtoolOptions: undefined },
  appx: {
    identityName: process.env.STORE_IDENTITY_NAME || 'Silkreader.Silkreader',
    publisher: process.env.STORE_PUBLISHER || 'CN=00000000-0000-0000-0000-000000000000',
    publisherDisplayName: process.env.STORE_PUBLISHER_NAME || 'Silkreader',
    displayName: 'Silkreader',
    applicationId: 'Silkreader',
    backgroundColor: '#0c0c11',
    languages: ['de-DE', 'en-US'],
  },
  publish: null,
};
