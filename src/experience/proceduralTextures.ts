import * as THREE from 'three';

export interface ProceduralTextureSet {
  rockBumpMap: THREE.CanvasTexture;
  rockRoughnessMap: THREE.CanvasTexture;
  coralBumpMap: THREE.CanvasTexture;
  causticMap: THREE.CanvasTexture;
  particleMap: THREE.CanvasTexture;
  dispose: () => void;
}

function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function createProceduralTextureSet(maxAnisotropy: number): ProceduralTextureSet {
  // 1. Tileable stratified basalt/limestone bump map (linear space)
  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;
  bCtx.fillStyle = '#808080';
  bCtx.fillRect(0, 0, 512, 512);

  for (let y = 0; y < 512; y += 4) {
    const v = Math.floor(110 + 36 * Math.sin(y * 0.085) + 22 * Math.cos(y * 0.23));
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(0, y, 512, 4);
  }

  for (let i = 0; i < 420; i++) {
    const x = pseudoRandom(i * 3 + 1) * 512;
    const y = pseudoRandom(i * 3 + 2) * 512;
    const r = 4 + pseudoRandom(i * 3 + 3) * 26;
    const shade = i % 2 === 0 ? 52 : 196;
    const grad = bCtx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, `rgba(${shade},${shade},${shade},0.28)`);
    grad.addColorStop(1, `rgba(${shade},${shade},${shade},0)`);
    bCtx.fillStyle = grad;
    bCtx.beginPath();
    bCtx.arc(x, y, r, 0, Math.PI * 2);
    bCtx.fill();
  }

  bCtx.strokeStyle = 'rgba(28,28,28,0.42)';
  bCtx.lineWidth = 1.6;
  for (let c = 0; c < 36; c++) {
    let cx = pseudoRandom(c * 11 + 7) * 512;
    let cy = pseudoRandom(c * 11 + 9) * 512;
    bCtx.beginPath();
    bCtx.moveTo(cx, cy);
    for (let s = 0; s < 6; s++) {
      cx += (pseudoRandom(c * 31 + s) - 0.35) * 42;
      cy += (pseudoRandom(c * 37 + s) - 0.2) * 34;
      bCtx.lineTo(cx, cy);
    }
    bCtx.stroke();
  }

  const rockBumpMap = new THREE.CanvasTexture(bumpCanvas);
  rockBumpMap.wrapS = THREE.RepeatWrapping;
  rockBumpMap.wrapT = THREE.RepeatWrapping;
  rockBumpMap.repeat.set(4, 4);
  rockBumpMap.anisotropy = maxAnisotropy;

  // 2. Rock roughness variation map (linear space)
  const roughCanvas = document.createElement('canvas');
  roughCanvas.width = 256;
  roughCanvas.height = 256;
  const rCtx = roughCanvas.getContext('2d')!;
  rCtx.fillStyle = '#d4d4d4';
  rCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 220; i++) {
    const x = pseudoRandom(i * 5 + 13) * 256;
    const y = pseudoRandom(i * 5 + 17) * 256;
    const rad = 8 + pseudoRandom(i * 5 + 19) * 28;
    const val = Math.floor(155 + pseudoRandom(i * 5 + 23) * 85);
    rCtx.fillStyle = `rgba(${val},${val},${val},0.35)`;
    rCtx.beginPath();
    rCtx.arc(x, y, rad, 0, Math.PI * 2);
    rCtx.fill();
  }
  const rockRoughnessMap = new THREE.CanvasTexture(roughCanvas);
  rockRoughnessMap.wrapS = THREE.RepeatWrapping;
  rockRoughnessMap.wrapT = THREE.RepeatWrapping;
  rockRoughnessMap.repeat.set(3, 3);
  rockRoughnessMap.anisotropy = maxAnisotropy;

  // 3. Organic reef coral & carbonate pore bump map (linear space)
  const coralCanvas = document.createElement('canvas');
  coralCanvas.width = 256;
  coralCanvas.height = 256;
  const crCtx = coralCanvas.getContext('2d')!;
  crCtx.fillStyle = '#888888';
  crCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 650; i++) {
    const x = pseudoRandom(i * 13 + 3) * 256;
    const y = pseudoRandom(i * 13 + 7) * 256;
    const r = 1.5 + pseudoRandom(i * 13 + 11) * 5.5;
    crCtx.fillStyle = i % 3 === 0 ? 'rgba(35,35,35,0.45)' : 'rgba(225,225,225,0.38)';
    crCtx.beginPath();
    crCtx.arc(x, y, r, 0, Math.PI * 2);
    crCtx.fill();
  }
  // Meandering brain-coral ridges
  crCtx.strokeStyle = 'rgba(240,240,240,0.42)';
  crCtx.lineWidth = 2.4;
  for (let w = 0; w < 28; w++) {
    crCtx.beginPath();
    const baseY = (w / 28) * 256;
    for (let x = 0; x <= 256; x += 8) {
      const yy = baseY + Math.sin(x * 0.09 + w * 1.7) * 6.5;
      if (x === 0) crCtx.moveTo(x, yy);
      else crCtx.lineTo(x, yy);
    }
    crCtx.stroke();
  }
  const coralBumpMap = new THREE.CanvasTexture(coralCanvas);
  coralBumpMap.wrapS = THREE.RepeatWrapping;
  coralBumpMap.wrapT = THREE.RepeatWrapping;
  coralBumpMap.repeat.set(3, 3);
  coralBumpMap.anisotropy = maxAnisotropy;

  // 4. Cellular wave-interference underwater caustics map (sRGB)
  const causticCanvas = document.createElement('canvas');
  causticCanvas.width = 512;
  causticCanvas.height = 512;
  const cCtx = causticCanvas.getContext('2d')!;
  const imgData = cCtx.createImageData(512, 512);
  const data = imgData.data;

  // Deterministic cellular wave interference for authentic optical caustics
  const pts: [number, number][] = [];
  for (let i = 0; i < 36; i++) {
    pts.push([pseudoRandom(i * 17 + 1), pseudoRandom(i * 17 + 9)]);
  }

  for (let py = 0; py < 512; py++) {
    const rawNy = py / 512;
    for (let px = 0; px < 512; px++) {
      const rawNx = px / 512;
      const tau = Math.PI * 2;
      const nx =
        (rawNx +
          0.038 * Math.sin(rawNy * tau * 2.0 + 0.7) +
          0.019 * Math.cos((rawNx + rawNy) * tau * 3.0) +
          1.0) %
        1.0;
      const ny =
        (rawNy +
          0.038 * Math.cos(rawNx * tau * 2.0 + 1.4) +
          0.019 * Math.sin((rawNx - rawNy) * tau * 3.0) +
          1.0) %
        1.0;
      let d1 = 9.0;
      let d2 = 9.0;
      for (let k = 0; k < pts.length; k++) {
        let dx = Math.abs(nx - pts[k][0]);
        let dy = Math.abs(ny - pts[k][1]);
        if (dx > 0.5) dx = 1.0 - dx;
        if (dy > 0.5) dy = 1.0 - dy;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < d1) {
          d2 = d1;
          d1 = d;
        } else if (d < d2) {
          d2 = d;
        }
      }
      const edge = Math.max(0, 1.0 - Math.abs(d2 - d1) * 16.5);
      const ridge = Math.pow(edge, 3.1);
      const idx = (py * 512 + px) * 4;
      data[idx] = Math.min(255, Math.floor(12 + ridge * 185));
      data[idx + 1] = Math.min(255, Math.floor(38 + ridge * 215));
      data[idx + 2] = Math.min(255, Math.floor(62 + ridge * 230));
      data[idx + 3] = 255;
    }
  }
  cCtx.putImageData(imgData, 0, 0);

  const causticMap = new THREE.CanvasTexture(causticCanvas);
  causticMap.colorSpace = THREE.SRGBColorSpace;
  causticMap.wrapS = THREE.RepeatWrapping;
  causticMap.wrapT = THREE.RepeatWrapping;
  causticMap.anisotropy = maxAnisotropy;

  // 5. Soft organic marine snow & micro-bubble sprite (sRGB)
  const partCanvas = document.createElement('canvas');
  partCanvas.width = 64;
  partCanvas.height = 64;
  const pCtx = partCanvas.getContext('2d')!;
  const pGrad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 30);
  pGrad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
  pGrad.addColorStop(0.35, 'rgba(215, 246, 255, 0.72)');
  pGrad.addColorStop(0.75, 'rgba(140, 215, 245, 0.18)');
  pGrad.addColorStop(1, 'rgba(140, 215, 245, 0.0)');
  pCtx.fillStyle = pGrad;
  pCtx.fillRect(0, 0, 64, 64);

  const particleMap = new THREE.CanvasTexture(partCanvas);
  particleMap.colorSpace = THREE.SRGBColorSpace;

  return {
    rockBumpMap,
    rockRoughnessMap,
    coralBumpMap,
    causticMap,
    particleMap,
    dispose: () => {
      rockBumpMap.dispose();
      rockRoughnessMap.dispose();
      coralBumpMap.dispose();
      causticMap.dispose();
      particleMap.dispose();
    },
  };
}
