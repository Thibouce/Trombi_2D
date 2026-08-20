# Gaussian Splat des locaux (hub 3D)

Dépose ici le scan 3D (Gaussian Splatting) de tes locaux. Il est servi à la
racine du site (`public/splats/locaux.ksplat` → `/splats/locaux.ksplat`).

Fichier attendu par défaut (voir `src/splat.js`) : **`locaux.ply`**.

## Formats supportés

- `.ply` — sortie brute de la plupart des outils de splatting (fonctionne tel quel)
- `.splat`
- `.ksplat` — compressé, **chargement plus rapide** (idéal pour les gros scans)

Le format est auto-détecté via l'extension. Change le nom / l'extension dans
`src/splat.js` (`SPLAT.url`) si ton fichier a un autre nom.

> ⚠️ Un `.ply` peut être **très lourd** (50–300 Mo). Évite de le committer dans
> git (ajoute-le à `.gitignore` si besoin) ; pour de meilleures perfs de
> chargement, convertis-le en `.ksplat`.

## Orientation (redresser le splat)

Les scans sont souvent de travers. Ouvre l'app avec **`?debug`**
(`http://localhost:5173/?debug`) : un panneau **« Aligner le splat »** (en haut
à gauche) permet de le faire pivoter en direct (X/Y/Z, pas de 15° et 90°)
jusqu'à ce que le **toit soit en haut et le sol en bas**. Clique **« Copier »**
et colle la valeur dans `rotationEuler` (`src/splat.js`).

Tu peux aussi ajuster `position`, `scale` et la caméra de départ
(`camera.position` / `camera.target`) dans `src/splat.js`.

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
