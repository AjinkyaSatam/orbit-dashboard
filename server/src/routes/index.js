import express from 'express';
import { login, register, getMe } from '../controllers/authController.js';
import { getReadings, getLatestReading, getHealth, exportCsv } from '../controllers/readingController.js';
import { getAlerts, ackAlert } from '../controllers/alertController.js';
import { getSettings, updateSettings } from '../controllers/settingController.js';
import { triggerBuzzer, submitContact, getViewerCredentials } from '../controllers/miscController.js';
import { protect } from '../middleware/auth.js';
import { requireRole } from '../middleware/requireRole.js';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';

const router = express.Router();

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const contactLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 3 });

const authSchema = z.object({ email: z.string().email(), password: z.string().min(8) });
const contactSchema = z.object({ name: z.string().min(2), email: z.string().email(), message: z.string().min(10) });
const settingsSchema = z.object({ tempThreshold: z.number().min(0).max(100), soundThreshold: z.number().min(0).max(4095) });

// Public
router.get('/health', getHealth);
router.post('/auth/login', loginLimiter, validate(authSchema), login);
router.post('/auth/register', validate(authSchema), register);
router.post('/contact', contactLimiter, validate(contactSchema), submitContact);
router.get('/mqtt/viewer-credentials', getViewerCredentials); // Checked internally if public dashboard is enabled

// Protected
router.use(protect);
router.get('/auth/me', getMe);
router.get('/readings', getReadings);
router.get('/readings/latest', getLatestReading);
router.get('/alerts', getAlerts);
router.patch('/alerts/:id/ack', ackAlert);
router.get('/settings', getSettings);
router.get('/export/csv', exportCsv);

// Admin Only
router.use(requireRole('admin'));
router.put('/settings', validate(settingsSchema), updateSettings);
router.post('/commands/buzzer', triggerBuzzer);

export default router;
