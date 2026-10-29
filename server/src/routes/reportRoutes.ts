import { Router } from 'express';
import { submitReport, getReports, resolveReport } from '../controllers/reportController.js';
import { authenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/', authenticate, asyncHandler(submitReport));
router.get('/', authenticate, requireRoles('ADMIN'), asyncHandler(getReports));
router.put('/:id/resolve', authenticate, requireRoles('ADMIN'), asyncHandler(resolveReport));

export default router;
