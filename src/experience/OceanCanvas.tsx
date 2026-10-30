import { useEffect, useRef } from 'react';
import {
  LoaderStateUpdate,
  OceanSceneController,
  TelemetryUpdate,
} from './OceanSceneController';
import { QualityTierOption } from '../lib/qualityTier';

export interface OceanCanvasProps {
  quality: QualityTierOption;
  reducedMotion: boolean;
  onTelemetry: (data: TelemetryUpdate) => void;
  onLoaderState: (state: LoaderStateUpdate) => void;
}

export function OceanCanvas({
  quality,
  reducedMotion,
  onTelemetry,
  onLoaderState,
}: OceanCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const controllerRef = useRef<OceanSceneController | null>(null);

  // Store latest React callbacks in refs so HUD re-renders never tear down WebGLRenderer
  const telemetryCbRef = useRef(onTelemetry);
  const loaderCbRef = useRef(onLoaderState);
  const initialQualityRef = useRef(quality);
  const initialReducedRef = useRef(reducedMotion);

  telemetryCbRef.current = onTelemetry;
  loaderCbRef.current = onLoaderState;

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const controller = new OceanSceneController({
      container,
      initialQuality: initialQualityRef.current,
      reducedMotion: initialReducedRef.current,
      onTelemetry: (data) => telemetryCbRef.current(data),
      onLoaderState: (state) => loaderCbRef.current(state),
    });
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    controllerRef.current?.setQualityOption(quality);
  }, [quality]);

  useEffect(() => {
    controllerRef.current?.setReducedMotion(reducedMotion);
  }, [reducedMotion]);

  return (
    <div
      ref={mountRef}
      data-testid="pelagic-stage-mount"
      aria-hidden="true"
      className="fixed inset-0 z-0 h-dvh w-full overflow-hidden bg-[#020813]"
    />
  );
}
