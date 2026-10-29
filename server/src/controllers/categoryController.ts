import { Response } from 'express';
import { Category } from '../models/Category.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';
import { z } from 'zod';

export async function getCategories(req: AuthenticatedRequest, res: Response): Promise<void> {
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'ADMIN';
  const query = includeInactive ? {} : { isActive: { $ne: false } };
  const categories = await Category.find(query).sort({ name: 1 });
  res.json({ success: true, categories });
}

export async function createCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator access required.' });
    return;
  }

  const parsed = z.object({
    name: z.string().trim().min(2).max(100),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(60).optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid category data.' });
    return;
  }
  const { name, description, icon } = parsed.data;
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  const category = await Category.create({
    name: name.trim(),
    slug,
    description: description || '',
    icon: icon || 'HelpCircle',
  });

  await logAudit({
    actorId: req.user._id,
    action: 'CATEGORY_CREATED',
    entityType: 'Category',
    entityId: category._id,
    newState: category.toObject(),
    notes: `Category "${name}" created by admin.`,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, category });
}

export async function updateCategory(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator access required.' });
    return;
  }

  const { id } = req.params;
  const parsed = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    icon: z.string().trim().max(60).optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid category update.' });
    return;
  }
  const { name, description, icon, isActive } = parsed.data;

  const category = await Category.findById(id);
  if (!category) {
    res.status(404).json({ success: false, message: 'Category not found.' });
    return;
  }

  const previousState = category.toObject();
  if (name) {
    category.name = name.trim();
    category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }
  if (description !== undefined) category.description = description;
  if (icon) category.icon = icon;
  if (isActive !== undefined) category.isActive = isActive;

  await category.save();

  await logAudit({
    actorId: req.user._id,
    action: 'CATEGORY_UPDATED',
    entityType: 'Category',
    entityId: category._id,
    previousState,
    newState: category.toObject(),
    notes: `Category "${category.name}" updated by admin.`,
    ipAddress: req.ip,
  });

  res.json({ success: true, category });
}
