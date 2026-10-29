import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/database.js';
import { User } from '../models/User.js';
import { Category } from '../models/Category.js';
import { Location } from '../models/Location.js';
import { Conversation } from '../models/Conversation.js';
import { Message } from '../models/Message.js';
import { LostReport } from '../models/LostReport.js';
import { FoundReport } from '../models/FoundReport.js';
import { LostFoundMatch } from '../models/LostFoundMatch.js';
import { Claim } from '../models/Claim.js';
import { ReturnRecord } from '../models/ReturnRecord.js';
import { Report } from '../models/Report.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { SystemPolicy } from '../models/SystemPolicy.js';
import { getSeedData } from './seedData.js';
import { computeMatchScore } from '../services/matchEngine.js';
import { assertDestructiveCommandAllowed } from '../scripts/destructiveGuard.js';

export async function runSeed(options: { allowDestructive?: boolean; demoPassword?: string } = {}): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database seeding is disabled in production.');
  }
  if (!options.allowDestructive) {
    assertDestructiveCommandAllowed('seed');
  }
  if (!options.demoPassword || options.demoPassword.length < 12) {
    throw new Error('A SEED_DEMO_PASSWORD of at least 12 characters is required.');
  }

  console.log('[Seed] Starting FindBack database seed process...');
  if (mongoose.connection.readyState !== 1) {
    await connectDB();
  }

  // Clear existing collections safely
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Location.deleteMany({}),
    Conversation.deleteMany({}),
    Message.deleteMany({}),
    LostReport.deleteMany({}),
    FoundReport.deleteMany({}),
    LostFoundMatch.deleteMany({}),
    Claim.deleteMany({}),
    ReturnRecord.deleteMany({}),
    Report.deleteMany({}),
    Notification.deleteMany({}),
    AuditLog.deleteMany({}),
    SystemPolicy.deleteMany({}),
  ]);

  console.log('[Seed] Cleared old records.');

  // 1. Initialize Platform Policy
  const policy = await SystemPolicy.create({
    platformName: 'FindBack',
    allowedEmailDomains: [], // Open to all public emails
  });

  // 2. Load Base Data
  const { users, categories, locations } = await getSeedData(options.demoPassword);

  const createdUsers = await User.insertMany(users);
  const createdCategories = await Category.insertMany(categories);
  const createdLocations = await Location.insertMany(locations);

  console.log(`[Seed] Seeded ${createdUsers.length} users, ${createdCategories.length} categories, ${createdLocations.length} locations.`);

  // User Lookups
  const adminUser = createdUsers.find((u) => u.email === 'admin@findback.org')!;
  const amina = createdUsers.find((u) => u.email === 'user@findback.org')!;
  const dawit = createdUsers.find((u) => u.email === 'dawit@findback.org')!;
  const chloe = createdUsers.find((u) => u.email === 'chloe@findback.org')!;
  const robel = createdUsers.find((u) => u.email === 'robel@findback.org')!;

  // Category Lookups
  const catPhones = createdCategories.find((c) => c.slug === 'phones-tablets')!;
  const catWallets = createdCategories.find((c) => c.slug === 'wallets-purses-cards')!;
  const catKeys = createdCategories.find((c) => c.slug === 'keys-keychains')!;
  const catBags = createdCategories.find((c) => c.slug === 'bags-backpacks')!;
  const catHeadphones = createdCategories.find((c) => c.slug === 'headphones-audio')!;

  // Location Lookups
  const locBole = createdLocations.find((l) => l.area === 'Bole')!;
  const locMeskel = createdLocations.find((l) => l.area === 'Kirkos')!;
  const locPiassa = createdLocations.find((l) => l.area === 'Arada' && l.name.includes('Post Office'))!;
  const locAratKilo = createdLocations.find((l) => l.name.includes('Arat Kilo'))!;
  const locHawassa = createdLocations.find((l) => l.city === 'Hawassa')!;

  // 3. Scenario 1: Lost Phone (Samsung Galaxy S23 Ultra) $\leftrightarrow$ Found Phone in Bole
  // Amina reported lost phone
  const lostItem1 = await LostReport.create({
    reporter: amina._id,
    title: 'Samsung Galaxy S23 Ultra (Phantom Black)',
    category: catPhones._id,
    description: 'Black Samsung Galaxy S23 Ultra with a matte protective case. Lost while taking a ride near Bole Medhanealem taxi hub. Contains important personal notes and family photos.',
    color: 'Black',
    brand: 'Samsung',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    locationName: 'Bole Medhanealem taxi station',
    lastKnownLocation: locBole._id,
    dateLost: new Date(Date.now() - 3600 * 48 * 1000),
    approximateTime: 'Afternoon (14:30 - 15:30)',
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80'],
    distinguishingCharacteristics: 'Has a small circular magnetic ring on the back case and a slight hairline scrape on the bottom left corner.',
    status: 'RETURNED', // Successfully returned to Amina
  });

  // Dawit reported found Samsung phone
  const foundItem1 = await FoundReport.create({
    finder: dawit._id,
    title: 'Samsung Galaxy Smartphone with Black Protective Case',
    category: catPhones._id,
    description: 'Found unattended on a bench near Bole Medhanealem taxi rank. Phone is charged and kept safe with me.',
    color: 'Black',
    brand: 'Samsung',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    locationName: 'Bole Medhanealem pedestrian plaza',
    foundLocation: locBole._id,
    dateFound: new Date(Date.now() - 3600 * 45 * 1000),
    approximateTime: '15:15',
    custodyStatus: 'WITH_FINDER',
    secretIdentifyingDetails: 'Lock screen wallpaper shows a golden retriever dog; phone case has a circular black MagSafe magnetic sticker ring on back.',
    images: ['https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?auto=format&fit=crop&w=600&q=80'],
    status: 'RETURNED',
    matchedLostItem: lostItem1._id,
  });

  // Calculate Heuristic Match Score
  const matchResult1 = await computeMatchScore(lostItem1, foundItem1);
  const match1 = await LostFoundMatch.create({
    lostReport: lostItem1._id,
    foundReport: foundItem1._id,
    matchScore: matchResult1.score,
    breakdown: matchResult1.breakdown,
    reasons: matchResult1.reasons,
    status: 'CONFIRMED',
  });

  // Ownership Claim & Verification Q&A
  const claim1 = await Claim.create({
    foundReport: foundItem1._id,
    claimant: amina._id,
    lostReport: lostItem1._id,
    proofDescription: 'I was waiting for a ride at Bole Medhanealem around 2:45 PM and accidentally left my Samsung S23 Ultra on the bench.',
    distinguishingFeaturesAnswer: 'The lock screen wallpaper is my pet golden retriever, and the matte case has a magnetic charging ring affixed.',
    serialNumber: 'SM-S918B-BLACK-98124',
    officerQuestions: [
      {
        question: 'Finder Dawit: Can you describe the lockscreen photo or case accessories?',
        askedBy: dawit._id,
        askedAt: new Date(Date.now() - 3600 * 30 * 1000),
        answer: 'Amina: Yes! It is a golden retriever in green grass, and there is a magnetic ring on the case back.',
        answeredAt: new Date(Date.now() - 3600 * 28 * 1000),
      },
    ],
    status: 'APPROVED',
    reviewedBy: dawit._id,
    reviewDecisionNotes: 'Claimant correctly identified the confidential lock screen photo and specific case ring details.',
  });

  // Recorded Property Return
  const returnRecord1 = await ReturnRecord.create({
    foundReport: foundItem1._id,
    lostReport: lostItem1._id,
    claim: claim1._id,
    returnedBy: dawit._id,
    receivedBy: amina._id,
    returnDate: new Date(Date.now() - 3600 * 12 * 1000),
    pickupLocation: locBole._id,
    handoverLocationName: 'Bole Medhanealem Public Hub (Kaldi Coffee entrance)',
    notes: 'Safe daytime handover completed in public cafe. Owner verified device unlock PIN.',
    ownerConfirmed: true,
    ownerConfirmedAt: new Date(Date.now() - 3600 * 11 * 1000),
    ownerFeedback: 'Thank you for keeping my phone safe and meeting me in a public place.',
    ownerRating: 5,
  });

  // 4. Scenario 2: Active Found Wallet in Piassa
  const foundItem2 = await FoundReport.create({
    finder: chloe._id,
    title: 'Brown Leather Bi-Fold Wallet with Cards',
    category: catWallets._id,
    description: 'Found on the customer writing counter at the Piassa central post office. Contains national ID and commercial bank debit card.',
    color: 'Brown',
    brand: 'Leather',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    locationName: 'Piassa Heritage Post Office Plaza',
    foundLocation: locPiassa._id,
    dateFound: new Date(Date.now() - 3600 * 14 * 1000),
    approximateTime: '11:30 AM',
    custodyStatus: 'WITH_FINDER',
    secretIdentifyingDetails: 'CBE debit card ending in 4419; national ID card bearing initials "M. T."; small vintage coin in coin zipper pocket.',
    images: ['https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=600&q=80'],
    status: 'AVAILABLE_FOR_CLAIM',
  });

  // 5. Scenario 3: Active Lost Keys near Meskel Square
  const lostItem3 = await LostReport.create({
    reporter: robel._id,
    title: 'Toyota Car Key Fob with Silver Carabiner Keychain',
    category: catKeys._id,
    description: 'Lost set of keys including a black Toyota push-start fob, two brass house keys, and a silver heavy-duty carabiner clip. Misplaced around Meskel Square light rail concourse.',
    color: 'Black and Silver',
    brand: 'Toyota',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    locationName: 'Meskel Square Transport Hub concourse',
    lastKnownLocation: locMeskel._id,
    dateLost: new Date(Date.now() - 3600 * 24 * 1000),
    approximateTime: '08:45 AM',
    images: ['https://images.unsplash.com/photo-1582139329536-e7284fece509?auto=format&fit=crop&w=600&q=80'],
    distinguishingCharacteristics: 'Keychain has a miniature engraved metal tag from Hawassa.',
    status: 'ACTIVE',
  });

  // 6. Scenario 4: Misplaced Backpack in Hawassa
  const lostItem4 = await LostReport.create({
    reporter: robel._id,
    title: 'Navy Blue Wenger Laptop Backpack',
    category: catBags._id,
    description: 'Navy blue 15.6-inch laptop bag left near Hawassa Lake promenade seating. Contains a spiral notebook, business cards, and reading glasses.',
    color: 'Navy Blue',
    brand: 'Wenger',
    country: 'Ethiopia',
    region: 'Sidama',
    city: 'Hawassa',
    locationName: 'Hawassa Lake Central Promenade',
    lastKnownLocation: locHawassa._id,
    dateLost: new Date(Date.now() - 3600 * 60 * 1000),
    approximateTime: 'Evening (18:00)',
    images: ['https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=600&q=80'],
    status: 'ACTIVE',
  });

  // 7. Scenario 5: Found Headphones in Arat Kilo
  const foundItem5 = await FoundReport.create({
    finder: dawit._id,
    title: 'Sony WH-1000XM4 Noise Cancelling Wireless Headphones',
    category: catHeadphones._id,
    description: 'Found in their black zippered carrying case on a reading table inside the Arat Kilo / Abrehot library public area. Safely kept.',
    color: 'Black',
    brand: 'Sony',
    country: 'Ethiopia',
    region: 'Addis Ababa',
    city: 'Addis Ababa',
    locationName: 'Arat Kilo Public Library & Plaza',
    foundLocation: locAratKilo._id,
    dateFound: new Date(Date.now() - 3600 * 8 * 1000),
    approximateTime: '16:00',
    custodyStatus: 'WITH_FINDER',
    secretIdentifyingDetails: 'Custom yellow airplane audio adapter and braided auxiliary cable stored inside case mesh pocket.',
    images: ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80'],
    status: 'AVAILABLE_FOR_CLAIM',
  });

  // 8. Peer Conversation between Amina and Dawit regarding the returned phone
  const convo = await Conversation.create({
    participants: [amina._id, dawit._id],
    lostReport: lostItem1._id,
    foundReport: foundItem1._id,
    lastMessage: 'Thank you so much Dawit! I truly appreciate your kindness and honesty.',
    lastMessageAt: new Date(Date.now() - 3600 * 11 * 1000),
    unreadCount: new Map([[amina._id.toString(), 0], [dawit._id.toString(), 0]]),
  });

  await Message.create([
    {
      conversation: convo._id,
      sender: amina._id,
      recipient: dawit._id,
      content: 'Hello Dawit, I saw your found post for the Samsung Galaxy phone in Bole. I submitted a claim with the details!',
      read: true,
      createdAt: new Date(Date.now() - 3600 * 32 * 1000),
    },
    {
      conversation: convo._id,
      sender: dawit._id,
      recipient: amina._id,
      content: 'Hi Amina! I reviewed your claim and verified the wallpaper and case. Everything matches perfectly. Let us meet at Kaldi Coffee by Medhanealem.',
      read: true,
      createdAt: new Date(Date.now() - 3600 * 20 * 1000),
    },
    {
      conversation: convo._id,
      sender: amina._id,
      recipient: dawit._id,
      content: 'Thank you so much Dawit! I truly appreciate your kindness and honesty.',
      read: true,
      createdAt: new Date(Date.now() - 3600 * 11 * 1000),
    },
  ]);

  // 9. Initial Abuse Report Demo
  await Report.create({
    reporter: amina._id,
    module: 'LOST_AND_FOUND',
    targetType: 'LOST_REPORT',
    targetId: lostItem3._id.toString(),
    reason: 'Duplicate test report check',
    details: 'Demonstrating FindBack moderation queue and dispute handling.',
    status: 'RESOLVED',
    actionTaken: 'NO_ACTION',
    moderatorNotes: 'Verified legitimate public lost report. Adheres to FindBack community safety rules.',
    resolvedBy: adminUser._id,
    resolvedAt: new Date(),
  });

  // 10. Initial Notifications
  await Notification.create([
    {
      recipient: amina._id,
      title: 'Property Return Recorded',
      message: 'Your Samsung Galaxy S23 Ultra return has been finalized with finder Dawit. Thank you for using FindBack!',
      type: 'CLAIM',
      link: '/dashboard',
      read: true,
      createdAt: new Date(Date.now() - 3600 * 12 * 1000),
    },
    {
      recipient: dawit._id,
      title: 'Community Integrity Badge (+1)',
      message: 'Thank you for your honesty! The Samsung phone you found has been confirmed returned to Amina Kebede.',
      type: 'SYSTEM',
      link: '/dashboard',
      read: false,
      createdAt: new Date(Date.now() - 3600 * 12 * 1000),
    },
  ]);

  // 11. Initial Audit Trail Logs
  await AuditLog.create([
    {
      actor: adminUser._id,
      action: 'SYSTEM_INITIALIZED',
      entityType: 'SystemPolicy',
      entityId: policy._id.toString(),
      notes: 'FindBack production platform initialized with general public safety rules and multi-variable heuristic matching.',
    },
    {
      actor: dawit._id,
      action: 'CLAIM_APPROVED',
      entityType: 'Claim',
      entityId: claim1._id.toString(),
      notes: 'Finder Dawit Mengistu verified claimant ownership via secret distinguishing mark inspection.',
    },
    {
      actor: dawit._id,
      action: 'RETURN_CONFIRMED',
      entityType: 'ReturnRecord',
      entityId: returnRecord1._id.toString(),
      notes: 'Physical property return verified and finalized.',
    },
  ]);

  console.log('[Seed] FindBack database seed completed successfully with realistic public datasets!');
}

// Allow direct execution
if (process.argv[1]?.endsWith('seedRunner.ts')) {
  runSeed({ demoPassword: process.env.SEED_DEMO_PASSWORD })
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch((err) => {
      console.error('[Seed Error]', err);
      process.exit(1);
    });
}
