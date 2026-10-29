import mongoose, { Document, Schema } from 'mongoose';

export type NotificationType = 
  | 'OFFER'
  | 'MATCH'
  | 'CLAIM'
  | 'MESSAGE'
  | 'TRANSACTION'
  | 'MODERATION'
  | 'SYSTEM';

export interface INotification extends Document {
  recipient: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  read: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['OFFER', 'MATCH', 'CLAIM', 'MESSAGE', 'TRANSACTION', 'MODERATION', 'SYSTEM'],
      default: 'SYSTEM',
      index: true,
    },
    link: { type: String, default: '' },
    read: { type: Boolean, default: false, index: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema);
