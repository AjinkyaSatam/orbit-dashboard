import mqtt from 'mqtt';
import dotenv from 'dotenv';
dotenv.config();

const client = mqtt.connect(process.env.MQTT_URL, {
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: 'mqtts',
  clientId: 'simulator-device',
});

const teamId = process.env.TEAM_ID || 'TEAM01';
const prefix = `iot/safetybox/${teamId}`;

client.on('connect', () => {
  console.log('Simulator connected to MQTT');
  client.publish(`${prefix}/status`, 'online', { retain: true });

  setInterval(() => {
    const payload = {
      temp: 20 + Math.random() * 20,
      hum: 40 + Math.random() * 40,
      flame: Math.random() > 0.95 ? 1 : 0,
      flameRaw: 3000 + Math.random() * 500,
      rain: Math.random() > 0.95 ? 1 : 0,
      sound: 200 + Math.random() * 800,
      motion: Math.random() > 0.8 ? 1 : 0,
      ts: Math.floor(Date.now() / 1000)
    };
    client.publish(`${prefix}/telemetry`, JSON.stringify(payload));
    console.log('Published telemetry:', payload);
  }, 2000);
});

process.on('SIGINT', () => {
  client.publish(`${prefix}/status`, 'offline', { retain: true });
  client.end();
  process.exit();
});
