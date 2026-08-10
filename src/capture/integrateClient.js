// Client de l'endpoint d'intégration. Redimensionne les images avant l'envoi
// (pour limiter la charge utile et le coût), puis appelle /api/integrate.

// Convertit une image (Canvas/Image) en data URL JPEG, bornée en largeur.
export function toScaledDataURL(source, maxWidth, quality = 0.92) {
  const sw = source.width || source.videoWidth;
  const sh = source.height || source.videoHeight;
  const scale = Math.min(1, maxWidth / sw);
  const w = Math.round(sw * scale);
  const h = Math.round(sh * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d').drawImage(source, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', quality);
}

// Reconstruit le panorama avec un REPÈRE ROUGE à l'endroit visé (lon/lat de la
// caméra), pour indiquer au modèle quelle tête remplacer. Le mapping lon/lat ->
// pixel suit la convention de projection équirectangulaire de la sphère Three.js
// (u = lon/360 ; v = (90 - lat)/180).
export function buildMarkedScene(sceneDataUrl, lonDeg, latDeg, maxWidth = 2048) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width);
      const W = Math.round(img.width * scale);
      const H = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = W;
      canvas.height = H;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, W, H);

      const lon = ((lonDeg % 360) + 360) % 360;
      const x = (lon / 360) * W;
      const y = ((90 - latDeg) / 180) * H;
      drawTargetMarker(ctx, x, y, W, H);

      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => reject(new Error('Scène invalide.'));
    img.src = sceneDataUrl;
  });
}

function drawTargetMarker(ctx, x, y, W, H) {
  const r = H * 0.06;
  // L'équirectangulaire s'enroule horizontalement : on dessine aussi les copies
  // décalées de ±W pour ne pas tronquer un repère proche de la couture.
  for (const dx of [0, -W, W]) {
    const cx = x + dx;
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,0,0,0.22)';
    ctx.fill();
    ctx.lineWidth = Math.max(3, H * 0.006);
    ctx.strokeStyle = 'rgba(255,0,0,0.95)';
    ctx.stroke();
    ctx.restore();
  }
}

// Envoie la photo de la personne + le panorama au serveur, renvoie la data URL
// du panorama édité.
export async function integrateIntoScene({ personDataUrl, sceneDataUrl }) {
  const res = await fetch('/api/integrate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ personDataUrl, sceneDataUrl }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `Erreur serveur (${res.status})`);
  if (!json.imageDataUrl) throw new Error('Réponse serveur invalide.');
  return json.imageDataUrl;
}
