// AXIA face texture, painted on a 2048x1024 equirect canvas at load.
// Front of the head sphere is u=0.25 (x=512) - verified against three.js SphereGeometry UVs.
import * as THREE from 'three';

export function makeFaceTexture() {
  const W = 2048, H = 1024;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const x = c.getContext('2d');

  // skin base
  x.fillStyle = '#ffe0d1';
  x.fillRect(0, 0, W, H);
  // faint forehead-to-cheek vertical warmth
  const vg = x.createLinearGradient(0, 0, 0, H);
  vg.addColorStop(0, 'rgba(255,255,255,0.10)');
  vg.addColorStop(0.55, 'rgba(255,255,255,0)');
  vg.addColorStop(1, 'rgba(255,205,185,0.18)');
  x.fillStyle = vg;
  x.fillRect(0, 0, W, H);

  const CX = 512, EYE_Y = 560, EYE_DX = 116;

  // blush
  for (const s of [-1, 1]) {
    const g = x.createRadialGradient(CX + s * 195, EYE_Y + 88, 4, CX + s * 195, EYE_Y + 88, 72);
    g.addColorStop(0, 'rgba(255,140,150,0.34)');
    g.addColorStop(1, 'rgba(255,140,150,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(CX + s * 195, EYE_Y + 88, 72, 0, 7); x.fill();
  }

  drawEye(x, CX - EYE_DX, EYE_Y, false);
  drawEye(x, CX + EYE_DX, EYE_Y, true);

  // brows
  x.strokeStyle = '#8698a8';
  x.lineCap = 'round';
  for (const s of [-1, 1]) {
    x.lineWidth = 9;
    x.beginPath();
    x.moveTo(CX + s * 52, EYE_Y - 132);
    x.quadraticCurveTo(CX + s * 118, EYE_Y - 158, CX + s * 178, EYE_Y - 126);
    x.stroke();
  }

  // nose
  x.strokeStyle = 'rgba(226,150,125,0.9)';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(CX - 6, EYE_Y + 96);
  x.quadraticCurveTo(CX + 2, EYE_Y + 102, CX + 1, EYE_Y + 110);
  x.stroke();

  // mouth: small closed-lip smile
  x.strokeStyle = '#c96a5e';
  x.lineWidth = 7;
  x.beginPath();
  x.moveTo(CX - 30, EYE_Y + 165);
  x.quadraticCurveTo(CX, EYE_Y + 185, CX + 30, EYE_Y + 165);
  x.stroke();
  x.fillStyle = 'rgba(233,120,110,0.55)';
  x.beginPath();
  x.moveTo(CX - 30, EYE_Y + 165);
  x.quadraticCurveTo(CX, EYE_Y + 205, CX + 30, EYE_Y + 165);
  x.quadraticCurveTo(CX, EYE_Y + 182, CX - 30, EYE_Y + 165);
  x.fill();

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function drawEye(x, cx, cy, mirror) {
  const m = mirror ? -1 : 1;
  x.save();
  x.translate(cx, cy);
  x.scale(m, 1);

  // eye shape clip: tall anime eye
  const shape = () => {
    x.beginPath();
    x.moveTo(-58, -10);
    x.bezierCurveTo(-52, -78, 30, -88, 55, -28);
    x.bezierCurveTo(62, 18, 30, 66, -8, 62);
    x.bezierCurveTo(-46, 58, -62, 28, -58, -10);
    x.closePath();
  };

  // sclera
  shape();
  x.fillStyle = '#ffffff';
  x.fill();

  // iris clipped to eye shape
  shape();
  x.save();
  x.clip();
  const ig = x.createLinearGradient(0, -70, 0, 62);
  ig.addColorStop(0, '#073a3f');
  ig.addColorStop(0.45, '#0d8f86');
  ig.addColorStop(0.8, '#2ee6d6');
  ig.addColorStop(1, '#9ffcf2');
  x.fillStyle = ig;
  x.beginPath(); x.ellipse(2, 2, 46, 56, 0, 0, 7); x.fill();
  // pupil
  x.fillStyle = '#06222b';
  x.beginPath(); x.ellipse(2, 4, 17, 30, 0, 0, 7); x.fill();
  // bottom soft refraction
  x.fillStyle = 'rgba(160,255,245,0.5)';
  x.beginPath(); x.ellipse(2, 40, 26, 12, 0, 0, 7); x.fill();
  // highlights
  x.fillStyle = '#ffffff';
  x.beginPath(); x.arc(-14, -24, 13, 0, 7); x.fill();
  x.beginPath(); x.arc(18, 22, 6, 0, 7); x.fill();
  x.restore();

  // upper lash line
  x.strokeStyle = '#101418';
  x.lineWidth = 13;
  x.lineCap = 'round';
  x.beginPath();
  x.moveTo(-58, -12);
  x.bezierCurveTo(-52, -78, 30, -88, 55, -28);
  x.stroke();
  // lash wing
  x.lineWidth = 9;
  x.beginPath();
  x.moveTo(-52, -26);
  x.quadraticCurveTo(-74, -34, -80, -46);
  x.stroke();
  // lower lash hint
  x.strokeStyle = 'rgba(16,20,24,0.75)';
  x.lineWidth = 5;
  x.beginPath();
  x.moveTo(40, 44);
  x.quadraticCurveTo(52, 34, 56, 22);
  x.stroke();
  // eye crease
  x.strokeStyle = 'rgba(190,120,105,0.55)';
  x.lineWidth = 4;
  x.beginPath();
  x.moveTo(-40, -84);
  x.quadraticCurveTo(8, -104, 48, -66);
  x.stroke();

  x.restore();
}
