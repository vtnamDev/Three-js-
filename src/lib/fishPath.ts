import * as THREE from 'three';
import { clamp01, smoothstep01 } from './chapterConfig';

export interface FishPathState {
  progress: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  lookTarget: THREE.Vector3;
  bankRadians: number;
}

export interface CameraRigState {
  position: THREE.Vector3;
  lookAt: THREE.Vector3;
  fov: number;
}

/**
 * Canonical 3D descent waypoints from surface (Y=0) down to the Hadal Sanctuary (Y=-162.5).
 * Designed so the fish descends continuously along a graceful 3D helical-S trajectory
 * with smooth curvature and guaranteed clearance from reef, cliff, abyssal floor, and canyon walls.
 */
const DESCENT_WAYPOINTS: readonly [number, number, number][] = [
  [-0.8, 0.0, 0.4],      // p=0.00 Ch1 Surface — poised 3/4 lateral hero presentation
  [1.6, -11.0, -5.5],    // p=0.08 Ch1 -> Ch2 transition
  [3.8, -24.5, -11.8],   // p=0.18 Ch2 Blue Garden — weaving past kelp & snapper school
  [1.0, -42.0, -19.5],   // p=0.30 Ch3 Last Sunlight — descending past continental drop-off
  [-3.2, -62.0, -27.0],  // p=0.43 Ch4 Twilight — passing basalt sea-stacks & medusae
  [-1.4, -85.0, -35.0],  // p=0.56 Ch5 Midnight — vast bathypelagic void
  [2.4, -108.0, -43.0],  // p=0.69 Ch6 Abyssal Plain — gliding 6.2m above sediment floor
  [-1.6, -135.0, -50.5], // p=0.82 Ch7 Abyssal Canyon — threading between asymmetric walls
  [0.1, -158.0, -57.2],  // p=0.93 Ch8 Hadal Reveal — approaching luminous cold-seep fissure
  [0.5, -162.5, -60.8],  // p=1.00 Ch8 Epilogue hold — poised swimming in foreground
];

const DESCENT_CURVE = new THREE.CatmullRomCurve3(
  DESCENT_WAYPOINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  false,
  'centripetal',
  0.5,
);

// Pre-allocated scratch vectors for internal derivative evaluation
const _tPrev = new THREE.Vector3();
const _tNext = new THREE.Vector3();
const _swimForward = new THREE.Vector3();

/**
 * Evaluates the canonical fish 3D path deterministically at normalized progress [0, 1].
 * Computes natural pelagic body pitch (-3 deg at surface & hadal sanctuary, -15 to -18 deg during
 * active descent) rather than tilting -70 deg nose-down, so silhouette & anatomy read naturally.
 */
export function getFishPathAtProgress(
  progress: number,
  outPosition = new THREE.Vector3(),
  outTangent = new THREE.Vector3(),
  outLookTarget = new THREE.Vector3(),
): FishPathState {
  const p = clamp01(progress);
  DESCENT_CURVE.getPointAt(p, outPosition);
  DESCENT_CURVE.getTangentAt(p, outTangent).normalize();

  // Compute smooth lateral banking angle from horizontal tangent change
  const eps = 0.008;
  const p0 = Math.max(0, p - eps);
  const p1 = Math.min(1, p + eps);
  DESCENT_CURVE.getTangentAt(p0, _tPrev).normalize();
  DESCENT_CURVE.getTangentAt(p1, _tNext).normalize();
  const dYaw = Math.atan2(_tNext.x, -_tNext.z) - Math.atan2(_tPrev.x, -_tPrev.z);
  const wrappedDYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  const bankRadians = THREE.MathUtils.clamp(-wrappedDYaw * 1.45, -0.24, 0.24);

  // Natural biological pelagic glide pitch:
  // Poised nearly level (-0.05) at Surface and Hadal Sanctuary; graceful -16 deg (-0.29) glide mid-descent
  const diveRampIn = smoothstep01(p / 0.12);
  const diveRampOut = 1.0 - smoothstep01((p - 0.88) / 0.1);
  const naturalPitchY = -0.05 - 0.24 * diveRampIn * diveRampOut;

  _swimForward.set(outTangent.x, 0, outTangent.z);
  if (_swimForward.lengthSq() < 1e-5) {
    _swimForward.set(0.35, 0, -0.936);
  } else {
    _swimForward.normalize();
  }
  _swimForward.y = naturalPitchY;
  _swimForward.normalize();

  outLookTarget.copy(outPosition).add(_swimForward);

  return {
    progress: p,
    position: outPosition,
    tangent: outTangent,
    lookTarget: outLookTarget,
    bankRadians,
  };
}

interface CameraBeat {
  at: number;
  // Offset in local fish-aligned horizontal frame: right, up, back (toward viewer)
  rightOffset: number;
  upOffset: number;
  backOffset: number;
  lookAheadRight: number;
  lookAheadUp: number;
  lookAheadForward: number;
  fov: number;
}

const CAMERA_BEATS: readonly CameraBeat[] = [
  // Ch1 Surface (0.00): Full-body 3/4 front-lateral hero shot — snout, eye, gills, dorsal spines & forked tail 100% framed
  {
    at: 0.0,
    rightOffset: 3.75,
    upOffset: 0.26,
    backOffset: -0.55,
    lookAheadRight: -0.15,
    lookAheadUp: 0.06,
    lookAheadForward: 0.05,
    fov: 40,
  },
  // Ch2 Blue Garden (0.17): 3/4 lateral tracking framing full fish + swaying kelp & orbiting snapper school
  {
    at: 0.17,
    rightOffset: 4.05,
    upOffset: 0.55,
    backOffset: 1.25,
    lookAheadRight: -0.25,
    lookAheadUp: -0.06,
    lookAheadForward: 0.45,
    fov: 43,
  },
  // Ch3 Last Sunlight (0.31): Port-side angle looking across fish toward continental drop-off cliff & sea fans
  {
    at: 0.31,
    rightOffset: -3.95,
    upOffset: 0.68,
    backOffset: 1.55,
    lookAheadRight: 0.35,
    lookAheadUp: -0.14,
    lookAheadForward: 0.55,
    fov: 44,
  },
  // Ch4 Twilight (0.44): Balanced flank framing with basalt sea-stacks & bioluminescent medusae in midground
  {
    at: 0.44,
    rightOffset: -3.65,
    upOffset: 0.36,
    backOffset: 1.15,
    lookAheadRight: 0.25,
    lookAheadUp: -0.08,
    lookAheadForward: 0.45,
    fov: 43,
  },
  // Ch5 Midnight (0.57): Deliberate wide pull-back emphasizing vast bathypelagic negative space & smallness
  {
    at: 0.57,
    rightOffset: 4.65,
    upOffset: 0.82,
    backOffset: 2.15,
    lookAheadRight: -0.25,
    lookAheadUp: -0.16,
    lookAheadForward: 0.65,
    fov: 46,
  },
  // Ch6 Deep Plain (0.70): Elevated-lateral angle revealing undulating abyssal floor & hydrothermal spires below
  {
    at: 0.7,
    rightOffset: 3.95,
    upOffset: 0.52,
    backOffset: 1.75,
    lookAheadRight: -0.1,
    lookAheadUp: -0.36,
    lookAheadForward: 0.95,
    fov: 45,
  },
  // Ch7 Abyssal Canyon (0.83): Controlled tracking inside wide basalt canyon walls toward tectonic archway
  {
    at: 0.83,
    rightOffset: -3.35,
    upOffset: 0.46,
    backOffset: 1.65,
    lookAheadRight: 0.22,
    lookAheadUp: -0.14,
    lookAheadForward: 0.85,
    fov: 44,
  },
  // Ch8 Hadal Reveal & Epilogue (0.96 -> 1.00): Poised full hero fish in foreground + luminous cold-seep rift ahead
  {
    at: 0.96,
    rightOffset: 3.75,
    upOffset: 0.52,
    backOffset: 1.55,
    lookAheadRight: -0.32,
    lookAheadUp: -0.34,
    lookAheadForward: 1.65,
    fov: 44,
  },
];

const _fishPos = new THREE.Vector3();
const _fishTan = new THREE.Vector3();
const _fishLook = new THREE.Vector3();
const _horizForward = new THREE.Vector3();
const _horizRight = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);

function interpolateCameraBeat(p: number): CameraBeat {
  if (p <= CAMERA_BEATS[0].at) return CAMERA_BEATS[0];
  const last = CAMERA_BEATS[CAMERA_BEATS.length - 1];
  if (p >= last.at) return last;

  for (let i = 0; i < CAMERA_BEATS.length - 1; i++) {
    const a = CAMERA_BEATS[i];
    const b = CAMERA_BEATS[i + 1];
    if (p >= a.at && p <= b.at) {
      const t = smoothstep01((p - a.at) / Math.max(1e-6, b.at - a.at));
      return {
        at: p,
        rightOffset: THREE.MathUtils.lerp(a.rightOffset, b.rightOffset, t),
        upOffset: THREE.MathUtils.lerp(a.upOffset, b.upOffset, t),
        backOffset: THREE.MathUtils.lerp(a.backOffset, b.backOffset, t),
        lookAheadRight: THREE.MathUtils.lerp(a.lookAheadRight, b.lookAheadRight, t),
        lookAheadUp: THREE.MathUtils.lerp(a.lookAheadUp, b.lookAheadUp, t),
        lookAheadForward: THREE.MathUtils.lerp(a.lookAheadForward, b.lookAheadForward, t),
        fov: THREE.MathUtils.lerp(a.fov, b.fov, t),
      };
    }
  }
  return last;
}

/**
 * Evaluates deterministic camera framing for any progress [0, 1] and viewport aspect ratio.
 * Explicitly adapts camera distance and vertical offset on portrait mobile viewports (aspect < 1)
 * so the fish snout and caudal tail are never clipped at the edges of narrow screens.
 */
export function getCameraRigAtProgress(
  progress: number,
  aspect: number,
  outCamPos = new THREE.Vector3(),
  outLookAt = new THREE.Vector3(),
): CameraRigState {
  const p = clamp01(progress);
  const safeAspect = Number.isFinite(aspect) && aspect > 0.1 ? aspect : 16 / 9;

  getFishPathAtProgress(p, _fishPos, _fishTan, _fishLook);
  const beat = interpolateCameraBeat(p);

  // Build stable horizontal basis around fish travel direction so camera horizon stays level
  _horizForward.set(_fishTan.x, 0, _fishTan.z);
  if (_horizForward.lengthSq() < 1e-5) {
    _horizForward.set(0, 0, -1);
  } else {
    _horizForward.normalize();
  }
  _horizRight.crossVectors(_horizForward, _worldUp).normalize();

  // Portrait mobile compensation: pull camera back proportionally so horizontal FOV fits whole fish + environment
  const isPortrait = safeAspect < 1.0;
  const portraitDistanceScale = isPortrait
    ? THREE.MathUtils.clamp(1.0 / Math.pow(safeAspect, 0.88), 1.35, 2.08)
    : safeAspect < 1.35
      ? 1.15
      : 1.0;

  const portraitUpBias = isPortrait ? 0.16 : 0.0;
  const fov = isPortrait ? Math.min(52, beat.fov + 7) : beat.fov;

  outCamPos
    .copy(_fishPos)
    .addScaledVector(_horizRight, beat.rightOffset * portraitDistanceScale)
    .addScaledVector(_worldUp, beat.upOffset * portraitDistanceScale + portraitUpBias)
    .addScaledVector(_horizForward, -beat.backOffset * portraitDistanceScale);

  outLookAt
    .copy(_fishPos)
    .addScaledVector(_horizRight, beat.lookAheadRight)
    .addScaledVector(_worldUp, beat.lookAheadUp)
    .addScaledVector(_horizForward, beat.lookAheadForward);

  return {
    position: outCamPos,
    lookAt: outLookAt,
    fov,
  };
}

export function getDescentCurve(): THREE.CatmullRomCurve3 {
  return DESCENT_CURVE;
}
