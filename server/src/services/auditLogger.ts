import { AuditLog } from '../models/AuditLog.js';
import mongoose from 'mongoose';

export interface AuditLogParams {
  actorId: string | mongoose.Types.ObjectId;
  action: string;
  entityType: string;
  entityId: string | mongoose.Types.ObjectId;
  previousState?: any;
  newState?: any;
  notes?: string;
  ipAddress?: string;
}

export async function logAudit(params: AuditLogParams): Promise<void> {
  try {
    await AuditLog.create({
      actor: params.actorId,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId.toString(),
      previousState: params.previousState,
      newState: params.newState,
      notes: params.notes,
      ipAddress: params.ipAddress || '127.0.0.1',
    });
  } catch (err: any) {
    console.error('[AuditLog Error] Failed to write audit record:', err.message);
  }
}
