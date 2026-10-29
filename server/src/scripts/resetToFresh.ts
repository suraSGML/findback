/**
 * resetToFresh.ts
 * ---------------
 * Clears all demo/seeded user data so the platform can start fresh with real data.
 *
 * What is REMOVED:
 *   - All regular users (non-admin)
 *   - All lost reports
 *   - All found reports
 *   - All matches
 *   - All claims
 *   - All return records
 *   - All conversations & messages
 *   - All notifications
 *   - All abuse reports
 *   - All audit logs
 *
 * What is KEPT (reference/config data):
 *   - Categories         (needed for report forms)
 *   - Locations          (safe meeting spots)
 *   - SystemPolicy       (platform rules / email domain settings)
 *   - The ADMIN account  (so you can log in after reset)
 *
 * Run with:  npm run reset
 */

import { connectDB, disconnectDB } from '../config/database.js';
import { User } from '../models/User.js';
import { LostReport } from '../models/LostReport.js';
import { FoundReport } from '../models/FoundReport.js';
import { LostFoundMatch } from '../models/LostFoundMatch.js';
import { Claim } from '../models/Claim.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { Notification } from '../models/Notification.js';
import { Report } from '../models/Report.js';
import { AuditLog } from '../models/AuditLog.js';

async function resetToFresh(): Promise<void> {
  console.log('\n🗑️  FindBack — Reset to Fresh Start');
  console.log('=====================================');

  await connectDB();

  // --- Transactional / user-generated data ---
  const [
    lostCount,
    foundCount,
    matchCount,
    claimCount,
    returnCount,
    convoCount,
    msgCount,
    notifCount,
    reportCount,
    auditCount,
  ] = await Promise.all([
    LostReport.deleteMany({}).then((r) => r.deletedCount),
    FoundReport.deleteMany({}).then((r) => r.deletedCount),
    LostFoundMatch.deleteMany({}).then((r) => r.deletedCount),
    Claim.deleteMany({}).then((r) => r.deletedCount),
    ReturnRecord.deleteMany({}).then((r) => r.deletedCount),
    Conversation.deleteMany({}).then((r) => r.deletedCount),
    Message.deleteMany({}).then((r) => r.deletedCount),
    Notification.deleteMany({}).then((r) => r.deletedCount),
    Report.deleteMany({}).then((r) => r.deletedCount),
    AuditLog.deleteMany({}).then((r) => r.deletedCount),
  ]);

  // --- Users: remove everyone except the ADMIN account ---
  const userCount = await User.deleteMany({ role: { $ne: 'ADMIN' } }).then(
    (r) => r.deletedCount,
  );

  console.log('\nCleared:');
  console.log(`  ✓ ${lostCount}   lost reports`);
  console.log(`  ✓ ${foundCount}   found reports`);
  console.log(`  ✓ ${matchCount}   matches`);
  console.log(`  ✓ ${claimCount}   claims`);
  console.log(`  ✓ ${returnCount}   return records`);
  console.log(`  ✓ ${convoCount}   conversations`);
  console.log(`  ✓ ${msgCount}   messages`);
  console.log(`  ✓ ${notifCount}   notifications`);
  console.log(`  ✓ ${reportCount}   abuse reports`);
  console.log(`  ✓ ${auditCount}   audit log entries`);
  console.log(`  ✓ ${userCount}   demo user accounts`);

  const remaining = await User.find({ role: 'ADMIN' }).select('name email');
  console.log('\nKept (reference data):');
  console.log('  ✓ Categories, Locations, SystemPolicy');
  if (remaining.length > 0) {
    console.log('  ✓ Admin account(s):');
    for (const u of remaining) {
      console.log(`      — ${u.name} <${u.email}>`);
    }
  }

  console.log('\n✅ Database reset complete. Ready for real data.\n');
  await disconnectDB();
  process.exit(0);
}

resetToFresh().catch((err) => {
  console.error('\n❌ Reset failed:', err);
  process.exit(1);
});
