import { useId } from 'react';
import { MARK_GRADIENT, MARK_PRESETS, MARK_VIEWBOX, markDots } from '../../lib/logoMark';
import { siteConfig } from '../../content/siteConfig';
import './brand.css';

/**
 * Brand logo: five dots in a ring.
 *
 * @param {number} size     mark height in px (lockup text scales with it)
 * @param {'color'|'mono'|'lockup'|'lockup-mono'} variant
 * @param {string} [className]
 * @param {string} [label]  accessible name; defaults to the product name
 * @param {boolean} [decorative] hide from assistive tech (when a parent already has a label)
 */
export default function Logo({ size = 28, variant = 'lockup', className = '', label, decorative = false }) {
  const uid = useId().replace(/:/g, '');
  const mono = variant === 'mono' || variant === 'lockup-mono';
  const lockup = variant === 'lockup' || variant === 'lockup-mono';
  const preset = size < 22 ? MARK_PRESETS.bold : MARK_PRESETS.regular;
  const fill = mono ? 'currentColor' : `url(#lg-${uid})`;
  const name = label ?? siteConfig.name;

  const mark = (
    <svg
      className="logo-mark"
      width={size}
      height={size}
      viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`}
      aria-hidden="true"
      focusable="false"
    >
      {!mono && (
        <defs>
          <linearGradient id={`lg-${uid}`} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
            {MARK_GRADIENT.map((g) => (
              <stop key={g.offset} offset={g.offset} stopColor={g.color} />
            ))}
          </linearGradient>
        </defs>
      )}
      {preset.ring && (
        <circle
          cx={MARK_VIEWBOX / 2}
          cy={MARK_VIEWBOX / 2}
          r={preset.ringR}
          fill="none"
          stroke={fill}
          strokeWidth={preset.ringWidth}
          strokeOpacity={preset.ringOpacity}
        />
      )}
      <g fill={fill}>
        {markDots(preset).map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.r} className="logo-dot" style={{ '--i': i }} />
        ))}
      </g>
    </svg>
  );

  return (
    <span
      className={`logo ${lockup ? 'logo-lockup' : ''} ${className}`}
      style={{ '--logo-size': `${size}px` }}
      role={decorative ? undefined : 'img'}
      aria-label={decorative ? undefined : name}
      aria-hidden={decorative ? 'true' : undefined}
    >
      {mark}
      {lockup && (
        <span className="logo-text" aria-hidden="true">
          {siteConfig.name}
        </span>
      )}
    </span>
  );
}
