import mqtt from 'mqtt';
import pino from 'pino';
import { z } from 'zod';
import { env } from '../config/env.js';
import Reading from '../models/Reading.js';
import { evaluateAlerts, triggerOnlineAlert } from './alertService.js';
import { resetWatchdog } from './watchdog.js';

const logger = pino();
export let mqttClient = null;
export let latestReading = null;

const telemetrySchema = z.object({
  temp: z.number(),
  hum: z.number(),
  flame: z.number(),
  flameRaw: z.number().optional(),
  rain: z.number(),
  sound: z.number(),
  motion: z.number(),
  ts: z.number(),
});

let readingsBuffer = [];
let lastSaveTime = 0;

const saveDownsampledReading = async () => {
  if (readingsBuffer.length === 0) return;
  const now = Date.now();
  if (now - lastSaveTime < 10000) return; // Save one point per 10s

  const meanTemp = readingsBuffer.reduce((acc, val) => acc + val.temp, 0) / readingsBuffer.length;
  const meanHum = readingsBuffer.reduce((acc, val) => acc + val.hum, 0) / readingsBuffer.length;
  const maxSound = Math.max(...readingsBuffer.map(r => r.sound));
  const anyFlame = readingsBuffer.some(r => r.flame === 1) ? 1 : 0;
  const anyRain = readingsBuffer.some(r => r.rain === 1) ? 1 : 0;
  const anyMotion = readingsBuffer.some(r => r.motion === 1) ? 1 : 0;
  const ts = Math.floor(now / 1000);

  try {
    await Reading.create({
      temp: meanTemp,
      hum: meanHum,
      flame: anyFlame,
      rain: anyRain,
      motion: anyMotion,
      sound: maxSound,
      ts
    });
    lastSaveTime = now;
    readingsBuffer = [];
  } catch (error) {
    logger.error('Error saving downsampled reading', error);
  }
};

export const initMqtt = () => {
  mqttClient = mqtt.connect(env.MQTT_URL, {
    username: env.MQTT_USERNAME,
    password: env.MQTT_PASSWORD,
    clientId: `backend-${Math.random().toString(16).substr(2, 8)}`,
    protocol: 'mqtts',
    reconnectPeriod: 3000,
  });

  const topicPrefix = `iot/safetybox/${env.TEAM_ID}`;

  mqttClient.on('connect', () => {
    logger.info('Connected to HiveMQ');
    mqttClient.subscribe([`${topicPrefix}/telemetry`, `${topicPrefix}/status`]);
  });

  mqttClient.on('message', async (topic, message) => {
    const payload = message.toString();
    
    if (topic === `${topicPrefix}/status`) {
      if (payload === 'online') {
        triggerOnlineAlert();
        resetWatchdog();
      }
      return;
    }

    if (topic === `${topicPrefix}/telemetry`) {
      resetWatchdog();
      try {
        const parsed = JSON.parse(payload);
        const data = telemetrySchema.parse(parsed);
        
        latestReading = data;
        readingsBuffer.push(data);

        // Immediate write on flag change
        if (readingsBuffer.length > 1) {
          const prev = readingsBuffer[readingsBuffer.length - 2];
          if (prev.flame !== data.flame || prev.rain !== data.rain || prev.motion !== data.motion) {
             await Reading.create(data);
             lastSaveTime = Date.now();
             readingsBuffer = [];
          }
        }

        if (readingsBuffer.length >= 5) {
          saveDownsampledReading();
        }

        await evaluateAlerts(data, true);
      } catch (err) {
        logger.error('Invalid telemetry data format', err);
      }
    }
  });

  mqttClient.on('error', (err) => logger.error('MQTT Error:', err));
};
