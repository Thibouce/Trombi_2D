# Gaussian Splat des locaux (hub 3D)

Dépose ici le scan 3D (Gaussian Splatting) de tes locaux. Il est servi à la
racine du site (`public/splats/locaux.ksplat` → `/splats/locaux.ksplat`).

Fichier attendu par défaut (voir `src/splat.js`) : **`locaux.ksplat`**.

## Formats supportés

- `.ksplat` — **recommandé** (compressé, chargement rapide)
- `.splat`
- `.ply` (sortie brute de la plupart des outils de splatting ; plus lourd)

Change le nom / l'extension dans `src/splat.js` (`SPLAT.url`) si besoin.

## Orientation

Les scans sont souvent tournés ou décalés. Ajuste dans `src/splat.js` :
`position`, `rotationEuler` (radians), `scale`, et la caméra de départ
(`camera.position` / `camera.target`).

## Placer les points cliquables (bureaux)

Dans `src/splat.js`, `HOTSPOTS` liste les marqueurs cliquables (position 3D).
Pour trouver les coordonnées : ouvre l'app avec **`?debug`** dans l'URL
(`http://localhost:5173/?debug`), clique dans la scène → les coordonnées du
point (au sol) s'affichent dans la **console** du navigateur. Reporte-les dans
`HOTSPOTS`.

## Comment obtenir un splat

- Applis mobiles : **Luma AI**, **Polycam**, **Scaniverse** (export .ply).
- Convertir `.ply` → `.ksplat` : voir l'outil du paquet
  [`@mkkellogg/gaussian-splats-3d`](https://github.com/mkkellogg/GaussianSplats3D#creating-ksplat-files).

> ℹ️ Si aucun splat n'est présent, l'app affiche un message et un bouton
> « Entrer sans la 3D » qui ouvre directement le choix des styles.
