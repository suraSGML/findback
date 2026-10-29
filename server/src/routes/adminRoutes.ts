import { Router } from 'express';
import {
  getAdminAnalytics,
  getUsers,
  updateUserRoleAndStatus,
  getAuditLogs,
  getSystemPolicy,
  updateSystemPolicy,
} from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.use(authenticate);
router.use(requireRoles('ADMIN'));

router.get('/analytics', asyncHandler(getAdminAnalytics));
router.get('/users', asyncHandler(getUsers));
router.put('/users/:id', asyncHandler(updateUserRoleAndStatus));
router.get('/audit-logs', asyncHandler(getAuditLogs));
router.get('/policy', asyncHandler(getSystemPolicy));
router.put('/policy', asyncHandler(updateSystemPolicy));

export default router;
