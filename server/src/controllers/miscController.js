import { env } from '../config/env.js';
import { mqttClient } from '../services/mqttService.js';
import { sendEmailAlert } from '../services/mailService.js';

export const triggerBuzzer = (req, res) => {
  if (env.HAS_BUZZER !== 'true') {
    return res.status(404).json({ message: 'Buzzer not enabled' });
  }
  
  if (mqttClient && mqttClient.connected) {
    mqttClient.publish(`iot/safetybox/${env.TEAM_ID}/cmd`, JSON.stringify({ buzzer: 1 }));
    res.json({ message: 'Buzzer command sent' });
  } else {
    res.status(503).json({ message: 'MQTT not connected' });
  }
};

export const submitContact = async (req, res) => {
  const { name, email, message } = req.body;
  
  await sendEmailAlert('CONTACT', `Message from ${name} (${email}):\n${message}`);
  res.json({ message: 'Contact form submitted' });
};

export const getViewerCredentials = (req, res) => {
  if (env.PUBLIC_DASHBOARD !== 'true' && !req.user) {
    return res.status(401).json({ message: 'Not authorized' });
  }
  res.json({
    username: 'viewer',
    password: env.MQTT_VIEWER_PASSWORD
  });
};
