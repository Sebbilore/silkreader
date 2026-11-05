# Silkreader Tempo-Test auf einem echten Windows-PC (Anweisung für Claude)

Kopiere alles unterhalb der Linie in Claude Code auf dem PC, dessen Geschwindigkeit gemessen werden soll.

---

Messe die KI-Geschwindigkeit von Silkreader auf **diesem Windows-PC** und berichte mir das Ergebnis als Tabelle. Die bisherigen Werte stammen von einem langsamen GitHub-Testrechner (4 Kerne, keine Grafikkarte). Ich will wissen, wie schnell es auf echter Hardware ist.

**So gehst du vor**

1. Prüfe, ob `git` und `node` (Version 22 oder neuer) installiert sind (`git --version`, `node --version`). Fehlt etwas, sag mir das und nenne den Befehl (`winget install Git.Git`, `winget install OpenJS.NodeJS.LTS`). Installiere nichts ohne meine Zustimmung.
2. Lade das Skript und starte es:
   ```powershell
   irm https://raw.githubusercontent.com/Sebbilore/silkreader/main/scripts/tempo-test.ps1 -OutFile "$env:TEMP\tempo-test.ps1"
   powershell -ExecutionPolicy Bypass -File "$env:TEMP\tempo-test.ps1"
   ```
   Das Skript richtet alles in `%USERPROFILE%\silkreader-tempo` ein (Quellcode, Bibliotheken, zwei KI-Modelle mit zusammen etwa 3,5 GB) und startet den Test. Der erste Lauf dauert 20 bis 40 Minuten, spätere 10 bis 25. Starte es im Hintergrund und warte, bis es fertig ist. Brich nicht ab, solange Modelle geladen werden.
3. Während des Tests öffnen sich kurz Fenster der Spinne. Ich fasse nichts an und lasse den PC am Netzteil.
4. Lies danach `Desktop\Silkreader-Tempo-Ergebnis.md` und zeig mir:
   - **Dieser PC:** Prozessor, Kerne, Arbeitsspeicher, Grafikkarte.
   - **Ergebnistabelle** für „fast“ und „quality“: Ø Dauer, langsamster Brief, erste Stichpunkte, Details, Einlesen, Schreiben, Token/s.
   - **Vergleich** mit dem GitHub-Rechner (fast 15,6 s, quality 54,4 s): um welchen Faktor schneller oder langsamer?
   - Ob alle Antworten **richtig** waren (Betrag, Frist, Aufgabe, keine erfundenen Zahlen).
   - **Fehler und Warnungen**, falls es welche gibt.
5. Schlage mir am Ende vor, was die Zeit bei diesem PC am meisten bestimmt (Einlesen oder Schreiben, Prozessor oder Grafikkarte), und ob der Sparmodus oder ein anderes Modell sinnvoll wäre.

**Regeln**

- Ändere nichts am Quellcode und lade nichts hoch. Das Skript liest nur die Testbriefe aus dem Quellcode, keine meiner Dateien.
- Wenn etwas fehlschlägt, zeig mir die Fehlermeldung im Wortlaut und sag, was du versucht hast. Rate nicht herum.
- Erfinde keine Zahlen. Berichte nur, was im Bericht steht.

Optional (nur wenn ich es verlange): Tempo-Schalter vergleichen, z. B.
`powershell -ExecutionPolicy Bypass -File "$env:TEMP\tempo-test.ps1" -Tempo "alles,aus,ohne-keep,v1.23"`
Das zeigt, was die einzelnen Beschleunigungen auf diesem PC bringen (dauert länger).
