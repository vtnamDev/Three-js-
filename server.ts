import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getGeminiClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

const ROOT_SOURCE_FILES = [
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
  'vercel.json',
  'index.html',
  'server.ts',
  'metadata.json',
  '.env.example',
  'README.md',
  'ASSET_CREDITS.md',
  'CHANGELOG_V9.md',
  'ASSET_RESEARCH.md',
  'FINAL_REPORT.md',
  'WORKLOG.md',
];

function collectDirectoryFiles(baseDir: string, relDir: string, out: string[]): void {
  const fullDir = path.join(baseDir, relDir);
  if (!fs.existsSync(fullDir)) return;
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const relPath = path.posix.join(relDir, entry.name);
    if (entry.isDirectory()) {
      collectDirectoryFiles(baseDir, relPath, out);
    } else if (/\.(ts|tsx|css|json|md|html|csv)$/i.test(entry.name)) {
      out.push(relPath);
    }
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '256kb' }));

  // Server-side Marine Biology Field Notes API
  app.post('/api/pelagic-notes', async (req, res) => {
    try {
      const {
        question,
        mode = 'fast',
        chapterCode = '01',
        zoneNameVi = 'Rạn San Hô Ánh Dương',
        zoneNameEn = 'Sunlight Coral Crest',
        depthMeters = 0,
        scientificNote = '',
        history = [],
      } = req.body ?? {};

      if (typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'Câu hỏi không hợp lệ.' });
        return;
      }

      const ai = getGeminiClient();
      if (!ai) {
        res.status(503).json({
          error: 'Chưa cấu hình khóa API trên máy chủ.',
        });
        return;
      }

      const isDeep = mode === 'deep';
      const modelName = isDeep ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
      const modelLabel = isDeep
        ? 'Sổ tay Hải dương · Phân tích chuyên sâu'
        : 'Sổ tay Hải dương · Phản hồi tức thì';

      const historyContext = Array.isArray(history)
        ? history
            .slice(-4)
            .map((h: { role?: string; text?: string }) =>
              `${h.role === 'user' ? 'Người quan sát' : 'Nhà hải dương học'}: ${String(h.text ?? '')}`,
            )
            .join('\n')
        : '';

      const prompt = [
        `Bối cảnh hiện tại của tàu quan sát / hành trình cá lặn sâu:`,
        `- Tầng biển: ${chapterCode} — ${zoneNameVi} (${zoneNameEn})`,
        `- Độ sâu hiện tại: ${depthMeters} mét`,
        `- Ghi chú khoa học tại chỗ: ${scientificNote}`,
        historyContext ? `\nLịch sử trao đổi gần đây:\n${historyContext}` : '',
        `\nCâu hỏi mới: ${question.trim()}`,
      ]
        .filter(Boolean)
        .join('\n');

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction:
            'Bạn là nhà sinh học biển và hải dương học thực địa trên hành trình PELAGIC — The Deep Descent. Trả lời bằng tiếng Việt súc tích (khoảng 3 đến 5 câu), giàu tính khoa học chính xác về vật lý đại dương, áp suất thủy tĩnh, quang học dưới nước, địa chất rãnh sâu và giải phẫu vận động của cá.',
          thinkingConfig: {
            thinkingLevel: isDeep ? ThinkingLevel.HIGH : ThinkingLevel.MINIMAL,
          },
        },
      });

      res.json({
        answer: response.text ?? '',
        modelLabel,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Lỗi máy chủ khi xử lý ghi chú.';
      res.status(502).json({ error: message });
    }
  });

  // Live Source Code Explorer API so users can inspect & copy all project source files
  app.get('/api/source-files', (_req, res) => {
    try {
      const relPaths: string[] = [];
      collectDirectoryFiles(__dirname, 'src', relPaths);
      collectDirectoryFiles(__dirname, 'reports', relPaths);
      for (const rootFile of ROOT_SOURCE_FILES) {
        if (fs.existsSync(path.join(__dirname, rootFile))) {
          relPaths.push(rootFile);
        }
      }

      const files = relPaths.map((relPath) => {
        const absPath = path.join(__dirname, relPath);
        const content = fs.readFileSync(absPath, 'utf8');
        return {
          path: relPath,
          sizeBytes: Buffer.byteLength(content, 'utf8'),
          content,
        };
      });

      res.json({ files });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to read source files.';
      res.status(500).json({ error: message });
    }
  });

  // Direct download route for the verified PELAGIC_V9_SOURCE.zip archive (with backward-compatible aliases)
  app.get(
    [
      '/PELAGIC_V9_SOURCE.zip',
      '/PELAGIC_V5_SOURCE.zip',
      '/PELAGIC_V4_SOURCE.zip',
      '/api/download-source',
    ],
    (_req, res) => {
      const candidates = [
        path.join(__dirname, 'PELAGIC_V9_SOURCE.zip'),
        path.join(__dirname, 'public', 'PELAGIC_V9_SOURCE.zip'),
        path.join(__dirname, 'dist', 'PELAGIC_V9_SOURCE.zip'),
      ];
      const zipPath = candidates.find((p) => fs.existsSync(p));
      if (!zipPath) {
        res.status(404).json({ error: 'PELAGIC_V9_SOURCE.zip not found on server.' });
        return;
      }
      res.setHeader('Content-Type', 'application/zip');
      res.download(zipPath, 'PELAGIC_V9_SOURCE.zip');
    },
  );

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PELAGIC server listening on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
