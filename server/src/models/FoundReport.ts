import mongoose, { Document, Schema } from 'mongoose';

export type FoundStatus = 
  | 'AVAILABLE_FOR_CLAIM'
  | 'REPORTED'
  | 'UNDER_REVIEW'
  | 'POTENTIAL_MATCH'
  | 'CLAIM_PENDING'
  | 'CLAIM_APPROVED'
  | 'RETURNED'
  | 'CLOSED'
  | 'TRANSFERRED_TO_OFFICER';

export type CustodyStatus = 'WITH_FINDER' | 'TRANSFERRED_TO_CUSTODIAN' | 'TRANSFERRED_TO_OFFICER';

export interface IFoundReport extends Document {
  finder: mongoose.Types.ObjectId;
  title: string;
  category: mongoose.Types.ObjectId;
  description: string;
  color: string;
  brand: string;
  country: string;
  region?: string;
  city: string;
  locationName: string;
  foundLocation?: mongoose.Types.ObjectId; // Optional link to known public landmark/hub
  dateFound: Date;
  approximateTime: string;
  custodyStatus: CustodyStatus;
  custodyLocationDetails?: string;
  custodyOfficer?: mongoose.Types.ObjectId;
  images: string[];
  // Private attribute: hidden markings or secret details never exposed publicly to prevent fraudulent guessing
  secretIdentifyingDetails?: string;
  status: FoundStatus;
  matchedLostItem?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const FoundReportSchema = new Schema<IFoundReport>(
  {
    finder: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, index: 'text' },
    category: { type: Schema.Types.ObjectId, ref: 'Category', required: true, index: true },
    description: { type: String, required: true, trim: true, index: 'text' },
    color: { type: String, default: '', trim: true },
    brand: { type: String, default: '', trim: true },
    country: { type: String, default: 'Ethiopia', trim: true, index: true },
    region: { type: String, default: '', trim: true },
    city: { type: String, default: 'Addis Ababa', trim: true, index: true },
    locationName: { type: String, default: '', trim: true },
    foundLocation: { type: Schema.Types.ObjectId, ref: 'Location', index: true },
    dateFound: { type: Date, required: true, index: true },
    approximateTime: { type: String, default: '' },
    custodyStatus: {
      type: String,
      enum: ['WITH_FINDER', 'TRANSFERRED_TO_CUSTODIAN', 'TRANSFERRED_TO_OFFICER'],
      default: 'WITH_FINDER',
    },
    custodyLocationDetails: { type: String, default: '' },
    custodyOfficer: { type: Schema.Types.ObjectId, ref: 'User' },
    images: { type: [String], default: [] },
    secretIdentifyingDetails: { type: String, default: '' },
    status: {
      type: String,
      enum: [
        'AVAILABLE_FOR_CLAIM',
        'REPORTED',
        'UNDER_REVIEW',
        'POTENTIAL_MATCH',
        'CLAIM_PENDING',
        'CLAIM_APPROVED',
        'RETURNED',
        'CLOSED',
        'TRANSFERRED_TO_OFFICER',
      ],
      default: 'AVAILABLE_FOR_CLAIM',
      index: true,
    },
    matchedLostItem: { type: Schema.Types.ObjectId, ref: 'LostReport' },
  },
  { timestamps: true }
);

FoundReportSchema.index({ title: 'text', description: 'text', brand: 'text', locationName: 'text' });

export const FoundReport = mongoose.model<IFoundReport>('FoundReport', FoundReportSchema);
