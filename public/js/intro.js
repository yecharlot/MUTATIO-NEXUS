(function () {
  const canvas = document.getElementById('intro-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let w, h, t0 = performance.now(), phase = 0;
  const copy = document.getElementById('intro-copy');
  const lines = [
    'El planeta gira en silencio.',
    'El Caribe emerge entre nubes de tormenta y luz.',
    'Cuba aparece como una isla de decisiones pendientes.',
    'Bajo el mar, señales geométricas… sin origen confirmado.',
    'El colapso no es destino. Es una trayectoria que aún se puede torcer.',
  ];

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  function draw(ts) {
    const t = (ts - t0) / 1000;
    phase = Math.min(4, Math.floor(t / 2.2));
    if (copy) copy.textContent = lines[phase] || lines[lines.length - 1];

    const gw = window.innerWidth;
    const gh = window.innerHeight;
    ctx.clearRect(0, 0, gw, gh);
    const g = ctx.createRadialGradient(gw * 0.5, gh * 0.45, 10, gw * 0.5, gh * 0.5, gw * 0.7);
    g.addColorStop(0, '#12304a');
    g.addColorStop(0.45, '#0a1a2c');
    g.addColorStop(1, '#02050c');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, gw, gh);

    // stars
    ctx.fillStyle = 'rgba(200,230,255,0.7)';
    for (let i = 0; i < 80; i++) {
      const x = (i * 97) % gw;
      const y = (i * 53) % (gh * 0.55);
      ctx.globalAlpha = 0.2 + (i % 5) * 0.1;
      ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.globalAlpha = 1;

    // planet / zoom
    const zoom = reduce ? 1 : Math.min(1.8, 0.35 + t * 0.12);
    const cx = gw * 0.5;
    const cy = gh * 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy + 40, 180 * zoom, 0, Math.PI * 2);
    const ocean = ctx.createLinearGradient(cx - 200, cy, cx + 200, cy + 100);
    ocean.addColorStop(0, '#0b4f6c');
    ocean.addColorStop(0.5, '#128a7a');
    ocean.addColorStop(1, '#0a3350');
    ctx.fillStyle = ocean;
    ctx.fill();

    // cuba silhouette simplified
    ctx.save();
    ctx.translate(cx - 40 * zoom, cy + 10 * zoom);
    ctx.scale(zoom * 1.1, zoom * 1.1);
    ctx.beginPath();
    ctx.moveTo(-90, 0);
    ctx.bezierCurveTo(-40, -25, 40, -20, 100, 5);
    ctx.bezierCurveTo(70, 25, 0, 30, -70, 18);
    ctx.closePath();
    ctx.fillStyle = '#d4b483';
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    // undersea signals
    if (phase >= 3) {
      ctx.strokeStyle = 'rgba(94,200,255,0.7)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        ctx.strokeRect(-30 + i * 18, 28 + i * 4, 14, 10);
      }
    }
    ctx.restore();

    // gold dust particles
    if (!reduce) {
      ctx.fillStyle = 'rgba(240,180,41,0.5)';
      for (let i = 0; i < 30; i++) {
        const px = (Math.sin(t + i) * 0.5 + 0.5) * gw;
        const py = (gh * 0.3 + ((t * 20 + i * 40) % (gh * 0.5)));
        ctx.fillRect(px, py, 2, 2);
      }
    }

    if (document.getElementById('intro') && !document.getElementById('intro').classList.contains('hidden')) {
      requestAnimationFrame(draw);
    }
  }
  requestAnimationFrame(draw);

  window.MutatioIntro = {
    skip() {
      const el = document.getElementById('intro');
      if (el) el.classList.add('hidden');
    },
  };
})();
