// Umgebung für Windows PowerShell 5.1: Wird Silkreader aus PowerShell 7 heraus gestartet, erbt es deren
// Modulpfad (PSModulePath) – Windows PowerShell lädt dann die falschen Module und Befehle wie Add-Type oder
// Get-AuthenticodeSignature schlagen fehl. Ohne diese Variable baut PowerShell den richtigen Pfad selbst.
function psEnv() {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^psmodulepath$/i.test(k)) delete env[k];
  return env;
}
module.exports = { psEnv };
