import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User, IUser } from '../models/User.js';

export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

export async function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { id: string; role: string; tokenVersion?: number };

    const user = await User.findById(decoded.id).select('+tokenVersion');
    if (!user) {
      res.status(401).json({ success: false, message: 'User account not found.' });
      return;
    }
    if ((decoded.tokenVersion ?? 0) !== user.tokenVersion) {
      res.status(401).json({ success: false, message: 'Session has been revoked. Please sign in again.' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({
        success: false,
        message: `Account is suspended. Reason: ${user.suspensionReason || 'Violation of campus community guidelines.'}`,
      });
      return;
    }

    req.user = user;
    next();
  } catch (err: any) {
    res.status(401).json({ success: false, message: 'Invalid or expired session token.' });
  }
}

export async function optionalAuthenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, ENV.JWT_SECRET) as { id: string; role: string; tokenVersion?: number };
    const user = await User.findById(decoded.id).select('+tokenVersion');
    if (user && !user.isSuspended && (decoded.tokenVersion ?? 0) === user.tokenVersion) {
      req.user = user;
    }
  } catch {
    // Token invalid or expired — silently continue as unauthenticated
  }

  next();
}
