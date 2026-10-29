import * as THREE from 'three';
import {
  BlendedAtmosphere,
  getChapterVisibilityWeight,
  getEffectStrengthAtProgress,
} from '../lib/chapterConfig';
import { getSightlineBasisAtProgress, SightlineBasis } from '../lib/fishPath';
import { QualityProfile } from '../lib/qualityTier';
import { createOceanEffectRegistry, OceanEffectRegistryRig } from './effectRegistry';
import { ProceduralTextureSet } from './proceduralTextures';

export interface OceanWorldRig {
  root: THREE.Group;
  effectRegistry: OceanEffectRegistryRig;
  attachReefSchoolModel: (loadedTangScene: THREE.Object3D) => void;
  attachDeepSchoolModel: (loadedSnapperScene: THREE.Object3D) => void;
  setQualityProfile: (profile: QualityProfile) => void;
  update: (
    elapsedTime: number,
    dt: number,
    progress: number,
    atmosphere: BlendedAtmosphere,
    reducedMotion: boolean,
    fishWorldPos: THREE.Vector3,
    fishForwardDir: THREE.Vector3,
    tailPhaseSin: number,
    scrollVelocity: number,
  ) => void;
  dispose: () => void;
}

interface SchoolAgent {
  anchor: THREE.Vector3;
  orbitRadiusX: number;
  orbitRadiusZ: number;
  speed: number;
  phase: number;
  scale: number;
}

interface JellyAgent {
  group: THREE.Group;
  bellMesh: THREE.Mesh;
  tentacles: THREE.Mesh[];
  basePos: THREE.Vector3;
  phase: number;
  pulseSpeed: number;
}

interface BioOrganismNode {
  mesh: THREE.Mesh;
  mat: THREE.MeshStandardMaterial;
  phase: number;
  speed: number;
  baseColor: THREE.Color;
}

function detHas¶»§q«^