
import * as THREE from 'three';
import { getSightlineBasisAtProgress, SightlineBasis } from '../lib/fishPath';
import { QualityProfile } from '../lib/qualityTier';

export interface AbyssalWorldRig {
  root: THREE.Group;
  setQualityProfile: (profile: QualityProfile) => void;
  update: (elapsed: number, progress: number) => void;
  dispose: () => void;
}

const CHAPTERS = [
  { p: 0.035, color: 0x42d9ec, kind: 0 },
  { p: 0.17, color: 0x62c9e9, kind: 1 },
  { p: 0.29, color: 0x407cff, kind: 2 },
  { p: 0.43, color: 0x987aff, kind: 3 },
  { p: 0.56, color: 0xff7847, kind: 4 },
  { p: 0.69, color: 0x40d4dc, kind: 5 },
  { p: 0.82, color: 0x9278ff, kind: 6 },
  { p: 0.965, color: 0x8ce9ff, kind: 7 },
] as const;

const tmp = new THREE.Object3D();
function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}
function point(b: SightlineBasis, f: number, s: number, y: number): THREE.Vector3 {
  return b.fishPos.clone().addScaledVector(b.sightDir, f)
    .addScaledVector(b.sightRight, s).add(new THREE.Vector3(0, y, 0));
}
function addField(
  group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material,
  basis: SightlineBasis, count: number, seed: number, spread: number, tall: boolean,
): THREE.InstancedMesh {
  const inst = new THREE.InstancedMesh(geometry, material, count);
  inst.userData.baseCount = count;
  for (let i = 0; i < count; i++) {
    const side = (hash(seed + i * 2.3) - 0.5) * spread;
    cons¶»§q«^