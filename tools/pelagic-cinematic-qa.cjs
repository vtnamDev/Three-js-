const { chromium } = require('playwright');

const target = process.env.PELAGIC_URL || 'http://127.0.0.1:4173/?autostart=1';
const errors = [];
const failedRequests = [];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  page.on('pageerror', e => errors.push(String(e.stack || e)));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('requestfailed', req => failedRequests.push({ url: req.url(), error: req.failure()?.errorText || '' }));
  const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(19000);

  const inspect = async label => page.evaluate(label => {
    const rect = selector => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const r = element.getBoundingClientRect();
      const s = getComputedStyle(element);
      return { visible: !!(r.width && r.height) && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.01,
        rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }, zIndex: s.zIndex };
    };
    const videos = [...document.querySelectorAll('video[data-pelagic-film]')].map(v => ({
      id: v.dataset.pelagicFilm, src: v.currentSrc || v.src, readyState: v.readyState,
      networkState: v.networkState, duration: Number.isFinite(v.duration) ? Number(v.duration.toFixed(2)) : null,
      currentTime: Number(v.currentTime.toFixed(2)), paused: v.paused, error: v.error ? { code: v.error.code, message: v.error.message } : null,
      width: v.videoWidth, height: v.videoHeight
    }));
    const canvas = document.querySelector('canvas[data-testid="pelagic-film-canvas"]');
    return {
      label, title: document.title, bodyStatus: document.body.dataset.cinematicStatus || null,
      chapter: document.body.dataset.cinematicChapter || null, progress: document.body.dataset.cinematicProgress || null,
      fps: document.body.dataset.cinematicFrameRate || null,
      reel: rect('[data-testid="pelagic-cinematic-reel"]'),
      hudTitle: rect('[data-testid="hud-chapter-title"]'), hudDepth: rect('[data-testid="hud-depth-readout"]'),
      canvas: canvas ? { width: canvas.width, height: canvas.height, rect: rect('canvas[data-testid="pelagic-film-canvas"]') } : null,
      videoCount: videos.length, videos, scrollHeight: document.documentElement.scrollHeight
    };
  }, label);
  const surface = await inspect('surface');
  await page.screenshot({ path: '/tmp/pelagic-film-surface.jpg', type: 'jpeg', quality: 80 });
  await page.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - innerHeight) * 0.48)));
  await page.waitForTimeout(2200);
  const middle = await inspect('mid-descent');
  await page.screenshot({ path: '/tmp/pelagic-film-middle.jpg', type: 'jpeg', quality: 80 });
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1800);
  const hadal = await inspect('hadal');
  await page.screenshot({ path: '/tmp/pelagic-film-hadal.jpg', type: 'jpeg', quality: 80 });
  console.log('CINEMATIC_QA=' + JSON.stringify({ httpStatus: response?.status(), surface, middle, hadal, errors: [...new Set(errors)].slice(0, 25), failedRequests: failedRequests.slice(0, 30) }));
  await browser.close();
})().catch(err => { console.error(err.stack || err); process.exit(1); });
