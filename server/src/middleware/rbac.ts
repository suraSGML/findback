import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from './auth.js';
import { UserRole } from '../models/User.js';

export function requireRoles(...allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: `Forbidden. This operation requires an administrative role (${allowedRoles.join(', ')}). Your current role is ${req.user.role}.`,
      });
      return;
    }

    next();
  };
}

export function requireVerified(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  if (req.user.verificationStatus !== 'VERIFIED' && req.user.role !== 'ADMIN') {
    res.status(403).json({
      success: false,
      message: 'Account verification required. Your verification status is currently ' + req.user.verificationStatus,
    });
    return;
  }

  next();
}
