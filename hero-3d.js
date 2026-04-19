import * as THREE from 'three';
import { EffectComposer }  from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }      from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass }      from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// ══════════════════════════════════════════════════════
//  THREE.JS HERO — Car + City Particles + Explosion Reveal
// ══════════════════════════════════════════════════════
(function initHeroCar() {
  const hero = document.getElementById('hero');
  if (!hero) return;

  const cvs = document.createElement('canvas');
  cvs.id = 'hero-car-canvas';
  cvs.style.cssText = `
    position:absolute;inset:0;width:100%;height:100%;
    z-index:5;pointer-events:none;
    opacity:0;transition:opacity 1.4s ease;
  `;
  hero.appendChild(cvs);

  const W = hero.offsetWidth  || window.innerWidth;
  const H = hero.offsetHeight || window.innerHeight;

  // ── Renderer ──────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ canvas: cvs, antialias: true, alpha: true });
  renderer.setSize(W, H);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping         = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.4;
  renderer.outputColorSpace    = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled   = true;
  renderer.shadowMap.type      = THREE.PCFSoftShadowMap;

  // ── Scene & Camera ────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 200);
  camera.position.set(5.2, 2.0, 7.5);
  camera.lookAt(0, 0.4, 0);

  // ── HDRI Environment ──────────────────────────────
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();
  const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envMap;
  pmrem.dispose();

  // ── City Particle Grid (Bucharest streets from above) ──
  const PCOUNT = 7000;
  const pPos  = new Float32Array(PCOUNT * 3);
  const pCol  = new Float32Array(PCOUNT * 3);
  const pSz   = new Float32Array(PCOUNT);
  const pSpd  = new Float32Array(PCOUNT);

  for (let i = 0; i < PCOUNT; i++) {
    const onStreet = Math.random() < 0.68;
    if (onStreet) {
      const lane = (Math.floor(Math.random() * 20) - 10) * 4.5;
      if (Math.random() < 0.5) {
        pPos[i*3]   = (Math.random() - 0.5) * 100;
        pPos[i*3+1] = (Math.random() - 0.5) * 0.8 - 1.2;
        pPos[i*3+2] = lane + (Math.random() - 0.5) * 1.2;
      } else {
        pPos[i*3]   = lane + (Math.random() - 0.5) * 1.2;
        pPos[i*3+1] = (Math.random() - 0.5) * 0.8 - 1.2;
        pPos[i*3+2] = (Math.random() - 0.5) * 100;
      }
    } else {
      pPos[i*3]   = (Math.random() - 0.5) * 120;
      pPos[i*3+1] = (Math.random() - 0.5) * 12 - 3;
      pPos[i*3+2] = (Math.random() - 0.5) * 120;
    }

    const r = Math.random();
    if (r < 0.55) {
      pCol[i*3] = 0.10; pCol[i*3+1] = 0.42; pCol[i*3+2] = 0.91; // blue
    } else if (r < 0.80) {
      pCol[i*3] = 0.20; pCol[i*3+1] = 0.60; pCol[i*3+2] = 1.00; // light blue
    } else {
      pCol[i*3] = 0.82; pCol[i*3+1] = 0.90; pCol[i*3+2] = 1.00; // white-blue
    }

    pSz[i]  = 0.25 + Math.random() * 1.8;
    pSpd[i] = (Math.random() - 0.5) * 0.6;
  }

  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color',    new THREE.BufferAttribute(pCol, 3));
  pGeo.setAttribute('aSize',    new THREE.BufferAttribute(pSz,  1));
  pGeo.setAttribute('aSpeed',   new THREE.BufferAttribute(pSpd, 1));

  const pMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: `
      attribute float aSize;
      attribute float aSpeed;
      attribute vec3 color;
      varying vec3  vColor;
      varying float vAlpha;
      uniform float uTime;
      void main() {
        vColor = color;
        vec3 pos = position;
        pos.x += aSpeed * uTime;
        pos.x  = mod(pos.x + 60.0, 120.0) - 60.0;
        vec4 mv = modelViewMatrix * vec4(pos, 1.0);
        float dist = -mv.z;
        gl_PointSize = clamp(aSize * 300.0 / dist, 0.5, 12.0);
        vAlpha = clamp(1.0 - dist / 55.0, 0.0, 1.0);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      varying vec3  vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float a = (1.0 - d * 2.0) * vAlpha;
        gl_FragColor = vec4(vColor, a * 0.88);
      }
    `,
    transparent:  true,
    vertexColors: true,
    depthWrite:   false,
    blending:     THREE.AdditiveBlending,
  });

  const cityPoints = new THREE.Points(pGeo, pMat);
  cityPoints.position.set(0, -1.5, -6);
  scene.add(cityPoints);

  // ── Lights ────────────────────────────────────────
  scene.add(new THREE.AmbientLight(0xffffff, 0.3));

  const key = new THREE.DirectionalLight(0xffffff, 4);
  key.position.set(6, 10, 6);
  key.castShadow = true;
  key.shadow.mapSize.setScalar(1024);
  key.shadow.camera.near = 0.5; key.shadow.camera.far = 30;
  key.shadow.camera.left = key.shadow.camera.bottom = -5;
  key.shadow.camera.right = key.shadow.camera.top = 5;
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x1a6ae8, 1.8);
  fill.position.set(-6, 3, -4);
  scene.add(fill);

  const rim = new THREE.DirectionalLight(0x8899ff, 1.2);
  rim.position.set(0, 6, -10);
  scene.add(rim);

  const under = new THREE.PointLight(0x1a6ae8, 2.0, 5);
  under.position.set(0, -0.15, 0);
  scene.add(under);

  // ── Materials ─────────────────────────────────────
  // Effect 1 — Iridescent car paint: hue shifts with viewing angle
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x0a0a0a, metalness: 0.92, roughness: 0.08,
    clearcoat: 1.0, clearcoatRoughness: 0.04,
    iridescence: 1.0,
    iridescenceIOR: 2.0,
    iridescenceThicknessRange: [80, 900],
    envMapIntensity: 2.2, reflectivity: 1.0,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0x6688aa, metalness: 0, roughness: 0,
    transmission: 0.85, transparent: true, opacity: 0.25,
    envMapIntensity: 1.5,
  });
  const chromeMat = new THREE.MeshPhysicalMaterial({
    color: 0xdddddd, metalness: 1.0, roughness: 0.04, envMapIntensity: 2.5,
  });
  const redMat = new THREE.MeshPhysicalMaterial({
    color: 0x1a6ae8, metalness: 0.4, roughness: 0.25,
    emissive: new THREE.Color(0x1a6ae8), emissiveIntensity: 1.8,
    envMapIntensity: 1.0,
  });
  const whiteLightMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, emissive: new THREE.Color(0xffffff),
    emissiveIntensity: 3.0, metalness: 0, roughness: 0,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x080808, roughness: 0.92, metalness: 0.0,
  });
  const rimMat = new THREE.MeshPhysicalMaterial({
    color: 0x999999, metalness: 0.95, roughness: 0.08, envMapIntensity: 2.0,
  });

  // ── Build car group ───────────────────────────────
  const car = new THREE.Group();
  scene.add(car);

  function box(w, h, d, mat, x, y, z) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    car.add(m); return m;
  }

  box(4.1, 0.52, 1.75, bodyMat,  0,    0.38, 0);
  box(4.0, 0.28, 1.68, bodyMat,  0,    0.68, 0);
  box(2.05, 0.62, 1.52, bodyMat, -0.1, 1.1,  0);

  const hood  = box(1.45, 0.1, 1.72, bodyMat,  1.27, 0.72, 0); hood.rotation.z  = -0.07;
  const trunk = box(0.9,  0.1, 1.72, bodyMat, -1.6,  0.72, 0); trunk.rotation.z =  0.06;

  const fWind = box(0.08, 0.56, 1.44, glassMat,  0.97, 1.06, 0); fWind.rotation.z =  0.42;
  const rWind = box(0.08, 0.52, 1.44, glassMat, -1.13, 1.06, 0); rWind.rotation.z = -0.35;

  [-0.78, 0.78].forEach(z => box(1.7, 0.36, 0.05, glassMat, -0.12, 1.1, z));

  box(0.18, 0.3,  1.72, bodyMat,   1.94, 0.28, 0);
  box(0.18, 0.28, 1.72, bodyMat,  -1.94, 0.28, 0);
  box(0.06, 0.18, 1.15, chromeMat, 2.02, 0.34, 0);
  [-0.3, 0, 0.3].forEach(z => box(0.1, 0.1, 0.05, chromeMat, 2.04, 0.28, z));

  [0.72, -0.72].forEach(z => {
    box(0.12, 0.14, 0.28, whiteLightMat, 1.98, 0.46, z);
    const pl = new THREE.PointLight(0xffffff, 1.5, 6);
    pl.position.set(2.3, 0.46, z); car.add(pl);
  });
  box(0.04, 0.04, 1.55, whiteLightMat, 2.0, 0.36, 0);

  [0.72, -0.72].forEach(z => {
    box(0.1, 0.18, 0.3, redMat, -1.98, 0.46, z);
    const rpl = new THREE.PointLight(0x1a6ae8, 1.2, 4);
    rpl.position.set(-2.3, 0.46, z); car.add(rpl);
  });
  box(0.04, 0.04, 1.55, redMat, -2.0, 0.36, 0);

  [0.9, -0.9].forEach(z => box(0.2, 0.11, 0.09, bodyMat, 0.72, 0.95, z));
  [0.88, -0.88].forEach(z => box(4.05, 0.035, 0.035, redMat, 0, 0.76, z));

  [-0.15, 0.7].forEach(x =>
    [0.88, -0.88].forEach(z => box(0.22, 0.05, 0.035, chromeMat, x, 0.75, z))
  );

  // ── Wheels ────────────────────────────────────────
  const wheelPos = [[1.28,0,0.92],[1.28,0,-0.92],[-1.28,0,0.92],[-1.28,0,-0.92]];
  const wheelMeshes = [];

  wheelPos.forEach(([x, y, z]) => {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(0.37,0.37,0.28,32), tireMat);
    tire.rotation.z = Math.PI / 2; tire.position.set(x,y,z); tire.castShadow = true;
    car.add(tire);

    const rimMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.26,0.26,0.3,10), rimMat);
    rimMesh.rotation.z = Math.PI / 2; rimMesh.position.set(x,y,z);
    car.add(rimMesh);

    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.06,0.31,0.5), rimMat);
      spoke.rotation.z = Math.PI / 2; spoke.rotation.x = (i/5)*Math.PI*2;
      spoke.position.set(x,y,z); car.add(spoke);
    }
    wheelMeshes.push(tire);
  });

  // Ground glow + shadow
  const groundGlow = new THREE.Mesh(
    new THREE.PlaneGeometry(5.5, 3),
    new THREE.MeshBasicMaterial({ color: 0x1a6ae8, transparent: true, opacity: 0.06 })
  );
  groundGlow.rotation.x = -Math.PI / 2; groundGlow.position.y = -0.2;
  car.add(groundGlow);

  const shadowDisc = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 2.2),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55 })
  );
  shadowDisc.rotation.x = -Math.PI / 2; shadowDisc.position.y = -0.19;
  car.add(shadowDisc);

  car.rotation.y = -0.22;
  car.position.set(0.8, -0.18, 0);

  // ── Explosion Reveal ──────────────────────────────
  const carPieces = [];
  car.traverse(obj => {
    if (!obj.isMesh) return;
    const origPos = obj.position.clone();
    const origRot = new THREE.Euler(obj.rotation.x, obj.rotation.y, obj.rotation.z);
    const dir = origPos.clone().normalize();
    if (dir.length() < 0.01) dir.set(Math.random()-.5, Math.random()-.5, Math.random()-.5).normalize();
    const blastDist = 3 + Math.random() * 6;
    const blastOfs  = dir.multiplyScalar(blastDist);

    obj.position.copy(origPos).add(blastOfs);
    obj.rotation.set(
      origRot.x + (Math.random()-.5) * Math.PI * 3,
      origRot.y + (Math.random()-.5) * Math.PI * 3,
      origRot.z + (Math.random()-.5) * Math.PI * 2
    );
    carPieces.push({ mesh: obj, origPos, origRot });
  });

  // ── Effect 3 — Shockwave particle ring on assembly ──
  const SW_COUNT = 1200;
  const swPos    = new Float32Array(SW_COUNT * 3);
  const swVel    = new Float32Array(SW_COUNT * 3); // radial velocity
  const swGeo    = new THREE.BufferGeometry();
  swGeo.setAttribute('position', new THREE.BufferAttribute(swPos, 3));
  const swMat = new THREE.PointsMaterial({
    color: 0x1a6ae8, size: 0.07, transparent: true, opacity: 0,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const shockwave = new THREE.Points(swGeo, swMat);
  shockwave.position.set(0.8, -0.18, 0);
  scene.add(shockwave);
  let swActive = false, swT = 0;

  function fireShockwave() {
    for (let i = 0; i < SW_COUNT; i++) {
      const theta = (i / SW_COUNT) * Math.PI * 2;
      const phi   = (Math.random() - 0.5) * Math.PI * 0.4;
      swPos[i*3]   = 0; swPos[i*3+1] = 0; swPos[i*3+2] = 0;
      swVel[i*3]   = Math.cos(theta) * Math.cos(phi) * (0.8 + Math.random() * 0.6);
      swVel[i*3+1] = Math.sin(phi) * (0.4 + Math.random() * 0.4);
      swVel[i*3+2] = Math.sin(theta) * Math.cos(phi) * (0.8 + Math.random() * 0.6);
    }
    swGeo.attributes.position.needsUpdate = true;
    swMat.opacity = 0.95;
    swActive = true; swT = 0;
  }

  let assembled = false;
  setTimeout(() => {
    const gsap = window.gsap;
    if (!gsap) { assembled = true; return; }
    carPieces.forEach(({ mesh, origPos, origRot }, i) => {
      const delay = 0.06 + i * 0.014;
      gsap.to(mesh.position, {
        x: origPos.x, y: origPos.y, z: origPos.z,
        duration: 1.7, delay, ease: 'elastic.out(1, 0.62)',
      });
      gsap.to(mesh.rotation, {
        x: origRot.x, y: origRot.y, z: origRot.z,
        duration: 1.35, delay, ease: 'power4.out',
        onComplete: () => {
          if (i === carPieces.length - 1) {
            assembled = true;
            fireShockwave();  // trigger shockwave when car snaps together
          }
        }
      });
    });
  }, 350);

  // ── Post-processing ───────────────────────────────
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.72, 0.42, 0.75);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ── Scroll integration ────────────────────────────
  let scrollProgress = 0;
  window.addEventListener('scroll', () => {
    const heroEl = document.getElementById('hero');
    const maxScroll = heroEl ? heroEl.offsetHeight : window.innerHeight;
    scrollProgress = Math.min(window.scrollY / maxScroll, 1);
  }, { passive: true });

  // ── Mouse parallax ────────────────────────────────
  let mouseX = 0, mouseY = 0;
  window.addEventListener('mousemove', e => {
    mouseX = (e.clientX / window.innerWidth  - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }, { passive: true });

  // ── Animate ───────────────────────────────────────
  const clock = new THREE.Clock();

  // Effect 2 — Scroll-driven camera orbit around the car
  // Camera arc: front-right (5.2, 2, 7.5) → rear-left (-6.5, 2.5, -5)
  const CAM_RADIUS = 9.2;
  let camAngle = 0; // lerped current angle (radians)

  function animate() {
    requestAnimationFrame(animate);
    const t = clock.getElapsedTime();

    // City particle time
    pMat.uniforms.uTime.value = t;

    // Effect 3 — advance shockwave
    if (swActive) {
      swT += 0.016;
      const decay = Math.max(0, 1 - swT * 0.55);
      swMat.opacity = decay * 0.95;
      const speed = 0.055 + swT * 0.04;
      for (let i = 0; i < SW_COUNT; i++) {
        swPos[i*3]   += swVel[i*3]   * speed;
        swPos[i*3+1] += swVel[i*3+1] * speed;
        swPos[i*3+2] += swVel[i*3+2] * speed;
      }
      swGeo.attributes.position.needsUpdate = true;
      if (decay <= 0) { swActive = false; swMat.opacity = 0; }
    }

    // Float + sway — only after explosion is done
    if (assembled) {
      car.position.y  = -0.18 + Math.sin(t * 0.65) * 0.07;
      car.rotation.y  = -0.22 + Math.sin(t * 0.28) * 0.04 + mouseX * 0.06;
      car.rotation.x  =         Math.sin(t * 0.4)  * 0.01 - mouseY * 0.025;
      wheelMeshes.forEach(w => { w.rotation.y += 0.01; });
    }

    // Effect 2 — camera orbit driven by scroll (arc up to 100° around car)
    const targetAngle = scrollProgress * Math.PI * 0.55;
    camAngle += (targetAngle - camAngle) * 0.06;
    camera.position.x = CAM_RADIUS * Math.sin(camAngle) + 0.8;
    camera.position.z = CAM_RADIUS * Math.cos(camAngle);
    camera.position.y = 2.0 + scrollProgress * 0.8;
    camera.lookAt(0, 0.4, 0);

    // Scroll pull-back opacity + scale
    const pull = Math.min(scrollProgress * 3, 1);
    car.position.z = assembled ? -pull * 2 : 0;
    car.scale.setScalar(1 - pull * 0.15);
    cvs.style.opacity = (1 - pull * 1.5).toFixed(3);

    // Under glow pulse
    under.intensity = 1.8 + Math.sin(t * 1.4) * 0.4;

    composer.render();
  }

  // Fade in canvas
  setTimeout(() => { cvs.style.opacity = '1'; }, 500);
  animate();

  // ── Resize ────────────────────────────────────────
  window.addEventListener('resize', () => {
    const W = hero.offsetWidth  || window.innerWidth;
    const H = hero.offsetHeight || window.innerHeight;
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    renderer.setSize(W, H);
    composer.setSize(W, H);
  });
})();
