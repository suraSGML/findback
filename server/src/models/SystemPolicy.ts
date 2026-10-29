import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemPolicy extends Document {
  platformName: string;
  allowedEmailDomains: string[];
  prohibitedKeywords: string[];
  prohibitedCategories: string[];
  matchWeights: {
    category: number;
    location: number;
    date: number;
    time: number;
    color: number;
    brand: number;
    description: number;
  };
  meetingSafetyTips: string[];
  createdAt: Date;
  updatedAt: Date;
}

const SystemPolicySchema = new Schema<ISystemPolicy>(
  {
    platformName: { type: String, default: 'FindBack' },
    allowedEmailDomains: { type: [String], default: [] }, // Empty array means open to all email domains
    prohibitedKeywords: {
      type: [String],
      default: [
        'weapon',
        'knife',
        'gun',
        'firearm',
        'explosive',
        'drugs',
        'narcotics',
        'stolen goods',
        'forged passport',
        'fake id',
        'credit card leak',
        'counterfeit',
      ],
    },
    prohibitedCategories: { type: [String], default: ['Weapons', 'Illegal Substances', 'Stolen Property'] },
    matchWeights: {
      category: { type: Number, default: 20 },
      location: { type: Number, default: 25 },
      date: { type: Number, default: 15 },
      time: { type: Number, default: 10 },
      color: { type: Number, default: 10 },
      brand: { type: Number, default: 10 },
      description: { type: Number, default: 10 },
    },
    meetingSafetyTips: {
      type: [String],
      default: [
        'Always arrange physical meetups in a well-lit, busy public daytime location (e.g., a popular cafe, bank lobby, or transport terminal).',
        'Bring a friend or notify a family member of your meeting location and time.',
        'Never invite a stranger to your home or meet in secluded, unmonitored places.',
        'Verify identity and review identifying marks before handing over the recovered item.',
        'Remember that FindBack is free — never pay unverified "processing fees" to reclaim your own property.',
        'Report any suspicious or harassing behavior immediately through the platform.',
      ],
    },
  },
  { timestamps: true }
);

export const SystemPolicy = mongoose.model<ISystemPolicy>('SystemPolicy', SystemPolicySchema);
