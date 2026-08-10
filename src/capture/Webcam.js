// Petit wrapper autour de getUserMedia pour piloter la webcam.
export class Webcam {
  constructor(videoEl) {
    this.video = videoEl;
    this.stream = null;
  }

  async start() {
    if (this.stream) return;
    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 960 },
      },
      audio: false,
    });
    this.video.srcObject = this.stream;
    await this.video.play();
    // Attend que les dimensions réelles soient connues.
    if (!this.video.videoWidth) {
      await new Promise((res) =>
        this.video.addEventListener('loadedmetadata', res, { once: true })
      );
    }
  }

  stop() {
    if (!this.stream) return;
    for (const track of this.stream.getTracks()) track.stop();
    this.stream = null;
    this.video.srcObject = null;
  }

  // Capture l'image courante (miroir, pour correspondre à l'aperçu) dans un canvas.
  grabFrame() {
    const w = this.video.videoWidth;
    const h = this.video.videoHeight;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.translate(w, 0);
    ctx.scale(-1, 1); // miroir horizontal
    ctx.drawImage(this.video, 0, 0, w, h);
    return canvas;
  }
}
