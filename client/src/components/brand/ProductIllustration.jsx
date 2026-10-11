import { useId } from 'react';
import { siteConfig } from '../../content/siteConfig';
import './brand.css';

/* Build-time flag from vite.config.js: true when public/images/front-view.png exists. */
const OPTIONAL = typeof globalThis.__OPTIONAL_ASSETS__ !== 'undefined' ? globalThis.__OPTIONAL_ASSETS__ : {};

/** Sensor anchor points on the drawing (viewBox 480×380). Keys match SENSORS[].key. */
const SENSOR_ANCHORS = {
  rain: { x: 240, y: 52, r: 0, label: 'Rain sensor vents' },
  motion: { x: 150, y: 182, r: 52, label: 'PIR motion dome' },
  temp: { x: 246, y: 182, r: 44, label: 'DHT11 temperature and humidity' },
  flame: { x: 338, y: 182, r: 30, label: 'Flame sensor' },
  sound: { x: 246, y: 284, r: 30, label: 'Microphone' },
};

/**
 * Front view of the enclosure with the five sensors in place.
 * If a real photo exists at /images/front-view.png it is used instead (no highlights).
 *
 * @param {string|null} highlight  sensor key to emphasise ('rain'|'motion'|'temp'|'flame'|'sound')
 * @param {boolean} [priority]     eager-load the photo when used above the fold
 */
export default function ProductIllustration({ highlight = null, className = '', priority = false }) {
  const uid = useId().replace(/:/g, '');
  const id = (n) => `${n}-${uid}`;
  const alt = `${siteConfig.name} enclosure, front view, with rain vents on top, PIR motion dome, DHT11 sensor, flame sensor and microphone`;

  if (OPTIONAL.frontView) {
    return (
      <img
        className={`product-illustration product-photo ${className}`}
        src="/images/front-view.png"
        alt={alt}
        width="960"
        height="760"
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
      />
    );
  }

  const dim = (key) => (highlight && highlight !== key ? 'pi-part is-dim' : 'pi-part');
  const on = (key) => (highlight === key ? 'pi-glow is-on' : 'pi-glow');

  // Fresnel facets on the PIR dome
  const facets = Array.from({ length: 12 }, (_, i) => {
    const a = (i * Math.PI) / 6;
    return `M150 182L${(150 + 40 * Math.cos(a)).toFixed(1)} ${(182 + 40 * Math.sin(a)).toFixed(1)}`;
  }).join('');

  // DHT11 grille holes
  const holes = [];
  for (let r = 0; r < 6; r++) for (let c = 0; c < 4; c++) holes.push([228 + c * 12, 155 + r * 10]);

  // Microphone mesh
  const mesh = [];
  for (let y = -18; y <= 18; y += 5) for (let x = -18; x <= 18; x += 5) if (x * x + y * y < 17 * 17) mesh.push([246 + x, 284 + y]);

  return (
    <svg
      className={`product-illustration ${highlight ? 'has-highlight' : ''} ${className}`}
      viewBox="0 0 480 380"
      role="img"
      aria-labelledby={id('t')}
    >
      <title id={id('t')}>{alt}</title>
      <defs>
        <linearGradient id={id('body')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#30333f" />
          <stop offset="0.55" stopColor="#1d1f28" />
          <stop offset="1" stopColor="#14151c" />
        </linearGradient>
        <linearGradient id={id('top')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3b3f4d" />
          <stop offset="1" stopColor="#2a2d38" />
        </linearGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.10" />
          <stop offset="0.4" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id('dome')} cx="0.38" cy="0.32" r="0.75">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#e3e7f0" />
          <stop offset="1" stopColor="#a9b0c2" />
        </radialGradient>
        <linearGradient id={id('dht')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3d8bff" />
          <stop offset="1" stopColor="#1f5fd0" />
        </linearGradient>
        <radialGradient id={id('led')} cx="0.35" cy="0.3" r="0.8">
          <stop offset="0" stopColor="#5a5f73" />
          <stop offset="0.5" stopColor="#14151b" />
          <stop offset="1" stopColor="#050507" />
        </radialGradient>
        <radialGradient id={id('bezel')} cx="0.5" cy="0.35" r="0.7">
          <stop offset="0" stopColor="#3a3d4a" />
          <stop offset="1" stopColor="#101117" />
        </radialGradient>
        <filter id={id('blur')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <filter id={id('shadow')} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <clipPath id={id('face')}>
          <rect x="60" y="78" width="360" height="262" rx="30" />
        </clipPath>
      </defs>

      {/* floor shadow */}
      <ellipse cx="240" cy="352" rx="190" ry="16" fill="#000" opacity="0.45" filter={`url(#${id('shadow')})`} />

      {/* top face with rain vents */}
      <path d="M92 48H388Q400 48 408 58L420 78H60L72 58Q80 48 92 48Z" fill={`url(#${id('top')})`} />
      <g className={dim('rain')}>
        {Array.from({ length: 9 }, (_, i) => (
          <rect key={i} x={126 + i * 26} y="58" width="16" height="10" rx="3" fill="#0d0e13" />
        ))}
        <g className={on('rain')}>
          {Array.from({ length: 9 }, (_, i) => (
            <rect key={i} x={126 + i * 26} y="58" width="16" height="10" rx="3" fill="#5fb4ff" />
          ))}
        </g>
      </g>

      {/* front face */}
      <rect x="60" y="78" width="360" height="262" rx="30" fill={`url(#${id('body')})`} />
      <rect x="60" y="78" width="360" height="262" rx="30" fill={`url(#${id('sheen')})`} />
      <rect x="60.5" y="78.5" width="359" height="261" rx="29.5" fill="none" stroke="#fff" strokeOpacity="0.09" />
      <path d="M90 79H390" stroke="#fff" strokeOpacity="0.18" strokeWidth="1" clipPath={`url(#${id('face')})`} />

      {/* glows (behind parts) */}
      {['motion', 'temp', 'flame', 'sound'].map((k) => {
        const a = SENSOR_ANCHORS[k];
        return <circle key={k} className={on(k)} cx={a.x} cy={a.y} r={a.r + 8} fill="#2f8bff" filter={`url(#${id('blur')})`} />;
      })}

      {/* PIR dome */}
      <g className={dim('motion')}>
        <circle cx="150" cy="182" r="50" fill={`url(#${id('bezel')})`} />
        <circle cx="150" cy="182" r="42" fill={`url(#${id('dome')})`} />
        <path d={facets} stroke="#8a93a8" strokeOpacity="0.35" strokeWidth="0.8" />
        {[14, 26, 36].map((r) => (
          <circle key={r} cx="150" cy="182" r={r} fill="none" stroke="#8a93a8" strokeOpacity="0.3" strokeWidth="0.8" />
        ))}
        <ellipse cx="136" cy="166" rx="12" ry="7" fill="#fff" opacity="0.8" transform="rotate(-30 136 166)" />
      </g>

      {/* DHT11 */}
      <g className={dim('temp')}>
        <rect x="216" y="142" width="60" height="80" rx="7" fill="#0f1016" />
        <rect x="220" y="146" width="52" height="72" rx="5" fill={`url(#${id('dht')})`} />
        {holes.map(([x, y], i) => (
          <rect key={i} x={x} y={y} width="7" height="5" rx="1.2" fill="#0d2a66" opacity="0.85" />
        ))}
        <rect x="220" y="146" width="52" height="10" rx="5" fill="#fff" opacity="0.12" />
      </g>

      {/* Flame sensor */}
      <g className={dim('flame')}>
        <circle cx="338" cy="182" r="24" fill={`url(#${id('bezel')})`} />
        <circle cx="338" cy="182" r="15" fill={`url(#${id('led')})`} />
        <ellipse cx="333" cy="176" rx="5" ry="3" fill="#fff" opacity="0.55" transform="rotate(-30 333 176)" />
      </g>

      {/* Microphone */}
      <g className={dim('sound')}>
        <circle cx="246" cy="284" r="24" fill={`url(#${id('bezel')})`} />
        <circle cx="246" cy="284" r="19" fill="#0b0c11" />
        {mesh.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="1.3" fill="#4a4e5e" />
        ))}
      </g>

      {/* status LED */}
      <circle cx="96" cy="312" r="7" fill="#30d158" opacity="0.35" filter={`url(#${id('blur')})`} />
      <circle cx="96" cy="312" r="3" fill="#30d158" />
    </svg>
  );
}
