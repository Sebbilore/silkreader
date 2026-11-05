// „Was ist neu?“ – erscheint nach einem Update einmal als Sprechblase an der Spinne.
// Gezeigt wird nur der Eintrag der aktuellen Version; ältere Einträge stehen in CHANGELOG.md.
module.exports = {
  '1.27.0': {
    de: [
      'Nach dem Lesen zeigt das Ergebnis oben wieder die Auswahl: Lesen, Übersetzen, Einfach und Antworten.',
      'Klügere Termine: Artikel, zum Beispiel aus Wikipedia, schlagen keine Fristen mehr vor. Nur Briefe und Bescheide mit echten Fristwörtern tun das.',
    ],
    en: [
      'After reading, the result shows the choice at the top again: Read, Translate, Simple and Reply.',
      'Smarter dates: articles, for example from Wikipedia, no longer suggest deadlines. Only letters and notices with real deadline words do.',
    ],
  },
  '1.26.0': {
    de: [
      'Silkreader liest jetzt nur noch mit dem Modell auf deinem PC. Claude und Ollama gibt es nicht mehr. Ein früher gespeicherter API-Schlüssel wurde gelöscht. Es wird weiterhin nichts ins Internet gesendet.',
      'Neu: Der Kontrastmodus von Windows wird unterstützt, und Screenreader können die Spinne benennen.',
      'Die Pro-Karte in den Einstellungen ist ruhiger geworden.',
    ],
    en: [
      'Silkreader now reads only with the model on your PC. Claude and Ollama are gone. An API key you saved earlier has been deleted. Still nothing is sent over the internet.',
      'New: Windows high-contrast mode is supported, and screen readers can name the spider.',
      'The Pro card in Settings is calmer now.',
    ],
  },
};
