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
            aria-label="Hình thái cá đại dương Pelagic"
            className="mx-auto h-28 w-full max-w-md text-cyan-200"
          >
            <path
              d="M35,70 C75,36 155,28 235,44 C282,53 318,62 345,66 L392,34 L376,70 L392,106 L345,74 C318,78 282,88 235,96 C155,112 75,104 35,70 Z"
              fill="currentColor"
              fillOpacity="0.22"
              stroke="currentColor"
              strokeWidth="2"
            />
            <path
              d="M150,36 L210,14 L228,42 Z M168,98 L212,118 L226,95 Z M118,74 L152,92 L134,68 Z"
              fill="currentColor"
              fillOpacity="0.35"
            />
            <circle cx="74" cy="64" r="4.5" fill="#e6f9ff" />
          </svg>
        </div>
      </header>

      <section aria-label="Tám tầng độ sâu đại dương" className="mx-auto max-w-4xl space-y-8 px-6 pb-24">
        {OCEAN_CHAPTERS.map((ch) => (
          <article
            key={ch.id}
            className="border border-cyan-200/20 bg-[#03101f]/75 p-6 sm:p-8"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2 font-mono text-xs text-cyan-200/80">
              <span>
                TẦNG {ch.code} · {ch.zoneNameEn.toUpperCase()}
              </span>
              <span className="tabular-nums">
                {ch.minDepthMeters.toLocaleString('vi-VN')} –{' '}
                {ch.maxDepthMeters.toLocaleString('vi-VN')} m
              </span>
            </div>
            <h2 className="mt-2 font-serif text-2xl font-semibold text-white sm:text-3xl">
              {ch.zoneNameVi}
            </h2>
            <p className="mt-2 text-sm italic text-cyan-100/90">{ch.captionVi}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{ch.scientificNote}</p>
          </article>
        ))}

        <div className="pt-6 text-center">
          <button
            type="button"
            onClick={scrollToTop}
            className="inline-flex items-center gap-2 border border-cyan-300/50 bg-[#0a2742] px-5 py-2.5 font-mono text-xs uppercase tracking-[0.18em] text-cyan-50 hover:bg-[#10385e]"
          >
            <ArrowUp className="h-4 w-4" />
            <span>Trở về mặt nước</span>
          </button>
        </div>
      </section>
    </main>
  );
}
