import * as THREE from 'three';
import { clamp01, smoothstep01 } from './chapterConfig';

export interface HeroFishBounds {
  length: number;
  height: number;
  width: number;
}

export const DEFAULT_HERO_FISH_BOUNDS: HeroFishBounds = {
  length: 1.56,
  height: 0.68,
  width: 0.38,
};

export interface FishPathState {
  progress: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  lookTarget: THREE.Vector3;
  pitchRadians: number;
  bankRadians: number;
  curvature: number;
}

export interface CameraRigState {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  quaternion: THREE.Quaternion;
  rollRadians: number;
  orbitAzimuthDeg: number;
  elevationDeg: number;
  fov: number;
}

export interface SightlineBasis {
  fishPos: THREE.Vector3;
  camPos: THREE.Vector3;
  sightDir: THREE.Vector3;
  sightRight: THREE.Vector3;
}

/**
 * 3D Diagonal + Lateral S-Curve Descent Waypoints (`x`, `y`, `z` in world meters).
 * Sweeps laterally (`X âˆˆ [-4.6, +4.5]`) and forward (`Z âˆˆ [0.6, -94.0]`) while descending
 * (`Y âˆˆ [0.0, -162.5]`), creating true 3D spatial travel across all 8 chapters.
 */
const DESCENT_WAYPOINTS: readonly [number, number, number][] = [
  [-1.8, 0.0, 0.6],       // p=0.00 Ch01 Epipelagic Surface â€” sunlit reef terrace
  [1.9, -10.5, -8.5],     // p=0.09 Ch01 -> Ch02 diagonal glide
  [4.4, -23.5, -18.5],    // p=0.18 Ch02 The Blue Garden â€” kelp & coral slope
  [0.8, -41.5, -30.0],    // p=0.30 Ch03 Last Sunlight â€” continental shelf drop-off
  ¶»§q«^