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
