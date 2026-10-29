import { Router } from 'express';
import { getCategories, createCategory, updateCategory } from '../controllers/categoryController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', optionalAuthenticate, asyncHandler(getCategories));
router.post('/', authenticate, requireRoles('ADMIN'), asyncHandler(createCategory));
router.put('/:id', authenticate, requireRoles('ADMIN'), asyncHandler(updateCategory));

export default router;
