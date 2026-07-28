/**
 * Morgan token that redacts Authorization headers so bearer tokens never hit logs.
 */
import morgan from 'morgan';

morgan.token('auth-safe', (req) => {
  const raw = req.headers.authorization;
  if (!raw) return '-';
  return raw.startsWith('Bearer ') ? 'Bearer [REDACTED]' : '[REDACTED]';
});

/** Dev-friendly format with redacted Authorization. */
export const accessLogFormat = ':method :url :status :res[content-length] - :response-time ms auth=:auth-safe';
