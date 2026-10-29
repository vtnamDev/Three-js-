import { ArrowUp } from 'lucide-react';
import { OCEAN_CHAPTERS } from '../lib/chapterConfig';

export function WebGLFallback() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <main
      data-testid="webgl-fallback-view"
      className="min-h-screen bg-gradient-to-b from-[#0b587c] via-[#041d36] to-[#020914] text-[#e6f1f8]"
    >
      <header className="mx-auto max-w-4xl px-6 pb-12 pt-16 sm:pt-24">
        <p className="font-mono text-xs uppercase tracking-[0.24em] text-cyan-200/80">
          PELAGIC — THE DEEP DESCENT · CHẾ ĐỘ TƯƠNG THÍCH KHÔNG CẦN WEBGL
        </p>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-tight text-white sm:text-5xl">
          Hành trình lặn sâu từ Mặt Nước Ánh Dương xuống Rãnh Hadal 10.920 m
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200/90 sm:text-base">
          Thiết bị hoặc trình duyệt hiện tại không khởi tạo được ngữ cảnh đồ họa 3D WebGL. Bạn vẫn có thể cuộn qua toàn bộ tám tầng sinh thái đại dương bên dưới với đầy đủ thông số độ sâu và ghi chép hải dương học.
        </p>

        {/* Anatomical SVG Pelagic Fish Silhouette */}
        <div className="mt-10 border border-cyan-200/20 bg-[#041324]/70 p-6">
          <svg
            viewBox="0 0 420 140"
            role="img"
            aria-label="Hình th���q�^