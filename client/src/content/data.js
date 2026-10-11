import { Thermometer, Radar, Flame, CloudRain, Mic, House, Warehouse, Sparkles, Building, HeartHandshake } from 'lucide-react';

export const SENSORS = [
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
    desc: 'Monitors ambient temperature and relative humidity. Triggers alerts when readings exceed safe thresholds.',
  },
  {
    key: 'motion',
    name: 'Motion Detection',
    shortName: 'HC-SR501 PIR',
    icon: Radar,
    color: '#0071e3',
    principle: 'Passive Infrared (PIR)',
    range: '7m, 120° cone',
    accuracy: 'Digital trigger',
    pin: 'GPIO 27',
    desc: 'Detects human/animal movement via body heat. Ideal for intrusion detection in unoccupied spaces.',
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
    desc: 'Detects open flame or fire via near-infrared radiation. The most critical safety sensor in the system.',
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
    desc: 'Detects water/rain presence on the sensor pad. Useful for outdoor installations and leak detection.',
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
    desc: 'Captures ambient noise level. Detects loud events like glass breaking, alarms, or machinery failures.',
  },
];

export const SPECS = [
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
  ['Frontend', 'React 19 + Vite + Framer Motion'],
];

export const PIN_MAP = [
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

export const BOM = [
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

export const USE_CASES = [
  {
    key: 'home',
    title: 'Smart Home',
    desc: "Monitor living spaces for fire, motion intrusion, and humidity swings while you are away.",
    icon: House,
  },
  {
    key: 'outdoor',
    title: 'Balcony & Outdoor',
    desc: 'Instant rain and storm detection with weather-proof monitoring for terraces and open areas.',
    icon: CloudRain,
  },
  {
    key: 'storage',
    title: 'Storage & Workshop',
    desc: 'Detect heat, water leaks, and sound anomalies in garages, workshops, and facilities 24/7.',
    icon: Warehouse,
  },
  {
    key: 'lab',
    title: 'Lab & Equipment',
    desc: 'Continuous monitoring of temperature stability and unexpected movement near sensitive hardware.',
    icon: Sparkles,
  },
  {
    key: 'retail',
    title: 'Commercial Space',
    desc: 'After-hours intrusion security with motion and sound tracking plus fire safety alerting.',
    icon: Building,
  },
  {
    key: 'care',
    title: 'Assisted Living',
    desc: 'Discreet non-camera ambient monitoring for temperature comfort and movement safety.',
    icon: HeartHandshake,
  },
];

export const FAQS = [
  { q: 'What is Sentinel?', a: 'Sentinel is a compact, multi-sensor IoT safety hub built around an ESP32 microcontroller. It monitors temperature, humidity, motion, flame, rain, and sound — then sends real-time data to a cloud dashboard accessible from anywhere.' },
  { q: 'Does it need internet to work?', a: 'Yes, Sentinel requires a Wi-Fi connection to publish sensor data to the MQTT broker and display readings on the web dashboard. The ESP32 connects to your local Wi-Fi network.' },
  { q: 'How does the alert system work?', a: 'When a sensor reading crosses a predefined threshold, the system triggers a buzzer locally, sends an MQTT alert message, and displays a notification on the dashboard.' },
  { q: 'Can I monitor from my phone?', a: 'Absolutely. The web dashboard is fully responsive and works on any device with a browser.' },
  { q: 'What is the range of the PIR motion sensor?', a: 'The HC-SR501 PIR sensor detects motion up to approximately 7 meters with a 120° detection cone.' },
  { q: 'How accurate is the temperature reading?', a: 'The DHT11 sensor provides temperature readings accurate to ±2°C and humidity readings accurate to ±5% RH.' },
  { q: 'Is it safe to leave running 24/7?', a: 'Yes. The system draws minimal power and the ESP32 is designed for continuous operation.' },
  { q: 'Can I add more sensors?', a: 'Definitely. The ESP32 has multiple unused GPIO pins for expansion.' },
  { q: 'Is the data stored somewhere?', a: 'Yes, all readings are stored in MongoDB Atlas with a time-series collection optimized for IoT data.' },
  { q: 'What is Demo Mode?', a: 'Demo Mode generates simulated sensor data so you can explore the dashboard without physical hardware connected.' },
];

export const TEAM = [
  { name: '[MEMBER 1 NAME]', role: '[ROLE]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
  { name: '[MEMBER 2 NAME]', role: '[ROLE]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
  { name: '[MEMBER 3 NAME]', role: '[ROLE]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
  { name: '[MEMBER 4 NAME]', role: '[ROLE]', roll: '[ROLL NO]', bio: '[One-line bio]', photo: null },
];

export const GUIDES = [
  { name: '[GUIDE 1 NAME]', designation: '[Designation]', department: '[Department]', qualification: '[Qualification]', note: '[Short note about the guide]', photo: null },
  { name: '[GUIDE 2 NAME]', designation: '[Designation]', department: '[Department]', qualification: '[Qualification]', note: '[Short note about the guide]', photo: null },
];

export const PLANS = [
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
