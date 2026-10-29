import mongoose, { Document, Schema } from 'mongoose';

export type MatchStatus = 'SUGGESTED' | 'CONFIRMED' | 'DISMISSED';

export interface IMatchBreakdown {
  category: number;
  location: number;
  date: number;
  time: number;
  color: number;
  brand: number;
  description: number;
}

export interface ILostFoundMatch extends Document {
  lostReport: mongoose.Types.ObjectId;
  foundReport: mongoose.Types.ObjectId;
  matchScore: number;
  breakdown: IMatchBreakdown;
  reasons: string[];
  status: MatchStatus;
  dismissedBy?: mongoose.Types.ObjectId;
  dismissReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const LostFoundMatchSchema = new Schema<ILostFoundMatch>(
  {
    lostReport: { type: Schema.Types.ObjectId, ref: 'LostReport', required: true, index: true },
    foundReport: { type: Schema.Types.ObjectId, ref: 'FoundReport', required: true, index: true },
    matchScore: { type: Number, required: true, min: 0, max: 100, index: true },
    breakdown: {
      category: { type: Number, default: 0 },
      location: { type: Number, default: 0 },
      date: { type: Number, default: 0 },
      time: { type: Number, default: 0 },
      color: { type: Number, default: 0 },
      brand: { type: Number, default: 0 },
      description: { type: Number, default: 0 },
    },
    reasons: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['SUGGESTED', 'CONFIRMED', 'DISMISSED'],
      default: 'SUGGESTED',
      index: true,
    },
    dismissedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    dismissReason: { type: String },
  },
  { timestamps: true }
);

LostFoundMatchSchema.index({ lostReport: 1, foundReport: 1 }, { unique: true });

export const LostFoundMatch = mongoose.model<ILostFoundMatch>('LostFoundMatch', LostFoundMatchSchema);
