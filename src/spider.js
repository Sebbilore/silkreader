// Prozedural animierte Spinne, die über ein Dokument aus <span class="w">-Wörtern läuft.
// Ihre Füße landen auf Wörtern, markieren sie und die Kamera folgt ihr beim Scrollen.

const SVG_NS = 'http://www.w3.org/2000/svg';
const LEG_ANGLES = [-62, -24, 18, 58, -118, -156, 162, 122]; // 0–3 rechts, 4–7 links
const GAIT_A = new Set([0, 2, 5, 7]);

const lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

export class Spider {
  constructor(scroller, content) {
    this.scroller = scroller;
    this.content = content;
    this.reach = 120;
    this.bodyScale = 1; // zum Schlüpfen aus dem Ei kleiner anfangen
    this.x = 200; this.y = 120;
    this.tx = this.x; this.ty = this.y;
    this.speed = 340; // px/s
    this.follow = true;
    this.words = [];
    this.rows = new Map();
    this.onArrive = null;

    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.classList.add('spider-layer');
    content.appendChild(this.svg);

    this.legEls = LEG_ANGLES.map(() => {
      const p = document.createElementNS(SVG_NS, 'polyline');
      p.setAttribute('class', 'spider-leg');
      this.svg.appendChild(p);
      return p;
    });
    this.footEls = LEG_ANGLES.map(() => {
      const c = document.createElementNS(SVG_NS, 'circle');
      c.setAttribute('r', '2.6');
      c.setAttribute('class', 'spider-foot');
      this.svg.appendChild(c);
      return c;
    });
    this.body = document.createElementNS(SVG_NS, 'g');
    this.body.innerHTML = `
      <ellipse class="spider-glow" cx="0" cy="6" rx="22" ry="36"/>
      <ellipse class="spider-abdomen" cx="0" cy="16" rx="10" ry="21"/>
      <rect class="spider-mark" x="-2" y="6" width="4" height="16" rx="2"/>
      <ellipse class="spider-thorax" cx="0" cy="-9" rx="7.5" ry="9"/>
      <circle class="spider-eye" cx="-2.6" cy="-15" r="1.4"/>
      <circle class="spider-eye" cx="2.6" cy="-15" r="1.4"/>`;
    this.svg.appendChild(this.body);

    this.feet = LEG_ANGLES.map((a) => {
      const [ix, iy] = this.ideal(a);
      return { x: ix, y: iy, fx: ix, fy: iy, tx: ix, ty: iy, t: 1 };
    });

    this.last = performance.now();
    this.minGap = 0; // ms zwischen zwei Bildern (0 = volle Bildrate)
    this.lastDraw = 0;
    this.running = true;
    this.hidden = true;
    this.svg.style.opacity = '0';
    requestAnimationFrame(this.tick);
  }

  // Alle Wortpositionen einmal einlesen und in Zeilen einsortieren (schnelle Nachbarsuche).
  index() {
    this.words = [];
    this.rows = new Map();
    for (const el of this.content.querySelectorAll('span.w')) {
      const w = { el, x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
      this.words.push(w);
      const r = Math.floor(w.y / 40);
      if (!this.rows.has(r)) this.rows.set(r, []);
      this.rows.get(r).push(w);
    }
    this.svg.setAttribute('width', this.content.scrollWidth);
    this.svg.setAttribute('height', this.content.scrollHeight);
  }

  nearestWord(px, py, radius = 70) {
    let best = null, bd = radius;
    const r0 = Math.floor((py - radius) / 40), r1 = Math.floor((py + radius) / 40);
    for (let r = r0; r <= r1; r++) {
      for (const w of this.rows.get(r) || []) {
        const d = dist(px, py, w.x, w.y) + Math.random() * 18;
        if (d < bd) { bd = d; best = w; }
      }
    }
    return best;
  }

  ideal(angle) {
    const rad = (angle * Math.PI) / 180;
    return [this.x + Math.cos(rad) * this.reach, this.y + Math.sin(rad) * this.reach * 0.9];
  }

  show() { this.hidden = false; this.svg.style.opacity = '1'; }
  hide() { this.hidden = true; this.svg.style.opacity = '0'; }

  moveTo(x, y, onArrive) {
    this.tx = x; this.ty = y;
    this.onArrive = onArrive || null;
  }

  teleport(x, y) {
    this.x = this.tx = x; this.y = this.ty = y;
    this.feet.forEach((f, i) => {
      const [ix, iy] = this.ideal(LEG_ANGLES[i]);
      Object.assign(f, { x: ix, y: iy, fx: ix, fy: iy, tx: ix, ty: iy, t: 1 });
    });
  }

  tick = (now) => {
    if (!this.running) return;
    if (now - this.lastDraw < this.minGap) { requestAnimationFrame(this.tick); return; }
    this.lastDraw = now;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    // Körper bewegen
    const d = dist(this.x, this.y, this.tx, this.ty);
    const ox = this.x, oy = this.y;
    if (d > 1) {
      const step = Math.min(d, this.speed * dt * Math.min(1, d / 60 + 0.35));
      this.x += ((this.tx - this.x) / d) * step;
      this.y += ((this.ty - this.y) / d) * step;
    } else if (this.onArrive) {
      const cb = this.onArrive;
      this.onArrive = null;
      cb();
    }
    const vx = this.tx - this.x, vy = this.ty - this.y, vl = Math.hypot(vx, vy) || 1;
    // tatsächliche Geschwindigkeit (für vorausschauende Schritte)
    const moving = d > 1 ? Math.min(this.speed, d / Math.max(dt, 0.001)) : 0;

    // Beine: ein Fuß macht einen Schritt, wenn er zu weit von seiner Ruheposition ist
    const stepping = this.feet.filter((f) => f.t < 1).length;
    this.feet.forEach((f, i) => {
      if (f.t < 1) {
        // Schrittziel wandert mit dem Körper mit – sonst landet der Fuß hinter der Spinne
        f.tx += this.x - ox; f.ty += this.y - oy;
        f.t = Math.min(1, f.t + dt * (11 + moving / 90)); // schneller laufen = schnellere Schritte
        const e = 1 - (1 - f.t) ** 2;
        f.x = lerp(f.fx, f.tx, e);
        f.y = lerp(f.fy, f.ty, e) - Math.sin(f.t * Math.PI) * 10;
        if (f.t === 1 && f.word && dist(f.x, f.y, f.word.x, f.word.y) < 30) this.touch(f.word);
        return;
      }
      const [ix, iy] = this.ideal(LEG_ANGLES[i]);
      const groupBusy = this.feet.some((g, j) => g.t < 1 && GAIT_A.has(j) !== GAIT_A.has(i));
      // Zu weit gedehnt? Dann sofort umsetzen – egal, ob die Gangart gerade passt
      const overstretched = dist(f.x, f.y, this.x, this.y) > this.reach * 1.1;
      if (overstretched || (dist(f.x, f.y, ix, iy) > this.reach * 0.38 && stepping < 4 && !groupBusy)) {
        // dorthin greifen, wo der Körper am Ende des Schritts sein wird
        const lead = Math.min(this.reach * 0.6, moving / 11 + 8, vl);
        const w = this.nearestWord(ix + (vx / vl) * lead, iy + (vy / vl) * lead);
        f.fx = f.x; f.fy = f.y;
        f.tx = w ? w.x : ix; f.ty = w ? w.y : iy;
        f.word = w;
        f.t = 0;
      }
    });

    // Ein Bein kann nie länger werden als Ober- plus Unterschenkel: Fuß notfalls nachziehen
    const maxLeg = this.reach * 0.62 * this.bodyScale * 2 * 0.96;
    this.feet.forEach((f, i) => {
      const hx = this.x + (i < 4 ? 5 : -5), hy = this.y - 9 + (i % 4) * 3.5;
      const fd = dist(f.x, f.y, hx, hy);
      if (fd > maxLeg) { f.x = hx + ((f.x - hx) / fd) * maxLeg; f.y = hy + ((f.y - hy) / fd) * maxLeg; }
    });

    this.draw();
    if (this.follow && !this.hidden) this.camera();
    requestAnimationFrame(this.tick);
  };

  touch(w) {
    if (!w || this.hidden) return;
    const el = w.el;
    el.classList.remove('touched');
    void el.offsetWidth; // Animation neu starten
    el.classList.add('touched');
  }

  draw() {
    const bob = Math.sin(performance.now() / 160) * 1.2;
    this.body.setAttribute('transform', `translate(${this.x.toFixed(1)} ${(this.y + bob).toFixed(1)}) scale(${this.bodyScale.toFixed(2)})`);
    this.feet.forEach((f, i) => {
      const right = i < 4;
      const hx = this.x + (right ? 5 : -5);
      const hy = this.y - 9 + (i % 4) * 3.5;
      // Zwei feste Beinsegmente (Ober-/Unterschenkel): Knie liegt dort, wo beide passen,
      // immer nach außen/oben geknickt – so kann es nicht mehr umklappen.
      const L = this.reach * 0.62 * this.bodyScale;
      const dx = f.x - hx, dy = f.y - hy, dd = Math.hypot(dx, dy) || 1;
      const half = Math.min(dd / 2, L);
      const bend = Math.sqrt(Math.max(0, L * L - half * half)) + (f.t < 1 ? 6 : 0);
      let px = -dy / dd, py = dx / dd; // eine Senkrechte zur Beinlinie
      const side = right ? 1 : -1;
      if (-py + 0.6 * side * px < py - 0.6 * side * px) { px = -px; py = -py; } // die nach außen/oben zeigende nehmen
      const kx = hx + (dx / dd) * half + px * bend;
      const ky = hy + (dy / dd) * half + py * bend;
      this.legEls[i].setAttribute('points', `${hx},${hy} ${kx},${ky} ${f.x},${f.y}`);
      this.footEls[i].setAttribute('cx', f.x);
      this.footEls[i].setAttribute('cy', f.y);
    });
  }

  camera() {
    const s = this.scroller;
    const top = s.scrollTop, h = s.clientHeight;
    const margin = Math.min(220, h * 0.3);
    let target = null;
    if (this.y < top + margin) target = this.y - margin;
    else if (this.y > top + h - margin) target = this.y - h + margin;
    if (target !== null) s.scrollTop = lerp(top, target, 0.12);
  }

  destroy() {
    this.running = false;
    this.svg.remove();
  }
}
