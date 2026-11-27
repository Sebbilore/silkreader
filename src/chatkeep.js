// Darf die Details-Stufe im Gespräch der ersten Stufe weiterfragen? Nur bei gleichem Dokument, gleicher Sequenz und genug Platz.
function canFollow(rt, cur, docText, extra) {
  const c = rt?.chat;
  return c && cur === rt && c.seq === cur.seq && c.docText === docText && c.used + extra < cur.ctx.contextSize ? c.session : null;
}
module.exports = { canFollow };
