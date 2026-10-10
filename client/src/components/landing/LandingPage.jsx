import { useRef, useState } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { ChevronRight, Thermometer, Eye, Flame, CloudRain, Mic, Wifi, Server, Bell, Cpu, ArrowRight, Plus, Globe, Briefcase, Mail, ExternalLink } from 'lucide-react';
import useStore from '../../store/useStore';
import { Link } from 'react-router-dom';
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

function CountUp({ end, suffix = '', decimals = 0 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const value = useRef(0);

  if (inView && value.current === 0) {
    value.current = end;
  }

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
    >
      {inView ? (
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {typeof end === 'number' ? end.toFixed(decimals) : end}{suffix}
        </motion.span>
      ) : (
        '0'
      )}
    </motion.span>
  );
}

/* ─── Sensor Data ─── */
const SENSORS = [
  {
    key: 'temp',
    name: 'Temperature & Humidity',
    shortName: 'DHT11',
    icon: Thermometer,
    color: '#ff9f0a',
    principle: 'Capacitive humidity & NTC thermistor',
    range: '0–50°C / 20–90% RH',
    accuracy: '±2°C / ±5% RH',
    pin: 'GPIO 4',
    desc: 'Monitors ambient temperature and relative humidity. Triggers alerts when readings exceed safe thresholds.'
  },
  {
    key: 'motion',
    name: 'Motion Detection',
    shortName: 'HC-SR501 PIR',
    icon: Eye,
    color: '#0071e3',
    principle: 'Passive Infrared (PIR)',
    range: '7m, 120° cone',
    accuracy: 'Digital trigger',
    pin: 'GPIO 27',
    desc: 'Detects human/animal movement via body heat. Ideal for intrusion detection in unoccupied spaces.'
  },
  {
    key: 'flame',
    name: 'Flame Detection',
    shortName: 'Flame Sensor',
    icon: Flame,
    color: '#ff3b30',
    principle: 'IR photodiode (760–1100nm)',
    range: '~80cm direct flame',
    accuracy: 'Analog + Digital threshold',
    pin: 'AO: GPIO 34, DO: GPIO 25',
    desc: 'Detects open flame or fire via near-infrared radiation. The most critical safety sensor in the system.'
  },
  {
    key: 'rain',
    name: 'Rain Detection',
    shortName: 'Raindrop Module',
    icon: CloudRain,
    color: '#30d158',
    principle: 'Resistive traces on PCB',
    range: 'Binary wet/dry + analog intensity',
    accuracy: 'Analog + Digital threshold',
    pin: 'AO: GPIO 35, DO: GPIO 26',
    desc: 'Detects water/rain presence on the sensor pad. Useful for outdoor installations and leak detection.'
  },
  {
    key: 'sound',
    name: 'Sound Level',
    shortName: 'Microphone Module',
    icon: Mic,
    color: '#bf5af2',
    principle: 'Electret condenser microphone',
    range: '50–120 dB approximation',
    accuracy: 'Analog envelope + Digital threshold',
    pin: 'AO: GPIO 32, DO: GPIO 33',
    desc: 'Captures ambient noise level. Detects loud events like glass breaking, alarms, or machinery failures.'
  },
];

const SPECS = [
  ['Microcontroller', 'ESP32-WROOM-32 (Dual-core 240 MHz, 520 KB SRAM)'],
  ['Sensors', '5 — DHT11, HC-SR501, Flame, Rain, Sound'],
  ['Connectivity', 'Wi-Fi 802.11 b/g/n, Bluetooth 4.2 + BLE'],
  ['Protocol', 'MQTT v3.1.1 over TLS (WebSocket)'],
  ['Cloud Broker', 'HiveMQ Cloud (free tier)'],
  ['Power', '5V USB / 3.3V regulated'],
  ['Actuators', 'Piezo buzzer (GPIO 18), Status LED (GPIO 2)'],
  ['Dimensions', '~120 × 80 × 45 mm (enclosure)'],
  ['Operating Temp', '0°C – 50°C'],
  ['Data Logging', 'MongoDB Atlas time-series (90-day TTL)'],
  ['Backend', 'Node.js + Express + Socket.IO'],
  ['Frontend', 'React 18 + Vite + Framer Motion'],
];

const PIN_MAP = [
  ['DHT11 (Data)', 'GPIO 4', 'Temperature & Humidity'],
  ['HC-SR501 PIR (OUT)', 'GPIO 27', 'Motion Detection'],
  ['Flame Sensor (AO)', 'GPIO 34', 'Flame Analog'],
  ['Flame Sensor (DO)', 'GPIO 25', 'Flame Digital'],
  ['Rain Sensor (AO)', 'GPIO 35', 'Rain Analog'],
  ['Rain Sensor (DO)', 'GPIO 26', 'Rain Digital'],
  ['Sound Sensor (AO)', 'GPIO 32', 'Sound Analog'],
  ['Sound Sensor (DO)', 'GPIO 33', 'Sound Digital'],
  ['Buzzer', 'GPIO 18', 'Alert Output'],
  ['Status LED', 'GPIO 2', 'System Status'],
];

const BOM = [
  ['ESP32-WROOM-32 DevKit', 1, '₹450'],
  ['DHT11 Temperature & Humidity Sensor', 1, '₹60'],
  ['HC-SR501 PIR Motion Sensor', 1, '₹65'],
  ['Flame Sensor Module (4-pin)', 1, '₹45'],
  ['Raindrop Detection Module', 1, '₹55'],
  ['Sound Sensor / Mic Module', 1, '₹50'],
  ['Piezo Buzzer (Active)', 1, '₹15'],
  ['Breadboard (830-point)', 1, '₹80'],
  ['Jumper Wires (M-M, M-F)', 1, '₹60'],
  ['USB Cable (Micro-B / Type-C)', 1, '₹50'],
  ['Enclosure / Project Box', 1, '₹100'],
  ['Miscellaneous (Resistors, LEDs)', 1, '₹30'],
];

const USE_CASES = [
  { title: 'Smart Home', desc: "Monitor rooms for fire, intrusion, and environmental hazards while you're away.", icon: '🏠' },
  { title: 'Lab Safety', desc: 'Continuous monitoring of temperature, gas leaks, and unauthorized access in research labs.', icon: '🔬' },
  { title: 'Warehouse', desc: 'Detect fire, water leaks, and movement in large storage facilities 24/7.', icon: '🏭' },
  { title: 'Smart Farm', desc: 'Track rain, temperature, and humidity for precision agriculture and crop protection.', icon: '🌾' },
  { title: 'Retail Shop', desc: 'After-hours security with motion and sound detection, plus fire safety.', icon: '🏪' },
  { title: 'Elder Care', desc: 'Monitor activity patterns and environmental safety for elderly living independently.', icon: '🏥' },
];

const FAQS = [
  { q: 'What is Sentinel?', a: 'Sentinel is a compact, multi-sensor IoT safety hub built around an ESP32 microcontroller. It monitors temperature, humidity, motion, flame, rain, and sound — then sends real-time data to a cloud dashboard accessible from anywhere.' },
  { q: 'Does it need internet to work?', a: 'Yes, Sentinel requires a Wi-Fi connection to publish sensor data to the MQTT broker and display readings on the web dashboard. The ESP32 connects to your local Wi-Fi network.' },
  { q: 'How does the alert system work?', a: 'When a sensor reading crosses a predefined threshold (e.g., flame detected, temperature above 50°C), the system triggers a buzzer locally, sends an MQTT alert message, and displays a notification on the dashboard. Email alerts can also be configured.' },
  { q: 'Can I monitor from my phone?', a: 'Absolutely. The web dashboard is fully responsive and works on any device with a browser. There is no separate mobile app needed — just open the URL on your phone.' },
  { q: 'What is the range of the PIR motion sensor?', a: 'The HC-SR501 PIR sensor detects motion up to approximately 7 meters with a 120° detection cone. Sensitivity and delay time can be adjusted via onboard potentiometers.' },
  { q: 'How accurate is the temperature reading?', a: 'The DHT11 sensor provides temperature readings accurate to ±2°C and humidity readings accurate to ±5% RH. For higher accuracy, the DHT22 can be used as a drop-in upgrade.' },
  { q: 'Is it safe to leave running 24/7?', a: 'Yes. The system draws minimal power (under 500mA via USB) and the ESP32 is designed for continuous operation. All components operate well within their rated specifications.' },
  { q: 'Can I add more sensors?', a: 'Definitely. The ESP32 has multiple unused GPIO pins. You can add gas sensors (MQ series), ultrasonic distance sensors, light sensors, or even a camera module. The code architecture is modular for easy expansion.' },
  { q: 'Is the data stored somewhere?', a: 'Yes, all readings are stored in MongoDB Atlas with a time-series collection optimized for IoT data. By default, data is retained for 90 days. You can export historical data as CSV.' },
  { q: 'What is Demo Mode?', a: 'Demo Mode generates simulated sensor data so you can explore the dashboard and all features without physical hardware connected. Toggle it on from the dashboard.' },
];

const TEAM = [
  { name: '[MEMBER 1 NAME]', role: '[ROLE, e.g., Hardware Lead]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
  { name: '[MEMBER 2 NAME]', role: '[ROLE, e.g., Backend Developer]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
  { name: '[MEMBER 3 NAME]', role: '[ROLE, e.g., Frontend Developer]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
  { name: '[MEMBER 4 NAME]', role: '[ROLE, e.g., IoT & Cloud]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
];

const GUIDES = [
  { name: '[GUIDE 1 NAME]', designation: '[Designation]', department: '[Department]', qualification: '[Qualification]', note: '[Short note about the guide]', photo: null },
  { name: '[GUIDE 2 NAME]', designation: '[Designation]', department: '[Department]', qualification: '[Qualification]', note: '[Short note about the guide]', photo: null },
];

const PLANS = [
  {
    name: 'Basic',
    price: '₹1,060',
    desc: 'Core hardware kit for personal projects',
    features: ['ESP32 + 5 sensors', 'Local buzzer alerts', 'Web dashboard', 'Demo mode', 'Community support'],
  },
  {
    name: 'Pro',
    price: '₹2,500',
    desc: 'Enhanced with enclosure and cloud features',
    features: ['Everything in Basic', 'Custom 3D-printed enclosure', 'Cloud data logging (90 days)', 'Email alerts', 'Priority support'],
    featured: true,
  },
  {
    name: 'Enterprise',
    price: 'Contact Us',
    desc: 'Multi-device fleet for organizations',
    features: ['Everything in Pro', 'Multi-device management', 'Custom thresholds per zone', 'API access', 'Dedicated onboarding'],
  },
];

/* ─── LANDING PAGE ─── */
export default function LandingPage() {
  const readings = useStore((s) => s.readings);
  const deviceOnline = useStore((s) => s.deviceOnline);
  const readingsHistory = useStore((s) => s.readingsHistory);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <main>
      {/* ═══════ 1. HERO ═══════ */}
      <motion.section ref={heroRef} className="section hero-section" style={{ scale: heroScale, opacity: heroOpacity }}>
        <div className="hero-content text-center">
          <motion.p className="eyebrow" variants={fadeUp} initial="hidden" animate="visible">New</motion.p>
          <motion.h1
            className="headline-hero hero-title"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
          >
            Sentinel
          </motion.h1>
          <motion.p
            className="body-large hero-tagline"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.2 }}
          >
            Five senses. One box. Anywhere.
          </motion.p>
          <motion.div
            className="hero-ctas"
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            <Link to="/dashboard" className="btn-link" style={{ fontSize: '21px' }}>
              Live dashboard <ChevronRight size={18} className="chevron" />
            </Link>
            <a href="#intro" className="btn-link" style={{ fontSize: '21px' }}>
              Learn more <ChevronRight size={18} className="chevron" />
            </a>
          </motion.div>

          {/* Product Visual */}
          <motion.div
            className="hero-product"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
          >
            <div className="product-box-visual">
              <div className="product-box">
                <div className="product-box-face front">
                  <div className="product-box-label">SENTINEL</div>
                  <div className="product-box-chip">ESP32</div>
                  <div className="product-sensors-grid">
                    <div className="sensor-dot" style={{ background: '#ff9f0a' }} title="DHT11"><Thermometer size={14} /></div>
                    <div className="sensor-dot" style={{ background: '#0071e3' }} title="PIR"><Eye size={14} /></div>
                    <div className="sensor-dot" style={{ background: '#ff3b30' }} title="Flame"><Flame size={14} /></div>
                    <div className="sensor-dot" style={{ background: '#30d158' }} title="Rain"><CloudRain size={14} /></div>
                    <div className="sensor-dot" style={{ background: '#bf5af2' }} title="Sound"><Mic size={14} /></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="hero-status-pill">
              <span className={`status-dot ${deviceOnline ? 'online' : 'offline'}`}></span>
              <span className="caption">{deviceOnline ? 'Online' : 'Offline'}</span>
            </div>
          </motion.div>
        </div>
      </motion.section>

      {/* ═══════ 2. INTRO STATEMENT ═══════ */}
      <IntroSection />

      {/* ═══════ 3. STICKY SENSOR TOUR ═══════ */}
      <StickyTourSection />

      {/* ═══════ 4. SENSOR CARDS (Swipeable) ═══════ */}
      <FadeSection id="features" className="section-surface">
        <motion.p className="eyebrow" variants={fadeUp}>Take a closer look</motion.p>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px', marginBottom: '48px' }}>
          Five sensors. One mission.
        </motion.h2>
        <div className="sensor-cards-scroll">
          {SENSORS.map((s) => (
            <motion.div className="sensor-card" key={s.key} variants={fadeUp}>
              <div className="sensor-card-icon" style={{ color: s.color }}>
                <s.icon size={32} strokeWidth={1.5} />
              </div>
              <h3 className="sensor-card-title">{s.name}</h3>
              <p className="sensor-card-chip">{s.shortName}</p>
              <div className="sensor-card-specs">
                <div><span className="caption">Principle</span><p>{s.principle}</p></div>
                <div><span className="caption">Range</span><p>{s.range}</p></div>
                <div><span className="caption">Accuracy</span><p>{s.accuracy}</p></div>
                <div><span className="caption">ESP32 Pin</span><p>{s.pin}</p></div>
              </div>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 5. PRODUCT DESCRIPTION ═══════ */}
      <ProductDescription />

      {/* ═══════ 6. LIVE NOW ═══════ */}
      <FadeSection id="live" className="">
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
              <span className={`status-dot ${deviceOnline ? 'online' : 'offline'}`}></span>
              <span className="caption">{deviceOnline ? 'Device Online' : 'Device Offline'}</span>
            </div>
          </motion.div>
        </div>
        <motion.div variants={fadeUp} style={{ marginTop: '32px' }}>
          <Link to="/dashboard" className="btn-primary">
            Open full dashboard <ChevronRight size={16} />
          </Link>
        </motion.div>
      </FadeSection>

      {/* ═══════ 7. HOW IT WORKS ═══════ */}
      <FadeSection id="how-it-works" dark>
        <motion.p className="eyebrow" variants={fadeUp}>How It Works</motion.p>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px', marginBottom: '64px' }}>
          From sensor to screen in milliseconds.
        </motion.h2>
        <motion.div className="flow-diagram" variants={fadeUp}>
          {[
            { icon: <Thermometer size={24} />, label: 'Sense', sub: '5 sensors read environment' },
            { icon: <Cpu size={24} />, label: 'Process', sub: 'ESP32 digitizes & packages' },
            { icon: <Wifi size={24} />, label: 'Transmit', sub: 'MQTT over TLS to cloud' },
            { icon: <Server size={24} />, label: 'Store', sub: 'MongoDB time-series DB' },
            { icon: <Bell size={24} />, label: 'Alert', sub: 'Dashboard + Email + Buzzer' },
          ].map((step, i) => (
            <div key={i} className="flow-step">
              <div className="flow-icon">{step.icon}</div>
              <h4 className="flow-label">{step.label}</h4>
              <p className="flow-sub caption">{step.sub}</p>
              {i < 4 && <div className="flow-line"><ArrowRight size={16} /></div>}
            </div>
          ))}
        </motion.div>
      </FadeSection>

      {/* ═══════ 8. SPECS ═══════ */}
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

      {/* ═══════ 9. WHAT'S IN THE BOX / COST ═══════ */}
      <FadeSection>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '16px' }}>
          What's in the box.
        </motion.h2>
        <motion.p className="body-large" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Everything you need to build your own Sentinel.
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
                  <li key={i}><span style={{ color: 'var(--ok)', marginRight: '8px' }}>✓</span>{f}</li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 10. USE CASES ═══════ */}
      <FadeSection className="section-surface">
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Built for every environment.
        </motion.h2>
        <div className="usecases-grid">
          {USE_CASES.map((uc) => (
            <motion.div className="usecase-card" key={uc.title} variants={fadeUp}>
              <span className="usecase-icon">{uc.icon}</span>
              <h4 className="usecase-title">{uc.title}</h4>
              <p className="body-default">{uc.desc}</p>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 11. TEAM ═══════ */}
      <FadeSection id="team">
        <motion.p className="eyebrow" variants={fadeUp}>The Team</motion.p>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginTop: '12px', marginBottom: '48px' }}>
          Meet the makers.
        </motion.h2>
        <div className="team-grid">
          {TEAM.map((m, i) => (
            <motion.div className="team-card" key={i} variants={fadeUp}>
              <div className="team-photo">
                <span style={{ fontSize: '32px' }}>👤</span>
              </div>
              <h4 className="team-name">{m.name}</h4>
              <p className="team-role">{m.role}</p>
              <p className="caption">{m.roll}</p>
              <p className="body-default" style={{ fontSize: '14px', marginTop: '8px' }}>{m.bio}</p>
              <div className="team-socials">
                <a href="#" aria-label="Website"><Globe size={16} strokeWidth={1.5} /></a>
                <a href="#" aria-label="Portfolio"><Briefcase size={16} strokeWidth={1.5} /></a>
                <a href="#" aria-label="Email"><Mail size={16} strokeWidth={1.5} /></a>
              </div>
            </motion.div>
          ))}
        </div>
      </FadeSection>

      {/* ═══════ 12. GUIDES ═══════ */}
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
                <span style={{ fontSize: '48px' }}>👤</span>
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

      {/* ═══════ 13. GALLERY ═══════ */}
      <GallerySection />

      {/* ═══════ 14. FAQ ═══════ */}
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

      {/* ═══════ 15. CONTACT ═══════ */}
      <FadeSection id="contact" className="section-surface">
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '16px' }}>
          Get in touch.
        </motion.h2>
        <motion.p className="body-large" variants={fadeUp} style={{ marginBottom: '48px' }}>
          Have a question or want to collaborate? Drop us a message.
        </motion.p>
        <ContactForm />
      </FadeSection>
    </main>
  );
}

/* ─── SUB-COMPONENTS ─── */

function IntroSection() {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });

  const words = 'Sentinel is an intelligent, multi-sensor safety hub that monitors your environment in real time — detecting heat, flame, motion, rain, and sound — and alerts you instantly, from anywhere in the world.'.split(' ');

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
  const start = index / total * 0.8;
  const end = start + 0.15;
  const opacity = useTransform(scrollYProgress, [start, end], [0.15, 1]);
  return <motion.span style={{ opacity }} className="intro-word">{children}</motion.span>;
}

function StickyTourSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: containerRef, offset: ['start start', 'end end'] });

  return (
    <section ref={containerRef} className="sticky-tour-container">
      <div className="sticky-tour-inner">
        <div className="sticky-product">
          <div className="product-box-visual large">
            <div className="product-box">
              <div className="product-box-face front">
                <div className="product-box-label">SENTINEL</div>
                <div className="product-box-chip">ESP32</div>
                <div className="product-sensors-grid large">
                  {SENSORS.map((s, i) => (
                    <SensorHighlight key={s.key} sensor={s} index={i} scrollYProgress={scrollYProgress} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="sticky-captions">
          {SENSORS.map((s, i) => (
            <StickyCaption key={s.key} sensor={s} index={i} scrollYProgress={scrollYProgress} />
          ))}
        </div>
      </div>
    </section>
  );
}

function SensorHighlight({ sensor, index, scrollYProgress }) {
  const start = index / 5;
  const end = (index + 1) / 5;
  const scale = useTransform(scrollYProgress, [start, start + 0.05, end - 0.05, end], [1, 1.5, 1.5, 1]);
  const glow = useTransform(scrollYProgress, [start, start + 0.05, end - 0.05, end], [0, 1, 1, 0]);

  return (
    <motion.div
      className="sensor-dot"
      style={{
        background: sensor.color,
        scale,
        boxShadow: useTransform(glow, (v) => `0 0 ${v * 16}px ${sensor.color}`),
      }}
      title={sensor.name}
    >
      <sensor.icon size={14} />
    </motion.div>
  );
}

function StickyCaption({ sensor, index, scrollYProgress }) {
  const start = index / 5;
  const end = (index + 1) / 5;
  const opacity = useTransform(scrollYProgress, [start, start + 0.08, end - 0.08, end], [0, 1, 1, 0]);
  const y = useTransform(scrollYProgress, [start, start + 0.08], [40, 0]);

  return (
    <motion.div className="sticky-caption" style={{ opacity, y }}>
      <div className="sticky-caption-icon" style={{ color: sensor.color }}>
        <sensor.icon size={28} strokeWidth={1.5} />
      </div>
      <h3 className="headline-small">{sensor.name}</h3>
      <p className="body-large">{sensor.desc}</p>
    </motion.div>
  );
}

function ProductDescription() {
  return (
    <FadeSection>
      <div className="container" style={{ maxWidth: '720px' }}>
        <motion.h2 className="headline-medium" variants={fadeUp} style={{ marginBottom: '48px' }}>
          The story behind Sentinel.
        </motion.h2>

        <motion.div className="prose" variants={fadeUp}>
          <h3>The Problem</h3>
          <p>
            Every year, thousands of homes, labs, and warehouses suffer from preventable disasters — fires that start unnoticed, water leaks that go undetected for hours, intrusions that happen in blind spots. Traditional safety systems are expensive, siloed, and rarely connected. A fire alarm doesn't know about your humidity levels. A motion sensor can't tell you about rising temperatures. And none of them let you check in from your phone while you're away.
          </p>

          <h3>The Solution</h3>
          <p>
            Sentinel changes that by combining five essential environmental sensors into a single, compact, internet-connected device. Built around the powerful ESP32 microcontroller, it continuously monitors temperature, humidity, motion, flame, rain, and sound — publishing all data in real time to a cloud dashboard you can access from anywhere. When something goes wrong, it doesn't just beep locally — it sends you an alert on your phone, logs the event, and shows you exactly what happened.
          </p>

          <h3>Design Philosophy</h3>
          <p>
            We designed Sentinel with two principles: simplicity and reliability. The hardware is deliberately minimal — no unnecessary components, no bloated firmware. Each sensor was chosen because it solves a real, measurable safety concern. The software follows the same philosophy: clean interfaces, fast data flow, and zero configuration required to get started. Plug it in, connect to Wi-Fi, and you're monitoring.
          </p>

          <h3>Temperature & Humidity — The Baseline</h3>
          <p>
            The DHT11 sensor provides the environmental baseline. Temperature and humidity affect everything — human comfort, equipment safety, mold growth, and fire risk. Sentinel tracks these continuously and can alert you if a room overheats (above 50°C) or if humidity drops to dangerously low levels that increase static electricity and fire risk.
          </p>

          <h3>Motion — Know Who's There</h3>
          <p>
            The HC-SR501 Passive Infrared sensor detects human and animal movement within a 7-meter, 120-degree cone. It's not a camera — it's privacy-respecting motion detection that simply tells you: someone is moving in this space. Combined with time-of-day rules, it becomes a powerful intrusion detection system for homes, labs, and storage areas.
          </p>

          <h3>Flame — The Critical Sensor</h3>
          <p>
            Fire is the most dangerous environmental hazard. The flame sensor uses an IR photodiode tuned to 760–1100nm — the wavelength range of open flame radiation. When flame is detected, Sentinel triggers an immediate local buzzer alert and sends a high-priority notification to your dashboard and email. Response time matters, and Sentinel provides it.
          </p>

          <h3>Rain — For the Unexpected</h3>
          <p>
            Whether it's a rooftop installation, an outdoor sensor node, or a basement prone to flooding, the raindrop detection module provides early warning of water presence. The resistive PCB trace design gives both binary (wet/dry) and analog (intensity) readings, helping you distinguish between a drizzle and a downpour.
          </p>

          <h3>Sound — Hear the Invisible</h3>
          <p>
            Many hazards announce themselves with sound before they're visible — glass breaking, machinery failing, alarms triggering. The electret condenser microphone captures ambient sound levels and flags unusually loud events. It's a crucial complement to the visual and thermal sensors.
          </p>

          <h3>Alert Logic</h3>
          <p>
            Sentinel's alert system is threshold-based and configurable. Each sensor has default thresholds that trigger warnings or critical alerts. Flame detection is always critical. Temperature, humidity, and sound use admin-configurable thresholds. Alerts cascade: local buzzer → dashboard toast → alert log → email notification. Each alert can be acknowledged and reviewed in the history.
          </p>

          <h3>Who It's For</h3>
          <p>
            Sentinel is designed for anyone who needs affordable, connected environmental monitoring: homeowners, lab managers, warehouse operators, farmers, shop owners, and caregivers. It's also an excellent educational platform for learning IoT, embedded systems, cloud computing, and full-stack web development.
          </p>

          <h3>Affordability</h3>
          <p>
            The entire bill of materials costs approximately ₹1,060 — less than a meal at a restaurant. Every component is readily available online or at local electronics shops. There are no subscriptions, no proprietary parts, and no vendor lock-in. This is open, affordable safety technology.
          </p>

          <h3>Expandability & Future Scope</h3>
          <p>
            The ESP32 has plenty of unused GPIO pins and processing headroom. Future expansions could include gas sensors (MQ-2 for smoke/LPG), air quality monitors (PM2.5), GPS modules for asset tracking, camera integration for visual verification, solar power for off-grid deployments, and mesh networking for multi-device coverage across large facilities.
          </p>
        </motion.div>
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
              <span>{item.type === 'video' ? '▶' : '📷'}</span>
              <p className="caption">{item.title}</p>
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
        <Plus size={20} strokeWidth={1.5} />
      </button>
      <div className={`accordion-content ${open ? 'open' : ''}`}>
        <p>{answer}</p>
      </div>
    </div>
  );
}

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    // In production, POST to /api/contact
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setForm({ name: '', email: '', message: '' });
  };

  return (
    <motion.form className="contact-form" onSubmit={handleSubmit} variants={fadeUp}>
      <div className="form-group">
        <label className="form-label" htmlFor="contact-name">Name</label>
        <input
          id="contact-name"
          className="form-input"
          type="text"
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Your name"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          className="form-input"
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="you@example.com"
        />
      </div>
      <div className="form-group">
        <label className="form-label" htmlFor="contact-msg">Message</label>
        <textarea
          id="contact-msg"
          className="form-input"
          rows={5}
          required
          value={form.message}
          onChange={(e) => setForm({ ...form, message: e.target.value })}
          placeholder="How can we help?"
        />
      </div>
      <button type="submit" className="btn-primary" disabled={sent}>
        {sent ? 'Sent ✓' : 'Send Message'}
      </button>
    </motion.form>
  );
}


