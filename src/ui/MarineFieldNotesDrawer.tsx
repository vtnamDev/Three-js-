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
          scientificNote: chapter.scientificNote,
          history: messages.slice(-6).map((m) => ({
            role: m.role,
            text: m.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as {
        answer?: string;
        modelLabel?: string;
      };

      setMessages([
        ...nextHistory,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text:
            data.answer ||
            `${chapter.scientificNote} Ở độ sâu ${depthMeters.toLocaleString('vi-VN')} m (${chapter.zoneNameEn}), cá thích nghi nhờ hệ cơ đỏ bền bỉ và đường bên nhạy cảm với dao động áp suất.`,
          modeLabel: data.modelLabel,
        },
      ]);
    } catch {
      // Clean scientific fallback when deployed as static Vite site on Vercel without backend or API secret
      setMessages([
        ...nextHistory,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: `[Ghi chép hải dương học nội bộ — Tầng ${chapter.code} · ${depthMeters.toLocaleString('vi-VN')} m] ${chapter.scientificNote} Hệ thống cơ bên thân (myomeres) truyền sóng uốn từ thân sau tới cuống đuôi giúp duy trì lực đẩy ổn định ngay cả trong vùng nước lạnh, nghèo oxy.`,
          modeLabel: 'Dữ liệu Hải dương Tĩnh',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submitQuestion(input);
  };

  return (
    <aside
      id="pelagic-field-notes-drawer"
      aria-label="Sổ tay Hải dương học"
      className="pointer-events-auto fixed bottom-16 left-4 z-30 flex max-h-[70dvh] w-[calc(100vw-2rem)] max-w-md flex-col border border-cyan-200/20 bg-[#04101e]/95 text-slate-100 shadow-2xl sm:bottom-20 sm:left-6 lg:left-8"
    >
      <div className="flex items-center justify-between border-b border-cyan-200/15 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-cyan-300/80">
            SỔ TAY HẢI DƯƠNG · TẦNG {chapter.code}
          </p>
          <h2 className="font-serif text-lg font-medium text-slate-50">
            {chapter.zoneNameVi} ({depthMeters.toLocaleString('vi-VN')} m)
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng sổ tay hải dương"
          className="border border-cyan-200/15 p-1.5 text-slate-300 transition-colors hover:border-cyan-200/40 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-xs leading-relaxed">
        <div className="border-l-2 border-cyan-400/60 bg-[#071a30] p-3 text-slate-200">
          {chapter.scientificNote}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() =>
              void submitQuestion(
                `Áp suất và ánh sáng ở độ sâu ${depthMeters}m ảnh hưởng thế nào đến sinh vật?`,
              )
            }
            className="border border-cyan-200/15 bg-[#061629] px-2.5 py-1 text-left font-mono text-[10px] text-cyan-100/85 hover:border-cyan-300/40"
          >
            Áp suất & ánh sáng tại {depthMeters} m?
          </button>
          <button
            type="button"
            onClick={() =>
              void submitQuestion('Cơ chế bơi uốn thân và đường bên của cá hoạt động ra sao?')
            }
            className="border border-cyan-200/15 bg-[#061629] px-2.5 py-1 text-left font-mono text-[10px] text-cyan-100/85 hover:border-cyan-300/40"
          >
            Cơ chế bơi & đường bên?
          </button>
        </div>

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`space-y-1 p-2.5 ${
              msg.role === 'user'
                ? 'ml-6 border border-cyan-300/25 bg-[#0b2540] text-cyan-50'
                : 'mr-2 border border-slate-700/60 bg-[#061425] text-slate-200'
            }`}
          >
            {msg.modeLabel && (
              <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-cyan-300/70">
                {msg.modeLabel}
              </p>
            )}
            <p className="whitespace-pre-line">{msg.text}</p>
          </div>
        ))}

        {loading && (
          <p className="font-mono text-[11px] text-cyan-200/80">
            Đang phân tích dữ liệu tầng nước...
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-cyan-200/15 p-3">
        <div className="mb-2 flex items-center justify-between text-[11px]">
          <span className="font-mono uppercase tracking-[0.14em] text-slate-400">
            Chế độ phản hồi
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              aria-pressed={mode === 'fast'}
              onClick={() => setMode('fast')}
              className={`border px-2 py-0.5 font-mono text-[10px] ${
                mode === 'fast'
                  ? 'border-cyan-300/60 bg-cyan-950/90 text-cyan-100'
                  : 'border-cyan-200/15 bg-[#061526] text-slate-400 hover:text-slate-200'
              }`}
            >
              Nhanh (Flash-Lite)
            </button>
            <button
              type="button"
              aria-pressed={mode === 'deep'}
              onClick={() => setMode('deep')}
              className={`border px-2 py-0.5 font-mono text-[10px] ${
                mode === 'deep'
                  ? 'border-cyan-300/60 bg-cyan-950/90 text-cyan-100'
                  : 'border-cyan-200/15 bg-[#061526] text-slate-400 hover:text-slate-200'
              }`}
            >
              Chuyên sâu (High Thinking)
            </button>
          </div>
        </div>

        <div className="flex gap-2">
          <label htmlFor="pelagic-note-input" className="sr-only">
            Đặt câu hỏi hải dương học
          </label>
          <input
            id="pelagic-note-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Hỏi về địa chất, sinh vật tầng sâu..."
            className="min-w-0 flex-1 border border-cyan-200/20 bg-[#061628] px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-400 focus:border-cyan-300 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Gửi câu hỏi"
            className="flex items-center justify-center border border-cyan-300/40 bg-[#0b2a4a] px-3 py-1.5 text-cyan-100 transition-colors hover:bg-[#113b66] disabled:opacity-40"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      </form>
    </aside>
  );
}
