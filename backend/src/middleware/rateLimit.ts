/**
 * In-memory rate limiters for sensitive endpoints.
 * Limits are per-IP; skipped entirely in the test environment so suites stay deterministic.
 */
import rateLimit from 'express-rate-limit';
import { config } from '@/config/env';

const skipInTest = () => config.nodeEnv === 'test';

/** Login / register — blunt force protection. */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please wait and try again.' },
  },
});

/** Report-unavailable — curb spam reporting. */
export const reportLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Too many reports from this device. Try again later.' },
  },
});

/** Image upload — curb storage abuse. */
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTest,
  message: {
    success: false,
    error: { code: 'RATE_LIMITED', message: 'Upload limit reached. Try again later.' },
  },
});
