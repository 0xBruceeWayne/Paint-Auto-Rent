/* divider.js — 3D perspective racing stripes (red / white / black) */
(function () {
  const canvas = document.getElementById('divider-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const STRIPE_W = 80;
  const COLORS   = ['#1a6ae8', '#ffffff', '#0a0a0a'];
  const SPEED     = 0.4;

  let W, H, offset = 0;

  function resize () {
    W = canvas.offsetWidth;
    H = canvas.offsetHeight;
    canvas.width  = W;
    canvas.height = H;
  }

  function drawStripes () {
    ctx.clearRect(0, 0, W, H);

    const vpX = W * 0.5;
    const vpY = -H * 0.6;

    const count   = Math.ceil(W / STRIPE_W) + 4;
    const startX  = -STRIPE_W * 2 + (offset % STRIPE_W);

    for (let i = 0; i < count; i++) {
      const x0    = startX + i * STRIPE_W;
      const x1    = x0 + STRIPE_W;
      const color = COLORS[((i % COLORS.length) + COLORS.length) % COLORS.length];

      const pBL = { x: x0, y: H };
      const pBR = { x: x1, y: H };
      const pTL = { x: vpX + (x0 - vpX) * 0.02, y: vpY + (H - vpY) * 0.02 };
      const pTR = { x: vpX + (x1 - vpX) * 0.02, y: vpY + (H - vpY) * 0.02 };

      const grad = ctx.createLinearGradient(0, vpY, 0, H);
      if (color === '#ffffff') {
        grad.addColorStop(0, 'rgba(255,255,255,0)');
        grad.addColorStop(0.4, 'rgba(255,255,255,0.18)');
        grad.addColorStop(1, 'rgba(255,255,255,0.96)');
      } else if (color === '#1a6ae8') {
        grad.addColorStop(0, 'rgba(0,50,180,0)');
        grad.addColorStop(0.4, 'rgba(10,70,200,0.22)');
        grad.addColorStop(1, 'rgba(26,106,232,0.98)');
      } else {
        grad.addColorStop(0, 'rgba(10,10,10,0)');
        grad.addColorStop(0.4, 'rgba(10,10,10,0.5)');
        grad.addColorStop(1, 'rgba(10,10,10,1)');
      }

      ctx.beginPath();
      ctx.moveTo(pBL.x, pBL.y);
      ctx.lineTo(pBR.x, pBR.y);
      ctx.lineTo(pTR.x, pTR.y);
      ctx.lineTo(pTL.x, pTL.y);
      ctx.closePath();
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(pBR.x, pBR.y);
      ctx.lineTo(pTR.x, pTR.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 0.5;
      ctx.stroke();
    }

    /* Fade top into hero background */
    const fadeH = H * 0.55;
    const fade = ctx.createLinearGradient(0, 0, 0, fadeH);
    fade.addColorStop(0, 'rgba(10,10,10,1)');
    fade.addColorStop(1, 'rgba(10,10,10,0)');
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, W, fadeH);
  }

  let _last = 0;
  function loop (ts) {
    requestAnimationFrame(loop);
    if (ts - _last < 33) return; // cap at ~30fps
    _last = ts;
    offset += SPEED;
    drawStripes();
  }

  resize();
  window.addEventListener('resize', resize);
  loop();
})();
