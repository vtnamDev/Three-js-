import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Code2,
  Download,
  SlidersHorizontal,
  Volume2,
  VolumeX,
} from 'lucide-react';
import {
  OCEAN_CHAPTERS,
  OceanChapter,
  TitleRevealMode,
  getChapterTitleTransition,
} from '../lib/chapterConfig';
import { QualityTierOption } from '../lib/qualityTier';

export interface DepthHUDProps {
  chapter: OceanChapter;
  depthMeters: number;
  progress: number;
  quality: QualityTierOption;
  reducedMotion: boolean;
  audioEnabled: boolean;
  dockExpanded: boolean;
  notesOpen: boolean;
  sourceOpen: boolean;
  fallbackFishActive: boolean;
  onSelectQuality: (q: QualityTierOption) => void;
  onToggleReducedMotion: () => void;
  onToggleAudio: () => void;
  onToggleDock: () => void;
  onToggleNotes: () => void;
  onOpenSource: () => void;
  onJumpToProgress: (targetProgress: number) => void;
  onReturnToSurface: () => void;
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

const REVEAL_CLASS_MAP: Record<TitleRevealMode, string> = {
  'clip-rise': 'pelagic-reveal-clip-rise',
  'horizon-wipe': 'pelagic-reveal-horizon-wipe',
  'split-descent': 'pelagic-reveal-split-descent',
  'stagger-track': 'pelagic-reveal-stagger-track',
  'abyss-focus': 'pelagic-reveal-abyss-focus',
  'sediment-line': 'pelagic-reveal-sediment-line',
  'canyon-shear': 'pelagic-reveal-canyon-shear',
  'hadal-sanctuary': 'pelagic-reveal-hadal-sanctuary',
};

export function DepthHUD({
  chapter,
  depthMeters,
  progress,
  quality,
  reducedMotion,
  audioEnabled,
  dockExpanded,
  notesOpen,
  sourceOpen,
  fallbackFishActive,
  onSelectQuality,
  onToggleReducedMotion,
  onToggleAudio,
  onToggleDock,
  onToggleNotes,
  onOpenSource,
  onJumpToProgress,
  onReturnToSurface,
}: DepthHUDProps) {
  const formattedDepth = numberFormatter.format(depthMeters);
  const showSurfaceCue = progress < 0.035;
  const showHadalEpilogue = progress >= 0.91;
  const titleTransition = getChapterTitleTransition(progress);
  const titleRevealClass = reducedMotion
    ? 'pelagic-reveal-reduced'
    : REVEAL_CLASS_MAP[chapter.titleRevealMode];
  const boundaryDissolveClass =
    !reducedMotion && titleTransition.dissolveOut > 0.62
      ? 'opacity-80 transition-opacity duration-200'
      : 'opacity-100 transition-opacity duration-200';

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-3.5 sm:p-6 lg:p-8">
      {/* Polite screen-reader announcement triggered only on chapter transition */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {`Tầng ${chapter.code}: ${chapter.zoneNameVi} (${chapter.zoneNameEn})`}
      </div>

      {/* Top atmospheric scrim ensuring WCAG AA/AAA contrast over bright surface caustics */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 -z-10 h-40 bg-gradient-to-b from-[#020c18]/88 via-[#031324]/56 to-transparent sm:h-44"
      />

      {/* Top Row: Editorial Chapter Identity (Left) + Bathymetric Depth Readout (Right) */}
      <header className="flex items-start justify-between gap-3">
        <div
          key={chapter.id}
          data-testid="hud-chapter-block"
          data-chapter-code={chapter.code}
          data-reveal-mode={chapter.titleRevealMode}
          className={`max-w-[62vw] space-y-1 sm:max-w-lg sm:space-y-1.5 ${boundaryDissolveClass}`}
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-[10px] tracking-[0.18em] text-cyan-50/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.92)] sm:text-[11px]">
            <span>PELAGIC</span>
            <span aria-hidden="true" className="text-cyan-200/70">
              ·
            </span>
            <span className="tabular-nums text-cyan-100">
              {chapter.code}. {chapter.zoneNameEn}
            </span>
          </div>
          <h1
            data-testid="hud-chapter-title"
            className={`font-serif text-2xl font-semibold leading-tight tracking-tight text-balance text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)] sm:text-4xl lg:text-[2.6rem] ${titleRevealClass}`}
          >
            {chapter.zoneNameVi}
          </h1>
          <p className="max-w-md text-xs leading-relaxed text-slate-100/95 drop-shadow-[0_1px_8px_rgba(0,0,0,0.92)] sm:text-sm">
            {chapter.captionVi}
          </p>
        </div>

        {/* Top-Right Bathymetric Depth Gauge (E20) */}
        <div className="flex shrink-0 flex-col items-end whitespace-nowrap text-right">
          <span className="font-mono text-[9px] tracking-[0.16em] text-cyan-50/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.92)] sm:text-[10px] sm:tracking-[0.2em]">
            ĐỘ SÂU ĐẠI DƯƠNG
          </span>
          <div
            data-testid="hud-depth-readout"
            aria-live="off"
            className="flex items-baseline gap-1 font-mono text-2xl font-semibold tabular-nums tracking-tight text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.92)] sm:text-4xl"
          >
            <span>{formattedDepth}</span>
            <span className="text-xs font-normal text-cyan-100/95 sm:text-lg">m</span>
          </div>
          <span className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-100/95 drop-shadow-[0_1px_6px_rgba(0,0,0,0.92)] sm:text-[11px]">
            {Math.round(progress * 100)}% hành trình
          </span>
        </div>
      </header>

      {/* Right-Edge Bathymetric Chapter Rail */}
      <nav
        aria-label="Các tầng độ sâu đại dương"
        className="pointer-events-auto fixed right-2.5 top-1/2 z-20 -translate-y-1/2 sm:right-6 lg:right-8"
      >
        <ol className="flex flex-col items-end gap-1.5 sm:gap-2">
          {OCEAN_CHAPTERS.map((ch) => {
            const isActive = ch.index === chapter.index;
            const midProgress =
              ch.index === 0
                ? 0
                : ch.index === OCEAN_CHAPTERS.length - 1
                  ? 0.95
                  : (ch.startProgress + ch.endProgress) * 0.5;
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => onJumpToProgress(midProgress)}
                  aria-label={`Tầng ${ch.code}: ${ch.zoneNameVi} (${ch.minDepthMeters} đến ${ch.maxDepthMeters} mét)`}
                  aria-current={isActive ? 'step' : undefined}
                  className="group flex min-h-[24px] items-center gap-2 py-0.5 text-right focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
                >
                  <span
                    className={`hidden font-mono text-[10px] tracking-[0.12em] transition-opacity duration-200 md:inline ${
                      isActive
                        ? 'bg-[#03101f]/84 px-2 py-0.5 text-cyan-50 opacity-100 shadow-sm'
                        : 'bg-[#03101f]/70 px-1.5 py-0.5 text-slate-200/85 opacity-0 group-hover:opacity-95'
                    }`}
                  >
                    {ch.code} · {ch.zoneNameVi}
                  </span>
                  <span
                    className={`block transition-all duration-200 ${
                      isActive
                        ? 'h-5 w-[3px] bg-cyan-200 shadow-[0_0_8px_rgba(165,243,252,0.7)]'
                        : 'h-2.5 w-[2px] bg-cyan-100/40 group-hover:bg-cyan-100/80'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Bottom Row: Compact Utility Controls Dock + Contextual Scroll Cue / Hadal Return CTA */}
      <footer className="flex flex-col-reverse items-stretch justify-between gap-2 sm:flex-row sm:items-end">
        {/* Compact Utility Dock (solid dark ocean slate surface, zero backdrop-filter over WebGL) */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={onToggleDock}
            aria-expanded={dockExpanded}
            aria-controls="pelagic-settings-panel"
            aria-label="Mở thiết lập chất lượng đồ họa và chuyển động"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 whitespace-nowrap border border-cyan-200/20 bg-[#040f1d]/90 px-2.5 py-2 font-mono text-[10px] tracking-[0.08em] text-slate-100 transition-colors hover:border-cyan-200/45 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 sm:px-3.5 sm:text-[11px]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-300/85" />
            <span>Thiết lập</span>
          </button>

          <button
            type="button"
            onClick={onToggleAudio}
            aria-pressed={audioEnabled}
            aria-label={
              audioEnabled
                ? 'Tắt âm thanh dòng chảy đại dương'
                : 'Bật âm thanh dòng chảy đại dương'
            }
            className={`flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 whitespace-nowrap border px-2.5 py-2 font-mono text-[10px] tracking-[0.08em] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 sm:px-3.5 sm:text-[11px] ${
              audioEnabled
                ? 'border-cyan-300/55 bg-[#08223a]/94 text-cyan-100'
                : 'border-cyan-200/20 bg-[#040f1d]/90 text-slate-100 hover:border-cyan-200/45 hover:text-white'
            }`}
          >
            {audioEnabled ? (
              <Volume2 className="h-3.5 w-3.5 text-cyan-300" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-cyan-300/80" />
            )}
            <span className="hidden sm:inline">Âm thanh</span>
          </button>

          <button
            type="button"
            onClick={onToggleNotes}
            aria-expanded={notesOpen}
            aria-controls="pelagic-field-notes-drawer"
            aria-label="Mở sổ tay hải dương học"
            className={`flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 whitespace-nowrap border px-2.5 py-2 font-mono text-[10px] tracking-[0.08em] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 sm:px-3.5 sm:text-[11px] ${
              notesOpen
                ? 'border-cyan-300/55 bg-[#08223a]/94 text-cyan-100'
                : 'border-cyan-200/20 bg-[#040f1d]/90 text-slate-100 hover:border-cyan-200/45 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-cyan-300/85" />
            <span>Sổ tay</span>
          </button>

          <button
            type="button"
            onClick={onOpenSource}
            aria-haspopup="dialog"
            aria-expanded={sourceOpen}
            aria-label="Xem mã nguồn dự án PELAGIC V9"
            className={`flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 whitespace-nowrap border px-2.5 py-2 font-mono text-[10px] tracking-[0.08em] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 sm:px-3.5 sm:text-[11px] ${
              sourceOpen
                ? 'border-cyan-300/55 bg-[#08223a]/94 text-cyan-100'
                : 'border-cyan-200/20 bg-[#040f1d]/90 text-slate-100 hover:border-cyan-200/45 hover:text-white'
            }`}
          >
            <Code2 className="h-3.5 w-3.5 text-cyan-300/85" />
            <span className="hidden sm:inline">Mã nguồn</span>
          </button>

          <a
            href="https://github.com/vtnamDev/Three-js-/archive/refs/heads/main.zip"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Tải gói mã nguồn PELAGIC_V9_SOURCE.zip"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center gap-1.5 whitespace-nowrap border border-cyan-200/20 bg-[#040f1d]/90 px-2.5 py-2 font-mono text-[10px] tracking-[0.08em] text-slate-100 transition-colors hover:border-cyan-200/45 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 sm:px-3.5 sm:text-[11px]"
          >
            <Download className="h-3.5 w-3.5 text-cyan-300/85" />
            <span>ZIP</span>
          </a>

          {dockExpanded && (
            <div
              id="pelagic-settings-panel"
              className="flex flex-wrap items-center gap-3 border border-cyan-200/20 bg-[#040f1d]/94 px-3 py-2 text-xs text-slate-200"
            >
              <label className="flex items-center gap-2 font-mono text-[11px] text-slate-200">
                <span>Đồ họa</span>
                <select
                  aria-label="Mức chất lượng đồ họa 3D"
                  value={quality}
                  onChange={(e) => onSelectQuality(e.target.value as QualityTierOption)}
                  className="min-h-[32px] border border-cyan-200/25 bg-[#07192e] px-2 py-1 font-mono text-[11px] text-cyan-100 focus:border-cyan-300 focus:outline-none"
                >
                  <option value="auto">Tự động (Auto)</option>
                  <option value="high">Cao (High)</option>
                  <option value="balanced">Cân bằng (Balanced)</option>
                  <option value="low">Tiết kiệm (Low)</option>
                </select>
              </label>

              <button
                type="button"
                aria-pressed={reducedMotion}
                onClick={onToggleReducedMotion}
                className={`min-h-[32px] border px-2.5 py-1 font-mono text-[11px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 ${
                  reducedMotion
                    ? 'border-cyan-300/60 bg-cyan-950/85 text-cyan-100'
                    : 'border-cyan-200/25 bg-[#07192e] text-slate-200 hover:text-white'
                }`}
              >
                Giảm chuyển động: {reducedMotion ? 'Bật' : 'Tắt'}
              </button>

              {fallbackFishActive && (
                <span className="font-mono text-[10px] text-amber-200/85">
                  Chế độ cá dự phòng
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contextual Action: Surface Scroll Cue OR Hadal Sanctuary Return CTA */}
        <div className="pointer-events-auto mr-3.5 self-end sm:mr-0">
          {showSurfaceCue && (
            <div
              data-testid="surface-scroll-cue"
              className="flex items-center gap-2 border border-cyan-200/25 bg-[#040f1d]/88 px-3 py-1.5 font-mono text-[10px] tracking-[0.14em] text-cyan-50 sm:text-[11px]"
            >
              <span>Cuộn xuống để lặn sâu</span>
              <ArrowDown className="h-3.5 w-3.5 text-cyan-200" />
            </div>
          )}

          {showHadalEpilogue && (
            <div
              data-testid="hadal-epilogue-panel"
              className="max-w-[17.5rem] space-y-2 border border-cyan-200/25 bg-[#04101f]/92 p-3 text-right sm:max-w-sm sm:space-y-2.5 sm:p-4"
            >
              <p className="text-[11px] leading-snug text-slate-200/95 sm:text-xs sm:leading-relaxed">
                10.920 m — Nơi áp suất ngàn lần mặt biển vẫn không dập tắt được nhịp bơi và ánh sáng hóa tổng hợp dưới đáy rãnh Hadal.
              </p>
              <button
                type="button"
                data-testid="return-to-surface-btn"
                onClick={onReturnToSurface}
                className="inline-flex min-h-[40px] items-center gap-2 border border-cyan-300/55 bg-[#0a2742] px-3.5 py-2 font-mono text-[11px] tracking-[0.14em] text-cyan-50 transition-colors hover:border-cyan-200 hover:bg-[#10385e] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 sm:px-4 sm:text-xs"
              >
                <ArrowUp className="h-3.5 w-3.5" />
                <span>Trở về mặt nước</span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}
