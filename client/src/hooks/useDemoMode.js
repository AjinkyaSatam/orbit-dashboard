import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

// Generates realistic demo sensor data
function generateDemoReading() {
  const now = Math.floor(Date.now() / 1000);
  const hour = new Date().getHours();
  
  // Simulate realistic patterns
  const baseTemp = 24 + 8 * Math.sin((hour / 24) * Math.PI); // warmer during day
  const temp = parseFloat((baseTemp + (Math.random() - 0.5) * 3).toFixed(1));
  const hum = Math.floor(55 + 20 * Math.cos((hour / 24) * Math.PI) + (Math.random() - 0.5) * 10);
  const flame = Math.random() > 0.97 ? 1 : 0; // rare flame events
  const flameRaw = flame ? Math.floor(200 + Math.random() * 500) : Math.floor(3000 + Math.random() * 1000);
  const rain = Math.random() > 0.9 ? 1 : 0;
  const rainRaw = rain ? Math.floor(500 + Math.random() * 1000) : Math.floor(3500 + Math.random() * 600);
  const sound = Math.floor(200 + Math.random() * 400 + (Math.random() > 0.95 ? 500 : 0));
  const motion = Math.random() > 0.6 ? 1 : 0;

  return { temp, hum, flame, flameRaw, rain, rainRaw, sound, motion, ts: now };
}

export function useDemoMode() {
  const demoMode = useStore((s) => s.demoMode);
  const setReadings = useStore((s) => s.setReadings);
  const addReadingToHistory = useStore((s) => s.addReadingToHistory);
  const addAlert = useStore((s) => s.addAlert);
  const setDeviceOnline = useStore((s) => s.setDeviceOnline);
  const setMqttConnected = useStore((s) => s.setMqttConnected);
  const intervalRef = useRef(null);

  const tick = useCallback(() => {
    const reading = generateDemoReading();
    setReadings(reading);
    addReadingToHistory(reading);

    // Check for alert conditions
    if (reading.flame === 1) {
      addAlert({ type: 'danger', sensor: 'flame', message: '🔥 Flame detected!', value: reading.flameRaw });
    }
    if (reading.temp > 45) {
      addAlert({ type: 'warning', sensor: 'temp', message: `⚠️ High temperature: ${reading.temp}°C`, value: reading.temp });
    }
    if (reading.rain === 1) {
      addAlert({ type: 'warning', sensor: 'rain', message: '🌧️ Rain detected', value: reading.rainRaw });
    }
    if (reading.sound > 700) {
      addAlert({ type: 'warning', sensor: 'sound', message: `🔊 Loud sound: ${reading.sound}`, value: reading.sound });
    }
  }, [setReadings, addReadingToHistory, addAlert]);

  useEffect(() => {
    if (demoMode) {
      setDeviceOnline(true);
      setMqttConnected(true);
      tick(); // immediate first reading
      intervalRef.current = setInterval(tick, 2000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [demoMode, tick, setDeviceOnline, setMqttConnected]);
}

export { generateDemoReading };
