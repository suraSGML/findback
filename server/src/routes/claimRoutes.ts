import { Router } from 'express';
import {
  submitClaim,
  getClaims,
  getMyClaims,
  getClaimById,
  askVerificationQuestion,
  answerVerificationQuestion,
  reviewClaim,
  confirmReturn,
  confirmReceiptByOwner,
} from '../controllers/claimController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.post('/confirm-return', authenticate, asyncHandler(confirmReturn));
router.post('/:id/confirm-receipt', authenticate, asyncHandler(confirmReceiptByOwner));
router.post('/', authenticate, asyncHandler(submitClaim));
router.get('/', authenticate, asyncHandler(getClaims));
router.get('/my-claims', authenticate, asyncHandler(getMyClaims));
router.get('/:id', authenticate, asyncHandler(getClaimById));
router.post('/:id/question', authenticate, asyncHandler(askVerificationQuestion));
router.post('/:id/answer', authenticate, asyncHandler(answerVerificationQuestion));
router.put('/:id/review', authenticate, asyncHandler(reviewClaim));

export default router;
