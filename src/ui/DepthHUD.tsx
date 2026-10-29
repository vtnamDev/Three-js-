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
  au¶»§q«^