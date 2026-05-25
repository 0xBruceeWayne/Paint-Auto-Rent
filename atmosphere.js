// ══════════════════════════════════════════════════════
//  ATMOSPHERE BACKGROUND — scroll-reactive Three.js
//  Fixed canvas behind all sections. Fog + particles
//  shift atmosphere per section as user scrolls.
// ══════════════════════════════════════════════════════
import * as THREE from 'three';

// ── Tiered cost model — keep the aura visible everywhere,
//    scale particle count + DPR + frame rate to the device.
const IS_MOBILE = window.__IS_MOBILE
               || (('ontouchstart' in window) || navigator.maxTouchPoints > 0)
               || window.innerWidth <= 900;
const IS_LOW_END = window.__IS_LOW_END || false;
const IS_TINY    = window.innerWidth <= 480;
const IS_4K = !IS_MOBILE && (devicePixelRatio >= 2 || window.innerWidth >= 2560);
// Tiered count: low-end < tiny < mobile < desktop < 4K
const COUNT = IS_LOW_END ? 40
            : IS_TINY    ? 60
            : IS_MOBILE  ? 90
            : IS_4K      ? 360
            : 240;
// Render every Nth frame on slower devices — halves GPU cost without ruining motion
const FRAME_SKIP = IS_LOW_END ? 2 : IS_MOBILE ? 1 : 0; // 0=every frame, 1=every other, 2=every 3rd

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
// Cap DPR hard on mobile — biggest single GPU saving without visual loss
// (additive blue particles on dark bg don't reveal aliasing).
renderer.setPixelRatio(Math.min(devicePixelRatio, IS_LOW_END ? 0.75 : IS_MOBILE ? 1 : 1.75));
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

// Pause completely when canvas is offscreen (page scrolled past full-page apps,
// document hidden, etc.). Saves all GPU + JS cost.
let inView = true;
if ('IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    entries => entries.forEach(e => { inView = e.isIntersecting; }),
    { threshold: 0 }
  );
  io.observe(canvas);
}

// Cursor parallax — aura tracks mouse. Smoothed via lerp for cinematic glide.
let mx = 0, my = 0;          // target (from pointer)
let cx = 0, cy = 0;          // smoothed (rendered)
if (!IS_MOBILE) {
  window.addEventListener('pointermove', e => {
    mx = (e.clientX / innerWidth  - 0.5) * 2;   // -1 .. 1
    my = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
}

const clock = new THREE.Clock();
let frame = 0;

(function tick() {
  requestAnimationFrame(tick);
  if (!alive || !inView) return;

  // Frame skip for slow devices — still feels smooth, half the GPU work
  if (FRAME_SKIP && (frame++ % (FRAME_SKIP + 1)) !== 0) return;

  const t = clock.getElapsedTime();
  const p = geo.attributes.position.array;

  // Drift particles vertically + slight horizontal wave
  const wavePhase = t * 0.22;
  const waveAmp   = 0.0007;
  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    p[i3 + 1] += velocities[i] * 0.38;
    if (p[i3 + 1] > 14) p[i3 + 1] = -14;
    p[i3]     += Math.sin(wavePhase + i * 1.4) * waveAmp;
  }
  geo.attributes.position.needsUpdate = true;

  // Smoothed cursor parallax (lerp 0.045 — slow, cinematic)
  cx += (mx - cx) * 0.045;
  cy += (my - cy) * 0.045;

  // Camera = slow sway (cinematic depth) + cursor parallax
  camera.position.x = Math.sin(t * 0.07) * 0.7 + cx * 3.2;
  camera.position.y = Math.cos(t * 0.05) * 0.45 - cy * 2.0;
  camera.lookAt(cx * 1.5, -cy * 1.0, 0);

  // Accent light follows cursor too — aura "leans" toward pointer
  accentLight.position.x = 4 + cx * 6;
  accentLight.position.y = 6 - cy * 4;
  accentLight.intensity  = 0.5 + Math.sin(t * 0.38) * 0.22;

  renderer.render(scene, camera);
})();

// ── Resize — debounced so iOS URL-bar show/hide doesn't trigger full reset
let resizeRaf = 0;
window.addEventListener('resize', () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf);
  resizeRaf = requestAnimationFrame(() => {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
    resizeRaf = 0;
  });
}, { passive: true });
