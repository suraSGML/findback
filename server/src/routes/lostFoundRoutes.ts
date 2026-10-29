import { Router } from 'express';
import {
  createLostReport,
  createFoundReport,
  searchLostReports,
  searchFoundReports,
  getLostReportById,
  getFoundReportById,
  updateLostReport,
  updateFoundReport,
  getMatches,
  updateMatchStatus,
  transferCustodyToCustodian,
} from '../controllers/lostFoundController.js';
import { authenticate, optionalAuthenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/lost', optionalAuthenticate, asyncHandler(searchLostReports));
router.post('/lost', authenticate, asyncHandler(createLostReport));
router.get('/lost/:id', optionalAuthenticate, asyncHandler(getLostReportById));
router.put('/lost/:id', authenticate, asyncHandler(updateLostReport));

router.get('/found', optionalAuthenticate, asyncHandler(searchFoundReports));
router.post('/found', authenticate, asyncHandler(createFoundReport));
router.get('/found/:id', optionalAuthenticate, asyncHandler(getFoundReportById));
router.put('/found/:id', authenticate, asyncHandler(updateFoundReport));

router.get('/matches', authenticate, asyncHandler(getMatches));
router.put('/matches/:id', authenticate, asyncHandler(updateMatchStatus));

router.post('/found/:id/custody', authenticate, asyncHandler(transferCustodyToCustodian));

export default router;
