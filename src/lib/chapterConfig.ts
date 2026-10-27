export interface OceanChapter {
  index: number;
  id: string;
  code: string;
  zoneNameVi: string;
  zoneNameEn: string;
  captionVi: string;
  scientificNote: string;
  startProgress: number;
  endProgress: number;
  minDepthMeters: number;
  maxDepthMeters: number;
  // Colors in hex integer format for zero-allocation interpolation
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

export const OCEAN_CHAPTERS: readonly OceanChapter[] = [
  {
    index: 0,
    id: 'surface',
    code: '01',
    zoneNameVi: 'Mặt Nước Ánh Dương',
    zoneNameEn: 'Epipelagic Surface',
    captionVi: 'Ánh mặt trời vỡ thành muôn dải khúc xạ trên lưng cá lấp lánh.',
    scientificNote:
      '0–45 m: Phổ ánh sáng mặt trời còn đầy đủ đỏ, lục và lam. Tán xạ Rayleigh và gợn sóng mặt nước tạo mạng lưới caustics chuyển động liên tục trên vảy cá.',
    startProgress: 0.0,
    endProgress: 0.11,
    minDepthMeters: 0,
    maxDepthMeters: 45,
    bgColor: 0x0b587c,
    fogColor: 0x0d6288,
    fogDensity: 0.013,
    keyLightColor: 0xfff3d8,
    keyLightIntensity: 2.65,
    hemiSkyColor: 0x7ce6ff,
    hemiGroundColor: 0x09354f,
    hemiIntensity: 1.35,
    rimLightColor: 0x9cf0ff,
    rimLightIntensity: 1.25,
    bioGlowColor: 0x4fd8ff,
    bioGlowIntensity: 0.0,
    sunShaftOpacity: 0.42,
    causticStrength: 1.0,
    particleColor: 0xd8f8ff,
    particleOpacity: 0.72,
    exposure: 1.16,
  },
  {
    index: 1,
    id: 'blue-garden',
    code: '02',
    zoneNameVi: 'Vườn Xanh Đại Dương',
    zoneNameEn: 'The Blue Garden',
    captionVi: 'Rừng tảo bẹ uốn theo hải lưu bên sườn thềm đá vôi cổ.',
    scientificNote:
      '45–130 m: Bước sóng đỏ bị nước hấp thụ mạnh, để lại sắc xanh ngọc và lam trong trẻo nuôi dưỡng rừng tảo bẹ cùng đàn cá hồng bơi theo luồng nước.',
    startProgress: 0.11,
    endProgress: 0.24,
    minDepthMeters: 45,
    maxDepthMeters: 130,
    bgColor: 0x084366,
    fogColor: 0x0a4d73,
    fogDensity: 0.016,
    keyLightColor: 0xdaf4ff,
    keyLightIntensity: 2.05,
    hemiSkyColor: 0x56c8ef,
    hemiGroundColor: 0x072940,
    hemiIntensity: 1.12,
    rimLightColor: 0x72e2ff,
    rimLightIntensity: 1.22,
    bioGlowColor: 0x45d6e8,
    bioGlowIntensity: 0.05,
    sunShaftOpacity: 0.28,
    causticStrength: 0.62,
    particleColor: 0xbef0ff,
    particleOpacity: 0.66,
    exposure: 1.12,
  },
  {
    index: 2,
    id: 'last-sunlight',
    code: '03',
    zoneNameVi: 'Tia Nắng Cuối',
    zoneNameEn: 'Last Sunlight',
    captionVi: 'Thềm lục địa sụp xuống vực sâu nơi những cột sáng cuối cùng tắt dần.',
    scientificNote:
      '130–240 m: Ranh giới đáy tầng quang hợp (dysphotic threshold). Chỉ còn các chùm sáng lam hẹp xuyên qua lớp mù nước dọc theo vách thềm lục địa.',
    startProgress: 0.24,
    endProgress: 0.37,
    minDepthMeters: 130,
    maxDepthMeters: 240,
    bgColor: 0x062d4d,
    fogColor: 0x073457,
    fogDensity: 0.02,
    keyLightColor: 0x9bd9f8,
    keyLightIntensity: 1.38,
    hemiSkyColor: 0x3ba0d4,
    hemiGroundColor: 0x051c30,
    hemiIntensity: 0.86,
    rimLightColor: 0x5fd0f5,
    rimLightIntensity: 1.28,
    bioGlowColor: 0x3ec8f0,
    bioGlowIntensity: 0.18,
    sunShaftOpacity: 0.14,
    causticStrength: 0.22,
    particleColor: 0x9adcf5,
    particleOpacity: 0.58,
    exposure: 1.08,
  },
  {
    index: 3,
    id: 'twilight',
    code: '04',
    zoneNameVi: 'Vùng Chạng Vạng',
    zoneNameEn: 'Mesopelagic Twilight',
    captionVi: 'Bóng tối lam thẫm mở rộng giữa những cột đá bazan và sứa lược phát quang.',
    scientificNote:
      '240–680 m: Tầng trung khơi (Mesopelagic). Ánh sáng mặt trời không đủ cho quang hợp; sinh vật bắt đầu sử dụng phát quang sinh học lam–lục làm tín hiệu.',
    startProgress: 0.37,
    endProgress: 0.5,
    minDepthMeters: 240,
    maxDepthMeters: 680,
    bgColor: 0x041d36,
    fogColor: 0x05223e,
    fogDensity: 0.023,
    keyLightColor: 0x67b2e8,
    keyLightIntensity: 0.92,
    hemiSkyColor: 0x286fa8,
    hemiGroundColor: 0x041426,
    hemiIntensity: 0.66,
    rimLightColor: 0x66d4f7,
    rimLightIntensity: 1.36,
    bioGlowColor: 0x3ad8e6,
    bioGlowIntensity: 0.58,
    sunShaftOpacity: 0.04,
    causticStrength: 0.04,
    particleColor: 0x80cbe8,
    particleOpacity: 0.52,
    exposure: 1.06,
  },
  {
    index: 4,
    id: 'midnight',
    code: '05',
    zoneNameVi: 'Nửa Đêm Đại Dương',
    zoneNameEn: 'Bathypelagic Midnight',
    captionVi: 'Ánh dương lùi hẳn về quá khứ; khoảng không vô tận nuốt trọn mọi đường chân trời.',
    scientificNote:
      '680–2.100 m: Tầng sâu Bathypelagic hoàn toàn vắng bóng ánh mặt trời. Áp suất vượt 200 atm; nguồn sáng duy nhất đến từ các cơ quan photophore sinh học.',
    startProgress: 0.5,
    endProgress: 0.63,
    minDepthMeters: 680,
    maxDepthMeters: 2100,
    bgColor: 0x031224,
    fogColor: 0x04162b,
    fogDensity: 0.026,
    keyLightColor: 0x529fd9,
    keyLightIntensity: 0.72,
    hemiSkyColor: 0x1e5382,
    hemiGroundColor: 0x030e1c,
    hemiIntensity: 0.54,
    rimLightColor: 0x5cc9f0,
    rimLightIntensity: 1.42,
    bioGlowColor: 0x2ec4e6,
    bioGlowIntensity: 0.85,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x6ab8de,
    particleOpacity: 0.45,
    exposure: 1.05,
  },
  {
    index: 5,
    id: 'deep-plain',
    code: '06',
    zoneNameVi: 'Đồng Bằng Vực Sâu',
    zoneNameEn: 'Abyssal Plain',
    captionVi: 'Lớp trầm tích triệu năm trải dài dưới bụng cá như sa mạc lạnh dưới đáy biển.',
    scientificNote:
      '2.100–4.800 m: Đồng bằng vực thẳm (Abyssal Plain) ở nhiệt độ 2–3 °C, phủ đầy tuyết biển hữu cơ lắng đọng và các gờ đá trầm tích cổ.',
    startProgress: 0.63,
    endProgress: 0.76,
    minDepthMeters: 2100,
    maxDepthMeters: 4800,
    bgColor: 0x03101f,
    fogColor: 0x041526,
    fogDensity: 0.021,
    keyLightColor: 0x58a8db,
    keyLightIntensity: 0.76,
    hemiSkyColor: 0x1d5278,
    hemiGroundColor: 0x071a29,
    hemiIntensity: 0.58,
    rimLightColor: 0x62cee8,
    rimLightIntensity: 1.4,
    bioGlowColor: 0x38c9db,
    bioGlowIntensity: 0.72,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x7bc2db,
    particleOpacity: 0.48,
    exposure: 1.06,
  },
  {
    index: 6,
    id: 'abyssal-canyon',
    code: '07',
    zoneNameVi: 'Hẻm Vực Thẳm',
    zoneNameEn: 'Abyssal Canyon',
    captionVi: 'Hai vách đá kiến tạo khép dần, dẫn lối qua cổng vòm bazan dựng đứng.',
    scientificNote:
      '4.800–8.200 m: Đới hút chìm kiến tạo mở ra hẻm rãnh dốc đứng. Dòng nước đáy cuốn bụi trầm tích mịn trôi dọc những vách đá nứt gãy.',
    startProgress: 0.76,
    endProgress: 0.89,
    minDepthMeters: 4800,
    maxDepthMeters: 8200,
    bgColor: 0x020b17,
    fogColor: 0x031020,
    fogDensity: 0.025,
    keyLightColor: 0x5baade,
    keyLightIntensity: 0.74,
    hemiSkyColor: 0x1a4b73,
    hemiGroundColor: 0x051322,
    hemiIntensity: 0.55,
    rimLightColor: 0x6ad4f2,
    rimLightIntensity: 1.46,
    bioGlowColor: 0x3bd4eb,
    bioGlowIntensity: 0.82,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x75bed9,
    particleOpacity: 0.44,
    exposure: 1.07,
  },
  {
    index: 7,
    id: 'hadal-reveal',
    code: '08',
    zoneNameVi: 'Đáy Rãnh Hadal',
    zoneNameEn: 'The Hadal Sanctuary',
    captionVi: 'Giữa lòng vực sâu nhất hành tinh, khe nứt lạnh vẫn thắp lên sự sống tĩnh lặng.',
    scientificNote:
      '8.200–10.920 m: Tầng Hadal nơi áp suất vượt 1.000 lần mặt biển. Dọc khe nứt kiến tạo lạnh, hệ sinh thái hóa tổng hợp và sinh vật phát quang lặng lẽ tồn tại.',
    startProgress: 0.89,
    endProgress: 1.0,
    minDepthMeters: 8200,
    maxDepthMeters: 10920,
    bgColor: 0x020a16,
    fogColor: 0x041428,
    fogDensity: 0.018,
    keyLightColor: 0x6dc2f2,
    keyLightIntensity: 0.88,
    hemiSkyColor: 0x246494,
    hemiGroundColor: 0x082238,
    hemiIntensity: 0.65,
    rimLightColor: 0x7ce2ff,
    rimLightIntensity: 1.52,
    bioGlowColor: 0x4be3fa,
    bioGlowIntensity: 1.15,
    sunShaftOpacity: 0.0,
    causticStrength: 0.0,
    particleColor: 0x90e2fa,
    particleOpacity: 0.56,
    exposure: 1.1,
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
  // Subtle smooth easing only at extremes while remaining strictly monotonic across chapters
  const rawMeters = ch.minDepthMeters + (ch.maxDepthMeters - ch.minDepthMeters) * localT;
  return Math.round(rawMeters);
}

/**
 * Computes smoothly blended lighting, fog, and palette parameters across adjacent chapters
 * using a 35% transition window centered on each chapter boundary so zero visual pops occur.
 */
export function getBlendedAtmosphere(progress: number): BlendedAtmosphere {
  const p = clamp01(progress);
  const current = getChapterAtProgress(p);
  const idx = current.index;
  const span = Math.max(1e-6, current.endProgress - current.startProgress);
  const localT = clamp01((p - current.startProgress) / span);

  // Blend smoothly into next chapter over the final 35% of each chapter
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
  overlap = 0.08,
): number {
  const p = clamp01(progress);
  const ch = OCEAN_CHAPTERS[chapterIndex];
  if (!ch) return 0;

  const fadeInStart = ch.index === 0 ? -0.1 : ch.startProgress - overlap;
  const fadeInEnd = ch.index === 0 ? 0.0 : ch.startProgress + overlap * 0.5;
  const fadeOutStart =
    ch.index === OCEAN_CHAPTERS.length - 1 ? 1.1 : ch.endProgress - overlap * 0.5;
  const fadeOutEnd =
    ch.index === OCEAN_CHAPTERS.length - 1 ? 1.2 : ch.endProgress + overlap;

  if (p <= fadeInStart || p >= fadeOutEnd) return 0;
  if (p < fadeInEnd) {
    return smoothstep01((p - fadeInStart) / Math.max(1e-6, fadeInEnd - fadeInStart));
  }
  if (p > fadeOutStart) {
    return 1 - smoothstep01((p - fadeOutStart) / Math.max(1e-6, fadeOutEnd - fadeOutStart));
  }
  return 1;
}
