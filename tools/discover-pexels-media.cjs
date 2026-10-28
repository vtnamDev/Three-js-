const { chromium } = require('playwright');

const pages = [
  { id: 'deep-dive-35588135', url: 'https://www.pexels.com/video/deep-blue-dive-underwater-exploration-adventure-35588135/' },
  { id: 'jellyfish-8950645', url: 'https://www.pexels.com/video/jellyfish-swimming-in-the-ocean-8950645/' },
  { id: 'jellyfish-dark-17177445', url: 'https://www.pexels.com/video/jellyfish-in-the-dark-with-green-and-blue-lights-17177445/' },
  { id: 'coral-clownfish-31366524', url: 'https://www.pexels.com/video/vibrant-clownfish-swimming-in-coral-reef-31366524/' },
  { id: 'coral-clownfish-34600697', url: 'https://www.pexels.com/video/vibrant-underwater-footage-of-clownfish-and-coral-34600697/' },
  { id: 'reef-clownfish-31201154', url: 'https://www.pexels.com/video/vivid-underwater-coral-reef-with-clownfish-31201154/' }
];

(async () => {
  const browser = await chromium.launch({ headless: true });
  const out = [];
  for (const item of pages) {
    const page = await browser.newPage();
    const mediaResponses = [];
    page.on('response', response => {
      if (/video-files|\.mp4|\.webm/i.test(response.url())) mediaResponses.push({url: response.url(), status: response.status(), type: response.headers()['content-type'] || ''});
    });
    let navigation = null;
    let dom = null;
    try {
      const response = await page.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      navigation = { status: response && response.status(), url: page.url() };
      await page.waitForTimeout(2500);
      dom = await page.evaluate(() => {
        const videos = [...document.querySelectorAll('video')].map(v => ({
          src: v.getAttribute('src'), currentSrc: v.currentSrc, poster: v.poster, readyState: v.readyState,
          width: v.videoWidth, height: v.videoHeight,
          sources: [...v.querySelectorAll('source')].map(s => ({src: s.src, type: s.type})),
          attrs: [...v.attributes].filter(a => /src|video|file|poster/i.test(a.name)).map(a => [a.name, a.value])
        }));
        const links = [...document.querySelectorAll('a[href]')].map(a => a.href).filter(h => /download\/video|video-files|\.mp4/i.test(h)).slice(0, 30);
        const resources = performance.getEntriesByType('resource').map(e => e.name).filter(n => /video-files|\.mp4|\.webm/i.test(n)).slice(0, 40);
        return {title: document.title, videos, links, resources, htmlHasVideoFiles: document.documentElement.innerHTML.includes('video-files')};
      });
    } catch (error) { navigation = { error: String(error) }; }
    out.push({...item, navigation, dom, mediaResponses: mediaResponses.slice(0, 60)});
    await page.close();
  }
  console.log('PEXELS_DISCOVERY=' + JSON.stringify(out));
  await browser.close();
})().catch(error => { console.error(error.stack || error); process.exit(1); });
