import { clamp01 } from './chapterConfig';

export interface ScrollStateSnapshot {
  targetProgress: number;
  currentProgress: number;
  velocity: number;
}

/**
 * Pure frame-rate-independent progress damper.
 * Ensures smooth travel while scrolling and zero drift once settled.
 */
export function stepScrollProgress(
  currentProgress: number,
  targetProgress: number,
  dtSeconds: number,
  reducedMotion = false,
  isSoftwareGl = false,
): ScrollStateSnapshot {
  const clampedTarget = clamp01(targetProgress);
  const clampedCurrent = clamp01(currentProgress);
  const safeDt = Number.isFinite(dtSeconds) ? Math.min(Math.max(dtSeconds, 0), 0.1) : 1 / 60;

  if (safeDt <= 0) {
    return {
      targetProgress: clampedTarget,
      currentProgress: clampedCurrent,
      velocity: 0,
    };
  }

  const lambda = reducedMotion ? 20.0 : isSoftwareGl ? 16.0 : 7.5;
  const alpha = 1 - Math.exp(-lambda * safeDt);
  let next = clampedCurrent + (clampedTarget - clampedCurrent) * alpha;

  if (Math.abs(clampedTarget - next) < 0.00025) {
    next = clampedTarget;
  }

  const velocity = (next - clampedCurrent) / safeDt;

  return {
    targetProgress: clampedTarget,
    currentProgress: next,
    velocity,
  };
}

export function computeNormalizedWindowScroll(
  scrollY: number,
  scrollHeight: number,
  innerHeight: number,
): number {
  const maxScroll = Math.max(1, scrollHeight - innerHeight);
  return clamp01(scrollY / maxScroll);
}
