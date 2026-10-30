// Kokon-Ablage: Die Spinne hält Dateien und Textschnipsel fest (eine Art Zwischenablage mit
// Gedächtnis). Gespeichert wird nur der Verweis auf Dateien; Texte werden direkt gespeichert.

const fs = require('fs');
const path = require('path');

const MAX_ITEMS = 6;

class CocoonStore {
  constructor(file) {
    this.file = file;
    this.items = [];
    try { this.items = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { /* noch leer */ }
  }

  save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.items, null, 2));
  }

  list() {
    return this.items.map((it) => ({ ...it, missing: it.type === 'file' && !fs.existsSync(it.path) }));
  }

  get(id) {
    return this.items.find((it) => it.id === id);
  }

  add(item) {
    // Gleiche Datei/gleichen Text nicht doppelt einspinnen
    this.items = this.items.filter((it) => !(it.type === item.type && (it.path || it.text) === (item.path || item.text)));
    this.items.unshift({ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, added: Date.now(), ...item });
    this.items = this.items.slice(0, MAX_ITEMS);
    this.save();
  }

  addFile(p) {
    let size = 0;
    try { size = fs.statSync(p).size; } catch { /* egal */ }
    this.add({ type: 'file', path: p, name: path.basename(p), size });
  }

  addText(text) {
    const first = text.replace(/\s+/g, ' ').trim();
    this.add({ type: 'text', text, name: first.length > 40 ? `${first.slice(0, 40)}…` : first });
  }

  remove(id) {
    this.items = this.items.filter((it) => it.id !== id);
    this.save();
  }

  clear() {
    this.items = [];
    this.save();
  }
}

module.exports = { CocoonStore, MAX_ITEMS };
