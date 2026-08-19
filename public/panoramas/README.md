# Décors (panoramas 360°)

Dépose ici les images de tes styles. Elles sont servies à la racine du site
(ex. `public/panoramas/style-1.jpg` → `/panoramas/style-1.jpg`).

Fichiers attendus par défaut (voir `src/panoramas.js`) :

- `style-1.jpg` — panorama **équirectangulaire** (projection 360°, ratio **2:1**) du style 1
- `style-2.jpg` — panorama **équirectangulaire** du style 2

Formats acceptés : `.jpg`, `.png`, `.webp` (adapte les chemins dans
`src/panoramas.js` si tu changes l'extension ou le nom).

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
