import { useEffect, useState } from 'react';
import { Check, Copy, Download, FileCode2, X } from 'lucide-react';

const SOURCE_PATHS = [
  'src/App.tsx', 'src/main.tsx', 'src/index.css',
  'src/experience/OceanCanvas.tsx', 'src/experience/OceanSceneController.ts',
  'src/experience/OceanWorldBuilder.ts', 'src/experience/effectRegistry.ts',
  'src/experience/proceduralTextures.ts', 'src/lib/chapterConfig.ts',
  'src/lib/fishPath.ts', 'src/lib/fishSwim.ts', 'src/lib/oceanAudio.ts',
  'src/lib/qualityTier.ts', 'src/lib/scrollDirector.ts',
  'src/ui/DepthHUD.tsx', 'src/ui/LoadingOverlay.tsx',
  'src/ui/MarineFieldNotesDrawer.tsx', 'src/ui/SourceCodeModal.tsx',
  'src/ui/WebGLFallback.tsx', 'package.json', 'vite.config.ts',
  'tsconfig.json', 'vercel.json',
];
const RAW_BASE = 'https://raw.githubusercontent.com/vtnamDev/Three-js-/main';
export interface SourceFileEntry {
  path: string;
  sizeBytes: number;
  content: string;
}

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/vtnamDev/Three-js-/main';
const GITHUB_ARCHIVE_URL = 'https://github.com/vtnamDev/Three-js-/archive/refs/heads/main.zip';
const SOURCE_FILE_PATHS = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vercel.json',
  'index.html',
  'server.ts',
  'README.md',
  'ASSET_CREDITS.md',
  'CHANGELOG_V9.md',
  'src/main.tsx',
  'src/App.tsx',
  'src/index.css',
  'src/experience/OceanCanvas.tsx',
  'src/experience/OceanSceneController.ts',
  'src/experience/OceanWorldBuilder.ts',
  'src/experience/effectRegistry.ts',
  'src/experience/proceduralTextures.ts',
  'src/lib/chapterConfig.ts',
  'src/lib/fishPath.ts',
  'src/lib/fishSwim.ts',
  'src/lib/oceanAudio.ts',
  'src/lib/pelagicLogic.test.ts',
  'src/lib/qualityTier.ts',
  'src/lib/scrollDirector.ts',
  'src/ui/DepthHUD.tsx',
  'src/ui/LoadingOverlay.tsx',
  'src/ui/MarineFieldNotesDrawer.tsx',
  'src/ui/SourceCodeModal.tsx',
  'src/ui/WebGLFallback.tsx',
] as const;

export interface SourceCodeModalProps {
  open: boolean;
  onClose: () => void;
}

export function SourceCodeModal({ open, onClose }: SourceCodeModalProps) {
  const [files, setFiles] = useState<SourceFileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('src/App.tsx');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!open) return;
    setFiles((current) =>
      current.length > 0
        ? current
        : SOURCE_FILE_PATHS.map((path) => ({ path, sizeBytes: 0, content: '' })),
    );
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const selected = files.find((file) => file.path === selectedPath);
    if (!selected || selected.content) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all(SOURCE_PATHS.map(async (filePath) => {
      const response = await fetch(RAW_BASE + '/' + filePath);
      if (!response.ok) throw new Error(filePath + ': HTTP ' + response.status);
      const content = await response.text();
      return { path: filePath, sizeBytes: new Blob([content]).size, content };
    }))
      .then((loaded) => {
        if (cancelled) return;
        setFiles(loaded);
        if (loaded.length && !loaded.some((file) => file.path === selectedPath)) {
          setSelectedPath(loaded[0].path);
        }
      })
      .catch(() => {
        if (!cancelled) setError('Không thể tải mã nguồn trực tiếp. Hãy dùng nút Tải trọn bộ ZIP để mở dự án trên GitHub.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, selectedPath, files]);

  if (!open) return null;

  const activeFile = files.find((f) => f.path === selectedPath) ?? files[0] ?? null;

  const handleCopy = async () => {
    if (!activeFile?.content) return;
    try {
      await navigator.clipboard.writeText(activeFile.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard permission errors in restricted iframes
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Trình xem mã nguồn dự án PELAGIC"
      className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-[#020813]/85 p-3 sm:p-6"
    >
      <div className="flex h-[85dvh] w-full max-w-5xl flex-col border border-cyan-200/20 bg-[#04101e] text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-200/15 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2.5">
            <FileCode2 className="h-4 w-4 text-cyan-300" />
            <div>
              <h2 className="font-serif text-lg font-semibold text-slate-50 sm:text-xl">
                Toàn bộ Mã nguồn — PELAGIC V9
              </h2>
              <p className="font-mono text-[10px] tracking-[0.14em] text-cyan-200/75">
                {files.length > 0
                  ? `${files.length} TỆP MÃ NGUỒN · ĐỌC TRỰC TIẾP TỪ GITHUB`
                  : 'TRÌNH XEM & TẢI GÓI MÃ NGUỒN ĐẦY ĐỦ'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={GITHUB_ARCHIVE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 border border-cyan-300/45 bg-[#0a2742] px-3 py-1.5 font-mono text-[11px] tracking-[0.1em] text-cyan-50 transition-colors hover:bg-[#10385e]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Tải mã nguồn ZIP</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng trình xem mã nguồn"
              className="border border-cyan-200/15 p-1.5 text-slate-300 transition-colors hover:border-cyan-200/40 hover:text-white focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-300"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
          {/* File Tree Sidebar */}
          <nav
            aria-label="Danh sách tệp mã nguồn"
            className="max-h-44 shrink-0 overflow-y-auto border-b border-cyan-200/15 bg-[#030c18] p-2 sm:max-h-none sm:w-64 sm:border-b-0 sm:border-r"
          >
            {loading && (
              <p className="p-3 font-mono text-xs text-cyan-200/80">Đang tải danh sách tệp...</p>
            )}
            {files.map((file) => {
              const isSelected = activeFile?.path === file.path;
              return (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setSelectedPath(file.path)}
                  className={`flex w-full items-center justify-between gap-2 px-2.5 py-1.5 text-left font-mono text-[11px] transition-colors ${
                    isSelected
                      ? 'bg-[#0b2744] text-cyan-100'
                      : 'text-slate-300/85 hover:bg-[#071a2f] hover:text-white'
                  }`}
                >
                  <span className="truncate">{file.path}</span>
                  <span className="shrink-0 text-[10px] tabular-nums text-slate-400">
                    {(file.sizeBytes / 1024).toFixed(1)}K
                  </span>
                </button>
              );
            })}
          </nav>

          {/* Code Viewer */}
          <div className="flex min-h-0 flex-1 flex-col bg-[#020914]">
            {error && (
              <div className="m-4 border border-cyan-200/20 bg-[#06182c] p-4 text-xs leading-relaxed text-slate-200">
                {error}
              </div>
            )}

            {activeFile && (
              <>
                <div className="flex items-center justify-between border-b border-cyan-200/10 bg-[#041120] px-4 py-2">
                  <span className="font-mono text-xs text-cyan-200">{activeFile.path}</span>
                  <button
                    type="button"
                    onClick={() => void handleCopy()}
                    className="inline-flex items-center gap-1.5 border border-cyan-200/20 bg-[#071c33] px-2.5 py-1 font-mono text-[11px] text-slate-200 transition-colors hover:border-cyan-300/50 hover:text-white"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-300" />
                        <span>Đã sao chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5 text-cyan-300" />
                        <span>Sao chép tệp</span>
                      </>
                    )}
                  </button>
                </div>
                <pre className="flex-1 overflow-auto p-4 font-mono text-xs leading-relaxed text-slate-200 select-text">
                  <code>{activeFile.content || (loading ? 'Đang tải mã nguồn...' : 'Chọn một tệp để xem nội dung.')}</code>
                </pre>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
