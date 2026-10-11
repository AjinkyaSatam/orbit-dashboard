import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

// Generates realistic simulated sensor data
function generateDemoReading(currentReadings = {}, sensorControls = {}) {
  const now = Math.floor(Date.now() / 1000);
  const hour = new Date().getHours();

  // Base patterns
  const baseTemp = 24 + 8 * Math.sin((hour / 24) * Math.PI);
  const tempVal = parseFloat((baseTemp + (Math.random() - 0.5) * 2).toFixed(1));
  const humVal = Math.floor(55 + 20 * Math.cos((hour / 24) * Math.PI) + (Math.random() - 0.5) * 8);

  // Gas / Air quality simulation (ppm)
  const gasVal = Math.floor(120 + Math.random() * 40 + (Math.random() > 0.96 ? 260 : 0));
  const gasRawVal = Math.floor(gasVal * 3.5 + (Math.random() - 0.5) * 30);

  // Flame simulation
  const flameVal = Math.random() > 0.98 ? 1 : 0;
  const flameRawVal = flameVal ? Math.floor(250 + Math.random() * 300) : Math.floor(3200 + Math.random() * 600);

  // Rain simulation
  const rainVal = Math.random() > 0.92 ? 1 : 0;
  const rainRawVal = rainVal ? Math.floor(600 + Math.random() * 700) : Math.floor(3600 + Math.random() * 400);

  // Sound simulation
  const soundVal = Math.floor(180 + Math.random() * 350 + (Math.random() > 0.95 ? 450 : 0));

  // Motion simulation
  const motionVal = Math.random() > 0.7 ? 1 : 0;

  // Apply sensor ON/OFF control filter:
  // If a sensor is disabled, it does not update normal sensor readings
  return {
    temp: sensorControls.dht11 !== false ? tempVal : (currentReadings.temp ?? 0),
    hum: sensorControls.dht11 !== false ? humVal : (currentReadings.hum ?? 0),
    gas: sensorControls.mq135 !== false ? gasVal : 0,
    gasRaw: sensorControls.mq135 !== false ? gasRawVal : 0,
    flame: (sensorControls.flame !== false || sensorControls.safetyOverride) ? flameVal : 0,
    flameRaw: (sensorControls.flame !== false || sensorControls.safetyOverride) ? flameRawVal : 4095,
    rain: sensorControls.rain !== false ? rainVal : 0,
    rainRaw: sensorControls.rain !== false ? rainRawVal : 4095,
    sound: sensorControls.sound !== false ? soundVal : 0,
    motion: sensorControls.motion !== false ? motionVal : 0,
    ts: now,
  };
}

export function useDemoMode() {
  const demoMode = useStore((s) => s.demoMode);
  const dataSource = useStore((s) => s.dataSource);

  useEffect(() => {
    // Only run simulated demo if demoMode is true and not streaming real ESP32 data
    if (!demoMode || dataSource === 'esp32') return;

    const { setDeviceOnline } = useStore.getState();
    setDeviceOnline(true);

    const runTick = () => {
      const state = useStore.getState();
      // Guard against mode switch between timer ticks
      if (!state.demoMode || state.dataSource === 'esp32') return;

      const reading = generateDemoReading(state.readings, state.sensorControls);
      state.setReadings(reading);
      state.addReadingToHistory(reading);

      // Alerts - Respect sensor controls unless safetyOverride is enabled
      const canAlertFlame = state.sensorControls.flame !== false || state.sensorControls.safetyOverride;
      if (canAlertFlame && reading.flame === 1) {
        state.addAlert({
          type: 'danger',
          sensor: 'flame',
          message: 'FLAME DETECTED! Emergency sensor triggered.',
          value: reading.flameRaw,
        });
      }

      const canAlertGas = state.sensorControls.mq135 !== false || state.sensorControls.safetyOverride;
      if (canAlertGas && reading.gas > 300) {
        state.addAlert({
          type: 'danger',
          sensor: 'gas',
          message: `HAZARDOUS GAS DETECTED! Level: ${reading.gas} ppm`,
          value: reading.gas,
        });
      }

      if (state.sensorControls.dht11 !== false && reading.temp > 45) {
        state.addAlert({
          type: 'warning',
          sensor: 'temp',
          message: `High temperature: ${reading.temp}°C`,
          value: reading.temp,
        });
      }

      if (state.sensorControls.rain !== false && reading.rain === 1) {
        state.addAlert({
          type: 'warning',
          sensor: 'rain',
          message: 'Rain / Precipitation detected on surface',
          value: reading.rainRaw,
        });
      }

      if (state.sensorControls.sound !== false && reading.sound > 700) {
        state.addAlert({
          type: 'warning',
          sensor: 'sound',
          message: `High noise anomaly detected: ${reading.sound}`,
          value: reading.sound,
        });
      }

      if (state.sensorControls.motion !== false && reading.motion === 1 && Math.random() > 0.85) {
        state.addAlert({
          type: 'info',
          sensor: 'motion',
          message: 'PIR motion activity registered',
          value: 1,
        });
      }
    };

    // Run first tick after a small delay to avoid clashing with React mounting
    const initialTimer = setTimeout(runTick, 150);
    const interval = setInterval(runTick, 2000);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [demoMode, dataSource]);
}

export { generateDemoReading };
