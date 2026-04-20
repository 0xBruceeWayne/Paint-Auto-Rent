/* prismatic-burst.js
   Vanilla WebGL2 port of react-bits PrismaticBurst
   Replaces hero map background (#map-global)
*/
(function () {
  'use strict';

  /* ── Config ── */
  const CFG = {
    colors:    ['#1a6ae8', '#4db8ff', '#0a4fd4'],
    intensity:  3.4,
    speed:      0.18,    // very slow ray animation
    animType:   2,       // 0=rotate  1=rotate3d  2=hover
    distort:    6,
    dampness:   0.28,    // fast mouse response ~0.3s
    rayCount:   0,
    noise:      0.8,
  };

  /* ── Insert canvas into hero ── */
  const hero = document.getElementById('hero');
  if (!hero) return;

  const canvas = document.createElement('canvas');
  canvas.id = 'pburst';
  canvas.style.cssText = [
    'position:absolute', 'inset:0', 'width:100%', 'height:100%',
    'pointer-events:none', 'z-index:1',
    'image-rendering:high-quality',
  ].join(';');
  hero.insertBefore(canvas, hero.firstChild);

  /* ── Hide global map image ── */
  const mapGlobal = document.getElementById('map-global');
  if (mapGlobal) mapGlobal.style.display = 'none';

  /* ── WebGL2 ── */
  const dpr = Math.max(window.devicePixelRatio || 2, 2);
  const gl  = canvas.getContext('webgl2', { alpha: false, antialias: true, powerPreference: 'high-performance' });
  if (!gl) { console.warn('WebGL2 not supported'); return; }

  /* ── Shaders ── */
  const VS = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const FS = `#version 300 es
precision highp float;
precision highp int;
out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;
uniform float uIntensity;
uniform float uSpeed;
uniform int   uAnimType;
uniform vec2  uMouse;
uniform int   uColorCount;
uniform float uDistort;
uniform vec2  uOffset;
uniform sampler2D uGradient;
uniform float uNoiseAmount;
uniform int   uRayCount;

float hash21(vec2 p){
  vec2 q = fract(p * vec2(0.1031, 0.1030));
  q += dot(q, q.yx + 33.33);
  return fract((q.x + q.y) * q.x);
}
float vnoise(vec2 p){
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f*f*(3.0-2.0*f);
  return mix(
    mix(hash21(i), hash21(i+vec2(1,0)), f.x),
    mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y);
}
mat2 rot30(){ return mat2(0.8,-0.5,0.5,0.8); }
float layeredNoise(vec2 px){
  vec2 p = mod(px + vec2(uTime*30.0,-uTime*21.0), 1024.0);
  vec2 q = rot30()*p;
  float n = 0.0;
  n += 0.40*vnoise(q*0.5);
  n += 0.28*vnoise(q);
  n += 0.16*vnoise(q*2.0+17.0);
  n += 0.09*vnoise(q*4.0+47.0);
  n += 0.05*vnoise(q*8.0+113.0);
  n += 0.015*vnoise(q*16.0+191.0);
  n += 0.005*vnoise(q*32.0+277.0);
  return n;
}
vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
  float focal = res.y * max(dist, 1e-3);
  return normalize(vec3(2.0*(frag-offset)-res, focal));
}
float edgeFade(vec2 frag, vec2 res, vec2 offset){
  vec2 toC = frag - 0.5*res - offset;
  float r = length(toC)/(0.5*min(res.x,res.y));
  float x = clamp(r,0.0,1.0);
  float q = x*x*x*(x*(x*6.0-15.0)+10.0);
  float s = q*0.5;
  s = pow(s,1.5);
  float tail = 1.0 - pow(1.0-s,2.0);
  s = mix(s,tail,0.2);
  float dn = (layeredNoise(frag*0.15)-0.5)*0.0015*s;
  return clamp(s+dn,0.0,1.0);
}
mat3 rotX(float a){ float c=cos(a),s=sin(a); return mat3(1,0,0, 0,c,-s, 0,s,c); }
mat3 rotY(float a){ float c=cos(a),s=sin(a); return mat3(c,0,s, 0,1,0, -s,0,c); }
mat3 rotZ(float a){ float c=cos(a),s=sin(a); return mat3(c,-s,0, s,c,0, 0,0,1); }
vec3 sampleGradient(float t){
  return texture(uGradient, vec2(clamp(t,0.0,1.0), 0.5)).rgb;
}
vec2 rot2(vec2 v, float a){
  float s=sin(a),c=cos(a);
  return mat2(c,-s,s,c)*v;
}
float bendAngle(vec3 q, float t){
  return 0.8*sin(q.x*0.55+t*0.6)
       + 0.7*sin(q.y*0.50-t*0.5)
       + 0.6*sin(q.z*0.60+t*0.7);
}

void main(){
  vec2 frag = gl_FragCoord.xy;
  float t = uTime * uSpeed;
  float jitterAmp = 0.1 * clamp(uNoiseAmount,0.0,1.0);
  vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
  float marchT = 0.0;
  vec3 col = vec3(0.03, 0.07, 0.30);
  float n = layeredNoise(frag);
  vec4 c4 = cos(t*0.2 + vec4(0.0,33.0,11.0,0.0));
  mat2 M2 = mat2(c4.x,c4.y,c4.z,c4.w);
  float amp = clamp(uDistort,0.0,50.0)*0.15;

  mat3 rot3dMat = mat3(1.0);
  if(uAnimType==1){
    vec3 ang = vec3(t*0.31,t*0.21,t*0.17);
    rot3dMat = rotZ(ang.z)*rotY(ang.y)*rotX(ang.x);
  }
  mat3 hoverMat = mat3(1.0);
  if(uAnimType==2){
    vec2 m = uMouse*2.0-1.0;
    hoverMat = rotY(m.x*1.4 + uTime*0.14)*rotX(m.y*1.4 + uTime*0.05);
  }

  for(int i=0;i<32;++i){
    vec3 P = marchT*dir;
    P.z -= 2.0;
    float rad = length(P);
    vec3 Pl = P*(10.0/max(rad,1e-6));

    if(uAnimType==0)      Pl.xz *= M2;
    else if(uAnimType==1) Pl = rot3dMat*Pl;
    else                  Pl = hoverMat*Pl;

    float stepLen = min(rad-0.3, n*jitterAmp)+0.1;
    float grow = smoothstep(0.35,3.0,marchT);
    float a1 = amp*grow*bendAngle(Pl*0.6,t);
    float a2 = 0.5*amp*grow*bendAngle(Pl.zyx*0.5+3.1,t*0.9);
    vec3 Pb = Pl;
    Pb.xz = rot2(Pb.xz,a1);
    Pb.xy = rot2(Pb.xy,a2);

    float rayPattern = smoothstep(0.5,0.7,
      sin(Pb.x+cos(Pb.y)*cos(Pb.z)) *
      sin(Pb.z+sin(Pb.y)*cos(Pb.x+t))
    );
    if(uRayCount>0){
      float ang = atan(Pb.y,Pb.x);
      float comb = 0.5+0.5*cos(float(uRayCount)*ang);
      comb = pow(comb,3.0);
      rayPattern *= smoothstep(0.15,0.95,comb);
    }

    vec3 spectralDefault = 1.0+vec3(
      cos(marchT*3.0+0.0),
      cos(marchT*3.0+1.0),
      cos(marchT*3.0+2.0)
    );
    float saw = fract(marchT*0.25);
    float tRay = saw*saw*(3.0-2.0*saw);
    vec3 userGradient = 2.0*sampleGradient(tRay);
    vec3 spectral = (uColorCount>0) ? userGradient : spectralDefault;
    vec3 base = (0.05/(0.4+stepLen))*smoothstep(5.0,0.0,rad)*spectral;
    col += base*rayPattern;
    marchT += stepLen;
  }

  col *= edgeFade(frag, uResolution, uOffset);
  col *= uIntensity;
  fragColor = vec4(clamp(col,0.0,1.0),1.0);
}`;

  /* ── Compile ── */
  function compileShader(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      console.error('Shader error:', gl.getShaderInfoLog(s));
    return s;
  }

  const prog = gl.createProgram();
  gl.attachShader(prog, compileShader(gl.VERTEX_SHADER,   VS));
  gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    console.error('Program error:', gl.getProgramInfoLog(prog));
  gl.useProgram(prog);

  /* ── Full-screen triangle (OGL Triangle equivalent) ── */
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);

  const posBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
  const posLoc = gl.getAttribLocation(prog, 'position');
  gl.enableVertexAttribArray(posLoc);
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

  const uvBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, uvBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0,0, 2,0, 0,2]), gl.STATIC_DRAW);
  const uvLoc = gl.getAttribLocation(prog, 'uv');
  gl.enableVertexAttribArray(uvLoc);
  gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);

  gl.bindVertexArray(null);

  /* ── Uniform locations ── */
  const U = {};
  ['uResolution','uTime','uIntensity','uSpeed','uAnimType','uMouse',
   'uColorCount','uDistort','uOffset','uGradient','uNoiseAmount','uRayCount']
  .forEach(n => { U[n] = gl.getUniformLocation(prog, n); });

  /* ── Gradient texture from hex colors ── */
  function hexToRgb(hex) {
    let h = hex.trim().replace('#','');
    if (h.length === 3) h = h.split('').map(c => c+c).join('');
    const v = parseInt(h, 16);
    return [((v>>16)&255), ((v>>8)&255), (v&255)];
  }

  const gradData = new Uint8Array(CFG.colors.length * 4);
  CFG.colors.forEach((c, i) => {
    const [r,g,b] = hexToRgb(c);
    gradData[i*4]=r; gradData[i*4+1]=g; gradData[i*4+2]=b; gradData[i*4+3]=255;
  });
  const gradTex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, gradTex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, CFG.colors.length, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, gradData);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  /* ── Static uniforms ── */
  gl.uniform1f(U.uIntensity,   CFG.intensity);
  gl.uniform1f(U.uSpeed,       CFG.speed);
  gl.uniform1i(U.uAnimType,    CFG.animType);
  gl.uniform1i(U.uColorCount,  CFG.colors.length);
  gl.uniform1f(U.uDistort,     CFG.distort);
  gl.uniform2f(U.uOffset,      0, 0);
  gl.uniform1f(U.uNoiseAmount, CFG.noise);
  gl.uniform1i(U.uRayCount,    CFG.rayCount);
  gl.uniform1i(U.uGradient,    0);

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, gradTex);

  /* ── Resize ── */
  function resize() {
    const w = hero.clientWidth  || window.innerWidth;
    const h = hero.clientHeight || window.innerHeight;
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(prog);
    gl.uniform2f(U.uResolution, canvas.width, canvas.height);
  }

  if ('ResizeObserver' in window) {
    new ResizeObserver(resize).observe(hero);
  } else {
    window.addEventListener('resize', resize);
  }
  resize();

  /* ── Mouse tracking ── */
  const mouseTarget = [0.5, 0.5];
  const mouseSmooth = [0.5, 0.5];

  window.addEventListener('mousemove', e => {
    const r = hero.getBoundingClientRect();
    mouseTarget[0] = Math.min(Math.max((e.clientX - r.left)  / r.width,  0), 1);
    mouseTarget[1] = Math.min(Math.max((e.clientY - r.top)   / r.height, 0), 1);
  }, { passive: true });

  /* ── CSS cursor-glow orbs (DOM-based, always works) ── */
  hero.style.overflow = 'hidden';
  const _css = document.createElement('style');
  _css.textContent = `
.pb-orb{position:absolute;border-radius:50%;pointer-events:none;top:0;left:0;will-change:transform;}
#pb-o1{width:680px;height:480px;
  background:radial-gradient(ellipse,rgba(30,110,240,.65) 0%,rgba(26,106,232,.25) 42%,transparent 68%);
  filter:blur(85px);z-index:3;}
#pb-o2{width:380px;height:380px;
  background:radial-gradient(circle,rgba(100,195,255,.55) 0%,rgba(77,184,255,.15) 50%,transparent 70%);
  filter:blur(55px);z-index:4;}
#pb-o3{width:960px;height:660px;
  background:radial-gradient(ellipse,rgba(10,55,200,.35) 0%,rgba(8,40,180,.08) 55%,transparent 68%);
  filter:blur(115px);z-index:2;}`;
  document.head.appendChild(_css);

  const _o1 = document.createElement('div'); _o1.className='pb-orb'; _o1.id='pb-o1';
  const _o2 = document.createElement('div'); _o2.className='pb-orb'; _o2.id='pb-o2';
  const _o3 = document.createElement('div'); _o3.className='pb-orb'; _o3.id='pb-o3';
  hero.appendChild(_o1); hero.appendChild(_o2); hero.appendChild(_o3);

  /* orb state: x,y in [0..1] hero-relative; hw,hh = half-dimensions */
  const _orbs = [
    { el:_o1, x:0.5, y:0.5, hw:340, hh:240, spd:0.040, inv:false },
    { el:_o2, x:0.5, y:0.5, hw:190, hh:190, spd:0.022, inv:false },
    { el:_o3, x:0.5, y:0.5, hw:480, hh:330, spd:0.010, inv:true  },
  ];

  /* ── Animation loop ── */
  let last = performance.now(), elapsed = 0;

  function loop(now) {
    requestAnimationFrame(loop);
    const dt = Math.max(0, Math.min(now - last, 100)) * 0.001;
    last = now;
    elapsed += dt;

    const tau   = 0.02 + CFG.dampness * 0.5;
    const alpha = 1 - Math.exp(-dt / tau);
    mouseSmooth[0] += (mouseTarget[0] - mouseSmooth[0]) * alpha;
    mouseSmooth[1] += (mouseTarget[1] - mouseSmooth[1]) * alpha;

    gl.useProgram(prog);
    gl.uniform1f(U.uTime,  elapsed);
    gl.uniform2fv(U.uMouse, mouseSmooth);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindVertexArray(null);

    /* update CSS orb positions */
    const hW = hero.clientWidth, hH = hero.clientHeight;
    _orbs.forEach(o => {
      const tx = o.inv ? 1 - mouseTarget[0] : mouseTarget[0];
      const ty = o.inv ? 1 - mouseTarget[1] : mouseTarget[1];
      o.x += (tx - o.x) * o.spd;
      o.y += (ty - o.y) * o.spd;
      o.el.style.transform = `translate(${o.x*hW - o.hw}px,${o.y*hH - o.hh}px)`;
    });
  }

  requestAnimationFrame(loop);
})();
