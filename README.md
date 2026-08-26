# Trombi 2D — Expérience immersive 360°

Une personne se prend en photo à la webcam, puis **GPT Image 2** (via fal.ai)
l'**intègre directement dans un panorama 360° des locaux de l'entreprise**. La
caméra pivote dans la scène pour une expérience immersive — parfait pour une
borne d'accueil, un salon ou un mur d'écran.

## ✨ Fonctionnement

0. **Hub 3D** — au démarrage, un **Gaussian Splat** des locaux s'affiche comme un
   objet 3D qu'on peut orbiter. On **clique sur un point** (ex. son bureau) → le
   **choix des styles** s'ouvre. (Voir `public/splats/` et `src/splat.js`.)
1. **Choix du décor** — on clique la miniature du style voulu → on est projeté
   dans le **panorama 360°** correspondant.
2. **Capture** — l'utilisateur se prend en photo (webcam) ou importe une image.
3. **Intégration IA** — la photo + le panorama équirectangulaire sont envoyés à
   **GPT Image 2** (via **fal.ai**) au travers d'un **proxy serveur**. Le modèle
   fond la personne dans la scène (échelle, perspective, éclairage, ombres) et
   renvoie un nouveau panorama équirectangulaire. La taille de sortie est forcée
   en **3840×1920 (4K, 2:1)** via `FAL_IMAGE_SIZE`.
4. **Immersion** — le panorama édité remplace la scène ; la caméra pivote en
   « tour auto » ou l'utilisateur regarde autour (glisser / molette pour zoomer).
   Bouton **« ← Locaux »** pour revenir au hub 3D.

> 🔒 La **clé API reste côté serveur** : le navigateur appelle `/api/integrate`,
> jamais l'API fal.ai directement.

## ⬇️ Téléchargeur tout‑en‑un (Windows)

`Telecharger.bat` est un **bootstrap** à mettre dans un dossier vide et à
**double‑cliquer**. Il télécharge le **code** (dépôt public), le **splat 3D**
(≈ 1 Go, depuis la *release* GitHub `v1`) puis enchaîne l'installation.

C'est le seul fichier à envoyer à quelqu'un : tout le reste est récupéré
automatiquement. À la fin, un dossier `Trombi_2D/` est prêt — on lance ensuite
avec `Demarrer.bat`.

> Le **splat** (`locaux.ply`) est trop volumineux pour Git : il est hébergé en
> *release* et récupéré par le téléchargeur. Pour publier une nouvelle version du
> splat, remplace l'asset de la release (tag `v1`) ou change `TAG` dans le script.

## 🖱️ Installation facile (Windows, sans ligne de commande)

Si tu as déjà le dossier du projet (via le téléchargeur, un zip ou `git`), deux
fichiers à **double‑cliquer** :

1. **`Installer.bat`** — vérifie Node.js (propose le téléchargement s'il manque),
   installe les dépendances, construit l'app et demande la **clé API fal.ai**
   (écrite dans `.env`).
2. **`Demarrer.bat`** — lance le programme et **ouvre le navigateur** tout seul
   sur `http://localhost:5173`. Laisse la fenêtre ouverte pendant l'utilisation ;
   ferme‑la pour arrêter.

> Prérequis unique : **Node.js** (LTS) installé une fois via son propre
> installateur (`Installer.bat` ouvre la page si besoin). La webcam fonctionne
> sur `localhost` sans configuration.

## 🚀 Démarrer (ligne de commande)

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
   FAL_IMAGE_SIZE=3840x1920            # 4K, 2:1 pour l'équirectangulaire
   ```

Le serveur appelle l'endpoint synchrone `https://fal.run/<FAL_MODEL>` avec les
deux images (data URI) et récupère l'image éditée.

> ⚠️ `input_fidelity` n'est **pas** envoyé : GPT Image 2 le refuse (il traite
> toujours les entrées en haute fidélité).

## 🖼️ Utiliser tes propres locaux

Le projet démarre avec un **panorama de démonstration** généré à la volée.
Le **sélecteur de décors** (miniatures en haut à droite) permet de **se projeter
dans un style** d'un simple clic :

1. Dépose tes images **équirectangulaires** (ratio **2:1**) dans
   `public/panoramas/` (ex. `style-1.jpg`, `style-2.jpg`).
2. Déclare-les dans **`src/panoramas.js`** (id, label, `src`, `thumb` optionnel).
3. Clique la miniature du style voulu → la scène se recharge dans ce décor.

Le bouton **« ↺ Réinitialiser »** restaure le décor courant (vide de toute
personne). Les intégrations successives s'ajoutent à la scène courante.

## 🗂️ Structure

```
index.html
server.js                 # serveur de production (statique + /api/integrate)
vite.config.js            # branche le proxy API en dev, charge .env
public/
  panoramas/              # tes décors 360 (style-1.*, style-2.*, …)
  splats/                 # le Gaussian Splat des locaux (locaux.ksplat)
src/
  main.js                 # orchestration + UI + gestion des étapes (hub/pano)
  panoramas.js            # liste des décors du sélecteur (styles)
  splat.js                # config du splat + points cliquables (hotspots)
  styles.css
  scene/
    Panorama.js           # visionneuse 360 (sphère, caméra panoramique)
    Hub.js                # hub 3D : Gaussian Splat + orbite + points cliquables
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
- [@mkkellogg/gaussian-splats-3d](https://github.com/mkkellogg/GaussianSplats3D) — hub 3D (Gaussian Splatting)
- [Vite](https://vitejs.dev/) — dev server & build
- [fal.ai — GPT Image 2](https://fal.ai/models/openai/gpt-image-2/edit) — édition d'image
