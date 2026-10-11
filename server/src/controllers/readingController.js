import Reading from '../models/Reading.js';
import { latestReading, mqttClient } from '../services/mqttService.js';
import { getDeviceStatus } from '../services/watchdog.js';
import mongoose from 'mongoose';
import { env } from '../config/env.js';

export const getReadings = async (req, res) => {
  const { from, to, bucket = '10s' } = req.query;
  const fromTime = from ? parseInt(from) : Math.floor(Date.now() / 1000) - 86400;
  const toTime = to ? parseInt(to) : Math.floor(Date.now() / 1000);
  
  // Grouping logic based on bucket size. This is simplified for limit.
  const readings = await Reading.find({ ts: { $gte: fromTime, $lte: toTime } })
    .sort({ ts: -1 })
    .limit(2000);
  
  res.json(readings);
};

export const getLatestReading = async (req, res) => {
  res.json(latestReading || { message: 'No reading yet' });
};

export const getHealth = async (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  const mqttStatus = mqttClient && mqttClient.connected ? 'connected' : 'disconnected';
  const lastAge = latestReading ? Math.floor(Date.now() / 1000) - latestReading.ts : null;
  
  res.json({
    uptime: process.uptime(),
    db: dbStatus,
    mqtt: mqttStatus,
    device: getDeviceStatus() ? 'online' : 'offline',
    lastTelemetryAge: lastAge
  });
};

export const exportCsv = async (req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="readings.csv"');
  res.write('ts,temp,hum,flame,rain,motion,sound\n');
  
  const cursor = Reading.find().sort({ ts: -1 }).limit(10000).cursor();
  for await (const doc of cursor) {
    res.write(`${doc.ts},${doc.temp},${doc.hum},${doc.flame},${doc.rain},${doc.motion},${doc.sound}\n`);
  }
  res.end();
};
