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
  $('shoot-btn').classList.toggle('hidden', !live);
  video.classList.toggle('hidden', !live);
  captureCanvas.classList.toggle('hidden', live);
  $('retake-btn').classList.toggle('hidden', live);
  $('place-btn').classList.toggle('hidden', live);
}

async function openCapture() {
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

// Fige la photo dans l'aperçu.
function shoot() {
  const frame = webcam.grabFrame();
  captureCanvas.width = frame.width;
  captureCanvas.height = frame.height;
  captureCanvas.getContext('2d').drawImage(frame, 0, 0);
  captureCanvas._frame = frame;
  setCaptureState('preview');
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
$('retake-btn').addEventListener('click', () => setCaptureState('live'));
$('place-btn').addEventListener('click', integrate);
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
