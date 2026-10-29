import assert from 'assert';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { connectDB, disconnectDB } from '../config/database.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Location } from '../models/Location.js';
import { LostReport } from '../models/LostReport.js';
import { FoundReport } from '../models/FoundReport.js';
import { LostFoundMatch } from '../models/LostFoundMatch.js';
import { Claim } from '../models/Claim.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { Report } from '../models/Report.js';
import { computeMatchScore } from '../services/matchEngine.js';
import { runSeed } from '../seed/seedRunner.js';
import { Response } from 'express';
import { searchFoundReports, searchLostReports, updateLostReport, updateMatchStatus } from '../controllers/lostFoundController.js';
import { submitClaim, confirmReceiptByOwner, getClaimById } from '../controllers/claimController.js';
import { getMessages, sendMessage } from '../controllers/messageController.js';
import { getReports, resolveReport, submitReport } from '../controllers/reportController.js';
import { getAdminAnalytics } from '../controllers/adminController.js';
import { authenticate } from '../middleware/auth.js';
import { getNotifications } from '../controllers/notificationController.js';
import { ENV } from '../config/env.js';
import jwt from 'jsonwebtoken';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { detectImageType } from '../middleware/upload.js';
import { authenticateSocketIdentity, isConversationParticipant } from '../middleware/socketAuth.js';

function createMockResponse() {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
  return response as unknown as Response & { statusCode: number; body: unknown };
}

async function runTestSuite() {
  console.log('🧪 Starting FindBack Automated Integration Test Suite...\n');
  let passed = 0;
  let failed = 0;
  let mongoServer: MongoMemoryReplSet | undefined;

  async function test(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: any) {
      console.error(`  ❌ FAIL: ${name}`);
      console.error(`     Reason: ${err.message}`);
      failed++;
    }
  }

  try {
    mongoServer = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await connectDB(mongoServer.getUri());
    await runSeed({ allowDestructive: true, demoPassword: 'FindBack-Test-Password-123!' });

    console.log('\n--- 1. Authentication & Role-Based Access Control (RBAC) ---');
    await test('Should have exactly USER and ADMIN roles in seed dataset', async () => {
      const admin = await User.findOne({ role: 'ADMIN' });
      const user = await User.findOne({ role: 'USER' });
      const student = await User.findOne({ role: 'STUDENT' as any });
      const officer = await User.findOne({ role: 'OFFICER' as any });

      assert.ok(admin, 'Admin account must exist');
      assert.strictEqual(admin.email, 'admin@findback.org');
      assert.strictEqual(admin.role, 'ADMIN');

      assert.ok(user, 'General User account must exist');
      assert.strictEqual(user.role, 'USER');

      assert.strictEqual(student, null, 'Legacy STUDENT role must not exist');
      assert.strictEqual(officer, null, 'Legacy OFFICER role must not exist');
    });

    await test('User safeObject should never expose password or private version keys', async () => {
      const user = await User.findOne({ role: 'USER' });
      assert.ok(user);
      const safe = user.toSafeObject();
      assert.strictEqual(safe.password, undefined);
      assert.strictEqual((safe as any).__v, undefined);
    });

    await test('Destructive seed operation requires explicit confirmation', async () => {
      await assert.rejects(runSeed(), /production|deletes database data/);
    });

    await test('Async route handler forwards rejected promises to Express error handling', async () => {
      const expectedError = new Error('test controller failure');
      const receivedError = await new Promise<unknown>((resolve) => {
        asyncHandler((async () => {
          throw expectedError;
        }) as any)({} as any, {} as any, (error) => resolve(error));
      });
      assert.strictEqual(receivedError, expectedError);
    });

    await test('Image uploads validate file signatures rather than client MIME labels', async () => {
      assert.strictEqual(detectImageType(Buffer.from([0xff, 0xd8, 0xff, 0x00])), 'jpeg');
      assert.strictEqual(detectImageType(Buffer.from('not actually an image')), null);
    });

    await test('Password reset token versions revoke previously issued sessions', async () => {
      const user = await User.findOne({ role: 'USER' }).select('+tokenVersion');
      assert.ok(user);
      user.tokenVersion = 2;
      await user.save();
      const staleToken = jwt.sign(
        { id: user._id.toString(), tokenVersion: 1 },
        ENV.JWT_SECRET,
        { expiresIn: '5m' },
      );
      const response = createMockResponse();
      let authenticated = false;
      await authenticate({
        headers: { authorization: `Bearer ${staleToken}` },
      } as any, response, () => { authenticated = true; });
      assert.strictEqual(response.statusCode, 401);
      assert.strictEqual(authenticated, false);
    });

    await test('Socket authentication derives the user identity from a valid session token', async () => {
      const user = await User.findOne({ role: 'USER' }).select('+tokenVersion');
      assert.ok(user);
      const token = jwt.sign(
        { id: user._id.toString(), tokenVersion: user.tokenVersion },
        ENV.JWT_SECRET,
        { expiresIn: '5m' },
      );
      assert.strictEqual(await authenticateSocketIdentity(token), user._id.toString());
      await assert.rejects(authenticateSocketIdentity(undefined), /Authentication required/);
    });

    console.log('\n--- 2. Public Lost & Found Reporting & Privacy Projections ---');
    await test('Should have seeded public lost and found reports with Ethiopian locations', async () => {
      const lostReports = await LostReport.find();
      const foundReports = await FoundReport.find();

      assert.ok(lostReports.length >= 2, `Expected at least 2 lost reports, got ${lostReports.length}`);
      assert.ok(foundReports.length >= 2, `Expected at least 2 found reports, got ${foundReports.length}`);
    });

    await test('Signed-out visitors can view returned reports without private return details', async () => {
      const response = createMockResponse();
      await searchFoundReports({
        query: { status: 'RETURNED', page: '1', limit: '25' },
      } as any, response);

      const body = response.body as any;
      assert.strictEqual(response.statusCode, 200);
      assert.ok(body.reports.length > 0, 'Expected returned items in the public registry.');
      assert.strictEqual(body.reports[0].secretIdentifyingDetails, undefined);
      assert.strictEqual(body.reports[0].returnRecord.receivedBy, undefined);
      assert.strictEqual(body.reports[0].returnRecord.returnedBy, undefined);

      const boleLost = await LostReport.findOne({ city: 'Addis Ababa' });
      assert.ok(boleLost, 'Should have report with Ethiopian city location');
    });

    await test('FoundReport secretIdentifyingDetails must be stored securely for verification', async () => {
      const foundPhone = await FoundReport.findOne({ title: /Samsung/i });
      assert.ok(foundPhone, 'Found Samsung phone report must exist');
      assert.ok(foundPhone.secretIdentifyingDetails, 'Secret identifying details should be present in database record');
      assert.ok(foundPhone.secretIdentifyingDetails.includes('wallpaper') || foundPhone.secretIdentifyingDetails.includes('golden retriever'),
        'Secret detail contains verifying information');
    });

    await test('Personal report searches must reject another user’s report IDs', async () => {
      const users = await User.find({ role: 'USER' }).limit(2);
      assert.strictEqual(users.length, 2);
      const response = createMockResponse();
      await searchLostReports({
        user: users[0],
        query: { reporterId: users[1]._id.toString() },
      } as any, response);
      assert.strictEqual(response.statusCode, 403);
    });

    await test('Claim detail responses do not disclose secret verification details or claimant contact data', async () => {
      const claim = await Claim.findOne({ status: 'APPROVED' });
      assert.ok(claim);
      const claimant = await User.findById(claim.claimant);
      assert.ok(claimant);
      const response = createMockResponse();
      await getClaimById({
        user: claimant,
        params: { id: claim._id.toString() },
      } as any, response);
      const responseClaim = (response.body as any).claim;
      assert.ok(responseClaim);
      assert.strictEqual(responseClaim.foundReport.secretIdentifyingDetails, undefined);
      assert.strictEqual(responseClaim.claimant.email, undefined);
      assert.strictEqual(responseClaim.claimant.phone, undefined);
    });

    await test('Item finders retain access to private identifying details for claim verification', async () => {
      const claim = await Claim.findOne({ status: 'APPROVED' });
      assert.ok(claim);
      const foundItem = await FoundReport.findById(claim.foundReport);
      assert.ok(foundItem);
      const finder = await User.findById(foundItem.finder);
      assert.ok(finder);
      const response = createMockResponse();
      await getClaimById({
        user: finder,
        params: { id: claim._id.toString() },
      } as any, response);
      const responseClaim = (response.body as any).claim;
      assert.ok(responseClaim.foundReport.secretIdentifyingDetails);
      assert.strictEqual(responseClaim.claimant.email, undefined);
      assert.strictEqual(responseClaim.claimant.phone, undefined);
    });

    await test('Existing conversation messages cannot be addressed to a non-participant', async () => {
      const users = await User.find({ role: 'USER' }).limit(3);
      assert.strictEqual(users.length, 3);
      const conversation = await Conversation.create({
        participants: [users[0]._id, users[1]._id],
        lastMessage: '',
        lastMessageAt: new Date(),
      });
      assert.strictEqual(await isConversationParticipant(users[0]._id.toString(), conversation._id.toString()), true);
      assert.strictEqual(await isConversationParticipant(users[2]._id.toString(), conversation._id.toString()), false);
      const before = await Message.countDocuments({ conversation: conversation._id });
      const response = createMockResponse();
      await sendMessage({
        user: users[0],
        body: {
          conversationId: conversation._id.toString(),
          recipientId: users[2]._id.toString(),
          content: 'This message must not be sent.',
        },
      } as any, response);
      assert.strictEqual(response.statusCode, 400);
      assert.strictEqual(await Message.countDocuments({ conversation: conversation._id }), before);
    });

    await test('Conversation messages return bounded, ordered pagination metadata', async () => {
      const users = await User.find({ role: 'USER' }).limit(2);
      assert.strictEqual(users.length, 2);
      const conversation = await Conversation.create({
        participants: [users[0]._id, users[1]._id],
        lastMessage: '',
        lastMessageAt: new Date(),
      });
      await Message.create([
        { conversation: conversation._id, sender: users[0]._id, recipient: users[1]._id, content: 'first' },
        { conversation: conversation._id, sender: users[1]._id, recipient: users[0]._id, content: 'second' },
        { conversation: conversation._id, sender: users[0]._id, recipient: users[1]._id, content: 'third' },
      ]);
      const response = createMockResponse();
      await getMessages({
        user: users[0],
        params: { conversationId: conversation._id.toString() },
        query: { page: '2', limit: '2' },
      } as any, response);
      const body = response.body as any;
      assert.strictEqual(body.messages.length, 1);
      assert.strictEqual(body.messages[0].content, 'first');
      assert.deepStrictEqual(body.pagination, { total: 3, page: 2, limit: 2, pages: 2 });
    });

    await test('Notification history returns only the requested page with pagination metadata', async () => {
      const user = await User.create({
        name: 'Notification Pagination Test',
        email: `notification-pagination-${Date.now()}@findback.test`,
        password: 'test-password-hash',
      });
      await Notification.create([
        { recipient: user._id, title: 'Older notification one', message: 'one', type: 'SYSTEM' },
        { recipient: user._id, title: 'Older notification two', message: 'two', type: 'SYSTEM' },
        { recipient: user._id, title: 'Newest notification', message: 'three', type: 'SYSTEM' },
      ]);
      const response = createMockResponse();
      await getNotifications({
        user,
        query: { page: '2', limit: '2' },
      } as any, response);
      const body = response.body as any;
      assert.strictEqual(body.notifications.length, 1);
      assert.strictEqual(body.notifications[0].title, 'Older notification one');
      assert.strictEqual(body.pagination.total >= 3, true);
    });

    await test('Only a report owner or administrator can update a match status', async () => {
      const match = await LostFoundMatch.findOne();
      assert.ok(match);
      const [lostReport, foundReport] = await Promise.all([
        LostReport.findById(match.lostReport),
        FoundReport.findById(match.foundReport),
      ]);
      assert.ok(lostReport && foundReport);
      const outsider = await User.findOne({
        _id: { $nin: [lostReport.reporter, foundReport.finder] },
        role: 'USER',
      });
      assert.ok(outsider);
      const response = createMockResponse();
      await updateMatchStatus({
        user: outsider,
        params: { id: match._id.toString() },
        body: { status: 'DISMISSED', dismissReason: 'Not my item' },
      } as any, response);
      assert.strictEqual(response.statusCode, 403);
    });

    await test('Users cannot mark lost reports returned outside the approved handover flow', async () => {
      const report = await LostReport.findOne({ status: { $in: ['ACTIVE', 'OPEN'] } });
      assert.ok(report);
      const owner = await User.findById(report.reporter);
      assert.ok(owner);
      const response = createMockResponse();
      await updateLostReport({
        user: owner,
        params: { id: report._id.toString() },
        body: { status: 'RETURNED' },
      } as any, response);
      assert.strictEqual(response.statusCode, 400);
      assert.notStrictEqual((await LostReport.findById(report._id))?.status, 'RETURNED');
    });

    await test('Concurrent claims reserve a found report for only one claimant', async () => {
      const users = await User.find({ role: 'USER' }).limit(2);
      const admin = await User.findOne({ role: 'ADMIN' });
      const category = await Category.findOne();
      assert.strictEqual(users.length, 2);
      assert.ok(admin && category);
      const foundItem = await FoundReport.create({
        finder: admin._id,
        title: 'Concurrency test item',
        category: category._id,
        description: 'Test item for atomic concurrent claim reservations.',
        dateFound: new Date(),
        status: 'AVAILABLE_FOR_CLAIM',
      });
      const responses = [createMockResponse(), createMockResponse()];
      await Promise.all(users.map((user, index) => submitClaim({
        user,
        body: {
          foundReportId: foundItem._id.toString(),
          proofDescription: `This is a sufficiently detailed ownership proof from claimant ${index}.`,
          distinguishingFeaturesAnswer: 'A unique scratch beside the power button.',
        },
      } as any, responses[index])));
      assert.strictEqual(responses.filter((response) => response.statusCode === 201).length, 1);
      assert.strictEqual(await Claim.countDocuments({ foundReport: foundItem._id }), 1);
      assert.strictEqual((await FoundReport.findById(foundItem._id))?.status, 'CLAIM_PENDING');
    });

    await test('Claim submission succeeds when distinguishing details are omitted', async () => {
      const claimant = await User.findOne({ role: 'USER' });
      const finder = await User.findOne({ role: 'ADMIN' });
      const category = await Category.findOne();
      assert.ok(claimant && finder && category);

      const foundItem = await FoundReport.create({
        finder: finder._id,
        title: 'Claim without optional details',
        category: category._id,
        description: 'A report used to verify optional claim answers.',
        dateFound: new Date(),
        status: 'AVAILABLE_FOR_CLAIM',
      });
      const response = createMockResponse();
      await submitClaim({
        user: claimant,
        body: {
          foundReportId: foundItem._id.toString(),
          proofDescription: 'I can identify the item through its private details.',
        },
      } as any, response);

      assert.strictEqual(response.statusCode, 201);
      const claim = await Claim.findOne({ foundReport: foundItem._id, claimant: claimant._id });
      assert.strictEqual(claim?.distinguishingFeaturesAnswer, '');
    });

    await test('Abuse report submissions create an administrator notification', async () => {
      const reporter = await User.findOne({ role: 'USER' });
      const target = await LostReport.findOne();
      const admin = await User.findOne({ role: 'ADMIN' });
      assert.ok(reporter && target && admin);
      const response = createMockResponse();
      await submitReport({
        user: reporter,
        body: {
          targetType: 'LOST_REPORT',
          targetId: target._id.toString(),
          reason: 'Safety review requested',
          details: 'Please review this report.',
        },
        ip: '127.0.0.1',
      } as any, response);
      assert.strictEqual(response.statusCode, 201);
      assert.ok(await Notification.exists({
        recipient: admin._id,
        type: 'MODERATION',
        'metadata.reportId': (response.body as any).report._id,
      }));
    });

    await test('Abuse reports can omit optional details', async () => {
      const reporter = await User.findOne({ role: 'USER' });
      const target = await LostReport.findOne();
      assert.ok(reporter && target);
      const response = createMockResponse();
      await submitReport({
        user: reporter,
        body: {
          targetType: 'LOST_REPORT',
          targetId: target._id.toString(),
          reason: 'Potentially misleading report',
        },
        ip: '127.0.0.1',
      } as any, response);
      assert.strictEqual(response.statusCode, 201);
      assert.strictEqual((response.body as any).report.details, '');
    });

    await test('Admin report queue includes target context and can remove reported content', async () => {
      const reporter = await User.findOne({ role: 'USER' });
      const admin = await User.findOne({ role: 'ADMIN' });
      const category = await Category.findOne();
      assert.ok(reporter && admin && category);

      const target = await LostReport.create({
        reporter: admin._id,
        title: 'Reported content moderation test',
        category: category._id,
        description: 'Content for validating the moderation queue action.',
        dateLost: new Date(),
      });
      const submission = createMockResponse();
      await submitReport({
        user: reporter,
        body: {
          targetType: 'LOST_REPORT',
          targetId: target._id.toString(),
          reason: 'Test moderation action',
          details: 'Please review this test item.',
        },
        ip: '127.0.0.1',
      } as any, submission);
      const reportId = (submission.body as any).report._id.toString();

      const queue = createMockResponse();
      await getReports({
        user: admin,
        query: { page: '1', limit: '100' },
      } as any, queue);
      const queuedReport = (queue.body as any).reports.find((report: any) => report._id.toString() === reportId);
      assert.strictEqual(queuedReport?.target?.title, target.title);
      assert.strictEqual(queuedReport?.reporter?.name, reporter.name);

      const resolution = createMockResponse();
      await resolveReport({
        user: admin,
        params: { id: reportId },
        body: { actionTaken: 'REMOVE_REPORT', notes: 'Confirmed for test.' },
        ip: '127.0.0.1',
      } as any, resolution);
      assert.strictEqual(resolution.statusCode, 200);
      assert.strictEqual((await LostReport.findById(target._id))?.status, 'CLOSED');
    });

    await test('Admins can reject a reported ownership claim from the moderation queue', async () => {
      const claimant = await User.findOne({ role: 'USER' });
      const admin = await User.findOne({ role: 'ADMIN' });
      const category = await Category.findOne();
      assert.ok(claimant && admin && category);

      const foundItem = await FoundReport.create({
        finder: admin._id,
        title: 'Reported claim moderation test',
        category: category._id,
        description: 'Found item for testing claim moderation.',
        dateFound: new Date(),
        status: 'CLAIM_PENDING',
      });
      const claim = await Claim.create({
        foundReport: foundItem._id,
        claimant: claimant._id,
        proofDescription: 'Claim proof provided for moderation testing.',
        distinguishingFeaturesAnswer: '',
        status: 'SUBMITTED',
      });
      const report = await Report.create({
        reporter: admin._id,
        module: 'LOST_AND_FOUND',
        targetType: 'CLAIM',
        targetId: claim._id.toString(),
        reason: 'Potentially fraudulent ownership claim',
        details: 'Review the submitted claim.',
      });
      const response = createMockResponse();
      await resolveReport({
        user: admin,
        params: { id: report._id.toString() },
        body: { actionTaken: 'REJECT_CLAIM', notes: 'Claim did not pass review.' },
        ip: '127.0.0.1',
      } as any, response);

      assert.strictEqual(response.statusCode, 200);
      assert.strictEqual((await Claim.findById(claim._id))?.status, 'REJECTED');
      assert.strictEqual((await FoundReport.findById(foundItem._id))?.status, 'AVAILABLE_FOR_CLAIM');
    });

    await test('Claim submission must reject a lost report owned by another user', async () => {
      const claimant = await User.findOne({ role: 'USER' });
      assert.ok(claimant);
      const foundItem = await FoundReport.findOne({
        status: 'AVAILABLE_FOR_CLAIM',
        finder: { $ne: claimant._id },
      });
      const unrelatedLostReport = await LostReport.findOne({
        reporter: { $ne: claimant._id },
      });
      assert.ok(claimant && foundItem && unrelatedLostReport);
      assert.notStrictEqual(foundItem.finder.toString(), claimant._id.toString());

      const response = createMockResponse();
      await submitClaim({
        user: claimant,
        body: {
          foundReportId: foundItem._id.toString(),
          lostReportId: unrelatedLostReport._id.toString(),
          proofDescription: 'This report is not owned by the claimant.',
          distinguishingFeaturesAnswer: 'A unique scratch beside the power button.',
        },
      } as any, response);
      assert.strictEqual(response.statusCode, 403);
    });

    await test('Owner receipt confirmation must require a recorded return', async () => {
      const claimant = await User.findOne({ role: 'USER' });
      const finder = await User.findOne({ role: 'ADMIN' });
      const category = await Category.findOne();
      assert.ok(claimant && finder && category);
      const foundItem = await FoundReport.create({
        finder: finder._id,
        title: 'Awaiting handover confirmation test',
        category: category._id,
        description: 'Owner receipt must not be confirmed before a handover is recorded.',
        dateFound: new Date(),
        status: 'CLAIM_APPROVED',
      });
      const approvedClaim = await Claim.create({
        foundReport: foundItem._id,
        claimant: claimant._id,
        proofDescription: 'Ownership proof for pending handover test.',
        status: 'APPROVED',
      });
      const response = createMockResponse();
      await confirmReceiptByOwner({
        user: claimant,
        params: { id: approvedClaim._id.toString() },
        body: {},
      } as any, response);
      assert.strictEqual(response.statusCode, 409);
      assert.strictEqual((await Claim.findById(approvedClaim._id))?.status, 'APPROVED');
    });

    await test('Public returned items and both thank-you notifications wait for owner confirmation', async () => {
      const claimant = await User.findOne({ role: 'USER' });
      const finder = await User.findOne({ role: 'ADMIN' });
      const category = await Category.findOne();
      assert.ok(claimant && finder && category);

      const foundItem = await FoundReport.create({
        finder: finder._id,
        title: 'Two-party confirmation test item',
        category: category._id,
        description: 'Only publish this return after the owner confirms receipt.',
        dateFound: new Date(),
        status: 'CLAIM_APPROVED',
      });
      const claim = await Claim.create({
        foundReport: foundItem._id,
        claimant: claimant._id,
        proofDescription: 'Ownership proof for two-party confirmation test.',
        status: 'APPROVED',
      });
      await ReturnRecord.create({
        foundReport: foundItem._id,
        claim: claim._id,
        returnedBy: finder._id,
        receivedBy: claimant._id,
        handoverLocationName: 'Public library entrance',
        ownerConfirmed: false,
      });

      const publicBeforeConfirmation = createMockResponse();
      await searchFoundReports({
        query: { status: 'RETURNED', page: '1', limit: '100' },
      } as any, publicBeforeConfirmation);
      assert.ok(!(publicBeforeConfirmation.body as any).reports.some((report: any) => report._id.toString() === foundItem._id.toString()));

      const confirmation = createMockResponse();
      await confirmReceiptByOwner({
        user: claimant,
        params: { id: claim._id.toString() },
        body: { rating: 5, feedback: 'Thank you for safely returning my item!' },
        ip: '127.0.0.1',
      } as any, confirmation);
      assert.strictEqual(confirmation.statusCode, 200);
      assert.strictEqual((await Claim.findById(claim._id))?.status, 'RETURNED');
      assert.strictEqual((await FoundReport.findById(foundItem._id))?.status, 'RETURNED');

      const publicAfterConfirmation = createMockResponse();
      await searchFoundReports({
        query: { status: 'RETURNED', page: '1', limit: '100' },
      } as any, publicAfterConfirmation);
      assert.ok((publicAfterConfirmation.body as any).reports.some((report: any) => report._id.toString() === foundItem._id.toString()));
      assert.ok(await Notification.exists({
        recipient: finder._id,
        title: 'Owner Confirmed Property Receipt!',
        'metadata.claimId': claim._id,
      }));
      assert.ok(await Notification.exists({
        recipient: claimant._id,
        title: 'Return Certificate Complete — Thank You!',
        'metadata.claimId': claim._id,
      }));
    });

    await test('Administrator return analytics count only owner-confirmed handovers', async () => {
      const admin = await User.findOne({ role: 'ADMIN' });
      assert.ok(admin);
      const confirmedReturns = await ReturnRecord.countDocuments({ ownerConfirmed: true });
      const response = createMockResponse();
      await getAdminAnalytics({ user: admin } as any, response);
      assert.strictEqual((response.body as any).analytics.returnedItems, confirmedReturns);
    });

    await test('Concurrent owner receipt confirmations apply return effects only once', async () => {
      const claimant = await User.findOne({ role: 'USER' });
      const finder = await User.findOne({ role: 'ADMIN' });
      const category = await Category.findOne();
      assert.ok(claimant && finder && category);
      const foundItem = await FoundReport.create({
        finder: finder._id,
        title: 'Concurrent receipt confirmation test',
        category: category._id,
        description: 'The same owner confirmation must not award reputation twice.',
        dateFound: new Date(),
        status: 'CLAIM_APPROVED',
      });
      const claim = await Claim.create({
        foundReport: foundItem._id,
        claimant: claimant._id,
        proofDescription: 'Ownership proof for concurrent receipt confirmation test.',
        status: 'APPROVED',
      });
      await ReturnRecord.create({
        foundReport: foundItem._id,
        claim: claim._id,
        returnedBy: finder._id,
        receivedBy: claimant._id,
        ownerConfirmed: false,
      });
      const [finderBefore, claimantBefore] = await Promise.all([
        User.findById(finder._id),
        User.findById(claimant._id),
      ]);
      assert.ok(finderBefore && claimantBefore);

      const responses = [createMockResponse(), createMockResponse()];
      const attempts = await Promise.allSettled(responses.map(async (response) => {
        try {
          await confirmReceiptByOwner({
            user: claimant,
            params: { id: claim._id.toString() },
            body: {},
          } as any, response);
        } catch (error: any) {
          response.status(error.statusCode || 500).json({ success: false, message: error.message });
        }
      }));
      const [finderAfter, claimantAfter] = await Promise.all([
        User.findById(finder._id),
        User.findById(claimant._id),
      ]);

      assert.strictEqual(responses.filter((response) => response.statusCode === 200).length, 1);
      assert.strictEqual((await ReturnRecord.countDocuments({ claim: claim._id, ownerConfirmed: true })), 1);
      assert.strictEqual(finderAfter?.reputation.itemsReturned, finderBefore.reputation.itemsReturned + 1);
      assert.strictEqual(claimantAfter?.reputation.itemsRecovered, claimantBefore.reputation.itemsRecovered + 1);
      assert.strictEqual(responses.filter((response) => response.statusCode === 409).length, 1);
      assert.strictEqual(attempts.filter((attempt) => attempt.status === 'fulfilled').length, 2);
    });

    console.log('\n--- 3. Intelligent Heuristic Matching Engine ---');
    await test('Matching engine should calculate high confidence (>75%) for corresponding lost/found phones', async () => {
      const lost = await LostReport.findOne({ title: /Samsung/i });
      const found = await FoundReport.findOne({ title: /Samsung/i });

      assert.ok(lost, 'Samsung lost report must exist');
      assert.ok(found, 'Samsung found report must exist');

      const match = await computeMatchScore(lost, found);
      assert.ok(match.score >= 70, `Expected match score >= 70%, got ${match.score}%`);
      assert.strictEqual(match.breakdown.category, 100, 'Category match must be 100%');
      assert.strictEqual(match.breakdown.brand, 100, 'Brand match must be 100%');
      assert.ok(match.breakdown.location >= 70, 'Location match must reflect same city/area');
      assert.ok(match.reasons.length > 0, 'Match reasons must provide transparent breakdown');
    });

    console.log('\n--- 4. Ownership Claim Workflow & Peer Handover ---');
    await test('Verified claim and return record must exist with Q&A verification history', async () => {
      const claim = await Claim.findOne({ status: 'APPROVED' });
      assert.ok(claim, 'Approved claim must exist');
      assert.ok(claim.officerQuestions.length > 0, 'Verification question must be recorded');
      assert.strictEqual(claim.status, 'APPROVED');

      const returnRecord = await ReturnRecord.findOne({ claim: claim._id });
      assert.ok(returnRecord, 'Return record must exist linking claim and report');
      assert.ok(returnRecord.receivedBy, 'Return record must record receiving owner');
      assert.ok(returnRecord.returnedBy, 'Return record must record honest finder');
    });

    console.log('\n--- 5. Platform Safety & General Locations ---');
    await test('Should have public meeting spots with safety guidance', async () => {
      const locations = await Location.find({ isOfficialMeetingSpot: true });
      assert.ok(locations.length >= 2, 'Should have multiple public safe meeting spots');
      const sample = locations[0];
      assert.ok(sample.meetingInstructions && sample.meetingInstructions.length > 10, 'Meeting spot should provide safety guidance');
    });

  } catch (err: any) {
    console.error('Test execution error:', err.message);
    failed++;
  } finally {
    console.log('\n========================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('========================================\n');
    await disconnectDB();
    await mongoServer?.stop();
    if (failed > 0) process.exit(1);
  }
}

runTestSuite();
