// Bedienung ohne Maus: Klickbare Elemente (Ergebnis-Einträge, Notizbuch, Auswahlkarten …) bekommen
// Tastaturfokus und eine Rolle für Bildschirmleser; Enter oder Leertaste lösen sie aus.
(function () {
  const SEL = '.jump, .entry, .clip, .opt, [data-click]';
  const prep = (root) => {
    if (root.nodeType !== 1) return;
    const list = root.matches?.(SEL) ? [root, ...root.querySelectorAll(SEL)] : root.querySelectorAll(SEL);
    for (const el of list) {
      if (el.tabIndex < 0 || !el.hasAttribute('tabindex')) el.tabIndex = 0;
      if (!el.getAttribute('role')) el.setAttribute('role', 'button');
    }
  };
  const start = () => {
    prep(document.body);
    new MutationObserver((muts) => muts.forEach((m) => m.addedNodes.forEach(prep))).observe(document.body, { childList: true, subtree: true });
  };
  if (document.body) start(); else document.addEventListener('DOMContentLoaded', start);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches?.(SEL)) {
      e.preventDefault();
      e.stopPropagation();
      e.target.click();
    }
  }, true);
})();
