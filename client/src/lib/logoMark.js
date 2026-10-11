/**
 * Logo mark geometry: five dots in a ring (the five senses).
 * Shared by the <Logo /> React component and scripts/generate-assets.mjs,
 * so the favicon, OG image and in-app logo can never drift apart.
 */

export const MARK_VIEWBOX = 48;

/** Gradient stops used for the full-colour mark. */
export const MARK_GRADIENT = [
  { offset: 0, color: '#2997ff' },
  { offset: 0.55, color: '#5b3df5' },
  { offset: 1, color: '#19c3b1' },
];

/**
 * Geometry presets.
 *  - regular: thin ring + five dots, for 24px and up
 *  - bold:    larger dots, no ring, for favicons at 16/32px
 */
export const MARK_PRESETS = {
  regular: { ringR: 15.5, dotR: 4.6, ring: true, ringWidth: 1.4, ringOpacity: 0.38 },
  bold: { ringR: 14, dotR: 6.2, ring: false, ringWidth: 0, ringOpacity: 0 },
};

/** Returns the five dot centres (top dot first, clockwise). */
export function markDots(preset = MARK_PRESETS.regular, c = MARK_VIEWBOX / 2) {
  return Array.from({ length: 5 }, (_, i) => {
    const a = ((-90 + i * 72) * Math.PI) / 180;
    return {
      cx: +(c + preset.ringR * Math.cos(a)).toFixed(3),
      cy: +(c + preset.ringR * Math.sin(a)).toFixed(3),
      r: preset.dotR,
    };
  });
}

/**
 * Build a standalone SVG string for the mark (used by the asset generator).
 * @param {object} o
 * @param {'color'|'mono'|'white'} [o.variant]
 * @param {'regular'|'bold'} [o.preset]
 * @param {number} [o.size]      output width/height attribute
 * @param {string|null} [o.tile] background tile: null | 'rounded' | 'square'
 * @param {number} [o.inset]     0..1, share of the canvas the mark occupies
 */
export function buildMarkSvg({
  variant = 'color',
  preset = 'regular',
  size = 48,
  tile = null,
  inset = 1,
} = {}) {
  const p = MARK_PRESETS[preset];
  const V = MARK_VIEWBOX;
  const id = `g${variant}${preset}`;
  const fill =
    variant === 'mono' ? 'currentColor' : variant === 'white' ? '#ffffff' : `url(#${id})`;
  const s = inset;
  const t = (V * (1 - s)) / 2;
  const dots = markDots(p)
    .map((d) => `<circle cx="${d.cx}" cy="${d.cy}" r="${d.r}"/>`)
    .join('');
  const ring = p.ring
    ? `<circle cx="${V / 2}" cy="${V / 2}" r="${p.ringR}" fill="none" stroke="${fill}" stroke-width="${p.ringWidth}" stroke-opacity="${p.ringOpacity}"/>`
    : '';
  const grad =
    variant === 'color'
      ? `<linearGradient id="${id}" x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">${MARK_GRADIENT.map(
          (g) => `<stop offset="${g.offset}" stop-color="${g.color}"/>`
        ).join('')}</linearGradient>`
      : '';
  const tileDefs = tile
    ? `<linearGradient id="${id}bg" x1="0" y1="0" x2="${V}" y2="${V}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#141a3d"/><stop offset="1" stop-color="#070b1a"/></linearGradient><radialGradient id="${id}glow" cx="${V * 0.7}" cy="${V * 0.78}" r="${V * 0.6}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="#5b3df5" stop-opacity="0.45"/><stop offset="1" stop-color="#5b3df5" stop-opacity="0"/></radialGradient>`
    : '';
  const tileShape = tile
    ? `<rect width="${V}" height="${V}" rx="${tile === 'rounded' ? V * 0.225 : 0}" fill="url(#${id}bg)"/><rect width="${V}" height="${V}" rx="${tile === 'rounded' ? V * 0.225 : 0}" fill="url(#${id}glow)"/>`
    : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${V} ${V}"><defs>${grad}${tileDefs}</defs>${tileShape}<g transform="translate(${t} ${t}) scale(${s})">${ring}<g fill="${fill}">${dots}</g></g></svg>`;
}
