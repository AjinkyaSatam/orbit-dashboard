#!/usr/bin/env node
/**
 * generate-assets.mjs — builds every logo, favicon, background and illustration
 * raster used by the site, from code. Deterministic (seeded PRNG): running it
 * twice produces identical files.
 *
 *   npm run assets            # everything
 *   npm run assets -- hero    # only jobs whose name contains "hero"
 *
 * Output: client/public/images/** and client/public/ (favicons, manifest, OG).
 * Dev-only dependencies: sharp, d3-geo, topojson-client, world-atlas, satori, @resvg/resvg-js,
 * plus the Inter font files shipped by @fontsource/inter (never system fonts).
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { geoNaturalEarth1, geoContains } from 'd3-geo';
import { feature } from 'topojson-client';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUB = path.join(ROOT, 'public');
const IMG = path.join(PUB, 'images');
const ART = path.join(IMG, 'art');

const { siteConfig } = await import(pathToFileURL(path.join(ROOT, 'src/content/siteConfig.js')).href);
const { buildMarkSvg } = await import(pathToFileURL(path.join(ROOT, 'src/lib/logoMark.js')).href);

const report = [];

/* ───────────────────────── helpers ───────────────────────── */

/** Seeded PRNG so output is reproducible. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const toLin = (c) => {
  const v = c / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const linHex = (h) => hex(h).map(toLin);

// linear → sRGB lookup (float 0..1 → 0..255 float)
const LUT_N = 8192;
const LIN2SRGB = new Float32Array(LUT_N + 1);
for (let i = 0; i <= LUT_N; i++) {
  const v = i / LUT_N;
  LIN2SRGB[i] = 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055);
}
const linToSrgb = (v) => LIN2SRGB[Math.max(0, Math.min(LUT_N, Math.round(v * LUT_N)))];

async function ensureDir(d) {
  await fs.mkdir(d, { recursive: true });
}

async function write(file, data, usage) {
  await ensureDir(path.dirname(file));
  await fs.writeFile(file, data);
  const { size } = await fs.stat(file);
  const rel = path.relative(ROOT, file).replaceAll('\\', '/');
  report.push({ file: rel, kb: +(size / 1024).toFixed(1), usage });
  return file;
}

/**
 * Paint a "mesh gradient": base colour plus soft anisotropic gaussian blobs,
 * composited in linear light (no muddy mid-tones), then converted to sRGB with
 * triangular-PDF dithering + optional luminance grain so there is no banding.
 *
 * blob: { x, y, rx, ry, rot?, color, a, mode?: 'normal'|'add' }   (x/y/rx/ry are 0..1 of W/H)
 */
function paintField(W, H, { base, blobs = [], vgrad = null, vignette = 0, grain = 2.2, dither = 1.2, seed = 1, extra = null }) {
  const rnd = mulberry32(seed);
  const out = Buffer.alloc(W * H * 3);
  const b0 = linHex(base);
  const vg = vgrad ? { top: linHex(vgrad.top), bottom: linHex(vgrad.bottom), a: vgrad.a ?? 1 } : null;
  const B = blobs.map((b) => ({
    ...b,
    c: linHex(b.color),
    cos: Math.cos(b.rot || 0),
    sin: Math.sin(b.rot || 0),
    irx: 1 / (b.rx * W),
    iry: 1 / (b.ry * H),
  }));
  for (let y = 0; y < H; y++) {
    const v = y / (H - 1);
    for (let x = 0; x < W; x++) {
      let r = b0[0];
      let g = b0[1];
      let bl = b0[2];
      if (vg) {
        const t = v * vg.a;
        r = r * (1 - t) + (vg.top[0] * (1 - v) + vg.bottom[0] * v) * t;
        g = g * (1 - t) + (vg.top[1] * (1 - v) + vg.bottom[1] * v) * t;
        bl = bl * (1 - t) + (vg.top[2] * (1 - v) + vg.bottom[2] * v) * t;
      }
      for (let i = 0; i < B.length; i++) {
        const k = B[i];
        const dx = x - k.x * W;
        const dy = y - k.y * H;
        const ux = (dx * k.cos + dy * k.sin) * k.irx;
        const uy = (-dx * k.sin + dy * k.cos) * k.iry;
        const d2 = ux * ux + uy * uy;
        if (d2 > 9) continue;
        const w = k.a * Math.exp(-d2 * 1.6);
        if (k.mode === 'add') {
          r += k.c[0] * w;
          g += k.c[1] * w;
          bl += k.c[2] * w;
        } else {
          r = r * (1 - w) + k.c[0] * w;
          g = g * (1 - w) + k.c[1] * w;
          bl = bl * (1 - w) + k.c[2] * w;
        }
      }
      if (extra) [r, g, bl] = extra(x, y, r, g, bl);
      if (vignette) {
        const u = x / (W - 1) - 0.5;
        const vv = v - 0.5;
        const f = 1 - vignette * Math.min(1, (u * u + vv * vv) * 2.2);
        r *= f;
        g *= f;
        bl *= f;
      }
      const tri = (rnd() + rnd() - 1) * dither; // TPDF dither
      const gr = (rnd() + rnd() + rnd() - 1.5) * grain; // luminance grain (≈gaussian)
      const o = (y * W + x) * 3;
      out[o] = Math.max(0, Math.min(255, linToSrgb(r) + tri + gr));
      out[o + 1] = Math.max(0, Math.min(255, linToSrgb(g) + tri + gr));
      out[o + 2] = Math.max(0, Math.min(255, linToSrgb(bl) + tri + gr));
    }
  }
  return sharp(out, { raw: { width: W, height: H, channels: 3 } });
}

/** Add dither + grain to an already rasterised sharp image (used for SVG art). */
async function ditherSharp(img, { grain = 2, dither = 1.2, seed = 7 } = {}) {
  const { data, info } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const rnd = mulberry32(seed);
  for (let i = 0; i < data.length; i += 3) {
    const tri = (rnd() + rnd() - 1) * dither;
    const gr = (rnd() + rnd() + rnd() - 1.5) * grain;
    for (let c = 0; c < 3; c++) data[i + c] = Math.max(0, Math.min(255, data[i + c] + tri + gr));
  }
  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } });
}

const webp = (img, q = 78) => img.webp({ quality: q, effort: 6, smartSubsample: true }).toBuffer();

const font = (w) => fs.readFile(require.resolve(`@fontsource/inter/files/inter-latin-${w}-normal.woff`));

/* ───────────────────────── 1. logo ───────────────────────── */

async function logo() {
  await write(path.join(IMG, 'logo/logo-mark.svg'), buildMarkSvg({ variant: 'color', size: 48 }), 'Full-colour mark (docs, README)');
  await write(path.join(IMG, 'logo/logo-mark-mono.svg'), buildMarkSvg({ variant: 'mono', size: 48 }), 'Monochrome mark, inherits currentColor');

  // Horizontal lockups: text converted to vector paths with satori + embedded Inter (no system fonts).
  const fonts = [{ name: 'Inter', data: await font(600), weight: 600, style: 'normal' }];
  const markUri = `data:image/svg+xml;base64,${Buffer.from(buildMarkSvg({ variant: 'color', size: 96 })).toString('base64')}`;
  for (const [suffix, color, usage] of [
    ['light', '#1d1d1f', 'Lockup for light backgrounds'],
    ['dark', '#f5f5f7', 'Lockup for dark backgrounds'],
  ]) {
    const svg = await satori(
      {
        type: 'div',
        props: {
          style: { display: 'flex', alignItems: 'center', gap: 14, height: 64, width: 900, color },
          children: [
            { type: 'img', props: { src: markUri, width: 48, height: 48 } },
            { type: 'div', props: { style: { fontSize: 36, fontWeight: 600, letterSpacing: -0.8 }, children: siteConfig.name } },
          ],
        },
      },
      { width: 900, height: 64, fonts }
    );
    // Crop the canvas to the real content box.
    const bbox = new Resvg(svg).getBBox();
    const w = Math.ceil(bbox.x + bbox.width + 2);
    const cropped = svg.replace(/^<svg([^>]*?)width="\d+" height="\d+" viewBox="0 0 \d+ \d+"/, `<svg$1width="${w}" height="64" viewBox="0 0 ${w} 64"`);
    await write(path.join(IMG, `logo/logo-lockup-${suffix}.svg`), cropped, usage);
  }
}

/* ───────────────────────── 2. favicons ───────────────────────── */

async function favicons() {
  const tileSvg = buildMarkSvg({ variant: 'color', preset: 'regular', size: 64, tile: 'rounded', inset: 0.78 });
  await write(path.join(PUB, 'favicon.svg'), tileSvg, '<link rel=icon type=image/svg+xml>');

  const png = (svg, s) => sharp(Buffer.from(svg), { density: 72 * (s / 48) * 2 }).resize(s, s).png({ compressionLevel: 9 }).toBuffer();
  const bold = buildMarkSvg({ variant: 'color', preset: 'bold', size: 48, tile: 'rounded', inset: 0.86 });
  await write(path.join(PUB, 'favicon-16.png'), await png(bold, 16), 'Legacy 16px favicon');
  await write(path.join(PUB, 'favicon-32.png'), await png(bold, 32), 'Legacy 32px favicon');

  const square = buildMarkSvg({ variant: 'color', size: 48, tile: 'square', inset: 0.66 });
  await write(path.join(PUB, 'apple-touch-icon.png'), await png(square, 180), 'iOS home screen');
  const rounded = buildMarkSvg({ variant: 'color', size: 48, tile: 'rounded', inset: 0.72 });
  await write(path.join(PUB, 'icon-192.png'), await png(rounded, 192), 'Web manifest');
  await write(path.join(PUB, 'icon-512.png'), await png(rounded, 512), 'Web manifest');
  // Maskable: full-bleed background, mark inside the 80% safe zone.
  const maskable = buildMarkSvg({ variant: 'color', size: 48, tile: 'square', inset: 0.56 });
  await write(path.join(PUB, 'icon-maskable-512.png'), await png(maskable, 512), 'Web manifest (maskable)');

  const manifest = {
    name: siteConfig.name,
    short_name: siteConfig.shortName || siteConfig.name,
    description: siteConfig.tagline,
    start_url: '/',
    display: 'standalone',
    background_color: siteConfig.palette.navy,
    theme_color: siteConfig.palette.navy,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
  await write(path.join(PUB, 'site.webmanifest'), JSON.stringify(manifest, null, 2) + '\n', 'PWA manifest');
}

/* ───────────────────────── 3. hero background ───────────────────────── */

const HERO_BLOBS = [
  { x: 0.08, y: 0.05, rx: 0.55, ry: 0.6, color: '#04060f', a: 0.85 }, // calm, dark upper-left for the headline
  { x: 0.72, y: 0.42, rx: 0.42, ry: 0.55, color: '#5b3df5', a: 0.62, rot: -0.35 },
  { x: 0.5, y: 0.82, rx: 0.5, ry: 0.32, color: '#1b2a86', a: 0.55 },
  { x: 0.84, y: 0.18, rx: 0.22, ry: 0.28, color: '#2f5bff', a: 0.28 },
  { x: 0.9, y: 0.9, rx: 0.24, ry: 0.26, color: '#19c3b1', a: 0.22, mode: 'add' }, // faint teal glow lower right
  { x: 0.62, y: 0.55, rx: 0.12, ry: 0.16, color: '#8f7bff', a: 0.12, mode: 'add' },
];

async function hero() {
  const W = 2560;
  const H = 1440;
  const img = paintField(W, H, { base: '#070b1a', blobs: HERO_BLOBS, vignette: 0.25, grain: 2.4, seed: 11 });
  const buf = await img.png().toBuffer();
  await write(path.join(IMG, 'hero-bg.webp'), await webp(sharp(buf), 74), 'Hero background (desktop, preloaded)');
  await write(path.join(IMG, 'hero-bg-1280.webp'), await webp(sharp(buf).resize(1280, 720), 76), 'Hero background (mobile/tablet srcset)');
  return buf;
}

/* ───────────────────────── 4. grain ───────────────────────── */

async function grain() {
  const S = 512;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}">
  <filter id="n" x="0" y="0" width="100%" height="100%" filterUnits="userSpaceOnUse">
    <feTurbulence type="fractalNoise" baseFrequency="0.82" numOctaves="3" seed="7" stitchTiles="stitch" result="t"/>
    <feColorMatrix type="matrix" values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 0 1"/>
  </filter>
  <rect width="${S}" height="${S}" filter="url(#n)"/></svg>`;
  const buf = await sharp(Buffer.from(svg)).greyscale().normalise().png({ palette: true, colors: 16, compressionLevel: 9, effort: 10 }).toBuffer();
  await write(path.join(IMG, 'grain.png'), buf, 'Tileable film grain overlay (CSS, 5% opacity)');
}

/* ───────────────────────── 5. world map ───────────────────────── */

const CITIES = {
  sf: [-122.42, 37.77],
  ny: [-74.0, 40.71],
  sp: [-46.63, -23.55],
  ld: [-0.13, 51.51],
  nb: [36.82, -1.29],
  sg: [103.82, 1.35],
  tk: [139.69, 35.69],
  sy: [151.21, -33.87],
};
const ROUTES = [
  ['sf', 'ny'],
  ['ny', 'ld'],
  ['ny', 'sp'],
  ['ld', 'nb'],
  ['ld', 'sg'],
  ['sg', 'tk'],
  ['sg', 'sy'],
];

async function worldMap() {
  const W = 2400;
  const H = 1200;
  const topo = JSON.parse(await fs.readFile(require.resolve('world-atlas/land-50m.json'), 'utf8'));
  const land = feature(topo, topo.objects.land);
  const proj = geoNaturalEarth1().fitExtent(
    [
      [30, 20],
      [W - 30, H + 150],
    ],
    { type: 'Sphere' }
  ); // bottom extends past the canvas: Antarctica is cropped, not redrawn
  const STEP = 13;
  let d = '';
  let n = 0;
  for (let y = STEP / 2; y < H; y += STEP) {
    for (let x = STEP / 2; x < W; x += STEP) {
      const ll = proj.invert([x, y]);
      if (!ll || !Number.isFinite(ll[0])) continue;
      const back = proj(ll);
      if (!back || Math.hypot(back[0] - x, back[1] - y) > 0.5) continue; // outside the globe outline
      if (ll[1] < -58) continue;
      if (geoContains(land, ll)) {
        d += `M${x} ${y}h0`;
        n++;
      }
    }
  }
  const P = Object.fromEntries(Object.entries(CITIES).map(([k, v]) => [k, proj(v).map((q) => +q.toFixed(1))]));
  const arcs = ROUTES.map(([a, b]) => {
    const [x1, y1] = P[a];
    const [x2, y2] = P[b];
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dist = Math.hypot(x2 - x1, y2 - y1);
    return `M${x1} ${y1}Q${mx.toFixed(1)} ${(my - dist * 0.32).toFixed(1)} ${x2} ${y2}`;
  });
  const nodes = Object.values(P)
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="#19c3b1" fill-opacity="0.14"/><circle cx="${x}" cy="${y}" r="6" fill="#19c3b1"/><circle cx="${x}" cy="${y}" r="2.4" fill="#eafffb"/>`)
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="dots" x1="0" y1="0" x2="${W}" y2="${H}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#6f86c9"/><stop offset="0.6" stop-color="#7b6fd6"/><stop offset="1" stop-color="#3fb8b0"/></linearGradient>
  <linearGradient id="arc" x1="0" y1="0" x2="${W}" y2="0" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#19c3b1"/><stop offset="0.5" stop-color="#5fe3d4"/><stop offset="1" stop-color="#19c3b1"/></linearGradient>
  <filter id="glow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="7"/></filter>
</defs>
<!-- ${n} land samples on a ${STEP}px grid, Natural Earth 1:50m land (world-atlas) -->
<path d="${d}" stroke="url(#dots)" stroke-width="5.2" stroke-linecap="round" stroke-opacity="0.55" fill="none"/>
<g fill="none" stroke-linecap="round">
  <g stroke="#19c3b1" stroke-width="9" stroke-opacity="0.35" filter="url(#glow)"><path d="${arcs.join('')}"/></g>
  <path d="${arcs.join('')}" stroke="url(#arc)" stroke-width="2.4" stroke-opacity="0.95"/>
</g>
<g filter="url(#glow)" opacity="0.6">${Object.values(P).map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#19c3b1"/>`).join('')}</g>
${nodes}
</svg>`;
  await write(path.join(IMG, 'anywhere-map.svg'), svg, 'Dot-matrix world map (vector source)');
  const raster = await sharp(Buffer.from(svg)).resize(2000, 1000).webp({ quality: 72, alphaQuality: 75, effort: 6 }).toBuffer();
  await write(path.join(IMG, 'anywhere-map.webp'), raster, '"Anywhere" section map (transparent)');
}

/* ───────────────────────── 6. aurora divider ───────────────────────── */

async function divider() {
  const W = 2560;
  const H = 400;
  const violet = linHex('#5b3df5');
  const teal = linHex('#19c3b1');
  const img = paintField(W, H, {
    base: '#05060d',
    grain: 2.2,
    seed: 21,
    extra: (x, y, r, g, b) => {
      const u = x / W;
      const yc = H * (0.56 + 0.12 * Math.sin(u * 5.1 + 0.6) + 0.05 * Math.sin(u * 13.7 + 2.1));
      const dy = y - yc;
      const sUp = H * (0.22 + 0.05 * Math.sin(u * 7.3));
      const sDn = H * 0.06;
      const s = dy < 0 ? sUp : sDn;
      const curtain = 0.62 + 0.22 * Math.sin(u * 61 + Math.sin(u * 9) * 3) + 0.16 * Math.sin(u * 137 + 1.3);
      const edge = Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 0.9; // fade at both ends
      const vfade = Math.sin(Math.PI * (y / (H - 1))) ** 1.5; // blend into section above/below
      const w = Math.exp(-(dy * dy) / (2 * s * s)) * curtain * edge * vfade * 0.55;
      const t = 0.5 + 0.5 * Math.sin(u * 4.2 - 0.8);
      return [r + (violet[0] * (1 - t) + teal[0] * t) * w, g + (violet[1] * (1 - t) + teal[1] * t) * w, b + (violet[2] * (1 - t) + teal[2] * t) * w];
    },
  });
  await write(path.join(IMG, 'divider.webp'), await webp(img, 74), 'Aurora divider between dark sections');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2560 400" preserveAspectRatio="xMidYMid slice">
<style>
  .a{transform-box:fill-box;transform-origin:center;animation:drift 22s ease-in-out infinite alternate}
  .b{animation-duration:28s;animation-direction:alternate-reverse}
  .c{animation-duration:34s}
  @keyframes drift{0%{transform:translateX(-6%) scaleY(.85)}100%{transform:translateX(6%) scaleY(1.15)}}
  @media (prefers-reduced-motion: reduce){.a{animation:none}}
</style>
<defs>
  <filter id="f" x="-30%" y="-200%" width="160%" height="500%"><feGaussianBlur stdDeviation="46"/></filter>
  <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".2" stop-color="#fff"/><stop offset=".8" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <mask id="m"><rect width="2560" height="400" fill="url(#fade)"/></mask>
</defs>
<rect width="2560" height="400" fill="#05060d"/>
<g mask="url(#m)" filter="url(#f)" opacity=".75">
  <ellipse class="a" cx="900" cy="210" rx="720" ry="60" fill="#5b3df5"/>
  <ellipse class="a b" cx="1650" cy="190" rx="640" ry="52" fill="#19c3b1"/>
  <ellipse class="a c" cx="1280" cy="230" rx="420" ry="34" fill="#7a63ff" opacity=".7"/>
</g>
</svg>`;
  await write(path.join(IMG, 'divider-animated.svg'), svg, 'Optional animated aurora (stops under reduced motion)');
}

/* ───────────────────────── 7. dashboard backdrop ───────────────────────── */

async function dashboardBackdrop() {
  const img = paintField(2000, 1400, {
    base: '#0a0f1f',
    vgrad: { top: '#0c1226', bottom: '#070a16', a: 1 },
    blobs: [
      { x: 0.18, y: 0.28, rx: 0.42, ry: 0.45, color: '#2997ff', a: 0.16, mode: 'add' },
      { x: 0.78, y: 0.2, rx: 0.38, ry: 0.4, color: '#5b3df5', a: 0.2, mode: 'add' },
      { x: 0.62, y: 0.86, rx: 0.4, ry: 0.32, color: '#19c3b1', a: 0.09, mode: 'add' },
      { x: 0.42, y: 0.55, rx: 0.3, ry: 0.3, color: '#141b3a', a: 0.35 },
    ],
    vignette: 0.3,
    grain: 3.4, // slightly stronger grain reads as frosted glass
    seed: 31,
  });
  await write(path.join(IMG, 'dashboard-backdrop.webp'), await webp(img, 72), 'Live data section + dark-theme dashboard');
}

/* ───────────────────────── 8. CTA background ───────────────────────── */

async function ctaBg() {
  const img = paintField(2560, 900, {
    base: '#0a0716',
    blobs: [
      { x: 0.5, y: 0.0, rx: 0.7, ry: 0.55, color: '#05040c', a: 0.7 }, // calm top for the headline
      { x: 0.5, y: 0.62, rx: 0.46, ry: 0.55, color: '#5b3df5', a: 0.55 },
      { x: 0.22, y: 0.7, rx: 0.3, ry: 0.4, color: '#3a1fa8', a: 0.4 },
      { x: 0.5, y: 1.06, rx: 0.55, ry: 0.3, color: '#ff9f0a', a: 0.5, mode: 'add' }, // warm amber glow along the bottom edge
      { x: 0.78, y: 1.0, rx: 0.3, ry: 0.22, color: '#ff6a3d', a: 0.18, mode: 'add' },
    ],
    vignette: 0.2,
    grain: 2.4,
    seed: 41,
  });
  await write(path.join(IMG, 'cta-bg.webp'), await webp(img, 74), 'Closing call-to-action section');
}

/* ───────────────────────── 9. use-case art ───────────────────────── */

const UW = 960;
const UH = 720;

async function rainOnGlass() {
  const rnd = mulberry32(51);
  const R = (a, b) => a + (b - a) * rnd();
  const lights = ['#2997ff', '#5b3df5', '#19c3b1', '#8f7bff', '#ffe2b8', '#ffffff'];
  const bokeh = (count, rMin, rMax, op) =>
    Array.from({ length: count }, () => {
      const c = lights[Math.floor(rnd() * lights.length)];
      return `<circle cx="${R(-40, UW + 40).toFixed(1)}" cy="${R(UH * 0.15, UH * 0.95).toFixed(1)}" r="${R(rMin, rMax).toFixed(1)}" fill="${c}" fill-opacity="${R(op[0], op[1]).toFixed(2)}"/>`;
    }).join('');
  const drop = (cx, cy, r) => {
    const ry = r * R(1.05, 1.3);
    return `<g transform="translate(${cx.toFixed(1)} ${cy.toFixed(1)})"><ellipse rx="${r.toFixed(2)}" ry="${ry.toFixed(2)}" fill="url(#dropBody)"/><ellipse rx="${r.toFixed(2)}" ry="${ry.toFixed(2)}" fill="url(#dropLip)"/><ellipse cx="${(-r * 0.35).toFixed(2)}" cy="${(-ry * 0.42).toFixed(2)}" rx="${(r * 0.26).toFixed(2)}" ry="${(r * 0.18).toFixed(2)}" fill="#fff" fill-opacity="0.75"/></g>`;
  };
  let drops = '';
  for (let i = 0; i < 230; i++) drops += drop(R(0, UW), R(0, UH), R(1.6, rnd() < 0.12 ? 11 : 5.5));
  let trails = '';
  for (let i = 0; i < 9; i++) {
    const x = R(40, UW - 40);
    const y1 = R(0, UH * 0.5);
    const y2 = y1 + R(120, 320);
    const wob = R(-10, 10);
    trails += `<path d="M${x.toFixed(1)} ${y1.toFixed(1)}C${(x + wob).toFixed(1)} ${(y1 + (y2 - y1) * 0.4).toFixed(1)} ${(x - wob).toFixed(1)} ${(y1 + (y2 - y1) * 0.7).toFixed(1)} ${x.toFixed(1)} ${y2.toFixed(1)}" stroke="#cfe6ff" stroke-opacity="0.12" stroke-width="${R(2, 4).toFixed(1)}" fill="none" stroke-linecap="round"/>`;
    trails += drop(x, y2 + 4, R(6, 10));
  }
  let mist = '';
  for (let i = 0; i < 1400; i++) mist += `<circle cx="${R(0, UW).toFixed(1)}" cy="${R(0, UH).toFixed(1)}" r="${R(0.5, 1.4).toFixed(2)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${UW}" height="${UH}" viewBox="0 0 ${UW} ${UH}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="#060a1c"/><stop offset="0.6" stop-color="#0b1838"/><stop offset="1" stop-color="#0a2a3a"/></linearGradient>
  <radialGradient id="dropBody" cx="0.5" cy="0.62" r="0.55"><stop offset="0" stop-color="#d8ecff" stop-opacity="0.22"/><stop offset="0.7" stop-color="#9cc6ff" stop-opacity="0.08"/><stop offset="0.9" stop-color="#000" stop-opacity="0.32"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
  <linearGradient id="dropLip" x1="0" y1="0" x2="0" y2="1"><stop offset="0.55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#e6f3ff" stop-opacity="0.35"/></linearGradient>
  <filter id="b1" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="b2" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="10"/></filter>
  <filter id="b3"><feGaussianBlur stdDeviation="0.6"/></filter>
</defs>
<rect width="${UW}" height="${UH}" fill="url(#bg)"/>
<g filter="url(#b1)">${bokeh(16, 50, 110, [0.18, 0.4])}</g>
<g filter="url(#b2)">${bokeh(26, 14, 40, [0.25, 0.6])}</g>
<g fill="#dfeeff" fill-opacity="0.16" filter="url(#b3)">${mist}</g>
${trails}
${drops}
</svg>`;
  const img = await ditherSharp(sharp(Buffer.from(svg)), { grain: 2.4, seed: 52 });
  await write(path.join(ART, 'usecase-outdoor.webp'), await webp(img, 76), 'Use case tile: outdoor / rain (procedural)');
}

async function homeTile() {
  // Warm-dusk violet field with concentric "sensing" rings radiating from the icon position.
  const rings = Array.from({ length: 14 }, (_, i) => `<circle cx="480" cy="330" r="${60 + i * 46}" stroke-opacity="${(0.32 - i * 0.021).toFixed(3)}"/>`).join('');
  const rnd = mulberry32(61);
  let dots = '';
  for (let y = 18; y < UH; y += 28) for (let x = 18; x < UW; x += 28) dots += `<circle cx="${x}" cy="${y}" r="${(1 + rnd() * 0.4).toFixed(2)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${UW}" height="${UH}">
<defs>
  <radialGradient id="g" cx="0.5" cy="0.46" r="0.75"><stop offset="0" stop-color="#4a33d6"/><stop offset="0.45" stop-color="#26185f"/><stop offset="1" stop-color="#0b0a24"/></radialGradient>
  <radialGradient id="fadeR" cx="0.5" cy="0.46" r="0.6"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="m"><rect width="${UW}" height="${UH}" fill="url(#fadeR)"/></mask>
  <radialGradient id="glow" cx="0.75" cy="0.95" r="0.5"><stop offset="0" stop-color="#2997ff" stop-opacity="0.35"/><stop offset="1" stop-color="#2997ff" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${UW}" height="${UH}" fill="url(#g)"/>
<rect width="${UW}" height="${UH}" fill="url(#glow)"/>
<g fill="#c9c2ff" fill-opacity="0.2" mask="url(#m)">${dots}</g>
<g fill="none" stroke="#b8adff" stroke-width="1.5">${rings}</g>
</svg>`;
  const img = await ditherSharp(sharp(Buffer.from(svg)), { grain: 2.2, seed: 62 });
  await write(path.join(ART, 'usecase-home.webp'), await webp(img, 74), 'Use case tile: home (pattern art)');
}

async function storageTile() {
  // Teal → navy field with an isometric grid (shelving/racks) fading out radially.
  const lines = [];
  const step = 44;
  const t30 = Math.tan(Math.PI / 6);
  for (let k = -UH * 2; k < UW + UH * 2; k += step) {
    lines.push(`M${k} 0L${(k + UH / t30).toFixed(1)} ${UH}`);
    lines.push(`M${k} 0L${(k - UH / t30).toFixed(1)} ${UH}`);
  }
  for (let x = 0; x <= UW; x += step * 2 * t30 * Math.cos(Math.PI / 6) * 1.155) lines.push(`M${x.toFixed(1)} 0V${UH}`);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${UW}" height="${UH}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0d6e73"/><stop offset="0.5" stop-color="#0b2f4a"/><stop offset="1" stop-color="#070b1a"/></linearGradient>
  <radialGradient id="fadeR" cx="0.5" cy="0.46" r="0.62"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  <mask id="m"><rect width="${UW}" height="${UH}" fill="url(#fadeR)"/></mask>
  <radialGradient id="glow" cx="0.2" cy="0.1" r="0.6"><stop offset="0" stop-color="#19c3b1" stop-opacity="0.45"/><stop offset="1" stop-color="#19c3b1" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${UW}" height="${UH}" fill="url(#g)"/>
<rect width="${UW}" height="${UH}" fill="url(#glow)"/>
<path d="${lines.join('')}" stroke="#7fe9de" stroke-opacity="0.16" stroke-width="1.2" fill="none" mask="url(#m)"/>
</svg>`;
  const img = await ditherSharp(sharp(Buffer.from(svg)), { grain: 2.2, seed: 72 });
  await write(path.join(ART, 'usecase-storage.webp'), await webp(img, 74), 'Use case tile: storage / workshop (pattern art)');
}

/* ───────────────────────── 12. OG image ───────────────────────── */

async function ogImage(heroPng) {
  const bg = heroPng ?? (await paintField(2560, 1440, { base: '#070b1a', blobs: HERO_BLOBS, vignette: 0.25, grain: 2.4, seed: 11 }).png().toBuffer());
  const bgSmall = await sharp(bg).resize(1200, 630, { fit: 'cover', position: 'centre' }).png().toBuffer();
  const markUri = `data:image/svg+xml;base64,${Buffer.from(buildMarkSvg({ variant: 'color', size: 192 })).toString('base64')}`;
  const fonts = [
    { name: 'Inter', data: await font(400), weight: 400, style: 'normal' },
    { name: 'Inter', data: await font(600), weight: 600, style: 'normal' },
  ];
  const host = siteConfig.siteUrl.replace(/^https?:\/\//, '');
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: { width: 1200, height: 630, display: 'flex', position: 'relative', fontFamily: 'Inter', color: '#f5f5f7' },
        children: [
          { type: 'img', props: { src: `data:image/png;base64,${bgSmall.toString('base64')}`, width: 1200, height: 630, style: { position: 'absolute', top: 0, left: 0 } } },
          {
            type: 'div',
            props: {
              style: { display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 96px', width: '100%', height: '100%', position: 'relative' },
              children: [
                {
                  type: 'div',
                  props: {
                    style: { display: 'flex', alignItems: 'center', gap: 22 },
                    children: [
                      { type: 'img', props: { src: markUri, width: 84, height: 84 } },
                      { type: 'div', props: { style: { fontSize: 72, fontWeight: 600, letterSpacing: -2 }, children: siteConfig.name } },
                    ],
                  },
                },
                { type: 'div', props: { style: { fontSize: 46, fontWeight: 600, letterSpacing: -1.2, marginTop: 36, color: '#ffffff' }, children: siteConfig.tagline } },
                { type: 'div', props: { style: { fontSize: 24, fontWeight: 400, marginTop: 18, color: '#a9acc8' }, children: 'ESP32 · five sensors · secure MQTT · live dashboard' } },
                { type: 'div', props: { style: { fontSize: 20, fontWeight: 400, marginTop: 64, color: '#7f84a8' }, children: host } },
              ],
            },
          },
        ],
      },
    },
    { width: 1200, height: 630, fonts }
  );
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
  const out = await sharp(png).png({ palette: true, colors: 256, dither: 1, compressionLevel: 9, effort: 10 }).toBuffer();
  await write(path.join(PUB, 'og-image.png'), out, 'og:image / twitter:image (1200×630)');
}

/* ───────────────────────── run ───────────────────────── */

const filter = process.argv[2];
const jobs = { logo, favicons, hero, grain, worldMap, divider, dashboardBackdrop, ctaBg, rainOnGlass, homeTile, storageTile, ogImage };
let heroPng = null;
const t0 = Date.now();
for (const [name, fn] of Object.entries(jobs)) {
  if (filter && !name.toLowerCase().includes(filter.toLowerCase())) continue;
  const t = Date.now();
  const res = await fn(name === 'ogImage' ? heroPng : undefined);
  if (name === 'hero') heroPng = res;
  console.log(`  done ${name.padEnd(18)} ${((Date.now() - t) / 1000).toFixed(1)}s`);
}
console.log(`\nAssets (${((Date.now() - t0) / 1000).toFixed(1)}s):`);
console.table(report);
const images = report.filter((r) => /\.(webp|png|svg)$/.test(r.file) && r.file.includes('/images/'));
console.log(`Total under public/images: ${images.reduce((s, r) => s + r.kb, 0).toFixed(1)} KB`);
await fs.writeFile(path.join(ROOT, 'scripts/assets-report.json'), JSON.stringify(report, null, 2) + '\n');
