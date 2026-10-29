import mongoose, { Document, Schema } from 'mongoose';

export interface ILocation extends Document {
  name: string;
  city: string;
  region?: string;
  country: string;
  area?: string; // Neighborhood or zone
  address?: string;
  isOfficialMeetingSpot: boolean;
  meetingInstructions?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type ICampusLocation = ILocation;

const LocationSchema = new Schema<ILocation>(
  {
    name: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true, default: 'Addis Ababa', index: true },
    region: { type: String, default: '', trim: true },
    country: { type: String, default: 'Ethiopia', trim: true },
    area: { type: String, default: '', trim: true, index: true },
    address: { type: String, default: '' },
    isOfficialMeetingSpot: { type: Boolean, default: false, index: true },
    meetingInstructions: { type: String, default: 'Meet in a well-lit, public daytime location (e.g., bank lobby, coffee shop, or transport station).' },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export const Location = mongoose.model<ILocation>('Location', LocationSchema);
// Backwards-compatible alias
export const CampusLocation = Location;
