import * as THREE from 'three';

export interface ProceduralTextureSet {
  rockBumpMap: THREE.CanvasTexture;
  rockRoughnessMap: THREE.CanvasTexture;
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

  // Horizontal sedimentary/tectonic strata bands
  for (let y = 0; y < 512; y += 4) {
    const v = Math.floor(110 + 36 * Math.sin(y * 0.085) + 22 * Math.cos(y * 0.23));
    bCtx.fillStyle = `rgb(${v},${v},${v})`;
    bCtx.fillRect(0, y, 512, 4);
  }

  // Organic fracture cracks & erosion pits
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

  // Diagonal tectonic fissures
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

  // 3. Underwater caustics interference pattern (sRGB)
  const causticCanvas = document.createElement('canvas');
  causticCanvas.width = 512;
  causticCanvas.height = 512;
  const cCtx = causticCanvas.getContext('2d')!;
  cCtx.fillStyle = '#041c2c';
  cCtx.fillRect(0, 0, 512, 512);
  cCtx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 64; i++) {
    const x = pseudoRandom(i * 7 + 3) * 512;
    const y = pseudoRandom(i * 7 + 5) * 512;
    const rad = 32 + pseudoRandom(i * 7 + 8) * 62;
    const g = cCtx.createRadialGradient(x, y, rad * 0.55, x, y, rad);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.72, 'rgba(130, 232, 255, 0.22)');
    g.addColorStop(0.88, 'rgba(215, 250, 255, 0.34)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cCtx.fillStyle = g;
    cCtx.beginPath();
    cCtx.arc(x, y, rad, 0, Math.PI * 2);
    cCtx.fill();
  }
  const causticMap = new THREE.CanvasTexture(causticCanvas);
  causticMap.colorSpace = THREE.SRGBColorSpace;
  causticMap.wrapS = THREE.RepeatWrapping;
  causticMap.wrapT = THREE.RepeatWrapping;
  causticMap.anisotropy = maxAnisotropy;

  // 4. Soft organic marine snow & micro-bubble sprite (sRGB)
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
    causticMap,
    particleMap,
    dispose: () => {
      rockBumpMap.dispose();
      rockRoughnessMap.dispose();
      causticMap.dispose();
      particleMap.dispose();
    },
  };
}
