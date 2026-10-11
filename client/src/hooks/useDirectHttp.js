import { useEffect, useRef, useCallback } from 'react';
import useStore from '../store/useStore';

export function useDirectHttp() {
  const commMode = useStore((s) => s.commMode);
  const esp32HttpUrl = useStore((s) => s.esp32HttpUrl);
  const setSensorControl = useStore((s) => s.setSensorControl);
  const pollIntervalRef = useRef(null);
  const isPollingRef = useRef(false);

  // Helper to publish a single control state to ESP32 over HTTP
  const publishControl = useCallback(async (controlKey, isEnabled) => {
    // Always update local store immediately
    setSensorControl(controlKey, isEnabled);

    const state = useStore.getState();
    if (state.commMode !== 'http') return;

    const baseUrl = state.esp32HttpUrl;
    if (!baseUrl) return;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);

      const res = await fetch(`${baseUrl}/api/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensor: controlKey,
          state: isEnabled ? 'ON' : 'OFF',
          enabled: isEnabled,
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Fallback to query parameter if server prefers query params
        await fetch(`${baseUrl}/api/control?sensor=${controlKey}&state=${isEnabled ? 'ON' : 'OFF'}`, {
          method: 'GET',
        }).catch(() => {});
      }

      state.addToast(
        `[Direct Wi-Fi] ${controlKey.toUpperCase()} set to ${isEnabled ? 'ON' : 'OFF'} (HTTP POST to ${baseUrl}/api/control)`,
        'info'
      );
    } catch (err) {
      console.warn(`[HTTP Control] Failed to reach ESP32 at ${baseUrl}:`, err.message);
      state.addToast(`[Direct Wi-Fi] Could not connect to ESP32 at ${baseUrl}`, 'warn');
    }
  }, [setSensorControl]);

  // Synchronize all saved switch states to the ESP32
  const syncAllControls = useCallback(async () => {
    const state = useStore.getState();
    if (state.commMode !== 'http') return;

    const baseUrl = state.esp32HttpUrl;
    if (!baseUrl) return;

    console.log(`[Direct Wi-Fi] Synchronizing all sensor control states with ${baseUrl}...`);
    try {
      const res = await fetch(`${baseUrl}/api/control/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ controls: state.sensorControls }),
      });
      if (res.ok) {
        state.addToast('[Direct Wi-Fi] All sensor controls synchronized with ESP32', 'success');
      }
    } catch (err) {
      console.warn('[HTTP Sync] Failed to sync controls with ESP32:', err.message);
      state.addToast('[Direct Wi-Fi] Sync failed — check ESP32 IP address', 'warn');
    }
  }, []);

  // Polling loop for sensor telemetry when in Direct Wi-Fi HTTP mode
  useEffect(() => {
    // If not in Direct Wi-Fi HTTP mode, do not poll
    if (commMode !== 'http') {
      const s = useStore.getState();
      s.setHttpConnected(false);
      s.setHttpStatus('disconnected');
      return;
    }

    const state = useStore.getState();
    state.setHttpStatus('polling');
    console.log(`[Direct Wi-Fi] Polling telemetry from ${state.esp32HttpUrl}/api/telemetry...`);

    const pollTelemetry = async () => {
      if (isPollingRef.current) return;
      isPollingRef.current = true;

      const s = useStore.getState();
      if (s.commMode !== 'http') {
        isPollingRef.current = false;
        return;
      }

      const baseUrl = s.esp32HttpUrl;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);

        const res = await fetch(`${baseUrl}/api/telemetry`, {
          method: 'GET',
          signal: controller.signal,
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          const data = await res.json();
          const nowTs = data.ts || Math.floor(Date.now() / 1000);

          const parsedReading = {
            temp: data.temp !== undefined && data.temp !== null ? Number(data.temp) : 0,
            hum: data.hum !== undefined && data.hum !== null ? Number(data.hum) : 0,
            gas: data.gas !== undefined && data.gas !== null ? Number(data.gas) : 0,
            gasRaw: data.gasRaw !== undefined && data.gasRaw !== null ? Number(data.gasRaw) : 0,
            flame: data.flame !== undefined && data.flame !== null ? Number(data.flame) : 0,
            flameRaw: data.flameRaw !== undefined && data.flameRaw !== null ? Number(data.flameRaw) : 0,
            rain: data.rain !== undefined && data.rain !== null ? Number(data.rain) : 0,
            rainRaw: data.rainRaw !== undefined && data.rainRaw !== null ? Number(data.rainRaw) : 0,
            sound: data.sound !== undefined && data.sound !== null ? Number(data.sound) : 0,
            motion: data.motion !== undefined && data.motion !== null ? Number(data.motion) : 0,
            ts: nowTs,
          };

          s.setHttpConnected(true);
          s.setHttpStatus('connected');
          s.setDeviceOnline(true);
          s.setLastSeen(new Date().toISOString());
          s.setDataSource('esp32');

          if (s.demoMode) {
            s.setDemoMode(false);
            s.addToast('Live ESP32 telemetry detected via Direct Wi-Fi HTTP Mode!', 'info');
          }

          s.setReadings(parsedReading);
          s.addReadingToHistory(parsedReading);

          // Handle any active alert sent from ESP32
          if (data.alert) {
            s.addAlert(data.alert);
          }
        } else {
          s.setHttpConnected(false);
          s.setHttpStatus('error');
        }
      } catch (err) {
        const curr = useStore.getState();
        curr.setHttpConnected(false);
        curr.setHttpStatus('error');
        if (!curr.demoMode && curr.dataSource === 'esp32') {
          curr.setDeviceOnline(false);
        }
      } finally {
        isPollingRef.current = false;
      }
    };

    // Initial poll immediately, then every 1500ms
    pollTelemetry();
    pollIntervalRef.current = setInterval(pollTelemetry, 1500);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [commMode, esp32HttpUrl]);

  return {
    publishControl,
    syncAllControls,
  };
}

export default useDirectHttp;
