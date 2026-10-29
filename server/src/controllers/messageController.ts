import { Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendNotification, getSocketIO } from '../services/notificationService.js';
import { z } from 'zod';
import { parsePagination } from '../utils/pagination.js';

const messageId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format.');
const messageSchema = z.object({
  conversationId: messageId.optional(),
  recipientId: messageId.optional(),
  lostReportId: messageId.optional(),
  foundReportId: messageId.optional(),
  claimId: messageId.optional(),
  content: z.string().trim().min(1).max(4000),
}).strict();
const conversationSchema = z.object({
  recipientId: messageId,
  lostReportId: messageId.optional(),
  foundReportId: messageId.optional(),
  claimId: messageId.optional(),
}).strict();

export async function getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const conversations = await Conversation.find({ participants: req.user._id })
    .populate('participants', 'name avatar city country verificationStatus reputation')
    .populate('lostReport', 'title images status city')
    .populate('foundReport', 'title images status city locationName')
    .populate({
      path: 'claim',
      populate: { path: 'foundReport', select: 'title images status city locationName' },
    })
    .sort({ lastMessageAt: -1 });

  res.json({ success: true, conversations });
}

export async function getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { conversationId } = req.params;

  if (!mongoose.isValidObjectId(conversationId)) {
    res.status(400).json({ success: false, message: 'Invalid conversation ID format.' });
    return;
  }

  const conversation = await Conversation.findById(conversationId);
  if (!conversation) {
    res.status(404).json({ success: false, message: 'Conversation not found.' });
    return;
  }

  const isMember = conversation.participants.some(
    (p) => p.toString() === req.user?._id.toString()
  );
  const isAdmin = req.user.role === 'ADMIN';

  if (!isMember && !isAdmin) {
    res.status(403).json({ success: false, message: 'Not authorized to view messages in this conversation.' });
    return;
  }

  const pagination = parsePagination(req.query.page, req.query.limit, 100);
  if (!pagination) {
    res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    return;
  }
  const [messages, total] = await Promise.all([
    Message.find({ conversation: conversationId })
    .populate('sender', 'name avatar')
    .sort({ createdAt: -1, _id: -1 })
    .skip(pagination.skip)
    .limit(pagination.limit),
    Message.countDocuments({ conversation: conversationId }),
  ]);
  messages.reverse();

  // Mark unread messages addressed to current user as read
  await Message.updateMany(
    { conversation: conversationId, recipient: req.user._id, read: false },
    { read: true, readAt: new Date() }
  );

  // Reset unread count for current user
  if (conversation.unreadCount) {
    conversation.unreadCount.set(req.user._id.toString(), 0);
    await conversation.save();
  }

  res.json({
    success: true,
    messages,
    pagination: {
      total,
      page: pagination.page,
      limit: pagination.limit,
      pages: Math.ceil(total / pagination.limit),
    },
  });
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const parsed = messageSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Message must contain 1 to 4000 characters and valid IDs.' });
    return;
  }
  const { conversationId, recipientId, lostReportId, foundReportId, claimId, content } = parsed.data;

  let conversation: any = null;
  let effectiveRecipientId = recipientId;

  // 1. If conversationId is provided, look up the existing conversation
  if (conversationId && mongoose.isValidObjectId(conversationId)) {
    conversation = await Conversation.findById(conversationId);
  }

  if (conversation) {
    // Verify membership
    const isMember = conversation.participants.some(
      (p: any) => p.toString() === req.user?._id.toString()
    );
    if (!isMember && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Not authorized for this conversation.' });
      return;
    }

    const other = conversation.participants.find(
      (p: any) => p.toString() !== req.user?._id.toString()
    );
    const otherParticipantId = other ? other.toString() : null;
    if (!otherParticipantId) {
      res.status(400).json({ success: false, message: 'Conversation has no other participant.' });
      return;
    }
    if (effectiveRecipientId && effectiveRecipientId !== otherParticipantId) {
      res.status(400).json({ success: false, message: 'Recipient must be another participant in this conversation.' });
      return;
    }
    effectiveRecipientId = otherParticipantId;
  } else {
    // 2. New conversation flow
    if (!effectiveRecipientId) {
      res.status(400).json({ success: false, message: 'Recipient ID is required for a new conversation.' });
      return;
    }

    if (effectiveRecipientId === req.user._id.toString()) {
      res.status(400).json({ success: false, message: 'Cannot start conversation with yourself.' });
      return;
    }

    // Try to find an existing thread between these two users
    let query: any = {
      participants: { $all: [req.user._id, effectiveRecipientId], $size: 2 },
    };
    if (lostReportId) query.lostReport = lostReportId;
    if (foundReportId) query.foundReport = foundReportId;

    conversation = await Conversation.findOne(query);

    if (!conversation) {
      conversation = await Conversation.create({
        participants: [req.user._id, effectiveRecipientId],
        lostReport: lostReportId || undefined,
        foundReport: foundReportId || undefined,
        claim: claimId ? new mongoose.Types.ObjectId(claimId) : undefined,
        lastMessage: content.trim(),
        lastMessageAt: new Date(),
        unreadCount: new Map([[effectiveRecipientId, 1]]),
      });
    }
  }

  // Update conversation record
  conversation.lastMessage = content.trim();
  conversation.lastMessageAt = new Date();
  if (!conversation.unreadCount) {
    conversation.unreadCount = new Map();
  }
  if (effectiveRecipientId) {
    const currentCount = conversation.unreadCount.get(effectiveRecipientId.toString()) || 0;
    conversation.unreadCount.set(effectiveRecipientId.toString(), currentCount + 1);
  }
  await conversation.save();

  // Create message record
  const message = await Message.create({
    conversation: conversation._id,
    sender: req.user._id,
    recipient: effectiveRecipientId,
    content: content.trim(),
  });

  const populatedMessage = await Message.findById(message._id).populate('sender', 'name avatar');

  // Real-time WebSocket emission
  const io = getSocketIO();
  if (io) {
    io.to(`conversation:${conversation._id}`).emit('message:new', populatedMessage);
    if (effectiveRecipientId) {
      io.to(`user:${effectiveRecipientId}`).emit('message:new', populatedMessage);
    }
  }

  // Persistent Notification
  if (effectiveRecipientId) {
    await sendNotification({
      recipientId: effectiveRecipientId,
      title: `New message from ${req.user.name}`,
      message: content.length > 60 ? `${content.substring(0, 60)}...` : content,
      type: 'MESSAGE',
      link: `/messages/${conversation._id}`,
      metadata: { conversationId: conversation._id, messageId: message._id },
    });
  }

  res.status(201).json({
    success: true,
    message: populatedMessage,
    conversationId: conversation._id,
  });
}

export async function createOrGetConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const parsed = conversationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'A valid recipient ID is required.' });
    return;
  }
  const { recipientId, lostReportId, foundReportId, claimId } = parsed.data;

  if (recipientId === req.user._id.toString()) {
    res.status(400).json({ success: false, message: 'Cannot start conversation with yourself.' });
    return;
  }

  let query: any = {
    participants: { $all: [req.user._id, recipientId], $size: 2 },
  };
  if (lostReportId) query.lostReport = lostReportId;
  if (foundReportId) query.foundReport = foundReportId;

  let conversation = await Conversation.findOne(query);

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [req.user._id, recipientId],
      lostReport: lostReportId || undefined,
      foundReport: foundReportId || undefined,
      claim: claimId ? new mongoose.Types.ObjectId(claimId) : undefined,
      lastMessage: '',
      lastMessageAt: new Date(),
      unreadCount: new Map(),
    });
  } else if (claimId && !conversation.claim) {
    conversation.claim = new mongoose.Types.ObjectId(claimId);
    await conversation.save();
  }

  res.json({
    success: true,
    conversationId: conversation._id,
  });
}
