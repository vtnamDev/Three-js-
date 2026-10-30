import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EFFECT_CATALOGUE,
  OCEAN_CHAPTERS,
  clamp01,
  getBlendedAtmosphere,
  getChapterAtProgress,
  getChapterTitleTransition,
  getChapterVisibilityWeight,
  getDepthMetersAtProgress,
  getEffectStrengthAtProgress,
} from './chapterConfig';
import {
  DEFAULT_HERO_FISH_BOUNDS,
  getCameraRigAtProgress,
  getFishPathAtProgress,
  getSightlineBasisAtProgress,
} from './fishPath';
import { evaluateSwimKinematics, SPINE_BONE_COUNT } from './fishSwim';
import { computeNormalizedWindowScroll, stepScrollProgress } from './scrollDirector';
import { resolveQualityProfile } from './qualityTier';

test('OCEAN_CHAPTERS covers [0, 1] continuously with all 8 canonical chapters and unique title reveal modes', () => {
  assert.equal(OCEAN_CHAPTERS.length, 8);
  assert.equal(OCEAN_CHAPTERS[0].startProgress, 0);
  assert.equal(OCEAN_CHAPTERS[OCEAN_CHAPTERS.length - 1].endProgress, 1);

  const canonicalNamesVi = [
    'Mặt Nước Ánh Dương',
    'Vườn Xanh Đại Dương',
    'Tia Nắng Cuối',
    'Vùng Chạng Vạng',
    'Nửa Đêm Đại Dương',
    'Đồng Bằng Vực Sâu',
    'Hẻm Vực Thẳm',
    'Đáy Rãnh Hadal',
  ];

  const revealModes = new Set<string>();

  for (let i = 0; i < OCEAN_CHAPTERS.length; i++) {
    assert.equal(OCEAN_CHAPTERS[i].zoneNameVi, canonicalNamesVi[i]);
    revealModes.add(OCEAN_CHAPTERS[i].titleRevealMode);
    if (i < OCEAN_CHAPTERS.length - 1) {
      assert.equal(
        OCEAN_CHAPTERS[i].endProgress,
        OCEAN_CHAPTERS[i + 1].startProgress,
        `Chapter ${i} endProgress must match Chapter ${i + 1} startProgress`,
      );
    }
  }

  assert.equal(revealModes.size, 8, 'Each of the 8 chapters must have its own distinct titleRevealMode');
  assert.equal(getChapterAtProgress(0).id, 'surface');
  assert.equal(getChapterAtProgress(-0.5).id, 'surface');
  assert.equal(getChapterAtProgress(1).id, 'hadal-reveal');
  assert.equal(getChapterAtProgress(1.5).id, 'hadal-reveal');
});

test('EFFECT_CATALOGUE implements all 24 effect families (>= 20 requirement) with >= 10 active effects per chapter', () => {
  assert.equal(EFFECT_CATALOGUE.length, 24);
  const uniqueIds = new Set(EFFECT_CATALOGUE.map((e) => e.id));
  assert.equal(uniqueIds.size, 24);

  for (const ch of OCEAN_CHAPTERS) {
    assert.ok(
      ch.activeEffects.length >= 10,
      `Chapter ${ch.code} (${ch.id}) must activate >= 4 effects, got ${ch.activeEffects.length}`,
    );
    const midP = (ch.startProgress + ch.endProgress) * 0.5;
    let nonZeroEffects = 0;
    for (const effectId of ch.activeEffects) {
      const strength = getEffectStrengthAtProgress(effectId, midP);
      if (strength > 0.1) nonZeroEffects++;
    }
    assert.ok(
      nonZeroEffects >= 8,
      `Chapter ${ch.code} midpoint must have >= 4 active runtime effects, got ${nonZeroEffects}`,
    );
  }
});

test('chapter title transition state is deterministic, reversible, and scrubbable across boundaries', () => {
  for (const ch of OCEAN_CHAPTERS) {
    const midP = (ch.startProgress + ch.endProgress) * 0.5;
    const midState = getChapterTitleTransition(midP);
    assert.equal(midState.chapter.id, ch.id);
    assert.equal(midState.revealAmount, 1);
    assert.equal(midState.dissolveOut, 0);
  }

  const entryCh04 = getChapterTitleTransition(OCEAN_CHAPTERS[3].startProgress + 0.005);
  assert.equal(entryCh04.chapter.id, OCEAN_CHAPTERS[3].id);
  assert.ok(entryCh04.revealAmount > 0 && entryCh04.revealAmount < 1);

  const exitCh04 = getChapterTitleTransition(OCEAN_CHAPTERS[3].endProgress - 0.004);
  assert.ok(exitCh04.dissolveOut > 0);
});

test('depth mapping is monotonic, deterministic, and reversible from 0m to 10920m', () => {
  assert.equal(getDepthMetersAtProgress(0), 0);
  assert.equal(getDepthMetersAtProgress(1), 10920);

  let prevDepth = -1;
  for (let i = 0; i <= 100; i++) {
    const p = i / 100;
    const d = getDepthMetersAtProgress(p);
    assert.ok(Number.isFinite(d) && d >= prevDepth, `Depth must not decrease at p=${p}`);
    prevDepth = d;
  }

  const before = getBlendedAtmosphere(0.43);
  const deep = getBlendedAtmosphere(0.95);
  assert.notEqual(before.chapter.id, deep.chapter.id);
  const after = getBlendedAtmosphere(0.43);
  assert.equal(before.depthMeters, after.depthMeters);
  assert.equal(before.chapter.id, after.chapter.id);
  assert.deepEqual(before.bgColor, after.bgColor);
  assert.equal(before.fogDensity, after.fogDensity);
});

test('fish 3D trajectory travels diagonally downward and laterally with natural oblique posture (never nose-down)', () => {
  assert.ok(DEFAULT_HERO_FISH_BOUNDS.length > 1.2);
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let i = 0; i <= 200; i++) {
    const p = i / 200;
    const fish = getFishPathAtProgress(p);
    assert.ok(Number.isFinite(fish.position.x));
    assert.ok(Number.isFinite(fish.position.y));
    assert.ok(Number.isFinite(fish.position.z));
    assert.ok(Math.abs(fish.tangent.length() - 1) < 1e-4);
    assert.ok(Math.abs(fish.bankRadians) <= 0.3);

    const pitchDeg = (fish.pitchRadians * 180) / Math.PI;
    assert.ok(
      pitchDeg >= -22 && pitchDeg <= -2,
      `Fish pitch (${pitchDeg.toFixed(2)} deg at p=${p}) must stay in natural oblique descent range [-22, -2]`,
    );

    minX = Math.min(minX, fish.position.x);
    maxX = Math.max(maxX, fish.position.x);
    minZ = Math.min(minZ, fish.position.z);
    maxZ = Math.max(maxZ, fish.position.z);
  }

  // Must travel substantially laterally (X span > 7m) and forward (Z span > 85m) as well as downward (Y span > 155m)
  assert.ok(maxX - minX > 7.5, `Lateral X travel (${maxX - minX}m) must exceed 7.5m`);
  assert.ok(maxZ - minZ > 85, `Forward Z travel (${maxZ - minZ}m) must exceed 85m`);

  const startFish = getFishPathAtProgress(0);
  const endFish = getFishPathAtProgress(1);
  assert.ok(endFish.position.y < startFish.position.y - 155);
});

test('spherical orbital camera completes a 360-degree descent orbit and adapts to mobile portrait', () => {
  const orbitAngles: number[] = [];
  for (let i = 0; i <= 200; i++) {
    const p = i / 200;
    const fish = getFishPathAtProgress(p);
    const basis = getSightlineBasisAtProgress(p, 0.65);
    assert.ok(Math.abs(basis.sightDir.length() - 1) < 1e-4);
    assert.ok(Math.abs(basis.sightRight.length() - 1) < 1e-4);

    const camDesktop = getCameraRigAtProgress(p, 1440 / 900);
    const camMobile = getCameraRigAtProgress(p, 390 / 844);

    orbitAngles.push(camDesktop.orbitAzimuthDeg);
    assert.ok(
      camDesktop.orbitAzimuthDeg >= 52 && camDesktop.orbitAzimuthDeg <= 440,
      `Camera azimuth (${camDesktop.orbitAzimuthDeg.toFixed(1)} deg at p=${p}) must remain within the authored 360-degree descent orbit`,
    );
    assert.ok(Math.abs(camDesktop.quaternion.length() - 1) < 1e-4);
    assert.ok(Math.abs(camMobile.quaternion.length() - 1) < 1e-4);
    assert.ok(Math.abs(camDesktop.rollRadians) <= 0.12);

    const distDesktop = camDesktop.position.distanceTo(fish.position);
    const distMobile = camMobile.position.distanceTo(fish.position);
    assert.ok(
      distMobile > distDesktop,
      `Mobile portrait camera distance (${distMobile.toFixed(2)}) must exceed desktop (${distDesktop.toFixed(2)}) at p=${p}`,
    );
  }
  assert.ok(
    Math.max(...orbitAngles) - Math.min(...orbitAngles) > 350,
    'Camera must sweep at least 350 degrees around the fish over the full descent',
  );
});

test('swim kinematics articulates 8-bone smooth spine chain and pectoral fins continuously while scroll velocity is zero', () => {
  const t0 = evaluateSwimKinematics(0.0, 0, false, 0.5);
  const t1 = evaluateSwimKinematics(0.45, 0, false, 0.5);
  const t2 = evaluateSwimKinematics(8.0, 0, false, -0.5);

  assert.equal(t0.spineYaw.length, SPINE_BONE_COUNT);
  assert.equal(SPINE_BONE_COUNT, 8);
  assert.equal(t0.authoredSpineYaw.length, 4);

  let maxHead = 0;
  let maxTail = 0;
  for (let k = 0; k < 48; k++) {
    const sample = evaluateSwimKinematics(k * 0.07, 0, false, 0);
    maxHead = Math.max(maxHead, Math.abs(sample.spineYaw[0]));
    maxTail = Math.max(maxTail, Math.abs(sample.spineYaw[SPINE_BONE_COUNT - 1]));
  }
  assert.ok(
    maxTail > maxHead * 4,
    `Caudal joint yaw (${maxTail}) must exceed cranial joint (${maxHead}) by >4x for stable head & fluid tail`,
  );
  assert.notEqual(t0.spineYaw[SPINE_BONE_COUNT - 1], t1.spineYaw[SPINE_BONE_COUNT - 1]);
  assert.notEqual(t1.pectoralLeftFlap, t2.pectoralLeftFlap);
  assert.notEqual(t0.pectoralFeatherLeft, t1.pectoralFeatherLeft);

  // Reduced motion must damp amplitude cleanly without freezing to NaN
  const reduced = evaluateSwimKinematics(0.45, 0, true, 0);
  assert.ok(Math.abs(reduced.spineYaw[7]) < Math.abs(t1.spineYaw[7]) + 0.05);
});

test('scrollDirector settles cleanly without drift when user pauses mid-chapter', () => {
  let current = 0.0;
  const target = 0.43;
  for (let frame = 0; frame < 180; frame++) {
    const step = stepScrollProgress(current, target, 1 / 60, false);
    current = step.currentProgress;
  }
  assert.equal(current, target);

  for (let frame = 0; frame < 600; frame++) {
    const step = stepScrollProgress(current, target, 1 / 60, false);
    current = step.currentProgress;
    assert.equal(step.velocity, 0);
  }
  assert.equal(current, 0.43);
  assert.equal(computeNormalizedWindowScroll(1500, 6500, 1000), clamp01(1500 / 5500));
});

test('chapter visibility weights cull distant chapters cleanly and quality tiers enforce DPR caps', () => {
  assert.equal(getChapterVisibilityWeight(0, 0), 1);
  assert.equal(getChapterVisibilityWeight(1, 7), 1);
  // Ch01/Ch02 floors must be 100% culled at Ch05..Ch08 so no upper-zone floor can appear above camera
  assert.equal(getChapterVisibilityWeight(0.56, 0), 0);
  assert.equal(getChapterVisibilityWeight(0.56, 1), 0);

  const mobileProfile = resolveQualityProfile('auto', 390, false, false);
  assert.ok(mobileProfile.dprCap <= 1.5);
  const swProfile = resolveQualityProfile('high', 1440, true, false);
  assert.equal(swProfile.dprCap, 1.0);
  assert.equal(swProfile.antialias, false);
});
