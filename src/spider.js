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
    this.reach = 95;
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
      c.setAttribute('r', '2.2');
      c.setAttribute('fill', '#ff2d8a');
      this.svg.appendChild(c);
      return c;
    });
    this.body = document.createElementNS(SVG_NS, 'g');
    // Gleiches Aussehen wie die Spinne am Bildschirmrand: runder Körper, Kulleraugen, Bäckchen
    this.body.innerHTML = `
      <circle cx="0" cy="0" r="17" fill="rgba(255,45,138,.12)"/>
      <circle cx="0" cy="0" r="11" fill="#16161d" stroke="#ff2d8a" stroke-width="1.6"/>
      <circle cx="-7.2" cy="4.2" r="1.8" fill="rgba(255,45,138,.45)"/>
      <circle cx="7.2" cy="4.2" r="1.8" fill="rgba(255,45,138,.45)"/>
      <ellipse cx="-4.4" cy="-1.6" rx="3.9" ry="4.4" fill="#fff" stroke="#16161d" stroke-width=".5"/>
      <ellipse cx="4.4" cy="-1.6" rx="3.9" ry="4.4" fill="#fff" stroke="#16161d" stroke-width=".5"/>
      <circle class="pl" cx="-4.4" cy="-1.6" r="1.9" fill="#111"/>
      <circle class="pr" cx="4.4" cy="-1.6" r="1.9" fill="#111"/>
      <path d="M-2.4 5.6 Q0 7.6 2.4 5.6" stroke="#ff2d8a" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
    this.pupils = [...this.body.querySelectorAll('.pl, .pr')];
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

    // Beine: ein Fuß macht einen Schritt, wenn er zu weit von seiner Ruheposition ist
    const stepping = this.feet.filter((f) => f.t < 1).length;
    this.feet.forEach((f, i) => {
      if (f.t < 1) {
        f.t = Math.min(1, f.t + dt * 7);
        const e = 1 - (1 - f.t) ** 2;
        f.x = lerp(f.fx, f.tx, e);
        f.y = lerp(f.fy, f.ty, e) - Math.sin(f.t * Math.PI) * 10;
        if (f.t === 1 && f.word) this.touch(f.word);
        return;
      }
      const [ix, iy] = this.ideal(LEG_ANGLES[i]);
      const groupBusy = this.feet.some((g, j) => g.t < 1 && GAIT_A.has(j) !== GAIT_A.has(i));
      if (dist(f.x, f.y, ix, iy) > this.reach * 0.5 && stepping < 4 && !groupBusy) {
        const lead = Math.min(40, vl);
        const w = this.nearestWord(ix + (vx / vl) * lead, iy + (vy / vl) * lead);
        f.fx = f.x; f.fy = f.y;
        f.tx = w ? w.x : ix; f.ty = w ? w.y : iy;
        f.word = w;
        f.t = 0;
      }
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
    const sc = this.bodyScale;
    this.body.setAttribute('transform', `translate(${this.x.toFixed(1)} ${(this.y + bob).toFixed(1)}) scale(${sc.toFixed(2)})`);
    // Augen schauen in Laufrichtung
    const vx = this.tx - this.x, vy = this.ty - this.y, vl = Math.hypot(vx, vy);
    const lx = vl > 2 ? (vx / vl) * 1.6 : 0, ly = vl > 2 ? (vy / vl) * 1.6 : 0;
    this.pupils[0].setAttribute('cx', -4.4 + lx); this.pupils[0].setAttribute('cy', -1.6 + ly);
    this.pupils[1].setAttribute('cx', 4.4 + lx); this.pupils[1].setAttribute('cy', -1.6 + ly);
    this.feet.forEach((f, i) => {
      const right = i < 4;
      // Hüften rund um den Körper verteilt
      const ha = ((-50 + (i % 4) * 30) * Math.PI) / 180;
      const hx = this.x + (right ? 1 : -1) * Math.cos(ha) * 9 * sc;
      const hy = this.y + Math.sin(ha) * 9 * sc;
      const dx = f.x - hx, dy = f.y - hy;
      const lift = f.t < 1 ? 0.34 : 0.24;
      const kx = hx + dx / 2 + (right ? dy : -dy) * lift;
      const ky = hy + dy / 2 + (right ? -dx : dx) * lift;
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
