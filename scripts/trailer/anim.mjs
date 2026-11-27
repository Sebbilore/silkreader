// Bewegte Szenen: jedes Bild wird aus der Zeit t berechnet (seek) und als Frame gespeichert.
// node scripts/trailer/anim.mjs <aufnahmen> <logo> <frames-ordner>
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'fs';
import path from 'path';
const [shots, logo, out] = process.argv.slice(2).map((p) => path.resolve(p));
const img = (f) => `file://${shots}/${f}`;
const FPS = 30;
const S = 1.3; // Tempo: alles läuft 30 % schneller
const DUR = [3.5, 4.2, 3.8, 5.8, 4.2, 3.5, 5, 3.5];
const TXT = [['Got a letter you', "don't quite", 'understand?'], ['Just highlight', 'the text.'], ['Tap the spider.'], ['See what matters:', 'how much,', 'and by when.'], ['It can read it', 'out loud, too.'], ['Warns you about', 'scam letters.']];
const CSS = `*{box-sizing:border-box}body{margin:0;width:1920px;height:1080px;position:relative;overflow:hidden;font-family:Inter,sans-serif;background:linear-gradient(135deg,#fbf8f6,#efe8e4)}
.abs{position:absolute}.paper{position:absolute;left:150px;top:60px;width:760px;height:960px;background:#fff;border-radius:6px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:56px 64px;font-size:25px;line-height:1.5;color:#222}
.paper small{color:#777;font-size:18px}.paper h3{font-size:28px;margin:30px 0 20px}.paper p{margin:0 0 16px}
::selection{background:#a8cdfa;color:#111}
.line{position:absolute;left:1130px;font-weight:700;font-size:68px;line-height:1.2;color:#1b1b1f;white-space:nowrap}
.bar{position:absolute;left:1130px;width:90px;height:8px;background:#d6246e}
.popup{position:absolute;left:150px;top:60px;height:960px;filter:drop-shadow(0 12px 30px rgba(0,0,0,.18));transform-origin:0 0}
.spider{position:absolute;left:775px;width:440px;mix-blend-mode:multiply}
.cur{position:absolute;width:34px;z-index:9}.ring{position:absolute;border:4px solid #d6246e;border-radius:50%}
.q{position:absolute;width:64px;height:64px;border-radius:50%;background:#d6246e;color:#fff;font:700 38px/64px Inter;text-align:center}
.c{position:absolute;left:0;width:1920px;text-align:center;font-weight:700;color:#1b1b1f}`;
const arrow = `<svg class="cur" id="cur" viewBox="0 0 24 24"><path d="M3 2l17 9-7.5 2L9 21z" fill="#111" stroke="#fff" stroke-width="1.6"/></svg>`;
const letter = `<div class="paper" id="paper"><small>Stadtwerke Musterstadt GmbH · Postfach 10 20 30 · 12345 Musterstadt</small>
<p style="margin-top:28px">Frau Erika Beispiel<br>Lindenweg 7<br>12345 Musterstadt</p><p style="text-align:right"><small>Musterstadt, 24.11.2026</small></p>
<h3>Zahlungserinnerung zur Rechnung RE-2026-4471</h3><p>Sehr geehrte Frau Beispiel,</p>
<p id="sel">zu unserer Stromrechnung vom 02.11.2026 konnten wir leider noch keinen Zahlungseingang feststellen. Der offene Betrag beträgt 55,00 €. Bitte überweisen Sie den Betrag bis zum 04.12.2026 auf unser Konto.</p>
<p>IBAN: DE89 3704 0044 0532 0130 00<br>Verwendungszweck: RE-2026-4471</p><p>Sollten Sie bereits gezahlt haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.</p><p>Mit freundlichen Grüßen<br>Ihre Stadtwerke Musterstadt</p></div>`;
const spider = `<img class="spider" id="spider" src="${img('spider.png')}">`;
const textHtml = (n) => (TXT[n] || []).map((l, i) => `<div class="line" id="t${i}">${l}</div>`).join('') + '<div class="bar" id="bar"></div>';
// gemeinsame Hilfen (laufen in der Seite)
const JS = `const cl=(x)=>Math.min(1,Math.max(0,x)),eo=(x)=>1-Math.pow(1-cl(x),3),eb=(x)=>{x=cl(x);const c=1.70158+1;return 1+c*Math.pow(x-1,3)+1.70158*Math.pow(x-1,2)},lerp=(a,b,x)=>a+(b-a)*x;
function texts(t,start=0.35){const n=document.querySelectorAll('.line').length;const lh=82;const top=540-(n*lh)/2;document.querySelectorAll('.line').forEach((e,i)=>{const p=eo((t-start-i*0.18)/0.5);e.style.top=(top+i*lh+(1-p)*28)+'px';e.style.opacity=p});const b=document.getElementById('bar');if(b){b.style.top=(top-34)+'px';b.style.opacity=eo((t-start)/0.4);b.style.width=(90*eo((t-start)/0.5))+'px'}}
function curAt(x,y,o=1){const c=document.getElementById('cur');c.style.left=x+'px';c.style.top=y+'px';c.style.opacity=o}
function selTo(n){const p=document.getElementById('sel').firstChild;const s=getSelection();s.removeAllRanges();if(n<=0)return null;const r=document.createRange();r.setStart(p,0);r.setEnd(p,Math.min(n,p.length));s.addRange(r);const q=document.createRange();q.setStart(p,Math.min(n,p.length));q.setEnd(p,Math.min(n,p.length));const rs=r.getClientRects();const l=rs[rs.length-1];return l?{x:l.right,y:l.bottom-6}:null}
function selStart(){const p=document.getElementById('sel').firstChild;const r=document.createRange();r.setStart(p,0);r.setEnd(p,1);const l=r.getClientRects()[0];return{x:l.left,y:l.top+16}}
`;
const SCENES = [
  { body: letter + `<div class="q" id="q1">?</div><div class="q" id="q2">?</div>`, seek: `
    const p=eo(t/0.9);const pa=document.getElementById('paper');pa.style.transform='translateY('+((1-p)*140)+'px) rotate('+((1-p)*-2)+'deg) scale('+(1+0.05*t/4.5)+')';pa.style.opacity=cl(t/0.5);pa.style.transformOrigin='30% 40%';
    const q=(id,s,x,y)=>{const e=document.getElementById(id);const k=eb((t-s)/0.5);e.style.left=x+'px';e.style.top=(y-k*14)+'px';e.style.transform='scale('+k+')';e.style.opacity=k?1:0};q('q1',1.1,980,300);q('q2',1.6,1010,520);texts(t,0.45)` },
  { body: letter + spider + arrow, seek: `
    const ss=selStart();const total=document.getElementById('sel').firstChild.length;
    const moveT=eo(t/1.0);const n=Math.round(total*cl((t-1.0)/2.3));
    const pos=n>0?selTo(n):(selTo(0),null);
    if(pos)curAt(pos.x,pos.y);else curAt(lerp(1000,ss.x,moveT),lerp(800,ss.y,moveT));
    const d=eb((t-3.3)/0.9);const sp=document.getElementById('spider');sp.style.top=(-640+d*640-0)+'px';sp.style.top=(-500+d*500)+'px';
    texts(t,0.5)` },
  { body: letter + spider + `<div class="ring" id="r1"></div><div class="ring" id="r2"></div>` + arrow, seek: `
    selTo(document.getElementById('sel').firstChild.length);
    const from={x:826,y:650},to={x:1000,y:225};const m=eo(t/1.2);curAt(lerp(from.x,to.x,m),lerp(from.y,to.y,m)-Math.sin(m*Math.PI)*40);
    const sq=t>1.3&&t<1.6?0.92:1;const sp=document.getElementById('spider');sp.style.top='0px';sp.style.transformOrigin='50% 20%';sp.style.transform='scale('+sq+')';
    const ring=(id,s,sz)=>{const k=cl((t-s)/0.9);const e=document.getElementById(id);const w=sz*(0.4+k);e.style.width=e.style.height=w+'px';e.style.left=(990-w/2)+'px';e.style.top=(205-w/2)+'px';e.style.opacity=t<s?0:0.7*(1-k)};ring('r1',1.35,240);ring('r2',1.6,240);
    document.getElementById('paper').style.opacity=1-0.35*cl((t-3.6)/1.2);texts(t,0.4)` },
  { body: `<img class="popup" id="p1" src="${img('result.png')}"><img class="popup" id="p2" src="${img('result-bullets.png')}">`, seek: `
    const a=eb(t/0.7);const k=cl(t/0.35);const z=t<4?1+0.3*eo((t-1.2)/2.6):1+0.12*eo((t-4.6)/2.8);
    const sw=eo((t-3.9)/0.6);const base='translateY('+((1-a)*60)+'px) scale('+(0.9+0.1*a)+')';
    const p1=document.getElementById('p1'),p2=document.getElementById('p2');
    for(const e of [p1,p2]){e.style.transformOrigin='0 '+(t<4?'25%':'10%');e.style.transform='scale('+z+') '+base}
    p1.style.opacity=k*(1-sw);p2.style.opacity=k*sw;texts(t,0.6)` },
  { body: `<img class="popup" id="p1" src="${img('readaloud.png')}">`, seek: `
    const a=eb(t/0.7);const z=1+0.3*eo((t-0.9)/3.5);const p1=document.getElementById('p1');p1.style.transformOrigin='0 8%';p1.style.transform='translateY('+((1-a)*60)+'px) scale('+(z*(0.9+0.1*a))+')';p1.style.opacity=cl(t/0.35);texts(t,0.5)` },
  { body: `<img class="popup" id="p1" src="${img('scam.png')}">`, seek: `
    const a=eb(t/0.7);const z=1+0.2*eo((t-1.2)/3);const shake=t>0.9&&t<1.4?Math.sin((t-0.9)*60)*8*(1.4-t)/0.5:0;
    const p1=document.getElementById('p1');p1.style.transformOrigin='0 10%';p1.style.transform='translate('+shake+'px,'+((1-a)*60)+'px) scale('+(z*(0.9+0.1*a))+')';p1.style.opacity=cl(t/0.35);texts(t,0.5)` },
  { body: `<svg class="abs" id="lock" style="left:885px;top:110px" width="150" height="190" viewBox="0 0 24 24" fill="none" stroke="#d6246e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2.5"/><path id="sh" d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
<img class="abs" id="pill" src="${img('zero-bytes.png')}" style="left:690px;top:380px;width:540px;border-radius:16px;box-shadow:0 6px 24px rgba(0,0,0,.14);border:1px solid #e6e0dc">
<div class="c" id="c1" style="top:500px;font-size:76px">Runs on your PC.</div><div class="c" id="c2" style="top:610px;font-size:52px">Your letters aren't sent anywhere.</div>
<div class="c" id="c3" style="top:720px;font-size:36px;font-weight:400;color:#555;line-height:1.35">Only what you highlight is read.<br>No account. No ads. No tracking.</div>`, seek: `
    const L=eb(t/0.6);document.getElementById('lock').style.opacity=cl(t/0.3);document.getElementById('lock').style.transform='scale('+(0.7+0.3*L)+')';
    document.getElementById('sh').style.transform='translateY('+(-3*(1-eb((t-0.7)/0.4)))+'px)';
    const f=(id,s,y)=>{const p=eo((t-s)/0.5);const e=document.getElementById(id);e.style.opacity=p;e.style.transform='translateY('+((1-p)*26)+'px)'};f('c1',0.5);f('c2',1.1);f('c3',2.0);
    const pl=eb((t-1.5)/0.6);const pe=document.getElementById('pill');pe.style.opacity=cl((t-1.5)/0.3);pe.style.transform='translateY('+((1-pl)*30)+'px)'` },
  { body: `<div class="abs" id="th" style="left:959px;top:0;width:2px;background:#555"></div><img class="abs" id="logo" src="file://${logo}" style="left:830px;width:260px;border-radius:52px;box-shadow:0 12px 40px rgba(0,0,0,.2)">
<div class="c" id="c1" style="top:460px;font-size:88px">Silkreader</div><div class="c" id="c2" style="top:580px;font-size:56px;font-weight:500;color:#d6246e">Understand your letters.</div>
<div class="c" id="c3" style="top:670px;font-size:38px;font-weight:400;color:#444">Free on the Microsoft Store.</div><div class="c" id="c4" style="top:990px;font-size:24px;font-weight:400;color:#777">AI can make mistakes. Please check amounts and deadlines in the original.</div>`, seek: `
    const d=eb(t/0.9);const y=-260+d*400;document.getElementById('logo').style.top=y+'px';document.getElementById('th').style.height=(y+10)+'px';
    const f=(id,s)=>{const p=eo((t-s)/0.5);const e=document.getElementById(id);e.style.opacity=p;e.style.transform='translateY('+((1-p)*26)+'px)'};f('c1',0.7);f('c2',1.1);f('c3',1.6);f('c4',1.9)` },
];
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1920, height: 1080 } });
const only = process.env.ONLY ? process.env.ONLY.split(',').map(Number) : null;
for (let i = 0; i < SCENES.length; i++) {
  if (only && !only.includes(i + 1)) continue;
  const dir = `${out}/s${i + 1}`; fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(`${out}/s${i + 1}.html`, `<meta charset="utf-8"><style>${CSS}</style><body>${SCENES[i].body}${i < 6 ? textHtml(i) : ''}<script>${JS}window.seek=(t)=>{${SCENES[i].seek}}</script></body>`);
  await pg.goto(`file://${out}/s${i + 1}.html`); await pg.waitForTimeout(500);
  const N = Math.round(DUR[i] * FPS);
  for (let f = 0; f < N; f++) {
    await pg.evaluate((t) => window.seek(t), (f / FPS) * S);
    await pg.screenshot({ path: `${dir}/${String(f).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 93 });
  }
  console.log('Szene', i + 1, N, 'Bilder');
}
await b.close();
