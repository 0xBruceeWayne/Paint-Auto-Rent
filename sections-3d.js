/* sections-3d.js
   Effect 2 — Rotating 3D wireframe shape per section
   Effect 3 — Cinematic chrome slash dividers
   Upgrade 1 — Mouse parallax per shape
   Upgrade 2 — IntersectionObserver fade-in
   Upgrade 3 — Depth-sorted edges (back→front)
*/
(function () {

  /* ─── 3-D math ─── */
  function rotX(pts, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return pts.map(([x, y, z]) => [x, y * c - z * s, y * s + z * c]);
  }
  function rotY(pts, a) {
    const c = Math.cos(a), s = Math.sin(a);
    return pts.map(([x, y, z]) => [x * c + z * s, y, -x * s + z * c]);
  }
  function project(pts, fov, cx, cy) {
    return pts.map(([x, y, z]) => {
      const d = fov / Math.max(1, z + fov);
      return [cx + x * d, cy + y * d, z];
    });
  }

  /* ─── Shape library ─── */
  const SHAPES = {};

  SHAPES.octahedron = {
    v: [[0,1,0],[0,-1,0],[1,0,0],[-1,0,0],[0,0,1],[0,0,-1]],
    e: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[4,3],[3,5],[5,2]],
  };

  SHAPES.cube = {
    v: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    e: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
  };

  SHAPES.diamond = {
    v: [
      [0,1.5,0],
      [1,0.4,0],[-1,0.4,0],[0,0.4,1],[0,0.4,-1],
      [1,-0.4,0],[-1,-0.4,0],[0,-0.4,1],[0,-0.4,-1],
      [0,-1.4,0],
    ],
    e: [
      [0,1],[0,2],[0,3],[0,4],
      [1,3],[3,2],[2,4],[4,1],
      [1,5],[3,7],[2,6],[4,8],
      [5,7],[7,6],[6,8],[8,5],
      [5,9],[6,9],[7,9],[8,9],
    ],
  };

  (() => {
    const phi = (1 + Math.sqrt(5)) / 2;
    const sc  = 1 / Math.sqrt(1 + phi * phi);
    const v = [
      [-1, phi,0],[1, phi,0],[-1,-phi,0],[1,-phi,0],
      [0,-1, phi],[0,1, phi],[0,-1,-phi],[0,1,-phi],
      [phi,0,-1],[phi,0,1],[-phi,0,-1],[-phi,0,1],
    ].map(p => p.map(c => c * sc));
    const e = [
      [0,1],[0,5],[0,7],[0,10],[0,11],
      [1,5],[1,7],[1,8],[1,9],
      [2,3],[2,4],[2,6],[2,10],[2,11],
      [3,4],[3,6],[3,8],[3,9],
      [4,5],[4,9],[4,11],[5,9],[5,11],
      [6,7],[6,8],[6,10],[7,8],[7,10],
      [8,9],[10,11],
    ];
    SHAPES.icosahedron = { v, e };
  })();

  (() => {
    const R = 0.65, r = 0.28, seg = 16, tube = 10;
    const v = [], e = [];
    for (let i = 0; i < seg; i++) {
      const phi = (i / seg) * Math.PI * 2;
      for (let j = 0; j < tube; j++) {
        const theta = (j / tube) * Math.PI * 2;
        v.push([
          (R + r * Math.cos(theta)) * Math.cos(phi),
          r * Math.sin(theta),
          (R + r * Math.cos(theta)) * Math.sin(phi),
        ]);
      }
    }
    for (let i = 0; i < seg; i++) {
      for (let j = 0; j < tube; j++) {
        const a = i * tube + j;
        const b = i * tube + (j + 1) % tube;
        const c = ((i + 1) % seg) * tube + j;
        e.push([a, b], [a, c]);
      }
    }
    SHAPES.torus = { v, e };
  })();

  (() => {
    const radii = [0.28, 0.52, 0.76, 1.0], segs = 56;
    const v = [], e = [];
    radii.forEach((rr, ri) => {
      const base = ri * segs;
      for (let i = 0; i < segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        v.push([rr * Math.cos(a), rr * Math.sin(a), 0]);
        e.push([base + i, base + (i + 1) % segs]);
      }
    });
    SHAPES.rings = { v, e };
  })();

  /* ─── Per-section config — multiple shapes per section ─── */
  const CFGS = [
    { id:'de-ce', dark:false, shapes:[
      { shape:'octahedron', size:520, sx:0.00080, sy:0.00130, ox:0.88, oy:0.25 },
      { shape:'cube',       size:300, sx:0.00130, sy:0.00060, ox:0.08, oy:0.72 },
      { shape:'diamond',    size:220, sx:0.00060, sy:0.00150, ox:0.48, oy:0.90 },
    ]},
    { id:'flota', dark:true, shapes:[
      { shape:'torus',       size:560, sx:0.00050, sy:0.00090, ox:0.10, oy:0.50 },
      { shape:'icosahedron', size:340, sx:0.00110, sy:0.00070, ox:0.88, oy:0.25 },
      { shape:'rings',       size:260, sx:0.00000, sy:0.00120, ox:0.82, oy:0.80 },
    ]},
    { id:'cum-functioneaza', dark:false, shapes:[] },
    { id:'parteneri', dark:false, shapes:[
      { shape:'diamond',    size:480, sx:0.00090, sy:0.00120, ox:0.12, oy:0.50 },
      { shape:'cube',       size:280, sx:0.00060, sy:0.00090, ox:0.86, oy:0.25 },
      { shape:'octahedron', size:200, sx:0.00120, sy:0.00080, ox:0.80, oy:0.82 },
    ]},
    { id:'testimoniale', dark:true, shapes:[
      { shape:'icosahedron', size:580, sx:0.00065, sy:0.00085, ox:0.86, oy:0.45 },
      { shape:'torus',       size:340, sx:0.00090, sy:0.00060, ox:0.10, oy:0.22 },
      { shape:'diamond',     size:240, sx:0.00050, sy:0.00130, ox:0.14, oy:0.80 },
    ]},
    { id:'contact', dark:false, shapes:[
      { shape:'rings',       size:520, sx:0.00000, sy:0.00095, ox:0.84, oy:0.50 },
      { shape:'icosahedron', size:300, sx:0.00080, sy:0.00070, ox:0.10, oy:0.25 },
      { shape:'cube',        size:220, sx:0.00110, sy:0.00110, ox:0.12, oy:0.80 },
    ]},
  ];

  /* ─── Global mouse position (normalised -1..1) ─── */
  let gMouseX = 0, gMouseY = 0;
  window.addEventListener('mousemove', e => {
    gMouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    gMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  /* ─── Build canvas overlays ─── */
  const instances = [];

  CFGS.forEach(cfg => {
    const sec = document.getElementById(cfg.id);
    if (!sec) return;

    if (getComputedStyle(sec).position === 'static') sec.style.position = 'relative';

    const cvs = document.createElement('canvas');
    cvs.style.cssText = [
      'position:absolute', 'inset:0', 'width:100%', 'height:100%',
      'pointer-events:none', 'z-index:0',
      /* Upgrade 2 — start invisible, fade in via JS */
      'opacity:0', 'transition:opacity 0.9s ease',
    ].join(';');
    sec.insertBefore(cvs, sec.firstChild);

    const ctx  = cvs.getContext('2d');
    const dark = cfg.dark;

    /* each shape gets its own rotation state */
    const states = cfg.shapes.map(() => ({ ax: 0, ay: 0 }));
    const secState = { W: 0, H: 0 };

    function resize() {
      secState.W = cvs.width  = sec.offsetWidth  || window.innerWidth;
      secState.H = cvs.height = sec.offsetHeight || window.innerHeight;
    }
    resize();

    /* Upgrade 3 — depth-sorted drawShape */
    function drawShape(sh, sc, fov, cx, cy, ax, ay, parallaxX, parallaxY) {
      const col = dark ? '255,210,0' : '10,10,10';
      const lwBase = dark ? 1.6 : 1.7;

      /* apply parallax offset to centre */
      const pcx = cx + parallaxX;
      const pcy = cy + parallaxY;

      let pts = sh.v.map(([x, y, z]) => [x * sc, y * sc, z * sc]);
      pts = rotX(pts, ax);
      pts = rotY(pts, ay);
      const proj = project(pts, fov, pcx, pcy);

      /* sort edges back-to-front by average projected Z */
      const sorted = sh.e.map(([i, j]) => {
        const mz = (proj[i][2] + proj[j][2]) * 0.5;
        return { i, j, mz };
      }).sort((a, b) => a.mz - b.mz);

      sorted.forEach(({ i, j }) => {
        const [px, py, pz] = proj[i];
        const [qx, qy, qz] = proj[j];
        const depth = ((pz + qz) * 0.5 + sc) / (sc * 2);
        const alpha = dark
          ? (0.06 + depth * 0.22).toFixed(3)
          : (0.04 + depth * 0.18).toFixed(3);
        /* front edges are thicker */
        const lw = lwBase * (0.6 + depth * 0.8);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(qx, qy);
        ctx.strokeStyle = `rgba(${col},${alpha})`;
        ctx.lineWidth = lw;
        ctx.stroke();
      });
    }

    function tick() {
      const { W, H } = secState;
      ctx.clearRect(0, 0, W, H);

      cfg.shapes.forEach((scfg, idx) => {
        const sh  = SHAPES[scfg.shape];
        const sc  = scfg.size * 0.5;
        const fov = scfg.size * 1.6;
        const cx  = W * scfg.ox;
        const cy  = H * scfg.oy;
        /* Upgrade 1 — parallax: shapes drift gently with mouse */
        const pStrength = sc * 0.06;
        const parallaxX = gMouseX * pStrength * (idx % 2 === 0 ? 1 : -0.7);
        const parallaxY = gMouseY * pStrength * (idx % 2 === 0 ? 0.7 : -1);
        drawShape(sh, sc, fov, cx, cy, states[idx].ax, states[idx].ay, parallaxX, parallaxY);
      });
    }

    instances.push({ cfg, states, secState, tick, resize, cvs });
  });

  /* ─── Upgrade 2 — IntersectionObserver fade-in + visibility gate ─── */
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const inst = instances.find(i => i.cvs === entry.target);
      if (!inst) return;
      inst.visible = entry.isIntersecting;
      inst.cvs.style.opacity = entry.isIntersecting ? '1' : '0';
    });
  }, { threshold: 0.05 });

  instances.forEach(inst => { inst.visible = false; observer.observe(inst.cvs); });

  /* ─── Inject chrome slash dividers ─── */
  CFGS.forEach((cfg, idx) => {
    const sec = document.getElementById(cfg.id);
    if (!sec) return;

    const slash = document.createElement('div');
    slash.className = 'sec-slash';
    slash.style.setProperty('--sd', (idx * 0.72).toFixed(2) + 's');
    slash.setAttribute('aria-hidden', 'true');
    sec.insertBefore(slash, sec.firstChild);
  });

  /* ─── Loop — only render currently visible sections ─── */
  let _sLast = 0;
  function loop(ts) {
    requestAnimationFrame(loop);
    if (ts - _sLast < 33) return; // cap at ~30fps
    _sLast = ts;
    instances.forEach(inst => {
      if (!inst.visible) return; // skip off-screen sections entirely
      inst.cfg.shapes.forEach((scfg, idx) => {
        inst.states[idx].ax += scfg.sx;
        inst.states[idx].ay += scfg.sy;
      });
      inst.tick();
    });
  }

  window.addEventListener('resize', () => instances.forEach(i => i.resize()));

  /* slight init delay so layout is settled */
  setTimeout(loop, 80);

})();
