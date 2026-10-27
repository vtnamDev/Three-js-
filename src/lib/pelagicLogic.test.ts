import test from 'node:test';
import assert from 'node:assert/strict';
import {
  OCEAN_CHAPTERS,
  clamp01,
  getBlendedAtmosphere,
  getChapterAtProgress,
  getChapterVisibilityWeight,
  getDepthMetersAtProgress,
} from './chapterConfig';
import { getCameraRigAtProgress, getFishPathAtProgress } from './fishPath';
import { evaluateSwimKinematics, SPINE_BONE_COUNT } from './fishSwim';
import { computeNormalizedWindowScroll, stepScrollProgress } from './scrollDirector';
import { resolveQualityProfile } from './qualityTier';

test('OCEAN_CHAPTERS covers [0, 1] continuously with 8 distinct chapters', () => {
  assert.equal(OCEAN_CHAPTERS.length, 8);
  assert.equal(OCEAN_CHAPTERS[0].startProgress, 0);
  assert.equal(OCEAN_CHAPTERS[OCEAN_CHAPTERS.length - 1].endProgress, 1);

  for (let i = 0; i < OCEAN_CHAPTERS.length - 1; i++) {
    assert.equal(
      OCEAN_CHAPTERS[i].endProgress,
      OCEAN_CHAPTERS[i + 1].startProgress,
      `Chapter ${i} endProgress must match Chapter ${i + 1} startProgress`,
    );
  }

  assert.equal(getChapterAtProgress(0).id, 'surface');
  assert.equal(getChapterAtProgress(-0.5).id, 'surface');
  assert.equal(getChapterAtProgress(1).id, 'hadal-reveal');
  assert.equal(getChapterAtProgress(1.5).id, 'hadal-reveal');
});

test('depth mapping is monotonic, deterministic, and reversible', () => {
  assert.equal(getDepthMetersAtProgress(0), 0);
  assert.equal(getDepthMetersAtProgress(1), 10920);

  let prevDepth = -1;
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    const d = getDepthMetersAtProgress(p);
    assert.ok(Number.isFinite(d) && d >= prevDepth, `Depth must not decrease at p=${p}`);
    prevDepth = d;
  }

  // Reversal check: visiting p=0.42 before and after p=0.91 yields identical depth & chapter
  const before = getBlendedAtmosphere(0.42);
  const deep = getBlendedAtmosphere(0.91);
  assert.notEqual(before.chapter.id, deep.chapter.id);
  const after = getBlendedAtmosphere(0.42);
  assert.equal(before.depthMeters, after.depthMeters);
  assert.equal(before.chapter.id, after.chapter.id);
  assert.deepEqual(before.bgColor, after.bgColor);
  assert.equal(before.fogDensity, after.fogDensity);
});

test('fish 3D path and camera rig are finite, continuous, and reversible across desktop & mobile', () => {
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    const fish = getFishPathAtProgress(p);
    assert.ok(Number.isFinite(fish.position.x));
    assert.ok(Number.isFinite(fish.position.y));
    assert.ok(Number.isFinite(fish.position.z));
    assert.ok(Math.abs(fish.tangent.length() - 1) < 1e-4);
    assert.ok(Math.abs(fish.bankRadians) <= 0.3);

    const camDesktop = getCameraRigAtProgress(p, 1440 / 900);
    const camMobile = getCameraRigAtProgress(p, 390 / 844);
    assert.ok(Number.isFinite(camDesktop.position.x));
    assert.ok(Number.isFinite(camMobile.position.x));

    // Portrait mobile camera must pull further back from fish than desktop so snout/tail are not cropped
    const distDesktop = camDesktop.position.distanceTo(fish.position);
    const distMobile = camMobile.position.distanceTo(fish.position);
    assert.ok(
      distMobile > distDesktop,
      `Mobile camera distance (${distMobile}) should exceed desktop (${distDesktop}) at p=${p}`,
    );
  }

  // Descent check: fish Y at p=1 is much deeper than p=0
  const startFish = getFishPathAtProgress(0);
  const endFish = getFishPathAtProgress(1);
  assert.ok(endFish.position.y < startFish.position.y - 140);

  // Exact reversibility at p=0.64
  const f1 = getFishPathAtProgress(0.64);
  const pos1 = f1.position.clone();
  getFishPathAtProgress(0.98);
  const f2 = getFishPathAtProgress(0.64);
  assert.ok(pos1.distanceTo(f2.position) < 1e-9);
});

test('swim kinematics articulates tail and fins continuously while scroll velocity is zero', () => {
  const t0 = evaluateSwimKinematics(0.0, 0, false);
  const t1 = evaluateSwimKinematics(0.45, 0, false);
  const t2 = evaluateSwimKinematics(8.0, 0, false);

  assert.equal(t0.spineYaw.length, SPINE_BONE_COUNT);

  // Caudal fin amplitude (index 7) must exceed cranial amplitude (index 0) across cycle
  let maxHead = 0;
  let maxTail = 0;
  for (let k = 0; k < 40; k++) {
    const sample = evaluateSwimKinematics(k * 0.08, 0, false);
    maxHead = Math.max(maxHead, Math.abs(sample.spineYaw[0]));
    maxTail = Math.max(maxTail, Math.abs(sample.spineYaw[SPINE_BONE_COUNT - 1]));
  }
  assert.ok(maxTail > maxHead * 4, `Tail yaw (${maxTail}) must be much larger than head (${maxHead})`);
  assert.notEqual(t0.spineYaw[7], t1.spineYaw[7]);
  assert.notEqual(t1.pectoralLeftFlap, t2.pectoralLeftFlap);
});

test('scrollDirector settles cleanly without drift when user pauses mid-chapter', () => {
  let current = 0.0;
  const target = 0.45;
  for (let frame = 0; frame < 180; frame++) {
    const step = stepScrollProgress(current, target, 1 / 60, false);
    current = step.currentProgress;
  }
  assert.equal(current, target);

  // Hold stationary for 10 simulated seconds (600 frames): zero drift!
  for (let frame = 0; frame < 600; frame++) {
    const step = stepScrollProgress(current, target, 1 / 60, false);
    current = step.currentProgress;
    assert.equal(step.velocity, 0);
  }
  assert.equal(current, 0.45);
  assert.equal(computeNormalizedWindowScroll(1500, 6500, 1000), clamp01(1500 / 5500));
});

test('chapter visibility weights fade smoothly and quality tiers enforce DPR caps', () => {
  assert.equal(getChapterVisibilityWeight(0, 0), 1);
  assert.equal(getChapterVisibilityWeight(1, 7), 1);
  const boundaryWeight = getChapterVisibilityWeight(OCEAN_CHAPTERS[2].startProgress, 2);
  assert.ok(boundaryWeight > 0.2 && boundaryWeight < 0.98);

  const mobileProfile = resolveQualityProfile('auto', 390, false, false);
  assert.ok(mobileProfile.dprCap <= 1.5);
  const swProfile = resolveQualityProfile('high', 1440, true, false);
  assert.equal(swProfile.dprCap, 1.0);
  assert.equal(swProfile.antialias, false);
});
