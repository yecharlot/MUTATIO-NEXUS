const IsoMap = {
  canvas: null,
  ctx: null,
  state: null,
  particles: [],
  init() {
    this.canvas = document.getElementById('iso-map');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    for (let i = 0; i < 40; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        v: 0.2 + Math.random() * 0.5,
      });
    }
    this.loop();
  },
  setState(state) {
    this.state = state;
  },
  tile(x, y, w, h, color, stroke) {
    const ctx = this.ctx;
    const sx = 450 + (x - y) * w * 0.55;
    const sy = 80 + (x + y) * h * 0.35;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + w * 0.55, sy + h * 0.3);
    ctx.lineTo(sx, sy + h * 0.6);
    ctx.lineTo(sx - w * 0.55, sy + h * 0.3);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = stroke || 'rgba(255,255,255,0.12)';
    ctx.stroke();
    return { sx, sy };
  },
  moodColor(mood) {
    if (mood === 'crisis') return '#6b2a36';
    if (mood === 'tenso') return '#6b5a2a';
    if (mood === 'esperanza') return '#1f5c4a';
    return '#2a4a6b';
  },
  draw() {
    const ctx = this.ctx;
    const c = this.canvas;
    if (!ctx) return;
    ctx.clearRect(0, 0, c.width, c.height);
    // ocean wash
    const g = ctx.createLinearGradient(0, 0, 0, c.height);
    g.addColorStop(0, '#071422');
    g.addColorStop(1, '#0a2740');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, c.width, c.height);

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce) {
      ctx.fillStyle = 'rgba(94,200,255,0.25)';
      for (const p of this.particles) {
        p.y -= p.v;
        if (p.y < 0) p.y = c.height;
        ctx.fillRect(p.x, p.y, 2, 2);
      }
    }

    const regions = this.state?.regions || [
      { id: 'g', name: 'Guanahacabibes', x: 0, y: 2, mood: 'tenso' },
      { id: 'o', name: 'Occidente', x: 1, y: 2, mood: 'tenso' },
      { id: 'h', name: 'La Habana', x: 2, y: 2, mood: 'estable' },
      { id: 'c', name: 'Centro', x: 3, y: 2, mood: 'tenso' },
      { id: 'or', name: 'Oriente', x: 5, y: 2, mood: 'crisis' },
      { id: 's', name: 'Sur', x: 3, y: 3, mood: 'tenso' },
    ];

    ctx.font = '12px Outfit, sans-serif';
    for (const r of regions) {
      const { sx, sy } = this.tile(r.x, r.y, 90, 70, this.moodColor(r.mood));
      ctx.fillStyle = 'rgba(232,241,255,0.9)';
      ctx.fillText(r.name, sx - 28, sy + 28);
    }

    // undersea signal near guanahacabibes
    const evidence = this.state?.mystery?.evidence || 0;
    if (evidence > 0) {
      ctx.strokeStyle = `rgba(240,180,41,${0.3 + evidence / 200})`;
      ctx.strokeRect(120, 320, 40, 24);
      ctx.strokeRect(135, 335, 40, 24);
    }
  },
  loop() {
    this.draw();
    requestAnimationFrame(() => this.loop());
  },
};
