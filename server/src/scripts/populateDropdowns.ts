import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('No MONGODB_URI');
  process.exit(1);
}

await mongoose.connect(uri);
console.log('Connected to Atlas');

const db = mongoose.connection.db!;

// 1. Clear existing categories and locations to re-populate them cleanly
await db.collection('categories').deleteMany({});
await db.collection('campuslocations').deleteMany({});

// 2. Insert valid Categories with isActive: true and full schema fields
const categories = [
  {
    name: 'Textbooks & Course Notes',
    slug: 'textbooks-course-notes',
    icon: 'BookOpen',
    description: 'University textbooks, study guides, course notes, past exams',
    allowedTransactionTypes: ['SALE', 'EXCHANGE', 'DONATION'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Electronics & Computers',
    slug: 'electronics-computers',
    icon: 'Laptop',
    description: 'Laptops, tablets, chargers, monitors, scientific accessories',
    allowedTransactionTypes: ['SALE', 'EXCHANGE'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Calculators & Technical Tools',
    slug: 'calculators-technical-tools',
    icon: 'Cpu',
    description: 'Graphing calculators, architecture kits, multimeter tools',
    allowedTransactionTypes: ['SALE', 'EXCHANGE', 'DONATION'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Laboratory Equipment',
    slug: 'laboratory-equipment',
    icon: 'FlaskConical',
    description: 'Lab coats, safety goggles, dissection kits, dissection manuals',
    allowedTransactionTypes: ['SALE', 'EXCHANGE', 'DONATION'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Dormitory Essentials',
    slug: 'dormitory-essentials',
    icon: 'Home',
    description: 'Desks, desk lamps, mini-fridges, storage bins, kettles',
    allowedTransactionTypes: ['SALE', 'DONATION'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Sports & Recreation',
    slug: 'sports-recreation',
    icon: 'Dumbbell',
    description: 'Gym equipment, sports balls, racquets, athletic gear',
    allowedTransactionTypes: ['SALE', 'EXCHANGE', 'DONATION'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Clothing & Accessories',
    slug: 'clothing-accessories',
    icon: 'Shirt',
    description: 'Campus hoodies, varsity jackets, bags, student organization gear',
    allowedTransactionTypes: ['SALE', 'DONATION'],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

await db.collection('categories').insertMany(categories);
console.log(`Inserted ${categories.length} categories.`);

// 3. Insert valid Campus Locations with zone, isOfficialMeetingSpot, isActive: true
const locations = [
  {
    name: 'William Jefferson Library Foyer',
    zone: 'Central Campus',
    building: 'Main Library',
    description: 'Central library ground floor near the 24/7 security reception desk.',
    isOfficialMeetingSpot: true,
    meetingInstructions: 'Meet at the staffed information desk on the ground floor.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Student Center & Union Atrium',
    zone: 'Student Life Zone',
    building: 'Student Union Building',
    description: 'Main campus hub with open seating, food court, and high foot traffic.',
    isOfficialMeetingSpot: true,
    meetingInstructions: 'Meet in front of the Campus Life Information Booth.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Charles Babbage Engineering Hall',
    zone: 'North Campus',
    building: 'Engineering Complex',
    description: 'Faculty of Engineering ground lobby near lecture theater 101.',
    isOfficialMeetingSpot: false,
    meetingInstructions: 'Meet in the central engineering lobby beside the makerspace entrance.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Administration Building Entrance',
    zone: 'Central Campus',
    building: 'Administration Block',
    description: 'Main steps and registrar entrance with active campus monitoring.',
    isOfficialMeetingSpot: true,
    meetingInstructions: 'Meet by the main administration lobby security station.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Science & Research Complex Cafe',
    zone: 'South Campus',
    building: 'Science Center',
    description: 'Well-lit seating area adjacent to the biology and chemistry laboratories.',
    isOfficialMeetingSpot: false,
    meetingInstructions: 'Meet near the ground floor cafe tables.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Business School Courtyard',
    zone: 'West Campus',
    building: 'School of Business',
    description: 'Open outdoor courtyard with bench seating and campus lighting.',
    isOfficialMeetingSpot: false,
    meetingInstructions: 'Meet next to the central water fountain.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    name: 'Campus Security & Custody Desk',
    zone: 'Public Safety Zone',
    building: 'Security Office',
    description: 'Official university lost property custody desk and security reception.',
    isOfficialMeetingSpot: true,
    meetingInstructions: 'Check in directly at the security duty officer window.',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

await db.collection('campuslocations').insertMany(locations);
console.log(`Inserted ${locations.length} campus locations.`);

await mongoose.disconnect();
console.log('Done!');
