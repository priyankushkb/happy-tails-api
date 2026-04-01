import { NextFunction, Request, Response } from 'express';
import { ENV } from './env';

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const message =
    error instanceof Error ? error.message : 'Internal server error';

  if (ENV.NODE_ENV !== 'production') {
    console.error(error);
  } else {
    console.error(message);
  }

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message:
        ENV.NODE_ENV === 'production'
          ? 'Something went wrong.'
          : message,
    },
  });
}