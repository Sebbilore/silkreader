// Gespräch der ersten Stufe wiederverwenden? (ohne KI, ohne Fenster)
import { createRequire } from 'module';
const { canFollow } = createRequire(import.meta.url)('../src/chatkeep.js');
let fails = 0;
const ok = (n, c) => { console.log(`${c ? 'OK  ' : 'FEHL'} ${n}`); if (!c) fails++; };
const seq = {}, session = {};
const rt = { seq, ctx: { contextSize: 4000 }, chat: { session, seq, docText: 'Brief', used: 1000 } };
ok('gleiches Dokument → Gespräch', canFollow(rt, rt, 'Brief', 1000) === session);
ok('anderer Brief → neu', canFollow(rt, rt, 'Anderer', 1000) === null);
ok('andere Sequenz → neu', canFollow({ ...rt, seq: {} }, { ...rt, seq: {} }, 'Brief', 1000) === null);
ok('eigener Kontext → neu', canFollow(rt, { seq, ctx: rt.ctx }, 'Brief', 1000) === null);
ok('zu wenig Platz → neu', canFollow(rt, rt, 'Brief', 3000) === null);
ok('kein Gespräch → neu', canFollow({ ...rt, chat: null }, rt, 'Brief', 1) === null);
process.exit(fails ? 1 : 0);
