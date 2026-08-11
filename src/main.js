import { Panorama } from './scene/Panorama.js';
import { createDemoPanorama } from './scene/demoPanorama.js';
import { Webcam } from './capture/Webcam.js';
import { toScaledDataURL, integrateIntoScene } from './capture/integrateClient.js';

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

// Charge un panorama équirectangulaire fourni par l'utilisateur.
async function loadPanoramaFile(file) {
  if (!file) return;
  showLoader('Chargement du panorama…');
  try {
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    await applySceneImage(dataUrl);
    const img = new Image();
    img.src = dataUrl;
    await img.decode();
    state.originalSceneDataUrl = toScaledDataURL(img, 3840, 0.92);
    state.sceneDataUrl = state.originalSceneDataUrl;
  } catch (err) {
    alert('Image invalide : ' + err.message);
  } finally {
    hideLoader();
  }
}

async function resetScene() {
  await applySceneImage(state.originalSceneDataUrl);
  state.sceneDataUrl = state.originalSceneDataUrl;
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
$('pano-input').addEventListener('change', (e) => loadPanoramaFile(e.target.files[0]));

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
