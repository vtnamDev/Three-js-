import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  BlendedAtmosphere,
  OCEAN_CHAPTERS,
  OceanChapter,
  getBlendedAtmosphere,
} from '../lib/chapterConfig';
import {
  DEFAULT_HERO_FISH_BOUNDS,
  getCameraRigAtProgress,
  getFishPathAtProgress,
} from '../lib/fishPath';
import {
  RiggedFishRig,
  buildAnatomicalSkinnedFish,
  buildProceduralFallbackFish,
  evaluateSwimKinematics,
} from '../lib/fishSwim';
import {
  QualityProfile,
  QualityTierOption,
  detectSoftwareGl,
  resolveQualityProfile,
} from '../lib/qualityTier';
import { computeNormalizedWindowScroll, stepScrollProgress } from '../lib/scrollDirector';
import { createProceduralTextureSet } from './proceduralTextures';
import { OceanWorldRig, buildOceanWorld } from './OceanWorldBuilder';

export interface TelemetryUpdate {
  progress: number;
  depthMeters: number;
  chapter: OceanChapter;
  fpsEstimate: number | null;
}

export interface LoaderStateUpdate {
  status: 'loading' | 'ready' | 'fallback-fish' | 'context-lost';
  progressPercent: number | null;
  message: string;
}
¶»§q«^