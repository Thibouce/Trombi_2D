import { Panorama } from './scene/Panorama.js';
import { Hub } from './scene/Hub.js';
import { createDemoPanorama } from './scene/demoPanorama.js';
import { Webcam } from './capture/Webcam.js';
import { toScaledDataURL, integrateIntoScene } from './capture/integrateClient.js';
import { PANORAMAS } from './panoramas.js';
import { SPLAT, HOTSPOTS } from './splat.js';

// ---- DOM ------------------------------------------------------------------
const $ = (id) => document.getElementById(id);
const capturePanel = $('capture-panel');
const video = $('webcam');
const captureCanvas = $('capture-canvas');
const loader = $('loader');

// ---- État -----------------------------------------------------------------
const MAX_PEOPLE = 15; // gpt-image-2/edit : 16 images max (scène + 15 visages)
const state = {
  originalSceneDataUrl: null, // panorama d'origine (pour "réinitialiser")
  sceneDataUrl: null, // panorama courant envoyé au modèle
  captureSource: 'webcam', // 'webcam' | 'import'
  people: [], // data URLs des visages à intégrer (références gpt-image-2)
  stylePrompt: null, // prompt spécifique au style choisi (sinon défaut serveur)
  styleRefDataUrl: null, // image de référence du style choisi (optionnelle)
};

// ---- Scène 360 (étape 2) --------------------------------------------------
const panorama = new Panorama($('scene'));
const demo = createDemoPanorama();
panorama.setPanoramaTexture(demo);
let panoramaStarted = false;
// La démo sert de base par défaut tant qu'aucun style n'a été choisi.
state.originalSceneDataUrl = toScaledDataURL(demo, 3840, 0.92);
state.sceneDataUrl = state.originalSceneDataUrl;

// ---- Hub 3D (étape 1) -----------------------------------------------------
const debug = location.search.includes('debug');
const hub = new Hub($('hub'), { debug });
hub.setCamera(SPLAT.camera);
hub.addHotspots(HOTSPOTS);
hub.onHotspot = (data) => openStyleModal(data);
hub.start();
let refreshAlignReadout = () => {};
hub
  .loadSplat(SPLAT)
  .then(() => refreshAlignReadout()) // le splat est chargé -> readout à jour
  .catch((err) => {
    console.warn('[hub] splat non chargé :', err);
    $('hub-hint').textContent =
      'Premises splat not found (public/splats/). You can enter without 3D below.';
  });

// Outils de mise au point (mode ?debug) : aligner le splat + placer des points.
function setupAlignTool() {
  const panel = $('align-panel');
  const readout = $('align-readout');
  panel.classList.remove('hidden');

  const fmt = (e) => `rotationEuler: [${e.map((v) => v.toFixed(3)).join(', ')}]`;
  refreshAlignReadout = () => {
    readout.textContent = fmt(hub.getRotationEuler());
  };
  refreshAlignReadout();

  panel.querySelectorAll('button[data-axis]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const deg = Number(btn.dataset.deg);
      hub.nudgeRotation(btn.dataset.axis, (deg * Math.PI) / 180);
      refreshAlignReadout();
    });
  });
  $('align-reset').addEventListener('click', () => {
    hub.resetRotation();
    refreshAlignReadout();
  });
  $('align-copy').addEventListener('click', async () => {
    const line = fmt(hub.getRotationEuler());
    try {
      await navigator.clipboard.writeText(line);
    } catch {}
    console.log('[hub] ' + line);
  });

  // Placement de points : le clic pose un repère et affiche ses coordonnées.
  const pointReadout = $('point-readout');
  let lastPoint = null;
  hub.onPickPoint = (coords) => {
    lastPoint = coords;
    pointReadout.textContent = `[${coords.map((v) => v.toFixed(2)).join(', ')}]`;
  };
  $('point-copy').addEventListener('click', async () => {
    if (!lastPoint) return;
    const line = `{ id: 'point', label: 'New point', position: [${lastPoint
      .map((v) => v.toFixed(2))
      .join(', ')}] },`;
    try {
      await navigator.clipboard.writeText(line);
    } catch {}
    console.log('[hub] ' + line);
  });
}
if (debug) setupAlignTool();

// ---- Étapes ---------------------------------------------------------------
function setStage(stage) {
  document.body.dataset.stage = stage;
  if (stage === 'hub') {
    closeCapture();
    hub.start();
    $('subtitle').textContent = 'Explore the premises and click on your desk 🖱️';
  } else {
    hub.stop();
    if (!panoramaStarted) {
      panorama.start();
      panoramaStarted = true;
    }
    $('subtitle').textContent = 'Take your photo and step into the scene 🙂';
  }
}
function goToPano() {
  setStage('pano');
}
function goToHub() {
  setStage('hub');
}

// Ouvre le choix des styles pour la zone du hotspot cliqué (ou la 1re zone).
function openStyleModal(hotspot) {
  const zones = Object.keys(PANORAMAS);
  const zone = (hotspot && hotspot.zone) || zones[0];
  buildStylePicker(PANORAMAS[zone] || []);
  $('style-modal-title').textContent =
    'Choose your scene' + (hotspot?.label ? ` — ${hotspot.label}` : '');
  $('style-modal').classList.remove('hidden');
}
function closeStyleModal() {
  $('style-modal').classList.add('hidden');
}

// ---- Webcam ---------------------------------------------------------------
const webcam = new Webcam(video);

// ---- Helpers UI -----------------------------------------------------------
function showLoader(text) {
  loader.querySelector('span').textContent = text || 'Working…';
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
  $('add-btn').classList.toggle('hidden', live);

  const retake = $('retake-btn');
  retake.classList.toggle('hidden', live);
  retake.textContent = imported ? '🖼️ Another image' : '↺ Retake';
}

async function openCapture() {
  state.captureSource = 'webcam';
  capturePanel.classList.remove('hidden');
  setCaptureState('live');
  try {
    await webcam.start();
  } catch (err) {
    alert('Cannot access the webcam: ' + err.message);
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

// Ajoute le visage de l'aperçu à la liste des références.
function addCurrentPerson() {
  const frame = captureCanvas._frame;
  if (!frame) return;
  if (state.people.length >= MAX_PEOPLE) {
    alert(`Maximum ${MAX_PEOPLE} faces per integration.`);
    return;
  }
  state.people.push(toScaledDataURL(frame, 1536, 0.92));
  renderRoster();

  if (state.captureSource === 'webcam') {
    setCaptureState('live'); // enchaîner le visage suivant
  } else {
    closeCapture();
  }
}

// (Re)construit la bande de miniatures + met à jour le bouton d'intégration.
function renderRoster() {
  const roster = $('roster');
  const list = $('roster-list');
  list.innerHTML = '';
  state.people.forEach((dataUrl, i) => {
    const item = document.createElement('div');
    item.className = 'roster-item';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.alt = `Face ${i + 1}`;
    const del = document.createElement('button');
    del.className = 'roster-del';
    del.title = 'Remove';
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
  btn.textContent = count === 0 ? '✨ Integrate' : `✨ Integrate (${count})`;
}

// Envoie la scène + tous les visages de la liste à GPT Image 2, en un appel.
async function integrateAll() {
  if (state.people.length === 0) return;
  showLoader(`Integrating ${state.people.length} face(s)… (GPT Image 2)`);
  try {
    const editedDataUrl = await integrateIntoScene({
      personDataUrls: state.people,
      sceneDataUrl: state.sceneDataUrl,
      styleRefDataUrl: state.styleRefDataUrl,
      prompt: state.stylePrompt,
    });
    await applySceneImage(editedDataUrl);
    state.sceneDataUrl = editedDataUrl; // la scène éditée devient la nouvelle base
    state.people = []; // la liste est maintenant dans la scène
    renderRoster();
    setDownloadEnabled(true);
  } catch (err) {
    console.error(err);
    alert('Integration failed: ' + err.message);
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
    img.onerror = () => reject(new Error('Invalid scene image.'));
    img.src = url;
  });
}

// Extensions testées quand la config ne précise pas l'extension.
const IMAGE_EXTS = ['png', 'jpg', 'jpeg', 'webp', 'avif', 'gif'];
const hasImageExt = (s) => /\.(png|jpe?g|webp|avif|gif|svg)$/i.test(s);

// Résout une image à partir d'un chemin qui PEUT ne pas avoir d'extension :
// on essaie les extensions courantes et on garde la première qui charge.
// Renvoie { img, url } (élément Image décodé + URL réelle).
function resolveImage(pathOrBase) {
  const candidates = hasImageExt(pathOrBase)
    ? [pathOrBase]
    : IMAGE_EXTS.map((ext) => `${pathOrBase}.${ext}`);
  return new Promise((resolve, reject) => {
    let i = 0;
    const tryNext = () => {
      if (i >= candidates.length) {
        reject(new Error('introuvable'));
        return;
      }
      const url = candidates[i++];
      const img = new Image();
      img.onload = () => resolve({ img, url });
      img.onerror = tryNext;
      img.src = url;
    };
    tryNext();
  });
}

// (Re)construit le sélecteur de décors à partir d'une liste de styles.
function buildStylePicker(styles) {
  const picker = $('style-picker');
  picker.innerHTML = '';
  styles.forEach((style) => {
    const btn = document.createElement('button');
    btn.className = 'style-thumb';
    btn.dataset.id = style.id;
    btn.title = `Enter — ${style.label}`;

    const img = document.createElement('img');
    img.alt = style.label;

    const label = document.createElement('span');
    label.className = 'style-label';
    label.textContent = style.label;

    btn.append(img, label);
    btn.addEventListener('click', () => selectStyle(style));
    picker.append(btn);

    // Résout l'extension de la miniature (thumb, sinon le panorama lui-même).
    resolveImage(style.thumb || style.src)
      .then(({ url }) => {
        img.src = url;
      })
      .catch(() => btn.classList.add('missing'));
  });
}

function setActiveStyle(id) {
  document.querySelectorAll('#style-picker .style-thumb').forEach((b) => {
    b.classList.toggle('active', b.dataset.id === id);
  });
}

// Projette la scène dans le décor du style choisi, puis passe au panorama.
async function selectStyle(style) {
  showLoader('Loading scene…');
  try {
    const { img } = await resolveImage(style.src);
    panorama.setPanoramaTexture(img);
    state.originalSceneDataUrl = toScaledDataURL(img, 3840, 0.92);
    state.sceneDataUrl = state.originalSceneDataUrl;

    // Prompt et image de référence spécifiques à ce style (optionnels).
    state.stylePrompt = style.prompt || null;
    state.styleRefDataUrl = null;
    if (style.styleRef) {
      try {
        const { img: refImg } = await resolveImage(style.styleRef);
        state.styleRefDataUrl = toScaledDataURL(refImg, 1536, 0.92);
      } catch {
        console.warn('[style] référence introuvable :', style.styleRef);
      }
    }

    setDownloadEnabled(false); // nouveau décor -> plus de résultat en cours
    setActiveStyle(style.id);
    closeStyleModal();
    goToPano();
  } catch (err) {
    alert(
      `Scene not found (${style.src}.*).\n` +
        'Drop the equirectangular image into public/panoramas/ (png, jpg, webp…).'
    );
  } finally {
    hideLoader();
  }
}

async function resetScene() {
  await applySceneImage(state.originalSceneDataUrl);
  state.sceneDataUrl = state.originalSceneDataUrl;
  state.people = [];
  renderRoster();
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
$('add-btn').addEventListener('click', addCurrentPerson);
$('integrate-btn').addEventListener('click', integrateAll);
$('face-input').addEventListener('change', (e) => {
  importFace(e.target.files[0]);
  e.target.value = ''; // permet de réimporter le même fichier
});
$('reset-btn').addEventListener('click', resetScene);
$('download-btn').addEventListener('click', downloadResult);
$('back-hub').addEventListener('click', goToHub);
$('enter-fallback').addEventListener('click', () => openStyleModal());
$('style-cancel').addEventListener('click', closeStyleModal);

renderRoster(); // état initial de la liste (vide)
setStage('hub'); // on démarre sur le hub 3D (le picker est bâti à l'ouverture de la modale)

const autotourBtn = $('autotour-btn');
autotourBtn.addEventListener('click', () => {
  const on = panorama.toggleAutoTour();
  autotourBtn.setAttribute('aria-pressed', String(on));
  autotourBtn.textContent = on ? '⏸ Auto-tour' : '▶ Auto-tour';
});
panorama.onUserInteract = () => {
  autotourBtn.setAttribute('aria-pressed', 'false');
  autotourBtn.textContent = '▶ Auto-tour';
};
