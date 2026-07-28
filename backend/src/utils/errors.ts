/** Standardized application error carrying an API error code and HTTP status. */
export class AppError extends Error {
  code: string;
  status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
  }
}

export const Errors = {
  unauthorized: () => new AppError('UNAUTHORIZED', 'Authentication is required.', 401),
  invalidCredentials: () =>
    new AppError('INVALID_CREDENTIALS', 'That email and password don’t match.', 401),
  forbidden: (msg = 'You don’t have permission to do that.') => new AppError('FORBIDDEN', msg, 403),
  notFound: (msg = 'Resource not found.') => new AppError('NOT_FOUND', msg, 404),
  validation: (msg: string) => new AppError('VALIDATION_ERROR', msg, 422),
  conflict: (msg: string) => new AppError('CONFLICT', msg, 409),
};
