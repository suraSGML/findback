import mongoose, { Document, Schema } from 'mongoose';

export type ClaimStatus = 
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'MORE_INFO_REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED';

export interface IVerificationQuestion {
  question: string;
  askedBy: mongoose.Types.ObjectId;
  askedAt: Date;
  answer?: string;
  answeredAt?: Date;
}

export type IOfficerQuestion = IVerificationQuestion;

export interface IClaim extends Document {
  foundReport: mongoose.Types.ObjectId;
  claimant: mongoose.Types.ObjectId;
  lostReport?: mongoose.Types.ObjectId;
  proofDescription: string;
  distinguishingFeaturesAnswer: string;
  serialNumber?: string;
  proofImages: string[];
  officerQuestions: IVerificationQuestion[];
  status: ClaimStatus;
  reviewedBy?: mongoose.Types.ObjectId;
  reviewDecisionNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ClaimSchema = new Schema<IClaim>(
  {
    foundReport: { type: Schema.Types.ObjectId, ref: 'FoundReport', required: true, index: true },
    claimant: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lostReport: { type: Schema.Types.ObjectId, ref: 'LostReport', index: true },
    proofDescription: { type: String, required: true, trim: true },
    distinguishingFeaturesAnswer: { type: String, default: '', trim: true },
    serialNumber: { type: String, default: '' },
    proofImages: { type: [String], default: [] },
    officerQuestions: [
      {
        question: { type: String, required: true },
        askedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        askedAt: { type: Date, default: Date.now },
        answer: { type: String },
        answeredAt: { type: Date },
      },
    ],
    status: {
      type: String,
      enum: ['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED', 'APPROVED', 'REJECTED', 'RETURNED'],
      default: 'SUBMITTED',
      index: true,
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewDecisionNotes: { type: String, default: '' },
  },
  { timestamps: true }
);

export const Claim = mongoose.model<IClaim>('Claim', ClaimSchema);
