import { Router } from 'express';
import { getCampusLocations, createCampusLocation, updateCampusLocation } from '../controllers/locationController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { requireRoles } from '../middleware/rbac.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/', optionalAuthenticate, asyncHandler(getCampusLocations));
router.post('/', authenticate, requireRoles('ADMIN'), asyncHandler(createCampusLocation));
router.put('/:id', authenticate, requireRoles('ADMIN'), asyncHandler(updateCampusLocation));

export default router;
