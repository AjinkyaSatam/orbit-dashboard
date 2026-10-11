import Alert from '../models/Alert.js';
import Setting from '../models/Setting.js';
import pino from 'pino';
import { sendEmailAlert } from './mailService.js';
import { mqttClient } from './mqttService.js';
import { env } from '../config/env.js';

const logger = pino();
const COOLDOWN_MS = 30000;
const lastAlertTimes = {
  flame: 0,
  rain: 0,
  sound: 0,
  temp: 0,
  motion: 0,
  offline: 0,
  online: 0,
};

export const evaluateAlerts = async (reading, isOnline = true) => {
  const now = Date.now();
  const settings = await Setting.findOne({ singletonKey: 'CONFIG' });
  const config = settings || { tempThreshold: 50, soundThreshold: 2000 };

  const trigger = async (type, message) => {
    if (now - lastAlertTimes[type] < COOLDOWN_MS) return;
    lastAlertTimes[type] = now;
    
    logger.warn(`ALERT: ${type} - ${message}`);
    
    const alert = await Alert.create({ type, message, ts: Math.floor(now / 1000) });
    
    if (mqttClient && mqttClient.connected) {
      mqttClient.publish(`iot/safetybox/${env.TEAM_ID}/alert`, JSON.stringify(alert));
    }
    
    await sendEmailAlert(type, message);
  };

  if (!isOnline) {
    await trigger('offline', 'Device has gone offline.');
    return;
  }
  
  if (reading.temp > config.tempThreshold) await trigger('temp', `High temperature: ${reading.temp}°C`);
  if (reading.sound > config.soundThreshold) await trigger('sound', `Loud sound detected: ${reading.sound}`);
  if (reading.flame === 1) await trigger('flame', 'Flame detected!');
  if (reading.rain === 1) await trigger('rain', 'Rain detected!');
  if (reading.motion === 1) await trigger('motion', 'Motion detected!');
};

export const triggerOnlineAlert = async () => {
  const now = Date.now();
  if (now - lastAlertTimes['online'] < COOLDOWN_MS) return;
  lastAlertTimes['online'] = now;
  
  logger.info(`ALERT: online - Device is online.`);
  const alert = await Alert.create({ type: 'online', message: 'Device is back online.', ts: Math.floor(now / 1000) });
  
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(`iot/safetybox/${env.TEAM_ID}/alert`, JSON.stringify(alert));
  }
};
