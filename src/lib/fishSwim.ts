import * as THREE from 'three';
import { DEFAULT_HERO_FISH_BOUNDS, HeroFishBounds } from './fishPath';

export interface SwimKinematicsSample {
  spineYaw: number[];         // 8 longitudinal spine joints (HeadThorax -> CaudalFinMembrane)
  authoredSpineYaw: number[]; // 4 progressive axial joint angles for legacy pre-skinned rigs
  headCounterYaw: number;
  spineLateralOffset: number;
  pectoralLeftFlap: number;
  pectoralRightFlap: number;
  pectoralFeatherLeft: number;
  pectoralFeatherRight: number;
  pelvicFlap: number;
  dorsalWave: number;
  gillPulse: number;
  bodyRoll: number;
  tailPhaseSin: number;
}

export const SPINE_BONE_COUNT = 8;

/**
 * Biomechanical carangiform/subcarangiform pelagic swim solver.
 * Separates `elapsedTime` (continuous biological propulsion, cranial stabilization & pectoral rowing)
 * from `scrollVelocity` (bounded burst cadence) and `curvature` (turn banking).
 * Guarantees organic multi-joint body wave & fin articulation while scroll is stationary (`velocity = 0`).
 */
export function evaluateSwimKinematics(
  elapsedTime: number,
  scrollVelocity = 0,
  reducedMotion = false,
  curvature = 0,
): SwimKinematicsSample {
  const speedFactor = Math.min(1.65, Math.abs(scrollVelocity) * 2.2);
  const ampScale = reducedMotion ? 0.42 : 1.22 + speedFactor * 0.36;
  const freq = (reducedMotion ? 1.9 : 3.7) + speedFactor * 1.45;
  const phase = elapsedTime * freq;
  const waveNumber = 4.2;

  // Incremental local joint rotations across 8 spine bone¶»§q«^