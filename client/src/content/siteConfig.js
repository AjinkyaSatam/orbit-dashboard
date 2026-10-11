/**
 * Single source of truth for brand + site metadata.
 *
 * This file is imported by the React app, by vite.config.js (to fill index.html)
 * and by scripts/generate-assets.mjs (logo lockup, OG image, web manifest).
 * Change `name` here, run `npm run assets`, and every asset follows.
 *
 * Keep it dependency-free so it can run in Node as well as in the browser.
 */

const env = import.meta.env ?? {};

export const siteConfig = {
  /** Product name. "[PRODUCT NAME]" placeholder in the brief; current working name below. */
  name: 'Sentinel',
  shortName: 'Sentinel',
  tagline: 'Five senses. One box. Anywhere.',
  description:
    'An ESP32 safety hub with five sensors (temperature and humidity, motion, flame, rain and sound) streaming over secure MQTT to a dashboard you can open from any network.',

  /** Absolute origin used for og:image / twitter:image. Set VITE_SITE_URL in production. */
  siteUrl: String(env.VITE_SITE_URL || 'http://localhost:5173').replace(/\/$/, ''),

  /** Public source repository (used in the footer "Source" link). */
  repoUrl: 'https://github.com/AjinkyaSatam/orbit-dashboard',

  team: '[TEAM NAME]',

  /**
   * Only list accounts that really exist. Each entry renders one footer icon.
   * kind: 'github' | 'email' | 'website' | 'linkedin' | 'x' | 'instagram' | 'youtube'
   * Example: { kind: 'email', label: 'Email us', url: 'mailto:[EMAIL]' }
   */
  socials: [],

  /** Brand palette (backgrounds/graphics). UI accent stays the Apple-style blue tokens. */
  palette: {
    navy: '#070b1a',
    violet: '#5b3df5',
    teal: '#19c3b1',
    amber: '#ff9f0a',
    blue: '#0071e3',
    blueDark: '#2997ff',
  },
};

export default siteConfig;
