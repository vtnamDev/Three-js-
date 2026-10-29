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
    b¶»§q«^