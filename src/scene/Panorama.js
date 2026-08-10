import * as THREE from 'three';

// Visionneuse 360° : une sphère texturée vue de l'intérieur.
// - glisser (souris/tactile) pour regarder autour
// - "tour auto" : la caméra pivote doucement toute seule
// - léger balancement de position pour donner l'impression que la caméra "se balade"
export class Panorama {
  constructor(canvas) {
    this.canvas = canvas;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(72, 1, 0.1, 1100);
    this.camera.position.set(0, 0, 0.01);

    // Sphère retournée : on la voit de l'intérieur.
    const geometry = new THREE.SphereGeometry(500, 64, 40);
    geometry.scale(-1, 1, 1);
    this.sphereMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    this.sphere = new THREE.Mesh(geometry, this.sphereMat);
    this.scene.add(this.sphere);

    // Groupe qui accueille les têtes intégrées.
    this.overlay = new THREE.Group();
    this.scene.add(this.overlay);

    // État caméra (orientation).
    this.lon = 0;      // yaw en degrés
    this.lat = 0;      // pitch en degrés
    this.autoTour = true;
    this.autoSpeed = 3.5; // deg/seconde

    this._pointer = { active: false, x: 0, y: 0, lon: 0, lat: 0 };
    this._clock = new THREE.Clock();
    this._target = new THREE.Vector3();

    this._bindControls();
    this._onResize();
    window.addEventListener('resize', () => this._onResize());
  }

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

  addOverlayObject(obj3d) {
    this.overlay.add(obj3d);
  }

  clearOverlay() {
    for (const child of [...this.overlay.children]) {
      this.overlay.remove(child);
      child.traverse?.((n) => {
        n.geometry?.dispose?.();
        n.material?.map?.dispose?.();
        n.material?.dispose?.();
      });
    }
  }

  // Position (yaw/pitch en degrés) devant la caméra, à un rayon donné.
  directionToPosition(lonDeg, latDeg, radius = 120) {
    const phi = THREE.MathUtils.degToRad(90 - latDeg);
    const theta = THREE.MathUtils.degToRad(lonDeg);
    return new THREE.Vector3(
      radius * Math.sin(phi) * Math.cos(theta),
      radius * Math.cos(phi),
      radius * Math.sin(phi) * Math.sin(theta)
    );
  }

  // Direction actuelle du regard (pour placer la tête "là où on regarde").
  get currentLook() {
    return { lon: this.lon, lat: this.lat };
  }

  toggleAutoTour(force) {
    this.autoTour = typeof force === 'boolean' ? force : !this.autoTour;
    return this.autoTour;
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

    // Zoom molette (FOV).
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
    const t = this._clock.elapsedTime;

    if (this.autoTour && !this._pointer.active) {
      this.lon += this.autoSpeed * dt;
    }

    // Léger balancement -> sensation de caméra qui "se balade".
    const bobX = Math.sin(t * 0.6) * 1.4;
    const bobY = Math.cos(t * 0.45) * 0.9;
    this.camera.position.set(bobX, bobY, 0.01);

    const phi = THREE.MathUtils.degToRad(90 - this.lat);
    const theta = THREE.MathUtils.degToRad(this.lon);
    this._target.set(
      500 * Math.sin(phi) * Math.cos(theta),
      500 * Math.cos(phi),
      500 * Math.sin(phi) * Math.sin(theta)
    );
    this.camera.lookAt(this._target.add(this.camera.position));

    // Les têtes intégrées font toujours face à la caméra (effet billboard).
    for (const child of this.overlay.children) {
      if (child.userData.billboard) child.lookAt(this.camera.position);
      if (child.userData.float != null) {
        child.position.y =
          child.userData.baseY + Math.sin(t * 1.4 + child.userData.float) * 2.2;
      }
    }
  }
}
