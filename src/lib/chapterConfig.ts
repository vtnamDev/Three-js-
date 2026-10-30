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
  { id: 'E07', name: 'Kelp/sea-grass secondary sway', ownerModule: 'src/experience/OceanWorldBuilder.ts', chapters: [0, 1] },
  { id: 'E08', name: 'Fish-school steering', ownerModule: 'src/experience/OceanWorldBuilder.ts', chapters: [0, 1, 2, 3] },
  { id: 'E09', name: 'Jellyfish bell pulse', ownerModule: 'src/experience/OceanWorldBuilder.ts', chapters: [3, 4] },
  { id: 'E10', name: 'Bioluminescent pulse', ownerModule: 'src/experience/OceanWorldBuilder.ts', chapters: [3, 4, 5, 6, 7] },
  { id: 'E11', name: 'Plankton glints', ownerModule: 'src/experience/effectRegistry.ts', chapters: [2, 3, 4, 5] },
  { id: 'E12', name: 'Directional current ribbons', ownerModule: 'src/experience/effectRegistry.ts', chapters: [1, 2, 5, 6] },
  { id: 'E13', name: 'Camera orbit reveal', ownerModule: 'src/lib/fishPath.ts', chapters: [0, 1, 3, 4, 7] },
  { id: 'E14', name: 'Lateral dolly/tracking', ownerModule: 'src/lib/fishPath.ts', chapters: [0, 1, 2, 4, 5, 6] },
  { id: 'E15', name: 'Crane/vertical reveal', ownerModule: 'src/lib/fishPath.ts', chapters: [2, 5, 6, 7] },
  { id: 'E16', name: 'Controlled camera bank', ownerModule: 'src/lib/fishPath.ts', chapters: [1, 2, 3, 5, 6] },
  { id: 'E17', name: 'Depth parallax/foreground wipe', ownerModule: 'src/experience/effectRegistry.ts', chapters: [1, 2, 5, 6] },
  { id: 'E18', name: 'Chapter-title clip reveal', ownerModule: 'src/ui/DepthHUD.tsx', chapters: [0, 1, 2, 3, 4, 5, 6, 7] },
  { id: 'E19', name: 'Chapter transition dissolve', ownerModule: 'src/lib/chapterConfig.ts', chapters: [0, 1, 2, 3, 4, 5, 6, 7] },
  { id: 'E20', name: 'Depth counter/marker animation', ownerModule: 'src/ui/DepthHUD.tsx', chapters: [0, 1, 2, 3, 4, 5, 6, 7] },
  { id: 'E21', name: 'Fish-scale specular sweep', ownerModule: 'src/lib/fishSwim.ts', chapters: [0, 1, 2, 3, 4, 7] },
  { id: 'E22', name: 'Caudal wake/turbulence', ownerModule: 'src/experience/effectRegistry.ts', chapters: [0, 1, 2, 3, 4, 5, 6, 7] },
  { id: 'E23', name: 'Seafloor silt plume', ownerModule: 'src/experience/effectRegistry.ts', chapters: [5, 6, 7] },
  { id: 'E24', name: 'Cold-seep plume/shimmer', ownerModule: 'src/experience/effectRegistry.ts', chapters: [7] },
];

export interface OceanChapter {
  index: number;
  id: string;
  code: string;
  zoneNameVi: string;
  zoneNameEn: string;
  captionVi: string;
  scientificNote: string;
  titleRevealMode: TitleRevealMode;
  activeEffects: readonly EffectId[];
  startProgress: number;
  endProgress: number;
  minDepthMeters: number;
  maxDepthMeters: number;
  bgColor: number;
  fogColor: number;
  fogDensity: number;
  keyLightColor: number;
  keyLightIntensity: number;
  hemiSkyColor: number;
  hemiGroundColor: number;
  hemiIntensity: number;
  rimLightColor: number;
  rimLightIntensity: number;
  bioGlowColor: number;
  bioGlowIntensity: number;
  sunShaftOpacity: number;
  causticStrength: number;
  particleColor: number;
  particleOpacity: number;
  exposure: number;
}

export interface BlendedAtmosphere {
  chapter: OceanChapter;
  nextChapter: OceanChapter;
  chapterBlend: number;
  depthMeters: number;
  bgColor: [number, number, number];
  fogColor: [number, number, number];
  fogDensity: number;
  keyLightColor: [number, number, number];
  keyLightIntensity: number;
  hemiSkyColor: [number, number, number];
  hemiGroundColor: [number, number, number];
  hemiIntensity: number;
  rimLightColor: [number, number, number];
  rimLightIntensity: number;
  bioGlowColor: [number, number, number];
  bioGlowIntensity: number;
  sunShaftOpacity: number;
  causticStrength: number;
  particleColor: [number, number, number];
  particleOpacity: number;
  exposure: number;
}

export interface ChapterTitleTransitionState {
  chapter: OceanChapter;
  localProgress: number;
  revealAmount: number;
  dissolveOut: number;
}

export const OCEAN_CHAPTERS: readonly OceanChapter[] = [
  {
    index: 0,
    id: 'surface',
    code: '01',
    zoneNameVi: 'Mặt Nước Ánh Dương',
    zoneNameEn: 'Epipelagic Surface',
    captionVi: 'Nắng nhiệt đới đan lưới khúc xạ vàng óng dưới mặt biển lấp lánh.',
    scientificNote:
      '0–45 m: Phổ ánh sáng mặt trời còn đầy đủ bước sóng đỏ, cam và lam ngọc. Sóng mặt nước hội tụ thành mạng caustics sống động trên các bậc rạn san hô và lớp vảy ướt của cá.',
    titleRevealMode: 'clip-rise',
    activeEffects: ['E01', 'E02', 'E03', 'E05', 'E06', 'E07', 'E08', 'E13', 'E14', 'E18', 'E19', 'E20', 'E21', 'E22'],
    startProgress: 0.0,
    endProgress: 0.11,
    minDepthMeters: 0,
    maxDepthMeters: 45,
    bgColor: 0x043c5d,
    fogColor: 0x064565,
    fogDensity: 0.016,
    keyLightColor: 0xd2eaf0,
    keyLightIntensity: 1.62,
    hemiSkyColor: 0x4ba4c4,
    hemiGroundColor: 0x08283d,
    hemiIntensity: 0.82,
    rimLightColor: 0x70c8dc,
    rimLightIntensity: 0.92,
    bioGlowColor: 0x4fd8ff,
    bioGlowIntensity: 0.0,
    sunShaftOpacity: 0.25,
    causticStrength: 0.64,
    particleColor: 0xb6deeb,
    particleOpacity: 0.43,
    exposure: 0.94,
  },
  {
    index: 1,
    id: 'blue-garden',
    code: '02',
    zoneNameVi: 'Vườn Xanh Đại Dương',
    zoneNameEn: 'The Blue Garden',
    captionVi: 'Rừng tảo bẹ và bậc thềm san hô uốn lượn theo dải hải lưu lam ngọc.',
    scientificNote:
      '45–130 m: Bước sóng đỏ suy giảm dần theo định luật Beer–Lambert, để lại sắc lam ngọc sâu thẳm bao quanh rừng tảo bẹ mềm mại, đàn cá rạn và dải dòng chảy ven thềm.',
    titleRevealMode: 'horizon-wipe',
    activeEffects: ['E01', 'E02', 'E03', 'E04', 'E05', 'E06', 'E07', 'E08', 'E12', 'E13', 'E14', 'E16', 'E17', 'E18', 'E19', 'E20', 'E21', 'E22'],
    startProgress: 0.11,
    endProgress: 0.24,
    minDepthMeters: 45,
    maxDepthMeters: 130,
    bgColor: 0x063b5c,
    fogColor: 0x08466a,
    fogDensity: 0.017,
    keyLightColor: 0x9acfe2,
    keyLightIntensity: 1.34,
    hemiSkyColor: 0x347f9d,
    hemiGroundColor: 0x061d30,
    hemiIntensity: 0.72,
    rimLightColor: 0x59b7d4,
    rimLightIntensity: 0.96,
    bioGlowColor: 0x45d6e8,
    bioGlowIntensity: 0.06,
    sunShaftOpacity: 0.15,
    causticStrength: 0.38,
    particleColor: 0x9bc9dc,
    particleOpacity: 0.42,
    exposure: 0.94,
  },
  {
    index: 2,
    id: 'last-sunlight',
    code: '03',
    zoneNameVi: 'Tia Nắng Cuối',
    zoneNameEn: 'Last Sunlight',
    captionVi: 'Thềm lục địa phân tầng mở ra vực thẳm nơi những cột sáng cuối cùng tắt dần.',
    scientificNote:
      '130–240 m: Ranh giới đáy tầng quang hợp (dysphotic threshold). Chỉ còn các chùm sáng lam hẹp xuyên qua lớp mù nước dọc theo vách thềm lục địa phân bậc bất đối xứng.',
    titleRevealMode: 'split-descent',
    activeEffects: ['E01', 'E02', 'E04', 'E05', 'E06', 'E08', 'E11', 'E12', 'E14', 'E15', 'E16', 'E17', 'E18', 'E19', 'E20', 'E21', 'E22'],
    startProgress: 0.24,
    endProgress: 0.37,
    minDepthMeters: 130,
    maxDepthMeters: 240,
    bgColor: 0x052b4a,
    fogColor: 0x073356,
    fogDensity: 0.0205,
    keyLightColor: 0x98d8f8,
    keyLightIntensity: 0.96,
    hemiSkyColor: 0x2c79a6,
    hemiGroundColor: 0x041729,
    hemiIntensity: 0.64,
    rimLightColor: 0x4ca9ca,
    rimLightIntensity: 1.02,
    bioGlowColor: 0x3ec8f0,
    bioGlowIntensity: 0.2,
    sunShaftOpacity: 0.08,
    causticStrength: 0.10,
    particleColor: 0x82b7d0,
    particleOpacity: 0.40,
    exposure: 0.93,
  },
  {
    index: 3,
    id: 'twilight',
    code: '04',
    zoneNameVi: 'Vùng Chạng Vạng',
    zoneNameEn: 'Mesopelagic Twilight',
    captionVi: 'Bóng tối lam thẫm mở rộng giữa những cột đá bazan và sứa phát quang.',
    scientificNote:
      '240–680 m: Tầng trung khơi (Mesopelagic). Ánh sáng mặt trời không đủ cho quang hợp; sứa biển và phù du bắt đầu phát sáng sinh học lam–lục làm tín hiệu trong không gian ba chiều.',
    titleRevealMode: 'stagger-track',
    activeEffects: ['E04', 'E05', 'E08', 'E09', 'E10', 'E11', 'E13', 'E16', 'E18', 'E19', 'E20', 'E21', 'E22'],
    startProgress: 0.37,
    endProgress: 0.5,
    minDepthMeters: 240,
    maxDepthMeters: 680,
    bgColor: 0x041d35,
    fogColor: 0x05223d,
    fogDensity: 0.023,
    keyLightColor: 0x67b2e8,
    keyLightIntensity: 0.94,
    hemiSkyColor: 0x286fa8,
    hemiGroundColor: 0x041426,
    hemiIntensity: 0.68,
    rimLightColor: 0x66d4f7,
    rimLightIntensity: 1.38,
    bioGlowColor: 0x3ad8e6,
    bioGlowIntensity: 0.6,
    sunShaftOpacity: 0.03,
    causticStrength: 0.03,
    particleColor: 0x80cbe8,
    particleOpacity: 0.52,
    exposure: 0.98,
  },
  {
    index: 4,
    id: 'midnight',
    code: '05',
    zoneNameVi: 'Nửa Đêm Đại Dương',
    zoneNameEn: 'Bathypelagic Midnight',
    captionVi: 'Ánh dương lùi hẳn về quá khứ; khoảng không thẳm sâu điểm những đốm lân tinh tĩnh mịch.',
    scientificNote:
      '680–2.100 m: Tầng sâu Bathypelagic hoàn toàn vắng bóng ánh mặt trời. Áp suất vượt 200 atm; nguồn sáng duy nhất đến từ các cơ quan photophore sinh học lấp lánh rải rác.',
    titleRevealMode: 'abyss-focus',
    activeEffects: ['E04', 'E05', 'E09', 'E10', 'E11', 'E13', 'E14', 'E18', 'E19', 'E20', 'E21', 'E22'],
    startProgress: 0.5,
    endProgress: 0.63,
    minDepthMeters: 680,
    maxDepthMeters: 2100,
    bgColor: 0x031224,
    fogColor: 0x04162b,
    fogDensity: 0.025,
    keyLightColor: 0x56a4de,
    keyLightIntensity: 0.78,
    hemiSkyColor: 0x1e5382,
    hemiGroundColor: 0x030e1c,
    hemiIntensity: 0.58,
    rimLightColor: 0x5cc9f0,
    rimLightIntensity: 1.44,
    bioGlowColor: 0x2ec4e6,
    bioGlowIntensity: 0.86,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x6ab8de,
    particleOpacity: 0.46,
    exposure: 0.97,
  },
  {
    index: 5,
    id: 'deep-plain',
    code: '06',
    zoneNameVi: 'Đồng Bằng Vực Sâu',
    zoneNameEn: 'Abyssal Plain',
    captionVi: 'Lớp trầm tích triệu năm trải dài dưới bụng cá cùng làn bụi bùn mịn cuốn nhẹ.',
    scientificNote:
      '2.100–4.800 m: Đồng bằng vực thẳm (Abyssal Plain) ở nhiệt độ 2–3 °C, phủ đầy tuyết biển hữu cơ lắng đọng, gờ trầm tích cổ và các luồng bụi đáy (benthic silt) mảnh mai.',
    titleRevealMode: 'sediment-line',
    activeEffects: ['E04', 'E05', 'E10', 'E11', 'E12', 'E14', 'E15', 'E16', 'E17', 'E18', 'E19', 'E20', 'E22', 'E23'],
    startProgress: 0.63,
    endProgress: 0.76,
    minDepthMeters: 2100,
    maxDepthMeters: 4800,
    bgColor: 0x031120,
    fogColor: 0x041628,
    fogDensity: 0.021,
    keyLightColor: 0x5caade,
    keyLightIntensity: 0.82,
    hemiSkyColor: 0x1f567e,
    hemiGroundColor: 0x081d2e,
    hemiIntensity: 0.62,
    rimLightColor: 0x64d0ea,
    rimLightIntensity: 1.44,
    bioGlowColor: 0x38c9db,
    bioGlowIntensity: 0.74,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x7bc2db,
    particleOpacity: 0.48,
    exposure: 0.97,
  },
  {
    index: 6,
    id: 'abyssal-canyon',
    code: '07',
    zoneNameVi: 'Hẻm Vực Thẳm',
    zoneNameEn: 'Abyssal Canyon',
    captionVi: 'Hai vách đá kiến tạo bất đối xứng dẫn lối lượn chữ S qua cổng vòm bazan.',
    scientificNote:
      '4.800–8.200 m: Đới hút chìm kiến tạo mở ra hẻm rãnh dốc đứng. Dòng chảy đáy xoáy quanh vách bazan cuốn theo dải tơ nước và bụi trầm tích mịn.',
    titleRevealMode: 'canyon-shear',
    activeEffects: ['E04', 'E05', 'E10', 'E12', 'E14', 'E15', 'E16', 'E17', 'E18', 'E19', 'E20', 'E22', 'E23'],
    startProgress: 0.76,
    endProgress: 0.89,
    minDepthMeters: 4800,
    maxDepthMeters: 8200,
    bgColor: 0x020c19,
    fogColor: 0x031122,
    fogDensity: 0.0235,
    keyLightColor: 0x5faee2,
    keyLightIntensity: 0.8,
    hemiSkyColor: 0x1c4f78,
    hemiGroundColor: 0x061526,
    hemiIntensity: 0.59,
    rimLightColor: 0x6cd6f4,
    rimLightIntensity: 1.48,
    bioGlowColor: 0x3bd4eb,
    bioGlowIntensity: 0.84,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x75bed9,
    particleOpacity: 0.46,
    exposure: 0.98,
  },
  {
    index: 7,
    id: 'hadal-reveal',
    code: '08',
    zoneNameVi: 'Đáy Rãnh Hadal',
    zoneNameEn: 'The Hadal Sanctuary',
    captionVi: 'Giữa lòng vực sâu nhất hành tinh, khe nứt lạnh vẫn thắp lên sự sống tĩnh lặng.',
    scientificNote:
      '8.200–10.920 m: Tầng Hadal nơi áp suất vượt 1.000 lần mặt biển. Dọc khe nứt kiến tạo lạnh (cold seep), cột khoáng chất lung linh và hệ sinh thái hóa tổng hợp lặng lẽ tỏa sáng.',
    titleRevealMode: 'hadal-sanctuary',
    activeEffects: ['E04', 'E05', 'E10', 'E13', 'E15', 'E18', 'E19', 'E20', 'E21', 'E22', 'E23', 'E24'],
    startProgress: 0.89,
    endProgress: 1.0,
    minDepthMeters: 8200,
    maxDepthMeters: 10920,
    bgColor: 0x020b17,
    fogColor: 0x04152a,
    fogDensity: 0.0175,
    keyLightColor: 0x72c5f5,
    keyLightIntensity: 0.92,
    hemiSkyColor: 0x266899,
    hemiGroundColor: 0x09243b,
    hemiIntensity: 0.68,
    rimLightColor: 0x80e4ff,
    rimLightIntensity: 1.54,
    bioGlowColor: 0x4be3fa,
    bioGlowIntensity: 1.15,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x90e2fa,
    particleOpacity: 0.56,
    exposure: 1.0,
  },
];

export function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value <= 0) return 0;
  if (value >= 1) return 1;
  return value;
}

export function smoothstep01(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function hexToRgbNormalized(hex: number): [number, number, number] {
  const r = ((hex >> 16) & 0xff) / 255;
  const g = ((hex >> 8) & 0xff) / 255;
  const b = (hex & 0xff) / 255;
  return [r, g, b];
}

function lerpRgb(
  hexA: number,
  hexB: number,
  t: number,
): [number, number, number] {
  const [ar, ag, ab] = hexToRgbNormalized(hexA);
  const [br, bg, bb] = hexToRgbNormalized(hexB);
  return [
    ar + (br - ar) * t,
    ag + (bg - ag) * t,
    ab + (bb - ab) * t,
  ];
}

function lerpScalar(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function getChapterAtProgress(progress: number): OceanChapter {
  const p = clamp01(progress);
  for (let i = 0; i < OCEAN_CHAPTERS.length - 1; i++) {
    const ch = OCEAN_CHAPTERS[i];
    if (p >= ch.startProgress && p < ch.endProgress) {
      return ch;
    }
  }
  return OCEAN_CHAPTERS[OCEAN_CHAPTERS.length - 1];
}

export function getDepthMetersAtProgress(progress: number): number {
  const p = clamp01(progress);
  const ch = getChapterAtProgress(p);
  const span = Math.max(1e-6, ch.endProgress - ch.startProgress);
  const localT = clamp01((p - ch.startProgress) / span);
  const rawMeters = ch.minDepthMeters + (ch.maxDepthMeters - ch.minDepthMeters) * localT;
  return Math.round(rawMeters);
}

/**
 * Deterministic progress-driven title transition state (`E18` & `E19`).
 * Because it is a pure function of `progress`, scrubbing forward or backward
 * reverses every chapter title's clip/mask/settle smoothly without timer drift.
 */
export function getChapterTitleTransition(progress: number): ChapterTitleTransitionState {
  const p = clamp01(progress);
  const chapter = getChapterAtProgress(p);
  const span = Math.max(1e-6, chapter.endProgress - chapter.startProgress);
  const localProgress = clamp01((p - chapter.startProgress) / span);

  // Chapter 01 starts fully revealed at p=0.00 so first paint at the surface is immediately legible
  const revealAmount =
    chapter.index === 0 ? 1.0 : smoothstep01(localProgress / 0.16);
  const dissolveOut =
    chapter.index === OCEAN_CHAPTERS.length - 1
      ? 0.0
      : smoothstep01((localProgress - 0.88) / 0.12);

  return {
    chapter,
    localProgress,
    revealAmount,
    dissolveOut,
  };
}

/**
 * Computes smoothly blended lighting, fog, and palette parameters across adjacent chapters
 * (`E19` Chapter transition dissolve) so zero visual pops or blank frames occur.
 */
export function getBlendedAtmosphere(progress: number): BlendedAtmosphere {
  const p = clamp01(progress);
  const current = getChapterAtProgress(p);
  const idx = current.index;
  const span = Math.max(1e-6, current.endProgress - current.startProgress);
  const localT = clamp01((p - current.startProgress) / span);

  const blendWindow = 0.35;
  let next = current;
  let blend = 0;

  if (idx < OCEAN_CHAPTERS.length - 1 && localT > 1 - blendWindow) {
    next = OCEAN_CHAPTERS[idx + 1];
    blend = smoothstep01((localT - (1 - blendWindow)) / blendWindow);
  }

  return {
    chapter: current,
    nextChapter: next,
    chapterBlend: blend,
    depthMeters: getDepthMetersAtProgress(p),
    bgColor: lerpRgb(current.bgColor, next.bgColor, blend),
    fogColor: lerpRgb(current.fogColor, next.fogColor, blend),
    fogDensity: lerpScalar(current.fogDensity, next.fogDensity, blend),
    keyLightColor: lerpRgb(current.keyLightColor, next.keyLightColor, blend),
    keyLightIntensity: lerpScalar(current.keyLightIntensity, next.keyLightIntensity, blend),
    hemiSkyColor: lerpRgb(current.hemiSkyColor, next.hemiSkyColor, blend),
    hemiGroundColor: lerpRgb(current.hemiGroundColor, next.hemiGroundColor, blend),
    hemiIntensity: lerpScalar(current.hemiIntensity, next.hemiIntensity, blend),
    rimLightColor: lerpRgb(current.rimLightColor, next.rimLightColor, blend),
    rimLightIntensity: lerpScalar(current.rimLightIntensity, next.rimLightIntensity, blend),
    bioGlowColor: lerpRgb(current.bioGlowColor, next.bioGlowColor, blend),
    bioGlowIntensity: lerpScalar(current.bioGlowIntensity, next.bioGlowIntensity, blend),
    sunShaftOpacity: lerpScalar(current.sunShaftOpacity, next.sunShaftOpacity, blend),
    causticStrength: lerpScalar(current.causticStrength, next.causticStrength, blend),
    particleColor: lerpRgb(current.particleColor, next.particleColor, blend),
    particleOpacity: lerpScalar(current.particleOpacity, next.particleOpacity, blend),
    exposure: lerpScalar(current.exposure, next.exposure, blend),
  };
}

/**
 * Smooth spatial activation weight [0..1] for a chapter's 3D props/terrain
 * with generous fade-in and fade-out overlap so geometry never pops in or out.
 */
export function getChapterVisibilityWeight(
  progress: number,
  chapterIndex: number,
  overlap = 0.075,
  trailOutOverlap = overlap,
): number {
  const p = clamp01(progress);
  const ch = OCEAN_CHAPTERS[chapterIndex];
  if (!ch) return 0;

  const fadeInStart = ch.index === 0 ? -0.1 : ch.startProgress - overlap;
  const fadeInEnd = ch.index === 0 ? 0.0 : ch.startProgress + overlap * 0.45;
  const fadeOutStart =
    ch.index === OCEAN_CHAPTERS.length - 1 ? 1.1 : ch.endProgress - trailOutOverlap * 0.45;
  const fadeOutEnd =
    ch.index === OCEAN_CHAPTERS.length - 1 ? 1.2 : ch.endProgress + trailOutOverlap;

  if (p <= fadeInStart || p >= fadeOutEnd) return 0;
  if (p < fadeInEnd) {
    return smoothstep01((p - fadeInStart) / Math.max(1e-6, fadeInEnd - fadeInStart));
  }
  if (p > fadeOutStart) {
    return 1 - smoothstep01((p - fadeOutStart) / Math.max(1e-6, fadeOutEnd - fadeOutStart));
  }
  return 1;
}

/**
 * Evaluates smooth [0..1] activation strength for any effect ID (`E01..E24`)
 * across its configured chapters.
 */
export function getEffectStrengthAtProgress(effectId: EffectId, progress: number): number {
  const desc = EFFECT_CATALOGUE.find((e) => e.id === effectId);
  if (!desc) return 0;
  let maxWeight = 0;
  for (const chIdx of desc.chapters) {
    const w = getChapterVisibilityWeight(progress, chIdx, 0.065);
    if (w > maxWeight) maxWeight = w;
  }
  return maxWeight;
}
