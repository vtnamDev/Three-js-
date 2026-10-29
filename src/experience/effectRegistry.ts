import * as THREE from 'three';
import {
  BlendedAtmosphere,
  EFFECT_CATALOGUE,
  EffectId,
  getEffectStrengthAtProgress,
} from '../lib/chapterConfig';
import { getDescentCurve, getSightlineBasisAtProgress } from '../lib/fishPath';
import { QualityProfile } from '../lib/qualityTier';
import { ProceduralTextureSet } from './proceduralTextures';

export interface EffectRuntimeContext {
  elapsedTime: number;
  dt: number;
  progress: number;
  atmosphere: BlendedAtmosphere;
  quality: QualityProfile;
  reducedMotion: boolean;
  fishWorldPos: THREE.Vector3;
  fishForwardDir: THREE.Vector3;
  tailPhaseSin: number;
  scrollVelocity: number;
}

export interface ManagedOceanEffect {
  id: EffectId;
  name: string;
  enabled: boolean;
  update: (ctx: EffectRuntimeContext) => void;
  setQuality: (profile: QualityProfile) => void;
  dispose: () => void;
}

export interface OceanEffectRegistryRig {
  root: THREE.Group;
  effects: ReadonlyMap<EffectId, ManagedOceanEffect>;
  getActiveEffectIds: (progress: number) => EffectId[];
  update: (ctx: EffectRuntimeContext) => void;
  setQuality: (profile: QualityProfile) => void;
  dispose: () => void;
}

function detHash(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function createOceanEffectRegistry(
  initialProfile: QualityProfile,
  textures: ProceduralTextureSet,
): OceanEffectRegistryRig {
  const root = new THREE.Group();
  root.name = 'PelagicEffectRegistryR¶»§q«^