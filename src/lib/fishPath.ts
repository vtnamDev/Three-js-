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
 * Sweeps laterally (`X ∈ [-4.6, +4.5]`) and forward (`Z ∈ [0.6, -94.0]`) while descending
 * (`Y ∈ [0.0, -162.5]`), creating true 3D spatial travel across all 8 chapters.
 */
const DESCENT_WAYPOINTS: readonly [number, number, number][] = [
  [-1.8, 0.0, 0.6],       // p=0.00 Ch01 Epipelagic Surface — sunlit reef terrace
  [1.9, -10.5, -8.5],     // p=0.09 Ch01 -> Ch02 diagonal glide
  [4.4, -23.5, -18.5],    // p=0.18 Ch02 The Blue Garden — kelp & coral slope
  [0.8, -41.5, -30.0],    // p=0.30 Ch03 Last Sunlight — continental shelf drop-off
  [-4.4, -61.5, -41.5],   // p=0.43 Ch04 Mesopelagic Twilight — basalt stacks & jellies
  [-1.1, -84.5, -53.5],   // p=0.56 Ch05 Bathypelagic Midnight — wide dark water
  [3.7, -108.0, -65.5],   // p=0.69 Ch06 Abyssal Plain — low benthic sediment glide
  [-2.7, -135.0, -77.5],  // p=0.82 Ch07 Abyssal Canyon — S-turn through tectonic gate
  [0.2, -157.5, -88.0],   // p=0.93 Ch08 Hadal approach — crane/orbit toward cold seep
  [0.8, -162.2, -93.5],   // p=1.00 Ch08 Hadal Sanctuary — calm poise above fissure
];

const DESCENT_CURVE = new THREE.CatmullRomCurve3(
  DESCENT_WAYPOINTS.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
  false,
  'centripetal',
  0.5,
);

const _tPrev = new THREE.Vector3();
const _tNext = new THREE.Vector3();
const _swimForward = new THREE.Vector3();

export function getFishPathAtProgress(
  progress: number,
  outPosition = new THREE.Vector3(),
  outTangent = new THREE.Vector3(),
  outLookTarget = new THREE.Vector3(),
): FishPathState {
  const p = clamp01(progress);
  DESCENT_CURVE.getPointAt(p, outPosition);
  DESCENT_CURVE.getTangentAt(p, outTangent).normalize();

  const eps = 0.008;
  const p0 = Math.max(0, p - eps);
  const p1 = Math.min(1, p + eps);
  DESCENT_CURVE.getTangentAt(p0, _tPrev).normalize();
  DESCENT_CURVE.getTangentAt(p1, _tNext).normalize();

  const dYaw = Math.atan2(_tNext.x, -_tNext.z) - Math.atan2(_tPrev.x, -_tPrev.z);
  const wrappedDYaw = Math.atan2(Math.sin(dYaw), Math.cos(dYaw));
  const curvature = THREE.MathUtils.clamp(wrappedDYaw / (2 * eps), -10, 10);
  const bankRadians = THREE.MathUtils.clamp(-wrappedDYaw * 1.45, -0.24, 0.24);

  // Controlled natural pelagic dive pitch (-4.2° at surface/Hadal hold, up to -16.8° on oblique drops)
  const diveRampIn = smoothstep01(p / 0.11);
  const diveRampOut = 1.0 - smoothstep01((p - 0.89) / 0.09);
  const canyonSteepen = Math.exp(-Math.pow((p - 0.30) / 0.08, 2)) * 0.055 +
    Math.exp(-Math.pow((p - 0.81) / 0.07, 2)) * 0.05;
  const pitchRadians = -(0.074 + 0.165 * diveRampIn * diveRampOut + canyonSteepen);

  _swimForward.set(outTangent.x, 0, outTangent.z);
  if (_swimForward.lengthSq() < 1e-5) {
    _swimForward.set(0.32, 0, -0.947);
  } else {
    _swimForward.normalize();
  }

  const horizScale = Math.cos(pitchRadians);
  _swimForward.x *= horizScale;
  _swimForward.z *= horizScale;
  _swimForward.y = Math.sin(pitchRadians);
  _swimForward.normalize();

  outLookTarget.copy(outPosition).add(_swimForward);

  return {
    progress: p,
    position: outPosition,
    tangent: outTangent,
    lookTarget: outLookTarget,
    pitchRadians,
    bankRadians,
    curvature,
  };
}

/**
 * Spherical/Orbital Camera Beat Schema (`E13` Orbit, `E14` Lateral Dolly, `E15` Crane, `E16` Bank).
 * `orbitAzimuthDeg`: Angle around fish horizontal forward (+0° = dead ahead of snout, +90° = starboard broadside, +180° = dead behind tail).
 * Staying within `[+52°, +122°]` guarantees `sin(azimuth) >= 0.78`, so full head-to-tail anatomy is ALWAYS legible
 * while orbiting 70° relative to the fish (and >110° in world space with spline S-turns!).
 */
interface CameraBeat {
  at: number;
  orbitAzimuthDeg: number;     // E13: Orbital angle around fish heading (52°..122°)
  elevationDeg: number;        // E15: Crane vertical angle (-6° low hero .. +19° high vista)
  lateralTrackOffset: number;  // E14: Lateral dolly shift along sight-right (meters)
  craneTargetOffsetY: number;  // E15: Vertical look-target offset for cliff/seafloor/fissure reveals
  lookAheadForward: number;    // Lead ahead of fish along swim heading (meters)
  rollMultiplier: number;      // E16: Curvature-driven camera bank factor
  fov: number;
  widthOccupancyDesktop: number;
  widthOccupancyPortrait: number;
}

const CAMERA_BEATS: readonly CameraBeat[] = [
  {
    // Ch01 Surface (0.00): Heroic 3/4 front-side angle (+64°), gentle low-angle look up toward sunlit water ceiling
    at: 0.0,
    orbitAzimuthDeg: 64,
    elevationDeg: 4.5,
    lateralTrackOffset: -0.18,
    craneTargetOffsetY: 0.06,
    lookAheadForward: 0.24,
    rollMultiplier: 0.14,
    fov: 40,
    widthOccupancyDesktop: 0.27,
    widthOccupancyPortrait: 0.48,
  },
  {
    // Ch02 Blue Garden (0.17): Lateral tracking dolly (+88° broadside) revealing kelp forest & schooling tangs
    at: 0.17,
    orbitAzimuthDeg: 88,
    elevationDeg: 8.5,
    lateralTrackOffset: 0.28,
    craneTargetOffsetY: -0.05,
    lookAheadForward: 0.34,
    rollMultiplier: 0.22,
    fov: 42,
    widthOccupancyDesktop: 0.25,
    widthOccupancyPortrait: 0.45,
  },
  {
    // Ch03 Last Sunlight (0.30): Pull-back crane + rear-3/4 vista (+114°) revealing asymmetric continental shelf & abyssal drop-off
    at: 0.30,
    orbitAzimuthDeg: 114,
    elevationDeg: 14.5,
    lateralTrackOffset: -0.32,
    craneTargetOffsetY: -0.18,
    lookAheadForward: 0.46,
    rollMultiplier: 0.25,
    fov: 44,
    widthOccupancyDesktop: 0.22,
    widthOccupancyPortrait: 0.42,
  },
  {
    // Ch04 Twilight (0.43): 32° forward orbit (+82° -> +56°) banking past basalt stacks & pulsing Mesopelagic jellies
    at: 0.43,
    orbitAzimuthDeg: 58,
    elevationDeg: -3.5,
    lateralTrackOffset: 0.22,
    craneTargetOffsetY: 0.04,
    lookAheadForward: 0.28,
    rollMultiplier: 0.28,
    fov: 42,
    widthOccupancyDesktop: 0.25,
    widthOccupancyPortrait: 0.45,
  },
  {
    // Ch05 Midnight (0.56): Wide scale lateral tracking (+92°), lowered horizon in vast Bathypelagic darkness
    at: 0.56,
    orbitAzimuthDeg: 92,
    elevationDeg: 6.0,
    lateralTrackOffset: -0.24,
    craneTargetOffsetY: -0.08,
    lookAheadForward: 0.36,
    rollMultiplier: 0.18,
    fov: 45,
    widthOccupancyDesktop: 0.20,
    widthOccupancyPortrait: 0.39,
  },
  {
    // Ch06 Abyssal Plain (0.69): Low-altitude crane drop (+78°, +15° elevation) exposing benthic sediment ridges & silt plumes below
    at: 0.69,
    orbitAzimuthDeg: 78,
    elevationDeg: 15.0,
    lateralTrackOffset: 0.26,
    craneTargetOffsetY: -0.24,
    lookAheadForward: 0.42,
    rollMultiplier: 0.2,
    fov: 43,
    widthOccupancyDesktop: 0.24,
    widthOccupancyPortrait: 0.44,
  },
  {
    // Ch07 Abyssal Canyon (0.82): Dynamic S-turn rear-quarter pursuit (+118°) framing asymmetric canyon walls & basalt archway ahead
    at: 0.82,
    orbitAzimuthDeg: 118,
    elevationDeg: 10.5,
    lateralTrackOffset: -0.28,
    craneTargetOffsetY: -0.12,
    lookAheadForward: 0.52,
    rollMultiplier: 0.32,
    fov: 43,
    widthOccupancyDesktop: 0.24,
    widthOccupancyPortrait: 0.44,
  },
  {
    // Ch08 Hadal Sanctuary (0.96): Ceremonial orbit + crane reveal (+72°, +12.5°) settling over luminous cold-seep fissure
    at: 0.96,
    orbitAzimuthDeg: 72,
    elevationDeg: 12.5,
    lateralTrackOffset: 0.14,
    craneTargetOffsetY: -0.22,
    lookAheadForward: 0.38,
    rollMultiplier: 0.12,
    fov: 42,
    widthOccupancyDesktop: 0.25,
    widthOccupancyPortrait: 0.46,
  },
];

const _fishPos = new THREE.Vector3();
const _fishTan = new THREE.Vector3();
const _fishLook = new THREE.Vector3();
const _horizForward = new THREE.Vector3();
const _horizRight = new THREE.Vector3();
const _offsetDir = new THREE.Vector3();
const _worldUp = new THREE.Vector3(0, 1, 0);
const _viewForward = new THREE.Vector3();
const _rolledUp = new THREE.Vector3();
const _lookMatrix = new THREE.Matrix4();
const _rollQuat = new THREE.Quaternion();

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
        orbitAzimuthDeg: THREE.MathUtils.lerp(a.orbitAzimuthDeg, b.orbitAzimuthDeg, t),
        elevationDeg: THREE.MathUtils.lerp(a.elevationDeg, b.elevationDeg, t),
        lateralTrackOffset: THREE.MathUtils.lerp(a.lateralTrackOffset, b.lateralTrackOffset, t),
        craneTargetOffsetY: THREE.MathUtils.lerp(a.craneTargetOffsetY, b.craneTargetOffsetY, t),
        lookAheadForward: THREE.MathUtils.lerp(a.lookAheadForward, b.lookAheadForward, t),
        rollMultiplier: THREE.MathUtils.lerp(a.rollMultiplier, b.rollMultiplier, t),
        fov: THREE.MathUtils.lerp(a.fov, b.fov, t),
        widthOccupancyDesktop: THREE.MathUtils.lerp(
          a.widthOccupancyDesktop,
          b.widthOccupancyDesktop,
          t,
        ),
        widthOccupancyPortrait: THREE.MathUtils.lerp(
          a.widthOccupancyPortrait,
          b.widthOccupancyPortrait,
          t,
        ),
      };
    }
  }
  return last;
}

export function getCameraRigAtProgress(
  progress: number,
  aspect: number,
  outCamPos = new THREE.Vector3(),
  outLookAt = new THREE.Vector3(),
  fishBounds: HeroFishBounds = DEFAULT_HERO_FISH_BOUNDS,
  outQuaternion = new THREE.Quaternion(),
): CameraRigState {
  const p = clamp01(progress);
  const safeAspect = Number.isFinite(aspect) && aspect > 0.1 ? aspect : 16 / 9;

  const fishState = getFishPathAtProgress(p, _fishPos, _fishTan, _fishLook);
  const beat = interpolateCameraBeat(p);

  _horizForward.set(_fishTan.x, 0, _fishTan.z);
  if (_horizForward.lengthSq() < 1e-5) {
    _horizForward.set(0, 0, -1);
  } else {
    _horizForward.normalize();
  }
  _horizRight.crossVectors(_horizForward, _worldUp).normalize();

  // Authored mobile portrait adaptation (360x640, 390x844, 412x915 vs desktop 1440x900)
  const isPortrait = safeAspect < 1.0;
  const portraitBlend = 1.0 - smoothstep01((safeAspect - 0.52) / (1.35 - 0.52));
  const fov = THREE.MathUtils.lerp(beat.fov, Math.min(48, beat.fov + 5.0), portraitBlend);

  // On narrow portrait viewports, bias azimuth slightly closer to 86° broadside so head+tail fit comfortably without clipping
  const effectiveAzimuthDeg = THREE.MathUtils.lerp(
    beat.orbitAzimuthDeg,
    THREE.MathUtils.lerp(beat.orbitAzimuthDeg, 86, 0.35),
    portraitBlend,
  );

  const targetWidthOccupancy = THREE.MathUtils.lerp(
    beat.widthOccupancyDesktop,
    beat.widthOccupancyPortrait,
    portraitBlend,
  );

  const halfFovRad = THREE.MathUtils.degToRad(fov * 0.5);
  const halfTanV = Math.max(0.15, Math.tan(halfFovRad));
  const halfTanH = Math.max(0.08, halfTanV * safeAspect);

  const effectiveSpan = fishBounds.length * 1.06;
  const distForWidth = effectiveSpan / (2.0 * targetWidthOccupancy * halfTanH);
  const distForHeight = (fishBounds.height * 1.15) / (2.0 * 0.28 * halfTanV);
  const distance = Math.max(3.75, distForWidth, distForHeight);

  // Spherical orbital direction around fish horizontal heading
  const azRad = THREE.MathUtils.degToRad(effectiveAzimuthDeg);
  const elRad = THREE.MathUtils.degToRad(beat.elevationDeg);
  const cosEl = Math.cos(elRad);

  _offsetDir
    .set(0, 0, 0)
    .addScaledVector(_horizForward, Math.cos(azRad) * cosEl)
    .addScaledVector(_horizRight, Math.sin(azRad) * cosEl)
    .addScaledVector(_worldUp, Math.sin(elRad))
    .normalize();

  const lookScale = isPortrait ? 0.42 : 1.0;
  // Slight upward look-bias on portrait places the fish cleanly in the middle negative space between top title & bottom dock
  const portraitVerticalStageBias = isPortrait ? 0.05 : 0.02;

  outCamPos
    .copy(_fishPos)
    .addScaledVector(_offsetDir, distance)
    .addScaledVector(_horizRight, beat.lateralTrackOffset * lookScale * 0.45);

  outLookAt
    .copy(_fishPos)
    .addScaledVector(_horizRight, beat.lateralTrackOffset * lookScale)
    .addScaledVector(_worldUp, beat.craneTargetOffsetY * lookScale + portraitVerticalStageBias)
    .addScaledVector(_horizForward, beat.lookAheadForward * lookScale);

  // Controlled curvature-driven camera bank/roll (E16), clamped to comfortable ±3.8°
  const rollRadians = THREE.MathUtils.clamp(
    fishState.bankRadians * beat.rollMultiplier,
    -0.066,
    0.066,
  );

  _viewForward.copy(outLookAt).sub(outCamPos).normalize();
  _rollQuat.setFromAxisAngle(_viewForward, rollRadians);
  _rolledUp.copy(_worldUp).applyQuaternion(_rollQuat).normalize();

  _lookMatrix.lookAt(outCamPos, outLookAt, _rolledUp);
  outQuaternion.setFromRotationMatrix(_lookMatrix);

  return {
    position: outCamPos,
    lookAt: outLookAt,
    quaternion: outQuaternion,
    rollRadians,
    orbitAzimuthDeg: effectiveAzimuthDeg,
    elevationDeg: beat.elevationDeg,
    fov,
  };
}

export function getSightlineBasisAtProgress(
  progress: number,
  aspect = 16 / 9,
): SightlineBasis {
  const fishPos = new THREE.Vector3();
  const fishTan = new THREE.Vector3();
  const fishLook = new THREE.Vector3();
  const camPos = new THREE.Vector3();
  const lookAt = new THREE.Vector3();

  getFishPathAtProgress(progress, fishPos, fishTan, fishLook);
  getCameraRigAtProgress(progress, aspect, camPos, lookAt);

  const sightDir = lookAt.clone().sub(camPos);
  sightDir.y *= 0.32;
  if (sightDir.lengthSq() < 1e-5) {
    sightDir.set(-1, 0, -0.4).normalize();
  } else {
    sightDir.normalize();
  }

  const sightRight = new THREE.Vector3().crossVectors(sightDir, _worldUp).normalize();
  return {
    fishPos,
    camPos,
    sightDir,
    sightRight,
  };
}

export function getDescentCurve(): THREE.CatmullRomCurve3 {
  return DESCENT_CURVE;
}
