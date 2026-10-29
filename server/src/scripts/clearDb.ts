import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('MONGODB_URI not set in .env');
  process.exit(1);
}

console.log('[Clear] Connecting to MongoDB Atlas...');
await mongoose.connect(uri);
console.log('[Clear] Connected.');

const db = mongoose.connection.db!;
const collections = await db.listCollections().toArray();

if (collections.length === 0) {
  console.log('[Clear] Database is already empty.');
} else {
  for (const col of collections) {
    await db.collection(col.name).deleteMany({});
    console.log(`[Clear] Cleared collection: ${col.name}`);
  }
  console.log(`[Clear] Done — ${collections.length} collections cleared.`);
}

await mongoose.disconnect();
console.log('[Clear] Disconnected.');
