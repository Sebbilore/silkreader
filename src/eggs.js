// Kleine Überraschungen: Mit dem Konami-Code (↑ ↑ ↓ ↓ ← → ← → B A) feiert die Spinne eine Party.
(function () {
  const CODE = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  let pos = 0;
  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    pos = k === CODE[pos] ? pos + 1 : k === CODE[0] ? 1 : 0;
    if (pos === CODE.length) { pos = 0; window.spider?.easterEgg?.('party'); }
  }, true);
})();
