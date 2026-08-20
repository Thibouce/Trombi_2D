// Configuration du "hub" 3D : le Gaussian Splat des locaux + les points
// cliquables (ex. les bureaux) qui ouvrent le choix des styles.

// Fichier du splat à déposer dans public/splats/.
// Formats supportés : .ksplat (recommandé, compressé), .splat, .ply.
// (Convertis un .ply en .ksplat pour de meilleures perfs — voir le README.)
export const SPLAT = {
  url: '/splats/locaux.ksplat',

  // Orientation / position / échelle du splat dans la scène. Les scans sont
  // souvent tournés ou décalés : ajuste ici jusqu'à ce que ce soit droit.
  position: [0, 0, 0],
  rotationEuler: [0, 0, 0], // radians (x, y, z)
  scale: 1,

  // Caméra d'orbite au démarrage.
  camera: {
    position: [0, 1.5, 5],
    target: [0, 0.8, 0],
  },
};

// Points cliquables. Chaque entrée est un marqueur 3D posé à `position` ;
// cliquer dessus ouvre le choix des styles. Ajuste les coordonnées une fois le
// splat chargé (astuce : ajoute ?debug à l'URL pour lire les coordonnées au clic).
export const HOTSPOTS = [
  { id: 'bureau', label: 'Mon bureau', position: [0, 0.8, 0] },
];
