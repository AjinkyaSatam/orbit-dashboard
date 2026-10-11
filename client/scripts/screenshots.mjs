#!/usr/bin/env node
/**
 * scripts/screenshots.mjs
 * Takes full-page and viewport screenshots with Playwright at 375, 768 and 1440 px in light and dark mode.
 * Outputs to public/screenshots/ and logs dimensions.
 */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'public/screenshots');

await fs.mkdir(OUT_DIR, { recursive: true });

const SIZES = [
  { name: 'mobile', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
];

const THEMES = ['dark', 'light'];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

console.log('Capturing screenshots from http://localhost:5173 ...');

for (const theme of THEMES) {
  for (const size of SIZES) {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

    // Set theme
    await page.evaluate((th) => {
      document.documentElement.setAttribute('data-theme', th);
      localStorage.setItem('sentinel-theme', th);
    }, theme);

    await page.waitForTimeout(600);

    const outPath = path.join(OUT_DIR, `${theme}-${size.width}.png`);
    await page.screenshot({ path: outPath, fullPage: false });
    console.log(`Saved screenshot: ${theme}-${size.width}.png`);

    // Also hero detail
    const heroDetailPath = path.join(OUT_DIR, `${theme}-${size.width}-hero.png`);
    await page.screenshot({ path: heroDetailPath, clip: { x: 0, y: 0, width: size.width, height: Math.min(size.height, 900) } });
  }
}

await browser.close();
console.log('All screenshots captured successfully.');
