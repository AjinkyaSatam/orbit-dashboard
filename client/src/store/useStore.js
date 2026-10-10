import { create } from 'zustand';

const DEFAULT_READINGS = {
  temp: 0,
  hum: 0,
  flame: 0,
  flameRaw: 0,
  rain: 0,
  rainRaw: 0,
  sound: 0,
  motion: 0,
  ts: Date.now(),
};

const useStore = create((set, get) => ({
  // ── Theme ──
  theme: localStorage.getItem('sentinel-theme') || 'light',
  toggleTheme: () => {
    const next = get().theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('sentinel-theme', next);
    document.documentElement.setAttribute('data-theme', next);
    set({ theme: next });
  },
  setTheme: (t) => {
    localStorage.setItem('sentinel-theme', t);
    document.documentElement.setAttribute('data-theme', t);
    set({ theme: t });
  },

  // ── MQTT / Connection ──
  mqttConnected: false,
  setMqttConnected: (v) => set({ mqttConnected: v }),
  backendConnected: false,
  setBackendConnected: (v) => set({ backendConnected: v }),
  deviceOnline: false,
  setDeviceOnline: (v) => set({ deviceOnline: v }),
  lastSeen: null,
  setLastSeen: (v) => set({ lastSeen: v }),

  // ── Demo Mode ──
  demoMode: true,
  setDemoMode: (v) => set({ demoMode: v }),
  toggleDemoMode: () => set((s) => ({ demoMode: !s.demoMode })),

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
    soundHigh: 800,
  },
  setThresholds: (t) => set({ thresholds: { ...get().thresholds, ...t } }),
}));

export default useStore;
