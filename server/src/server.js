import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { connectDB } from './config/db.js';
import { initMqtt, mqttClient } from './services/mqttService.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';
import User from './models/User.js';
import pino from 'pino';

const logger = pino();
const app = express();

app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN }));
app.use(express.json());

app.use('/api', apiRoutes);
app.use(errorHandler);

const startServer = async () => {
  await connectDB();
  initMqtt();

  // Seed default admin user
  const adminExists = await User.findOne({ email: env.ADMIN_EMAIL });
  if (!adminExists) {
    await User.create({ email: env.ADMIN_EMAIL, password: env.ADMIN_PASSWORD, role: 'admin' });
    logger.info('Default admin user created');
  }

  const server = app.listen(env.PORT, () => {
    logger.info(`Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
  });

  const shutdown = () => {
    logger.info('Shutting down gracefully...');
    server.close(() => {
      if (mqttClient) mqttClient.end();
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

startServer();
