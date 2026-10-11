import { useEffect, useRef, useCallback } from 'react';
import mqtt from 'mqtt';
import useStore from '../store/useStore';

// Map between internal control keys and MQTT subtopics
export const TOPIC_MAP = {
  mq135: 'mq135',
  flame: 'flame',
  rain: 'rain',
  sound: 'sound',
  motion: 'motion',
  dht11: 'dht11',
  buzzer: 'buzzer',
  redLed: 'red-led',
  blueLed: 'blue-led',
};

export const REVERSE_TOPIC_MAP = {
  'mq135': 'mq135',
  'flame': 'flame',
  'rain': 'rain',
  'sound': 'sound',
  'motion': 'motion',
  'dht11': 'dht11',
  'buzzer': 'buzzer',
  'red-led': 'redLed',
  'blue-led': 'blueLed',
};

export function useMqtt() {
  const clientRef = useRef(null);
  const syncTimeoutRef = useRef(null);

  const {
    mqttBrokerUrl,
    mqttTopicPrefix,
    setMqttConnected,
    setMqttStatus,
    setDeviceOnline,
    setLastSeen,
    setReadings,
    addReadingToHistory,
    addAlert,
    sensorControls,
    setSensorControl,
    setDataSource,
    demoMode,
    setDemoMode,
    addToast,
  } = useStore();

  // Helper to publish a single control state
  const publishControl = useCallback((controlKey, isEnabled) => {
    // Always update local store immediately
    setSensorControl(controlKey, isEnabled);

    const client = clientRef.current;
    const subTopic = TOPIC_MAP[controlKey];
    if (!subTopic) return;

    const topic = `${mqttTopicPrefix}/control/${subTopic}`;
    const payload = isEnabled ? 'ON' : 'OFF';

    if (client && client.connected) {
      // Use retain: true so HiveMQ remembers the state for the ESP32
      client.publish(topic, payload, { qos: 1, retain: true }, (err) => {
        if (err) {
          console.error(`[MQTT] Publish error on ${topic}:`, err);
        } else {
          console.log(`[MQTT] Published ${payload} to ${topic} (retained)`);
        }
      });
    } else {
      console.warn(`[MQTT] Client not connected. Stored ${controlKey}=${payload} locally.`);
    }
  }, [mqttTopicPrefix, setSensorControl]);

  // Synchronize all saved control states to MQTT broker (called on connect or ESP32 birth)
  const syncAllControls = useCallback(() => {
    const client = clientRef.current;
    if (!client || !client.connected) return;

    console.log('[MQTT] Synchronizing all sensor control states with broker/ESP32...');
    const state = useStore.getState();
    Object.entries(TOPIC_MAP).forEach(([key, subTopic]) => {
      const isEnabled = !!state.sensorControls[key];
      const topic = `${mqttTopicPrefix}/control/${subTopic}`;
      const payload = isEnabled ? 'ON' : 'OFF';
      client.publish(topic, payload, { qos: 1, retain: true });
    });
    state.addToast('Sensor control states synchronized with MQTT broker', 'success');
  }, [mqttTopicPrefix]);

  useEffect(() => {
    const store = useStore.getState();
    store.setMqttStatus('connecting');

    // Connect to HiveMQ WebSocket
    console.log(`[MQTT] Connecting to ${mqttBrokerUrl}...`);
    const client = mqtt.connect(mqttBrokerUrl, {
      clientId: `envirohub-web-${Math.random().toString(16).substring(2, 10)}`,
      clean: true,
      reconnectPeriod: 4000,
      connectTimeout: 10000,
      keepalive: 30,
    });

    clientRef.current = client;

    client.on('connect', () => {
      console.log('[MQTT] Connected successfully to HiveMQ broker!');
      const s = useStore.getState();
      s.setMqttConnected(true);
      s.setMqttStatus('connected');

      // Subscribe to telemetry, device status, alerts, and remote control updates
      const topics = [
        `${mqttTopicPrefix}/telemetry`,
        `${mqttTopicPrefix}/status`,
        `${mqttTopicPrefix}/alerts`,
        `${mqttTopicPrefix}/control/+`,
      ];

      client.subscribe(topics, { qos: 1 }, (err) => {
        if (err) {
          console.error('[MQTT] Subscription failed:', err);
        } else {
          console.log('[MQTT] Subscribed to topics:', topics);
        }
      });

      // Synchronize current control states after a short pause
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        syncAllControls();
      }, 800);
    });

    client.on('reconnect', () => {
      console.log('[MQTT] Reconnecting...');
      useStore.getState().setMqttStatus('connecting');
    });

    client.on('close', () => {
      const s = useStore.getState();
      s.setMqttConnected(false);
      s.setMqttStatus('disconnected');
    });

    client.on('offline', () => {
      const s = useStore.getState();
      s.setMqttConnected(false);
      s.setMqttStatus('disconnected');
    });

    client.on('error', (err) => {
      console.error('[MQTT] Broker error:', err);
      const s = useStore.getState();
      s.setMqttConnected(false);
      s.setMqttStatus('error');
    });

    client.on('message', (topic, messageBuffer) => {
      const payloadStr = messageBuffer.toString().trim();
      const s = useStore.getState();

      // 1. ESP32 Online / Offline Status
      if (topic === `${mqttTopicPrefix}/status`) {
        const isOnline = payloadStr.toLowerCase() === 'online';
        s.setDeviceOnline(isOnline);
        if (isOnline) {
          s.setLastSeen(new Date().toISOString());
          console.log('[MQTT] ESP32 reported ONLINE! Resynchronizing sensor controls...');
          setTimeout(() => syncAllControls(), 500);
        } else {
          console.log('[MQTT] ESP32 reported OFFLINE.');
        }
        return;
      }

      // 2. Real Telemetry from ESP32
      if (topic === `${mqttTopicPrefix}/telemetry`) {
        try {
          const data = JSON.parse(payloadStr);
          const nowTs = data.ts || Math.floor(Date.now() / 1000);

          const parsedReading = {
            temp: data.temp !== undefined ? Number(data.temp) : 0,
            hum: data.hum !== undefined ? Number(data.hum) : 0,
            gas: data.gas !== undefined ? Number(data.gas) : (data.mq135 !== undefined ? Number(data.mq135) : 0),
            gasRaw: data.gasRaw !== undefined ? Number(data.gasRaw) : 0,
            flame: data.flame !== undefined ? Number(data.flame) : 0,
            flameRaw: data.flameRaw !== undefined ? Number(data.flameRaw) : 0,
            rain: data.rain !== undefined ? Number(data.rain) : 0,
            rainRaw: data.rainRaw !== undefined ? Number(data.rainRaw) : 0,
            sound: data.sound !== undefined ? Number(data.sound) : 0,
            motion: data.motion !== undefined ? Number(data.motion) : 0,
            ts: nowTs,
          };

          // Mark real ESP32 data incoming
          s.setDeviceOnline(true);
          s.setLastSeen(new Date().toISOString());
          s.setDataSource('esp32');
          if (s.demoMode) {
            s.setDemoMode(false);
            s.addToast('Real ESP32 telemetry detected! Switched to Live Hardware Mode.', 'info');
          }

          s.setReadings(parsedReading);
          s.addReadingToHistory(parsedReading);
        } catch (parseErr) {
          console.error('[MQTT] Malformed telemetry JSON:', parseErr, payloadStr);
        }
        return;
      }

      // 3. Alerts received from ESP32
      if (topic === `${mqttTopicPrefix}/alerts`) {
        try {
          const alertData = JSON.parse(payloadStr);
          s.addAlert(alertData);
        } catch {
          s.addAlert({
            type: 'warning',
            message: payloadStr,
            ts: new Date().toISOString(),
          });
        }
        return;
      }

      // 4. Remote Control State Updates (e.g. from other client or ESP32 ACK)
      if (topic.startsWith(`${mqttTopicPrefix}/control/`)) {
        const subTopic = topic.replace(`${mqttTopicPrefix}/control/`, '');
        const controlKey = REVERSE_TOPIC_MAP[subTopic];
        if (controlKey) {
          const nextState = payloadStr.toUpperCase() === 'ON';
          if (s.sensorControls[controlKey] !== nextState) {
            s.setSensorControl(controlKey, nextState);
          }
        }
      }
    });

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      if (client) {
        client.end(true);
      }
    };
  }, [mqttBrokerUrl, mqttTopicPrefix, syncAllControls]);

  return {
    publishControl,
    syncAllControls,
  };
}
export default useMqtt;
