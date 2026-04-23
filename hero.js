// ══════════════════════════════════════════════════════
//  PLUGINS
// ══════════════════════════════════════════════════════
gsap.registerPlugin(ScrollTrigger);

// Pause RAF loops when tab is hidden
let _tabVisible = true;
document.addEventListener('visibilitychange', () => { _tabVisible = !document.hidden; });

// ══════════════════════════════════════════════════════
//  CUSTOM CURSOR — dot + lagging ring, no trail
// ══════════════════════════════════════════════════════
const cur  = document.getElementById('cur');
const ring = document.getElementById('cring');
const M    = { x: innerWidth / 2, y: innerHeight / 2 };
let rx = innerWidth / 2, ry = innerHeight / 2;

window.addEventListener('mousemove', e => { M.x = e.clientX; M.y = e.clientY; }, { passive: true });

(function cursorLoop() {
  requestAnimationFrame(cursorLoop);
  rx += (M.x - rx) * 0.11;
  ry += (M.y - ry) * 0.11;
  cur.style.left  = M.x + 'px';
  cur.style.top   = M.y + 'px';
  ring.style.left = rx  + 'px';
  ring.style.top  = ry  + 'px';
})();

document.querySelectorAll('a,button,.finput,select').forEach(el => {
  el.addEventListener('mouseenter', () => document.body.classList.add('ch'));
  el.addEventListener('mouseleave', () => document.body.classList.remove('ch'));
});

// ══════════════════════════════════════════════════════
//  STREET PARTICLES — red dots flowing along lit streets
// ══════════════════════════════════════════════════════
(function initStreetParticles() {
  const canvas = document.getElementById('spc');
  const ctx    = canvas.getContext('2d');
  let W = canvas.width  = innerWidth;
  let H = canvas.height = innerHeight;

  const GW = 440;
  let   GH = Math.round(GW * H / W);
  let   grid      = null;
  let   streetIdx = [];
  let   particles = [];
  let   mouseX = -9999, mouseY = -9999;

  window.addEventListener('resize', () => {
    W = canvas.width  = innerWidth;
    H = canvas.height = innerHeight;
  });
  window.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

  const img = new Image();
  img.src = 'images/hero-bg.jpg';
  img.onload = function () {
    GH = Math.round(GW * H / W);

    const scale = Math.max(GW / img.naturalWidth, GH / img.naturalHeight);
    const dW = img.naturalWidth  * scale;
    const dH = img.naturalHeight * scale;
    const dX = (GW - dW) / 2;
    const dY = (GH - dH) / 2;

    const off  = document.createElement('canvas');
    off.width  = GW; off.height = GH;
    const octx = off.getContext('2d');
    octx.drawImage(img, dX, dY, dW, dH);
    const px = octx.getImageData(0, 0, GW, GH).data;

    // Bright-street threshold — the Bucharest night photo has glowing lit roads
    const raw = new Uint8Array(GW * GH);
    for (let i = 0; i < px.length; i += 4) {
      const lum = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      if (lum > 120) raw[i >> 2] = 1;
    }

    // Erosion — keep only pixels where ≥2 neighbours are also bright (thinner lines ok)
    grid      = new Uint8Array(GW * GH);
    streetIdx = [];
    for (let y = 1; y < GH - 1; y++) {
      for (let x = 1; x < GW - 1; x++) {
        if (!raw[y * GW + x]) continue;
        let n = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            if (dx || dy) n += raw[(y + dy) * GW + (x + dx)];
        if (n >= 2) { grid[y * GW + x] = 1; streetIdx.push(y * GW + x); }
      }
    }

    for (let i = 0; i < 28; i++) particles.push(new Dot());
    loop();
  };

  function randCell() {
    return streetIdx[Math.floor(Math.random() * streetIdx.length)];
  }
  function toScreen(gx, gy) {
    return { x: (gx + 0.5) / GW * W, y: (gy + 0.5) / GH * H };
  }

  class Dot {
    constructor() {
      this.size  = 1.8 + Math.random() * 1.6;
      this.speed = 0.28 + Math.random() * 0.14;
      this.alpha = 0.72 + Math.random() * 0.28;

      const a  = Math.random() * Math.PI * 2;
      this.dx  = Math.cos(a);
      this.dy  = Math.sin(a);

      const c  = randCell();
      this.gx  = c % GW;
      this.gy  = Math.floor(c / GW);

      const s  = toScreen(this.gx, this.gy);
      this.x   = s.x;  this.y  = s.y;
      this.tx  = s.x;  this.ty = s.y;
      this.rx  = s.x;  this.ry = s.y;

      this._pickNext();
    }

    _pickNext() {
      const flee = Math.hypot(this.x - mouseX, this.y - mouseY) < 140;
      const nbrs = [];

      for (let ddx = -1; ddx <= 1; ddx++) {
        for (let ddy = -1; ddy <= 1; ddy++) {
          if (!ddx && !ddy) continue;
          const nx = this.gx + ddx, ny = this.gy + ddy;
          if (nx < 0 || nx >= GW || ny < 0 || ny >= GH) continue;
          if (!grid[ny * GW + nx]) continue;

          const len   = Math.sqrt(ddx * ddx + ddy * ddy);
          const align = (ddx / len) * this.dx + (ddy / len) * this.dy;
          let w = Math.max(0.01, align + 0.55);

          if (flee) {
            const { x: sx, y: sy } = toScreen(nx, ny);
            const away = (sx - mouseX) * this.dx + (sy - mouseY) * this.dy;
            if (away > 0) w *= 2.2;
          }

          nbrs.push({ nx, ny, ddx, ddy, len, w });
        }
      }

      if (!nbrs.length) {
        this.dx = -this.dx; this.dy = -this.dy;
        const c = randCell();
        this.gx = c % GW; this.gy = Math.floor(c / GW);
        const s = toScreen(this.gx, this.gy);
        this.x = s.x; this.y = s.y; this.tx = s.x; this.ty = s.y;
        this.rx = s.x; this.ry = s.y;
        this._pickNext();
        return;
      }

      nbrs.sort((a, b) => b.w - a.w);
      const chosen = (Math.random() < 0.88 || nbrs.length === 1)
        ? nbrs[0]
        : nbrs[Math.min(1, nbrs.length - 1)];

      this.gx = chosen.nx;
      this.gy = chosen.ny;
      const t = toScreen(this.gx, this.gy);
      this.tx = t.x; this.ty = t.y;

      const nl = chosen.len;
      this.dx = this.dx * 0.94 + (chosen.ddx / nl) * 0.06;
      this.dy = this.dy * 0.94 + (chosen.ddy / nl) * 0.06;
      const dl = Math.sqrt(this.dx * this.dx + this.dy * this.dy) || 1;
      this.dx /= dl; this.dy /= dl;
    }

    update() {
      const dx = this.tx - this.x;
      const dy = this.ty - this.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 1;

      if (d < this.speed + 0.15) {
        this.x = this.tx; this.y = this.ty;
        this._pickNext();
      } else {
        this.x += (dx / d) * this.speed;
        this.y += (dy / d) * this.speed;
      }

      this.rx += (this.x - this.rx) * 0.14;
      this.ry += (this.y - this.ry) * 0.14;
    }

    draw() {
      ctx.beginPath();
      ctx.arc(this.rx, this.ry, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(60,148,255,${this.alpha})`;
      ctx.fill();
    }
  }

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(loop);
  }
})();

// ══════════════════════════════════════════════════════
//  SCROLL-DRIVEN MAP ZOOM — CSS scale + vignette + flash
// ══════════════════════════════════════════════════════
(function initMapZoom() {
  const mapEl   = document.getElementById('map-global');
  const overlay = document.getElementById('map-overlay');
  const flashEl = document.getElementById('section-flash');
  if (!mapEl) return;

  // Section entry camera-flash effect
  if (flashEl && typeof IntersectionObserver !== 'undefined') {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting && e.intersectionRatio >= 0.55) {
          gsap.fromTo(flashEl,
            { opacity: 0.18 },
            { opacity: 0, duration: 0.85, ease: 'power3.out' }
          );
        }
      });
    }, { threshold: 0.55 });
    document.querySelectorAll('.sec').forEach(s => obs.observe(s));
  }

  let targetScale  = 1;
  let displayScale = 1;

  // Cursor parallax — 3 depth layers
  let tpx = 0, tpy = 0;   // target parallax
  let cpx = 0, cpy = 0;   // current position
  let vx  = 0, vy  = 0;   // velocity — physics-based, no sudden starts
  const spc = document.getElementById('spc');

  let scrollP    = 0;
  let curOx = 50, curOy = 50;

  window.addEventListener('mousemove', e => {
    const nx = (e.clientX / innerWidth  - 0.5) * 2;
    const ny = (e.clientY / innerHeight - 0.5) * 2;
    tpx = nx * -6;
    tpy = ny * -3.9;
  }, { passive: true });

  function onScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    scrollP = maxScroll > 0 ? Math.min(window.scrollY / maxScroll, 1) : 0;
    targetScale = 1 + scrollP * 1.5;

    if (overlay) {
      const vig = (scrollP * 0.65).toFixed(3);
      overlay.style.background =
        `radial-gradient(ellipse 80% 80% at 50% 48%,transparent 20%,rgba(0,8,40,${vig}) 100%)`;
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  (function zoomLoop() {
    requestAnimationFrame(zoomLoop);
    displayScale += (targetScale - displayScale) * 0.07;
    // Velocity-based spring: gentle acceleration + friction = no sudden jumps
    vx += (tpx - cpx) * 0.004;  vy += (tpy - cpy) * 0.004;
    vx *= 0.88;                  vy *= 0.88;
    cpx += vx;                   cpy += vy;

    // Camera dive: transform-origin migrates from center → ring road intersection (63%, 56%)
    const tOx = 50 + scrollP * 13;
    const tOy = 50 + scrollP *  6;
    curOx += (tOx - curOx) * 0.04;
    curOy += (tOy - curOy) * 0.04;
    mapEl.style.transformOrigin = `${curOx.toFixed(2)}% ${curOy.toFixed(2)}%`;

    // Layer 1: background — slow drift
    mapEl.style.transform = `scale(${displayScale.toFixed(4)}) translate(${cpx.toFixed(2)}px,${cpy.toFixed(2)}px)`;
    // Layer 2: street particles — 2.8× faster (mid depth)
    if (spc) spc.style.transform = `translate(${(-cpx * 2.8).toFixed(2)}px,${(-cpy * 2.8).toFixed(2)}px)`;
  })();
})();

// ══════════════════════════════════════════════════════
//  3D BUTTONS — TILT + MAGNETIC
// ══════════════════════════════════════════════════════
function initButtons() {
  const BTN_REST  = '0 6px 24px rgba(0,0,0,0.65),inset 0 1px 0 rgba(100,170,255,0.3)';
  const BTN_HOVER = '0 16px 48px rgba(0,0,0,0.75),0 8px 32px rgba(26,106,232,0.55),inset 0 1px 0 rgba(150,200,255,0.4)';

  document.querySelectorAll('.hbtn').forEach(btn => {

    btn.addEventListener('mouseenter', () => {
      gsap.to(btn, {
        y: -5, duration: 0.22, ease: 'power2.out',
        color: '#ffffff',
        boxShadow: BTN_HOVER,
      });
    });

    btn.addEventListener('mousemove', e => {
      const r  = btn.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      gsap.to(btn, {
        rotateX: -dy * 7.2, rotateY: dx * 7.2,
        x: dx * 6, y: dy * 3 - 5,
        duration: 0.18, ease: 'power2.out',
        transformPerspective: 600, transformOrigin: 'center center',
      });
    });

    btn.addEventListener('mouseleave', () => {
      gsap.to(btn, {
        rotateX: 0, rotateY: 0, x: 0, y: 0,
        duration: 0.7, ease: 'elastic.out(1, 0.45)',
        color: '#ffffff',
        boxShadow: BTN_REST,
      });
    });

    btn.addEventListener('click', () => {
      btn.blur(); // prevent Safari focus ring
      const id = btn.getAttribute('data-target');
      const el = id ? document.querySelector(id) : null;
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    });

    /* prevent focus ring on mouse click (keyboard focus still works) */
    btn.addEventListener('mousedown', e => e.preventDefault());
  });
}

// ══════════════════════════════════════════════════════
//  CARD GEOMETRIC BACKGROUND — road network + cursor
// ══════════════════════════════════════════════════════
(function initCardBackground() {
  const card = document.getElementById('card');
  if (!card) return;

  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;';
  card.insertBefore(cvs, card.firstChild);

  const ctx = cvs.getContext('2d');
  let W = 0, H = 0;
  let mx = -9999, my = -9999;
  const ripples = [];

  function resize() {
    const r = card.getBoundingClientRect();
    W = cvs.width  = Math.round(r.width);
    H = cvs.height = Math.round(r.height);
  }

  card.addEventListener('mousemove', e => {
    const r = card.getBoundingClientRect();
    mx = e.clientX - r.left;
    my = e.clientY - r.top;
  });
  card.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });
  card.addEventListener('mousedown', e => {
    const r = card.getBoundingClientRect();
    ripples.push({ x: e.clientX - r.left, y: e.clientY - r.top, r: 0, a: 0.35 });
  });

  // Road network nodes (normalised 0-1)
  const NP = [
    [0.05,0.12],[0.28,0.07],[0.5,0.04],[0.72,0.07],[0.95,0.12], // row top
    [0.05,0.42],[0.22,0.38],[0.38,0.35],[0.62,0.35],[0.78,0.38],[0.95,0.42], // row mid-top
    [0.5,0.5],                                                                // centre
    [0.05,0.62],[0.22,0.66],[0.38,0.68],[0.62,0.68],[0.78,0.66],[0.95,0.62], // row mid-bot
    [0.05,0.9],[0.28,0.93],[0.5,0.96],[0.72,0.93],[0.95,0.9],   // row bottom
  ];

  // Edges between nodes
  const ED = [
    [0,1],[1,2],[2,3],[3,4],           // top road
    [5,6],[6,7],[7,11],[11,8],[8,9],[9,10], // mid-top road through centre
    [12,13],[13,14],[14,11],[11,15],[15,16],[16,17], // mid-bot road through centre
    [18,19],[19,20],[20,21],[21,22],   // bottom road
    [0,5],[5,12],[12,18],              // left vertical
    [4,10],[10,17],[17,22],            // right vertical
    [1,6],[2,7],[3,8],                 // top-to-midtop diagonals
    [6,13],[7,14],[8,15],[9,16],       // midtop-to-midbot
    [13,19],[14,20],[15,21],[16,21],   // midbot-to-bottom
  ];

  // Small speed-direction chevrons along each edge
  function drawChevron(ax, ay, bx, by, t) {
    const dx = bx - ax, dy = by - ay;
    const len = Math.sqrt(dx*dx+dy*dy) || 1;
    const ux = dx/len, uy = dy/len;
    const mx2 = (ax+bx)/2, my2 = (ay+by)/2;
    const s = 4;
    ctx.save();
    ctx.translate(mx2, my2);
    ctx.rotate(Math.atan2(uy, ux));
    ctx.beginPath();
    ctx.moveTo(-s, -s*0.6);
    ctx.lineTo(0, 0);
    ctx.lineTo(-s, s*0.6);
    ctx.strokeStyle = `rgba(0,0,0,${0.06 + t*0.1})`;
    ctx.lineWidth = 0.7;
    ctx.stroke();
    ctx.restore();
  }

  function draw() {
    requestAnimationFrame(draw);
    if (!W) { resize(); return; }
    ctx.clearRect(0, 0, W, H);

    const cursorOn = mx > 0 && mx < W && my > 0 && my < H;
    const pxOff = cursorOn ? (mx / W - 0.5) * 10 : 0;
    const pyOff = cursorOn ? (my / H - 0.5) * 4 : 0;

    // ── Speed lines (ultra-faint horizontal, parallax shift)
    ctx.lineWidth = 0.4;
    for (let i = 0; i <= 14; i++) {
      const y = (i / 14) * H + pyOff * (0.5 - i/14);
      const xOff = pxOff * (0.5 - i/14);
      ctx.beginPath();
      ctx.moveTo(-10 + xOff, y);
      ctx.lineTo(W + 10 + xOff, y);
      ctx.strokeStyle = `rgba(0,0,0,${0.028 + (i%3===0 ? 0.018 : 0)})`;
      ctx.stroke();
    }

    // ── Corner roundabout arcs
    const arcR = Math.min(W, H) * 0.26;
    [
      [0,   0,   0,           Math.PI*0.5 ],
      [W,   0,   Math.PI*0.5, Math.PI     ],
      [0,   H,  -Math.PI*0.5, 0           ],
      [W,   H,   Math.PI,     Math.PI*1.5 ],
    ].forEach(([cx, cy, sa, ea]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, arcR, sa, ea);
      ctx.strokeStyle = 'rgba(0,0,0,0.042)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(cx, cy, arcR * 0.72, sa, ea);
      ctx.strokeStyle = 'rgba(0,0,0,0.028)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    });

    // ── Centre roundabout circle
    const cRing = Math.min(W, H) * 0.09;
    const centX = W * NP[11][0], centY = H * NP[11][1];
    ctx.beginPath();
    ctx.arc(centX + pxOff*0.3, centY + pyOff*0.3, cRing, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 0.9;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centX + pxOff*0.3, centY + pyOff*0.3, cRing * 0.6, 0, Math.PI*2);
    ctx.strokeStyle = 'rgba(26,90,200,0.055)';
    ctx.lineWidth = 0.7;
    ctx.stroke();

    // ── Edges
    ED.forEach(([ai, bi]) => {
      const [anx, any] = NP[ai], [bnx, bny] = NP[bi];
      const ax = anx*W + pxOff*0.4, ay = any*H + pyOff*0.4;
      const bx = bnx*W + pxOff*0.4, by = bny*H + pyOff*0.4;
      const edgeMidDist = Math.min(
        Math.hypot(mx - (ax+bx)/2, my - (ay+by)/2),
        Math.hypot(mx - ax, my - ay),
        Math.hypot(mx - bx, my - by)
      );
      const t = cursorOn ? Math.max(0, 1 - edgeMidDist/110) : 0;

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.strokeStyle = t > 0
        ? `rgba(26,90,200,${0.04 + t*0.16})`
        : 'rgba(0,0,0,0.048)';
      ctx.lineWidth = 0.55 + t * 1.1;
      ctx.stroke();

      if (t > 0.1) drawChevron(ax, ay, bx, by, t);
    });

    // ── Nodes
    NP.forEach(([nx, ny]) => {
      const px = nx*W + pxOff*0.5, py = ny*H + pyOff*0.5;
      const dist = Math.hypot(mx - px, my - py);
      const t = cursorOn ? Math.max(0, 1 - dist/90) : 0;

      if (t > 0) {
        const grd = ctx.createRadialGradient(px, py, 0, px, py, 55*t);
        grd.addColorStop(0, `rgba(26,106,232,${0.10*t})`);
        grd.addColorStop(1, 'rgba(26,106,232,0)');
        ctx.fillStyle = grd;
        ctx.beginPath();
        ctx.arc(px, py, 55, 0, Math.PI*2);
        ctx.fill();
      }

      // Outer ring
      ctx.beginPath();
      ctx.arc(px, py, 4 + t*3, 0, Math.PI*2);
      ctx.strokeStyle = t > 0.05
        ? `rgba(26,106,232,${0.18*t})`
        : 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 0.7;
      ctx.stroke();

      // Dot
      ctx.beginPath();
      ctx.arc(px, py, 1.8 + t*2.2, 0, Math.PI*2);
      ctx.fillStyle = t > 0.05
        ? `rgba(26,106,232,${0.3 + t*0.55})`
        : 'rgba(0,0,0,0.14)';
      ctx.fill();
    });

    // ── Cursor proximity rings
    if (cursorOn) {
      [30, 65].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(mx, my, r, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(26,106,232,${0.07 - i*0.02})`;
        ctx.lineWidth = 0.7;
        ctx.stroke();
      });
    }

    // ── Click ripples
    for (let i = ripples.length - 1; i >= 0; i--) {
      const rp = ripples[i];
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI*2);
      ctx.strokeStyle = `rgba(26,106,232,${rp.a})`;
      ctx.lineWidth = 1;
      ctx.stroke();
      rp.r += 2.5; rp.a *= 0.94;
      if (rp.a < 0.01) ripples.splice(i, 1);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  draw();
})();

// ══════════════════════════════════════════════════════
//  HERO ENTRANCE TIMELINE
// ══════════════════════════════════════════════════════
gsap.to('#hbtns', { opacity: 1, y: 0,  duration: 0.7,  delay: 0.15, ease: 'power3.out' });
gsap.to('#card',  { opacity: 1, y: 0,  duration: 1.0,  delay: 0.28, ease: 'power3.out' });
gsap.to('#ey',    { opacity: 1, y: 0,  duration: 0.7,  delay: 0.55, ease: 'power3.out' });
gsap.to('#hl',    { opacity: 1, y: 0,  duration: 1.0,  delay: 0.72, ease: 'power3.out' });
gsap.to('#sub',   { opacity: 1, y: 0,  duration: 0.65, delay: 1.05, ease: 'power3.out' });
gsap.to('#rform', { opacity: 1, y: 0,  duration: 0.8,  delay: 1.2,  ease: 'power3.out' });
gsap.to('#bbar',  { opacity: 1, y: 0,  duration: 0.7,  delay: 1.45, ease: 'power3.out' });

gsap.delayedCall(1.4, initButtons);

// ══════════════════════════════════════════════════════
//  SCROLL REVEAL — .reveal-up
// ══════════════════════════════════════════════════════
document.querySelectorAll('.reveal-up').forEach(el => {
  const delay = parseFloat(el.dataset.delay || 0);
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.28,
    delay,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 88%',
      toggleActions: 'play none none none',
    },
  });
});

// ══════════════════════════════════════════════════════
//  COUNT-UP — .stat-num[data-count]
// ══════════════════════════════════════════════════════
document.querySelectorAll('.stat-num[data-count]').forEach(el => {
  const target = parseInt(el.dataset.count, 10);
  const suffix = el.innerHTML.replace(/[0-9]/g, '');
  const obj    = { val: 0 };

  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => {
      gsap.to(obj, {
        val: target,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => { el.innerHTML = Math.round(obj.val) + suffix; },
      });
    },
  });
});

// ══════════════════════════════════════════════════════
//  TEXT SCRAMBLE — section headings on scroll-in
// ══════════════════════════════════════════════════════
const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#@!';

function scrambleTo(el) {
  const final = el.textContent;
  let frame = 0;
  const total = final.length * 3;
  const tick = setInterval(() => {
    el.textContent = final
      .split('')
      .map((c, i) => {
        if (c === ' ') return ' ';
        if (i < frame / 3) return c;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      })
      .join('');
    frame++;
    if (frame > total) { el.textContent = final; clearInterval(tick); }
  }, 23);
}

document.querySelectorAll('.sec-title').forEach(el => {
  ScrollTrigger.create({
    trigger: el,
    start: 'top 85%',
    once: true,
    onEnter: () => scrambleTo(el),
  });
});

// ══════════════════════════════════════════════════════
//  WORD-BY-WORD REVEAL — section descriptions
// ══════════════════════════════════════════════════════
document.querySelectorAll('.sec-desc').forEach(el => {
  const words = el.textContent.trim().split(' ');
  el.innerHTML = words
    .map(w => `<span class="word-wrap"><span class="word">${w}</span></span>`)
    .join(' ');

  const spans = el.querySelectorAll('.word');
  gsap.to(spans, {
    opacity: 1,
    y: 0,
    duration: 0.47,
    stagger: 0.033,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 86%',
      toggleActions: 'play none none none',
    },
  });
});

// Cursor spotlight removed — dark sections use uniform background

// ══════════════════════════════════════════════════════
//  MAGNETIC EFFECT — CTA buttons + fleet buttons
// ══════════════════════════════════════════════════════
document.querySelectorAll('.cta-big-btn, .contact-phone, .fleet-btn:not(.fleet-btn--busy)').forEach(el => {
  el.addEventListener('mousemove', e => {
    const r  = el.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    gsap.to(el, { x: dx * 7, y: dy * 5, duration: 0.2, ease: 'power2.out' });
  });
  el.addEventListener('mouseleave', () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.5, ease: 'elastic.out(1,0.5)' });
  });
});

// ══════════════════════════════════════════════════════
//  STAT CARD TILT
// ══════════════════════════════════════════════════════
document.querySelectorAll('.stat-card, .testi-card').forEach(card => {
  card.addEventListener('mousemove', e => {
    const r  = card.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    gsap.to(card, {
      rotateX: -dy * 4.8, rotateY: dx * 4.8,
      duration: 0.2, ease: 'power2.out',
      transformPerspective: 800, transformOrigin: 'center center',
    });
  });
  card.addEventListener('mouseleave', () => {
    gsap.to(card, { rotateX: 0, rotateY: 0, duration: 0.6, ease: 'elastic.out(1,0.4)' });
  });
});

// ══════════════════════════════════════════════════════
//  STEP ICONS — scale + color on hover (non-cum sections)
// ══════════════════════════════════════════════════════
document.querySelectorAll('.step').forEach(step => {
  const icon = step.querySelector('.step-icon');
  if (icon) {
    step.addEventListener('mouseenter', () => {
      gsap.to(icon, { scale: 1.15, duration: 0.25, ease: 'back.out(2)' });
    });
    step.addEventListener('mouseleave', () => {
      gsap.to(icon, { scale: 1, duration: 0.4, ease: 'elastic.out(1,0.5)' });
    });
  }
});

// ══════════════════════════════════════════════════════
//  CUM-FUNCTIONEAZA — liquid glass depth split
//  On hover: title floats forward (Z+50), desc mid-layer
//  (Z+25), card lifts + deepens shadow. Elastic snap-back.
// ══════════════════════════════════════════════════════
document.querySelectorAll('#cum-functioneaza .step').forEach((card, idx) => {
  const title = card.querySelector('.step-title');
  const desc  = card.querySelector('.step-desc');

  gsap.set(card,  { transformPerspective: 900, transformStyle: 'preserve-3d' });
  gsap.set(title, { transformStyle: 'preserve-3d', z: 0 });
  gsap.set(desc,  { transformStyle: 'preserve-3d', z: 0 });

  card.addEventListener('mouseenter', () => {
    /* card lifts — no tilt, pure Z elevation */
    gsap.to(card, {
      y: -10, scale: 1.03,
      boxShadow: [
        '0 32px 80px rgba(26,106,232,.55)',
        '0 0 48px rgba(100,180,255,.22)',
        'inset 0 1px 0 rgba(255,255,255,.5)',
        'inset 0 -1px 0 rgba(0,0,0,.14)',
        'inset 1px 0 0 rgba(255,255,255,.25)',
        'inset -1px 0 0 rgba(255,255,255,.14)',
      ].join(','),
      duration: 0.55, ease: 'power3.out',
    });
    /* title floats to front layer */
    gsap.to(title, {
      z: 52,
      textShadow: '0 6px 24px rgba(255,255,255,.45), 0 2px 8px rgba(0,0,60,.3)',
      duration: 0.55, ease: 'power3.out',
    });
    /* desc to mid layer */
    gsap.to(desc, {
      z: 26,
      duration: 0.55, ease: 'power3.out',
    });
  });

  card.addEventListener('mouseleave', () => {
    gsap.to(card, {
      y: 0, scale: 1,
      boxShadow: [
        '0 12px 48px rgba(26,106,232,.32)',
        'inset 0 1px 0 rgba(255,255,255,.38)',
        'inset 0 -1px 0 rgba(0,0,0,.12)',
        'inset 1px 0 0 rgba(255,255,255,.18)',
        'inset -1px 0 0 rgba(255,255,255,.10)',
      ].join(','),
      duration: 0.9, ease: 'elastic.out(1, 0.45)',
    });
    gsap.to(title, {
      z: 0, textShadow: 'none',
      duration: 0.9, ease: 'elastic.out(1, 0.45)',
    });
    gsap.to(desc, {
      z: 0,
      duration: 0.9, ease: 'elastic.out(1, 0.45)',
    });
  });
});

// ══════════════════════════════════════════════════════
//  BENEFIT ROW — icon bounce on hover
// ══════════════════════════════════════════════════════
document.querySelectorAll('.benefit').forEach(b => {
  b.addEventListener('mouseenter', () => {
    gsap.to(b.querySelector('.benefit-icon'), { scale: 1.2, rotate: 8, duration: 0.3, ease: 'back.out(2)' });
  });
  b.addEventListener('mouseleave', () => {
    gsap.to(b.querySelector('.benefit-icon'), { scale: 1, rotate: 0, duration: 0.4, ease: 'elastic.out(1,0.5)' });
  });
});

// ══════════════════════════════════════════════════════
//  FLEET CARD HOVER BORDER
// ══════════════════════════════════════════════════════
/* fleet card border handled by CSS conic-gradient animation */

// ══════════════════════════════════════════════════════
//  HERO CARD — 3D TILT + HOLOGRAPHIC SHEEN
// ══════════════════════════════════════════════════════
(function initHeroCardTilt() {
  const hero = document.getElementById('hero');
  const card = document.getElementById('card');
  if (!hero || !card) return;

  card.style.willChange = 'transform';

  let tx = 0, ty = 0;   // target rotateX/Y
  let cx = 0, cy = 0;   // current (lerped)
  let inside = false;

  hero.addEventListener('mousemove', e => {
    inside = true;
    const r  = card.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    tx = dx *  0.67;
    ty = dy * -0.53;
  });

  hero.addEventListener('mouseleave', () => {
    inside = false;
    tx = 0; ty = 0;
  });

  (function tiltLoop() {
    requestAnimationFrame(tiltLoop);
    cx += (tx - cx) * 0.09;
    cy += (ty - cy) * 0.09;
    card.style.transform =
      `perspective(900px) rotateY(${cx.toFixed(3)}deg) rotateX(${cy.toFixed(3)}deg) translateZ(0)`;
  })();
})();

// ══════════════════════════════════════════════════════
//  CONTACT POPUP
// ══════════════════════════════════════════════════════
(function initPopup() {
  const popup  = document.getElementById('phone-popup');
  const btn    = document.getElementById('contact-popup-btn');
  const closeB = document.getElementById('popup-close');
  if (!popup || !btn) return;

  function open() {
    popup.classList.add('open');
    popup.setAttribute('aria-hidden', 'false');
  }
  function close() {
    popup.classList.remove('open');
    popup.setAttribute('aria-hidden', 'true');
  }

  btn.addEventListener('click', open);
  closeB.addEventListener('click', close);
  popup.addEventListener('click', e => { if (e.target === popup) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
})();

// ══════════════════════════════════════════════════════
//  SPLIT-TEXT SECTION TITLES — char-by-char fly-in
// ══════════════════════════════════════════════════════
(function initSplitText() {
  const titles = document.querySelectorAll('.sec-title');

  titles.forEach(el => {
    const text = el.innerHTML;
    // Wrap each char in a span, preserve HTML tags
    el.innerHTML = text.replace(/(<[^>]+>)|([^<])/g, (m, tag, char) => {
      if (tag) return tag;
      if (char === ' ') return '<span class="char" style="display:inline-block;width:.28em"> </span>';
      return `<span class="char">${char}</span>`;
    });

    const chars = el.querySelectorAll('.char');

    // Set initial state
    gsap.set(chars, {
      opacity: 0,
      y: () => (Math.random() > 0.5 ? -40 : 40) * (0.5 + Math.random()),
      x: () => (Math.random() - 0.5) * 30,
      rotation: () => (Math.random() - 0.5) * 22,
    });

    ScrollTrigger.create({
      trigger: el,
      start: 'top 82%',
      once: true,
      onEnter() {
        gsap.to(chars, {
          opacity: 1, y: 0, x: 0, rotation: 0,
          duration: 0.056,
          ease: 'back.out(1.4)',
          stagger: { each: 0.003, from: 'start' },
        });
        // Red underline draws after chars land
        gsap.fromTo(el, { '--ul': '0%' }, {
          '--ul': '100%',
          duration: 0.2,
          delay: chars.length * 0.003 + 0.012,
          ease: 'power3.out',
        });
      },
    });
  });
})();

// ══════════════════════════════════════════════════════
//  COMMAND CENTER MAP — 3D tilt on cursor
// ══════════════════════════════════════════════════════
(function initCmdMap() {
  const wrap = document.getElementById('cmd-map');
  if (!wrap) return;
  const frame = wrap.querySelector('.cmd-map-frame');
  let tx = 0, ty = 0, cx = 0, cy = 0;

  wrap.addEventListener('mousemove', e => {
    const r  = frame.getBoundingClientRect();
    const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
    const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
    tx = dx * 4.8; ty = -dy * 3.6;
  });
  wrap.addEventListener('mouseleave', () => { tx = 0; ty = 0; });

  (function loop() {
    requestAnimationFrame(loop);
    cx += (tx - cx) * 0.08; cy += (ty - cy) * 0.08;
    frame.style.transform =
      `perspective(900px) rotateY(${cx.toFixed(3)}deg) rotateX(${cy.toFixed(3)}deg)`;
  })();

  // GSAP reveal — map slides in from left
  ScrollTrigger.create({
    trigger: wrap, start: 'top 80%', once: true,
    onEnter() {
      gsap.fromTo(frame,
        { opacity:0, x:-40, rotateY:-12 },
        { opacity:1, x:0,   rotateY:0, duration:1.1, ease:'power3.out' }
      );
    }
  });
})();

// ══════════════════════════════════════════════════════
//  MAGNETIC FOOTER LOGO — 3D tilt + red glow on proximity
// ══════════════════════════════════════════════════════
(function initFooterLogo() {
  const logo = document.getElementById('footer-logo');
  if (!logo) return;

  const RADIUS = 160; // magnetic field px

  window.addEventListener('mousemove', e => {
    const r  = logo.getBoundingClientRect();
    const lx = r.left + r.width  / 2;
    const ly = r.top  + r.height / 2;
    const dx = e.clientX - lx;
    const dy = e.clientY - ly;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > RADIUS) {
      gsap.to(logo, {
        x: 0, y: 0, rotateX: 0, rotateY: 0,
        textShadow: 'none',
        duration: 0.7, ease: 'elastic.out(1, 0.45)',
        transformPerspective: 600,
      });
      return;
    }

    const strength = 1 - dist / RADIUS;           // 0 at edge, 1 at center
    const pull     = strength * 14;               // max 14px magnetic pull
    const tiltX    = (dy / RADIUS) * -7.2 * strength;
    const tiltY    = (dx / RADIUS) *  7.2 * strength;
    const glow     = (strength * 28).toFixed(0);

    gsap.to(logo, {
      x: (dx / dist) * pull,
      y: (dy / dist) * pull,
      rotateX: tiltX, rotateY: tiltY,
      textShadow: `0 0 ${glow}px rgba(26,106,232,${(strength * 0.85).toFixed(2)}),0 0 ${Math.round(glow * 2)}px rgba(26,106,232,${(strength * 0.3).toFixed(2)})`,
      duration: 0.18, ease: 'power2.out',
      transformPerspective: 600,
    });
  });
})();

// ══════════════════════════════════════════════════════
//  FLEET CARDS — 3D TILT + GLASS SHIMMER
// ══════════════════════════════════════════════════════
(function initFleetTilt() {
  const cards = [];
  document.querySelectorAll('.fleet-card').forEach(card => {
    const s = { tx: 0, ty: 0, lx: 0, ly: 0 };

    card.addEventListener('mousemove', e => {
      const r  = card.getBoundingClientRect();
      s.tx = ((e.clientY - r.top)  / r.height - 0.5) * -4.2;
      s.ty = ((e.clientX - r.left) / r.width  - 0.5) *  4.2;
    });

    card.addEventListener('mouseleave', () => {
      s.tx = 0; s.ty = 0;
    });

    cards.push({ card, s });
  });

  (function tiltLoop() {
    requestAnimationFrame(tiltLoop);
    cards.forEach(({ card, s }) => {
      s.lx += (s.tx - s.lx) * 0.1;
      s.ly += (s.ty - s.ly) * 0.1;
      const active = Math.abs(s.lx) + Math.abs(s.ly) > 0.25;
      const lift   = active ? 22 : 0;
      card.style.transform = `perspective(900px) rotateX(${s.lx.toFixed(3)}deg) rotateY(${s.ly.toFixed(3)}deg) translateZ(${lift}px)`;
    });
  })();
})();

// ══════════════════════════════════════════════════════
//  CURSOR PARTICLE TRAIL — blue comet sparks
// ══════════════════════════════════════════════════════
(function initCursorTrail() {
  const cvs = document.createElement('canvas');
  cvs.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999;';
  document.body.appendChild(cvs);
  const ctx = cvs.getContext('2d');

  function resize() { cvs.width = innerWidth; cvs.height = innerHeight; }
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const COLS = [[26,106,232],[60,148,255],[100,190,255],[0,212,255]];
  const pts  = [];

  window.addEventListener('mousemove', e => {
    for (let i = 0; i < 2; i++) {
      const col = COLS[i % COLS.length];
      pts.push({
        x: e.clientX, y: e.clientY,
        vx: (Math.random() - 0.5) * 2.8,
        vy: (Math.random() - 0.5) * 2.8 - 1.0,
        r:  2.5 + Math.random() * 3,
        a:  0.85 + Math.random() * 0.15,
        col,
      });
    }
  }, { passive: true });

  (function loop() {
    requestAnimationFrame(loop);
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += 0.08;
      p.a  -= 0.05;
      p.r  *= 0.96;
      if (p.a <= 0) { pts.splice(i, 1); continue; }
      const [r,g,b] = p.col;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${p.a.toFixed(3)})`;
      ctx.fill();
    }
  })();
})();
