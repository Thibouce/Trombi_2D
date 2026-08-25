import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d';

// Textures des repères (générées une fois, en blanc) : disque plein, anneau, halo.
const _texCache = {};
function markerTexture(kind) {
  if (_texCache[kind]) return _texCache[kind];
  const s = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = s;
  const ctx = canvas.getContext('2d');
  const c = s / 2;
  if (kind === 'ring') {
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = s * 0.05;
    ctx.beginPath();
    ctx.arc(c, c, s * 0.42, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === 'disc') {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(c, c, s * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // glow : dégradé radial blanc -> transparent
    const g = ctx.createRadialGradient(c, c, 0, c, c, c);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.25)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  _texCache[kind] = tex;
  return tex;
}
function spriteFrom(map, scale, opacity) {
  const sprite = new THREE.Sprite(
    new THREE.SpriteMaterial({ map, transparent: true, opacity, depthTest: false, depthWrite: false })
  );
  sprite.scale.setScalar(scale);
  return sprite;
}

// "Hub" 3D : affiche un Gaussian Splat des locaux comme un objet au centre,
// qu'on peut orbiter, avec des points cliquables (bureaux) qui déclenchent
// un callback (onHotspot). Le splat est chargé dans NOTRE scène Three.js via
// DropInViewer, ce qui nous laisse gérer caméra, contrôles et raycasting.
export class Hub {
  constructor(canvas, { debug = false } = {}) {
    this.canvas = canvas;
    this.debug = debug;
    this.onHotspot = null;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.05, 500);
    this.camera.position.set(0, 1.5, 5);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(0, 0.8, 0);

    this.hotspots = new THREE.Group();
    this.scene.add(this.hotspots);

    this.raycaster = new THREE.Raycaster();
    this._clock = new THREE.Clock();
    this._running = false;

    // Plan invisible (pour le mode debug : lire les coordonnées au clic).
    this._debugPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    this._bindClicks();
    this._onResize();
    window.addEventListener('resize', () => this._onResize());
  }

  // Applique la caméra d'orbite initiale.
  setCamera({ position, target }) {
    if (position) this.camera.position.fromArray(position);
    if (target) this.controls.target.fromArray(target);
    this.controls.update();
  }

  // Charge le splat. Renvoie une promesse résolue quand il est prêt.
  async loadSplat(cfg) {
    this._cfg = cfg;
    this.viewer = new GaussianSplats3D.DropInViewer({
      // Pas de SharedArrayBuffer : évite d'exiger les en-têtes COOP/COEP.
      sharedMemoryForWorkers: false,
      gpuAcceleratedSort: false,
    });
    // On charge sans transformer, puis on applique la transfo à l'objet lui-même
    // (permet de la modifier en direct via l'outil d'alignement).
    await this.viewer.addSplatScene(cfg.url, {
      splatAlphaRemovalThreshold: 5,
      showLoadingUI: false,
      progressiveLoad: false,
    });
    this.scene.add(this.viewer);
    this.applyTransform(cfg);
  }

  // Applique position / rotation (Euler XYZ, radians) / échelle au splat.
  applyTransform(cfg) {
    if (!this.viewer) return;
    this._euler = new THREE.Euler(...(cfg.rotationEuler || [0, 0, 0]));
    this.viewer.position.fromArray(cfg.position || [0, 0, 0]);
    this.viewer.scale.setScalar(cfg.scale ?? 1);
    this.viewer.setRotationFromEuler(this._euler);
  }

  // Fait pivoter le splat autour d'un axe ('x'|'y'|'z') et renvoie l'Euler courant.
  nudgeRotation(axis, deltaRad) {
    if (!this.viewer || !this._euler) return [0, 0, 0];
    this._euler[axis] += deltaRad;
    this.viewer.setRotationFromEuler(this._euler);
    return [this._euler.x, this._euler.y, this._euler.z];
  }

  resetRotation() {
    if (!this._cfg) return [0, 0, 0];
    this._euler = new THREE.Euler(...(this._cfg.rotationEuler || [0, 0, 0]));
    this.viewer?.setRotationFromEuler(this._euler);
    return [this._euler.x, this._euler.y, this._euler.z];
  }

  getRotationEuler() {
    return this._euler ? [this._euler.x, this._euler.y, this._euler.z] : [0, 0, 0];
  }

  // Ajoute les marqueurs cliquables.
  addHotspots(list) {
    for (const h of list) {
      const marker = this._makeMarker();
      marker.position.fromArray(h.position);
      Object.assign(marker.userData, h); // conserve id, label, zone, … (sans écraser le halo)
      this.hotspots.add(marker);
    }
  }

  // Repère monochrome (style Prodigious) : halo doux + anneau fin + point plein,
  // le tout en blanc, toujours face caméra (sprites), visible à travers le splat.
  _makeMarker() {
    const group = new THREE.Group();

    const glow = spriteFrom(markerTexture('glow'), 0.55, 0.28);
    glow.renderOrder = 996;

    const ring = spriteFrom(markerTexture('ring'), 0.34, 0.95);
    ring.renderOrder = 998;

    const dot = spriteFrom(markerTexture('disc'), 0.12, 1);
    dot.renderOrder = 999;

    // Zone de clic élargie (invisible mais toujours raycastable).
    const hit = spriteFrom(markerTexture('disc'), 0.5, 0);

    group.add(glow, ring, dot, hit);
    group.userData._ring = ring;
    group.userData._glow = glow;
    return group;
  }

  _bindClicks() {
    const el = this.canvas;
    let down = null;
    el.addEventListener('pointerdown', (e) => {
      down = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('pointerup', (e) => {
      if (!down) return;
      const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
      down = null;
      if (moved > 6) return; // c'était un glissé (orbite), pas un clic
      this._handleClick(e);
    });
  }

  _handleClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    const hits = this.raycaster.intersectObjects(this.hotspots.children, true);
    if (hits.length) {
      let obj = hits[0].object;
      while (obj && !obj.userData?.id) obj = obj.parent;
      if (obj && this.onHotspot) this.onHotspot(obj.userData);
      return;
    }

    if (this.debug) {
      // Point sous le curseur : intersection du sol (y=0), sinon à 3 m devant.
      const p = new THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(this._debugPlane, p)) {
        this.raycaster.ray.at(3, p);
      }
      this._placePickMarker(p);
      const coords = [p.x, p.y, p.z];
      console.log(`[hub] point ≈ [${coords.map((v) => v.toFixed(2)).join(', ')}]`);
      this.onPickPoint?.(coords);
    }
  }

  // Repère vert de prévisualisation (mode debug) posé au clic.
  _placePickMarker(pos) {
    if (!this._pickMarker) {
      this._pickMarker = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 20, 14),
        new THREE.MeshBasicMaterial({ color: 0x38d66b, depthTest: false, transparent: true })
      );
      this._pickMarker.renderOrder = 1000;
      this.scene.add(this._pickMarker);
    }
    this._pickMarker.position.copy(pos);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this._running) return;
    this._running = true;
    const loop = () => {
      if (!this._running) return;
      this._frame = requestAnimationFrame(loop);
      const t = this._clock.getElapsedTime();
      // Pulsation douce de l'anneau + du halo.
      for (const m of this.hotspots.children) {
        const p = 1 + Math.sin(t * 2.5) * 0.12;
        m.userData._ring?.scale.setScalar(0.34 * p);
        m.userData._glow?.scale.setScalar(0.55 * p);
      }
      this.controls.update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  stop() {
    this._running = false;
    if (this._frame) cancelAnimationFrame(this._frame);
  }
}
