import { create } from 'zustand';

export const DEFAULT_READINGS = {
  temp: 0,
  hum: 0,
  gas: 0,
  gasRaw: 0,
  flame: 0,
  flameRaw: 0,
  rain: 0,
  rainRaw: 0,
  sound: 0,
  motion: 0,
  ts: Date.now(),
};

export const DEFAULT_SENSOR_CONTROLS = {
  mq135: true,
  flame: true,
  rain: true,
  sound: true,
  motion: true,
  dht11: true,
  buzzer: false,
  redLed: false,
  blueLed: false,
  safetyOverride: true, // Gas & flame alerts remain armed regardless of sensor telemetry controls
};

const useStore = create((set, get) => ({
  // ── Theme (Dark Mode Only) ──
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},

  // ── Communication Mode ('mqtt' [Default] | 'http' [Direct Wi-Fi Demo Mode]) ──
  commMode: (typeof window !== 'undefined' && (import.meta.env.VITE_COMM_MODE || localStorage.getItem('envirohub-comm-mode'))) || 'mqtt',
  setCommMode: (mode) => {
    try {
      localStorage.setItem('envirohub-comm-mode', mode);
    } catch (_e) {
      /* ignore storage error */
    }
    set({ commMode: mode });
  },

  // ── Direct Wi-Fi HTTP Configuration & Status ──
  esp32HttpUrl: (typeof window !== 'undefined' && (import.meta.env.VITE_ESP32_HTTP_URL || localStorage.getItem('envirohub-esp32-http-url'))) || 'http://192.168.4.1',
  setEsp32HttpUrl: (url) => {
    let clean = (url || '').trim();
    if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    clean = clean.replace(/\/+$/, '');
    try {
      localStorage.setItem('envirohub-esp32-http-url', clean);
    } catch (_e) {
      /* ignore storage error */
    }
    set({ esp32HttpUrl: clean });
  },
  httpConnected: false,
  setHttpConnected: (v) => set({ httpConnected: v }),
  httpStatus: 'disconnected', // 'polling' | 'connected' | 'disconnected' | 'error'
  setHttpStatus: (v) => set({ httpStatus: v }),

  // ── MQTT / Connection Status ──
  mqttConnected: false,
  setMqttConnected: (v) => set({ mqttConnected: v }),
  mqttStatus: 'disconnected', // 'connecting' | 'connected' | 'disconnected' | 'error'
  setMqttStatus: (v) => set({ mqttStatus: v }),
  backendConnected: false,
  setBackendConnected: (v) => set({ backendConnected: v }),
  deviceOnline: false,
  setDeviceOnline: (v) => set({ deviceOnline: v }),
  lastSeen: null,
  setLastSeen: (v) => set({ lastSeen: v }),

  // ── Data Source Tracking (Real ESP32 vs Demo Simulation) ──
  // 'demo' | 'esp32'
  dataSource: 'demo',
  setDataSource: (v) => set({ dataSource: v }),

  // ── Configurable MQTT Settings ──
  mqttBrokerUrl: localStorage.getItem('envirohub-mqtt-broker') || 'wss://broker.hivemq.com:8884/mqtt',
  setMqttBrokerUrl: (url) => {
    try {
      localStorage.setItem('envirohub-mqtt-broker', url);
    } catch (_e) {
      /* ignore storage error */
    }
    set({ mqttBrokerUrl: url });
  },
  mqttTopicPrefix: localStorage.getItem('envirohub-topic-prefix') || 'iot-hub',
  setMqttTopicPrefix: (p) => {
    try {
      localStorage.setItem('envirohub-topic-prefix', p);
    } catch (_e) {
      /* ignore storage error */
    }
    set({ mqttTopicPrefix: p });
  },

  // ── Demo Mode ──
  demoMode: true,
  setDemoMode: (v) => set({ demoMode: v, dataSource: v ? 'demo' : (get().deviceOnline ? 'esp32' : 'offline') }),
  toggleDemoMode: () => {
    const next = !get().demoMode;
    set({ demoMode: next, dataSource: next ? 'demo' : (get().deviceOnline ? 'esp32' : 'offline') });
  },

  // ── Sensor Control States (Persisted & Synchronized) ──
  sensorControls: (() => {
    try {
      const saved = localStorage.getItem('envirohub-sensor-controls');
      return saved ? { ...DEFAULT_SENSOR_CONTROLS, ...JSON.parse(saved) } : DEFAULT_SENSOR_CONTROLS;
    } catch {
      return DEFAULT_SENSOR_CONTROLS;
    }
  })(),
  setSensorControl: (key, val) => {
    const next = { ...get().sensorControls, [key]: val };
    try {
      localStorage.setItem('envirohub-sensor-controls', JSON.stringify(next));
    } catch (_e) {
      /* ignore storage error */
    }
    set({ sensorControls: next });
  },
  setAllSensorControls: (newControls) => {
    try {
      localStorage.setItem('envirohub-sensor-controls', JSON.stringify(newControls));
    } catch (_e) {
      /* ignore storage error */
    }
    set({ sensorControls: newControls });
  },

  // ── Sensor Readings ──
  readings: DEFAULT_READINGS,
  setReadings: (r) => set({ readings: { ...r }, lastSeen: new Date().toISOString(), deviceOnline: true }),
  readingsHistory: [],
  addReadingToHistory: (r) =>
    set((s) => ({
      readingsHistory: [...s.readingsHistory.slice(-59), r],
    })),

  // ── Alerts ──
  alerts: [],
  addAlert: (alert) =>
    set((s) => ({
      alerts: [{ ...alert, id: Date.now(), acked: false, ts: new Date().toISOString() }, ...s.alerts].slice(0, 100),
    })),
  ackAlert: (id) =>
    set((s) => ({
      alerts: s.alerts.map((a) => (a.id === id ? { ...a, acked: true } : a)),
    })),
  clearAlerts: () => set({ alerts: [] }),

  // ── Auth ──
  token: localStorage.getItem('sentinel-token') || null,
  user: JSON.parse(localStorage.getItem('sentinel-user') || 'null'),
  setAuth: (token, user) => {
    localStorage.setItem('sentinel-token', token);
    localStorage.setItem('sentinel-user', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('sentinel-token');
    localStorage.removeItem('sentinel-user');
    set({ token: null, user: null });
  },

  // ── Toasts ──
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now();
    set((s) => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  // ── Thresholds ──
  thresholds: {
    tempHigh: 50,
    humHigh: 90,
    gasHigh: 300,
    soundHigh: 800,
  },
  setThresholds: (t) => set({ thresholds: { ...get().thresholds, ...t } }),
}));

export default useStore;
