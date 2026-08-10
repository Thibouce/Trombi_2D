# Trombi 2D — Expérience immersive 360°

Une personne se prend en photo à la webcam, puis **GPT Image 2** (via fal.ai)
l'**intègre directement dans un panorama 360° des locaux de l'entreprise**. La
caméra pivote dans la scène pour une expérience immersive — parfait pour une
borne d'accueil, un salon ou un mur d'écran.

## ✨ Fonctionnement

1. **Capture** — l'utilisateur se prend en photo (webcam, cadrage guidé par un ovale).
2. **Intégration IA** — la photo + le panorama équirectangulaire sont envoyés à
   **GPT Image 2** (via **fal.ai**) au travers d'un **proxy serveur**. Le modèle
   fond la personne dans la scène (échelle, perspective, éclairage, ombres) et
   renvoie un nouveau panorama équirectangulaire. La taille de sortie est forcée
   en **2:1** (`FAL_IMAGE_SIZE`) pour préserver la projection équirectangulaire.
3. **Immersion** — le panorama édité remplace la scène ; la caméra pivote en
   « tour auto » ou l'utilisateur regarde autour (glisser / molette pour zoomer).

> 🔒 La **clé API reste côté serveur** : le navigateur appelle `/api/integrate`,
> jamais l'API fal.ai directement.

## 🚀 Démarrer

```bash
npm install
cp .env.example .env      # puis renseigne FAL_KEY
npm run dev
```

Ouvre l'URL affichée (autorise l'accès à la webcam).

**En production :**

```bash
npm run build
npm start                 # node --env-file=.env server.js  → http://localhost:5173
```

> ℹ️ La webcam nécessite un contexte sécurisé : `localhost` fonctionne, sinon
> déploie en **HTTPS**.

## 🔑 Clé API

1. Crée une clé sur [fal.ai — API Keys](https://fal.ai/dashboard/keys).
2. Renseigne-la dans `.env` :

   ```env
   FAL_KEY=ta_cle_fal
   FAL_MODEL=openai/gpt-image-2/edit   # défaut
   FAL_IMAGE_SIZE=1536x768             # 2:1 pour l'équirectangulaire
   ```

Le serveur appelle l'endpoint synchrone `https://fal.run/<FAL_MODEL>` avec les
deux images (data URI) et récupère l'image éditée.

> ⚠️ `input_fidelity` n'est **pas** envoyé : GPT Image 2 le refuse (il traite
> toujours les entrées en haute fidélité).

## 🖼️ Utiliser tes propres locaux

Le projet démarre avec un **panorama de démonstration** généré à la volée.
Bouton **« 🌐 Charger un panorama »** pour sélectionner une image
**équirectangulaire** (projection 360°, ratio **2:1**, ex. 4096×2048), issue
d'une caméra 360 (Insta360, Ricoh Theta…) ou d'un assemblage (Hugin / PTGui).

Le bouton **« ↺ Réinitialiser »** restaure le panorama d'origine (vide de toute
personne). Les intégrations successives s'ajoutent à la scène courante.

## 🗂️ Structure

```
index.html
server.js                 # serveur de production (statique + /api/integrate)
vite.config.js            # branche le proxy API en dev, charge .env
src/
  main.js                 # orchestration + UI
  styles.css
  scene/
    Panorama.js           # visionneuse 360 (sphère, caméra panoramique)
    demoPanorama.js       # panorama équirectangulaire de démo (procédural)
  capture/
    Webcam.js             # accès webcam + capture d'image
    integrateClient.js    # redimensionnement + appel /api/integrate
server/
  integrate.js            # appel GPT Image 2 via fal.ai (clé API côté serveur)
  vite-api-plugin.js      # expose /api/integrate en développement
```

## 🧭 Pistes d'évolution

- **Multi-points 360** : relier plusieurs panoramas par des points de passage
  pour vraiment se déplacer dans les locaux.
- **Galerie / mur social** : mémoriser les intégrations et les faire défiler.
- **Partage** : capture de la vue + QR code pour repartir avec.
- **Qualité** : affiner le prompt d'intégration, ou passer par un rendu
  rectilinéaire (vue « à plat ») réinjecté dans l'équirectangulaire.

## 🛠️ Stack

- [Three.js](https://threejs.org/) — rendu 3D / 360
- [Vite](https://vitejs.dev/) — dev server & build
- [fal.ai — GPT Image 2](https://fal.ai/models/openai/gpt-image-2/edit) — édition d'image
