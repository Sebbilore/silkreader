// Ein Symbol-Stil für alle Fenster: feine Seidenlinien (1,6 px, runde Enden), Raster -10…10.
(function () {
  const P = {
    read: '<circle cx="-4.6" cy="1.5" r="3.6"/><circle cx="4.6" cy="1.5" r="3.6"/><path d="M-1 .8q1 -1.2 2 0M-8.2 1l-1.3 -4M8.2 1l1.3 -4"/>',
    translate: '<circle r="7.5"/><path d="M-7.5 0h15M0 -7.5c3 2.5 3 12.5 0 15M0 -7.5c-3 2.5 -3 12.5 0 15"/>',
    simplify: '<path d="M-3.5 4.5h7M-2.5 7h5M0 -8a5.5 5.5 0 0 1 3.4 9.8c-.9.7 -1.2 1.5 -1.2 2.7h-4.4c0 -1.2 -.3 -2 -1.2 -2.7A5.5 5.5 0 0 1 0 -8z"/>',
    reply: '<rect x="-8" y="-6" width="16" height="12" rx="2"/><path d="M-8 -5l8 6 8 -6"/>',
    region: '<path d="M-8 -3v-5h5M3 -8h5v5M8 3v5h-5M-3 8h-5v-5"/><path d="M-3 -1h6M-3 2h4"/>',
    pin: '<path d="M0 -8v16M-7 -4l14 8M-7 4l14 -8"/><path d="M0 -4.5l3.9 2.25v4.5L0 4.5l-3.9 -2.25v-4.5z"/>',
    notebook: '<path d="M-6 -8h11a1.5 1.5 0 0 1 1.5 1.5v14.5h-11a1.5 1.5 0 0 1 -1.5 -1.5z"/><path d="M-2 -8v16M1 -4h3"/>',
    more: '<path d="M-6 0h.01M0 0h.01M6 0h.01" stroke-width="3"/>',
    file: '<path d="M-5.5 -8h7l4.5 4.5v11.5h-11.5z M1.5 -8v4.5h4.5"/>',
    clip: '<rect x="-6" y="-6" width="12" height="14" rx="2"/><path d="M-3 -8h6v3.5h-6z"/>',
    reader: '<rect x="-8.5" y="-7" width="17" height="14" rx="2"/><path d="M0 -7v14M-6 -3h3M-6 0h3M3 -3h3M3 0h3"/>',
    settings: '<circle r="2.8"/><path d="M0 -8v2.6M0 5.4v2.6M-8 0h2.6M5.4 0h2.6M-5.7 -5.7l1.8 1.8M3.9 3.9l1.8 1.8M-5.7 5.7l1.8 -1.8M3.9 -3.9l1.8 -1.8"/>',
    hide: '<path d="M-8 0q8 -8 16 0q-8 8 -16 0z"/><circle r="2.2"/><path d="M-7 7l14 -14"/>',
    back: '<path d="M2.5 -6l-6 6 6 6"/>',
    copy: '<rect x="-3.5" y="-3.5" width="11" height="11" rx="2"/><path d="M-3.5 3.5h-1.5a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2h7a2 2 0 0 1 2 2v1.5"/>',
    keep: '<path d="M0 -8v16M-7 -4l14 8M-7 4l14 -8"/><circle r="2.5"/>',
    close: '<path d="M-5 -5l10 10M5 -5l-10 10"/>',
    calendar: '<rect x="-7.5" y="-6" width="15" height="13" rx="2"/><path d="M-7.5 -2h15M-3.5 -8v4M3.5 -8v4"/>',
    search: '<circle cx="-1.5" cy="-1.5" r="5.5"/><path d="M2.5 2.5l5 5"/>',
    send: '<path d="M-7 0h12M1 -5l5 5 -5 5"/>',
    screen: '<rect x="-8.5" y="-7" width="17" height="11" rx="1.5"/><path d="M-3 8h6M0 4v4"/>',
    speak: '<path d="M-7 -3h3l4.5 -4v14l-4.5 -4h-3z"/><path d="M3.5 -3.5a5 5 0 0 1 0 7M6 -6a8.5 8.5 0 0 1 0 12"/>',
    stop: '<rect x="-5" y="-5" width="10" height="10" rx="1.5"/>',
    shorter: '<path d="M-7 -4h14M-7 0h9M-7 4h5"/>',
    tone: '<path d="M-7 5c2 -6 4 -6 6 0s4 6 6 0M-7 -3h14"/>',
    trash: '<path d="M-6 -5h12M-4 -5l1 12h6l1 -12M-2 -5v-2h4v2"/>',
  };
  window.SILK_ICONS = P;
  /** SVG-Text für ein Symbol, z. B. silkIcon('copy') */
  window.silkIcon = (name, cls = 'icon') => `<svg class="${cls}" viewBox="-10 -10 20 20" aria-hidden="true">${P[name] || ''}</svg>`;
})();
