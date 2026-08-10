import * as THREE from 'three';

// Visionneuse 360° : une sphère texturée vue de l'intérieur.
// Mouvements strictement panoramiques (rotation depuis le centre) :
//  - glisser (souris / tactile) pour regarder autour
//  - "tour auto" : la caméra pivote doucement toute seule
//  - molette pour zoomer (FOV)
export class Panorama {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1100);
    this.camera.position.set(0, 0, 0);

    // Sphère retournée : on la voit de l'intérieur.
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);
    this.sphereMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.sphere = new THREE.Mesh(geometry, this.sphereMat);
    this.scene.add(this.sphere);

    // Orientation caméra.
    this.lon = 0; // yaw (degrés)
    this.lat = 0; // pitch (degrés)
    this.autoTour = true;
    this.autoSpeed = 3.5; // deg/seconde

    this._pointer = { active: false, x: 0, y: 0, lon: 0, lat: 0 };
    this._clock = new THREE.Clock();
    this._target = new THREE.Vector3();

    this._bindControls();
    this._onResize();
    window.addEventListener('resize', () => this._onResize());
  }

  // Applique une texture équirectangulaire (Image, Canvas ou THREE.Texture).
  setPanoramaTexture(source) {
    const texture =
      source instanceof THREE.Texture ? source : new THREE.Texture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.needsUpdate = true;
    if (this.sphereMat.map) this.sphereMat.map.dispose();
    this.sphereMat.map = texture;
    this.sphereMat.color.set(0xffffff);
    this.sphereMat.needsUpdate = true;
  }

  toggleAutoTour(force) {
    this.autoTour = typeof force === 'boolean' ? force : !this.autoTour;
    return this.autoTour;
  }

  // Direction actuellement au centre de l'écran (là où l'utilisateur vise).
  get currentLook() {
    return { lon: this.lon, lat: this.lat };
  }

  _bindControls() {
    const el = this.canvas;
    const down = (x, y) => {
      this._pointer.active = true;
      this.autoTour = false;
      this._pointer.x = x;
      this._pointer.y = y;
      this._pointer.lon = this.lon;
      this._pointer.lat = this.lat;
      this.onUserInteract?.();
    };
    const move = (x, y) => {
      if (!this._pointer.active) return;
      this.lon = this._pointer.lon - (x - this._pointer.x) * 0.12;
      this.lat = THREE.MathUtils.clamp(
        this._pointer.lat + (y - this._pointer.y) * 0.12,
        -85,
        85
      );
    };
    const up = () => {
      this._pointer.active = false;
    };

    el.addEventListener('pointerdown', (e) => down(e.clientX, e.clientY));
    window.addEventListener('pointermove', (e) => move(e.clientX, e.clientY));
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);

    el.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.camera.fov = THREE.MathUtils.clamp(
          this.camera.fov + e.deltaY * 0.03,
          40,
          90
        );
        this.camera.updateProjectionMatrix();
      },
      { passive: false }
    );
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() {
    const loop = () => {
      this._frame = requestAnimationFrame(loop);
      this._update();
      this.renderer.render(this.scene, this.camera);
    };
    loop();
  }

  _update() {
    const dt = this._clock.getDelta();

    if (this.autoTour && !this._pointer.active) {
      this.lon += this.autoSpeed * dt;
    }

    const phi = THREE.MathUtils.degToRad(90 - this.lat);
    const theta = THREE.MathUtils.degToRad(this.lon);
    this._target.set(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(this._target);
  }
}
