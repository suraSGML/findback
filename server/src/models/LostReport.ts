import mongoose, { Document, Schema } from 'mongoose';

export type LostStatus = 
  | 'ACTIVE'
  | 'OPEN'
  | 'POTENTIAL_MATCH'
  | 'POSSIBLE_MATCH'
  | 'CLAIM_PENDING'
  | 'MATCH_CONFIRMED'
  | 'RETURN_PENDING'
  | 'RETURNED'
  | 'CLOSED'
  | 'EXPIRED';

export interface ILostReport extends Document {
  reporter: mongoose.Types.ObjectId;
  title: string;
  category: mongoose.Types.ObjectId;
  description: string;
  color: string;
  brand: string;
  distinguishingCharacteristics?: string;
  country: string;
  region?: string;
  city: string;
  locationName: string;
  lastKnownLocation?: mongoose.Types.ObjectId; // Optional link to known public landmark/hub
  dateLost: Date;
  approximateTime: string;
  images: string[];
  status: LostStatus;
  matchedFoundItem?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LostReportSchema = new Schema<ILostReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, index: 'text' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, required: true, trim: true, index: 'text' },
    color: { type: String, default: '', trim: true },
    brand: { type: String, default: '', trim: true },
    distinguishingCharacteristics: { type: String, default: '', trim: true },
    country: { type: String, default: 'Ethiopia', trim: true, index: true },
    region: { type: String, default: '', trim: true },
    city: { type: String, default: 'Addis Ababa', trim: true, index: true },
    locationName: { type: String, default: '', trim: true },
    lastKnownLocation: { type: Schema.Types.ObjectId, ref: 'Location', index: true },
    dateLost: { type: Date, required: true, index: true },
    approximateTime: { type: String, default: '' },
    images: { type: [String], default: [] },
    status: {
      type: String,
      enum: [
        'ACTIVE',
        'OPEN',
        'POTENTIAL_MATCH',
        'POSSIBLE_MATCH',
        'CLAIM_PENDING',
        'MATCH_CONFIRMED',
        'RETURN_PENDING',
        'RETURNED',
        'CLOSED',
        'EXPIRED',
      ],
      default: 'ACTIVE',
      index: true,
    },
    matchedFoundItem: { type: Schema.Types.ObjectId, ref: 'FoundReport' },
  },
  { timestamps: true }
);

LostReportSchema.index({ title: 'text', description: 'text', brand: 'text', locationName: 'text' });

export const LostReport = mongoose.model<ILostReport>('LostReport', LostReportSchema);
