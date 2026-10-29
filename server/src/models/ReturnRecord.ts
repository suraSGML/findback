import mongoose, { Document, Schema } from 'mongoose';

export interface IReturnRecord extends Document {
  foundReport: mongoose.Types.ObjectId;
  lostReport?: mongoose.Types.ObjectId;
  claim?: mongoose.Types.ObjectId;
  returnedBy: mongoose.Types.ObjectId;
  receivedBy: mongoose.Types.ObjectId;
  officerInCharge?: mongoose.Types.ObjectId;
  returnDate: Date;
  pickupLocation?: mongoose.Types.ObjectId;
  handoverLocationName?: string;
  notes?: string;
  evidenceImage?: string;
  ownerConfirmed: boolean;
  ownerConfirmedAt?: Date;
  ownerFeedback?: string;
  ownerRating?: number;
  createdAt: Date;
}

const ReturnRecordSchema = new Schema<IReturnRecord>(
  {
    foundReport: { type: Schema.Types.ObjectId, ref: 'FoundReport', required: true, index: true },
    lostReport: { type: Schema.Types.ObjectId, ref: 'LostReport', index: true },
    claim: { type: Schema.Types.ObjectId, ref: 'Claim', index: true },
    returnedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    receivedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    officerInCharge: { type: Schema.Types.ObjectId, ref: 'User' },
    returnDate: { type: Date, default: Date.now },
    pickupLocation: { type: Schema.Types.ObjectId, ref: 'Location' },
    handoverLocationName: { type: String, default: '' },
    notes: { type: String, default: '' },
    evidenceImage: { type: String, default: '' },
    ownerConfirmed: { type: Boolean, default: false },
    ownerConfirmedAt: { type: Date },
    ownerFeedback: { type: String, default: '' },
    ownerRating: { type: Number, min: 1, max: 5 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const ReturnRecord = mongoose.model<IReturnRecord>('ReturnRecord', ReturnRecordSchema);
