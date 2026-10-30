// ES-Module (node-llama-cpp, unpdf) nachladen. Liegt bewusst in einer eigenen, kleinen Datei:
// Im Paket wird der Hauptprozess zu Bytecode übersetzt – dort funktioniert import() nicht.
module.exports = (name) => import(name);
