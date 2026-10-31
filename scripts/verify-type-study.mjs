import { chromium, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

// Real browser audit, deliberately separate from functional/authentication E2E.
const baseURL = process.env.TYPE_STUDY_URL ?? 'http://127.0.0.1:3000';
const output = 'docs/type-study/after';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const views = {
  desktop: { width: 1440, height: 1000 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
};
const routes = [
  '/',
  '/pokedex',
  '/equipes',
  '/gerador',
  '/builds',
  '/analisador',
  '/comparador',
  '/tiers',
  '/assistente',
  '/favoritos',
  '/minhas-equipes',
  '/perfil',
  '/fontes',
  '/pokemon/6?game=sword',
  '/rota-inexistente',
];
const sample = [
  [1, 'bulbasaur', 'sword'],
  [6, 'charizard', 'sword'],
  [25, 'pikachu', 'sword'],
  [94, 'gengar', 'sword'],
  [487, 'giratina', 'sword'],
  [384, 'rayquaza', 'sword'],
  [321, 'wailord', 'sword'],
  [102, 'exeggcute', 'sword'],
  [201, 'unown', 'arceus'],
  [10007, 'giratina-origin', 'sword'],
  [10034, 'mega-charizard-x', 'za'],
  [10104, 'alolan-ninetales', 'sword'],
];
const report = { baseURL, views, routes: [], species: [], failures: [] };
const slug = (path) =>
  path === '/' ? 'dashboard' : path.startsWith('/pokemon') ? 'charizard' : path.slice(1);
async function ready(page) {
  await page
    .locator('main h1:visible, main .page-heading:visible, main .empty-state:visible')
    .first()
    .waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.race([
      Promise.all(
        [...document.images]
          .filter((img) => {
            const rect = img.getBoundingClientRect();
            return (
              rect.width > 0 &&
              rect.height > 0 &&
              (img.loading !== 'lazy' || rect.top < innerHeight)
            );
          })
          .map((img) => img.decode().catch(() => {})),
      ),
      new Promise((resolve) => setTimeout(resolve, 15000)),
    ]);
  });
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
}
async function inspect(page, label) {
  const measurements = await page.evaluate(() => ({
    width: innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    actualTheme: document.documentElement.dataset.theme,
    missingImages: [...document.querySelectorAll('main img')]
      .filter(
        (img) =>
          img.getBoundingClientRect().width > 0 &&
          img.getBoundingClientRect().height > 0 &&
          img.getBoundingClientRect().top < innerHeight &&
          (!img.complete || !img.naturalWidth),
      )
      .map((img) => img.alt),
    emptyButtons: [...document.querySelectorAll('main button')].filter(
      (el) => !el.textContent?.trim() && !el.getAttribute('aria-label'),
    ).length,
  }));
  const contrast = await page.evaluate(() => {
    const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    const colors = new Map();
    const styles = new WeakMap();
    const styleFor = (element) => {
      if (!styles.has(element)) styles.set(element, getComputedStyle(element));
      return styles.get(element);
    };
    const rgba = (color) => {
      if (colors.has(color)) return [...colors.get(color)];
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const result = [...ctx.getImageData(0, 0, 1, 1).data].map((v, i) => (i === 3 ? v / 255 : v));
      colors.set(color, result);
      return [...result];
    };
    const blend = (front, back) =>
      [0, 1, 2].map((i) => front[i] * front[3] + back[i] * (1 - front[3]));
    const lum = (rgb) =>
      rgb
        .map((v) => v / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
        .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
    const issues = [];
    for (const el of document.querySelectorAll('main *, .sidebar a, .topbar button')) {
      if (
        !(el instanceof HTMLElement) ||
        ![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())
      )
        continue;
      if (!el.getClientRects().length || el.closest('[aria-hidden="true"], [inert], :disabled'))
        continue;
      const cs = styleFor(el);
      if (cs.visibility === 'hidden') continue;
      const ancestors = [];
      for (let node = el; node; node = node.parentElement) ancestors.push(node);
      let bg = [255, 255, 255];
      let opacity = 1;
      for (const node of ancestors.reverse()) {
        const style = styleFor(node);
        bg = blend(rgba(style.backgroundColor), bg);
        opacity *= Number(style.opacity);
      }
      const fg = rgba(cs.color);
      fg[3] *= opacity;
      const a = lum(blend(fg, bg)),
        b = lum(bg);
      const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      const large =
        parseFloat(cs.fontSize) >= 24 ||
        (parseFloat(cs.fontSize) >= 18.66 && parseInt(cs.fontWeight) >= 700);
      if (ratio + 0.02 < (large ? 3 : 4.5))
        issues.push({
          text: el.textContent.trim().slice(0, 80),
          class: el.className,
          ratio: +ratio.toFixed(2),
          required: large ? 3 : 4.5,
        });
    }
    return issues;
  });
  measurements.contrastIssues = contrast;
  if (contrast.length) report.failures.push({ label, issue: 'text-contrast', entries: contrast });
  if (measurements.scrollWidth > measurements.width + 1)
    report.failures.push({ label, issue: 'horizontal-overflow', ...measurements });
  if (measurements.emptyButtons)
    report.failures.push({ label, issue: 'unnamed-button', ...measurements });
  if (measurements.missingImages.length)
    report.failures.push({
      label,
      issue: 'missing-visible-images',
      images: measurements.missingImages,
    });
  return measurements;
}
try {
  for (const [view, viewport] of Object.entries(views)) {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
      await context.addInitScript((theme) => localStorage.setItem('hub-theme', theme), theme);
      const page = await context.newPage();
      page.on('pageerror', (error) =>
        report.failures.push({ view, theme, issue: 'pageerror', message: error.message }),
      );
      for (const path of routes) {
        await page.goto(baseURL + path);
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await ready(page);
        if (path === '/fontes') {
          await expect(page.locator('.sources-page .metrics-strip')).toContainText('Conectado');
          await expect(page.locator('.sources-page .source-row').first()).toBeVisible();
        }
        const measurements = await inspect(page, `${view}-${theme}-${path}`);
        const filename = `${view}-${theme}-${slug(path)}.png`;
        await page.screenshot({
          path: `${output}/${filename}`,
          fullPage: false,
          animations: 'disabled',
        });
        report.routes.push({ view, theme, path, screenshot: filename, ...measurements });
      }
      // Sample all requested silhouettes in both themes on desktop and mobile.
      if (view !== 'tablet')
        for (const [id, name, game] of sample) {
          await page.goto(`${baseURL}/pokemon/${id}?game=${game}`);
          await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
          await page.locator('.pokemon-hero:visible').waitFor();
          await ready(page);
          const measurements = await inspect(page, `${view}-${theme}-${name}`);
          const filename = `${view}-${theme}-${name}.png`;
          await page.screenshot({
            path: `${output}/${filename}`,
            fullPage: false,
            animations: 'disabled',
          });
          report.species.push({
            view,
            theme,
            id,
            name,
            game,
            screenshot: filename,
            ...measurements,
          });
        }
      await context.close();
      console.log(`${view} ${theme}: routes and species captured.`);
    }
  }
} finally {
  await browser.close();
  writeFileSync('docs/type-study/browser-audit.json', JSON.stringify(report, null, 2) + '\n');
}
console.log(
  `${report.routes.length} route views, ${report.species.length} species views, ${report.failures.length} failures.`,
);
if (report.failures.length) process.exitCode = 1;
