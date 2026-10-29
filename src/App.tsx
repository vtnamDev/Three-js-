import { useCallback, useEffect, useRef, useState } from 'react';
import { OceanCanvas } from './experience/OceanCanvas';
import { LoaderStateUpdate, TelemetryUpdate } from './experience/OceanSceneController';
import { OCEAN_CHAPTERS } from './lib/chapterConfig';
import { OceanAmbienceEngine } from './lib/oceanAudio';
import { QualityTierOption, detectWebGLSupport } from './lib/qualityTier';
import { DepthHUD } from './ui/DepthHUD';
import { LoadingOverlay } from './ui/LoadingOverlay';
import { MarineFieldNotesDrawer } from './ui/MarineFieldNotesDrawer';
import { SourceCodeModal } from './ui/SourceCodeModal';
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
  const [quality, setQuality] = useState<QualityTierOption>('auto');
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => getInitialReducedMotion());
  const [audioEnabled, setAudio¶»§q«^