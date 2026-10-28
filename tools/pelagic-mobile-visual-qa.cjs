const { chromium } = require('playwright');
const fs = require('node:fs');

const target = process.env.PELAGIC_URL || 'https://pelagic-deep-descent.vercel.app/?autostart=1';
const errors = [];
const warnings = [];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  page.on('pageerror', (e) => errors.push(String(e.stack || e)));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); if (msg.type() === 'warning') warnings.push(msg.text()); });
  page.on('requestfailed', (req) => errors.push(`REQUEST_FAILED ${req.url()} ${req.failure()?.errorText || ''}`));
  const response = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.waitForTimeout(8000);
  const inspect = async (label) => {
    const data = await page.evaluate((label) => {
      const rect = (sel) => { const e = document.querySelector(sel); if (!e) return null; const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return { exists: true, visible: !!(r.width && r.height) && s.display !== 'none' && s.visibility !== 'hidden' && Number(s.opacity) > 0.01, rect: { x: Math.round(r.x), y: Math.round(r.y), width: Math.round(r.width), height: Math.round(r.height) }, zIndex: s.zIndex, color: s.color, opacity: s.opacity }; };
      const canvas = document.querySelector('canvas[data-testid="pelagic-webgl-canvas"]');
      const cRect = canvas?.getBoundingClientRect();
      return { label, href: location.href, title: document.title, bodyStatus: document.body.dataset.fishStatus || null, chapter: document.body.dataset.chapter || null, progress: document.body.dataset.progress || null, depth: document.body.dataset.depth || null, webglCanvasCount: document.querySelectorAll('canvas').length, scrollHeight: document.documentElement.scrollHeight, hudTitle: rect('[data-testid="hud-chapter-title"]'), hudDepth: rect('[data-testid="hud-depth-readout"]'), toolbar: rect('[data-testid="bottom-dock"]'), canvas: canvas ? { rect: {x:Math.round(cRect.x),y:Math.round(cRect.y),width:Math.round(cRect.width),height:Math.round(cRect.height)}, width:canvas.width, height:canvas.height } : null, gl: (()=>{ try { const gl=canvas?.getContext('webgl2') || canvas?.getContext('webgl'); if (!gl) return 'unavailable'; return { renderer: gl.getParameter(gl.RENDERER), vendor: gl.getParameter(gl.VENDOR) }; } catch(e) { return String(e); } })() };
    }, label);
    return data;
  };
  const start = await inspect('surface');
  await page.screenshot({ path: '/tmp/pelagic-surface.jpg', type: 'jpeg', quality: 52 });
  await page.evaluate(() => window.scrollTo(0, Math.round((document.documentElement.scrollHeight - window.innerHeight) * 0.48)));
  await page.waitForTimeout(3500);
  const middle = await inspect('mid-descent');
  await page.screenshot({ path: '/tmp/pelagic-mid.jpg', type: 'jpeg', quality: 52 });
  console.log('VISUAL_QA=' + JSON.stringify({ httpStatus: response?.status(), start, middle, errors: [...new Set(errors)].slice(0, 30), warnings: [...new Set(warnings)].slice(0, 20) }));
  for (const [name, path] of [['surface','/tmp/pelagic-surface.jpg'],['middle','/tmp/pelagic-mid.jpg']]) {
    console.log('SCREENSHOT_' + name.toUpperCase() + '=' + fs.readFileSync(path).toString('base64'));
  }
  await browser.close();
  if (!start.hudTitle?.visible || !start.hudDepth?.visible || !start.webglCanvasCount) process.exitCode = 2;
})().catch((err) => { console.error(err.stack || err); process.exit(1); });
