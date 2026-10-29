import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = process.env.JWT_SECRET;
const mongoUri = process.env.MONGODB_URI;

if (isProduction && (
  !jwtSecret ||
  jwtSecret.trim().length < 32 ||
  jwtSecret === 'campusconnect_super_secret_jwt_key_2026_grad_project' ||
  jwtSecret === 'development-only-change-me-before-deploying-findback' ||
  jwtSecret === 'replace-with-a-random-secret-at-least-32-characters'
)) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters in production.');
}

if (isProduction && !mongoUri) {
  throw new Error('MONGODB_URI must be configured in production.');
}

if (isProduction && !process.env.CLIENT_URL?.trim()) {
  throw new Error('CLIENT_URL must be configured with the production frontend origin.');
}

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: mongoUri || 'mongodb://127.0.0.1:27017/findback',
  JWT_SECRET: jwtSecret || 'development-only-change-me-before-deploying-findback',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  CLIENT_URLS: (process.env.CLIENT_URL || 'http://localhost:5173')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
  TRUST_PROXY: process.env.TRUST_PROXY ? parseInt(process.env.TRUST_PROXY, 10) : false,
  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || '',
  SMTP_FROM: process.env.SMTP_FROM || '',
  UPLOAD_DIR: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
  PLATFORM_NAME: process.env.PLATFORM_NAME || 'FindBack',
  DEFAULT_COUNTRY: process.env.DEFAULT_COUNTRY || 'Ethiopia',
  DEFAULT_CITY: process.env.DEFAULT_CITY || 'Addis Ababa',
};
