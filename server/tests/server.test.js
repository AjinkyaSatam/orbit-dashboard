import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import express from 'express';
import mongoose from 'mongoose';
import apiRoutes from '../src/routes/index.js';
import { env } from '../src/config/env.js';

// Setup basic app for testing routes (mocking DB and MQTT as needed)
const app = express();
app.use(express.json());
app.use('/api', apiRoutes);

// Detailed tests would require a test DB setup. For this Phase, we add structural tests.
describe('API Endpoints', () => {
  it('GET /api/health should return health status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('uptime');
    expect(res.body).toHaveProperty('device');
  });

  it('GET /api/mqtt/viewer-credentials should block unauthorized if not public', async () => {
    const res = await request(app).get('/api/mqtt/viewer-credentials');
    if (env.PUBLIC_DASHBOARD !== 'true') {
      expect(res.statusCode).toBe(401);
    } else {
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('username', 'viewer');
    }
  });

  it('POST /api/auth/register fails with validation error for short password', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@test.com', password: '123' });
    expect(res.statusCode).toBe(400); // Zod validation fails
  });
});
