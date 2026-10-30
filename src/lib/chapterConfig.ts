export type EffectId =
  | 'E01'
  | 'E02'
  | 'E03'
  | 'E04'
  | 'E05'
  | 'E06'
  | 'E07'
  | 'E08'
  | 'E09'
  | 'E10'
  | 'E11'
  | 'E12'
  | 'E13'
  | 'E14'
  | 'E15'
  | 'E16'
  | 'E17'
  | 'E18'
  | 'E19'
  | 'E20'
  | 'E21'
  | 'E22'
  | 'E23'
  | 'E24';

export type TitleRevealMode =
  | 'clip-rise'
  | 'horizon-wipe'
  | 'split-descent'
  | 'stagger-track'
  | 'abyss-focus'
  | 'sediment-line'
  | 'canyon-shear'
  | 'hadal-sanctuary';

export interface EffectDescriptor {
  id: EffectId;
  name: string;
  ownerModule: string;
  chapters: readonly number[]; // 0-indexed chapter indices
}

export const EFFECT_CATALOGUE: readonly EffectDescriptor[] = [
  { id: 'E01', name: 'Surface caustics', ownerModule: 'src/experience/OceanWorldBuilder.ts', chapters: [0, 1, 2] },
  { id: 'E02', name: 'Sun shafts', ownerModule: 'src/experience/OceanWorldBuilder.ts', chapters: [0, 1, 2] },
  { id: 'E03', name: 'Water-surface undulation', ownerModule: 'src/experience/OceanWorldBuilder.ts', chapters: [0, 1] },
  { id: 'E04', name: 'Volumetric-feel depth haze', ownerModule: 'src/experience/OceanSceneController.ts', chapters: [1, 2, 3, 4, 5, 6, 7] },
  { id: 'E05', name: 'Multi-layer marine snow', ownerModule: 'src/experience/effectRegistry.ts', chapters: [0, 1, 2, 3, 4, 5, 6, 7] },
  { id: 'E06', name: 'Micro-bubble drift', ownerModule: 'src/experience/effectRegistry.ts', chapters: [0, 1, 2] },
  { id: 'E07', name: 'Kelp/sea-grass secondary sway', ownerModule: 'src/experience/OceanWorldB¶»§q«^