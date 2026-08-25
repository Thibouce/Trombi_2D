# Décors (panoramas 360°)

Dépose ici les images de tes styles. Elles sont servies à la racine du site
(ex. `public/panoramas/style-1.jpg` → `/panoramas/style-1.jpg`).

Les décors sont **regroupés par zone** dans `src/panoramas.js` ; chaque zone
correspond à un point cliquable (hotspot) du hub 3D (champ `zone` dans
`src/splat.js`). Cliquer un point propose les styles de sa zone.

Fichiers attendus par défaut (voir `src/panoramas.js`) :

- Zone **bureau** : `style-1.<ext>`, `style-2.<ext>` (déjà en place)
- Zone **hall** : `hall-1.<ext>`, `hall-2.<ext>` (à ajouter)

Chaque fichier est un panorama **équirectangulaire** (projection 360°, ratio **2:1**).

## Prompt et référence par style (optionnel)

Dans `src/panoramas.js`, un style peut porter :
- **`prompt`** — un prompt d'intégration propre à ce style (sinon le prompt par
  défaut du serveur est utilisé).
- **`styleRef`** — une **image de référence de style** (déposée aussi dans
  `public/panoramas/`, extension facultative) envoyée au modèle **en plus** du
  décor et des visages.

Ordre des images reçues par le modèle : **1)** le décor, **2)** la référence de
style (si définie), **puis** les visages. Écris le prompt du style en fonction.

**L'extension est facultative dans la config** : `src/panoramas.js` référence
`/panoramas/style-1` (sans extension) et l'app essaie automatiquement
`png, jpg, jpeg, webp, avif, gif`, en gardant la première qui existe. Tu peux
donc mélanger les formats d'un style à l'autre. Pour forcer une extension
précise, indique-la (ex. `/panoramas/style-1.webp`).

## Miniatures (optionnel)

Par défaut, la miniature affichée dans le sélecteur est le panorama lui-même
(affiché en petit). Pour une miniature dédiée (plus légère ou mieux cadrée),
ajoute un champ `thumb` dans `src/panoramas.js`, ex. :

```js
{ id: 'style-1', label: 'Style 1', src: '/panoramas/style-1.jpg', thumb: '/panoramas/style-1-thumb.jpg' }
```

## Conseils

- Ratio **2:1** impératif (ex. 4096×2048) pour une projection 360° correcte.
- Le rendu final est forcé en 3840×1920 côté IA ; fournir des sources ≥ 3840 de
  large évite tout upscale.
