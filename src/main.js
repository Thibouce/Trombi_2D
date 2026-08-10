import * as THREE from 'three';
import { Panorama } from './scene/Panorama.js';
import { createPhotoBillboard } from './scene/PhotoBillboard.js';
import { createDemoPanorama } from './scene/demoPanorama.js';
import { Webcam } from './capture/Webcam.js';
import { removeBackground } from './capture/segmentation.js';

// ---- Éléments du DOM ------------------------------------------------------
const $ = (id) => document.getElementById(id);
const capturePanel = $('capture-panel');
const video = $('webcam');
const captureCanvas = $('capture-canvas');
const loader = $('loader');

// ---- Scène 360 ------------------------------------------------------------
const panorama = new Panorama($('scene'));
panorama.setPanoramaTexture(createDemoPanorama());
panorama.start();

// ---- Webcam ---------------------------------------------------------------
const webcam = new Webcam(video);
let lastCutout = null; // { canvas, aspect } de la dernière tête détourée

// ---- Utilitaires UI -------------------------------------------------------
function showLoader(text = 'Traitement…') {
  loader.querySelector('span').textContent = text;
  loader.classList.remove('hidden');
}
function hideLoader() {
  loader.classList.add('hidden');
}
function setCaptureState(state) {
  // states: 'live' | 'preview'
  const live = state === 'live';
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

// Prend la photo et affiche l'aperçu figé.
function shoot() {
  const frame = webcam.grabFrame();
  lastCutout = null;
  captureCanvas.width = frame.width;
  captureCanvas.height = frame.height;
  captureCanvas.getContext('2d').drawImage(frame, 0, 0);
  captureCanvas._frame = frame; // conserve la source pour le détourage
  setCaptureState('preview');
}

// Détoure la tête et l'intègre dans la scène 360.
async function placeInScene() {
  const frame = captureCanvas._frame;
  if (!frame) return;
  showLoader('Détourage de ta tête…');
  try {
    const cutout = await removeBackground(frame);
    lastCutout = cutout;

    // Place la tête là où la caméra regarde actuellement.
    const look = panorama.currentLook;
    const billboard = createPhotoBillboard(cutout.canvas, {
      width: 46,
      aspect: cutout.aspect,
    });
    const pos = panorama.directionToPosition(look.lon, look.lat, 130);
    billboard.position.copy(pos);
    billboard.userData.baseY = pos.y;
    panorama.addOverlayObject(billboard);

    closeCapture();
  } catch (err) {
    console.error(err);
    alert('Oups, le détourage a échoué : ' + err.message);
  } finally {
    hideLoader();
  }
}

// Charge un panorama équirectangulaire fourni par l'utilisateur.
function loadPanoramaFile(file) {
  if (!file) return;
  showLoader('Chargement du panorama…');
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    panorama.setPanoramaTexture(img);
    URL.revokeObjectURL(url);
    hideLoader();
  };
  img.onerror = () => {
    hideLoader();
    alert('Image invalide.');
  };
  img.src = url;
}

// ---- Branchements des événements -----------------------------------------
$('open-capture').addEventListener('click', openCapture);
$('capture-cancel').addEventListener('click', closeCapture);
$('shoot-btn').addEventListener('click', shoot);
$('retake-btn').addEventListener('click', () => setCaptureState('live'));
$('place-btn').addEventListener('click', placeInScene);
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
