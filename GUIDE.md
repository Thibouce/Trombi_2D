# Guide de reprise — Trombi 2D

Ce guide s'adresse à **une personne qui reprend le projet sans savoir coder**.
Il explique, pas à pas :

1. Utiliser l'**outil de debug** (redresser le splat 3D, placer des points).
2. **Ajouter des styles** (et leurs images).
3. **Modifier le prompt** de chaque style.

> Tu n'as besoin que d'un **éditeur de texte** (le Bloc‑notes de Windows suffit ;
> [VS Code](https://code.visualstudio.com/) est plus confortable) et d'ouvrir
> **2 fichiers** : `src/panoramas.js` et `src/splat.js`.

---

## 0. À lire en premier (important)

**Où se trouvent les choses :**

| Ce que tu veux faire | Fichier / dossier à toucher |
|---|---|
| Styles (décors) + prompts | `src/panoramas.js` |
| Points cliquables + orientation du splat | `src/splat.js` |
| Images des décors et des références | dossier `public/panoramas/` |
| Le splat 3D des locaux | dossier `public/splats/` |

**Comment voir tes changements** (⚠️ étape indispensable) :

1. Enregistre le fichier modifié.
2. Double‑clique sur **`Reconstruire.bat`** (reconstruit l'application).
3. Double‑clique sur **`Demarrer.bat`** (lance) et **rafraîchis** la page du navigateur (touche **F5**).

> Sans l'étape « Reconstruire », tes modifications **ne s'affichent pas**.

**Règles d'or quand tu édites `src/panoramas.js` ou `src/splat.js` :**

- Ne supprime **jamais** un guillemet `'`, une virgule `,`, une accolade `{ }`
  ou un crochet `[ ]` par mégarde. Une seule erreur fait planter l'app
  (page blanche). Si ça arrive : **annule ta modification** (Ctrl+Z) et
  reconstruis.
- Le plus sûr : **copie une ligne existante qui marche** et modifie‑la, plutôt
  que d'écrire à partir de zéro.
- Fais tes changements **un par un** et teste à chaque fois.

---

## 1. L'outil de debug (redresser le splat + placer des points)

L'outil est **caché**. Pour l'afficher, ajoute **`?debug`** à la fin de l'adresse
dans le navigateur :

```
http://localhost:5173/?debug
```

Un panneau **« Align the splat »** apparaît en haut à gauche.

### 1.a — Redresser le splat (toit en haut, sol en bas)

Si les locaux en 3D sont de travers :

1. Utilise les boutons **X / Y / Z** :
   - **±90** = grande rotation (pour retourner d'un quart de tour),
   - **±15** = petit ajustement.
2. Fais tourner jusqu'à ce que ce soit **droit** (le toit en haut, le sol en bas).
3. Clique **« Copy »** : la bonne valeur est copiée.
4. Ouvre **`src/splat.js`**, trouve la ligne :
   ```js
   rotationEuler: [ ... ],
   ```
   et **remplace‑la** par la valeur copiée (fais un clic droit → Coller).
5. Enregistre → `Reconstruire.bat` → `Demarrer.bat` → F5.

> **« Reset »** annule tes rotations en cours (revient à la valeur du fichier).

### 1.b — Placer un nouveau point (hotspot)

Un « point » est le rond blanc cliquable dans les locaux (ex. un bureau).

1. Toujours en `?debug`, **clique gauche** à l'endroit voulu dans la scène.
   Un **repère vert** 🟢 apparaît et ses **coordonnées s'affichent** dans le panneau.
2. Reclique jusqu'à ce que le repère vert soit **exactement** là où tu veux le point.
3. Clique **« Copy point »** : tu obtiens une ligne toute prête, par ex. :
   ```js
   { id: 'point', label: 'New point', position: [2.40, 0.00, -1.10] },
   ```
4. Ouvre **`src/splat.js`**, trouve la liste `HOTSPOTS` :
   ```js
   export const HOTSPOTS = [
     { id: 'bureau', label: 'Mon bureau', position: [0, 0.8, 0], zone: 'bureau' },
     { id: 'hall',   label: 'Hall',       position: [-2.37, 0, 8.83], zone: 'hall' },
   ];
   ```
5. **Colle ta nouvelle ligne** à l'intérieur, et complète‑la :
   - **`id`** : un identifiant unique, sans espace (ex. `'salle-reunion'`).
   - **`label`** : le nom affiché (ex. `'Salle de réunion'`).
   - **`zone`** : la zone de styles à ouvrir au clic (voir §2). Ajoute `zone: '...'`.

   Exemple final :
   ```js
   { id: 'salle-reunion', label: 'Salle de réunion', position: [2.40, 0.00, -1.10], zone: 'salle' },
   ```
6. Enregistre → `Reconstruire.bat` → `Demarrer.bat` → F5.

> Astuce : monte un peu la **2ᵉ valeur** de `position` (ex. `0.8`) pour placer le
> point à hauteur du regard plutôt qu'au sol.

---

## 2. Comprendre : points → zones → styles

C'est la clé pour tout le reste :

- Chaque **point** (dans `src/splat.js`) a une **`zone`**.
- Chaque **zone** (dans `src/panoramas.js`) contient une **liste de styles** (les décors).
- **Cliquer un point** ouvre les styles de **sa** zone.

Aujourd'hui il y a 2 zones : **`bureau`** et **`hall`**.

```
Point "Mon bureau"  (zone: bureau)  ─►  styles Felt / Cartoon / Clay
Point "Hall"        (zone: hall)    ─►  styles du hall
```

---

## 3. Ajouter un style (dans une zone existante)

Exemple : ajouter un style « Aquarelle » au **bureau**.

### Étape 1 — déposer les images

Dans le dossier **`public/panoramas/`**, dépose :

- le **panorama** du style : une image **équirectangulaire** (photo 360°,
  format large **2:1**, ex. 4096×2048). Nomme‑la par ex. **`style-aquarelle.png`**.
- *(optionnel)* une **image de référence** de style (une image qui montre le
  rendu voulu). Nomme‑la par ex. **`ref-style-aquarelle.png`**.

> L'**extension** est libre (`.png`, `.jpg`, `.webp`…). Mais le **nom** doit
> correspondre pile à ce que tu écris dans la config (voir étape 2), **casse et
> tirets compris**.

### Étape 2 — déclarer le style

Ouvre **`src/panoramas.js`**. Repère la zone `bureau` :

```js
bureau: [
  { id: 'bureau-1', label: 'Felt', src: '/panoramas/style-felt', ... },
  { id: 'bureau-2', label: 'Cartoon', src: '/panoramas/style-cartoon', ... },
  { id: 'bureau-3', label: 'Clay', src: '/panoramas/style-clay', ... },
],
```

**Copie** un bloc existant et ajoute le tien à la suite (attention à la **virgule**
à la fin de chaque bloc) :

```js
  {
    id: 'bureau-4',
    label: 'Aquarelle',
    src: '/panoramas/style-aquarelle',
    styleRef: '/panoramas/ref-style-aquarelle',
    prompt: 'Ton prompt ici (voir §4).',
  },
```

**Ce que veut dire chaque ligne :**

| Champ | Rôle |
|---|---|
| `id` | identifiant **unique** (différent de tous les autres). |
| `label` | le nom affiché sous la miniature. |
| `src` | le **panorama** (sans extension). Doit correspondre au fichier déposé. |
| `styleRef` | *(optionnel)* l'**image de référence** de style (sans extension). |
| `prompt` | *(optionnel)* les instructions pour l'IA (voir §4). |

Enregistre → `Reconstruire.bat` → `Demarrer.bat` → F5. Clique le point de la
zone → ta nouvelle miniature apparaît.

### (Variante) Ajouter une NOUVELLE zone (nouveau point → nouveaux styles)

1. Dans `src/splat.js`, crée un point avec une **nouvelle** `zone`, ex. `zone: 'salle'`.
2. Dans `src/panoramas.js`, ajoute la zone correspondante :
   ```js
   export const PANORAMAS = {
     bureau: [ ... ],
     hall: [ ... ],
     salle: [
       { id: 'salle-1', label: 'Style 1', src: '/panoramas/salle-1' },
     ],
   };
   ```
   (n'oublie pas la **virgule** après le crochet `]` de la zone précédente.)

---

## 4. Modifier le prompt d'un style

Le **prompt** = les instructions données à l'IA pour ce style. Il se trouve dans
le champ **`prompt:`** du style, dans `src/panoramas.js`.

```js
{
  id: 'bureau-3', label: 'Clay', src: '/panoramas/style-clay',
  styleRef: '/panoramas/ref-style-clay',
  prompt: 'adapt the style of the face picture to the clay style image, ...',
},
```

Pour le modifier : change simplement le texte **entre les guillemets `'...'`**.

⚠️ **Deux règles :**

1. Garde le texte **sur une seule ligne**, entre guillemets simples `'...'`.
   N'utilise pas d'apostrophe `'` à l'intérieur (écris « its » plutôt que « it's »),
   sinon ça casse.
2. **L'ordre des images** reçues par l'IA est :
   1. le **décor** (le panorama),
   2. l'**image de référence** du style (si tu as mis un `styleRef`),
   3. puis les **visages** des personnes.

   Écris le prompt en tenant compte de cet ordre (ex. « the second image is the
   style reference » n'a de sens que si le style a bien un `styleRef`).

> Si un style **n'a pas** de `prompt`, c'est le prompt **par défaut** qui est
> utilisé (défini dans `server/integrate.js`).

---

## 5. Enregistrer / partager tes changements (facultatif)

Tant que tu modifies en local, ça reste sur ton ordinateur. Pour **sauvegarder
définitivement** ou **partager**, il faut « pousser » sur GitHub. Si tu ne
connais pas Git, le plus simple est de **confier cette étape à un développeur**,
ou de suivre le `README.md`.

⚠️ **Ne mets jamais le fichier `public/splats/locaux.ply` dans Git** : il est
trop lourd. Il est hébergé à part (dans la *release* GitHub) et récupéré par
`Telecharger.bat`.

---

## 6. Problèmes fréquents

| Symptôme | Cause probable | Solution |
|---|---|---|
| **Page blanche** après une modif | virgule / guillemet / accolade manquante | Annule ta modif (Ctrl+Z), enregistre, `Reconstruire.bat`. |
| Un style affiche **« Scene not found »** | le fichier image n'existe pas, ou le nom ne correspond pas au `src` | Vérifie le nom du fichier dans `public/panoramas/` (casse + tirets). |
| Le style **ne change pas** le rendu comme prévu | pas de `styleRef`, ou prompt qui parle d'une image absente | Ajoute l'image `ref-...` et/ou corrige le prompt. |
| Mes changements **n'apparaissent pas** | oubli de reconstruire | `Reconstruire.bat` puis `Demarrer.bat` + F5. |
| Le hub 3D est vide (« Enter without 3D ») | le splat `locaux.ply` est absent | Relance `Telecharger.bat`, ou remets le `.ply` dans `public/splats/`. |

---

Besoin d'aide ? Garde ce guide à côté de toi, procède **par petites étapes**, et
teste après chaque changement. 👍
