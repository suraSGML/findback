import { Response } from 'express';
import mongoose from 'mongoose';
import { Claim } from '../models/Claim.js';
import { FoundReport } from '../models/FoundReport.js';
import { LostReport } from '../models/LostReport.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { LostFoundMatch } from '../models/LostFoundMatch.js';
import { User } from '../models/User.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { sendNotification } from '../services/notificationService.js';
import { logAudit } from '../services/auditLogger.js';
import { z } from 'zod';

const claimObjectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID format.');
const claimSubmissionSchema = z.object({
  foundReportId: claimObjectId,
  lostReportId: claimObjectId.optional(),
  proofDescription: z.string().trim().min(10).max(3000),
  distinguishingFeaturesAnswer: z.string().trim().max(1000).optional(),
  serialNumber: z.string().trim().max(200).optional(),
  proofImages: z.array(z.string().trim().min(1).max(2048)).max(5).optional(),
}).strict();

export async function submitClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const foundReportIdResult = claimObjectId.safeParse(req.body?.foundReportId);
  if (!foundReportIdResult.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid claim data.',
      errors: [{ field: 'foundReportId', message: 'Invalid ID format.' }],
    });
    return;
  }

  const foundItem = await FoundReport.findById(foundReportIdResult.data);
  if (!foundItem) {
    res.status(404).json({ success: false, message: 'Found item report not found.' });
    return;
  }

  if (foundItem.finder.toString() === req.user._id.toString()) {
    res.status(400).json({ success: false, message: 'You cannot submit an ownership claim for an item you reported found.' });
    return;
  }

  const parsed = claimSubmissionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid claim data.',
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  const {
    foundReportId,
    lostReportId,
    proofDescription,
    distinguishingFeaturesAnswer,
    serialNumber,
    proofImages,
  } = parsed.data;

  if (lostReportId) {
    const ownedLostReport = await LostReport.findOne({
      _id: lostReportId,
      reporter: req.user._id,
    }).select('_id');
    if (!ownedLostReport) {
      res.status(403).json({ success: false, message: 'You can only attach a lost report that belongs to your account.' });
      return;
    }
    const matchingPair = await LostFoundMatch.exists({
      lostReport: lostReportId,
      foundReport: foundReportId,
    });
    if (!matchingPair) {
      res.status(400).json({ success: false, message: 'The selected lost report is not matched to this found item.' });
      return;
    }
  }

  // Prevent multiple duplicate active claims
  const existingClaim = await Claim.findOne({
    foundReport: foundReportId,
    claimant: req.user._id,
    status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED', 'APPROVED'] },
  });

  if (existingClaim) {
    res.status(400).json({
      success: false,
      message: 'You have already submitted an active claim for this item.',
    });
    return;
  }

  const reservedItem = await FoundReport.findOneAndUpdate(
    {
      _id: foundReportId,
      status: { $in: ['AVAILABLE_FOR_CLAIM', 'REPORTED', 'UNDER_REVIEW', 'POTENTIAL_MATCH'] },
    },
    { $set: { status: 'CLAIM_PENDING' } },
    { new: true },
  );
  if (!reservedItem) {
    res.status(409).json({ success: false, message: 'This found item already has an active claim or is unavailable.' });
    return;
  }

  let claim: any;
  try {
    [claim] = await Claim.create([{
      foundReport: foundReportId,
      claimant: req.user._id,
      lostReport: lostReportId || undefined,
      proofDescription: proofDescription.trim(),
      distinguishingFeaturesAnswer: distinguishingFeaturesAnswer?.trim() || '',
      serialNumber: serialNumber?.trim() || '',
      proofImages: proofImages || [],
      status: 'SUBMITTED',
    }]);
  } catch (error) {
    await FoundReport.findOneAndUpdate(
      { _id: foundReportId, status: 'CLAIM_PENDING' },
      { $set: { status: foundItem.status } },
    );
    throw error;
  }

  if (lostReportId) {
    await LostReport.findByIdAndUpdate(lostReportId, { status: 'CLAIM_PENDING' });
  }

  // Notify Finder and Admin
  await sendNotification({
    recipientId: foundItem.finder,
    title: 'New Ownership Claim Submitted',
    message: `Someone has submitted an ownership claim for your found item "${foundItem.title}". Review their verification proof.`,
    type: 'CLAIM',
    link: `/lost-found/claims`,
    metadata: { claimId: claim._id, foundId: foundItem._id },
  });

  await logAudit({
    actorId: req.user._id,
    action: 'CLAIM_SUBMITTED',
    entityType: 'Claim',
    entityId: claim._id,
    notes: `Claim submitted for item "${foundItem.title}".`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'Ownership claim submitted successfully. The finder has been notified to verify your claim.',
    claim,
  });
}

export async function getClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  let query: any = {};
  if (req.user.role === 'ADMIN') {
    const { status, foundReportId } = req.query;
    if (status) query.status = status;
    if (foundReportId) query.foundReport = foundReportId;
  } else {
    // Ordinary users see: claims they made OR claims on items they found
    const myFoundReports = await FoundReport.find({ finder: req.user._id }).select('_id');
    const myFoundIds = myFoundReports.map((f) => f._id);

    query = {
      $or: [
        { claimant: req.user._id },
        { foundReport: { $in: myFoundIds } },
      ],
    };
  }

  const claims = await Claim.find(query)
    .populate({
      path: 'foundReport',
      select: 'title images foundLocation dateFound status finder locationName city',
      populate: { path: 'finder', select: 'name avatar city country reputation' },
    })
    .populate('claimant', 'name avatar city country reputation')
    .populate('reviewedBy', 'name role')
    .sort({ createdAt: -1 });

  const claimIds = claims.map((c) => c._id);
  const returnRecords = await ReturnRecord.find({ claim: { $in: claimIds } })
    .populate('returnedBy', 'name avatar')
    .populate('receivedBy', 'name avatar');
  const returnMap = new Map(returnRecords.map((r) => [r.claim ? r.claim.toString() : '', r]));

  const enrichedClaims = claims.map((c) => {
    const claimObj = c.toObject();
    return {
      ...claimObj,
      returnRecord: returnMap.get(c._id.toString()) || null,
    };
  });

  res.json({ success: true, claims: enrichedClaims });
}

export async function getMyClaims(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const claims = await Claim.find({ claimant: req.user._id })
    .populate({
      path: 'foundReport',
      select: 'title images foundLocation dateFound status finder locationName city',
      populate: { path: 'finder', select: 'name avatar city country reputation' },
    })
    .populate('claimant', 'name avatar city country reputation')
    .populate('reviewedBy', 'name role')
    .sort({ createdAt: -1 });

  const claimIds = claims.map((c) => c._id);
  const returnRecords = await ReturnRecord.find({ claim: { $in: claimIds } })
    .populate('returnedBy', 'name avatar')
    .populate('receivedBy', 'name avatar');
  const returnMap = new Map(returnRecords.map((r) => [r.claim ? r.claim.toString() : '', r]));

  const enrichedClaims = claims.map((c) => {
    const claimObj = c.toObject();
    return {
      ...claimObj,
      returnRecord: returnMap.get(c._id.toString()) || null,
    };
  });

  res.json({ success: true, claims: enrichedClaims });
}

export async function getClaimById(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid claim ID format.' });
    return;
  }

  const claim = await Claim.findById(id)
    .populate({
      path: 'foundReport',
      select: '-secretIdentifyingDetails',
      populate: [
        { path: 'foundLocation', select: 'name city area address' },
        { path: 'finder', select: 'name avatar city country' },
      ],
    })
    .populate('claimant', 'name avatar city country reputation')
    .populate('lostReport')
    .populate('reviewedBy', 'name role');

  if (!claim) {
    res.status(404).json({ success: false, message: 'Claim not found.' });
    return;
  }

  const foundItem = claim.foundReport as any;
  const isClaimant = claim.claimant._id.toString() === req.user._id.toString();
  const isFinder = foundItem && foundItem.finder && foundItem.finder._id.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isClaimant && !isFinder && !isAdmin) {
    res.status(403).json({ success: false, message: 'Not authorized to view this claim.' });
    return;
  }

  const claimData = claim.toObject() as any;
  if ((isFinder || isAdmin) && foundItem) {
    const privateFoundItem = await FoundReport.findById(foundItem._id).select('+secretIdentifyingDetails');
    if (privateFoundItem) {
      claimData.foundReport.secretIdentifyingDetails = privateFoundItem.secretIdentifyingDetails;
    }
  }

  res.json({ success: true, claim: claimData });
}

export async function askVerificationQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const questionData = z.object({ question: z.string().trim().min(3).max(500) }).safeParse(req.body);
  if (!questionData.success) {
    res.status(400).json({ success: false, message: 'Verification question must be 3 to 500 characters.' });
    return;
  }
  const { question } = questionData.data;

  const claim = await Claim.findById(id).populate('foundReport');
  if (!claim) {
    res.status(404).json({ success: false, message: 'Claim not found.' });
    return;
  }

  const foundItem = claim.foundReport as any;
  const isFinder = foundItem && foundItem.finder && foundItem.finder.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isFinder && !isAdmin) {
    res.status(403).json({ success: false, message: 'Only the item finder or an administrator can ask verification questions.' });
    return;
  }

  claim.officerQuestions.push({
    question: question.trim(),
    askedBy: req.user._id,
    askedAt: new Date(),
  });
  claim.status = 'MORE_INFO_REQUESTED';
  await claim.save();

  await sendNotification({
    recipientId: claim.claimant,
    title: 'Verification Question on Your Claim',
    message: `Verification question asked: "${question.trim()}". Please respond to provide further ownership evidence.`,
    type: 'CLAIM',
    link: `/lost-found/claims`,
    metadata: { claimId: claim._id },
  });

  res.json({ success: true, message: 'Verification question sent to claimant.', claim });
}

export async function answerVerificationQuestion(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const answerData = z.object({
    questionIndex: z.number().int().nonnegative(),
    answer: z.string().trim().min(1).max(2000),
  }).safeParse(req.body);
  if (!answerData.success) {
    res.status(400).json({ success: false, message: 'A valid question index and answer are required.' });
    return;
  }
  const { questionIndex, answer } = answerData.data;

  const claim = await Claim.findById(id).populate('foundReport');
  if (!claim) {
    res.status(404).json({ success: false, message: 'Claim not found.' });
    return;
  }

  if (claim.claimant.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: 'Only the claimant can answer verification questions.' });
    return;
  }

  if (questionIndex === undefined || !claim.officerQuestions[questionIndex]) {
    res.status(400).json({ success: false, message: 'Invalid question index.' });
    return;
  }

  claim.officerQuestions[questionIndex].answer = answer.trim();
  claim.officerQuestions[questionIndex].answeredAt = new Date();
  claim.status = 'UNDER_REVIEW';
  await claim.save();

  const foundItem = claim.foundReport as any;
  if (foundItem?.finder) {
    await sendNotification({
      recipientId: foundItem.finder,
      title: 'Claimant Provided Verification Answer',
      message: `The claimant answered your verification question for "${foundItem.title}". Review their response.`,
      type: 'CLAIM',
      link: `/lost-found/claims`,
      metadata: { claimId: claim._id },
    });
  }

  res.json({ success: true, message: 'Verification answer submitted successfully.', claim });
}

export async function reviewClaim(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const decisionData = z.object({
    decision: z.enum(['APPROVE', 'REJECT']),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse(req.body);
  if (!decisionData.success) {
    res.status(400).json({ success: false, message: 'Decision must be APPROVE or REJECT and notes must be 1000 characters or fewer.' });
    return;
  }
  const { decision, notes } = decisionData.data;

  const claim = await Claim.findById(id).populate('foundReport');
  if (!claim) {
    res.status(404).json({ success: false, message: 'Claim not found.' });
    return;
  }

  // Crucial security check: claimants can NEVER approve their own claims
  if (claim.claimant.toString() === req.user._id.toString()) {
    res.status(403).json({ success: false, message: 'You cannot review or approve your own ownership claim.' });
    return;
  }

  const foundItem = claim.foundReport as any;
  const isFinder = foundItem && foundItem.finder && foundItem.finder.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isFinder && !isAdmin) {
    res.status(403).json({ success: false, message: 'Only the item finder or an administrator can approve or reject claims.' });
    return;
  }

  if (decision === 'APPROVE') {
    claim.status = 'APPROVED';
    claim.reviewedBy = req.user._id;
    claim.reviewDecisionNotes = notes?.trim() || 'Ownership verification confirmed.';
    await claim.save();

    foundItem.status = 'CLAIM_APPROVED';
    await foundItem.save();

    if (claim.lostReport) {
      await LostReport.findByIdAndUpdate(claim.lostReport, { status: 'MATCH_CONFIRMED' });
      await LostFoundMatch.updateMany(
        { lostReport: claim.lostReport, foundReport: foundItem._id },
        { $set: { status: 'CONFIRMED' } }
      );
    }

    await sendNotification({
      recipientId: claim.claimant,
      title: 'Claim Approved! Ready for Return',
      message: `Your ownership claim for "${foundItem.title}" has been approved. You can now arrange a safe handover.`,
      type: 'CLAIM',
      link: `/lost-found/claims`,
      metadata: { claimId: claim._id, foundId: foundItem._id },
    });

    await logAudit({
      actorId: req.user._id,
      action: 'CLAIM_APPROVED',
      entityType: 'Claim',
      entityId: claim._id,
      notes: `Claim approved for item "${foundItem.title}". Notes: ${notes || 'Verified'}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Claim approved successfully.', claim });
    return;
  }

  if (decision === 'REJECT') {
    claim.status = 'REJECTED';
    claim.reviewedBy = req.user._id;
    claim.reviewDecisionNotes = notes?.trim() || 'Claim verification failed or lacked proof.';
    await claim.save();

    const otherPending = await Claim.findOne({
      foundReport: foundItem._id,
      _id: { $ne: claim._id },
      status: { $in: ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED'] },
    });

    foundItem.status = otherPending ? 'CLAIM_PENDING' : 'AVAILABLE_FOR_CLAIM';
    await foundItem.save();

    await sendNotification({
      recipientId: claim.claimant,
      title: 'Claim Decision: Rejected',
      message: `Your claim for "${foundItem.title}" could not be verified. Reason: ${notes || 'Insufficient proof of ownership.'}`,
      type: 'CLAIM',
      link: `/lost-found/claims`,
      metadata: { claimId: claim._id },
    });

    await logAudit({
      actorId: req.user._id,
      action: 'CLAIM_REJECTED',
      entityType: 'Claim',
      entityId: claim._id,
      notes: `Claim rejected. Reason: ${notes || 'Insufficient proof.'}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Claim rejected.', claim });
    return;
  }

  res.status(400).json({ success: false, message: 'Invalid decision specified (must be APPROVE or REJECT).' });
}

export async function confirmReturn(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const returnData = z.object({
    claimId: claimObjectId,
    pickupLocationId: claimObjectId.optional(),
    handoverLocationName: z.string().trim().max(300).optional(),
    evidenceImage: z.string().trim().max(2048).optional(),
    notes: z.string().trim().max(1000).optional(),
  }).safeParse(req.body);
  if (!returnData.success) {
    res.status(400).json({ success: false, message: 'Invalid handover details.' });
    return;
  }
  const { claimId, pickupLocationId, handoverLocationName, evidenceImage, notes } = returnData.data;

  const claim = await Claim.findById(claimId).populate('foundReport');
  if (!claim) {
    res.status(404).json({ success: false, message: 'Claim not found.' });
    return;
  }

  const foundItem = claim.foundReport as any;
  const isFinder = foundItem && foundItem.finder && foundItem.finder.toString() === req.user._id.toString();
  const isAdmin = req.user.role === 'ADMIN';

  if (!isFinder && !isAdmin) {
    res.status(403).json({ success: false, message: 'Only the finder or an administrator can confirm the return of property.' });
    return;
  }

  if (claim.status !== 'APPROVED') {
    res.status(409).json({ success: false, message: 'Only an approved claim can proceed to physical handover.' });
    return;
  }

  if (await ReturnRecord.exists({ claim: claim._id })) {
    res.status(409).json({ success: false, message: 'The handover has already been recorded and is awaiting owner confirmation.' });
    return;
  }

  const returnRecord = await ReturnRecord.create({
    foundReport: foundItem._id,
    lostReport: claim.lostReport || undefined,
    claim: claim._id,
    returnedBy: foundItem.finder,
    receivedBy: claim.claimant,
    officerInCharge: isAdmin ? req.user._id : undefined,
    returnDate: new Date(),
    pickupLocation: pickupLocationId || undefined,
    handoverLocationName: handoverLocationName || foundItem.locationName || '',
    notes: notes || 'Item successfully returned to verified owner.',
    evidenceImage: evidenceImage || '',
  });

  await sendNotification({
    recipientId: claim.claimant,
    title: 'Please Confirm Your Item Was Received',
    message: `The finder recorded the handover of "${foundItem.title}". Confirm receipt after you have the item to complete the return certificate.`,
    type: 'CLAIM',
    link: '/claims',
    metadata: { claimId: claim._id },
  });

  await logAudit({
    actorId: req.user._id,
    action: 'HANDOVER_RECORDED',
    entityType: 'ReturnRecord',
    entityId: returnRecord._id,
    notes: `Finder recorded handover of "${foundItem.title}". Awaiting owner receipt confirmation.`,
    ipAddress: req.ip,
  });

  res.status(201).json({
    success: true,
    message: 'Handover recorded. The return will be finalized after the owner confirms receipt.',
    returnRecord,
  });
}

export async function confirmReceiptByOwner(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Authentication required.' });
    return;
  }

  const { id } = req.params;
  const receiptData = z.object({
    rating: z.coerce.number().int().min(1).max(5).optional(),
    feedback: z.string().trim().max(1000).optional(),
  }).strict().safeParse(req.body);
  if (!receiptData.success) {
    res.status(400).json({ success: false, message: 'Rating must be from 1 to 5 and feedback must be 1000 characters or fewer.' });
    return;
  }
  const { rating, feedback } = receiptData.data;

  if (!mongoose.isValidObjectId(id)) {
    res.status(400).json({ success: false, message: 'Invalid claim ID format.' });
    return;
  }

  const claim = await Claim.findById(id).populate('foundReport');
  if (!claim) {
    res.status(404).json({ success: false, message: 'Claim not found.' });
    return;
  }

  // Strictly verify that only the claimant (the owner) can confirm receipt
  if (claim.claimant.toString() !== req.user._id.toString()) {
    res.status(403).json({ success: false, message: 'Only the item owner can confirm receipt.' });
    return;
  }

  const foundItem = claim.foundReport as any;
  if (claim.status !== 'APPROVED') {
    res.status(409).json({ success: false, message: 'This claim is not awaiting a handover confirmation.' });
    return;
  }

  const recordedHandover = await ReturnRecord.findOne({ claim: claim._id }).select('ownerConfirmed');
  if (!recordedHandover) {
    res.status(409).json({ success: false, message: 'The finder must record the physical handover before you can confirm receipt.' });
    return;
  }
  if (recordedHandover.ownerConfirmed) {
    res.status(409).json({ success: false, message: 'Receipt has already been confirmed.' });
    return;
  }

  const session = await mongoose.startSession();
  let returnRecord: any;
  const confirmedRating = rating || 5;
  try {
    await session.withTransaction(async () => {
      returnRecord = await ReturnRecord.findOneAndUpdate(
        { claim: claim._id, ownerConfirmed: false },
        {
          $set: {
            ownerConfirmed: true,
            ownerConfirmedAt: new Date(),
            ownerFeedback: feedback?.trim() || 'Thank you for safely returning my item.',
            ownerRating: confirmedRating,
          },
        },
        { new: true, session },
      );
      if (!returnRecord) {
        const existingReturn = await ReturnRecord.findOne({ claim: claim._id }).session(session);
        const error = new Error(
          existingReturn
            ? 'Receipt has already been confirmed.'
            : 'The finder must record the physical handover before you can confirm receipt.',
        ) as Error & { statusCode?: number };
        error.statusCode = 409;
        throw error;
      }

      const updatedClaim = await Claim.findOneAndUpdate(
        { _id: claim._id, status: 'APPROVED' },
        { $set: { status: 'RETURNED' } },
        { new: true, session },
      );
      if (!updatedClaim) {
        const error = new Error('This claim is no longer awaiting receipt confirmation.') as Error & { statusCode?: number };
        error.statusCode = 409;
        throw error;
      }

      const updatedFound = await FoundReport.findByIdAndUpdate(
        foundItem._id,
        { $set: { status: 'RETURNED' } },
        { session },
      );
      if (!updatedFound) {
        throw new Error('The found item could not be finalized for return.');
      }

      if (claim.lostReport) {
        await LostReport.findByIdAndUpdate(claim.lostReport, { $set: { status: 'RETURNED' } }, { session });
      }

      await LostFoundMatch.updateMany(
        {
          $or: [
            { foundReport: foundItem._id },
            ...(claim.lostReport ? [{ lostReport: claim.lostReport }] : []),
          ],
        },
        { $set: { status: 'CONFIRMED' } },
        { session },
      );

      const updateFinder: Record<string, Record<string, number>> = {
        $inc: { 'reputation.itemsReturned': 1 },
      };
      if (confirmedRating >= 4) updateFinder.$inc['reputation.positiveReviews'] = 1;
      await User.findByIdAndUpdate(foundItem.finder, updateFinder, { session });
      await User.findByIdAndUpdate(
        req.user!._id,
        { $inc: { 'reputation.itemsRecovered': 1 } },
        { session },
      );
    });
  } finally {
    await session.endSession();
  }

  claim.status = 'RETURNED';
  foundItem.status = 'RETURNED';
  const finderId = foundItem.finder;
  await sendNotification({
    recipientId: finderId,
    title: 'Owner Confirmed Property Receipt!',
    message: `${req.user.name} confirmed safe receipt of "${foundItem.title}" and left a thank-you review!`,
    type: 'CLAIM',
    link: '/claims',
    metadata: { claimId: claim._id },
  });
  await sendNotification({
    recipientId: req.user._id,
    title: 'Return Certificate Complete — Thank You!',
    message: `You confirmed safe receipt of "${foundItem.title}". Thank you for closing the loop and helping build trust in the FindBack community.`,
    type: 'CLAIM',
    link: '/claims',
    metadata: { claimId: claim._id },
  });

  await logAudit({
    actorId: req.user._id,
    action: 'RETURN_CONFIRMED_BY_OWNER',
    entityType: 'ReturnRecord',
    entityId: returnRecord._id,
    notes: `Owner #${req.user._id} confirmed receipt of "${foundItem.title}". Rating: ${confirmedRating}`,
    ipAddress: req.ip,
  });

  res.json({
    success: true,
    message: 'Receipt confirmed. Your return certificate is complete—thank you for helping make this a trusted handover.',
    returnRecord,
    claim,
  });
}
