# Trombi 2D — Expérience immersive 360°

Une personne se prend en photo à la webcam, sa **tête est détourée**, puis
**intégrée dans un panorama 360° des locaux de l'entreprise**. La caméra se
balade dans la scène pour une expérience immersive — parfait pour une borne
d'accueil, un salon ou un mur d'écran.

## ✨ Fonctionnement

1. **Capture** — l'utilisateur se prend en photo (webcam, cadrage guidé par un ovale).
2. **Détourage** — le fond est retiré :
   - via **MediaPipe Selfie Segmentation** (chargé depuis un CDN) si disponible ;
   - sinon repli 100 % local : découpe ovale à bords adoucis.
3. **Intégration** — la tête détourée est posée comme un *billboard* dans une
   sphère 360° équirectangulaire, à l'endroit visé par la caméra.
4. **Immersion** — la caméra pivote en « tour auto », ou l'utilisateur regarde
   autour de lui (glisser / molette pour zoomer).

## 🚀 Démarrer

```bash
npm install
npm run dev
```

Puis ouvre l'URL affichée (autorise l'accès à la webcam).

> ℹ️ La webcam nécessite un contexte sécurisé : `localhost` fonctionne, sinon
> déploie en **HTTPS**.

## 🖼️ Utiliser tes propres locaux

Le projet démarre avec un **panorama de démonstration** généré à la volée.
Pour mettre tes locaux : bouton **« 🌐 Charger un panorama »** et sélectionne
une image **équirectangulaire** (projection 360°, ratio **2:1**, ex. 4096×2048).

Comment obtenir une telle image :
- une caméra 360 (Insta360, Ricoh Theta…) ;
- l'assemblage (*stitching*) de photos avec Hugin / PTGui ;
- une appli de panorama sur smartphone.

## 🗂️ Structure

```
index.html
src/
  main.js                 # orchestration + UI
  styles.css
  scene/
    Panorama.js           # visionneuse 360 (sphère, caméra, contrôles)
    PhotoBillboard.js      # tête détourée -> objet 3D dans la scène
    demoPanorama.js        # panorama équirectangulaire de démo (procédural)
  capture/
    Webcam.js             # accès webcam + capture d'image
    segmentation.js       # détourage (MediaPipe + repli ovale)
```

## 🧭 Pistes d'évolution

- **Édition IA générative** : remplacer le billboard 2D par une fusion
  photoréaliste du visage dans la scène (inpainting / API type Gemini).
- **Multi-points 360** : passer d'un panorama à l'autre pour vraiment *se
  déplacer* dans les locaux (parallaxe, hotspots).
- **Galerie** : mémoriser les têtes intégrées et les faire défiler (mur social).
- **Partage** : capture d'écran de la scène + QR code pour repartir avec.

## 🛠️ Stack

- [Three.js](https://threejs.org/) — rendu 3D / 360
- [Vite](https://vitejs.dev/) — dev server & build
- [MediaPipe Tasks Vision](https://ai.google.dev/edge/mediapipe) — détourage (optionnel)
