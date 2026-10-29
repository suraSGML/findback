import { Response } from 'express';
import mongoose from 'mongoose';
import { LostReport } from '../models/LostReport.js';
import { FoundReport } from '../models/FoundReport.js';
import { LostFoundMatch } from '../models/LostFoundMatch.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { runMatchingForReport } from '../services/matchEngine.js';
import { logAudit } from '../services/auditLogger.js';
import { z } from 'zod';

const objectIdSchema = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format.');
const reportImagesSchema = z.array(z.string().trim().min(1).max(2048)).max(5).optional();
const reportDateSchema = z.string().max(40).refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date.');
const lostStatuses = ['ACTIVE', 'OPEN', 'POTENTIAL_MATCH', 'POSSIBLE_MATCH', 'CLAIM_PENDING', 'MATCH_CONFIRMED', 'RETURN_PENDING', 'RETURNED', 'CLOSED', 'EXPIRED'] as const;
const foundStatuses = ['AVAILABLE_FOR_CLAIM', 'REPORTED', 'UNDER_REVIEW', 'POTENTIAL_MATCH', 'CLAIM_PENDING', 'CLAIM_APPROVED', 'RETURNED', 'CLOSED', 'TRANSFERRED_TO_OFFICER'] as const;
const publicLostStatuses = ['ACTIVE', 'OPEN', 'POTENTIAL_MATCH', 'POSSIBLE_MATCH', 'CLAIM_PENDING', 'RETURNED'];
const publicFoundStatuses = ['AVAILABLE_FOR_CLAIM', 'REPORTED', 'UNDER_REVIEW', 'POTENTIAL_MATCH', 'CLAIM_PENDING', 'RETURNED'];

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function includesString(values: readonly string[], value: string): boolean {
  return values.some((candidate) => candidate === value);
}

function parsePagination(page: unknown, limit: unknown): { page: number; limit: number } | null {
  const parsedPage = z.coerce.number().int().min(1).max(100000).safeParse(page);
  const parsedLimit = z.coerce.number().int().min(1).max(100).safeParse(limit);
  return parsedPage.success && parsedLimit.success
    ? { page: parsedPage.data, limit: parsedLimit.data }
    : null;
}

function isOwnerOrAdmin(req: AuthenticatedRequest, ownerId: mongoose.Types.ObjectId): boolean {
  return req.user?.role === 'ADMIN' || req.user?._id.toString() === ownerId.toString();
}

const lostReportSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: objectIdSchema,
  description: z.string().trim().min(5).max(3000),
  color: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(100).optional(),
  distinguishingCharacteristics: z.string().trim().max(1000).optional(),
  country: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  locationName: z.string().trim().max(300).optional(),
  lastKnownLocation: objectIdSchema.optional(),
  dateLost: reportDateSchema,
  approximateTime: z.string().trim().max(80).optional(),
  images: reportImagesSchema,
}).strict();

const foundReportSchema = z.object({
  title: z.string().trim().min(2).max(120),
  category: objectIdSchema,
  description: z.string().trim().min(5).max(3000),
  color: z.string().trim().max(100).optional(),
  brand: z.string().trim().max(100).optional(),
  country: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
  locationName: z.string().trim().max(300).optional(),
  foundLocation: objectIdSchema.optional(),
  dateFound: reportDateSchema,
  approximateTime: z.string().trim().max(80).optional(),
  custodyStatus: z.enum(['WITH_FINDER', 'TRANSFERRED_TO_CUSTODIAN']).optional(),
  custodyLocationDetails: z.string().trim().max(500).optional(),
  secretIdentifyingDetails: z.string().trim().max(1000).optional(),
  images: reportImagesSchema,
}).strict();

function respondValidationError(res: Response, error: z.ZodError): void {
  res.status(400).json({
    success: false,
    message: 'Invalid report data.',
    errors: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
  });
}

export async function createLostReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const parsed = lostReportSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const {
    title,
    category,
    description,
    color,
    brand,
    distinguishingCharacteristics,
    country,
    region,
    city,
    locationName,
    lastKnownLocation,
    dateLost,
    approximateTime,
    images,
  } = parsed.data;

  const report = await LostReport.create({
    reporter: req.user._id,
    title: title.trim(),
    category,
    description: description.trim(),
    color: color?.trim() || '',
    brand: brand?.trim() || '',
    distinguishingCharacteristics: distinguishingCharacteristics?.trim() || '',
    country: country?.trim() || 'Ethiopia',
    region: region?.trim() || '',
    city: city?.trim() || 'Addis Ababa',
    locationName: locationName?.trim() || '',
    lastKnownLocation: lastKnownLocation || undefined,
    dateLost: new Date(dateLost),
    approximateTime: approximateTime || '',
    images: images || [],
    status: 'ACTIVE',
  });

  await logAudit({
    actorId: req.user._id,
    action: 'LOST_REPORT_CREATED',
    entityType: 'LostReport',
    entityId: report._id,
    notes: `Lost report created: "${title}" in ${report.city}, ${report.country}.`,
    ipAddress: req.ip,
  });

  // Execute matching engine asynchronously
  runMatchingForReport(report, 'LOST').catch((err) =>
    console.error('[LostMatching Async Error]', err.message)
  );

  res.status(201).json({
    success: true,
    message: 'Lost item report published. FindBack is actively checking for matching found items.',
    report,
  });
}

export async function createFoundReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const parsed = foundReportSchema.safeParse(req.body);
  if (!parsed.success) {
    respondValidationError(res, parsed.error);
    return;
  }
  const {
    title,
    category,
    description,
    color,
    brand,
    country,
    region,
    city,
    locationName,
    foundLocation,
    dateFound,
    approximateTime,
    custodyStatus,
    custodyLocationDetails,
    secretIdentifyingDetails,
    images,
  } = parsed.data;

  const report = await FoundReport.create({
    finder: req.user._id,
    title: title.trim(),
    category,
    description: description.trim(),
    color: color?.trim() || '',
    brand: brand?.trim() || '',
    country: country?.trim() || 'Ethiopia',
    region: region?.trim() || '',
    city: city?.trim() || 'Addis Ababa',
    locationName: locationName?.trim() || '',
    foundLocation: foundLocation || undefined,
    dateFound: new Date(dateFound),
    approximateTime: approximateTime || '',
    custodyStatus: custodyStatus || 'WITH_FINDER',
    custodyLocationDetails: custodyLocationDetails?.trim() || '',
    secretIdentifyingDetails: secretIdentifyingDetails?.trim() || '',
    images: images || [],
    status: 'AVAILABLE_FOR_CLAIM',
  });

  await logAudit({
    actorId: req.user._id,
    action: 'FOUND_REPORT_CREATED',
    entityType: 'FoundReport',
    entityId: report._id,
    notes: `Found report created: "${title}" in ${report.city}, ${report.country}.`,
    ipAddress: req.ip,
  });

  // Execute matching engine asynchronously
  runMatchingForReport(report, 'FOUND').catch((err) =>
    console.error('[FoundMatching Async Error]', err.message)
  );

  res.status(201).json({
    success: true,
    message: 'Found item report published. Thank you for helping return lost property to its rightful owner!',
    report,
  });
}

export async function searchLostReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { category, city, location, search, status, reporterId, page = '1', limit = '12' } = req.query;

  const query: any = {};
  const isPrivateQuery = typeof reporterId === 'string';
  if (reporterId) {
    if (typeof reporterId !== 'string' || !mongoose.isValidObjectId(reporterId)) {
      res.status(400).json({ success: false, message: 'Invalid reporter ID.' });
      return;
    }
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required to view personal reports.' });
      return;
    }
    if (!isOwnerOrAdmin(req, new mongoose.Types.ObjectId(reporterId))) {
      res.status(403).json({ success: false, message: 'You are not authorized to view these reports.' });
      return;
    }
    query.reporter = reporterId;
  }
  const allowedStatuses = isPrivateQuery || req.user?.role === 'ADMIN' ? lostStatuses : publicLostStatuses;
  if (status) {
    if (typeof status !== 'string' || !includesString(allowedStatuses, status)) {
      res.status(400).json({ success: false, message: 'Invalid or unavailable lost report status.' });
      return;
    }
    query.status = status;
  } else if (!isPrivateQuery) {
    query.status = { $in: publicLostStatuses.filter((item) => item !== 'RETURNED') };
  }

  if (category) {
    if (typeof category !== 'string' || !mongoose.isValidObjectId(category)) {
      res.status(400).json({ success: false, message: 'Invalid category ID.' });
      return;
    }
    query.category = category;
  }
  if (city) {
    if (typeof city !== 'string' || city.length > 100) {
      res.status(400).json({ success: false, message: 'Invalid city filter.' });
      return;
    }
    query.city = new RegExp(escapeRegex(city.trim()), 'i');
  }
  if (location) query.lastKnownLocation = location;
  if (search) {
    if (typeof search !== 'string' || search.length > 200) {
      res.status(400).json({ success: false, message: 'Search must be 200 characters or fewer.' });
      return;
    }
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ title: regex }, { description: regex }, { brand: regex }, { locationName: regex }, { city: regex }];
  }

  const pagination = parsePagination(page, limit);
  if (!pagination) {
    res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    return;
  }
  const { page: pageNum, limit: limitNum } = pagination;
  const skip = (pageNum - 1) * limitNum;

  const [reports, total] = await Promise.all([
    LostReport.find(query)
      .populate('category', 'name icon slug')
      .populate('lastKnownLocation', 'name city area address')
      .populate('reporter', 'name avatar city country reputation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    LostReport.countDocuments(query),
  ]);

  res.json({
    success: true,
    reports,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
  });
}

export async function searchFoundReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { category, city, location, search, status, finderId, page = '1', limit = '12' } = req.query;

  const query: any = {};
  const isPrivateQuery = typeof finderId === 'string';
  if (finderId) {
    if (typeof finderId !== 'string' || !mongoose.isValidObjectId(finderId)) {
      res.status(400).json({ success: false, message: 'Invalid finder ID.' });
      return;
    }
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required to view personal reports.' });
      return;
    }
    if (!isOwnerOrAdmin(req, new mongoose.Types.ObjectId(finderId))) {
      res.status(403).json({ success: false, message: 'You are not authorized to view these reports.' });
      return;
    }
    query.finder = finderId;
  }

  const allowedStatuses = isPrivateQuery || req.user?.role === 'ADMIN' ? foundStatuses : publicFoundStatuses;
  if (status) {
    if (typeof status !== 'string' || !includesString(allowedStatuses, status)) {
      res.status(400).json({ success: false, message: 'Invalid or unavailable found report status.' });
      return;
    }
    query.status = status;
  } else if (!isPrivateQuery) {
    query.status = { $in: publicFoundStatuses.filter((item) => item !== 'RETURNED') };
  }

  if (category) {
    if (typeof category !== 'string' || !mongoose.isValidObjectId(category)) {
      res.status(400).json({ success: false, message: 'Invalid category ID.' });
      return;
    }
    query.category = category;
  }
  if (city) {
    if (typeof city !== 'string' || city.length > 100) {
      res.status(400).json({ success: false, message: 'Invalid city filter.' });
      return;
    }
    query.city = new RegExp(escapeRegex(city.trim()), 'i');
  }
  if (location) query.foundLocation = location;
  if (search) {
    if (typeof search !== 'string' || search.length > 200) {
      res.status(400).json({ success: false, message: 'Search must be 200 characters or fewer.' });
      return;
    }
    const regex = new RegExp(escapeRegex(search.trim()), 'i');
    query.$or = [{ title: regex }, { description: regex }, { brand: regex }, { locationName: regex }, { city: regex }];
  }

  const pagination = parsePagination(page, limit);
  if (!pagination) {
    res.status(400).json({ success: false, message: 'Page must be positive and limit must be between 1 and 100.' });
    return;
  }
  const { page: pageNum, limit: limitNum } = pagination;
  const skip = (pageNum - 1) * limitNum;

  const isStaff = req.user?.role === 'ADMIN';

  // Strictly strip confidential secret details from general public and claimants
  const projection = isStaff || isPrivateQuery ? '' : '-secretIdentifyingDetails';
  if (status === 'RETURNED') {
    const confirmedReturns = await ReturnRecord.distinct('foundReport', { ownerConfirmed: true });
    query._id = { $in: confirmedReturns };
  }

  const [reports, total] = await Promise.all([
    FoundReport.find(query, projection)
      .populate('category', 'name icon slug')
      .populate('foundLocation', 'name city area address')
      .populate('finder', 'name avatar city country reputation')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum),
    FoundReport.countDocuments(query),
  ]);

  let enrichedReports: any[] = reports;
  if (status === 'RETURNED') {
    const reportIds = reports.map((r) => r._id);
    const returnRecords = await ReturnRecord.find({ foundReport: { $in: reportIds } })
      .select('foundReport returnDate handoverLocationName ownerConfirmed ownerConfirmedAt ownerFeedback ownerRating');
    const returnMap = new Map(returnRecords.map((rec) => [rec.foundReport.toString(), rec]));
    enrichedReports = reports.map((r) => {
      const obj = r.toObject();
      return {
        ...obj,
        returnRecord: returnMap.get(r._id.toString()) || null,
      };
    });
  }

  res.json({
    success: true,
    reports: enrichedReports,
    pagination: { total, page: pageNum, pages: Math.ceil(total / limitNum) },
  });
}

export async function getLostReportById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid lost report ID format.' });
    return;
  }

  const report = await LostReport.findById(id)
    .populate('category', 'name icon slug')
    .populate('lastKnownLocation', 'name city area address')
    .populate('reporter', 'name avatar city country reputation');

  if (!report) {
    res.status(404).json({ success: false, message: 'Lost item report not found.' });
    return;
  }

  const isOwner = isOwnerOrAdmin(req, report.reporter);
  if (!isOwner && !includesString(publicLostStatuses, report.status)) {
    res.status(404).json({ success: false, message: 'Lost item report not found.' });
    return;
  }

  res.json({ success: true, report });
}

export async function getFoundReportById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid found report ID format.' });
    return;
  }

  const report = await FoundReport.findById(id)
    .populate('category', 'name icon slug')
    .populate('foundLocation', 'name city area address')
    .populate('finder', 'name avatar city country reputation');

  if (!report) {
    res.status(404).json({ success: false, message: 'Found item report not found.' });
    return;
  }

  const isOwner = isOwnerOrAdmin(req, report.finder._id);
  if (!isOwner && !includesString(publicFoundStatuses, report.status)) {
    res.status(404).json({ success: false, message: 'Found item report not found.' });
    return;
  }

  const reportData = report.toObject();
  if (!isOwner) {
    delete (reportData as any).secretIdentifyingDetails;
  }

  res.json({ success: true, report: reportData });
}

export async function updateLostReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const report = await LostReport.findById(id);

  if (!report) {
    res.status(404).json({ success: false, message: 'Report not found.' });
    return;
  }

  const isOwner = report.reporter.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isOwner && !isAdmin) {
    res.status(403).json({ success: false, message: 'You are not authorized to update this report.' });
    return;
  }

  const parsed = z.object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(5).max(3000).optional(),
    color: z.string().trim().max(100).optional(),
    brand: z.string().trim().max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    locationName: z.string().trim().max(300).optional(),
    status: z.literal('CLOSED').optional(),
  }).strict().refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid lost report update.' });
    return;
  }
  const { title, description, color, brand, city, locationName, status } = parsed.data;
  if (status === 'CLOSED' && ['CLAIM_PENDING', 'MATCH_CONFIRMED', 'RETURN_PENDING', 'RETURNED'].includes(report.status)) {
    res.status(409).json({ success: false, message: 'A report with an active or completed claim cannot be closed directly.' });
    return;
  }
  if (title) report.title = title.trim();
  if (description) report.description = description.trim();
  if (color !== undefined) report.color = color.trim();
  if (brand !== undefined) report.brand = brand.trim();
  if (city) report.city = city.trim();
  if (locationName !== undefined) report.locationName = locationName.trim();
  if (status) report.status = status;
  await report.save();

  res.json({ success: true, message: 'Report updated successfully.', report });
}

export async function updateFoundReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const report = await FoundReport.findById(id);

  if (!report) {
    res.status(404).json({ success: false, message: 'Report not found.' });
    return;
  }

  const isFinder = report.finder.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isFinder && !isAdmin) {
    res.status(403).json({ success: false, message: 'You are not authorized to update this report.' });
    return;
  }

  const parsed = z.object({
    title: z.string().trim().min(2).max(120).optional(),
    description: z.string().trim().min(5).max(3000).optional(),
    color: z.string().trim().max(100).optional(),
    brand: z.string().trim().max(100).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    locationName: z.string().trim().max(300).optional(),
    status: z.literal('CLOSED').optional(),
    custodyStatus: z.enum(['WITH_FINDER', 'TRANSFERRED_TO_CUSTODIAN', 'TRANSFERRED_TO_OFFICER']).optional(),
    custodyLocationDetails: z.string().trim().max(500).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid found report update.' });
    return;
  }
  const { title, description, color, brand, city, locationName, status, custodyStatus, custodyLocationDetails } = parsed.data;
  if (status === 'CLOSED' && ['CLAIM_PENDING', 'CLAIM_APPROVED', 'RETURNED'].includes(report.status)) {
    res.status(409).json({ success: false, message: 'A report with an active or completed claim cannot be closed directly.' });
    return;
  }
  if (title) report.title = title.trim();
  if (description) report.description = description.trim();
  if (color !== undefined) report.color = color.trim();
  if (brand !== undefined) report.brand = brand.trim();
  if (city) report.city = city.trim();
  if (locationName !== undefined) report.locationName = locationName.trim();
  if (status) report.status = status;
  if (custodyStatus) report.custodyStatus = custodyStatus;
  if (custodyLocationDetails !== undefined) report.custodyLocationDetails = custodyLocationDetails.trim();

  await report.save();

  res.json({ success: true, message: 'Found report updated successfully.', report });
}

export async function getMatches(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { status } = req.query;

  let query: any = {};
  if (req.user.role === 'ADMIN') {
    if (status) query.status = status;
  } else {
    // Return matches relevant to reports filed by this user (either lost or found)
    const [myLostReports, myFoundReports] = await Promise.all([
      LostReport.find({ reporter: req.user._id }).select('_id'),
      FoundReport.find({ finder: req.user._id }).select('_id'),
    ]);
    const lostIds = myLostReports.map((r) => r._id);
    const foundIds = myFoundReports.map((r) => r._id);

    query = {
      $or: [
        { lostReport: { $in: lostIds } },
        { foundReport: { $in: foundIds } },
      ],
    };

    if (status) {
      query.status = status;
    }
  }

  const rawMatches = await LostFoundMatch.find(query)
    .populate({
      path: 'lostReport',
      populate: [
        { path: 'category', select: 'name icon' },
        { path: 'lastKnownLocation', select: 'name city area' },
        { path: 'reporter', select: 'name avatar city' },
      ],
    })
    .populate({
      path: 'foundReport',
      select: '-secretIdentifyingDetails',
      populate: [
        { path: 'category', select: 'name icon' },
        { path: 'foundLocation', select: 'name city area' },
        { path: 'finder', select: 'name avatar city' },
      ],
    })
    .sort({ matchScore: -1, createdAt: -1 });

  // Filter out any orphaned matches (where reports were deleted or missing)
  const matches = rawMatches.filter((m) => m.lostReport && m.foundReport);

  res.json({ success: true, matches });
}

export async function updateMatchStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const parsed = z.object({
    status: z.enum(['SUGGESTED', 'CONFIRMED', 'DISMISSED']),
    dismissReason: z.string().trim().max(500).optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid match status update.' });
    return;
  }
  const { status, dismissReason } = parsed.data;

  const match = await LostFoundMatch.findById(id);
  if (!match) {
    res.status(404).json({ success: false, message: 'Match record not found.' });
    return;
  }

  const isAdmin = req.user.role === 'ADMIN';
  const ownsLostReport = await LostReport.exists({ _id: match.lostReport, reporter: req.user._id });
  const ownsFoundReport = await FoundReport.exists({ _id: match.foundReport, finder: req.user._id });
  if (!isAdmin && !ownsLostReport && !ownsFoundReport) {
    res.status(403).json({ success: false, message: 'You are not authorized to update this match.' });
    return;
  }
  if (match.status === 'CONFIRMED' && status !== 'CONFIRMED') {
    res.status(409).json({ success: false, message: 'A confirmed match cannot be changed.' });
    return;
  }
  if (match.status === 'DISMISSED' && status === 'CONFIRMED') {
    res.status(409).json({ success: false, message: 'Restore a dismissed match before confirming it.' });
    return;
  }

  match.status = status;
  if (status === 'DISMISSED') {
    match.dismissedBy = req.user._id;
    match.dismissReason = dismissReason || 'Dismissed by user';
  }
  await match.save();

  res.json({ success: true, message: `Match status updated to ${status}.`, match });
}

export async function transferCustodyToCustodian(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const parsed = z.object({ custodyLocationDetails: z.string().trim().max(500).optional() }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid custody details.' });
    return;
  }
  const { custodyLocationDetails } = parsed.data;
  const foundReport = await FoundReport.findById(id);

  if (!foundReport) {
    res.status(404).json({ success: false, message: 'Found report not found.' });
    return;
  }

  const isFinder = foundReport.finder.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isFinder && !isAdmin) {
    res.status(403).json({ success: false, message: 'Only the finder or an administrator can update item custody.' });
    return;
  }

  foundReport.custodyStatus = 'TRANSFERRED_TO_CUSTODIAN';
  foundReport.custodyLocationDetails = custodyLocationDetails || 'Transferred to public custody desk.';
  await foundReport.save();

  await logAudit({
    actorId: req.user._id,
    action: 'CUSTODY_TRANSFERRED',
    entityType: 'FoundReport',
    entityId: foundReport._id,
    notes: `Item custody transferred: "${foundReport.title}" (${foundReport.custodyLocationDetails}).`,
    ipAddress: req.ip,
  });

  res.json({ success: true, message: 'Custody record updated successfully.', foundReport });
}

export const transferCustodyToOfficer = transferCustodyToCustodian;
