import { LoaderStateUpdate } from '../experience/OceanSceneController';

export interface LoadingOverlayProps {
  loaderState: LoaderStateUpdate;
}

const PROGRESS_WIDTH_CLASSES: readonly string[] = [
  'w-[5%]',
  'w-[10%]',
  'w-[15%]',
  'w-[20%]',
  'w-[25%]',
  'w-[30%]',
  'w-[35%]',
  'w-[40%]',
  'w-[45%]',
  'w-[50%]',
  'w-[55%]',
  'w-[60%]',
  'w-[65%]',
  'w-[70%]',
  'w-[75%]',
  'w-[80%]',
  'w-[85%]',
  'w-[90%]',
  'w-[95%]',
  'w-full',
];

function getProgressWidthClass(pct: number): string {
  const clamped = Math.max(0, Math.min(100, pct));
  const idx = Math.min(
    PROGRESS_WIDTH_CLASSES.length - 1,
    Math.max(0, Math.round((clamped / 100) * (PROGRESS_WIDTH_CLASSES.length - 1))),
  );
  return PROGRESS_WIDTH_CLASSES[idx];
}

export function LoadingOverlay({ loaderState }: LoadingOverlayProps) {
  const isFinished =
    loaderState.status === 'ready' || loaderState.status === 'fallback-fish';

  if (isFinished) {
    return null;
  }

  const isContextLost = loaderState.status === 'context-lost';
  const pct = loaderState.progressPercent;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={loaderState.message}
      className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-[#020915] px-6 text-[#e6f1f8]"
    >
      <div className="w-full max-w-md space-y-5">
        <div className="space-y-1.5">
          <p className="font-mono text-[11px] tracking-[0.22em] text-cyan-200/75">
            PELAGIC — THE DEEP DESCENT
          </p>
          <h2 className="font-serif text-2xl font-medium tracking-tight text-slate-100 sm:text-3xl">
            {isContextLost ? 'Tạm ngưng ngữ cảnh đồ họa 3D' : 'Chuẩn bị hành trình lặn sâu'}
          </h2>
        </div>

        <div className="h-[2px] w-full overflow-hidden bg-cyan-200/15">
          {pct !== null ? (
            <div
              className={`h-full bg-cyan-300 transition-[width] duration-200 ease-out ${getProgressWidthClass(pct)}`}
            />
          ) : (
            <div className="pelagic-indeterminate-bar h-full w-2/5 bg-cyan-300/85" />
          )}
        </div>

        <div className="flex items-center justify-between font-mono text-xs text-slate-300/80">
          <span>{loaderState.message}</span>
          {pct !== null && <span className="tabular-nums">{pct}%</span>}
        </div>
      </div>
    </div>
  );
}
