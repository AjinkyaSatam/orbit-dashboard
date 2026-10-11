/**
 * Image wiring for generated art: <picture> with WebP, explicit dimensions (no CLS),
 * lazy loading below the fold, contrast overlays for text, optional real-photo slots.
 */
import { PLACE_ICONS, ICON_STROKE } from '../../lib/icons';
import './brand.css';

const OPTIONAL = typeof globalThis.__OPTIONAL_ASSETS__ !== 'undefined' ? globalThis.__OPTIONAL_ASSETS__ : {};

/**
 * Full-bleed decorative background for a dark section.
 * @param {string} src            webp path
 * @param {string} [srcSetSmall]  smaller webp for ≤1280px viewports
 * @param {number} width,height   intrinsic size
 * @param {string} [position]     object-position focal point
 * @param {'none'|'left'|'center'|'top'|'bottom'} [overlay] gradient scrim keeping text ≥ AA
 * @param {boolean} [priority]    above the fold: eager + fetchpriority=high
 */
export function SectionBackdrop({
  src,
  srcSetSmall,
  width,
  height,
  position = 'center',
  overlay = 'none',
  priority = false,
  grain = true,
  className = '',
}) {
  return (
    <div className={`section-backdrop ${className}`} aria-hidden="true">
      <picture>
        {srcSetSmall && <source type="image/webp" media="(max-width: 1280px)" srcSet={srcSetSmall} />}
        <img
          src={src}
          alt=""
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          fetchPriority={priority ? 'high' : 'auto'}
          decoding={priority ? 'sync' : 'async'}
          style={{ objectPosition: position }}
        />
      </picture>
      {overlay !== 'none' && <div className={`backdrop-scrim scrim-${overlay}`} />}
      {grain && <div className="grain-overlay" />}
    </div>
  );
}

/** Aurora band between two dark sections. `animated` swaps in the SVG version (static under reduced motion). */
export function AuroraDivider({ animated = false, className = '' }) {
  return (
    <div className={`aurora-divider ${className}`} aria-hidden="true">
      {animated ? (
        <picture>
          <source srcSet="/images/divider.webp" media="(prefers-reduced-motion: reduce)" type="image/webp" />
          <img src="/images/divider-animated.svg" alt="" width="2560" height="400" loading="lazy" decoding="async" />
        </picture>
      ) : (
        <img src="/images/divider.webp" alt="" width="2560" height="400" loading="lazy" decoding="async" />
      )}
    </div>
  );
}

const ART = {
  home: { src: '/images/art/usecase-home.webp', tone: 'violet' },
  outdoor: { src: '/images/art/usecase-outdoor.webp', tone: 'rain' },
  storage: { src: '/images/art/usecase-storage.webp', tone: 'teal' },
};

/**
 * Use-case visual. Loads /images/usecases/<name>.webp if that real photo exists at build time,
 * otherwise falls back to the generated art + an icon-led glass badge.
 */
export function UseCaseArt({ name, alt }) {
  const art = ART[name];
  const Icon = PLACE_ICONS[name];
  const photo = OPTIONAL.usecases?.[name];
  return (
    <div className={`usecase-art tone-${art.tone}`}>
      <picture>
        <source type="image/webp" srcSet={photo ? `/images/usecases/${name}.webp` : art.src} />
        <img
          src={photo ? `/images/usecases/${name}.webp` : art.src}
          alt={photo ? alt : ''}
          width="960"
          height="720"
          loading="lazy"
          decoding="async"
        />
      </picture>
      {!photo && Icon && (
        <span className="usecase-badge" aria-hidden="true">
          <Icon size={30} strokeWidth={ICON_STROKE} />
        </span>
      )}
    </div>
  );
}
