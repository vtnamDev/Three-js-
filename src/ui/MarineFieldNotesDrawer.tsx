import { FormEvent, useState } from 'react';
import { Send, X } from 'lucide-react';
import { OceanChapter } from '../lib/chapterConfig';

export interface MarineFieldNotesDrawerProps {
  open: boolean;
  chapter: OceanChapter;
  depthMeters: number;
  onClose: () => void;
}

interface NoteMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modeLabel?: string;
}

export function MarineFieldNotesDrawer({
  open,
  chapter,
  depthMeters,
  onClose,
}: MarineFieldNotesDrawerProps) {
  const [mode, setMode] = useState<'fast' | 'deep'>('fast');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<NoteMessage[]>([]);

  if (!open) return null;

  const submitQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || loading) return;

    const userMsg: NoteMessage = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/pelagic-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          mode,
          chapterCode: chapter.code,
          zoneNameVi: chapter.zoneNameVi,
          zoneNameEn: chapter.zoneNameEn,
          depthMeters,
          s¶»§q«^