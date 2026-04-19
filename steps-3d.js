/* steps-3d.js — 3D cursor-interactive solid icons for process steps */
(function () {

  /* ── 3D math ── */
  function rotX([x,y,z],a){ const c=Math.cos(a),s=Math.sin(a); return [x,y*c-z*s,y*s+z*c]; }
  function rotY([x,y,z],a){ const c=Math.cos(a),s=Math.sin(a); return [x*c+z*s,y,-x*s+z*c]; }
  function proj([x,y,z],fov,cx,cy){ const d=fov/(z+fov); return [cx+x*d,cy+y*d]; }
  function cross(a,b){ return [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]; }
  function dot(a,b){ return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
  function sub(a,b){ return [a[0]-b[0],a[1]-b[1],a[2]-b[2]]; }
  function norm(v){ const l=Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2])||1; return [v[0]/l,v[1]/l,v[2]/l]; }
  function faceNorm(verts,face){ return norm(cross(sub(verts[face[1]],verts[face[0]]),sub(verts[face[2]],verts[face[0]]))); }

  const LIGHT = norm([0.55, 1.0, 0.75]);

  /* ─────────────────────────────────────────────────────
     SHAPE DEFINITIONS
     Each shape: v (vertices), f (triangulated faces),
     accent (Set of face indices → red), sc (scale), ax0/ay0 (start rotation)
  ───────────────────────────────────────────────────── */
  const SHAPES = [

    /* ── 0 ─ SMARTPHONE  (Sună-ne) ─────────────────── */
    {
      sc: 0.25, ax0: 0.38, ay0: 0.52,
      accent: new Set([2, 3]),          // front face = red "screen"
      v: [
        // back face  (z = -0.12)
        [-0.52,-1.2,-0.12],[0.52,-1.2,-0.12],[0.52,1.2,-0.12],[-0.52,1.2,-0.12],
        // front face (z = +0.12)
        [-0.52,-1.2, 0.12],[0.52,-1.2, 0.12],[0.52,1.2, 0.12],[-0.52,1.2, 0.12],
      ],
      f: [
        [0,1,2],[0,2,3],   // back   (0,1)
        [4,6,5],[4,7,6],   // front  (2,3) ← screen accent
        [0,4,5],[0,5,1],   // bottom (4,5)
        [3,7,6],[3,6,2],   // top    (6,7)
        [0,3,7],[0,7,4],   // left   (8,9)
        [1,5,6],[1,6,2],   // right  (10,11)
      ],
    },

    /* ── 1 ─ CAR SILHOUETTE  (Alege Mașina) ─────────── */
    /*   Wide body box + narrower cabin box on top        */
    {
      sc: 0.24, ax0: 0.30, ay0: 0.28,
      accent: new Set([2, 3, 14, 15]),  // front face of body + cabin = red
      v: [
        // Body  (y: -0.40 → +0.32)
        [-1.1,-0.40,-0.50],[ 1.1,-0.40,-0.50],[ 1.1, 0.32,-0.50],[-1.1, 0.32,-0.50],  // 0-3 back
        [-1.1,-0.40, 0.50],[ 1.1,-0.40, 0.50],[ 1.1, 0.32, 0.50],[-1.1, 0.32, 0.50],  // 4-7 front
        // Cabin (y:  0.32 → +0.95)
        [-0.44, 0.32,-0.43],[ 0.64, 0.32,-0.43],[ 0.64, 0.95,-0.43],[-0.44, 0.95,-0.43], // 8-11 back
        [-0.44, 0.32, 0.43],[ 0.64, 0.32, 0.43],[ 0.64, 0.95, 0.43],[-0.44, 0.95, 0.43], // 12-15 front
      ],
      f: [
        // Body
        [0,1,2],[0,2,3],    // body back   (0,1)
        [4,6,5],[4,7,6],    // body front  (2,3) ← accent
        [0,4,5],[0,5,1],    // body bottom (4,5)
        [2,6,7],[2,7,3],    // body top    (6,7)
        [0,3,7],[0,7,4],    // body left   (8,9)
        [1,5,6],[1,6,2],    // body right  (10,11)
        // Cabin (no bottom — sits flush on body top)
        [8,9,10],[8,10,11], // cabin back  (12,13)
        [12,14,13],[12,15,14], // cabin front (14,15) ← accent
        [10,14,15],[10,15,11], // cabin top  (16,17)
        [8,11,15],[8,15,12],   // cabin left (18,19)
        [9,13,14],[9,14,10],   // cabin right(20,21)
      ],
    },

    /* ── 2 ─ UPWARD ARROW  (Începe să Câștigi) ──────── */
    /*   Thin shaft + wide pyramid arrowhead at top       */
    {
      sc: 0.24, ax0: 0.18, ay0: 0.35,
      accent: new Set([10, 11, 12, 13]), // four arrow-head faces = red
      v: [
        // Shaft  (y: -1.1 → +0.18, thin square cross-section)
        [-0.26,-1.1,-0.26],[ 0.26,-1.1,-0.26],[ 0.26,0.18,-0.26],[-0.26,0.18,-0.26], // 0-3 back
        [-0.26,-1.1, 0.26],[ 0.26,-1.1, 0.26],[ 0.26,0.18, 0.26],[-0.26,0.18, 0.26], // 4-7 front
        // Arrowhead base corners  (y = 0.18, wider)
        [-0.74, 0.18,-0.26],[ 0.74, 0.18,-0.26],[ 0.74, 0.18, 0.26],[-0.74, 0.18, 0.26], // 8-11
        // Tip
        [0, 1.22, 0], // 12
      ],
      f: [
        // Shaft
        [0,2,1],[0,3,2],    // shaft back   (0,1)
        [4,5,6],[4,6,7],    // shaft front  (2,3)
        [0,1,5],[0,5,4],    // shaft bottom (4,5)
        [0,4,7],[0,7,3],    // shaft left   (6,7)
        [1,2,6],[1,6,5],    // shaft right  (8,9)
        // Arrowhead (4 triangular faces to tip)
        [8,12,9],           // head face 1  (10) ← accent
        [9,12,10],          // head face 2  (11) ← accent
        [10,12,11],         // head face 3  (12) ← accent
        [11,12,8],          // head face 4  (13) ← accent
        // Head base (mostly hidden, fill gap between shaft and head wings)
        [8,9,10],[8,10,11], // base (14,15)
      ],
    },
  ];

  /* ─────────────────────────────────────────────────────
     RENDER EACH STEP ICON
  ───────────────────────────────────────────────────── */
  const icons = document.querySelectorAll('.step-icon');
  if (!icons.length) return;

  icons.forEach((iconEl, idx) => {
    const shape = SHAPES[idx];
    if (!shape) return;

    iconEl.innerHTML = '';

    const SIZE = 120;
    const DPR  = Math.min(window.devicePixelRatio || 1, 2);
    const cvs  = document.createElement('canvas');
    cvs.width  = SIZE * DPR;
    cvs.height = SIZE * DPR;
    cvs.style.cssText = `width:${SIZE}px;height:${SIZE}px;display:block;`;
    iconEl.appendChild(cvs);
    const ctx = cvs.getContext('2d');
    ctx.scale(DPR, DPR);

    const CX  = SIZE / 2;
    const CY  = SIZE / 2;
    const FOV = SIZE * 1.25;
    const SC  = SIZE * shape.sc;

    let ax = shape.ax0, ay = shape.ay0;
    let mInfluX = 0, mInfluY = 0, smoothX = 0, smoothY = 0;

    /* cursor tracking on the whole step card */
    const stepEl = iconEl.closest('.step') || iconEl.parentElement;
    stepEl.style.cssText += ';transform-style:preserve-3d;transition:transform 0.6s cubic-bezier(.23,1,.32,1);cursor:none;';

    stepEl.addEventListener('mousemove', e => {
      const r  = stepEl.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width  / 2) / (r.width  / 2);
      const dy = (e.clientY - r.top  - r.height / 2) / (r.height / 2);
      mInfluX = dy * 0.55;
      mInfluY = dx * 0.55;
      stepEl.style.transform = `perspective(600px) rotateX(${-dy*8}deg) rotateY(${dx*8}deg) translateZ(4px)`;
    });
    stepEl.addEventListener('mouseleave', () => {
      mInfluX = 0; mInfluY = 0;
      stepEl.style.transform = 'perspective(600px) rotateX(0) rotateY(0) translateZ(0)';
    });

    (function render() {
      requestAnimationFrame(render);

      ax += 0.009;
      ay += 0.013;
      smoothX += (mInfluX - smoothX) * 0.07;
      smoothY += (mInfluY - smoothY) * 0.07;

      ctx.clearRect(0, 0, SIZE, SIZE);

      const totalAx = ax + smoothX;
      const totalAy = ay + smoothY;

      const verts = shape.v.map(v => {
        let p = [v[0]*SC, v[1]*SC, v[2]*SC];
        p = rotX(p, totalAx);
        p = rotY(p, totalAy);
        return p;
      });

      const faces = shape.f.map((face, fi) => {
        const avgZ  = face.reduce((s,vi) => s + verts[vi][2], 0) / face.length;
        const fnorm = faceNorm(verts, face);
        const light = Math.max(0, dot(fnorm, LIGHT));
        return { face, avgZ, light, accent: shape.accent.has(fi) };
      });

      faces.sort((a, b) => a.avgZ - b.avgZ);

      faces.forEach(({ face, light, accent }) => {
        const pts = face.map(vi => proj(verts[vi], FOV, CX, CY));
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.closePath();

        let r, g, b;
        if (accent) {
          r = Math.round(20  + light * 40);
          g = Math.round(90  + light * 80);
          b = Math.round(210 + light * 45);
        } else {
          const lv = Math.round(15 + light * 175);
          r = lv; g = lv; b = lv;
        }
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.fill();

        const ea = 0.15 + light * 0.30;
        ctx.strokeStyle = accent ? `rgba(110,175,255,${ea})` : `rgba(255,255,255,${ea})`;
        ctx.lineWidth = 0.65;
        ctx.stroke();
      });

      /* subtle red ambient glow */
      const grad = ctx.createRadialGradient(CX, CY, 0, CX, CY, SIZE * 0.52);
      grad.addColorStop(0, 'rgba(26,106,232,0.10)');
      grad.addColorStop(1, 'rgba(26,106,232,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, SIZE, SIZE);
    })();
  });

})();
