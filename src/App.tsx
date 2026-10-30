import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { LoaderStateUpdate, TelemetryUpdate } from './experience/OceanSceneController';
import { OCEAN_CHAPTERS } from './lib/chapterConfig';
import { OceanAmbienceEngine } from './lib/oceanAudio';
import { QualityTierOption, detectWebGLSupport } from './lib/qualityTier';
import { DepthHUD } from './ui/DepthHUD';
import { LoadingOverlay } from './ui/LoadingOverlay';

import { WebGLFallback } from './ui/WebGLFallback';

const OceanCanvas = lazy(() =>
  import('./experience/OceanCanvas').then((module) => ({ default: module.OceanCanvas })),
);
const MarineFieldNotesDrawer = lazy(() =>
  import('./ui/MarineFieldNotesDrawer').then((module) => ({ default: module.MarineFieldNotesDrawer })),
);
const SourceCodeModal = lazy(() =>
  import('./ui/SourceCodeModal').then((module) => ({ default: module.SourceCodeModal })),
);

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
  const [quality, setQuality] = useState<QualityTierOption>('auto');
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => getInitialReducedMotion());
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [dockExpanded, setDockExpanded] = useState<boolean>(false);
  const [notesOpen, setNotesOpen] = useState<boolean>(false);
  const [sourceOpen, setSourceOpen] = useState<boolean>(false);
  const audioRef = useRef<OceanAmbienceEngine | null>(null);

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

  useEffect(() => {
    audioRef.current?.setDepthProgress(telemetry.progress);
  }, [telemetry.progress]);

  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  const handleToggleAudio = useCallback(() => {
    if (!audioRef.current) {
      audioRef.current = new OceanAmbienceEngine();
    }
    const next = audioRef.current.toggle();
    setAudioEnabled(next);
    if (next) {
      audioRef.current.setDepthProgress(telemetry.progress);
    }
  }, [telemetry.progress]);

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

      if (e.key === 'Escape') {
        if (sourceOpen) {
          setSourceOpen(false);
          return;
        }
        if (notesOpen) {
          setNotesOpen(false);
          return;
        }
      }

      if (sourceOpen) return;

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
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [webglSupported, notesOpen, sourceOpen, scrollToProgress]);

  if (!webglSupported) {
    return <WebGLFallback />;
  }

  return (
    <div className="relative w-full select-none">
      {/* Persistent Single-Owner 3D WebGL Ocean Stage */}
      <Suspense fallback={null}>
        <OceanCanvas
          quality={quality}
          reducedMotion={reducedMotion}
          onTelemetry={setTelemetry}
          onLoaderState={setLoaderState}
        />
      </Suspense>

      {/* Honest Asset Loading Overlay */}
      <LoadingOverlay loaderState={loaderState} />

      {/* Minimal Bathymetric HUD & Controls */}
      <DepthHUD
        chapter={telemetry.chapter}
        depthMeters={telemetry.depthMeters}
        progress={telemetry.progress}
        quality={quality}
        reducedMotion={reducedMotion}
        audioEnabled={audioEnabled}
        dockExpanded={dockExpanded}
        notesOpen={notesOpen}
        sourceOpen={sourceOpen}
        fallbackFishActive={loaderState.status === 'fallback-fish'}
        onSelectQuality={setQuality}
        onToggleReducedMotion={() => setReducedMotion((prev) => !prev)}
        onToggleAudio={handleToggleAudio}
        onToggleDock={() => setDockExpanded((prev) => !prev)}
        onToggleNotes={() => setNotesOpen((prev) => !prev)}
        onOpenSource={() => setSourceOpen(true)}
        onJumpToProgress={scrollToProgress}
        onReturnToSurface={handleReturnToSurface}
      />

      {/* Optional Collapsible Oceanographer Field Notes Drawer (Closed by Default) */}
      <Suspense fallback={null}>
        <MarineFieldNotesDrawer
          open={notesOpen}
          chapter={telemetry.chapter}
          depthMeters={telemetry.depthMeters}
          onClose={() => setNotesOpen(false)}
        />
      </Suspense>

      {/* Interactive Source Code Explorer & ZIP Download Modal */}
      <Suspense fallback={null}>
        <SourceCodeModal open={sourceOpen} onClose={() => setSourceOpen(false)} />
      </Suspense>

      {/* Canonical Native Scroll Track (880vh across 8 proportional depth chapters) */}
      <main
        aria-label="Hành trình lặn sâu qua tám tầng đại dương"
        className="relative z-10 w-full pointer-events-none"
      >
        {OCEAN_CHAPTERS.map((ch) => {
          const spanClassMap: Record<number, string> = {
            0: 'h-[97vh]',
            1: 'h-[106vh]',
            2: 'h-[114vh]',
            3: 'h-[123vh]',
            4: 'h-[123vh]',
            5: 'h-[114vh]',
            6: 'h-[106vh]',
            7: 'h-[97vh]',
          };
          const heightClass = spanClassMap[ch.index] ?? 'h-[110vh]';
          return (
            <section
              key={ch.id}
              id={`zone-${ch.id}`}
              aria-label={`Tầng ${ch.code}: ${ch.zoneNameVi} (${ch.minDepthMeters} đến ${ch.maxDepthMeters} mét)`}
              className={`w-full ${heightClass}`}
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
