// Die kleine Spinne im Analysefenster: hüpft herum, macht Saltos, tanzt, seilt sich ab,
// lugt hinter dem Rand hervor, schläft ein – und freut sich, wenn man sie anklickt.

const NS = 'http://www.w3.org/2000/svg';
const LEGS = [
  { hx: 8, hy: -5, kx: 18, ky: -15, fx: 24, fy: -4 },
  { hx: 10, hy: -1, kx: 21, ky: -7, fx: 28, fy: 4 },
  { hx: 10, hy: 3, kx: 20, ky: 2, fx: 26, fy: 13 },
  { hx: 8, hy: 7, kx: 16, ky: 9, fx: 20, fy: 20 },
].flatMap((l, i) => [{ ...l, side: 1, i }, { ...l, hx: -l.hx, kx: -l.kx, fx: -l.fx, side: -1, i }]);

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

export class Mascot {
  constructor({ ceiling = 52, rightInset = () => 0 } = {}) {
    this.ceiling = ceiling;
    this.rightInset = rightInset; // rechts freilassen (z. B. Ergebnis-Panel)
    this.x = 120; this.y = -60; this.vx = 0; this.vy = 0;
    this.rot = 0; this.squash = 1; this.face = 1;
    this.state = 'fall'; this.until = 0; this.action = null;
    this.cursor = { x: -999, y: -999 };
    this.lastMouse = performance.now();
    this.thread = null; // y-Position, an der ein Faden befestigt ist
    this.mood = 'happy';
    this.busy = false;
    this.build();
    this.last = performance.now();
    window.addEventListener('mousemove', (e) => { this.cursor = { x: e.clientX, y: e.clientY }; this.lastMouse = performance.now(); if (this.state === 'sleep') this.wake(); });
    requestAnimationFrame(this.tick);
  }

  build() {
    this.root = document.createElement('div');
    this.root.className = 'mascot';
    this.root.innerHTML = `
      <svg class="m-thread" width="2" height="2"><line x1="1" y1="0" x2="1" y2="0"/></svg>
      <svg class="m-spider" viewBox="-36 -36 72 72" width="90" height="90">
        <g class="m-rig"><g class="m-legs"></g>
          <circle class="m-body" r="11"/>
          <circle class="m-cheek" cx="-7.2" cy="4.2" r="1.8"/><circle class="m-cheek" cx="7.2" cy="4.2" r="1.8"/>
          <ellipse class="m-eye" cx="-4.4" cy="-1.6" rx="3.9" ry="4.4"/><ellipse class="m-eye" cx="4.4" cy="-1.6" rx="3.9" ry="4.4"/>
          <circle class="m-pupil" cx="-4.4" cy="-1.6" r="1.9"/><circle class="m-pupil" cx="4.4" cy="-1.6" r="1.9"/>
          <path class="m-mouth" d=""/>
        </g>
      </svg>
      <div class="m-fx"></div>`;
    document.body.appendChild(this.root);
    this.svg = this.root.querySelector('.m-spider');
    this.rig = this.root.querySelector('.m-rig');
    this.threadSvg = this.root.querySelector('.m-thread');
    this.threadLine = this.threadSvg.querySelector('line');
    this.fx = this.root.querySelector('.m-fx');
    this.eyes = [...this.root.querySelectorAll('.m-eye')];
    this.pupils = [...this.root.querySelectorAll('.m-pupil')];
    this.mouth = this.root.querySelector('.m-mouth');
    this.legEls = LEGS.map(() => {
      const p = document.createElementNS(NS, 'polyline');
      p.setAttribute('class', 'm-leg');
      this.root.querySelector('.m-legs').appendChild(p);
      return p;
    });
    this.svg.addEventListener('click', () => this.poked());
  }

  get floor() { return window.innerHeight - 18; }
  get minX() { return 26; }
  get maxX() { return Math.max(this.minX + 40, window.innerWidth - this.rightInset() - 26); }

  // ---------- Aktionen ----------
  next() {
    if (this.busy) return this.start(pick(['dance', 'cheer', 'sit']));
    const idle = performance.now() - this.lastMouse > 40000;
    if (idle) return this.start('sleep');
    this.start(pick(['sit', 'sit', 'walk', 'walk', 'hop', 'hop', 'flip', 'dance', 'abseil', 'peek', 'spin']));
  }

  start(name) {
    const now = performance.now();
    this.action = name;
    this.thread = null;
    switch (name) {
      case 'sit': this.state = 'ground'; this.until = now + rand(1500, 3500); break;
      case 'walk': this.state = 'walk'; this.tx = rand(this.minX, this.maxX); this.face = Math.sign(this.tx - this.x) || 1; this.until = now + 6000; break;
      case 'hop': this.jump(rand(-160, 160), rand(330, 460)); break;
      case 'flip': this.jump(rand(-80, 80), 560, 360); break;
      case 'spin': this.state = 'ground'; this.spinUntil = now + 900; this.until = now + 1100; break;
      case 'dance': this.state = 'ground'; this.until = now + 2200; break;
      case 'cheer': this.jump(0, 300, 0); break;
      case 'sleep': this.state = 'ground'; this.until = Infinity; this.mood = 'sleep'; break;
      case 'abseil':
        // von der Decke an einem Faden herunter, kurz baumeln, dann runterplumpsen
        this.x = rand(this.minX + 20, this.maxX - 20); this.y = this.ceiling - 30; this.vx = 0; this.vy = 0;
        this.thread = this.ceiling; this.state = 'abseil'; this.until = now + 3200; this.ropeY = rand(170, Math.min(320, this.floor - 120));
        break;
      case 'peek': {
        // zum Rand laufen, dahinter verstecken und hervorlugen
        this.peekSide = this.x < (this.minX + this.maxX) / 2 ? -1 : 1;
        this.state = 'walk'; this.tx = this.peekSide < 0 ? -40 : window.innerWidth + 40; this.face = this.peekSide; this.until = now + 6000;
        break;
      }
      default: this.state = 'ground'; this.until = now + 1500;
    }
  }

  jump(dx, power, spin = 0) {
    this.state = 'air';
    this.vx = dx * 1.6; this.vy = -power;
    this.spinTarget = this.rot + spin;
    this.squash = 0.8;
  }

  poked() {
    this.wake();
    this.burst('💖');
    this.mood = 'love';
    setTimeout(() => { if (this.mood === 'love') this.mood = 'happy'; }, 1600);
    this.thread = null;
    this.jump(rand(-60, 60), 600, Math.random() < 0.5 ? 360 : -360);
  }

  wake() {
    if (this.state === 'sleep' || this.mood === 'sleep') {
      this.mood = 'surprised';
      setTimeout(() => { if (this.mood === 'surprised') this.mood = 'happy'; }, 1200);
      this.jump(0, 420);
    }
  }

  setBusy(b) {
    this.busy = b;
    if (!b) { this.burst('🎉'); this.start('flip'); }
  }

  burst(emoji) {
    for (let i = 0; i < 5; i++) {
      const s = document.createElement('span');
      s.textContent = emoji;
      s.style.left = `${this.x + rand(-14, 14)}px`; s.style.top = `${this.y - 20}px`;
      s.style.setProperty('--dx', `${rand(-40, 40)}px`); s.style.animationDelay = `${i * 60}ms`;
      this.fx.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
  }

  // ---------- Animationsschleife ----------
  tick = (now) => {
    requestAnimationFrame(this.tick);
    if (document.hidden) { this.last = now; return; }
    const dt = Math.min(0.033, (now - this.last) / 1000);
    this.last = now;
    const t = now / 1000;
    const G = 1500;
    let walking = false;

    // vor der Maus weghüpfen, wenn sie ganz nah kommt (verspielt)
    const dm = Math.hypot(this.cursor.x - this.x, this.cursor.y - this.y);
    if (dm < 46 && this.state === 'ground' && this.mood !== 'love' && Math.random() < dt * 3) {
      this.jump(Math.sign(this.x - this.cursor.x) * 120, 380);
    }

    switch (this.state) {
      case 'fall': case 'air':
        this.vy += G * dt; this.x += this.vx * dt; this.y += this.vy * dt;
        if (this.spinTarget !== undefined) this.rot += (this.spinTarget - this.rot) * Math.min(1, dt * 6);
        if (this.x < this.minX) { this.x = this.minX; this.vx = Math.abs(this.vx) * 0.6; }
        if (this.x > this.maxX) { this.x = this.maxX; this.vx = -Math.abs(this.vx) * 0.6; }
        if (this.y >= this.floor && this.vy > 0) {
          this.y = this.floor; this.vy = 0; this.vx = 0; this.squash = 0.65; this.rot = 0; this.spinTarget = undefined;
          this.state = 'ground'; this.until = now + rand(400, 1200);
        }
        break;
      case 'walk': {
        const d = this.tx - this.x;
        this.x += Math.sign(d) * Math.min(Math.abs(d), 95 * dt);
        this.y = this.floor;
        walking = true;
        if (Math.abs(d) < 2) {
          if (this.action === 'peek') { this.state = 'peeking'; this.until = now + 1800; }
          else { this.state = 'ground'; this.until = now + rand(600, 1500); }
        }
        break;
      }
      case 'peeking': {
        // nur die Augen schauen hinter dem Rand hervor
        const edge = this.peekSide < 0 ? 4 : window.innerWidth - 4;
        this.x += (edge - this.x) * Math.min(1, dt * 4);
        if (now > this.until) { this.state = 'walk'; this.action = 'walk'; this.tx = this.peekSide < 0 ? this.minX + 60 : this.maxX - 60; }
        break;
      }
      case 'abseil': {
        const target = now < this.until ? this.ropeY + Math.sin(t * 3) * 6 : this.ropeY;
        this.y += (target - this.y) * Math.min(1, dt * 2.5);
        this.x += Math.sin(t * 2.2) * 0.4;
        if (now > this.until) { this.thread = null; this.state = 'fall'; this.vy = 0; this.mood = 'surprised'; setTimeout(() => { this.mood = 'happy'; }, 900); }
        break;
      }
      default:
        if (this.y < this.floor - 1) { this.state = 'fall'; break; }
        this.y = this.floor;
        if (this.x > this.maxX + 30 && this.action !== 'peek') { this.state = 'walk'; this.tx = this.maxX - 20; this.face = -1; } // Panel ist aufgegangen
        if (now > this.until && this.mood !== 'sleep') this.next();
    }

    this.squash += (1 - this.squash) * Math.min(1, dt * 8);
    if (this.spinUntil && now < this.spinUntil) this.rot += dt * 800; else if (this.spinUntil) { this.rot = 0; this.spinUntil = 0; }
    this.render(t, now, walking);
  };

  render(t, now, walking) {
    const dancing = this.action === 'dance' && this.state === 'ground';
    const bob = dancing ? Math.abs(Math.sin(t * 9)) * -8 : 0;
    const sway = dancing ? Math.sin(t * 9) * 12 : 0;
    this.svg.style.transform = `translate(${this.x - 45}px, ${this.y - 45 + bob}px)`;
    this.rig.setAttribute('transform', `rotate(${(this.rot + sway).toFixed(1)}) scale(${(2 - this.squash).toFixed(2)} ${this.squash.toFixed(2)})`);

    if (this.thread !== null) {
      this.threadSvg.style.display = '';
      this.threadSvg.style.transform = `translate(${this.x - 1}px, ${this.thread}px)`;
      this.threadSvg.setAttribute('height', Math.max(2, this.y - this.thread - 8));
      this.threadLine.setAttribute('y2', Math.max(2, this.y - this.thread - 8));
    } else this.threadSvg.style.display = 'none';

    // Beine
    const air = this.state === 'air' || this.state === 'fall';
    const speed = walking ? 18 : dancing ? 16 : this.busy ? 12 : 3;
    const amp = walking ? 3 : dancing ? 3.5 : 1;
    LEGS.forEach((l, n) => {
      let { hx, hy, kx, ky, fx, fy } = l;
      const ph = Math.sin(t * speed + l.i * 1.3 + (l.side > 0 ? 0 : Math.PI));
      fy += ph * amp; ky += ph * amp * 0.6;
      if (air) { fy -= 9; ky -= 7; fx *= 1.15; }
      if (this.mood === 'sleep') { fx *= 0.7; fy = fy * 0.5 + 5; kx *= 0.8; }
      if (this.state === 'abseil' && l.i === 0 && l.side === 1) { kx = 16; ky = -22; fx = 22 + Math.sin(t * 14) * 6; fy = -32; } // winken
      this.legEls[n].setAttribute('points', `${hx},${hy} ${kx},${ky} ${fx},${fy}`);
    });

    // Gesicht
    const blink = (now % 4200) < 130;
    const closed = this.mood === 'sleep' || blink;
    const big = this.mood === 'surprised';
    this.eyes.forEach((e) => e.setAttribute('ry', closed ? 0.5 : big ? 5.2 : 4.4));
    const lx = Math.max(-1.8, Math.min(1.8, (this.cursor.x - this.x) / 60));
    const ly = Math.max(-1.6, Math.min(1.6, (this.cursor.y - this.y) / 60));
    this.pupils.forEach((p, i) => {
      p.setAttribute('cx', (i ? 4.4 : -4.4) + (walking ? this.face * 1.6 : lx));
      p.setAttribute('cy', -1.6 + (walking ? 0 : ly));
      p.style.opacity = closed ? 0 : 1;
    });
    const mouth = this.mood === 'sleep' ? 'M-2 6 Q0 6.8 2 6'
      : big ? 'M-1.6 6.4 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0'
      : this.mood === 'love' || dancing || air ? 'M-3.4 5.2 Q0 9.5 3.4 5.2'
      : 'M-2.4 5.6 Q0 7.6 2.4 5.6';
    if (this.mouth.getAttribute('d') !== mouth) this.mouth.setAttribute('d', mouth);
    this.root.classList.toggle('sleeping', this.mood === 'sleep');
    this.root.style.setProperty('--zx', `${this.x + 12}px`); this.root.style.setProperty('--zy', `${this.y - 28}px`);
  }
}
