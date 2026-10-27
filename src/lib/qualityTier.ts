export type QualityTierOption = 'auto' | 'high' | 'balanced' | 'low';
export type ResolvedQualityTier = 'high' | 'balanced' | 'low';

export interface QualityProfile {
  tier: ResolvedQualityTier;
  isSoftwareGl: boolean;
  dprCap: number;
  antialias: boolean;
  shadows: boolean;
  snowCount: number;
  schoolCount: number;
  jellyCount: number;
  sunShaftCount: number;
  terrainSegments: number;
}

let cachedSoftwareGl: boolean | null = null;

export function detectSoftwareGl(): boolean {
  if (cachedSoftwareGl !== null) return cachedSoftwareGl;
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    if (!gl) {
      cachedSoftwareGl = true;
      return true;
    }
    const glCtx = gl as WebGLRenderingContext;
    const ext = glCtx.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glCtx.RENDERER;
    const gpu = String(glCtx.getParameter(param) || '');
    glCtx.getExtension('WEBGL_lose_context')?.loseContext();
    cachedSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return cachedSoftwareGl;
  } catch {
    cachedSoftwareGl = true;
    return true;
  }
}

export function detectWebGLSupport(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get('webgl') === '0' || params.get('webgl') === 'fallback') {
    return false;
  }
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return false;
    (gl as WebGLRenderingContext).getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

export function resolveQualityProfile(
  option: QualityTierOption,
  viewportWidth: number,
  isSoftwareGl: boolean,
  reducedMotion: boolean,
): QualityProfile {
  const isMobile = viewportWidth < 768;
  let tier: ResolvedQualityTier;

  if (option === 'auto') {
    if (isSoftwareGl) {
      tier = 'balanced';
    } else if (isMobile) {
      tier = 'balanced';
    } else {
      tier = 'high';
    }
  } else {
    tier = option;
  }

  const motionParticleScale = reducedMotion ? 0.45 : 1.0;

  if (tier === 'low') {
    return {
      tier: 'low',
      isSoftwareGl,
      dprCap: 1.0,
      antialias: false,
      shadows: false,
      snowCount: Math.round(160 * motionParticleScale),
      schoolCount: 8,
      jellyCount: 6,
      sunShaftCount: 7,
      terrainSegments: 48,
    };
  }

  if (tier === 'balanced') {
    return {
      tier: 'balanced',
      isSoftwareGl,
      dprCap: isSoftwareGl ? 1.0 : isMobile ? 1.35 : 1.5,
      antialias: !isSoftwareGl,
      shadows: false,
      snowCount: Math.round(300 * motionParticleScale),
      schoolCount: 14,
      jellyCount: 10,
      sunShaftCount: 10,
      terrainSegments: 64,
    };
  }

  return {
    tier: 'high',
    isSoftwareGl,
    dprCap: isSoftwareGl ? 1.0 : isMobile ? 1.5 : 1.85,
    antialias: !isSoftwareGl,
    shadows: !isSoftwareGl,
    snowCount: Math.round(520 * motionParticleScale),
    schoolCount: 22,
    jellyCount: 14,
    sunShaftCount: 14,
    terrainSegments: 88,
  };
}
