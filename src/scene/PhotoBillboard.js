import * as THREE from 'three';

// Crée un "sprite" 3D à partir d'une image RGBA (tête détourée) et le place
// dans la scène 360 à une direction (yaw/pitch) donnée.
export function createPhotoBillboard(imageSource, { width = 46, aspect = 1 } = {}) {
  const texture =
    imageSource instanceof THREE.Texture
      ? imageSource
      : new THREE.Texture(imageSource);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const height = width / aspect;
  const geometry = new THREE.PlaneGeometry(width, height);
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.billboard = true;
  mesh.userData.float = Math.random() * Math.PI * 2;

  // Halo doux derrière la tête pour la détacher du fond.
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      color: 0x5b8cff,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
    })
  );
  halo.scale.set(width * 1.3, height * 1.3, 1);
  halo.position.z = -1;
  mesh.add(halo);

  return mesh;
}
