import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const uri = process.env.MONGODB_URI!;

// ── Unique staff passwords ────────────────────────────────────────────────────
const ADMIN_PASSWORD     = 'Admin@CampusConnect2026!';
const MODERATOR_PASSWORD = 'Mod#Secure7742$';
const OFFICER_PASSWORD   = 'Officer&LostFound99!';
// ─────────────────────────────────────────────────────────────────────────────

await mongoose.connect(uri);
console.log('[Staff Seed] Connected to MongoDB Atlas.\n');

const db = mongoose.connection.db!;

// -- Models (inline to avoid circular imports) --------------------------------
const UserSchema = new mongoose.Schema({
  name: String, email: { type: String, unique: true, lowercase: true },
  password: { type: String, select: false },
  universityId: String, faculty: String, department: String,
  yearBatch: String, phone: String, avatar: { type: String, default: '' },
  bio: { type: String, default: '' },
  role: { type: String, enum: ['STUDENT','MODERATOR','OFFICER','ADMIN'], default: 'STUDENT' },
  verificationStatus: { type: String, default: 'VERIFIED' },
  reputation: {
    ratingAverage: { type: Number, default: 5.0 },
    ratingCount:   { type: Number, default: 0 },
    completedTransactions: { type: Number, default: 0 },
    completedDonations:    { type: Number, default: 0 },
    returnedLostItems:     { type: Number, default: 0 },
  },
  isSuspended: { type: Boolean, default: false },
}, { timestamps: true });

const CategorySchema = new mongoose.Schema({
  name: String, slug: String, icon: String, description: String,
  allowedTransactionTypes: [String],
  isActive: { type: Boolean, default: true },
});

const LocationSchema = new mongoose.Schema({
  name: String, zone: String, building: String, description: String,
  isOfficialMeetingSpot: { type: Boolean, default: false },
  meetingInstructions: String,
  isActive: { type: Boolean, default: true },
});

const PolicySchema = new mongoose.Schema({
  universityName: String,
  allowedEmailDomains: [String],
  autoApproveListings: { type: Boolean, default: true },
}, { timestamps: true });

const User     = mongoose.models.User     || mongoose.model('User',     UserSchema);
const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Location = mongoose.models.CampusLocation || mongoose.model('CampusLocation', LocationSchema);
const Policy   = mongoose.models.SystemPolicy   || mongoose.model('SystemPolicy',   PolicySchema);
// ----------------------------------------------------------------------------

const salt = await bcrypt.genSalt(12);

const staffAccounts = [
  {
    name: 'Administrator',
    email: 'admin@apex.edu',
    password: await bcrypt.hash(ADMIN_PASSWORD, salt),
    universityId: 'ADM-2018-001',
    faculty: 'Academic Administration',
    department: 'Dean of Student Services',
    role: 'ADMIN',
    bio: 'Platform Administrator & Dean of Student Affairs.',
  },
  {
    name: 'Marketplace Moderator',
    email: 'moderator@apex.edu',
    password: await bcrypt.hash(MODERATOR_PASSWORD, salt),
    universityId: 'MOD-2021-044',
    faculty: 'Student Union Guild',
    department: 'Campus Safety Committee',
    role: 'MODERATOR',
    bio: 'Campus Marketplace Safety Officer.',
  },
  {
    name: 'Lost & Found Officer',
    email: 'officer@apex.edu',
    password: await bcrypt.hash(OFFICER_PASSWORD, salt),
    universityId: 'SEC-2019-112',
    faculty: 'Campus Protection Services',
    department: 'Central Lost & Found Custody',
    role: 'OFFICER',
    bio: 'Custodian of campus physical property and recovery operations.',
  },
];

// Upsert staff accounts (won't overwrite if already exist)
for (const account of staffAccounts) {
  await User.findOneAndUpdate(
    { email: account.email },
    { $setOnInsert: account },
    { upsert: true, new: true }
  );
}
console.log('[Staff Seed] ✅ 3 staff accounts ready.\n');

// Seed SystemPolicy if missing
const existingPolicy = await Policy.findOne();
if (!existingPolicy) {
  await Policy.create({
    universityName: 'Apex State University',
    allowedEmailDomains: ['apex.edu', 'student.apex.edu'],
    autoApproveListings: true,
  });
  console.log('[Staff Seed] ✅ System policy created.');
}

// Seed Categories if missing
const catCount = await Category.countDocuments();
if (catCount === 0) {
  await Category.insertMany([
    { name: 'Textbooks & Course Notes',       slug: 'textbooks-course-notes',       icon: '📚', description: 'University textbooks, lecture notes, past exams' },
    { name: 'Electronics & Computers',        slug: 'electronics-computers',        icon: '💻', description: 'Laptops, tablets, cables, accessories' },
    { name: 'Calculators & Technical Tools',  slug: 'calculators-technical-tools',  icon: '🔢', description: 'Graphing calculators, lab tools, drawing sets' },
    { name: 'Laboratory Equipment',           slug: 'laboratory-equipment',         icon: '🧪', description: 'Lab coats, goggles, glassware, equipment' },
    { name: 'Dormitory Essentials',           slug: 'dormitory-essentials',         icon: '🛋️', description: 'Dorm furniture, kitchen items, bedding, lamps' },
    { name: 'Sports & Recreation',            slug: 'sports-recreation',            icon: '⚽', description: 'Sports gear, fitness equipment, outdoor items' },
    { name: 'Clothing & Accessories',         slug: 'clothing-accessories',         icon: '👕', description: 'University merch, clothing, bags, accessories' },
  ]);
  console.log('[Staff Seed] ✅ 7 categories created.');
}

// Seed Campus Locations if missing
const locCount = await Location.countDocuments();
if (locCount === 0) {
  await Location.insertMany([
    { name: 'William Jefferson Library',         building: 'Main Library',          description: 'Central university library, open 24/7 during exams' },
    { name: 'Student Center & Union',            building: 'Student Union',         description: 'Hub for student activities and campus services' },
    { name: 'Charles Babbage Engineering Hall',  building: 'Engineering Block',     description: 'Faculty of Engineering lecture halls and labs' },
    { name: 'Administration Building',           building: 'Admin Block',           description: 'University administrative offices' },
    { name: 'Science & Research Complex',        building: 'Science Block',         description: 'Natural sciences labs and lecture theaters' },
    { name: 'Business School Atrium',            building: 'Business Block',        description: 'College of Business & Economics' },
    { name: 'Campus Security & Lost Property',   building: 'Security Office',       description: 'Campus security and official lost & found custody desk' },
  ]);
  console.log('[Staff Seed] ✅ 7 campus locations created.');
}

await mongoose.disconnect();

console.log('\n════════════════════════════════════════════════════');
console.log('  STAFF ACCOUNT CREDENTIALS');
console.log('════════════════════════════════════════════════════');
console.log(`  👑 Admin`);
console.log(`     Email    : admin@apex.edu`);
console.log(`     Password : ${ADMIN_PASSWORD}`);
console.log('');
console.log(`  ⚖️  Moderator`);
console.log(`     Email    : moderator@apex.edu`);
console.log(`     Password : ${MODERATOR_PASSWORD}`);
console.log('');
console.log(`  🛡️  Officer`);
console.log(`     Email    : officer@apex.edu`);
console.log(`     Password : ${OFFICER_PASSWORD}`);
console.log('════════════════════════════════════════════════════\n');
