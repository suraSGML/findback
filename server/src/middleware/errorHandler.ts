import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import multer from 'multer';

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('[Error Middleware]', err);

  if (err instanceof multer.MulterError) {
    res.status(400).json({
      success: false,
      message: err.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be 5 MB or smaller.'
        : 'Upload up to 5 images per request.',
    });
    return;
  }

  if (err.statusCode === 400 && typeof err.message === 'string') {
    res.status(400).json({ success: false, message: err.message });
    return;
  }

  if (err instanceof ZodError) {
    const formattedErrors = err.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));
    res.status(400).json({
      success: false,
      message: 'Validation failed on submitted request data.',
      errors: formattedErrors,
    });
    return;
  }

  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: err.message,
      errors: err.errors,
    });
    return;
  }

  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      message: `Invalid ID format for ${err.path || 'resource'}.`,
    });
    return;
  }

  if (err.code === 11000) {
    const duplicateKey = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      success: false,
      message: `An entity with this ${duplicateKey} already exists.`,
    });
    return;
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication credentials.',
    });
    return;
  }

  const statusCode = err.statusCode || 500;
  const userSafeMessage =
    statusCode === 500
      ? 'An unexpected error occurred while processing your campus request. Please try again shortly.'
      : err.message;

  res.status(statusCode).json({
    success: false,
    message: userSafeMessage,
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
