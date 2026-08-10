// Génère une image équirectangulaire (ratio 2:1) de démonstration, façon
// "espace de bureau" stylisé, pour que l'expérience tourne sans asset externe.
// Remplace-la simplement par une vraie photo 360° de tes locaux via l'UI.

export function createDemoPanorama(width = 4096, height = 2048) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const horizon = height * 0.52;

  // Ciel / plafond
  const ceiling = ctx.createLinearGradient(0, 0, 0, horizon);
  ceiling.addColorStop(0, '#1b2340');
  ceiling.addColorStop(1, '#2b3a63');
  ctx.fillStyle = ceiling;
  ctx.fillRect(0, 0, width, horizon);

  // Sol
  const floor = ctx.createLinearGradient(0, horizon, 0, height);
  floor.addColorStop(0, '#20304f');
  floor.addColorStop(1, '#0c1220');
  ctx.fillStyle = floor;
  ctx.fillRect(0, horizon, width, height - horizon);

  // Ligne d'horizon lumineuse
  const glow = ctx.createLinearGradient(0, horizon - 40, 0, horizon + 40);
  glow.addColorStop(0, 'rgba(91,140,255,0)');
  glow.addColorStop(0.5, 'rgba(124,91,255,0.35)');
  glow.addColorStop(1, 'rgba(91,140,255,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, horizon - 40, width, 80);

  // Grille murale (repères d'orientation), atténuée vers les pôles
  ctx.lineWidth = 2;
  const cols = 24;
  for (let i = 0; i <= cols; i++) {
    const x = (i / cols) * width;
    ctx.strokeStyle = `rgba(120,150,220,${0.10 + (i % 6 === 0 ? 0.14 : 0)})`;
    ctx.beginPath();
    ctx.moveTo(x, horizon * 0.15);
    ctx.lineTo(x, height * 0.9);
    ctx.stroke();
  }
  const rows = 10;
  for (let j = 1; j < rows; j++) {
    const t = j / rows;
    const y = t * height;
    const fade = 1 - Math.abs(t - 0.5) * 1.6; // s'estompe vers haut/bas
    ctx.strokeStyle = `rgba(120,150,220,${Math.max(0, fade) * 0.12})`;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // "Fenêtres" lumineuses le long du mur
  const windows = 6;
  for (let i = 0; i < windows; i++) {
    const wx = ((i + 0.5) / windows) * width;
    const ww = width * 0.06;
    const wh = horizon * 0.34;
    const wy = horizon - wh - 30;
    const g = ctx.createLinearGradient(0, wy, 0, wy + wh);
    g.addColorStop(0, 'rgba(150,190,255,0.55)');
    g.addColorStop(1, 'rgba(90,120,200,0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(wx - ww / 2, wy, ww, wh);
    ctx.strokeStyle = 'rgba(200,220,255,0.3)';
    ctx.strokeRect(wx - ww / 2, wy, ww, wh);
  }

  // Texte d'aide au centre (yaw 0) — repère "avant"
  ctx.save();
  ctx.translate(width * 0.5, horizon - 120);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = `bold ${Math.round(height * 0.028)}px system-ui, sans-serif`;
  ctx.fillText('PANORAMA DE DÉMO — remplace-moi par tes locaux 360°', 0, 0);
  ctx.restore();

  return canvas;
}
