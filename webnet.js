/* webnet.js — Geometric web / tendril mesh, cursor-reactive
   + depth layers (parallax on scroll)
   + symbiote tendrils toward hero card on hover
*/
(function () {
  const canvas = document.getElementById('webnet');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const CONFIG = {
    nodeCount:    160,
    connectDist:  130,
    cursorRadius: 320,
    cursorForce:  0.04,       // 50% slower push
    friction:     0.985,      // 50% slower decay
    returnForce:  0.001,      // 50% slower return
    edgeColor:    [220, 20, 20],
    nodeColor:    [255, 60, 60],
    cursorPulse:  true,
    /* depth layers */
    layers:       3,
    parallaxMax:  30,
    /* symbiote */
    tendrilRadius:   240,
    tendrilForce:    0.022,
    tendrilFriction: 0.78,
  };

  let W, H, scrollFrac = 0;
  const mouse  = { x: -999, y: -999 };
  const card   = { active: false, cx: 0, cy: 0, w: 0, h: 0 };
  let pulseT   = 0;

  /* ── Node setup ── */
  const nodes = [];

  /* Store stable bezier jitter per node so edges don't flicker each frame */
  const jitter = new Map();
  function getJitter(key) {
    if (!jitter.has(key)) {
      jitter.set(key, {
        mx: (Math.random() - 0.5) * 18,
        my: (Math.random() - 0.5) * 18,
      });
    }
    return jitter.get(key);
  }

  function makeNode (i, ox, oy) {
    const layer = i % CONFIG.layers;
    const speed = 0.2 + layer * 0.2;
    const size  = 0.7 + layer * 0.6;
    const alpha = 0.5 + layer * 0.12;
    return {
      ox, oy,
      x: ox, y: oy,
      vx: 0, vy: 0,
      r: size, layer, speed, baseAlpha: alpha,
      symbiote: 0,
    };
  }

  function init () {
    const hero = document.getElementById('hero');
    W = hero ? hero.offsetWidth  : window.innerWidth;
    H = hero ? hero.offsetHeight : window.innerHeight;
    canvas.width  = W;
    canvas.height = H;
    nodes.length = 0;
    jitter.clear();

    /* Grid-based placement for even screen coverage */
    const cols = Math.round(Math.sqrt(CONFIG.nodeCount * W / H));
    const rows = Math.round(CONFIG.nodeCount / cols);
    const cellW = W / cols;
    const cellH = H / rows;
    let idx = 0;
    for (let r = 0; r < rows && idx < CONFIG.nodeCount; r++) {
      for (let c = 0; c < cols && idx < CONFIG.nodeCount; c++) {
        /* Place node within cell with ±30% random offset */
        const ox = (c + 0.5 + (Math.random() - 0.5) * 0.6) * cellW;
        const oy = (r + 0.5 + (Math.random() - 0.5) * 0.6) * cellH;
        nodes.push(makeNode(idx, ox, oy));
        idx++;
      }
    }
  }

  /* ── Sync card bounds ── */
  function syncCard () {
    const el = document.getElementById('card');
    if (!el) return;
    const r = el.getBoundingClientRect();
    card.cx = r.left + r.width  * 0.5;
    card.cy = r.top  + r.height * 0.5;
    card.w  = r.width;
    card.h  = r.height;
    /* active when cursor is within card bounds + 40px halo */
    const pad = 40;
    card.active = mouse.x > r.left  - pad && mouse.x < r.right  + pad
               && mouse.y > r.top   - pad && mouse.y < r.bottom + pad;
  }

  /* ── Physics ── */
  function update () {
    pulseT += 0.025;
    const pulse = CONFIG.cursorPulse ? (1 + 0.35 * Math.sin(pulseT)) : 1;

    syncCard();

    for (const n of nodes) {
      /* Layer parallax offset (applied to origin, not physics) */
      const parallax = (n.layer - 1) * CONFIG.parallaxMax * scrollFrac;

      /* Return force toward (possibly shifted) origin */
      const targetX = n.ox;
      const targetY = n.oy + parallax;
      n.vx += (targetX - n.x) * CONFIG.returnForce * n.speed;
      n.vy += (targetY - n.y) * CONFIG.returnForce * n.speed;

      /* Cursor repulsion */
      const cDx  = n.x - mouse.x;
      const cDy  = n.y - mouse.y;
      const cd2  = cDx * cDx + cDy * cDy;
      const cr2  = (CONFIG.cursorRadius * pulse) ** 2;
      if (cd2 < cr2 && cd2 > 0.01) {
        const dist = Math.sqrt(cd2);
        const str  = (1 - dist / (CONFIG.cursorRadius * pulse)) * CONFIG.cursorForce * pulse;
        n.vx += (cDx / dist) * str * 6;
        n.vy += (cDy / dist) * str * 6;
      }

      /* Symbiote pull toward card edge */
      if (card.active) {
        const sdx  = card.cx - n.x;
        const sdy  = card.cy - n.y;
        const sd   = Math.sqrt(sdx * sdx + sdy * sdy);
        const half = Math.max(card.w, card.h) * 0.5;
        /* Only pull from outside the card, within tendril radius */
        if (sd < CONFIG.tendrilRadius + half && sd > half + 4) {
          const reach = 1 - (sd - half) / CONFIG.tendrilRadius;
          n.symbiote = Math.min(1, n.symbiote + 0.04);
          const str = reach * CONFIG.tendrilForce * n.symbiote * n.speed;
          n.vx += (sdx / sd) * str * 14;
          n.vy += (sdy / sd) * str * 14;
        } else {
          n.symbiote = Math.max(0, n.symbiote - 0.02);
        }
        /* Tendrils near card damp hard so they cling */
        if (sd < half + 60) {
          n.vx *= CONFIG.tendrilFriction;
          n.vy *= CONFIG.tendrilFriction;
        }
      } else {
        n.symbiote = Math.max(0, n.symbiote - 0.03);
      }

      n.vx *= CONFIG.friction;
      n.vy *= CONFIG.friction;
      n.x  += n.vx;
      n.y  += n.vy;

      /* Soft boundary wrap */
      if (n.x < -20) n.x = W + 20;
      if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20;
      if (n.y > H + 20) n.y = -20;
    }
  }

  /* ── Draw ── */
  function draw () {
    ctx.clearRect(0, 0, W, H);

    const [er, eg, eb] = CONFIG.edgeColor;
    const [nr, ng, nb] = CONFIG.nodeColor;
    const cd2 = CONFIG.connectDist * CONFIG.connectDist;

    /* Sort draw order: far behind near */
    const sorted = nodes.slice().sort((a, b) => a.layer - b.layer);

    /* Edges */
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i];
      for (let j = i + 1; j < sorted.length; j++) {
        const b = sorted[j];

        /* Only connect same or adjacent layers for depth realism */
        if (Math.abs(a.layer - b.layer) > 1) continue;

        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 > cd2) continue;

        const t    = 1 - Math.sqrt(d2) / CONFIG.connectDist;
        const depthScale = 0.65 + ((a.layer + b.layer) * 0.5 / (CONFIG.layers - 1)) * 0.35;
        const baseOpa = t * t * 0.38 * depthScale;

        /* Cursor lights up everything within radius uniformly */
        const mcx    = (a.x + b.x) * 0.5 - mouse.x;
        const mcy    = (a.y + b.y) * 0.5 - mouse.y;
        const md     = Math.sqrt(mcx * mcx + mcy * mcy);
        const bright = md < CONFIG.cursorRadius
          ? 0.55 + 0.45 * (1 - md / CONFIG.cursorRadius)
          : 0;

        const sym = (a.symbiote + b.symbiote) * 0.5;

        const finalR = Math.min(255, er + bright * 60 + sym * 40) | 0;
        const finalG = Math.min(255, eg + bright * 25) | 0;
        const finalB = Math.min(255, eb + bright * 25 + sym * 30) | 0;

        const jk = i * 1000 + j;
        const jv = getJitter(jk);
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        const mx = (a.x + b.x) * 0.5 + jv.mx;
        const my = (a.y + b.y) * 0.5 + jv.my;
        ctx.quadraticCurveTo(mx, my, b.x, b.y);
        ctx.strokeStyle = `rgba(${finalR},${finalG},${finalB},${Math.min(1, baseOpa + bright * 0.52 + sym * 0.2).toFixed(3)})`;
        ctx.lineWidth   = (0.5 + a.layer * 0.25) + bright * 1.0 + sym * 1.2;
        ctx.stroke();
      }
    }

    /* Nodes */
    for (const n of sorted) {
      const dx   = n.x - mouse.x;
      const dy   = n.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const near = dist < CONFIG.cursorRadius ? 1 - dist / CONFIG.cursorRadius : 0;
      const sym  = n.symbiote;

      const baseA = 0.5 + n.layer * 0.12;
      const glow  = n.r * (1 + near * 2.0 + sym * 2.5);
      const opa   = Math.min(1.0, baseA + near * 0.5 + sym * 0.35);

      ctx.beginPath();
      ctx.arc(n.x, n.y, glow, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${nr},${ng},${nb},${opa.toFixed(3)})`;
      ctx.fill();

      /* Halo */
      if (near > 0.05 || sym > 0.1) {
        const haloR  = glow * (near > sym ? 5 : 6);
        const haloA  = Math.max(near, sym) * 0.4;
        const grad   = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, haloR);
        grad.addColorStop(0, `rgba(255,${sym > 0.3 ? 80 : 40},40,${haloA.toFixed(3)})`);
        grad.addColorStop(1, 'rgba(180,0,0,0)');
        ctx.beginPath();
        ctx.arc(n.x, n.y, haloR, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    /* Cursor ring */
    if (mouse.x > 0) {
      const pulse = 1 + 0.2 * Math.sin(pulseT * 3);
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, CONFIG.cursorRadius * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(220,20,20,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, 6 * pulse, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,60,60,0.5)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    /* Symbiote card edge glow */
    if (card.active) {
      const pulse = 1 + 0.25 * Math.sin(pulseT * 4);
      const grad  = ctx.createRadialGradient(card.cx, card.cy, 0, card.cx, card.cy, CONFIG.tendrilRadius * 0.6 * pulse);
      grad.addColorStop(0, 'rgba(200,0,0,0.0)');
      grad.addColorStop(0.5, 'rgba(180,0,0,0.05)');
      grad.addColorStop(1, 'rgba(120,0,0,0)');
      ctx.beginPath();
      ctx.ellipse(card.cx, card.cy, (card.w * 0.5 + 80) * pulse, (card.h * 0.5 + 80) * pulse, 0, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }
  }

  function loop () {
    update();
    draw();
    requestAnimationFrame(loop);
  }

  /* ── Events ── */
  const hero = document.getElementById('hero');

  if (hero) {
    hero.addEventListener('mousemove', e => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    hero.addEventListener('mouseleave', () => { mouse.x = -999; mouse.y = -999; });
  }

  /* card.active driven by syncCard proximity check in update() */

  /* Scroll parallax */
  window.addEventListener('scroll', () => {
    const heroEl = document.getElementById('hero');
    if (!heroEl) return;
    scrollFrac = Math.min(1, window.scrollY / heroEl.offsetHeight);
  }, { passive: true });

  window.addEventListener('resize', init);
  init();
  loop();
})();
