import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const restoreDir = path.join(root, '.restore');
const chunks = readdirSync(restoreDir).filter((name) => /^part\d+\.b64$/.test(name)).sort();
if (chunks.length !== 24) throw new Error('Expected 24 source chunks; found ' + chunks.length);
const archive = path.join(restoreDir, 'source.tar.gz');
const encoded = chunks.map((name) => readFileSync(path.join(restoreDir, name), 'utf8').trim()).join('');
writeFileSync(archive, Buffer.from(encoded, 'base64'));
execFileSync('tar', ['-tzf', archive], { stdio: 'ignore' });
execFileSync('tar', ['-xzf', archive, '-C', root], { stdio: 'inherit' });

// Vercel serves static assets; the old source viewer called an Express-only endpoint.
const modalPath = path.join(root, 'src/ui/SourceCodeModal.tsx');
let modal = readFileSync(modalPath, 'utf8');
if (!modal.includes('const SOURCE_PATHS =')) {
  const insertAt = modal.indexOf('export interface SourceFileEntry');
  if (insertAt < 0) throw new Error('SourceCodeModal interface marker not found');
  const constants = [
    "const SOURCE_PATHS = [",
    "  'src/App.tsx', 'src/main.tsx', 'src/index.css',",
    "  'src/experience/OceanCanvas.tsx', 'src/experience/OceanSceneController.ts',",
    "  'src/experience/OceanWorldBuilder.ts', 'src/experience/effectRegistry.ts',",
    "  'src/experience/proceduralTextures.ts', 'src/lib/chapterConfig.ts',",
    "  'src/lib/fishPath.ts', 'src/lib/fishSwim.ts', 'src/lib/oceanAudio.ts',",
    "  'src/lib/qualityTier.ts', 'src/lib/scrollDirector.ts',",
    "  'src/ui/DepthHUD.tsx', 'src/ui/LoadingOverlay.tsx',",
    "  'src/ui/MarineFieldNotesDrawer.tsx', 'src/ui/SourceCodeModal.tsx',",
    "  'src/ui/WebGLFallback.tsx', 'package.json', 'vite.config.ts',",
    "  'tsconfig.json', 'vercel.json',",
    "];",
    "const RAW_BASE = 'https://raw.githubusercontent.com/vtnamDev/Three-js-/main';",
    ""
  ].join('\n');
  modal = modal.slice(0, insertAt) + constants + modal.slice(insertAt);
  const start = modal.indexOf('    setLoading(true);', modal.indexOf('export function SourceCodeModal'));
  const end = modal.indexOf('\n    return () => {', start);
  if (start < 0 || end < 0) throw new Error('SourceCodeModal effect markers not found');
  const replacement = [
    "    setLoading(true);",
    "    setError(null);",
    "",
    "    Promise.all(SOURCE_PATHS.map(async (filePath) => {",
    "      const response = await fetch(RAW_BASE + '/' + filePath);",
    "      if (!response.ok) throw new Error(filePath + ': HTTP ' + response.status);",
    "      const content = await response.text();",
    "      return { path: filePath, sizeBytes: new Blob([content]).size, content };",
    "    }))",
    "      .then((loaded) => {",
    "        if (cancelled) return;",
    "        setFiles(loaded);",
    "        if (loaded.length && !loaded.some((file) => file.path === selectedPath)) {",
    "          setSelectedPath(loaded[0].path);",
    "        }",
    "      })",
    "      .catch(() => {",
    "        if (!cancelled) setError('Không thể tải mã nguồn trực tiếp. Hãy dùng nút Tải trọn bộ ZIP để mở dự án trên GitHub.');",
    "      })",
    "      .finally(() => {",
    "        if (!cancelled) setLoading(false);",
    "      });"
  ].join('\n');
  modal = modal.slice(0, start) + replacement + modal.slice(end);
  writeFileSync(modalPath, modal);
}
