import { useCallback, useEffect, useState } from 'react';
import { OceanCanvas } from './experience/OceanCanvas';
import { CinematicReel } from './experience/CinematicReel';
import { LoaderStateUpdate, TelemetryUpdate } from './experience/OceanSceneController';
import { OCEAN_CHAPTERS } from './lib/chapterConfig';
import { QualityTierOption, detectWebGLSupport } from './lib/qualityTier';
import { DepthHUD } from './ui/DepthHUD';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { MarineFieldNotesDrawer } from './ui/MarineFieldNotesDrawer';
import { WebGLFallback } from './ui/WebGLFallback';

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get('motion') === 'reduced') return true;
  if (params.get('motion') === 'full') return false;
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
}

function getInitialAutostart(): boolean {
  if (typeof window === 'undefined') return false;
  return new URLSearchParams(window.location.search).get('autostart') === '1';
}

export default function App() {
  const [webglSupported] = useState<boolean>(() => detectWebGLSupport());
  const [renderMode] = useState<'webgl' | 'cinematic'>(() => {
    const mode = new URLSearchParams(window.location.search).get('mode');
    return mode === 'cinematic' ? 'cinematic' : 'webgl';
  });
  const forceWebGL = renderMode === 'webgl';
  const [cinematicFailed, setCinematicFailed] = useState<boolean>(false);
  const [webglFailed, setWebglFailed] = useState<boolean>(false);
  const [quality, setQuality] = useState<QualityTierOption>('auto');
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => getInitialReducedMotion());
  const [dockExpanded, setDockExpanded] = useState<boolean>(false);
  const [notesOpen, setNotesOpen] = useState<boolean>(false);

  const [telemetry, setTelemetry] = useState<TelemetryUpdate>({
    progress: 0,
    depthMeters: 0,
    chapter: OCEAN_CHAPTERS[0],
    fpsEstimate: null,
  });

  const [loaderState, setLoaderState] = useState<LoaderStateUpdate>(() =>
    getInitialAutostart()
      ? { status: 'ready', progressPercent: 100, message: 'Sẵn sàng lặn sâu.' }
      : {
          status: 'loading',
          progressPercent: null,
          message: 'Đang khởi tạo không gian đại dương 3D...',
        },
  );

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const scrollToProgress = useCallback(
    (targetProgress: number) => {
      const clamped = Math.max(0, Math.min(1, targetProgress));
      const maxScroll = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      window.scrollTo({
        top: clamped * maxScroll,
        behavior: reducedMotion ? 'instant' : 'smooth',
      });
    },
    [reducedMotion],
  );

  const handleReturnToSurface = useCallback(() => {
    scrollToProgress(0);
  }, [scrollToProgress]);

  // Keyboard navigation on window (ArrowUp/Down, W/S, Home/End, H for settings dock)
  useEffect(() => {
    if (!webglSupported) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const stepPx = Math.max(120, Math.round(window.innerHeight * 0.18));
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        window.scrollBy({ top: stepPx, behavior: 'auto' });
      } else if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        window.scrollBy({ top: -stepPx, behavior: 'auto' });
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToProgress(0);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToProgress(1);
      } else if (e.key === 'h' || e.key === 'H') {
        setDockExpanded((prev) => !prev);
      } else if (e.key === 'Escape' && notesOpen) {
        setNotesOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [webglSupported, notesOpen, scrollToProgress]);

  // Real-time Three.js is the default. Use ?mode=cinematic only to inspect the optional footage reel.
  // When WebGL is unsupported or fails, fall back to the footage reel instead of showing a blank scene.
  const useWebGL = forceWebGL && webglSupported && !webglFailed;

  if (!useWebGL && cinematicFailed) {
    return <WebGLFallback />;
  }

  return (
    <div className="relative w-full select-none">
      {/* Default to the persistent Three.js scene; video compositing is opt-in for debugging only. */}
      {useWebGL ? (
        <OceanCanvas
          quality={quality}
          reducedMotion={reducedMotion}
          onTelemetry={setTelemetry}
          onLoaderState={setLoaderState}
          onFallback={() => {
            setWebglFailed(true);
            setLoaderState({ status: 'loading', progressPercent: null, message: 'WebGL không khởi tạo được; đang chuyển sang cảnh quay dự phòng.' });
          }}
        />
      ) : (
        <CinematicReel
          reducedMotion={reducedMotion}
          quality={quality}
          onTelemetry={setTelemetry}
          onReady={() => setLoaderState({ status: 'ready', progressPercent: 100, message: 'Cảnh quay dự phòng đã sẵn sàng.' })}
          onFallback={() => {
            setCinematicFailed(true);
            setLoaderState({ status: 'ready', progressPercent: 100, message: 'Đang sử dụng giao diện dự phòng tĩnh.' });
          }}
        />
      )}

      {/* Honest Asset Loading Overlay */}
      <LoadingOverlay loaderState={loaderState} />

      {/* Minimal Bathymetric HUD & Controls */}
      <DepthHUD
        chapter={telemetry.chapter}
        depthMeters={telemetry.depthMeters}
        progress={telemetry.progress}
        quality={quality}
        reducedMotion={reducedMotion}
        dockExpanded={dockExpanded}
        notesOpen={notesOpen}
        fallbackFishActive={loaderState.status === 'fallback-fish'}
        onSelectQuality={setQuality}
        onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
        onToggleDock={() => setDockExpanded((prev) => !prev)}
        onToggleNotes={() => setNotesOpen((prev) => !prev)}
        onJumpToProgress={scrollToProgress}
        onReturnToSurface={handleReturnToSurface}
      />

      {/* Optional Collapsible Oceanographer Field Notes Drawer (Closed by Default) */}
      <MarineFieldNotesDrawer
        open={notesOpen}
        chapter={telemetry.chapter}
        depthMeters={telemetry.depthMeters}
        onClose={() => setNotesOpen(false)}
      />

      {/* Canonical Native Scroll Track (880vh across 8 proportional depth chapters) */}
      <main
        aria-label="Hành trình lặn sâu qua tám tầng đại dương"
        className="relative z-10 w-full pointer-events-none"
      >
        {OCEAN_CHAPTERS.map((ch) => {
          const spanVh = Math.round((ch.endProgress - ch.startProgress) * 880);
          return (
            <section
              key={ch.id}
              id={`zone-${ch.id}`}
              aria-label={`Tầng ${ch.code}: ${ch.zoneNameVi} (${ch.minDepthMeters} đến ${ch.maxDepthMeters} mét)`}
              style={{ height: `${spanVh}vh` }}
              className="w-full"
            >
              <div className="sr-only">
                <h2>
                  Tầng {ch.code}: {ch.zoneNameVi} ({ch.zoneNameEn})
                </h2>
                <p>{ch.captionVi}</p>
                <p>{ch.scientificNote}</p>
              </div>
            </section>
          );
        })}
      </main>
    </div>
  );
}
