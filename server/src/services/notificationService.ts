import { Notification, NotificationType, INotification } from '../models/Notification.js';
import mongoose from 'mongoose';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export function setSocketIO(io: Server): void {
  ioInstance = io;
}

export function getSocketIO(): Server | null {
  return ioInstance;
}

export interface SendNotificationParams {
  recipientId: string | mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: NotificationType;
  link?: string;
  metadata?: Record<string, any>;
}

export async function sendNotification(params: SendNotificationParams): Promise<INotification | null> {
  try {
    const notification = await Notification.create({
      recipient: params.recipientId,
      title: params.title,
      message: params.message,
      type: params.type,
      link: params.link || '',
      metadata: params.metadata || {},
    });

    if (ioInstance) {
      // Emit to user room
      ioInstance.to(`user:${params.recipientId.toString()}`).emit('notification:new', notification);
    }

    return notification;
  } catch (err: any) {
    console.error('[NotificationService Error]', err.message);
    return null;
  }
}
