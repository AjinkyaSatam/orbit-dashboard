import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import pino from 'pino';

const logger = pino();

export const sendEmailAlert = async (type, message) => {
  if (!env.SMTP_HOST || !env.SMTP_PORT || !env.SMTP_USER || !env.SMTP_PASS || !env.SMTP_FROM || !env.ADMIN_EMAIL) {
    logger.warn('SMTP settings incomplete. Skipping email alert.');
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: parseInt(env.SMTP_PORT, 10),
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  const mailOptions = {
    from: env.SMTP_FROM,
    to: env.ADMIN_EMAIL,
    subject: `[Sentinel Alert] ${type.toUpperCase()} Detected`,
    text: `Sentinel Dashboard Alert\n\nType: ${type}\nMessage: ${message}\nTime: ${new Date().toISOString()}`,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Email alert sent to ${env.ADMIN_EMAIL}`);
  } catch (error) {
    logger.error(`Error sending email: ${error.message}`);
  }
};
