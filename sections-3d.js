/* sections-3d.js
   Effect 2 — Rotating 3D wireframe shape per section
   Effect 3 — Cinematic chrome slash dividers
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

  /* ─── Per-section config ─── */
  const CFGS = [
    { id:'de-ce',            shape:'octahedron',  size:680, sx:0.00080, sy:0.00130, ox:0.82, oy:0.50 },
    { id:'flota',            shape:'torus',       size:720, sx:0.00050, sy:0.00090, ox:0.14, oy:0.55 },
    { id:'cum-functioneaza', shape:'cube',        size:660, sx:0.00100, sy:0.00070, ox:0.82, oy:0.50 },
    { id:'parteneri',        shape:'diamond',     size:560, sx:0.00090, sy:0.00120, ox:0.18, oy:0.50 },
    { id:'testimoniale',     shape:'icosahedron', size:740, sx:0.00065, sy:0.00085, ox:0.82, oy:0.48 },
    { id:'contact',          shape:'rings',       size:660, sx:0.00000, sy:0.00095, ox:0.80, oy:0.52 },
  ];

  const DARK_IDS = new Set(['flota', 'testimoniale']);

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
    ].join(';');
    sec.insertBefore(cvs, sec.firstChild);

    const ctx  = cvs.getContext('2d');
    const sh   = SHAPES[cfg.shape];
    const dark = DARK_IDS.has(cfg.id);
    const state = { ax: 0, ay: 0, W: 0, H: 0 };

    function resize() {
      state.W = cvs.width  = sec.offsetWidth  || window.innerWidth;
      state.H = cvs.height = sec.offsetHeight || window.innerHeight;
    }
    resize();

    function tick() {
      const { W, H, ax, ay } = state;
      ctx.clearRect(0, 0, W, H);

      const cx = W * cfg.ox;
      const cy = H * cfg.oy;
      const sc = cfg.size * 0.5;
      const fov = cfg.size * 1.6;

      let pts = sh.v.map(([x, y, z]) => [x * sc, y * sc, z * sc]);
      pts = rotX(pts, ax);
      pts = rotY(pts, ay);
      const proj = project(pts, fov, cx, cy);

      const col = dark ? '255,65,65' : '200,10,10';
      const lw  = dark ? 1.0 : 0.85;

      sh.e.forEach(([i, j]) => {
        const [px, py, pz] = proj[i];
        const [qx, qy, qz] = proj[j];
        const depth = ((pz + qz) * 0.5 + sc) / (sc * 2);
        const alpha = dark
          ? (0.032 + depth * 0.062).toFixed(3)
          : (0.028 + depth * 0.052).toFixed(3);
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(qx, qy);
        ctx.strokeStyle = `rgba(${col},${alpha})`;
        ctx.lineWidth = lw;
        ctx.stroke();
      });
    }

    instances.push({ cfg, state, tick, resize });
  });

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

  /* ─── Loop ─── */
  function loop() {
    instances.forEach(inst => {
      inst.state.ax += inst.cfg.sx;
      inst.state.ay += inst.cfg.sy;
      inst.tick();
    });
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', () => instances.forEach(i => i.resize()));

  /* slight init delay so layout is settled */
  setTimeout(loop, 80);
})();
