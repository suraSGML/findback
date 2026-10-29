import { Response } from 'express';
import { User } from '../models/User.js';
import { LostReport } from '../models/LostReport.js';
import { FoundReport } from '../models/FoundReport.js';
import { LostFoundMatch } from '../models/LostFoundMatch.js';
import { Claim } from '../models/Claim.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { Report } from '../models/Report.js';
import { AuditLog } from '../models/AuditLog.js';
import { SystemPolicy } from '../models/SystemPolicy.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';
import { z } from 'zod';
import { parsePagination } from '../utils/pagination.js';

export async function getAdminAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const [
    totalUsers,
    verifiedUsers,
    activeLost,
    activeFound,
    totalMatches,
    returnedItems,
    pendingClaims,
    pendingReports,
    suspendedUsers,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ verificationStatus: 'VERIFIED' }),
    LostReport.countDocuments({ status: { $in: ['ACTIVE', 'OPEN', 'POTENTIAL_MATCH', 'POSSIBLE_MATCH'] } }),
    FoundReport.countDocuments({ status: { $in: ['AVAILABLE_FOR_CLAIM', 'REPORTED', 'UNDER_REVIEW', 'POTENTIAL_MATCH'] } }),
    LostFoundMatch.countDocuments({ matchScore: { $gte: 50 } }),
    ReturnRecord.countDocuments({ ownerConfirmed: true }),
    Claim.countDocuments({ status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED'] } }),
    Report.countDocuments({ status: 'PENDING' }),
    User.countDocuments({ isSuspended: true }),
  ]);

  const totalResolvedLost = await LostReport.countDocuments({ status: 'RETURNED' });

  res.json({
    success: true,
    analytics: {
      totalUsers,
      verifiedUsers,
      activeLost,
      activeFound,
      totalMatches,
      returnedItems,
      pendingClaims,
      pendingReports,
      suspendedUsers,
      recoveryRate: activeLost + returnedItems > 0
        ? Math.round((returnedItems / (activeLost + returnedItems)) * 100)
        : 100,
    },
  });
}

export async function getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { search, role, verificationStatus, isSuspended, page, limit } = req.query;
  const pagination = parsePagination(page, limit, 20);
  if (!pagination) {
    res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    return;
  }

  const query: any = {};
  if (role) {
    const parsedRole = z.enum(['USER', 'ADMIN']).safeParse(role);
    if (!parsedRole.success) {
      res.status(400).json({ success: false, message: 'Invalid role filter.' });
      return;
    }
    query.role = parsedRole.data;
  }
  if (verificationStatus) {
    const parsedStatus = z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']).safeParse(verificationStatus);
    if (!parsedStatus.success) {
      res.status(400).json({ success: false, message: 'Invalid verification status filter.' });
      return;
    }
    query.verificationStatus = parsedStatus.data;
  }
  if (isSuspended !== undefined) query.isSuspended = isSuspended === 'true';

  if (search) {
    if (typeof search !== 'string' || search.length > 120) {
      res.status(400).json({ success: false, message: 'Search must be 120 characters or fewer.' });
      return;
    }
    const regex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [{ name: regex }, { email: regex }, { city: regex }, { phone: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1, _id: -1 }).skip(pagination.skip).limit(pagination.limit),
    User.countDocuments(query),
  ]);

  res.json({
    success: true,
    users: users.map((u) => u.toSafeObject()),
    pagination: { total, page: pagination.page, limit: pagination.limit, pages: Math.ceil(total / pagination.limit) },
  });
}

export async function updateUserRoleAndStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator credentials required.' });
    return;
  }

  const { id } = req.params;
  const parsed = z.object({
    role: z.enum(['USER', 'ADMIN']).optional(),
    verificationStatus: z.enum(['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']).optional(),
    isSuspended: z.boolean().optional(),
    suspensionReason: z.string().trim().max(1000).optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success || Object.keys(parsed.data || {}).length === 0) {
    res.status(400).json({ success: false, message: 'Invalid or empty user permission update.' });
    return;
  }
  const { role, verificationStatus, isSuspended, suspensionReason } = parsed.data;

  const targetUser = await User.findById(id);
  if (!targetUser) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  // Prevent admin from de-admining or suspending themselves
  if (targetUser._id.toString() === req.user._id.toString() && isSuspended === true) {
    res.status(400).json({ success: false, message: 'You cannot suspend your own administrator account.' });
    return;
  }

  const previousState = {
    role: targetUser.role,
    verificationStatus: targetUser.verificationStatus,
    isSuspended: targetUser.isSuspended,
    suspensionReason: targetUser.suspensionReason,
  };

  if (role && (role === 'USER' || role === 'ADMIN')) {
    targetUser.role = role;
  }
  if (verificationStatus) targetUser.verificationStatus = verificationStatus;
  if (isSuspended !== undefined) targetUser.isSuspended = isSuspended;
  if (suspensionReason !== undefined) targetUser.suspensionReason = suspensionReason;

  await targetUser.save();

  await logAudit({
    actorId: req.user._id,
    action: 'USER_ACCESS_MODIFIED',
    entityType: 'User',
    entityId: targetUser._id,
    previousState,
    newState: {
      role: targetUser.role,
      verificationStatus: targetUser.verificationStatus,
      isSuspended: targetUser.isSuspended,
      suspensionReason: targetUser.suspensionReason,
    },
    notes: `Administrator modified access permissions for ${targetUser.email}`,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: 'User permissions updated successfully.',
    user: targetUser.toSafeObject(),
  });
}

export async function getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { action, entityType, page, limit } = req.query;
  const pagination = parsePagination(page, limit, 30);
  if (!pagination) {
    res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    return;
  }

  const query: any = {};
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('actor', 'name email role')
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    AuditLog.countDocuments(query),
  ]);

  res.json({
    success: true,
    logs,
    pagination: { total, page: pagination.page, limit: pagination.limit, pages: Math.ceil(total / pagination.limit) },
  });
}

export async function getSystemPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
  let policy = await SystemPolicy.findOne();
  if (!policy) {
    policy = await SystemPolicy.create({});
  }
  res.json({ success: true, policy });
}

export async function updateSystemPolicy(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator credentials required.' });
    return;
  }

  const parsed = z.object({
    platformName: z.string().trim().min(2).max(100).optional(),
    prohibitedKeywords: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    prohibitedCategories: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
    matchWeights: z.object({
      category: z.number().min(0).max(100),
      location: z.number().min(0).max(100),
      date: z.number().min(0).max(100),
      time: z.number().min(0).max(100),
      color: z.number().min(0).max(100),
      brand: z.number().min(0).max(100),
      description: z.number().min(0).max(100),
    }).strict().optional(),
    meetingSafetyTips: z.array(z.string().trim().min(1).max(500)).max(50).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, 'At least one policy field is required.').safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid platform policy data.' });
    return;
  }
  const {
    platformName,
    prohibitedKeywords,
    prohibitedCategories,
    matchWeights,
    meetingSafetyTips,
  } = parsed.data;

  let policy = await SystemPolicy.findOne();
  if (!policy) {
    policy = new SystemPolicy();
  }

  const previousState = policy.toObject();

  if (platformName) policy.platformName = platformName;
  if (prohibitedKeywords) policy.prohibitedKeywords = prohibitedKeywords;
  if (prohibitedCategories) policy.prohibitedCategories = prohibitedCategories;
  if (matchWeights) policy.matchWeights = matchWeights;
  if (meetingSafetyTips) policy.meetingSafetyTips = meetingSafetyTips;

  await policy.save();

  await logAudit({
    actorId: req.user._id,
    action: 'SYSTEM_POLICY_UPDATED',
    entityType: 'SystemPolicy',
    entityId: policy._id,
    previousState,
    newState: policy.toObject(),
    notes: 'FindBack platform policies and matching weights updated by admin.',
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Platform policies updated successfully.', policy });
}
