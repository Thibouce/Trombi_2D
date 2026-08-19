import { Panorama } from './scene/Panorama.js';
import { createDemoPanorama } from './scene/demoPanorama.js';
import { Webcam } from './capture/Webcam.js';
import { toScaledDataURL, integrateIntoScene } from './capture/integrateClient.js';
import { STYLES } from './panoramas.js';

// ---- DOM ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const capturePanel = $('capture-panel');
const video = $('webcam');
const captureCanvas = $('capture-canvas');
const loader = $('loader');

// ---- État -----------------------------------------------------------------
const state = {
  originalSceneDataUrl: null, // panorama d'origine (pour "réinitialiser")
  sceneDataUrl: null, // panorama courant envoyé au modèle
  captureSource: 'webcam', // 'webcam' | 'import'
};

// ---- Scène 360 ------------------------------------------------------------
const panorama = new Panorama($('scene'));
const demo = createDemoPanorama();
panorama.setPanoramaTexture(demo);
panorama.start();
// La démo sert de scène de base par défaut. On la garde en haute résolution
// (jusqu'à 3840 de large) pour alimenter la sortie 4K sans upscale.
state.originalSceneDataUrl = toScaledDataURL(demo, 3840, 0.92);
state.sceneDataUrl = state.originalSceneDataUrl;

// ---- Webcam ---------------------------------------------------------------
const webcam = new Webcam(video);

// ---- Helpers UI -----------------------------------------------------------
function showLoader(text) {
  loader.querySelector('span').textContent = text || 'Traitement…';
  loader.classList.remove('hidden');
}
function hideLoader() {
  loader.classList.add('hidden');
}
function setCaptureState(mode) {
  const live = mode === 'live';
  const imported = state.captureSource === 'import';
  $('shoot-btn').classList.toggle('hidden', !live);
  video.classList.toggle('hidden', !live);
  captureCanvas.classList.toggle('hidden', live);
  // En import, l'aperçu ne doit pas être mis en miroir (contrairement au selfie).
  captureCanvas.classList.toggle('no-mirror', imported);
  $('place-btn').classList.toggle('hidden', live);

  const retake = $('retake-btn');
  retake.classList.toggle('hidden', live);
  retake.textContent = imported ? '🖼️ Autre image' : '↺ Reprendre';
}

async function openCapture() {
  state.captureSource = 'webcam';
  capturePanel.classList.remove('hidden');
  setCaptureState('live');
  try {
    await webcam.start();
  } catch (err) {
    alert("Impossible d'accéder à la webcam : " + err.message);
    closeCapture();
  }
}
function closeCapture() {
  webcam.stop();
  capturePanel.classList.add('hidden');
}

// Fige la photo webcam dans l'aperçu.
function shoot() {
  const frame = webcam.grabFrame();
  captureCanvas.width = frame.width;
  captureCanvas.height = frame.height;
  captureCanvas.getContext('2d').drawImage(frame, 0, 0);
  captureCanvas._frame = frame;
  setCaptureState('preview');
}

// Importe une image de visage (pour tests) : elle remplace la photo webcam.
async function importFace(file) {
  if (!file) return;
  try {
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image invalide.'));
      };
      image.src = url;
    });
    state.captureSource = 'import';
    webcam.stop(); // au cas où la webcam tournait
    captureCanvas.width = img.naturalWidth;
    captureCanvas.height = img.naturalHeight;
    captureCanvas.getContext('2d').drawImage(img, 0, 0);
    captureCanvas._frame = img;
    capturePanel.classList.remove('hidden');
    setCaptureState('preview');
  } catch (err) {
    alert(err.message);
  }
}

// Envoie la photo + le panorama courant à nanoBanana Pro, puis remplace la scène.
async function integrate() {
  const frame = captureCanvas._frame;
  if (!frame) return;
  showLoader('Intégration en cours… (GPT Image 2)');
  try {
    const personDataUrl = toScaledDataURL(frame, 1536, 0.92);
    const editedDataUrl = await integrateIntoScene({
      personDataUrl,
      sceneDataUrl: state.sceneDataUrl,
    });
    await applySceneImage(editedDataUrl);
    // Les intégrations suivantes s'ajoutent à la scène déjà peuplée.
    state.sceneDataUrl = editedDataUrl;
    setDownloadEnabled(true); // le résultat est téléchargeable
    closeCapture();
  } catch (err) {
    console.error(err);
    alert("L'intégration a échoué : " + err.message);
  } finally {
    hideLoader();
  }
}

// Charge une image (data URL ou objet URL) comme texture de panorama.
function applySceneImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      panorama.setPanoramaTexture(img);
      resolve();
    };
    img.onerror = () => reject(new Error('Image de scène invalide.'));
    img.src = url;
  });
}

// Charge une image (par URL) et renvoie l'élément Image décodé.
function loadImageEl(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('chargement impossible'));
    img.src = url;
  });
}

// Construit le sélecteur de décors à partir de la config STYLES.
function buildStylePicker() {
  const picker = $('style-picker');
  STYLES.forEach((style) => {
    const btn = document.createElement('button');
    btn.className = 'style-thumb';
    btn.dataset.id = style.id;
    btn.title = `Se projeter — ${style.label}`;

    const img = document.createElement('img');
    img.src = style.thumb || style.src;
    img.alt = style.label;
    img.onerror = () => btn.classList.add('missing');

    const label = document.createElement('span');
    label.className = 'style-label';
    label.textContent = style.label;

    btn.append(img, label);
    btn.addEventListener('click', () => selectStyle(style));
    picker.append(btn);
  });
}

function setActiveStyle(id) {
  document.querySelectorAll('#style-picker .style-thumb').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === id);
  });
}

// Projette la scène dans le décor du style choisi.
async function selectStyle(style) {
  showLoader('Chargement du décor…');
  try {
    const img = await loadImageEl(style.src);
    panorama.setPanoramaTexture(img);
    state.originalSceneDataUrl = toScaledDataURL(img, 3840, 0.92);
    state.sceneDataUrl = state.originalSceneDataUrl;
    setDownloadEnabled(false); // nouveau décor -> plus de résultat en cours
    setActiveStyle(style.id);
  } catch (err) {
    alert(
      `Décor introuvable (${style.src}).\n` +
        "Dépose l'image équirectangulaire dans public/panoramas/ (voir le README)."
    );
  } finally {
    hideLoader();
  }
}

async function resetScene() {
  await applySceneImage(state.originalSceneDataUrl);
  state.sceneDataUrl = state.originalSceneDataUrl;
  setDownloadEnabled(false); // plus de résultat à télécharger
}

// Active/désactive le bouton de téléchargement.
function setDownloadEnabled(on) {
  $('download-btn').disabled = !on;
}

// Télécharge le panorama courant (résultat de l'intégration).
function downloadResult() {
  const url = state.sceneDataUrl;
  if (!url) return;
  const mime = (url.match(/^data:([^;]+)/) || [])[1] || 'image/jpeg';
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const a = document.createElement('a');
  a.href = url;
  a.download = `trombi-360-${Date.now()}.${ext}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// ---- Événements -----------------------------------------------------------
$('open-capture').addEventListener('click', openCapture);
$('capture-cancel').addEventListener('click', closeCapture);
$('shoot-btn').addEventListener('click', shoot);
$('retake-btn').addEventListener('click', () => {
  // En import : rechoisir un fichier ; en webcam : revenir au flux live.
  if (state.captureSource === 'import') $('face-input').click();
  else setCaptureState('live');
});
$('place-btn').addEventListener('click', integrate);
$('face-input').addEventListener('change', (e) => {
  importFace(e.target.files[0]);
  e.target.value = ''; // permet de réimporter le même fichier
});
$('reset-btn').addEventListener('click', resetScene);
$('download-btn').addEventListener('click', downloadResult);

buildStylePicker(); // sélecteur de décors

const autotourBtn = $('autotour-btn');
autotourBtn.addEventListener('click', () => {
  const on = panorama.toggleAutoTour();
  autotourBtn.setAttribute('aria-pressed', String(on));
  autotourBtn.textContent = on ? '⏸ Tour auto' : '▶ Tour auto';
});
panorama.onUserInteract = () => {
  autotourBtn.setAttribute('aria-pressed', 'false');
  autotourBtn.textContent = '▶ Tour auto';
};
