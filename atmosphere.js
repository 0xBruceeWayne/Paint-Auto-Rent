// ══════════════════════════════════════════════════════
//  ATMOSPHERE BACKGROUND — scroll-reactive Three.js
//  Fixed canvas behind all sections. Fog + particles
//  shift atmosphere per section as user scrolls.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';

const IS_MOBILE = (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
               || window.innerWidth <= 768;
const IS_4K = devicePixelRatio >= 2 || window.innerWidth >= 2560;
const COUNT = IS_MOBILE ? 70 : IS_4K ? 360 : 240;

const canvas = document.getElementById('atmo-canvas');
if (!canvas) throw new Error('[atmosphere] canvas#atmo-canvas not found');

// ── Scene ─────────────────────────────────────────────
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0d1a3a, 0.010);

const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.1, 80);
camera.position.set(0, 0, 14);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: false,
  powerPreference: 'low-power',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_MOBILE ? 1 : 2));
renderer.setSize(innerWidth, innerHeight);
renderer.setClearColor(0x000000, 0);

// ── Particles ─────────────────────────────────────────
const positions = new Float32Array(COUNT * 3);
const velocities = new Float32Array(COUNT);
for (let i = 0; i < COUNT; i++) {
  positions[i * 3]     = (Math.random() - 0.5) * 38;
  positions[i * 3 + 1] = (Math.random() - 0.5) * 28;
  positions[i * 3 + 2] = (Math.random() - 0.5) * 16;
  velocities[i]        = 0.003 + Math.random() * 0.007;
}

const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

const mat = new THREE.PointsMaterial({
  color: 0x4477ff,
  size: IS_MOBILE ? 0.12 : 0.09,
  transparent: true,
  opacity: 0.42,
  sizeAttenuation: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

scene.add(new THREE.Points(geo, mat));

// ── Accent light ──────────────────────────────────────
const accentLight = new THREE.PointLight(0x2255ff, 0.7, 35);
accentLight.position.set(4, 6, 6);
scene.add(accentLight);

// ── Per-section atmospheres ───────────────────────────
const ATMO = {
  'hero':             { fog: 0x0b1630, fogD: 0.010, col: 0x4477ff, opacity: 0.44, lCol: 0x2255ee },
  'de-ce':            { fog: 0x8aaabb, fogD: 0.004, col: 0x99bbff, opacity: 0.17, lCol: 0xaaccff },
  'flota':            { fog: 0x030c1e, fogD: 0.014, col: 0x1144cc, opacity: 0.55, lCol: 0x0033bb },
  'cum-functioneaza': { fog: 0x9ab5cc, fogD: 0.005, col: 0xaaccff, opacity: 0.15, lCol: 0xbbddff },
  'parteneri':        { fog: 0xb0c8d8, fogD: 0.003, col: 0xccddff, opacity: 0.10, lCol: 0xddeeff },
  'testimoniale':     { fog: 0x040912, fogD: 0.017, col: 0x2244aa, opacity: 0.52, lCol: 0x1133aa },
  'contact':          { fog: 0x020710, fogD: 0.021, col: 0x1a3a80, opacity: 0.48, lCol: 0x1a6ae8 },
};

function applyAtmo(id, dur = 1.8) {
  const a = ATMO[id] || ATMO['hero'];
  const gsap = window.gsap;
  if (!gsap) return;
  const fc = new THREE.Color(a.fog);
  const pc = new THREE.Color(a.col);
  const lc = new THREE.Color(a.lCol);
  gsap.to(scene.fog.color,  { r: fc.r, g: fc.g, b: fc.b, duration: dur, ease: 'power2.inOut' });
  gsap.to(scene.fog,        { density: a.fogD,            duration: dur, ease: 'power2.inOut' });
  gsap.to(mat.color,        { r: pc.r, g: pc.g, b: pc.b, duration: dur, ease: 'power2.inOut' });
  gsap.to(mat,              { opacity: a.opacity,          duration: dur, ease: 'power2.inOut' });
  gsap.to(accentLight.color,{ r: lc.r, g: lc.g, b: lc.b, duration: dur, ease: 'power2.inOut' });
}

// ── Section observer ──────────────────────────────────
const SECTION_IDS = ['hero','de-ce','flota','cum-functioneaza','parteneri','testimoniale','contact'];

const obs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) applyAtmo(e.target.id); });
}, { threshold: 0.38 });

SECTION_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (el) obs.observe(el);
});

// ── RAF loop ──────────────────────────────────────────
let alive = true;
document.addEventListener('visibilitychange', () => { alive = !document.hidden; });

const clock = new THREE.Clock();

(function tick() {
  requestAnimationFrame(tick);
  if (!alive) return;

  const t = clock.getElapsedTime();
  const p = geo.attributes.position.array;

  for (let i = 0; i < COUNT; i++) {
    p[i * 3 + 1] += velocities[i] * 0.38;
    if (p[i * 3 + 1] > 14) p[i * 3 + 1] = -14;
    p[i * 3]     += Math.sin(t * 0.22 + i * 1.4) * 0.0007;
  }
  geo.attributes.position.needsUpdate = true;

  camera.position.x = Math.sin(t * 0.07) * 0.7;
  camera.position.y = Math.cos(t * 0.05) * 0.45;
  accentLight.intensity = 0.5 + Math.sin(t * 0.38) * 0.22;

  renderer.render(scene, camera);
})();

// ── Resize ────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}, { passive: true });
