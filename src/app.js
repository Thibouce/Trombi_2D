import { Panorama } from './scene/Panorama.js';
import { createDemoPanorama } from './scene/demoPanorama.js';
import { Webcam } from './capture/Webcam.js';
import { toScaledDataURL, integrateIntoScene } from './capture/integrateClient.js';

// Application Trombi 2D, paramétrée par le nombre de personnes à intégrer.
//  - maxPeople = 1  -> version "un personnage" (intégration immédiate)
//  - maxPeople >= 2 -> version "N personnages" (liste + intégration groupée)
export function initApp({ maxPeople = 1 } = {}) {
  const IMMEDIATE = maxPeople === 1;
  const $ = (id) => document.getElementById(id);
  const capturePanel = $('capture-panel');
  const video = $('webcam');
  const captureCanvas = $('capture-canvas');
  const loader = $('loader');

  const state = {
    originalSceneDataUrl: null,
    sceneDataUrl: null,
    captureSource: 'webcam', // 'webcam' | 'import'
    people: [], // data URLs des visages à intégrer (références gpt-image-2)
  };

  // ---- Scène 360 ----------------------------------------------------------
  const panorama = new Panorama($('scene'));
  const demo = createDemoPanorama();
  panorama.setPanoramaTexture(demo);
  panorama.start();
  // Base par défaut en haute résolution (jusqu'à 3840) pour alimenter le 4K.
  state.originalSceneDataUrl = toScaledDataURL(demo, 3840, 0.92);
  state.sceneDataUrl = state.originalSceneDataUrl;

  const webcam = new Webcam(video);

  // ---- Helpers UI ---------------------------------------------------------
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

    const addBtn = $('add-btn');
    addBtn.classList.toggle('hidden', live);
    addBtn.textContent = IMMEDIATE ? '✨ Intégrer' : '➕ Ajouter à la liste';

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
      webcam.stop();
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

  // Action principale de l'aperçu.
  function onPreviewPrimary() {
    if (IMMEDIATE) integrateSolo();
    else addCurrentPerson();
  }

  // Version "un personnage" : intègre immédiatement la personne de l'aperçu.
  async function integrateSolo() {
    const frame = captureCanvas._frame;
    if (!frame) return;
    const personDataUrl = toScaledDataURL(frame, 1536, 0.92);
    const ok = await runIntegration([personDataUrl], 'Intégration en cours… (GPT Image 2)');
    if (ok) closeCapture();
  }

  // Version "N personnages" : ajoute la personne de l'aperçu à la liste.
  function addCurrentPerson() {
    const frame = captureCanvas._frame;
    if (!frame) return;
    if (state.people.length >= maxPeople) {
      alert(`Cette version accepte au maximum ${maxPeople} personne(s).`);
      return;
    }
    state.people.push(toScaledDataURL(frame, 1536, 0.92));
    renderRoster();

    const full = state.people.length >= maxPeople;
    if (state.captureSource === 'webcam' && !full) {
      setCaptureState('live'); // enchaîner la personne suivante
    } else {
      closeCapture();
    }
  }

  // Envoie la scène + les personnes à GPT Image 2 et applique le résultat.
  async function runIntegration(personDataUrls, loaderText) {
    showLoader(loaderText);
    try {
      const editedDataUrl = await integrateIntoScene({
        personDataUrls,
        sceneDataUrl: state.sceneDataUrl,
      });
      await applySceneImage(editedDataUrl);
      state.sceneDataUrl = editedDataUrl; // la scène éditée devient la nouvelle base
      return true;
    } catch (err) {
      console.error(err);
      alert("L'intégration a échoué : " + err.message);
      return false;
    } finally {
      hideLoader();
    }
  }

  // Rend la bande de miniatures + met à jour le bouton d'intégration.
  function renderRoster() {
    if (IMMEDIATE) return; // pas de liste en version "un personnage"
    const roster = $('roster');
    const list = $('roster-list');
    list.innerHTML = '';
    state.people.forEach((dataUrl, i) => {
      const item = document.createElement('div');
      item.className = 'roster-item';
      const img = document.createElement('img');
      img.src = dataUrl;
      img.alt = `Personne ${i + 1}`;
      const del = document.createElement('button');
      del.className = 'roster-del';
      del.title = 'Retirer';
      del.textContent = '×';
      del.addEventListener('click', () => {
        state.people.splice(i, 1);
        renderRoster();
      });
      item.append(img, del);
      list.append(item);
    });

    const count = state.people.length;
    roster.classList.toggle('hidden', count === 0);
    const btn = $('integrate-btn');
    btn.disabled = count === 0;
    btn.textContent = count === 0 ? '✨ Intégrer' : `✨ Intégrer (${count})`;
  }

  // Version "N personnages" : envoie la scène + toute la liste en un appel.
  async function integrateAll() {
    if (state.people.length === 0) return;
    const ok = await runIntegration(
      state.people,
      `Intégration de ${state.people.length} personne(s)… (GPT Image 2)`
    );
    if (ok) {
      state.people = [];
      renderRoster();
    }
  }

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
    state.people = [];
    renderRoster();
  }

  // ---- Événements ---------------------------------------------------------
  $('open-capture').addEventListener('click', openCapture);
  $('capture-cancel').addEventListener('click', closeCapture);
  $('shoot-btn').addEventListener('click', shoot);
  $('retake-btn').addEventListener('click', () => {
    if (state.captureSource === 'import') $('face-input').click();
    else setCaptureState('live');
  });
  $('add-btn').addEventListener('click', onPreviewPrimary);
  $('face-input').addEventListener('change', (e) => {
    importFace(e.target.files[0]);
    e.target.value = '';
  });
  $('reset-btn').addEventListener('click', resetScene);
  $('pano-input').addEventListener('change', (e) => loadPanoramaFile(e.target.files[0]));

  // Bouton d'intégration groupée : seulement en version "N personnages".
  const integrateBtn = $('integrate-btn');
  if (IMMEDIATE) {
    integrateBtn.classList.add('hidden');
  } else {
    integrateBtn.addEventListener('click', integrateAll);
  }

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

  renderRoster(); // état initial de la liste
}
