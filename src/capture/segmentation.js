// Détourage de la tête : on retire le fond de la photo webcam.
//
// Stratégie :
//  1) Si possible, on charge MediaPipe "Selfie Segmentation" (depuis un CDN) pour
//     un détourage propre de la silhouette.
//  2) Sinon, repli robuste et 100% local : découpe ovale + bords adoucis.
//
// Dans les deux cas on renvoie { canvas, aspect } : une image RGBA recadrée
// serré autour du sujet, prête à être posée dans la scène 360.

const MEDIAPIPE_VERSION = '0.10.14';
const CDN_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}`;
const MODEL_URL = `https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite`;

let _segmenterPromise = null;

async function getSegmenter() {
  if (_segmenterPromise) return _segmenterPromise;
  _segmenterPromise = (async () => {
    const vision = await import(
      /* @vite-ignore */ `${CDN_BASE}/vision_bundle.mjs`
    );
    const { FilesetResolver, ImageSegmenter } = vision;
    const fileset = await FilesetResolver.forVisionTasks(`${CDN_BASE}/wasm`);
    return ImageSegmenter.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_URL, delegate: 'GPU' },
      runningMode: 'IMAGE',
      outputCategoryMask: true,
      outputConfidenceMasks: false,
    });
  })();
  return _segmenterPromise;
}

export async function removeBackground(sourceCanvas) {
  try {
    return await segmentWithMediaPipe(sourceCanvas);
  } catch (err) {
    console.warn('[segmentation] MediaPipe indisponible, repli ovale :', err);
    return ovalCutout(sourceCanvas);
  }
}

async function segmentWithMediaPipe(sourceCanvas) {
  const segmenter = await getSegmenter();
  const result = segmenter.segment(sourceCanvas);
  const mask = result.categoryMask;
  const w = mask.width;
  const h = mask.height;
  const maskData = mask.getAsUint8Array();

  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const octx = out.getContext('2d');
  octx.drawImage(sourceCanvas, 0, 0, w, h);
  const img = octx.getImageData(0, 0, w, h);

  // La catégorie 0 = fond. On rend le fond transparent.
  for (let i = 0; i < maskData.length; i++) {
    if (maskData[i] === 0) img.data[i * 4 + 3] = 0;
  }
  octx.putImageData(img, 0, 0);
  mask.close?.();
  result.close?.();

  const cropped = cropToAlpha(out);
  featherEdges(cropped);
  return { canvas: cropped, aspect: cropped.width / cropped.height };
}

// Repli : découpe un ovale centré (zone du visage) avec un dégradé de bord.
function ovalCutout(sourceCanvas) {
  const w = sourceCanvas.width;
  const h = sourceCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h;
  const ctx = out.getContext('2d');

  const cx = w / 2;
  const cy = h * 0.46;
  const rx = w * 0.30;
  const ry = h * 0.40;

  // Masque radial adouci.
  const grad = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.6, cx, cy, Math.max(rx, ry));
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.85, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(rx, ry);
  ctx.beginPath();
  ctx.arc(0, 0, 1, 0, Math.PI * 2);
  ctx.restore();

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-in';
  ctx.drawImage(sourceCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  const cropped = cropToAlpha(out);
  return { canvas: cropped, aspect: cropped.width / cropped.height };
}

// Recadre le canvas sur la boîte englobante des pixels non transparents.
function cropToAlpha(canvas, padding = 0.06) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const { data } = ctx.getImageData(0, 0, w, h);

  let minX = w, minY = h, maxX = 0, maxY = 0, found = false;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] > 24) {
        found = true;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (!found) return canvas;

  const padX = (maxX - minX) * padding;
  const padY = (maxY - minY) * padding;
  minX = Math.max(0, Math.floor(minX - padX));
  minY = Math.max(0, Math.floor(minY - padY));
  maxX = Math.min(w, Math.ceil(maxX + padX));
  maxY = Math.min(h, Math.ceil(maxY + padY));

  const cw = maxX - minX;
  const ch = maxY - minY;
  const out = document.createElement('canvas');
  out.width = cw;
  out.height = ch;
  out.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return out;
}

// Adoucit légèrement les bords du masque alpha pour éviter l'effet "découpé".
function featherEdges(canvas) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const image = ctx.getImageData(0, 0, w, h);
  const a = image.data;
  const src = new Uint8ClampedArray(a.length);
  src.set(a);

  const idx = (x, y) => (y * w + x) * 4 + 3;
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) sum += src[idx(x + dx, y + dy)];
      a[idx(x, y)] = sum / 9;
    }
  }
  ctx.putImageData(image, 0, 0);
}
