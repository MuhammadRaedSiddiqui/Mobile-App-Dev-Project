import { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '@/utils/errors';

/** 404 for unmatched routes, emitted in the standard error envelope. */
export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found.' } });
};

/**
 * Terminal error handler. Converts AppError into its declared status/code and
 * anything unexpected into a generic 500 — internal messages are never leaked to
 * the client (NFR 8.4.4).
 */
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, error: { code: err.code, message: err.message } });
    return;
  }

  // eslint-disable-next-line no-console
  console.error('[unhandled]', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong on our end.' },
  });
};
