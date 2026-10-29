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
            PELAGIC â€” TH¶»§q«^