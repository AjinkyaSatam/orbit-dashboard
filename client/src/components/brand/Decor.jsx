/**
 * Decorative SVG primitives.
 *  - GlowOrb:  soft blurred blob placed behind section headings
 *  - DotGrid:  tileable dot pattern (pure SVG pattern, no raster)
 *  - StatusDot: green / amber / red indicator with a pulse that respects reduced motion
 */
import { useId } from 'react';
import './brand.css';

const ORB_COLORS = {
  violet: ['#5b3df5', '#2f1fa0'],
  teal: ['#19c3b1', '#0b6f66'],
  blue: ['#2997ff', '#0b4fb3'],
  amber: ['#ff9f0a', '#a8560a'],
};

export function GlowOrb({ color = 'violet', size = 520, opacity = 0.55, className = '', style }) {
  const uid = useId().replace(/:/g, '');
  const [c1, c2] = ORB_COLORS[color] ?? ORB_COLORS.violet;
  return (
    <svg
      className={`glow-orb ${className}`}
      width={size}
      height={size}
      viewBox="0 0 200 200"
      aria-hidden="true"
      focusable="false"
      style={{ opacity, ...style }}
    >
      <defs>
        <radialGradient id={`orb-${uid}`} cx="0.42" cy="0.4" r="0.6">
          <stop offset="0" stopColor={c1} stopOpacity="0.95" />
          <stop offset="0.45" stopColor={c2} stopOpacity="0.45" />
          <stop offset="1" stopColor={c2} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        fill={`url(#orb-${uid})`}
        d="M100 8c34 0 70 18 82 52s4 76-24 100-74 34-104 14S6 120 12 84 66 8 100 8z"
      />
    </svg>
  );
}

export function DotGrid({ gap = 22, radius = 1.1, color = 'currentColor', opacity = 0.18, fade = true, className = '' }) {
  const uid = useId().replace(/:/g, '');
  return (
    <svg className={`dot-grid ${fade ? 'dot-grid-fade' : ''} ${className}`} aria-hidden="true" focusable="false" style={{ opacity, color }}>
      <defs>
        <pattern id={`dg-${uid}`} width={gap} height={gap} patternUnits="userSpaceOnUse">
          <circle cx={gap / 2} cy={gap / 2} r={radius} fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#dg-${uid})`} />
    </svg>
  );
}

const STATUS = {
  ok: { color: 'var(--ok)', label: 'Online' },
  warn: { color: 'var(--warn)', label: 'Warning' },
  danger: { color: 'var(--danger)', label: 'Offline' },
};

/**
 * @param {'ok'|'warn'|'danger'} status
 * @param {boolean} pulse   animate (automatically disabled under prefers-reduced-motion)
 * @param {string} [label]  accessible text; pass null when visible text sits next to it
 */
export function StatusDot({ status = 'ok', pulse = status !== 'danger', size = 8, label, className = '' }) {
  const s = STATUS[status] ?? STATUS.ok;
  const text = label === undefined ? s.label : label;
  return (
    <span
      className={`status-dot2 ${pulse ? 'is-pulsing' : ''} ${className}`}
      style={{ '--dot-color': s.color, '--dot-size': `${size}px` }}
      role={text ? 'status' : undefined}
      aria-label={text || undefined}
      aria-hidden={text ? undefined : 'true'}
    >
      <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true" focusable="false">
        <circle cx="5" cy="5" r="5" fill="currentColor" />
      </svg>
    </span>
  );
}
