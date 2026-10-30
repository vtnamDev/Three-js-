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
    'Ngưỡng Cửa Hư Vô',
    'Thánh Đường Obsidian',
    'Vết Nứt Lam',
    'Vực Kính',
    'Đứt Gãy Hỏa Tâm',
    'Cỗ Máy Chìm',
    'Chân Trời Sự Kiện',
    'Tĩnh Lõi',
  ];

  const revealModes = new Set<string>();

  for (let i = 0; i < OCEAN_CHAPTERS.length; i++) {
    assert.equal(OCEAN_CHAPTERS[i].zoneNameVi, canonicalNamesVi[i]);
    revealModes.add(OCEAN_CHAPTERS[i].titleRevealMode);
    if (i < OCEAN_CHAPTERS.length - 1) {
      assert.equal(
        OCEAN_C���q�^