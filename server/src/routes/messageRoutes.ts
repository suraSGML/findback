import { Router } from 'express';
import {
  getConversations,
  getMessages,
  sendMessage,
  createOrGetConversation,
} from '../controllers/messageController.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';

const router = Router();

router.get('/conversations', authenticate, asyncHandler(getConversations));
router.post('/start', authenticate, asyncHandler(createOrGetConversation));
router.get('/:conversationId', authenticate, asyncHandler(getMessages));
router.post('/', authenticate, asyncHandler(sendMessage));

export default router;
