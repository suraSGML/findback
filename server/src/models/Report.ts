import mongoose, { Document, Schema } from 'mongoose';

export type ReportModule = 'LOST_AND_FOUND' | 'USER_SAFETY';
export type ReportTargetType = 'LOST_REPORT' | 'FOUND_REPORT' | 'USER' | 'CLAIM';
export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export interface IReport extends Document {
  reporter: mongoose.Types.ObjectId;
  module: ReportModule;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details: string;
  evidenceImages: string[];
  status: ReportStatus;
  moderatorNotes?: string;
  actionTaken?: string;
  resolvedBy?: mongoose.Types.ObjectId;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporter: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    module: {
      type: String,
      default: 'LOST_AND_FOUND',
      index: true,
    },
    targetType: {
      type: String,
      enum: ['LOST_REPORT', 'FOUND_REPORT', 'USER', 'CLAIM', 'LISTING'],
      required: true,
      index: true,
    },
    targetId: { type: String, required: true, index: true },
    reason: { type: String, required: true, trim: true },
    details: { type: String, default: '', trim: true },
    evidenceImages: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'],
      default: 'PENDING',
      index: true,
    },
    moderatorNotes: { type: String, default: '' },
    actionTaken: { type: String, default: '' },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

export const Report = mongoose.model<IReport>('Report', ReportSchema);
