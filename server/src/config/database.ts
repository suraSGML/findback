import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectDB(uri = ENV.MONGODB_URI): Promise<void> {
  console.log('[DB] Connecting to MongoDB...');

  mongoose.set('strictQuery', false);

  await mongoose.connect(uri, {
    // Atlas uses TLS by default; these options ensure stable connections
    serverSelectionTimeoutMS: 10000, // 10s for Atlas cold-start / network latency
    socketTimeoutMS: 45000,
  });

  console.log(`[DB] Connected to MongoDB: ${mongoose.connection.host} / ${mongoose.connection.name}`);
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    console.log('[DB] Disconnected from MongoDB.');
  } catch (err: any) {
    console.error('[DB] Error during disconnection:', err.message);
  }
}
