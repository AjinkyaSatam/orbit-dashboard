import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView, useMotionValueEvent } from 'framer-motion';
import {
  ChevronRight, Thermometer, Radar, Flame, CloudRain, Mic, Wifi, Server, Bell, Cpu,
  ArrowRight, Plus, Globe, Briefcase, Mail, Check, User, BookOpen, Image, Video, ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import useStore from '../../store/useStore';
import { siteConfig } from '../../content/siteConfig';
import { SENSORS, SPECS, PIN_MAP, BOM, USE_CASES, FAQS, TEAM, GUIDES, PLANS } from '../../content/data';
import { ICON_STROKE } from '../../lib/icons';
import ProductIllustration from '../brand/ProductIllustration';
import { SectionBackdrop, AuroraDivider, UseCaseArt } from '../brand/Media';
import { GlowOrb, DotGrid, StatusDot } from '../brand/Decor';
import ContactForm from '../ui/ContactForm';
import './Landing.css';

/* ─── Animation Helpers ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.25, 0.1, 0.25, 1] } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function FadeSection({ children, className = '', dark = false, id = '' }) {
  return (
    <motion.section
      id={id}
      className={`section ${dark ? 'section-dark' : ''} ${className}`}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-100px' }}
      variants={stagger}
    >
      {children}
    </motion.section>
  );
}

/* ─── LANDING PAGE ─── */
export default function LandingPage() {
  const readings = useStore((s) => s.readings);
  const deviceOnline = useStore((s) => s.deviceOnline);
  const readingsHistory = useStore((s) => s.readingsHistory);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.94]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <main>
      {/* ═══════ 1. HERO ═══════ */}
      <motion.section ref={heroRef} className="section hero-section" style={{ scale: heroScale, opacity: heroOpacity }}>
        <SectionBackdrop
          src="/images/hero-bg.webp"
          srcSetSmall="/images/hero-bg-1280.webp"
          width={2560}
          height={1440}
          priority={true}
          overlay="left"
        />
        <GlowOrb color="violet" size={620} opacity={0.3} style={{ top: '30%', left: '50%' }} />

        <div className="hero-content text-center">
          <motion.p className="eyebrow" variants={fadeUp} initial="hidden" animate="visible">
            New
          </motion.p>
          <motion.h1
            className="headline-hero hero-title"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
          >
            {siteConfig.name}
          </motion.h1>
          <motion.p
            className="body-large hero-tagline"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            {siteConfig.tagline}
          </motion.p>
          <motion.div
            className="hero-ctas"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            <Link to="/dashboard" className="btn-link" style={{ fontSize: '21px' }}>
              Live dashboard <ChevronRight size={18} strokeWidth={ICON_STROKE} className="chevron" />
            </Link>
            <a href="#intro" className="btn-link" style={{ fontSize: '21px' }}>
              Learn more <ChevronRight size={18} strokeWidth={ICON_STROKE} className="chevron" />
            </a>
          </motion.div>

          {/* Product Illustration */}
          <motion.div
            className="hero-product"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="hero-product-wrap">
              <ProductIllustration highlight={null} priority={true} />
            </div>
            <div className="hero-status-pill">
              <StatusDot status={deviceOnline ? 'ok' : 'danger'} size={8} label={null} />
              <span className="caption">{deviceOnline ? 'Online' : 'Offline'}</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════ 2. INTRO STATEMENT ═══════ */}
      <IntroSection />

      {/* ═══════ 3. AURORA DIVIDER ═══════ */}
      <AuroraDivider animated={true} />

      {/* ═══════ 4. STICKY SENSOR TOUR ═══════ */}
      <StickyTourSection />

      {/* ═══════ 5. ANYWHERE SECTION ═══════ */}
      <AnywhereSection />

      {/* ═══════ 6. SENSOR CARDS (Continuous Circular Slide) ═══════ */}
      <FadeSection id="features" className="section-surface sensor-slider-section">
        <div className="text-center" style={{ marginBottom: '40px' }}>
          <motion.p className="eyebrow" variants={fadeUp}>Take a closer look</motion.p>
          <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px' }}>
            Five sensors. One mission.
          </motion.h2>
          <motion.p className="body-default" variants={fadeUp} style={{ color: 'var(--muted)', marginTop: '8px' }}>
            Continuous multi-sensor telemetry &bull; Hover or touch to pause
          </motion.p>
        </div>

        <div className="sensor-circular-wrap" aria-label="Circular sliding sensor specifications">
          <div className="sensor-circular-track">
            {/* Duplicated array for continuous circular sliding */}
            {[...SENSORS, ...SENSORS].map((s, idx) => (
              <div className="sensor-card" key={`${s.key}-${idx}`}>
                <div className="sensor-card-icon" style={{ color: s.color }}>
                  <s.icon size={28} strokeWidth={ICON_STROKE} />
                </div>
                <h3 className="sensor-card-title">{s.name}</h3>
                <p className="sensor-card-chip">{s.shortName}</p>
                <div className="sensor-card-specs">
                  <div><span className="caption">Principle</span><p>{s.principle}</p></div>
                  <div><span className="caption">Range</span><p>{s.range}</p></div>
                  <div><span className="caption">Accuracy</span><p>{s.accuracy}</p></div>
                  <div><span className="caption">ESP32 Pin</span><p>{s.pin}</p></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeSection>

      {/* ═══════ 7. PRODUCT DESCRIPTION ═══════ */}
      <ProductDescription />

      {/* ═══════ 8. LIVE NOW ═══════ */}
      <FadeSection id="live" className="live-section">
        <DotGrid opacity={0.06} />
        <motion.p className="eyebrow" variants={fadeUp}>Live Now</motion.p>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px', marginBottom: '48px' }}>
          See it in action.
        </motion.h2>
        <div className="live-grid">
          <motion.div className="data-card" variants={fadeUp}>
            <span className="data-label">Temperature</span>
            <span className="data-value">{readings.temp}<span className="data-unit">°C</span></span>
            <MiniChart data={readingsHistory.map(r => r.temp)} color="#ff9f0a" />
          </motion.div>
          <motion.div className="data-card" variants={fadeUp}>
            <span className="data-label">Humidity</span>
            <span className="data-value">{readings.hum}<span className="data-unit">%</span></span>
            <MiniChart data={readingsHistory.map(r => r.hum)} color="#0071e3" />
          </motion.div>
          <motion.div className={`data-card ${readings.flame ? 'danger-pulse' : ''}`} variants={fadeUp}>
            <span className="data-label">Flame</span>
            <span className="data-value" style={{ color: readings.flame ? 'var(--danger)' : 'var(--ok)' }}>
              {readings.flame ? 'FIRE' : 'Safe'}
            </span>
            <span className="body-default" style={{ fontSize: '13px' }}>Raw: {readings.flameRaw}</span>
          </motion.div>
          <motion.div className="data-card" variants={fadeUp}>
            <span className="data-label">Rain</span>
            <span className="data-value" style={{ color: readings.rain ? 'var(--accent)' : 'var(--ok)' }}>
              {readings.rain ? 'Wet' : 'Dry'}
            </span>
            <span className="body-default" style={{ fontSize: '13px' }}>Raw: {readings.rainRaw}</span>
          </motion.div>
          <motion.div className="data-card" variants={fadeUp}>
            <span className="data-label">Sound Level</span>
            <span className="data-value">{readings.sound}</span>
            <MiniChart data={readingsHistory.map(r => r.sound)} color="#bf5af2" />
          </motion.div>
          <motion.div className="data-card" variants={fadeUp}>
            <span className="data-label">Motion</span>
            <span className="data-value" style={{ color: readings.motion ? 'var(--accent)' : 'var(--muted)' }}>
              {readings.motion ? 'Detected' : 'Clear'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
              <StatusDot status={deviceOnline ? 'ok' : 'danger'} size={8} label={null} />
              <span className="caption">{deviceOnline ? 'Device Online' : 'Device Offline'}</span>
            </div>
          </motion.div>
        </div>
        <motion.div variants={fadeUp} style={{ marginTop: '36px', zIndex: 1, position: 'relative' }}>
          <Link to="/dashboard" className="btn-primary">
            Open full dashboard <ChevronRight size={16} strokeWidth={ICON_STROKE} />
          </Link>
        </motion.div>
      </FadeSection>

      {/* ═══════ 9. AURORA DIVIDER ═══════ */}
      <AuroraDivider />

      {/* ═══════ 10. HOW IT WORKS ═══════ */}
      <FadeSection id="how-it-works" dark>
        <motion.p className="eyebrow" variants={fadeUp}>How It Works</motion.p>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px', marginBottom: '64px' }}>
          From sensor to screen in milliseconds.
        </motion.h2>
        <motion.div className="flow-diagram" variants={fadeUp}>
          {[
            { icon: <Thermometer size={24} strokeWidth={ICON_STROKE} />, label: 'Sense', sub: '5 sensors read environment' },
            { icon: <Cpu size={24} strokeWidth={ICON_STROKE} />, label: 'Process', sub: 'ESP32 digitizes & packages' },
            { icon: <Wifi size={24} strokeWidth={ICON_STROKE} />, label: 'Transmit', sub: 'MQTT over TLS to cloud' },
            { icon: <Server size={24} strokeWidth={ICON_STROKE} />, label: 'Store', sub: 'MongoDB time-series DB' },
            { icon: <Bell size={24} strokeWidth={ICON_STROKE} />, label: 'Alert', sub: 'Dashboard + Email + Buzzer' },
          ].map((step, i) => (
            <div key={i} className="flow-step">
              <div className="flow-icon">{step.icon}</div>
              <h4 className="flow-label">{step.label}</h4>
              <p className="flow-sub caption">{step.sub}</p>
              {i < 4 && <div className="flow-line"><ArrowRight size={16} strokeWidth={ICON_STROKE} /></div>}
            </div>
          ))}
        </motion.div>
      </FadeSection>

      {/* ═══════ 11. SPECS ═══════ */}
      <FadeSection id="specs" className="section-surface">
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Tech Specs
        </motion.h2>
        <div className="specs-container">
          <motion.div className="specs-list" variants={fadeUp}>
            {SPECS.map(([label, value], i) => (
              <div className="spec-row" key={i}>
                <span className="spec-label">{label}</span>
                <span className="spec-value">{value}</span>
              </div>
            ))}
          </motion.div>
          <motion.div variants={fadeUp} style={{ marginTop: '64px', width: '100%' }}>
            <h3 className="headline-small" style={{ marginBottom: '24px' }}>Pin Mapping</h3>
            <div className="pin-table-wrapper">
              <table className="pin-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>ESP32 Pin</th>
                    <th>Function</th>
                  </tr>
                </thead>
                <tbody>
                  {PIN_MAP.map(([comp, pin, func], i) => (
                    <tr key={i}>
                      <td>{comp}</td>
                      <td><code>{pin}</code></td>
                      <td>{func}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        </div>
      </FadeSection>

      {/* ═══════ 12. WHAT'S IN THE BOX / COST ═══════ */}
      <FadeSection>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '16px' }}>
          What's in the box.
        </motion.h2>
        <motion.p className="body-large" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Everything you need to build your own {siteConfig.name}.
        </motion.p>
        <motion.div className="bom-table-wrapper" variants={fadeUp}>
          <table className="pin-table">
            <thead>
              <tr><th>Component</th><th>Qty</th><th>Est. Cost</th></tr>
            </thead>
            <tbody>
              {BOM.map(([item, qty, cost], i) => (
                <tr key={i}><td>{item}</td><td>{qty}</td><td>{cost}</td></tr>
              ))}
              <tr className="bom-total">
                <td><strong>Total</strong></td>
                <td></td>
                <td><strong>~₹1,060</strong></td>
              </tr>
            </tbody>
          </table>
        </motion.div>

        <motion.h3 className="headline-small" variants={fadeUp} style={{ marginTop: '80px', marginBottom: '32px' }}>
          Concept Plans
        </motion.h3>
        <div className="plans-grid">
          {PLANS.map((plan) => (
            <motion.div className={`plan-card ${plan.featured ? 'plan-featured' : ''}`} key={plan.name} variants={fadeUp}>
              {plan.featured && <span className="plan-badge">Most Popular</span>}
              <h4 className="plan-name">{plan.name}</h4>
              <p className="plan-price headline-small">{plan.price}</p>
              <p className="body-default" style={{ marginBottom: '24px' }}>{plan.desc}</p>
              <ul className="plan-features">
                {plan.features.map((f, i) => (
                  <li key={i}>
                    <Check size={14} strokeWidth={ICON_STROKE} style={{ color: 'var(--ok)', flexShrink: 0 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 13. USE CASES ═══════ */}
      <FadeSection className="section-surface">
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Built for every environment.
        </motion.h2>
        <div className="usecases-grid">
          {USE_CASES.map((uc) => (
            <motion.div className="usecase-card" key={uc.title} variants={fadeUp}>
              {['home', 'outdoor', 'storage'].includes(uc.key) && (
                <UseCaseArt name={uc.key} alt={uc.title} />
              )}
              <div className="usecase-header">
                {!['home', 'outdoor', 'storage'].includes(uc.key) && (
                  <uc.icon size={24} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} />
                )}
                <h4 className="usecase-title">{uc.title}</h4>
              </div>
              <p className="body-default">{uc.desc}</p>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 14. TEAM ═══════ */}
      <FadeSection id="team">
        <motion.p className="eyebrow" variants={fadeUp}>The Team</motion.p>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px', marginBottom: '48px' }}>
          Meet the makers.
        </motion.h2>
        <div className="team-grid">
          {TEAM.map((m, i) => (
            <motion.div className="team-card" key={i} variants={fadeUp}>
              <div className="team-photo">
                <User size={32} strokeWidth={ICON_STROKE} color="var(--muted)" />
              </div>
              <h4 className="team-name">{m.name}</h4>
              <p className="team-role">{m.role}</p>
              <p className="caption">{m.roll}</p>
              <p className="body-default" style={{ fontSize: '14px', marginTop: '8px' }}>{m.bio}</p>
              <div className="team-socials">
                <a href="#" aria-label="Website"><Globe size={16} strokeWidth={ICON_STROKE} /></a>
                <a href="#" aria-label="Portfolio"><Briefcase size={16} strokeWidth={ICON_STROKE} /></a>
                <a href="#" aria-label="Email"><Mail size={16} strokeWidth={ICON_STROKE} /></a>
              </div>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 15. GUIDES ═══════ */}
      <FadeSection id="guides" className="section-surface">
        <motion.p className="eyebrow" variants={fadeUp}>Our Guides</motion.p>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px', marginBottom: '16px' }}>
          Faculty mentors.
        </motion.h2>
        <motion.p className="body-large" variants={fadeUp} style={{ marginBottom: '48px' }}>
          [COLLEGE NAME], [DEPARTMENT] — [CITY], [YEAR]
        </motion.p>
        <div className="guides-grid">
          {GUIDES.map((g, i) => (
            <motion.div className="guide-card" key={i} variants={fadeUp}>
              <div className="guide-photo">
                <BookOpen size={44} strokeWidth={ICON_STROKE} color="var(--muted)" />
              </div>
              <div className="guide-info">
                <h4>{g.name}</h4>
                <p className="body-default">{g.designation}</p>
                <p className="caption">{g.department}</p>
                <p className="caption">{g.qualification}</p>
                <p className="body-default" style={{ marginTop: '12px', fontSize: '14px' }}>{g.note}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 16. GALLERY ═══════ */}
      <GallerySection />

      {/* ═══════ 17. FAQ ═══════ */}
      <FadeSection id="faq">
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Questions? Answers.
        </motion.h2>
        <div className="faq-list">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} question={faq.q} answer={faq.a} />
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 18. CONTACT ═══════ */}
      <FadeSection id="contact" className="section-surface">
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '16px' }}>
          Get in touch.
        </motion.h2>
        <motion.p className="body-large" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Have a question or want to collaborate? Drop us a message.
        </motion.p>
        <ContactForm />
      </FadeSection>

      {/* ═══════ 19. CLOSING CTA ═══════ */}
      <section className="section cta-section">
        <SectionBackdrop src="/images/cta-bg.webp" width={2560} height={900} overlay="bottom" />
        <div className="cta-content">
          <motion.h2
            className="headline-large"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            Start monitoring with {siteConfig.name}.
          </motion.h2>
          <motion.p
            className="body-large"
            style={{ marginTop: '16px', color: '#a1a1a6' }}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1, duration: 0.8 }}
          >
            {siteConfig.tagline}
          </motion.p>
          <motion.div
            className="cta-actions"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            <Link to="/dashboard" className="btn-primary" style={{ padding: '14px 36px', fontSize: '18px' }}>
              Open Live Dashboard
            </Link>
            {siteConfig.repoUrl && (
              <a href={siteConfig.repoUrl} target="_blank" rel="noopener noreferrer" className="btn-link" style={{ fontSize: '18px', color: '#f5f5f7' }}>
                View Source on GitHub <ChevronRight size={18} strokeWidth={ICON_STROKE} className="chevron" />
              </a>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
}

/* ─── SUB-COMPONENTS ─── */

function IntroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const text = `${siteConfig.name} is an intelligent, multi-sensor safety hub that monitors your environment in real time — detecting heat, flame, motion, rain, and sound — and alerts you instantly, from anywhere in the world.`;
  const words = text.split(' ');

  return (
    <section ref={ref} id="intro" className="section section-dark intro-section">
      <div className="container text-center">
        <p className="intro-text">
          {words.map((word, i) => (
            <IntroWord key={i} index={i} total={words.length} scrollYProgress={scrollYProgress}>
              {word}{' '}
            </IntroWord>
          ))}
        </p>
      </div>
    </section>
  );
}

function IntroWord({ children, index, total, scrollYProgress }) {
  const start = (index / total) * 0.8;
  const end = start + 0.15;
  const opacity = useTransform(scrollYProgress, [start, end], [0.15, 1]);
  return <motion.span style={{ opacity }} className="intro-word">{children}</motion.span>;
}

function StickyTourSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });
  const [activeIdx, setActiveIdx] = useState(0);

  useMotionValueEvent(scrollYProgress, 'change', (latest) => {
    const idx = Math.min(SENSORS.length - 1, Math.max(0, Math.floor(latest * SENSORS.length)));
    setActiveIdx(idx);
  });

  const activeSensor = SENSORS[activeIdx] || SENSORS[0];

  const handleStepClick = (index) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const scrollTop = window.scrollY || window.pageYOffset;
    const targetY = scrollTop + rect.top + (index / (SENSORS.length - 1)) * (containerRef.current.offsetHeight - window.innerHeight);
    window.scrollTo({ top: targetY, behavior: 'smooth' });
  };

  return (
    <section ref={containerRef} id="sensors" className="sticky-tour-container">
      <div className="sticky-tour-inner">
        <div className="container sticky-tour-grid">
          {/* LEFT: Sensor info & specs as user scrolls */}
          <div className="sticky-tour-info">
            <div className="sticky-tour-header">
              <span className="sticky-tour-pill">
                <span className="sticky-tour-pulse" style={{ backgroundColor: activeSensor.color }} />
                Sensor 0{activeIdx + 1} of 0{SENSORS.length}
              </span>
              <span className="sticky-tour-tag">Live Sensor Showcase</span>
            </div>

            <div className="sticky-captions-stage">
              {SENSORS.map((s, i) => (
                <StickyCaption key={s.key} sensor={s} index={i} scrollYProgress={scrollYProgress} />
              ))}
            </div>

            {/* Stepper pills at bottom of left column */}
            <div className="sticky-tour-stepper" role="tablist" aria-label="Sensor tour navigation">
              {SENSORS.map((s, i) => {
                const IconComponent = s.icon;
                const isActive = activeIdx === i;
                return (
                  <button
                    key={s.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`tour-step-btn ${isActive ? 'is-active' : ''}`}
                    onClick={() => handleStepClick(i)}
                    style={{ '--step-color': s.color }}
                  >
                    <IconComponent size={14} strokeWidth={ICON_STROKE} />
                    <span>{s.shortName}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Product enclosure illustration that highlights active sensor */}
          <div className="sticky-product">
            <div className="sticky-product-stage">
              <div
                className="sticky-product-glow"
                style={{
                  background: `radial-gradient(circle, ${activeSensor.color}33 0%, transparent 70%)`,
                }}
              />
              <ProductIllustration highlight={activeSensor.key} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StickyCaption({ sensor, index, scrollYProgress }) {
  const segStart = index / SENSORS.length;
  const segEnd = (index + 1) / SENSORS.length;
  const isFirst = index === 0;
  const isLast = index === SENSORS.length - 1;

  const opacity = useTransform(
    scrollYProgress,
    isFirst
      ? [0, segEnd - 0.05, segEnd]
      : isLast
      ? [segStart, segStart + 0.05, 1]
      : [segStart, segStart + 0.04, segEnd - 0.04, segEnd],
    isFirst
      ? [1, 1, 0]
      : isLast
      ? [0, 1, 1]
      : [0, 1, 1, 0]
  );

  const y = useTransform(
    scrollYProgress,
    isFirst
      ? [0, segEnd]
      : isLast
      ? [segStart, segStart + 0.05]
      : [segStart, segStart + 0.04, segEnd - 0.04, segEnd],
    isFirst
      ? [0, -15]
      : isLast
      ? [20, 0]
      : [20, 0, 0, -15]
  );

  return (
    <motion.div
      className="sticky-caption"
      style={{
        opacity,
        y,
      }}
    >
      <div className="sticky-caption-header">
        <div className="sticky-caption-icon" style={{ color: sensor.color }}>
          <sensor.icon size={28} strokeWidth={ICON_STROKE} />
        </div>
        <div>
          <span className="sensor-short-badge" style={{ color: sensor.color, borderColor: `${sensor.color}40` }}>
            {sensor.shortName}
          </span>
          <h3 className="headline-medium sensor-title">{sensor.name}</h3>
        </div>
      </div>

      <p className="body-large sensor-desc">{sensor.desc}</p>

      <div className="sensor-specs-grid">
        <div className="sensor-spec-item">
          <span className="spec-label">Range / Sensitivity</span>
          <span className="spec-val">{sensor.range}</span>
        </div>
        <div className="sensor-spec-item">
          <span className="spec-label">Principle</span>
          <span className="spec-val">{sensor.principle}</span>
        </div>
        <div className="sensor-spec-item">
          <span className="spec-label">ESP32 Pin</span>
          <span className="spec-val">{sensor.pin}</span>
        </div>
      </div>
    </motion.div>
  );
}

function AnywhereSection() {
  return (
    <section className="section anywhere-section">
      <SectionBackdrop src="/images/dashboard-backdrop.webp" width={2000} height={1400} overlay="center" opacity={0.4} />
      <div className="anywhere-content">
        <p className="eyebrow">Cloud MQTT</p>
        <h2 className="headline-large" style={{ marginTop: '12px' }}>
          Anywhere you are. Connected.
        </h2>
        <p className="body-large" style={{ marginTop: '16px', color: '#a1a1a6', maxWidth: '680px', margin: '16px auto 0' }}>
          {siteConfig.name} connects directly to HiveMQ Cloud over encrypted TLS. Whether you are on office Wi-Fi, cellular, or across the globe, telemetry arrives in milliseconds without port forwarding or VPNs.
        </p>

        <div className="anywhere-map-wrap">
          <picture>
            <source type="image/webp" srcSet="/images/anywhere-map.webp" />
            <img
              src="/images/anywhere-map.svg"
              alt="World map showing encrypted MQTT telemetry routing across global nodes"
              width="2000"
              height="1000"
              loading="lazy"
              decoding="async"
              className="anywhere-map-img"
            />
          </picture>
        </div>

        <div className="anywhere-badges">
          <span className="anywhere-badge">
            <Globe size={16} strokeWidth={ICON_STROKE} style={{ color: 'var(--accent)' }} />
            HiveMQ Cloud TLS Broker
          </span>
          <span className="anywhere-badge">
            <ShieldCheck size={16} strokeWidth={ICON_STROKE} style={{ color: 'var(--ok)' }} />
            Zero Firewall Configuration
          </span>
          <span className="anywhere-badge">
            <Wifi size={16} strokeWidth={ICON_STROKE} style={{ color: '#ff9f0a' }} />
            Global Web Dashboard
          </span>
        </div>
      </div>
    </section>
  );
}

function ProductDescription() {
  return (
    <FadeSection id="story" className="story-section">
      <div className="container" style={{ maxWidth: '1140px' }}>
        <div className="text-center" style={{ marginBottom: '56px' }}>
          <p className="eyebrow">Origin & Philosophy</p>
          <motion.h2 className="headline-large" variants={fadeUp} style={{ marginTop: '12px' }}>
            The story behind {siteConfig.name}.
          </motion.h2>
          <motion.p className="body-large" variants={fadeUp} style={{ color: 'var(--muted)', maxWidth: '640px', margin: '14px auto 0' }}>
            Why we engineered an open, multi-sensory safety hub that protects homes, labs, and facilities without complexity or vendor lock-in.
          </motion.p>
        </div>

        <div className="story-grid">
          {/* Pair 1: Problem on Left, Solution on Right */}
          <motion.div className="story-card" variants={fadeUp}>
            <span className="story-tag story-tag-problem">The Problem</span>
            <h3>Siloed, Disconnected Safety</h3>
            <p>
              Every year, thousands of homes, labs, and warehouses suffer from preventable disasters — fires that start unnoticed, water leaks that go undetected for hours, intrusions that happen in blind spots. Traditional safety systems are expensive, siloed, and rarely connected. A fire alarm doesn't know about your humidity levels. A motion sensor can't tell you about rising temperatures. And none of them let you check in from your phone while you're away.
            </p>
          </motion.div>

          <motion.div className="story-card" variants={fadeUp}>
            <span className="story-tag story-tag-solution">The Solution</span>
            <h3>Unified Multi-Sensor Intelligence</h3>
            <p>
              {siteConfig.name} changes that by combining five essential environmental sensors into a single, compact, internet-connected device. Built around the powerful ESP32 microcontroller, it continuously monitors temperature, humidity, motion, flame, rain, and sound — publishing all data in real time to a cloud dashboard you can access from anywhere. When something goes wrong, it doesn't just beep locally — it sends you an alert on your phone, logs the event, and shows you exactly what happened.
            </p>
          </motion.div>

          {/* Pair 2: Philosophy on Left, Alert Logic on Right */}
          <motion.div className="story-card" variants={fadeUp}>
            <span className="story-tag">Design Philosophy</span>
            <h3>Deliberate Simplicity & Reliability</h3>
            <p>
              We designed {siteConfig.name} with two principles: simplicity and reliability. The hardware is deliberately minimal — no unnecessary components, no bloated firmware. Each sensor was chosen because it solves a real, measurable safety concern. The software follows the same philosophy: clean interfaces, fast data flow, and zero configuration required to get started. Plug it in, connect to Wi-Fi, and you're monitoring.
            </p>
          </motion.div>

          <motion.div className="story-card" variants={fadeUp}>
            <span className="story-tag">Alert Logic</span>
            <h3>Multi-Tier Cascading Safety</h3>
            <p>
              {siteConfig.name}'s alert system is threshold-based and configurable. Each sensor has default thresholds that trigger warnings or critical alerts. Flame detection is always critical. Temperature, humidity, and sound use admin-configurable thresholds. Alerts cascade: local buzzer → dashboard toast → alert log → email notification. Each alert can be acknowledged and reviewed in the history.
            </p>
          </motion.div>

          {/* Pair 3: Who It's For on Left, Affordability & Scope on Right */}
          <motion.div className="story-card" variants={fadeUp}>
            <span className="story-tag">Who It's For</span>
            <h3>Homes, Labs, Storage & Makers</h3>
            <p>
              {siteConfig.name} is designed for anyone who needs affordable, connected environmental monitoring: homeowners, lab managers, warehouse operators, farmers, shop owners, and caregivers. It's also an excellent educational platform for learning IoT, embedded systems, cloud computing, and full-stack web development.
            </p>
          </motion.div>

          <motion.div className="story-card" variants={fadeUp}>
            <span className="story-tag">Affordability & Scope</span>
            <h3>Open Hardware, Endless Horizon</h3>
            <p>
              The entire bill of materials costs approximately ₹1,060 — less than a meal at a restaurant, with zero proprietary parts or recurring subscriptions. Furthermore, the ESP32 retains unused GPIO pins and processing headroom for future expansions: smoke/LPG sensors, PM2.5 air monitors, solar power, and multi-node mesh networking across facilities.
            </p>
          </motion.div>
        </div>
      </div>
    </FadeSection>
  );
}

function MiniChart({ data, color }) {
  if (!data || data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 40;
  const w = 200;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="mini-chart" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GallerySection() {
  const items = [
    { title: 'Circuit Overview', type: 'image' },
    { title: 'Enclosure Front', type: 'image' },
    { title: 'Sensor Array', type: 'image' },
    { title: 'Wiring Diagram', type: 'image' },
    { title: 'PCB Layout', type: 'image' },
    { title: 'Demo Video', type: 'video' },
  ];

  return (
    <FadeSection id="gallery" dark>
      <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '48px' }}>
        Gallery
      </motion.h2>
      <div className="gallery-grid">
        {items.map((item, i) => (
          <motion.div className="gallery-item" key={i} variants={fadeUp}>
            <div className="gallery-placeholder">
              {item.type === 'video' ? (
                <Video size={32} strokeWidth={ICON_STROKE} color="var(--muted)" />
              ) : (
                <Image size={32} strokeWidth={ICON_STROKE} color="var(--muted)" />
              )}
              <p className="caption" style={{ marginTop: '12px' }}>{item.title}</p>
              <p className="caption" style={{ opacity: 0.5 }}>[Replace with actual {item.type}]</p>
            </div>
          </motion.div>
        ))}
      </div>
    </FadeSection>
  );
}

function AccordionItem({ question, answer }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="accordion-item">
      <button
        className={`accordion-trigger ${open ? 'open' : ''}`}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {question}
        <Plus size={20} strokeWidth={ICON_STROKE} />
      </button>
      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <p>{answer}</p>
      </div>
    </div>
  );
}
