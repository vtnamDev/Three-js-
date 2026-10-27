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

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '256kb' }));

  // Server-side Marine Biology Field Notes API (uses free/standard Gemini models only)
  app.post('/api/pelagic-notes', async (req, res) => {
    try {
      const {
        question,
        mode = 'fast',
        chapterCode = '01',
        zoneNameVi = 'Mặt Nước Ánh Dương',
        zoneNameEn = 'Epipelagic Surface',
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
          error: 'Chưa cấu hình khóa GEMINI_API_KEY trên máy chủ.',
        });
        return;
      }

      const isDeep = mode === 'deep';
      const modelName = isDeep ? 'gemini-3.8-flash' : 'gemini-3.1-flash-lite';
      const modelLabel = isDeep
        ? 'Gemini 3.8 Flash · Phân tích chuyên sâu'
        : 'Gemini 3.1 Flash-Lite · Phản hồi tức thì';

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
      const message = err instanceof Error ? err.message : 'Lỗi máy chủ khi gọi Gemini API.';
      res.status(502).json({ error: message });
    }
  });

  // Direct download route for the verified PELAGIC_V4_SOURCE.zip archive
  app.get(['/PELAGIC_V4_SOURCE.zip', '/api/download-source'], (_req, res) => {
    const zipPath = path.join(__dirname, 'PELAGIC_V4_SOURCE.zip');
    if (!fs.existsSync(zipPath)) {
      res.status(404).json({ error: 'PELAGIC_V4_SOURCE.zip not found on server.' });
      return;
    }
    res.setHeader('Content-Type', 'application/zip');
    res.download(zipPath, 'PELAGIC_V4_SOURCE.zip');
  });

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
