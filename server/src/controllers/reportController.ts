import { Response } from 'express';
import { Report } from '../models/Report.js';
import { LostReport } from '../models/LostReport.js';
import { FoundReport } from '../models/FoundReport.js';
import { User } from '../models/User.js';
import { Claim } from '../models/Claim.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditLogger.js';
import { parsePagination } from '../utils/pagination.js';
import { z } from 'zod';

export async function submitReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const parsed = z.object({
    targetType: z.enum(['LOST_REPORT', 'FOUND_REPORT', 'USER', 'CLAIM', 'LISTING']),
    targetId: z.string().regex(/^[a-f\d]{24}$/i),
    reason: z.string().trim().min(3).max(300),
    details: z.string().trim().max(1000).optional(),
    evidenceImages: z.array(z.string().trim().min(1).max(2048)).max(5).optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid abuse report data.' });
    return;
  }
  const { targetType, targetId, reason, details, evidenceImages } = parsed.data;

  const report = await Report.create({
    reporter: req.user._id,
    module: 'LOST_AND_FOUND',
    targetType,
    targetId,
    reason: reason.trim(),
    details: details || '',
    evidenceImages: evidenceImages || [],
    status: 'PENDING',
  });

  const admins = await User.find({ role: 'ADMIN', isSuspended: false }).select('_id');
  await Promise.all(admins.map((admin) => sendNotification({
    recipientId: admin._id,
    title: 'New community safety report',
    message: `A ${targetType.toLowerCase().replace(/_/g, ' ')} was reported for moderation.`,
    type: 'MODERATION',
    link: '/dashboard/admin?tab=reports',
    metadata: { reportId: report._id },
  })));

  await logAudit({
    actorId: req.user._id,
    action: 'REPORT_SUBMITTED',
    entityType: 'Report',
    entityId: report._id,
    notes: `Abuse report filed for ${targetType} #${targetId}. Reason: ${reason}`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'Report submitted to the administrator moderation queue for review.',
    report,
  });
}

export async function getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator access required.' });
    return;
  }

  const { status, targetType, page, limit } = req.query;
  const pagination = parsePagination(page, limit, 25);
  if (!pagination) {
    res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    return;
  }
  const query: any = {};
  if (status) {
    const parsedStatus = z.enum(['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']).safeParse(status);
    if (!parsedStatus.success) {
      res.status(400).json({ success: false, message: 'Invalid report status filter.' });
      return;
    }
    query.status = parsedStatus.data;
  }
  if (targetType) {
    const parsedType = z.enum(['LOST_REPORT', 'FOUND_REPORT', 'USER', 'CLAIM', 'LISTING']).safeParse(targetType);
    if (!parsedType.success) {
      res.status(400).json({ success: false, message: 'Invalid report target filter.' });
      return;
    }
    query.targetType = parsedType.data;
  }

  const [reports, total] = await Promise.all([
    Report.find(query)
      .populate('reporter', 'name avatar email city country')
      .populate('resolvedBy', 'name role')
      .sort({ createdAt: -1, _id: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit),
    Report.countDocuments(query),
  ]);

  const reportsWithTargets = await Promise.all(reports.map(async (report) => {
    let target: Record<string, unknown> | null = null;

    if (report.targetType === 'LOST_REPORT') {
      const lostReport = await LostReport.findById(report.targetId)
        .select('title status city locationName reporter')
        .populate('reporter', 'name');
      if (lostReport) {
        target = {
          title: lostReport.title,
          status: lostReport.status,
          city: lostReport.city,
          locationName: lostReport.locationName,
          ownerName: (lostReport.reporter as any)?.name,
        };
      }
    } else if (report.targetType === 'FOUND_REPORT') {
      const foundReport = await FoundReport.findById(report.targetId)
        .select('title status city locationName finder')
        .populate('finder', 'name');
      if (foundReport) {
        target = {
          title: foundReport.title,
          status: foundReport.status,
          city: foundReport.city,
          locationName: foundReport.locationName,
          ownerName: (foundReport.finder as any)?.name,
        };
      }
    } else if (report.targetType === 'CLAIM') {
      const claim = await Claim.findById(report.targetId)
        .select('status foundReport claimant')
        .populate('foundReport', 'title')
        .populate('claimant', 'name');
      if (claim) {
        target = {
          title: (claim.foundReport as any)?.title || 'Ownership claim',
          status: claim.status,
          ownerName: (claim.claimant as any)?.name,
        };
      }
    } else if (report.targetType === 'USER') {
      const targetUser = await User.findById(report.targetId).select('name email role isSuspended');
      if (targetUser) {
        target = {
          title: targetUser.name,
          status: targetUser.isSuspended ? 'SUSPENDED' : 'ACTIVE',
          ownerName: targetUser.email,
        };
      }
    }

    return { ...report.toObject(), target };
  }));

  res.json({
    success: true,
    reports: reportsWithTargets,
    pagination: { total, page: pagination.page, limit: pagination.limit, pages: Math.ceil(total / pagination.limit) },
  });
}

export async function resolveReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator access required.' });
    return;
  }

  const { id } = req.params;
  const parsed = z.object({
    actionTaken: z.enum([
      'REMOVE_REPORT', 'REMOVE_LISTING', 'REJECT_CLAIM', 'SUSPEND_USER', 'WARN_USER', 'NO_ACTION',
      'WARNING_ISSUED', 'CONTENT_REMOVED', 'ACCOUNT_SUSPENDED', 'DISMISSED',
    ]),
    notes: z.string().trim().max(1000).optional(),
    moderatorNotes: z.string().trim().max(1000).optional(),
    status: z.enum(['RESOLVED', 'DISMISSED']).optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid moderation resolution data.' });
    return;
  }
  const { actionTaken: submittedAction, status } = parsed.data;
  const moderatorNotes = parsed.data.moderatorNotes || parsed.data.notes || '';
  const actionAliases: Record<string, string> = {
    WARNING_ISSUED: 'WARN_USER',
    CONTENT_REMOVED: 'REMOVE_REPORT',
    ACCOUNT_SUSPENDED: 'SUSPEND_USER',
  };
  const actionTaken = actionAliases[submittedAction] || submittedAction;

  const report = await Report.findById(id);
  if (!report) {
    res.status(404).json({ success: false, message: 'Report not found.' });
    return;
  }

  const allowedActions: Record<string, string[]> = {
    LOST_REPORT: ['REMOVE_REPORT', 'WARN_USER', 'SUSPEND_USER', 'NO_ACTION'],
    FOUND_REPORT: ['REMOVE_REPORT', 'WARN_USER', 'SUSPEND_USER', 'NO_ACTION'],
    CLAIM: ['REJECT_CLAIM', 'WARN_USER', 'SUSPEND_USER', 'NO_ACTION'],
    USER: ['WARN_USER', 'SUSPEND_USER', 'NO_ACTION'],
    LISTING: ['REMOVE_LISTING', 'WARN_USER', 'SUSPEND_USER', 'NO_ACTION'],
  };
  if (submittedAction !== 'DISMISSED' && !allowedActions[report.targetType]?.includes(actionTaken)) {
    res.status(400).json({ success: false, message: 'The selected moderation action is not valid for this report.' });
    return;
  }

  let affectedUserId: string | undefined;
  if (report.targetType === 'USER') {
    affectedUserId = report.targetId;
  } else if (report.targetType === 'LOST_REPORT') {
    const targetReport = await LostReport.findById(report.targetId).select('reporter');
    affectedUserId = targetReport?.reporter.toString();
  } else if (report.targetType === 'FOUND_REPORT') {
    const targetReport = await FoundReport.findById(report.targetId).select('finder');
    affectedUserId = targetReport?.finder.toString();
  } else if (report.targetType === 'CLAIM') {
    const targetClaim = await Claim.findById(report.targetId).select('claimant');
    affectedUserId = targetClaim?.claimant.toString();
  }

  // Execute moderation actions
  if (actionTaken === 'REMOVE_REPORT' || actionTaken === 'REMOVE_LISTING') {
    if (report.targetType === 'LOST_REPORT') {
      await LostReport.findByIdAndUpdate(report.targetId, { status: 'CLOSED' });
    } else if (report.targetType === 'FOUND_REPORT') {
      await FoundReport.findByIdAndUpdate(report.targetId, { status: 'CLOSED' });
    }

    await logAudit({
      actorId: req.user._id,
      action: 'ADMIN_REMOVED_REPORT',
      entityType: report.targetType,
      entityId: report.targetId as any,
      notes: `Reported content removed by admin. Notes: ${moderatorNotes}`,
      ipAddress: req.ip,
    });
  }

  if (actionTaken === 'REJECT_CLAIM' && report.targetType === 'CLAIM') {
    const claim = await Claim.findById(report.targetId);
    if (!claim) {
      res.status(404).json({ success: false, message: 'Reported ownership claim no longer exists.' });
      return;
    }
    claim.status = 'REJECTED';
    await claim.save();

    const otherActiveClaims = await Claim.exists({
      foundReport: claim.foundReport,
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED', 'APPROVED'] },
    });
    if (!otherActiveClaims) {
      await FoundReport.findByIdAndUpdate(claim.foundReport, { status: 'AVAILABLE_FOR_CLAIM' });
    }

    await sendNotification({
      recipientId: claim.claimant,
      title: 'Ownership Claim Rejected',
      message: `An administrator reviewed and rejected your ownership claim. ${moderatorNotes}`.trim(),
      type: 'MODERATION',
      link: '/claims',
    });

    await logAudit({
      actorId: req.user._id,
      action: 'ADMIN_REJECTED_CLAIM',
      entityType: 'Claim',
      entityId: claim._id,
      notes: moderatorNotes,
      ipAddress: req.ip,
    });
  }

  if (actionTaken === 'SUSPEND_USER' && affectedUserId) {
    const user = await User.findById(affectedUserId);
    if (user) {
      user.isSuspended = true;
      user.suspensionReason = moderatorNotes || 'Violation of community safety guidelines.';
      await user.save();

      await logAudit({
        actorId: req.user._id,
        action: 'ADMIN_SUSPENDED_USER',
        entityType: 'User',
        entityId: user._id,
        notes: `User ${user.email} suspended by admin.`,
        ipAddress: req.ip,
      });
    }
  }

  if (actionTaken === 'WARN_USER' && affectedUserId) {
    await sendNotification({
      recipientId: affectedUserId,
      title: 'Community Safety Warning',
      message: `You have received a safety warning from FindBack administrators: ${moderatorNotes}. Please adhere to our trust guidelines.`,
      type: 'MODERATION',
    });
    await logAudit({
      actorId: req.user._id,
      action: 'ADMIN_WARNED_USER',
      entityType: 'User',
      entityId: affectedUserId,
      notes: moderatorNotes,
      ipAddress: req.ip,
    });
  }

  report.status = status || (submittedAction === 'DISMISSED' ? 'DISMISSED' : 'RESOLVED');
  report.actionTaken = submittedAction;
  report.moderatorNotes = moderatorNotes || '';
  report.resolvedBy = req.user._id;
  report.resolvedAt = new Date();
  await report.save();

  res.json({ success: true, message: 'Report resolved successfully.', report });
}
