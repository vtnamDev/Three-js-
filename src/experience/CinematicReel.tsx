import { useEffect, useRef } from 'react';
import { OCEAN_CHAPTERS, OceanChapter } from '../lib/chapterConfig';
import { QualityTierOption } from '../lib/qualityTier';

export interface CinematicReelProps {
  reducedMotion: boolean;
  quality: QualityTierOption;
  onTelemetry: (telemetry: { progress: number; depthMeters: number; chapter: OceanChapter; fpsEstimate: number | null }) => void;
  onReady: () => void;
  onFallback: () => void;
}

type ReelClip = {
  id: string;
  src: string;
  credit: string;
  page: string;
};

type ReelShot = {
  chapterIndex: number;
  clipId: string;
  from: number;
  to: number;
  focusX: number;
  focusY: number;
  zoom: number;
  grade: string;
  darkness: number;
};

const CLIPS: ReelClip[] = [
  {
    id: 'clownfish',
    src: 'https://videos.pexels.com/video-files/7008971/7008971-hd_1920_1080_30fps.mp4',
    credit: 'Across Wong / Pexels',
    page: 'https://www.pexels.com/video/underwater-video-of-clownfish-7008971/',
  },
  {
    id: 'reef',
    src: 'https://videos.pexels.com/video-files/11273418/11273418-hd_1920_1080_25fps.mp4',
    credit: 'Alex Mesel / Pexels',
    page: 'https://www.pexels.com/video/underwater-footage-of-tropical-fish-in-a-coral-reef-11273418/',
  },
  {
    id: 'abyss',
    src: 'https://videos.pexels.com/video-files/17177445/17177445-hd_1920_1080_60fps.mp4',
    credit: 'Nothing Ahead / Pexels',
    page: 'https://www.pexels.com/video/jellyfish-in-the-dark-with-green-and-blue-lights-17177445/',
  },
];

const SHOTS: ReelShot[] = [
  // Surface: real clownfish in a sea anemone, followed by wide reef footage.
  { chapterIndex: 0, clipId: 'clownfish', from: 0.04, to: 0.30, focusX: 0.53, focusY: 0.53, zoom: 1.00, grade: 'surface', darkness: 0.015 },
  { chapterIndex: 1, clipId: 'reef', from: 0.02, to: 0.44, focusX: 0.51, focusY: 0.52, zoom: 1.00, grade: 'reef', darkness: 0.035 },
  { chapterIndex: 2, clipId: 'reef', from: 0.44, to: 0.99, focusX: 0.50, focusY: 0.49, zoom: 1.02, grade: 'blue', darkness: 0.10 },
  // The same abyss clip advances continuously through the five deep chapters rather than
  // jumping back to a close-up fish or resetting its timestamp at each chapter boundary.
  { chapterIndex: 3, clipId: 'abyss', from: 0.03, to: 0.20, focusX: 0.50, focusY: 0.49, zoom: 1.02, grade: 'twilight', darkness: 0.12 },
  { chapterIndex: 4, clipId: 'abyss', from: 0.20, to: 0.39, focusX: 0.50, focusY: 0.49, zoom: 1.03, grade: 'midnight', darkness: 0.18 },
  { chapterIndex: 5, clipId: 'abyss', from: 0.39, to: 0.58, focusX: 0.50, focusY: 0.49, zoom: 1.04, grade: 'abyss', darkness: 0.22 },
  { chapterIndex: 6, clipId: 'abyss', from: 0.58, to: 0.78, focusX: 0.50, focusY: 0.49, zoom: 1.05, grade: 'canyon', darkness: 0.24 },
  { chapterIndex: 7, clipId: 'abyss', from: 0.78, to: 0.985, focusX: 0.50, focusY: 0.49, zoom: 1.06, grade: 'hadal', darkness: 0.30 },
];

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
const smoothstep = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / Math.max(0.0001, b - a));
  return t * t * (3 - 2 * t);
};

function getProgress(): number {
  const root = document.documentElement;
  return clamp01(window.scrollY / Math.max(1, root.scrollHeight - window.innerHeight));
}

function findChapter(progress: number): { chapter: OceanChapter; local: number } {
  const chapter = OCEAN_CHAPTERS.find((item) => progress <= item.endProgress) ?? OCEAN_CHAPTERS[OCEAN_CHAPTERS.length - 1];
  const local = clamp01((progress - chapter.startProgress) / Math.max(0.0001, chapter.endProgress - chapter.startProgress));
  return { chapter, local };
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  width: number,
  height: number,
  shot: ReelShot,
  drift: number,
) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return false;
  const zoom = shot.zoom + drift;
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight) * zoom;
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const focusX = clamp01(shot.focusX + Math.sin(drift * 12) * 0.018);
  const focusY = clamp01(shot.focusY + Math.cos(drift * 9) * 0.012);
  const sourceX = Math.max(0, Math.min(video.videoWidth - sourceWidth, focusX * video.videoWidth - sourceWidth / 2));
  const sourceY = Math.max(0, Math.min(video.videoHeight - sourceHeight, focusY * video.videoHeight - sourceHeight / 2));
  ctx.drawImage(video, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  return true;
}

export function CinematicReel({ reducedMotion, quality, onTelemetry, onReady, onFallback }: CinematicReelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const callbacksRef = useRef({ onTelemetry, onReady, onFallback, reducedMotion, quality });
  callbacksRef.current = { onTelemetry, onReady, onFallback, reducedMotion, quality };

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d', { alpha: false, desynchronized: true });
    if (!canvas || !ctx) {
      callbacksRef.current.onFallback();
      return;
    }

    const frameCache = document.createElement('canvas');
    const frameCacheCtx = frameCache.getContext('2d', { alpha: false });
    let hasCachedFrame = false;
    const videos = new Map<string, HTMLVideoElement>();
    const failed = new Set<string>();
    const available = new Set<string>();
    let rafId = 0;
    let disposed = false;
    let readyReported = false;
    let fallbackReported = false;
    let progress = getProgress();
    let previousProgress = progress;
    let lastScrollAt = performance.now();
    let lastSeekAt = 0;
    let lastTelemetryAt = 0;
    let lastFrameAt = 0;
    let fpsWindowAt = performance.now();
    let fpsFrames = 0;
    let currentFps: number | null = null;
    let previousShotIndex = -1;
    let drawCount = 0;
    let lastDrawnClip = '';
    let timeoutId = 0;
    let dpr = 1;
    const getDprCap = () => {
      const selected = callbacksRef.current.quality;
      if (selected === 'low') return 0.85;
      if (selected === 'balanced') return 1.05;
      if (selected === 'high') return 1.6;
      return window.innerWidth < 700 ? 1.2 : 1.55;
    };

    const setCanvasSize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, getDprCap());
      const width = Math.max(1, Math.round(window.innerWidth * dpr));
      const height = Math.max(1, Math.round(window.innerHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        frameCache.width = width;
        frameCache.height = height;
        hasCachedFrame = false;
      }
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    };

    const reportFallbackOnce = () => {
      if (fallbackReported || disposed) return;
      fallbackReported = true;
      callbacksRef.current.onFallback();
    };

    const maybeReportReady = () => {
      if (readyReported || disposed) return;
      if ([...available].length > 0) {
        readyReported = true;
        document.body.dataset.cinematicStatus = 'ready';
        callbacksRef.current.onReady();
      }
    };

    const createVideo = (clip: ReelClip) => {
      const video = document.createElement('video');
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.loop = true;
      video.preload = 'metadata';
      video.disablePictureInPicture = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      video.setAttribute('aria-hidden', 'true');
      video.dataset.pelagicFilm = clip.id;
      video.style.display = 'none';
      video.style.position = 'absolute';
      video.style.width = '1px';
      video.style.height = '1px';
      video.style.opacity = '0';
      video.style.pointerEvents = 'none';
      video.addEventListener('loadedmetadata', () => {
        if (disposed || !Number.isFinite(video.duration) || video.duration <= 0) return;
        const startChapter = findChapter(progress).chapter;
        const shot = SHOTS[startChapter.index];
        if (shot && shot.clipId === clip.id) {
          try { video.currentTime = clamp01(shot.from) * Math.max(0, video.duration - 0.15); } catch { /* Wait for the next scroll tick if metadata is not seekable yet. */ }
        }
      });
      video.addEventListener('loadeddata', () => {
        if (disposed) return;
        available.add(clip.id);
        maybeReportReady();
      });
      video.addEventListener('error', () => {
        if (disposed) return;
        failed.add(clip.id);
        if (failed.size >= CLIPS.length && available.size === 0) reportFallbackOnce();
      });
      video.src = clip.src;
      document.body.appendChild(video);
      video.load();
      videos.set(clip.id, video);
      return video;
    };

    CLIPS.forEach(createVideo);
    canvas.dataset.testid = 'pelagic-film-canvas';
    canvas.setAttribute('aria-label', 'Trải nghiệm điện ảnh dưới nước theo cuộn trang');

    const getVideo = (clipId: string) => videos.get(clipId) ?? null;

    const activateVideos = (shotIndex: number, nextIndex: number, now: number) => {
      const intendedShot = SHOTS[shotIndex];
      const preferredFallback = shotIndex >= 3 ? 'abyss' : shotIndex >= 1 ? 'reef' : 'clownfish';
      const fallbackClipId = available.has(preferredFallback) ? preferredFallback : [...available][0];
      const activeShot = available.has(intendedShot.clipId) ? intendedShot : (available.size > 0 ? { ...intendedShot, clipId: fallbackClipId } : intendedShot);
      const upcoming = SHOTS[nextIndex];
      const wanted = new Set<string>([activeShot.clipId]);
      if (upcoming && upcoming.clipId !== activeShot.clipId) wanted.add(upcoming.clipId);
      for (const [id, video] of videos.entries()) {
        if (wanted.has(id)) {
          if (callbacksRef.current.reducedMotion) {
            video.pause();
          } else if (video.readyState >= HTMLMediaElement.HAVE_METADATA && video.paused) {
            video.playbackRate = 0.42;
            void video.play().catch(() => {
              // A muted media element may need a first user gesture on strict mobile browsers.
            });
          }
        } else if (!video.paused) {
          video.pause();
        }
      }

      const video = getVideo(activeShot.clipId);
      if (!video || video.readyState < HTMLMediaElement.HAVE_METADATA || !Number.isFinite(video.duration) || video.duration <= 0) return;
      if (progress !== previousProgress && now - lastSeekAt > 110) {
        const activeChapter = OCEAN_CHAPTERS[shotIndex];
        const local = clamp01((progress - activeChapter.startProgress) / Math.max(0.0001, activeChapter.endProgress - activeChapter.startProgress));
        const target = activeShot.from + local * (activeShot.to - activeShot.from);
        const seconds = clamp01(target) * Math.max(0, video.duration - 0.12);
        if (Math.abs(video.currentTime - seconds) > 0.22 && !video.seeking) {
          try { video.currentTime = seconds; lastSeekAt = now; } catch { /* A non-seekable stream can still play as ambient footage. */ }
        }
      }
    };

    const drawCaustics = (time: number, width: number, height: number, strength: number) => {
      if (strength <= 0.01) return;
      ctx.save();
      ctx.globalAlpha = strength * 0.16;
      ctx.globalCompositeOperation = 'screen';
      ctx.lineWidth = Math.max(0.8, dpr * 0.8);
      for (let line = 0; line < 10; line++) {
        const y0 = height * (0.025 + line * 0.026);
        ctx.beginPath();
        ctx.moveTo(0, y0);
        for (let step = 1; step <= 8; step++) {
          const x = (width / 8) * step;
          const y = y0 + Math.sin(time * 0.00044 + line * 1.1 + step * 0.9) * height * 0.009;
          ctx.lineTo(x, y);
        }
        ctx.strokeStyle = line % 2 ? 'rgba(155,245,255,0.55)' : 'rgba(255,231,185,0.36)';
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawParticles = (time: number, width: number, height: number, progressValue: number) => {
      const count = width < 700 ? 30 : 56;
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let i = 0; i < count; i++) {
        const seed = Math.sin(i * 127.1 + 311.7) * 43758.5453;
        const x0 = (seed - Math.floor(seed));
        const y0Seed = Math.sin(i * 269.5 + 183.3) * 15342.342;
        const y0 = y0Seed - Math.floor(y0Seed);
        const driftX = Math.sin(time * 0.00015 + i * 0.72) * width * 0.012;
        const driftY = ((time * (0.000009 + (i % 4) * 0.000003) + y0) % 1) * height;
        const x = x0 * width + driftX;
        const y = driftY;
        const radius = dpr * (0.35 + (i % 3) * 0.34);
        const alpha = (0.07 + (i % 5) * 0.015) * (0.8 + progressValue * 0.4);
        ctx.fillStyle = 'rgba(210,245,255,' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    };

    const drawGrade = (shot: ReelShot, width: number, height: number) => {
      const deep = shot.darkness;
      const tint = shot.grade === 'surface'
        ? 'rgba(0,100,135,' + (0.08 + deep).toFixed(3) + ')'
        : shot.grade === 'reef'
          ? 'rgba(0,58,91,' + (0.09 + deep).toFixed(3) + ')'
          : shot.grade === 'hadal'
            ? 'rgba(0,5,22,' + (0.24 + deep).toFixed(3) + ')'
            : 'rgba(0,16,38,' + (0.13 + deep).toFixed(3) + ')';
      ctx.fillStyle = tint;
      ctx.fillRect(0, 0, width, height);

      const top = ctx.createLinearGradient(0, 0, 0, height * 0.46);
      top.addColorStop(0, 'rgba(0,8,20,0.40)');
      top.addColorStop(0.45, 'rgba(0,12,28,0.11)');
      top.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, width, height * 0.46);

      const bottom = ctx.createLinearGradient(0, height * 0.48, 0, height);
      bottom.addColorStop(0, 'rgba(0,0,0,0)');
      bottom.addColorStop(1, 'rgba(0,4,17,' + (0.26 + deep * 0.42).toFixed(3) + ')');
      ctx.fillStyle = bottom;
      ctx.fillRect(0, height * 0.48, width, height * 0.52);

      const vignette = ctx.createRadialGradient(width * 0.5, height * 0.48, height * 0.08, width * 0.5, height * 0.5, Math.max(width, height) * 0.74);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(0.72, 'rgba(0,2,12,0.08)');
      vignette.addColorStop(1, 'rgba(0,3,15,' + (0.28 + deep * 0.3).toFixed(3) + ')');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    };

    const drawFallbackGradient = (width: number, height: number, progressValue: number) => {
      const g = ctx.createLinearGradient(0, 0, 0, height);
      g.addColorStop(0, progressValue < 0.15 ? '#58cde0' : '#0a5279');
      g.addColorStop(0.38, progressValue < 0.35 ? '#278ca8' : '#083251');
      g.addColorStop(1, progressValue > 0.8 ? '#020817' : '#04192a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, width, height);
    };

    const emitTelemetry = (now: number, p: number) => {
      if (now - lastTelemetryAt < 105) return;
      lastTelemetryAt = now;
      const state = findChapter(p);
      const depth = state.chapter.minDepthMeters + (state.chapter.maxDepthMeters - state.chapter.minDepthMeters) * state.local;
      callbacksRef.current.onTelemetry({
        progress: p,
        depthMeters: depth,
        chapter: state.chapter,
        fpsEstimate: currentFps,
      });
    };

    const onScroll = () => {
      lastScrollAt = performance.now();
      progress = getProgress();
    };
    const onViewportChange = () => {
      // Preserve the selected quality tier on resize; never silently raise mobile DPR above its cap.
      dpr = Math.min(window.devicePixelRatio || 1, getDprCap());
      setCanvasSize();
      progress = getProgress();
    };

    const render = (now: number) => {
      if (disposed) return;
      rafId = window.requestAnimationFrame(render);
      if (now - lastFrameAt < 1000 / 30) return;
      lastFrameAt = now;
      fpsFrames++;
      if (now - fpsWindowAt >= 1000) {
        currentFps = Math.round((fpsFrames * 1000) / (now - fpsWindowAt));
        fpsFrames = 0;
        fpsWindowAt = now;
      }

      progress = getProgress();
      const state = findChapter(progress);
      const chapterIndex = state.chapter.index;
      const shotIndex = Math.max(0, Math.min(SHOTS.length - 1, chapterIndex));
      const nextIndex = Math.min(SHOTS.length - 1, shotIndex + 1);
      const shot = SHOTS[shotIndex];
      const nextShot = SHOTS[nextIndex];
      activateVideos(shotIndex, nextIndex, now);

      const width = canvas.width;
      const height = canvas.height;
      ctx.fillStyle = '#041522';
      ctx.fillRect(0, 0, width, height);
      const effectiveShot = available.has(shot.clipId) ? shot : (available.size > 0 ? { ...shot, clipId: [...available][0] } : shot);
      const activeVideo = getVideo(effectiveShot.clipId);
      const idleSeconds = now - lastScrollAt;
      const local = clamp01((progress - state.chapter.startProgress) / Math.max(0.0001, state.chapter.endProgress - state.chapter.startProgress));
      const drift = callbacksRef.current.reducedMotion ? 0 : Math.sin(now * 0.00017) * 0.006;
      let drawn = false;

      if (activeVideo && available.has(effectiveShot.clipId)) {
        drawn = drawCover(ctx, activeVideo, width, height, effectiveShot, drift);
        if (drawn) lastDrawnClip = effectiveShot.clipId;
      }

      // Mobile browsers can temporarily evict a video's current frame while seeking or resuming.
      // Keep the last valid underwater frame (or another decoded clip) instead of flashing to a flat gradient.
      if (!drawn && lastDrawnClip) {
        const old = getVideo(lastDrawnClip);
        const oldShot = SHOTS.find((candidate) => candidate.clipId === lastDrawnClip) ?? shot;
        if (old && old.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
          drawn = drawCover(ctx, old, width, height, oldShot, drift);
        }
      }
      if (!drawn) {
        for (const clipId of available) {
          const backup = getVideo(clipId);
          const backupShot = SHOTS.find((candidate) => candidate.clipId === clipId) ?? shot;
          if (backup && drawCover(ctx, backup, width, height, backupShot, drift)) {
            drawn = true;
            lastDrawnClip = clipId;
            break;
          }
        }
      }
      if (!drawn) {
        drawFallbackGradient(ctx.canvas.width, ctx.canvas.height, progress);
      }

      // Cross-dissolve into the next chapter's moving footage during the final 11% of each chapter.
      const transition = nextIndex !== shotIndex ? smoothstep(0.84, 1.0, local) : 0;
      if (transition > 0.001 && nextShot.clipId !== shot.clipId) {
        const nextVideo = getVideo(nextShot.clipId);
        if (nextVideo && available.has(nextShot.clipId)) {
          ctx.save();
          ctx.globalAlpha = transition;
          drawCover(ctx, nextVideo, width, height, nextShot, drift * 0.8);
          ctx.restore();
        }
      }

      // Natural footage remains moving when scrolling stops; scrolling is a time scrub, not a frozen image.
      if (activeVideo && available.has(shot.clipId) && idleSeconds > 120 && callbacksRef.current.reducedMotion) {
        activeVideo.pause();
      }

      const surfaceStrength = (1 - smoothstep(0.13, 0.31, progress)) * (callbacksRef.current.reducedMotion ? 0.5 : 1);
      drawCaustics(now, width, height, surfaceStrength);
      drawParticles(now, width, height, progress);
      drawGrade(shot, width, height);

      // Releasing the scroll input lets footage play as living ambience; while scrubbing, map the local chapter to its source time.
      if (!callbacksRef.current.reducedMotion && idleSeconds < 1100 && progress !== previousProgress) {
        const active = getVideo(effectiveShot.clipId);
        if (active && available.has(effectiveShot.clipId) && Number.isFinite(active.duration) && active.duration > 0 && now - lastSeekAt > 150 && !active.seeking) {
          const target = shot.from + local * (shot.to - shot.from);
          const time = clamp01(target) * Math.max(0, active.duration - 0.15);
          if (Math.abs(active.currentTime - time) > 0.24) {
            try { active.currentTime = time; lastSeekAt = now; } catch { /* Continue as a natural loop if the media cannot be scrubbed. */ }
          }
        }
      }

      previousProgress = progress;
      emitTelemetry(now, progress);
      if (available.size > 0) {
        drawCount++;
        if (drawCount >= 2) maybeReportReady();
      }
      document.body.dataset.cinematicChapter = state.chapter.id;
      document.body.dataset.cinematicProgress = progress.toFixed(4);
      document.body.dataset.cinematicFrameRate = String(currentFps ?? 0);
      document.body.dataset.cinematicSource = lastDrawnClip;
    };

    setCanvasSize();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onViewportChange, { passive: true });
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onViewportChange) : null;
    observer?.observe(canvas);
    timeoutId = window.setTimeout(() => {
      if (disposed) return;
      if (available.size === 0) reportFallbackOnce();
    }, 16000);
    rafId = window.requestAnimationFrame(render);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onViewportChange);
      observer?.disconnect();
      for (const video of videos.values()) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      for (const video of videos.values()) video.remove();
      videos.clear();
      delete document.body.dataset.cinematicStatus;
      delete document.body.dataset.cinematicChapter;
      delete document.body.dataset.cinematicProgress;
      delete document.body.dataset.cinematicFrameRate;
      delete document.body.dataset.cinematicSource;
    };
  }, []);

  useEffect(() => {
    if (!reducedMotion) return;
    const videos = document.querySelectorAll<HTMLVideoElement>('video[data-pelagic-film]');
    videos.forEach((video) => video.pause());
  }, [reducedMotion]);

  useEffect(() => {
    const event = new Event('resize');
    window.dispatchEvent(event);
  }, [quality]);

  return (
    <div
      data-testid="pelagic-cinematic-reel"
      className="pointer-events-none fixed inset-0 z-0 h-dvh w-full overflow-hidden bg-[#041522]"
      aria-hidden="true"
    >
      <canvas ref={canvasRef} data-testid="pelagic-film-canvas" className="block h-full w-full" />
    </div>
  );
}
