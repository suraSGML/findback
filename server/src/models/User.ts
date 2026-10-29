import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'USER' | 'ADMIN';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';

export interface IUser extends Document {
  name: string;
  email: string;
  password?: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  tokenVersion: number;
  phone?: string;
  country: string;
  region?: string;
  city: string;
  avatar?: string;
  bio?: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  reputation: {
    ratingAverage: number;
    ratingCount: number;
    itemsReturned: number;
    itemsRecovered: number;
  };
  isSuspended: boolean;
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  toSafeObject(): Partial<IUser>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    password: { type: String, required: true, select: false },
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    tokenVersion: { type: Number, default: 0, select: false },
    phone: { type: String, default: '', trim: true },
    country: { type: String, default: 'Ethiopia', trim: true },
    region: { type: String, default: '', trim: true },
    city: { type: String, default: 'Addis Ababa', trim: true },
    avatar: { type: String, default: '' },
    bio: { type: String, default: '' },
    role: {
      type: String,
      enum: ['USER', 'ADMIN'],
      default: 'USER',
      index: true,
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'],
      default: 'VERIFIED',
      index: true,
    },
    reputation: {
      ratingAverage: { type: Number, default: 5.0, min: 1, max: 5 },
      ratingCount: { type: Number, default: 0 },
      itemsReturned: { type: Number, default: 0 },
      itemsRecovered: { type: Number, default: 0 },
    },
    isSuspended: { type: Boolean, default: false },
    suspensionReason: { type: String },
  },
  { timestamps: true }
);

// Method to return public safe profile without sensitive details or hashes
UserSchema.methods.toSafeObject = function (): Partial<IUser> {
  const obj = this.toObject();
  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpires;
  delete obj.tokenVersion;
  delete obj.__v;
  return obj;
};

export const User = mongoose.model<IUser>('User', UserSchema);
