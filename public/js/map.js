import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * MUTATIO / NEXUS — mapa 3D de Cuba.
 * Three.js es la capa visual; el estado autoritativo sigue llegando desde la API.
 */
const IsoMap = {
  host: null, scene: null, camera: null, renderer: null, controls: null,
  clock: new THREE.Clock(), state: null, frame: 0, reduceMotion: false,
  raycaster: new THREE.Raycaster(), pointer: new THREE.Vector2(),
  interactive: [], labels: [], selected: null, resizeObserver: null,
  materials: {}, oceanUniforms: null,

  REGIONS: [
    { id: 'guanahacabibes', name: 'Guanahacabibes', x: -31, z: 1.5, color: '#67c9ef', note: 'Reserva natural y puerta occidental del misterio submarino.' },
    { id: 'occidente', name: 'Occidente', x: -20, z: -0.5, color: '#8bd5ef', note: 'Agricultura, industria y conexiones logísticas.' },
    { id: 'habana', name: 'La Habana', x: -10, z: -1, color: '#f2c56e', note: 'Centro urbano, conocimiento y coordinación.' },
    { id: 'centro', name: 'Centro', x: 4, z: 0.5, color: '#8de0ae', note: 'Producción, energía y corredores de transporte.' },
    { id: 'oriente', name: 'Oriente', x: 25, z: 1.2, color: '#e6a7c5', note: 'Recursos, puertos y comunidades del este.' },
    { id: 'sur', name: 'Sur insular', x: 1, z: 10, color: '#b9a8f4', note: 'Ecosistemas costeros y rutas marítimas.' }
  ],

  init() {
    this.host = document.getElementById('iso-map');
    if (!this.host || this.renderer) return;
    this.reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#061725');
    this.scene.fog = new THREE.FogExp2('#082333', 0.0032);

    const w = this.host.clientWidth || 900;
    const h = this.host.clientHeight || 520;
    this.camera = new THREE.PerspectiveCamera(36, w / h, 0.1, 500);
    this.camera.position.set(0, 48, 76);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
    this.renderer.setSize(w, h);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Mapa tridimensional interactivo de Cuba');
    this.host.replaceChildren(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 0, 0);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.minDistance = 42;
    this.controls.maxDistance = 115;
    this.controls.maxPolarAngle = Math.PI * 0.48;
    this.controls.minPolarAngle = Math.PI * 0.19;
    this.controls.enablePan = true;
    this.controls.autoRotate = !this.reduceMotion;
    this.controls.autoRotateSpeed = 0.22;

    this._lighting();
    this._ocean();
    this._island();
    this._landmarks();
    this._regionMarkers();
    this._atmosphere();
    this._overlay();
    this._events();

    this.resizeObserver = new ResizeObserver(() => this._resize());
    this.resizeObserver.observe(this.host);
    this._animate();
  },

  _lighting() {
    this.scene.add(new THREE.HemisphereLight(0x9de7ed, 0x183b35, 2.0));
    const sun = new THREE.DirectionalLight(0xffdfaa, 3.2);
    sun.position.set(-28, 48, 24);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -55; sun.shadow.camera.right = 55;
    sun.shadow.camera.top = 45; sun.shadow.camera.bottom = -45;
    this.scene.add(sun);
    const rim = new THREE.DirectionalLight(0x3dbdd0, 1.7);
    rim.position.set(35, 22, -38);
    this.scene.add(rim);
  },

  _ocean() {
    const geo = new THREE.PlaneGeometry(240, 180, 96, 72);
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b5369, roughness: 0.32, metalness: 0.28, transparent: false });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime;');
      shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.z += sin(position.x * 0.16 + uTime * 0.65) * 0.10 + cos(position.y * 0.21 + uTime * 0.42) * 0.08;');
      this.oceanUniforms = shader.uniforms;
    };
    const ocean = new THREE.Mesh(geo, mat);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -1.7;
    ocean.receiveShadow = true;
    this.scene.add(ocean);
    this.materials.ocean = mat;

    const seabed = new THREE.Mesh(new THREE.PlaneGeometry(240, 180), new THREE.MeshStandardMaterial({ color: 0x082c3b, roughness: 0.95 }));
    seabed.rotation.x = -Math.PI / 2; seabed.position.y = -3.8; this.scene.add(seabed);

    // Anillos de oleaje: geometría ligera, no texturas pesadas.
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x59d5d0, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(1.1 + i * 0.9, 1.16 + i * 0.9, 96), ringMat.clone());
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(-31 + i * 0.15, -1.48 + i * 0.002, 1.5);
      ring.userData.wave = i;
      this.scene.add(ring);
    }
  },

  _island() {
    // Silueta estilizada de Cuba, trazada de oeste a este en coordenadas del mundo.
    const pts = [
      [-39, 1], [-36, -2], [-32, -3.2], [-28, -2.8], [-24, -4.1], [-20, -4.0],
      [-16, -3.1], [-12, -3.6], [-8, -2.8], [-4, -3.2], [0, -2.6], [4, -2.9],
      [8, -2.1], [12, -2.5], [16, -1.3], [20, -1.6], [24, -0.2], [28, 0.4],
      [32, 1.4], [35, 3.1], [37, 4.4], [35, 5.5], [31, 5.2], [27, 4.3],
      [23, 3.7], [19, 3.4], [15, 4.0], [11, 3.5], [7, 4.1], [3, 3.7],
      [-1, 4.5], [-5, 4.0], [-9, 4.9], [-13, 4.4], [-17, 5.4], [-21, 5.1],
      [-25, 5.8], [-29, 5.0], [-33, 4.8], [-37, 3.2]
    ];
    const shape = new THREE.Shape();
    pts.forEach((p, i) => i ? shape.lineTo(p[0], p[1]) : shape.moveTo(p[0], p[1]));
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, { depth: 2.4, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.8, bevelThickness: 0.65, curveSegments: 3 });
    const land = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x397b61, roughness: 0.91, metalness: 0.02 }));
    land.rotation.x = -Math.PI / 2;
    land.position.y = -0.15;
    land.castShadow = true; land.receiveShadow = true;
    this.scene.add(land);

    // Litoral luminoso, una línea de costa discreta.
    const outline = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p => new THREE.Vector3(p[0], 2.65, -p[1]))), new THREE.LineBasicMaterial({ color: 0x9ce9d0, transparent: true, opacity: 0.62 }));
    this.scene.add(outline);

    // Elevaciones suaves para sugerir las sierras y el relieve central.
    const hills = [
      [-24, 0.2, 2.2, 5.8, 2.2], [-3, 0.5, 2.8, 8.5, 3.0],
      [5, 0.0, 2.1, 5.5, 2.1], [25, 2.0, 3.1, 7.0, 3.5]
    ];
    hills.forEach(([x, z, y, sx, sz], i) => {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: i === 3 ? 0x477e59 : 0x4e8964, roughness: 1 }));
      hill.scale.set(sx, y, sz); hill.position.set(x, y * 0.52 + 1.0, z);
      hill.castShadow = true; hill.receiveShadow = true; this.scene.add(hill);
    });

    // Cayos pequeños alrededor del archipiélago.
    [[-22, -12, 2.1], [-14, 12, 1.4], [10, -13, 2.3], [19, -10, 1.7], [32, -6, 1.3], [5, 15, 1.2]].forEach(([x,z,s]) => {
      const cayo = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), new THREE.MeshStandardMaterial({ color: 0x72a77a, roughness: 0.9 }));
      cayo.scale.set(s * 1.6, 0.65, s); cayo.position.set(x, 2.25, z); cayo.castShadow = true; this.scene.add(cayo);
    });
  },

  _tree(x, z, scale = 1) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 1.8 * scale, 6), new THREE.MeshStandardMaterial({ color: 0x78583b, roughness: 1 }));
    trunk.position.set(x, 2.4 + 0.9 * scale, z); trunk.castShadow = false; this.scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(0.8 * scale, 8, 6), new THREE.MeshStandardMaterial({ color: 0x4d9867, roughness: 1 }));
    crown.scale.set(1.25, 0.65, 1.1); crown.position.set(x, 2.4 + 1.8 * scale, z); crown.castShadow = false; this.scene.add(crown);
  },

  _landmarks() {
    // Vegetación en grupos para dar escala al territorio sin sobrecargar la GPU.
    for (let i = 0; i < 58; i++) {
      const x = -34 + ((i * 17) % 67);
      const z = -2 + Math.sin(i * 2.31) * 3.4 + (i % 4) * 0.35;
      if (Math.abs(z) < 1.4 && x > -28 && x < 28) continue;
      this._tree(x, z, 0.55 + (i % 4) * 0.12);
    }

    // Núcleos urbanos: volúmenes bajos, luces cálidas y siluetas distintas.
    const cities = [
      { name: 'La Habana', x: -10, z: -1, count: 17 },
      { name: 'Santa Clara', x: 5, z: 0.3, count: 9 },
      { name: 'Santiago', x: 27, z: 1.5, count: 12 },
      { name: 'Pinar del Río', x: -28, z: 1.4, count: 6 }
    ];
    cities.forEach((city, ci) => {
      for (let i = 0; i < city.count; i++) {
        const a = i * 2.399 + ci;
        const r = 1.0 + (i % 4) * 0.62;
        const height = 0.55 + ((i * 7) % 5) * 0.34;
        const building = new THREE.Mesh(new THREE.BoxGeometry(0.55 + (i % 3) * 0.18, height, 0.55 + (i % 2) * 0.18), new THREE.MeshStandardMaterial({ color: ci === 0 ? 0xc9b58d : 0x9db5a0, roughness: 0.78, emissive: 0x302619, emissiveIntensity: 0.12 }));
        building.position.set(city.x + Math.cos(a) * r, 2.5 + height / 2, city.z + Math.sin(a) * r);
        building.castShadow = true; building.receiveShadow = true; this.scene.add(building);
      }
      const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 2.1, 8), new THREE.MeshStandardMaterial({ color: 0xe7c77f, emissive: 0x9a5d22, emissiveIntensity: 0.55 }));
      beacon.position.set(city.x, 3.65, city.z); this.scene.add(beacon);
    });

    // Corredores de conexión como líneas luminosas sobre el terreno.
    const routeMat = new THREE.LineBasicMaterial({ color: 0xd9bd7b, transparent: true, opacity: 0.42 });
    [[-28,-0.5,-10,-1],[-10,-1,5,0.3],[5,0.3,27,1.5]].forEach(route => {
      const points = [new THREE.Vector3(route[0], 2.85, route[1]), new THREE.Vector3((route[0]+route[2])/2, 3.0, (route[1]+route[3])/2), new THREE.Vector3(route[2], 2.85, route[3])];
      this.scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), routeMat));
    });
  },

  _regionMarkers() {
    this.REGIONS.forEach(region => {
      const group = new THREE.Group();
      group.position.set(region.x, 3.2, region.z);
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.055, 8, 48), new THREE.MeshBasicMaterial({ color: region.color, transparent: true, opacity: 0.8 }));
      halo.rotation.x = Math.PI / 2; group.add(halo);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.32, 18, 12), new THREE.MeshStandardMaterial({ color: region.color, emissive: region.color, emissiveIntensity: 0.85, roughness: 0.25 }));
      core.position.y = 0.25; group.add(core);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), new THREE.MeshBasicMaterial({ color: region.color, transparent: true, opacity: 0.5 }));
      stem.position.y = -0.55; group.add(stem);
      group.userData.regionId = region.id;
      this.scene.add(group); this.interactive.push(group);
      this.labels.push({ region, object: group });
    });
  },

  _atmosphere() {
    const stars = new THREE.BufferGeometry();
    const coords = [];
    for (let i = 0; i < 420; i++) {
      coords.push((Math.random() - 0.5) * 190, 12 + Math.random() * 65, (Math.random() - 0.5) * 130);
    }
    stars.setAttribute('position', new THREE.Float32BufferAttribute(coords, 3));
    this.scene.add(new THREE.Points(stars, new THREE.PointsMaterial({ color: 0x9ddde0, size: 0.16, transparent: true, opacity: 0.58, sizeAttenuation: true })));
    const mystery = new THREE.Group();
    mystery.position.set(-31, -0.8, 1.5);
    const base = new THREE.Mesh(new THREE.TorusGeometry(2.5, 0.08, 8, 48), new THREE.MeshBasicMaterial({ color: 0xe7c77f, transparent: true, opacity: 0.55 }));
    base.rotation.x = Math.PI / 2; mystery.add(base);
    for (let i = 0; i < 3; i++) {
      const ruin = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.3 + i * 0.25, 0.55), new THREE.MeshStandardMaterial({ color: 0x8b9a8d, metalness: 0.25, roughness: 0.6, emissive: 0x8a6a32, emissiveIntensity: 0.12 }));
      ruin.position.set((i - 1) * 1.25, -1.0, (i % 2) * 0.7); mystery.add(ruin);
    }
    this.scene.add(mystery); this.mysteryGroup = mystery;
  },

  _overlay() {
    const info = document.createElement('div');
    info.className = 'map3d-info';
    info.innerHTML = '<span class="map3d-kicker">NEXUS · ARCHIPIÉLAGO</span><strong>CUBA</strong><small>Explora el territorio · selecciona una región</small>';
    this.host.appendChild(info);
    const controls = document.createElement('div');
    controls.className = 'map3d-controls';
    controls.innerHTML = '<span>ARRASTRAR · ROTAR</span><span>RUEDA · ACERCAR</span><button type="button" aria-label="Restablecer cámara">REINICIAR VISTA</button>';
    controls.querySelector('button').addEventListener('click', () => this._resetCamera());
    this.host.appendChild(controls);
    const tooltip = document.createElement('div');
    tooltip.className = 'map3d-tooltip';
    tooltip.innerHTML = '<strong>Selecciona una región</strong><span>Las decisiones transformarán este territorio.</span>';
    this.host.appendChild(tooltip);
    this.tooltip = tooltip;
  },

  _events() {
    this.renderer.domElement.addEventListener('pointermove', e => this._pointerMove(e));
    this.renderer.domElement.addEventListener('click', e => this._pointerClick(e));
  },

  _hit(e) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    return this.raycaster.intersectObjects(this.interactive, true);
  },

  _pointerMove(e) {
    const hits = this._hit(e);
    const group = hits.length ? hits[0].object.parent : null;
    const regionId = group?.userData?.regionId || hits[0]?.object?.parent?.parent?.userData?.regionId;
    this.renderer.domElement.style.cursor = regionId ? 'pointer' : 'grab';
    if (regionId) this._showRegion(regionId);
  },

  _pointerClick(e) {
    const hits = this._hit(e);
    if (!hits.length) return;
    let node = hits[0].object;
    while (node && !node.userData.regionId) node = node.parent;
    if (!node) return;
    this.selected = node.userData.regionId;
    this.controls.autoRotate = false;
    const region = this.REGIONS.find(r => r.id === this.selected);
    this._showRegion(this.selected);
    window.dispatchEvent(new CustomEvent('mutatio:region-selected', { detail: { ...region, mood: this._mood(this.selected) } }));
  },

  _mood(id) {
    const reg = (this.state?.regions || []).find(r => r.id === id);
    return reg?.mood || 'tenso';
  },

  _showRegion(id) {
    const region = this.REGIONS.find(r => r.id === id);
    if (!region || !this.tooltip) return;
    const mood = this._mood(id);
    this.tooltip.innerHTML = '<strong>' + region.name + '</strong><span>' + region.note + '</span><em>Estado: ' + mood + '</em>';
  },

  setState(state) {
    this.state = state;
    this.REGIONS.forEach(region => {
      const marker = this.interactive.find(o => o.userData.regionId === region.id);
      if (!marker) return;
      const mood = this._mood(region.id);
      const colors = { crisis: 0xff6b7a, tenso: 0xf0b429, estable: 0x70d6a0, esperanza: 0x42d6c4 };
      const color = colors[mood] || colors.tenso;
      marker.children[0].material.color.setHex(color);
      marker.children[1].material.color.setHex(color);
      marker.children[1].material.emissive.setHex(color);
      marker.scale.setScalar(mood === 'crisis' ? 1.18 : mood === 'esperanza' ? 1.1 : 1);
    });
    if (this.mysteryGroup) this.mysteryGroup.visible = (state?.mystery?.evidence || 0) > 0;
  },

  _resetCamera() {
    this.camera.position.set(0, 48, 76);
    this.controls.target.set(0, 0, 0);
    this.controls.autoRotate = !this.reduceMotion;
    this.controls.update();
  },

  _resize() {
    if (!this.renderer || !this.host) return;
    const w = Math.max(320, this.host.clientWidth);
    const h = Math.max(300, this.host.clientHeight);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  },

  _animate() {
    this.frame = requestAnimationFrame(() => this._animate());
    const elapsed = this.clock.getElapsedTime();
    if (this.oceanUniforms?.uTime) this.oceanUniforms.uTime.value = this.reduceMotion ? 0 : elapsed;
    this.scene.children.forEach(obj => {
      if (obj.geometry?.type === 'RingGeometry' && obj.userData.wave !== undefined && !this.reduceMotion) {
        const phase = (elapsed * 0.12 + obj.userData.wave * 0.13) % 1;
        obj.scale.setScalar(0.8 + phase * 1.3);
        obj.material.opacity = (1 - phase) * 0.12;
      }
    });
    this.interactive.forEach((marker, i) => {
      if (!this.reduceMotion) marker.position.y = 3.2 + Math.sin(elapsed * 1.5 + i) * 0.16;
    });
    if (this.mysteryGroup && !this.reduceMotion) this.mysteryGroup.rotation.y = Math.sin(elapsed * 0.2) * 0.08;
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
};

window.IsoMap = IsoMap;
