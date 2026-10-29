import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { ENV } from '../config/env.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';

export async function authenticateSocketIdentity(token: unknown): Promise<string> {
  if (typeof token !== 'string' || !token) {
    throw new Error('Authentication required.');
  }

  const decoded = jwt.verify(token, ENV.JWT_SECRET) as {
    id: string;
    tokenVersion?: number;
  };
  if (!mongoose.isValidObjectId(decoded.id)) {
    throw new Error('Invalid session.');
  }
  const user = await User.findById(decoded.id).select('+tokenVersion');
  if (
    !user ||
    user.isSuspended ||
    (decoded.tokenVersion ?? 0) !== user.tokenVersion
  ) {
    throw new Error('Invalid or revoked session.');
  }

  return user._id.toString();
}

export async function isConversationParticipant(userId: string, conversationId: string): Promise<boolean> {
  if (!mongoose.isValidObjectId(conversationId)) return false;
  return Boolean(await Conversation.exists({
    _id: conversationId,
    participants: userId,
  }));
}
