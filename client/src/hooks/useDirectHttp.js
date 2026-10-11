import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

/**
 * Maps the ESP32 Direct HTTP response to the dashboard data model.
 * Expected ESP32 contract fields:
 * - temperature
 * - humidity
 * - gasRaw
 * - gasAlarm
 * - rainRaw
 * - flameDetected
 * - soundDetected
 * - motionDetected
 */
export function mapEsp32SensorsToReadings(data) {
  if (!data || typeof data !== 'object') return null;

  // 1. Temperature & Humidity (DHT11)
  const rawTemp = data.temperature !== undefined ? data.temperature : data.temp;
  const rawHum = data.humidity !== undefined ? data.humidity : data.hum;
  const temp = (typeof rawTemp === 'number' && !isNaN(rawTemp)) ? Math.round(rawTemp * 10) / 10 : 0;
  const hum = (typeof rawHum === 'number' && !isNaN(rawHum)) ? Math.round(rawHum * 10) / 10 : 0;

  // 2. Gas Sensor (MQ-135) - Preserve raw ADC, flag if alarm is active
  const gasRaw = (typeof data.gasRaw === 'number' && !isNaN(data.gasRaw)) ? data.gasRaw : 0;
  const gasAlarm = Boolean(data.gasAlarm || gasRaw > 2800);
  const gas = typeof data.gas === 'number' && !isNaN(data.gas) ? data.gas : gasRaw;

  // 3. Rain Sensor - Preserve raw ADC
  const rainRaw = (typeof data.rainRaw === 'number' && !isNaN(data.rainRaw)) ? data.rainRaw : 0;
  // Active low analog surface threshold: wet when drops conduct (ADC < 2500) or explicit rain field
  const rain = (data.rainDetected || data.rain === 1 || (rainRaw > 0 && rainRaw < 2500)) ? 1 : 0;

  // 4. Flame Sensor (Infrared)
  const flameDetected = Boolean(data.flameDetected || data.flame === 1);
  const flameRaw = (typeof data.flameRaw === 'number' && !isNaN(data.flameRaw)) ? data.flameRaw : (flameDetected ? 300 : 4095);
  const flame = flameDetected ? 1 : 0;

  // 5. Sound Sensor (Acoustic)
  const soundDetected = Boolean(data.soundDetected);
  const sound = (typeof data.sound === 'number' && !isNaN(data.sound)) ? data.sound : (soundDetected ? 1 : 0);

  // 6. PIR Motion Sensor
  const motionDetected = Boolean(data.motionDetected || data.motion === 1);
  const motion = motionDetected ? 1 : 0;

  const ts = typeof data.ts === 'number' ? data.ts : Math.floor(Date.now() / 1000);

  return {
    temp,
    hum,
    gas,
    gasRaw,
    gasAlarm,
    rain,
    rainRaw,
    flame,
    flameRaw,
    flameDetected,
    sound,
    soundDetected,
    motion,
    motionDetected,
    ts,
    isRawGas: data.gas === undefined,
  };
}

export function useDirectHttp() {
  const commMode = useStore((s) => s.commMode);
  const esp32HttpUrl = useStore((s) => s.esp32HttpUrl);
  const setSensorControl = useStore((s) => s.setSensorControl);
  const pollIntervalRef = useRef(null);
  const activeAbortRef = useRef(null);
  const inFlightRef = useRef(false);

  /**
   * Sends control command to ESP32:
   * GET /api/control?name=NAME&enabled=true/false
   * Does NOT report success unless the ESP32 responds successfully.
   * Safety rule: never disables gas/flame emergency alerts.
   */
  const publishControl = useCallback(async (controlKey, isEnabled) => {
    // Safety protection: safetyOverride must NEVER be disabled
    if (controlKey === 'safetyOverride' && !isEnabled) {
      useStore.getState().addToast('Safety Override cannot be disabled: Critical alarms must remain armed.', 'warn');
      return false;
    }

    const state = useStore.getState();
    if (state.commMode !== 'http') return false;

    const baseUrl = (state.esp32HttpUrl || 'http://192.168.4.1').replace(/\/+$/, '');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      // ESP32 firmware contract: GET /api/control?name=NAME&enabled=true/false
      const url = `${baseUrl}/api/control?name=${encodeURIComponent(controlKey)}&enabled=${Boolean(isEnabled)}`;

      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'application/json, text/plain, */*' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        // Only update local store state after verified success
        setSensorControl(controlKey, isEnabled);
        state.addToast(`[Direct Wi-Fi] ${controlKey.toUpperCase()} set to ${isEnabled ? 'ON' : 'OFF'}`, 'success');
        return true;
      } else {
        const errorText = await res.text().catch(() => '');
        state.addToast(`[Direct Wi-Fi] Control rejected by ESP32 (${res.status}): ${errorText || 'Unknown error'}`, 'danger');
        return false;
      }
    } catch (err) {
      const isAbort = err.name === 'AbortError';
      const msg = isAbort ? 'Request timed out' : (err.message || 'Connection failed');
      console.warn(`[HTTP Control] Failed to send ${controlKey}=${isEnabled} to ${baseUrl}:`, msg);
      state.addToast(`[Direct Wi-Fi] Could not connect to ESP32 at ${baseUrl} (${msg})`, 'danger');
      return false;
    }
  }, [setSensorControl]);

  /**
   * Synchronize all controls to the ESP32 in Direct HTTP mode.
   */
  const syncAllControls = useCallback(async () => {
    const state = useStore.getState();
    if (state.commMode !== 'http') return;

    const baseUrl = (state.esp32HttpUrl || 'http://192.168.4.1').replace(/\/+$/, '');
    const controls = state.sensorControls;

    console.log(`[Direct Wi-Fi] Synchronizing controls with ${baseUrl}...`);
    let successCount = 0;
    const keys = Object.keys(controls).filter((k) => k !== 'safetyOverride');

    for (const key of keys) {
      const isEnabled = Boolean(controls[key]);
      try {
        const res = await fetch(`${baseUrl}/api/control?name=${encodeURIComponent(key)}&enabled=${isEnabled}`, {
          method: 'GET',
          headers: { Accept: 'application/json, text/plain, */*' },
        });
        if (res.ok) successCount++;
      } catch {
        // Continue best-effort sync
      }
    }

    if (successCount > 0) {
      state.addToast(`[Direct Wi-Fi] Synchronized ${successCount}/${keys.length} controls with ESP32`, 'success');
    } else {
      state.addToast(`[Direct Wi-Fi] Could not sync controls with ESP32 at ${baseUrl}`, 'warn');
    }
  }, []);

  /**
   * Polling loop for GET /api/sensors (every ~1.5 seconds)
   */
  useEffect(() => {
    // Only poll when in Direct Wi-Fi HTTP mode
    if (commMode !== 'http') {
      const s = useStore.getState();
      s.setHttpConnected(false);
      s.setHttpStatus('disconnected');
      return;
    }

    const state = useStore.getState();
    state.setHttpStatus('polling');
    const baseUrl = (state.esp32HttpUrl || 'http://192.168.4.1').replace(/\/+$/, '');

    const pollSensors = async () => {
      // Prevent overlapping requests
      if (inFlightRef.current) return;
      inFlightRef.current = true;

      const s = useStore.getState();
      if (s.commMode !== 'http') {
        inFlightRef.current = false;
        return;
      }

      const controller = new AbortController();
      activeAbortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        // Poll /api/sensors (primary ESP32 contract) with fallback to /api/telemetry
        let res;
        try {
          res = await fetch(`${baseUrl}/api/sensors`, {
            method: 'GET',
            headers: { Accept: 'application/json, text/plain, */*' },
            signal: controller.signal,
          });
        } catch (fetchErr) {
          // If 404 or specific route issue, check fallback
          if (fetchErr.name !== 'AbortError') {
            res = await fetch(`${baseUrl}/api/telemetry`, {
              method: 'GET',
              headers: { Accept: 'application/json, text/plain, */*' },
              signal: controller.signal,
            }).catch(() => null);
          }
          if (!res) throw fetchErr;
        }

        clearTimeout(timeoutId);

        if (res && res.ok) {
          const rawData = await res.json();
          const parsedReading = mapEsp32SensorsToReadings(rawData);

          if (parsedReading) {
            s.setHttpConnected(true);
            s.setHttpStatus('connected');
            s.setDeviceOnline(true);
            s.setLastSeen(new Date().toISOString());
            s.setDataSource('esp32');

            // If demo mode was active, switch it off cleanly
            if (s.demoMode) {
              s.setDemoMode(false);
              s.addToast('Live ESP32 telemetry detected via Direct Wi-Fi HTTP!', 'info');
            }

            s.setReadings(parsedReading);
            s.addReadingToHistory(parsedReading);

            // Handle safety emergency triggers
            if (parsedReading.flameDetected || parsedReading.flame === 1) {
              s.addAlert({
                type: 'danger',
                sensor: 'flame',
                message: 'CRITICAL FIRE HAZARD DETECTED! Flame sensor triggered.',
                value: parsedReading.flameRaw,
              });
            }
            if (parsedReading.gasAlarm) {
              s.addAlert({
                type: 'danger',
                sensor: 'gas',
                message: `HAZARDOUS GAS DETECTED! Level: ${parsedReading.gasRaw} ADC`,
                value: parsedReading.gasRaw,
              });
            }
          } else {
            console.warn('[Direct Wi-Fi] Invalid sensor payload received:', rawData);
            s.setHttpStatus('error');
          }
        } else {
          s.setHttpConnected(false);
          s.setHttpStatus('error');
          // Mark offline when real HTTP fails, but do NOT replace with fake demo data!
          if (!s.demoMode && s.dataSource === 'esp32') {
            s.setDeviceOnline(false);
          }
        }
      } catch (err) {
        const curr = useStore.getState();
        curr.setHttpConnected(false);
        curr.setHttpStatus('error');
        // If real ESP32 disconnected, mark offline; do NOT overwrite with demo data!
        if (!curr.demoMode && curr.dataSource === 'esp32') {
          curr.setDeviceOnline(false);
        }
      } finally {
        inFlightRef.current = false;
        activeAbortRef.current = null;
      }
    };

    // Run initial poll, then poll approximately every 1.5 seconds
    pollSensors();
    pollIntervalRef.current = setInterval(pollSensors, 1500);

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
        activeAbortRef.current = null;
      }
      inFlightRef.current = false;
    };
  }, [commMode, esp32HttpUrl]);

  return {
    publishControl,
    syncAllControls,
  };
}

export default useDirectHttp;
