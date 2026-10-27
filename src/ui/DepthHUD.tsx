import { ArrowDown, ArrowUp, BookOpen, Download, SlidersHorizontal } from 'lucide-react';
import { OCEAN_CHAPTERS, OceanChapter } from '../lib/chapterConfig';
import { QualityTierOption } from '../lib/qualityTier';

export interface DepthHUDProps {
  chapter: OceanChapter;
  depthMeters: number;
  progress: number;
  quality: QualityTierOption;
  reducedMotion: boolean;
  dockExpanded: boolean;
  notesOpen: boolean;
  fallbackFishActive: boolean;
  onSelectQuality: (q: QualityTierOption) => void;
  onToggleReducedMotion: () => void;
  onToggleDock: () => void;
  onToggleNotes: () => void;
  onJumpToProgress: (targetProgress: number) => void;
  onReturnToSurface: () => void;
}

const numberFormatter = new Intl.NumberFormat('vi-VN');

export function DepthHUD({
  chapter,
  depthMeters,
  progress,
  quality,
  reducedMotion,
  dockExpanded,
  notesOpen,
  fallbackFishActive,
  onSelectQuality,
  onToggleReducedMotion,
  onToggleDock,
  onToggleNotes,
  onJumpToProgress,
  onReturnToSurface,
}: DepthHUDProps) {
  const formattedDepth = numberFormatter.format(depthMeters);
  const showSurfaceCue = progress < 0.035;
  const showHadalEpilogue = progress >= 0.91;

  return (
    <div className="pointer-events-none fixed inset-0 z-20 flex flex-col justify-between p-4 sm:p-6 lg:p-8">
      {/* Top Row: Editorial Chapter Identity (Left) + Bathymetric Depth Readout (Right) */}
      <header className="flex items-start justify-between gap-3">
        <div className="max-w-[60vw] space-y-1 sm:max-w-md sm:space-y-1.5">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-100/75 sm:text-[11px]">
            <span>PELAGIC</span>
            <span className="text-cyan-300/40">/</span>
            <span className="tabular-nums text-cyan-200/90">
              TẦNG {chapter.code} · {chapter.zoneNameEn}
            </span>
          </div>
          <h1
            data-testid="hud-chapter-title"
            className="font-serif text-2xl font-semibold leading-tight tracking-tight text-[#f0f7fc] drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] sm:text-4xl"
          >
            {chapter.zoneNameVi}
          </h1>
          <p className="max-w-sm text-xs leading-relaxed text-slate-200/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.75)] sm:text-sm">
            {chapter.captionVi}
          </p>
        </div>

        {/* Top-Right Bathymetric Depth Gauge */}
        <div className="flex shrink-0 flex-col items-end whitespace-nowrap text-right">
          <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-cyan-100/70 sm:text-[10px] sm:tracking-[0.22em]">
            ĐỘ SÂU ĐẠI DƯƠNG
          </span>
          <div
            data-testid="hud-depth-readout"
            aria-live="off"
            className="flex items-baseline gap-1 font-mono text-2xl font-medium tabular-nums tracking-tight text-[#f2f9fd] drop-shadow-[0_2px_10px_rgba(0,0,0,0.7)] sm:text-4xl"
          >
            <span>{formattedDepth}</span>
            <span className="text-xs font-normal text-cyan-200/80 sm:text-lg">m</span>
          </div>
          <span className="mt-0.5 font-mono text-[10px] tabular-nums text-slate-300/70 sm:text-[11px]">
            {Math.round(progress * 100)}% HÀNH TRÌNH
          </span>
        </div>
      </header>

      {/* Right-Edge Bathymetric Chapter Rail (Desktop & Tablet, compact on Mobile) */}
      <nav
        aria-label="Các tầng độ sâu đại dương"
        className="pointer-events-auto fixed right-3 top-1/2 z-20 -translate-y-1/2 sm:right-6 lg:right-8"
      >
        <ol className="flex flex-col items-end gap-2">
          {OCEAN_CHAPTERS.map((ch) => {
            const isActive = ch.index === chapter.index;
            const midProgress =
              ch.index === 0
                ? 0
                : ch.index === OCEAN_CHAPTERS.length - 1
                  ? 0.96
                  : (ch.startProgress + ch.endProgress) * 0.5;
            return (
              <li key={ch.id}>
                <button
                  type="button"
                  onClick={() => onJumpToProgress(midProgress)}
                  aria-label={`Tầng ${ch.code}: ${ch.zoneNameVi} (${ch.minDepthMeters} đến ${ch.maxDepthMeters} mét)`}
                  aria-current={isActive ? 'step' : undefined}
                  className="group flex items-center gap-2.5 py-0.5 text-right focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
                >
                  <span
                    className={`hidden font-mono text-[10px] tracking-[0.16em] transition-opacity duration-200 md:inline ${
                      isActive
                        ? 'text-cyan-100 opacity-100'
                        : 'text-slate-300/60 opacity-0 group-hover:opacity-90'
                    }`}
                  >
                    {ch.code} · {ch.zoneNameVi}
                  </span>
                  <span
                    className={`block transition-all duration-200 ${
                      isActive
                        ? 'h-5 w-[3px] bg-cyan-200'
                        : 'h-2.5 w-[2px] bg-cyan-100/30 group-hover:bg-cyan-100/70'
                    }`}
                  />
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Bottom Row: Compact Collapsible Controls Dock + Surface Scroll Cue / Hadal Return CTA */}
      <footer className="flex flex-col-reverse items-start justify-between gap-3 sm:flex-row sm:items-end">
        {/* Compact Utility Dock (solid dark slate rgba surface, ZERO backdrop-filter over WebGL) */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleDock}
            aria-expanded={dockExpanded}
            aria-controls="pelagic-settings-panel"
            className="flex items-center gap-2 border border-cyan-200/15 bg-[#040f1d]/88 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-cyan-200/40 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-cyan-300/80" />
            <span>Thiết lập</span>
          </button>

          <button
            type="button"
            onClick={onToggleNotes}
            aria-expanded={notesOpen}
            aria-controls="pelagic-field-notes-drawer"
            className={`flex items-center gap-2 border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 ${
              notesOpen
                ? 'border-cyan-300/50 bg-[#08223a]/92 text-cyan-100'
                : 'border-cyan-200/15 bg-[#040f1d]/88 text-slate-200 hover:border-cyan-200/40 hover:text-white'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-cyan-300/80" />
            <span>Sổ tay Hải dương</span>
          </button>

          <a
            href="/PELAGIC_V4_SOURCE.zip"
            download="PELAGIC_V4_SOURCE.zip"
            aria-label="Tải gói mã nguồn PELAGIC_V4_SOURCE.zip"
            className="flex items-center gap-2 border border-cyan-200/15 bg-[#040f1d]/88 px-3 py-2 font-mono text-[11px] uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-cyan-200/40 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
          >
            <Download className="h-3.5 w-3.5 text-cyan-300/80" />
            <span>Tải ZIP</span>
          </a>

          {dockExpanded && (
            <div
              id="pelagic-settings-panel"
              className="flex flex-wrap items-center gap-3 border border-cyan-200/15 bg-[#040f1d]/92 px-3 py-1.5 text-xs text-slate-200"
            >
              <label className="flex items-center gap-2 font-mono text-[11px] text-slate-300">
                <span>ĐỒ HỌA</span>
                <select
                  aria-label="Mức chất lượng đồ họa 3D"
                  value={quality}
                  onChange={(e) => onSelectQuality(e.target.value as QualityTierOption)}
                  className="border border-cyan-200/20 bg-[#07192e] px-2 py-1 font-mono text-[11px] text-cyan-100 focus:border-cyan-300 focus:outline-none"
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
                className={`border px-2.5 py-1 font-mono text-[11px] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300 ${
                  reducedMotion
                    ? 'border-cyan-300/60 bg-cyan-950/80 text-cyan-100'
                    : 'border-cyan-200/20 bg-[#07192e] text-slate-300 hover:text-white'
                }`}
              >
                Giảm chuyển động: {reducedMotion ? 'Bật' : 'Tắt'}
              </button>

              {fallbackFishActive && (
                <span className="font-mono text-[10px] text-amber-200/80">
                  Chế độ cá dự phòng
                </span>
              )}
            </div>
          )}
        </div>

        {/* Contextual Action: Surface Scroll Cue OR Hadal Sanctuary Return CTA */}
        <div className="pointer-events-auto self-end">
          {showSurfaceCue && (
            <div
              data-testid="surface-scroll-cue"
              className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-cyan-100/85 drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]"
            >
              <span>Cuộn xuống để lặn sâu</span>
              <ArrowDown className="h-3.5 w-3.5 text-cyan-200" />
            </div>
          )}

          {showHadalEpilogue && (
            <div
              data-testid="hadal-epilogue-panel"
              className="max-w-sm space-y-2.5 border border-cyan-200/20 bg-[#04101f]/90 p-4 text-right"
            >
              <p className="text-xs leading-relaxed text-slate-200/90">
                10.920 m — Nơi áp suất ngàn lần mặt biển vẫn không dập tắt được nhịp bơi và ánh sáng hóa tổng hợp dưới đáy vực Hadal.
              </p>
              <button
                type="button"
                data-testid="return-to-surface-btn"
                onClick={onReturnToSurface}
                className="inline-flex items-center gap-2 border border-cyan-300/50 bg-[#0a2742] px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] text-cyan-50 transition-colors hover:border-cyan-200 hover:bg-[#10385e] focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
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
