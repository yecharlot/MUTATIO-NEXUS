/**
 * Mapa isométrico de Cuba — NEXUS
 * Silueta alargada O→E, tiles con volumen, costa, estados por región.
 */
const IsoMap = {
  canvas: null,
  ctx: null,
  state: null,
  t: 0,
  hoverId: null,
  reduceMotion: false,
  cssW: 900,
  cssH: 520,

  LAYOUT: [
    { c: 0, r: 3, id: 'guanahacabibes' },
    { c: 1, r: 3, id: 'guanahacabibes' },
    { c: 1, r: 2, id: 'guanahacabibes' },
    { c: 2, r: 2, id: 'occidente' },
    { c: 2, r: 3, id: 'occidente' },
    { c: 3, r: 2, id: 'occidente' },
    { c: 3, r: 3, id: 'occidente' },
    { c: 4, r: 2, id: 'habana' },
    { c: 4, r: 3, id: 'habana' },
    { c: 5, r: 2, id: 'habana' },
    { c: 5, r: 3, id: 'centro' },
    { c: 6, r: 2, id: 'centro' },
    { c: 6, r: 3, id: 'centro' },
    { c: 7, r: 2, id: 'centro' },
    { c: 7, r: 3, id: 'centro' },
    { c: 8, r: 2, id: 'oriente' },
    { c: 8, r: 3, id: 'oriente' },
    { c: 9, r: 2, id: 'oriente' },
    { c: 9, r: 3, id: 'oriente' },
    { c: 10, r: 2, id: 'oriente' },
    { c: 4, r: 4, id: 'sur' },
    { c: 5, r: 4, id: 'sur' },
    { c: 6, r: 4, id: 'sur' },
    { c: 7, r: 4, id: 'sur' },
  ],

  REGION_META: {
    guanahacabibes: { name: 'Guanahacabibes', accent: '#5ec8ff' },
    occidente: { name: 'Occidente', accent: '#7dd3fc' },
    habana: { name: 'La Habana', accent: '#f0b429' },
    centro: { name: 'Centro', accent: '#86efac' },
    oriente: { name: 'Oriente', accent: '#f9a8d4' },
    sur: { name: 'Sur insular', accent: '#a5b4fc' },
  },

  init() {
    this.canvas = document.getElementById('iso-map');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._resize();
    window.addEventListener('resize', () => this._resize());
    this.canvas.addEventListener('pointermove', (e) => this._onPointer(e));
    this.canvas.addEventListener('pointerleave', () => { this.hoverId = null; });
    this.loop();
  },

  _resize() {
    const parent = this.canvas.parentElement;
    const cssW = Math.max(320, parent?.clientWidth || 900);
    const cssH = Math.round(Math.min(520, Math.max(280, cssW * 0.56)));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.floor(cssW * dpr);
    this.canvas.height = Math.floor(cssH * dpr);
    this.canvas.style.width = cssW + 'px';
    this.canvas.style.height = cssH + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.cssW = cssW;
    this.cssH = cssH;
  },

  setState(state) { this.state = state; },

  project(c, r, elev) {
    elev = elev || 0;
    const tileW = this.cssW / 15.5;
    const tileH = tileW * 0.55;
    const originX = this.cssW * 0.4;
    const originY = this.cssH * 0.1;
    return {
      x: originX + (c - r) * tileW * 0.52,
      y: originY + (c + r) * tileH * 0.5 - elev,
      tileW: tileW,
      tileH: tileH,
    };
  },

  moodOf(regionId) {
    const reg = (this.state && this.state.regions || []).find(function (r) { return r.id === regionId; });
    return (reg && reg.mood) || 'tenso';
  },

  colorsForMood(mood) {
    const table = {
      crisis: { top: '#7a3542', left: '#52242d', right: '#3d1b22', edge: '#ff6b7a' },
      tenso: { top: '#7a6840', left: '#54462c', right: '#3f3521', edge: '#f0b429' },
      estable: { top: '#2f6b58', left: '#214a3d', right: '#18382e', edge: '#3dd68c' },
      esperanza: { top: '#1c7a6a', left: '#14554a', right: '#0f4038', edge: '#2dd4bf' },
    };
    return table[mood] || table.tenso;
  },

  _shade(hex, amt) {
    const n = hex.replace('#', '');
    const full = n.length === 3 ? n.split('').map(function (c) { return c + c; }).join('') : n;
    const num = parseInt(full, 16);
    var r = (num >> 16) + amt;
    var g = ((num >> 8) & 255) + amt;
    var b = (num & 255) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  },

  drawPrism(c, r, elev, cols, highlight) {
    const ctx = this.ctx;
    const p = this.project(c, r, elev);
    const x = p.x, y = p.y, tileW = p.tileW, tileH = p.tileH;
    const hw = tileW * 0.5;
    const hh = tileH * 0.5;
    const depth = tileH * 0.45 + elev * 0.12;

    ctx.beginPath();
    ctx.moveTo(x, y - hh * 0.12);
    ctx.lineTo(x + hw, y + hh * 0.35);
    ctx.lineTo(x, y + hh * 0.82);
    ctx.lineTo(x - hw, y + hh * 0.35);
    ctx.closePath();
    var topGrad = ctx.createLinearGradient(x - hw, y, x + hw, y + hh);
    topGrad.addColorStop(0, cols.top);
    topGrad.addColorStop(1, this._shade(cols.top, -28));
    ctx.fillStyle = topGrad;
    ctx.fill();
    ctx.strokeStyle = highlight ? cols.edge : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = highlight ? 2.2 : 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - hw, y + hh * 0.35);
    ctx.lineTo(x, y + hh * 0.82);
    ctx.lineTo(x, y + hh * 0.82 + depth);
    ctx.lineTo(x - hw, y + hh * 0.35 + depth);
    ctx.closePath();
    ctx.fillStyle = cols.left;
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x + hw, y + hh * 0.35);
    ctx.lineTo(x, y + hh * 0.82);
    ctx.lineTo(x, y + hh * 0.82 + depth);
    ctx.lineTo(x + hw, y + hh * 0.35 + depth);
    ctx.closePath();
    ctx.fillStyle = cols.right;
    ctx.fill();
  },

  drawOcean() {
    const ctx = this.ctx;
    const w = this.cssW;
    const h = this.cssH;
    var g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#050e18');
    g.addColorStop(0.4, '#0a2840');
    g.addColorStop(0.75, '#0d4560');
    g.addColorStop(1, '#0a3048');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = 'rgba(45, 212, 191, 0.07)';
    for (var i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(w * 0.48, h * 0.52, w * (0.18 + i * 0.07), h * (0.1 + i * 0.045), -0.35, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (!this.reduceMotion) {
      ctx.strokeStyle = 'rgba(94, 200, 255, 0.14)';
      for (var j = 0; j < 9; j++) {
        ctx.beginPath();
        var baseY = h * 0.22 + j * (h * 0.075);
        for (var x = 0; x < w; x += 6) {
          var y = baseY + Math.sin(x * 0.018 + this.t * 0.002 + j * 0.7) * 3.5;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    var bloom = ctx.createRadialGradient(w * 0.55, h * 0.28, 8, w * 0.5, h * 0.4, w * 0.45);
    bloom.addColorStop(0, 'rgba(94, 200, 255, 0.1)');
    bloom.addColorStop(1, 'transparent');
    ctx.fillStyle = bloom;
    ctx.fillRect(0, 0, w, h);
  },

  drawUnderseaSignals() {
    var evidence = (this.state && this.state.mystery && this.state.mystery.evidence) || 0;
    if (evidence <= 0) return;
    var ctx = this.ctx;
    var p = this.project(0.4, 4.3, 0);
    var pulse = this.reduceMotion ? 0.5 : 0.4 + Math.sin(this.t * 0.004) * 0.25;
    ctx.save();
    ctx.globalAlpha = 0.3 + evidence / 180;
    ctx.strokeStyle = 'rgba(240, 180, 41, ' + pulse + ')';
    ctx.lineWidth = 1.6;
    for (var i = 0; i < 3; i++) {
      var s = 14 + i * 11 + evidence * 0.04;
      ctx.strokeRect(p.x - s / 2, p.y + 18 + i * 7, s, s * 0.5);
    }
    ctx.fillStyle = 'rgba(240, 180, 41, 0.85)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('señales submarinas', p.x, p.y + 62);
    ctx.restore();
  },

  drawRegionLabels() {
    var ctx = this.ctx;
    var centers = {};
    for (var i = 0; i < this.LAYOUT.length; i++) {
      var cell = this.LAYOUT[i];
      if (!centers[cell.id]) centers[cell.id] = { c: 0, r: 0, n: 0 };
      centers[cell.id].c += cell.c;
      centers[cell.id].r += cell.r;
      centers[cell.id].n += 1;
    }
    ctx.textAlign = 'center';
    for (var id in centers) {
      if (!centers.hasOwnProperty(id)) continue;
      var meta = this.REGION_META[id];
      if (!meta) continue;
      var acc = centers[id];
      var p = this.project(acc.c / acc.n, acc.r / acc.n, 20);
      var mood = this.moodOf(id);
      var glow = this.hoverId === id;
      ctx.save();
      if (glow) {
        ctx.shadowColor = meta.accent;
        ctx.shadowBlur = 14;
      }
      ctx.font = '600 11px Outfit, sans-serif';
      var label = meta.name;
      var tw = ctx.measureText(label).width;
      var pw = tw + 20;
      var ph = 24;
      ctx.fillStyle = 'rgba(6, 12, 22, 0.82)';
      ctx.strokeStyle = meta.accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.rect(p.x - pw / 2, p.y - ph / 2, pw, ph);
      ctx.fill();
      ctx.stroke();
      var cols = this.colorsForMood(mood);
      ctx.beginPath();
      ctx.arc(p.x - pw / 2 + 10, p.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = cols.edge;
      ctx.fill();
      ctx.fillStyle = '#e8f1ff';
      ctx.fillText(label, p.x + 4, p.y + 4);
      ctx.restore();
    }
  },

  drawLegend() {
    var ctx = this.ctx;
    var items = [
      { k: 'crisis', l: 'Crisis' },
      { k: 'tenso', l: 'Tenso' },
      { k: 'estable', l: 'Estable' },
      { k: 'esperanza', l: 'Esperanza' },
    ];
    var x = 14;
    var y = this.cssH - 26;
    ctx.fillStyle = 'rgba(6,12,22,0.78)';
    ctx.fillRect(8, y - 12, 300, 24);
    ctx.font = '10px Outfit, sans-serif';
    for (var i = 0; i < items.length; i++) {
      var c = this.colorsForMood(items[i].k);
      ctx.fillStyle = c.top;
      ctx.fillRect(x, y - 5, 11, 11);
      ctx.strokeStyle = c.edge;
      ctx.strokeRect(x, y - 5, 11, 11);
      ctx.fillStyle = '#8fa3bf';
      ctx.textAlign = 'left';
      ctx.fillText(items[i].l, x + 15, y + 4);
      x += 72;
    }
  },

  drawTitle() {
    var ctx = this.ctx;
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(232,241,255,0.95)';
    ctx.font = '600 13px Outfit, sans-serif';
    ctx.fillText('CUBA · NEXUS', 14, 20);
    ctx.fillStyle = 'rgba(143,163,191,0.9)';
    ctx.font = '10px Outfit, sans-serif';
    ctx.fillText('Territorio vivo — tus decisiones cambian el mapa', 14, 36);
  },

  drawCityMarkers() {
    var spots = [
      { id: 'habana', c: 4.6, r: 2.35 },
      { id: 'oriente', c: 9.1, r: 2.4 },
      { id: 'centro', c: 6.6, r: 2.45 },
    ];
    var ctx = this.ctx;
    for (var i = 0; i < spots.length; i++) {
      var s = spots[i];
      if (this.moodOf(s.id) === 'crisis') continue;
      var p = this.project(s.c, s.r, 24);
      ctx.fillStyle = 'rgba(240, 180, 41, 0.9)';
      ctx.fillRect(p.x - 2, p.y - 12, 4, 12);
      ctx.fillStyle = 'rgba(94, 200, 255, 0.55)';
      ctx.fillRect(p.x - 6, p.y - 7, 3, 7);
    }
  },

  _onPointer(e) {
    var rect = this.canvas.getBoundingClientRect();
    var px = ((e.clientX - rect.left) / rect.width) * this.cssW;
    var py = ((e.clientY - rect.top) / rect.height) * this.cssH;
    var found = null;
    var best = Infinity;
    var centers = {};
    for (var i = 0; i < this.LAYOUT.length; i++) {
      var cell = this.LAYOUT[i];
      if (!centers[cell.id]) centers[cell.id] = { c: 0, r: 0, n: 0 };
      centers[cell.id].c += cell.c;
      centers[cell.id].r += cell.r;
      centers[cell.id].n += 1;
    }
    for (var id in centers) {
      if (!centers.hasOwnProperty(id)) continue;
      var acc = centers[id];
      var p = this.project(acc.c / acc.n, acc.r / acc.n, 10);
      var d = (p.x - px) * (p.x - px) + (p.y - py) * (p.y - py);
      if (d < best && d < 60 * 60) {
        best = d;
        found = id;
      }
    }
    this.hoverId = found;
    this.canvas.style.cursor = found ? 'pointer' : 'default';
  },

  drawHoverCard() {
    if (!this.hoverId) return;
    var meta = this.REGION_META[this.hoverId];
    var mood = this.moodOf(this.hoverId);
    var reg = (this.state && this.state.regions || []).find(function (r) { return r.id === this.hoverId; }.bind(this));
    var ctx = this.ctx;
    var x = this.cssW - 170;
    var y = 12;
    ctx.fillStyle = 'rgba(8, 14, 26, 0.94)';
    ctx.strokeStyle = (meta && meta.accent) || '#5ec8ff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.rect(x, y, 156, 80);
    ctx.fill();
    ctx.stroke();
    ctx.textAlign = 'left';
    ctx.fillStyle = '#e8f1ff';
    ctx.font = '600 12px Outfit, sans-serif';
    ctx.fillText((meta && meta.name) || this.hoverId, x + 12, y + 22);
    ctx.fillStyle = '#8fa3bf';
    ctx.font = '11px Outfit, sans-serif';
    ctx.fillText('Estado: ' + mood, x + 12, y + 42);
    if (reg) {
      ctx.fillText('Energía local ~ ' + (reg.energy != null ? reg.energy : '—'), x + 12, y + 58);
      ctx.fillText('Alimentos ~ ' + (reg.food != null ? reg.food : '—'), x + 12, y + 72);
    }
  },

  draw() {
    if (!this.ctx || !this.cssW) return;
    this.drawOcean();
    var cells = this.LAYOUT.slice().sort(function (a, b) { return a.c + a.r - (b.c + b.r); });
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      var mood = this.moodOf(cell.id);
      var cols = this.colorsForMood(mood);
      var elev = mood === 'esperanza' ? 7 : mood === 'crisis' ? 0 : 3;
      this.drawPrism(cell.c, cell.r, elev, cols, this.hoverId === cell.id);
    }
    this.drawCityMarkers();
    this.drawUnderseaSignals();
    this.drawRegionLabels();
    this.drawLegend();
    this.drawTitle();
    this.drawHoverCard();
  },

  loop() {
    if (!this.reduceMotion) this.t += 16;
    this.draw();
    requestAnimationFrame(function () { IsoMap.loop(); });
  },
};
