import { Response } from 'express';
import { Location } from '../models/Location.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';
import { z } from 'zod';

export async function getLocations(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { city } = req.query;
  const includeInactive = req.query.includeInactive === 'true' && req.user?.role === 'ADMIN';
  const query: any = includeInactive ? {} : { isActive: { $ne: false } };
  if (city) {
    query.city = new RegExp(String(city).trim(), 'i');
  }

  const locations = await Location.find(query).sort({ city: 1, name: 1 });
  res.json({ success: true, locations });
}

export const getCampusLocations = getLocations;

export async function createLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator access required.' });
    return;
  }

  const parsed = z.object({
    name: z.string().trim().min(2).max(150),
    city: z.string().trim().max(100).optional(),
    region: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    area: z.string().trim().max(100).optional(),
    address: z.string().trim().max(300).optional(),
    isOfficialMeetingSpot: z.boolean().optional(),
    meetingInstructions: z.string().trim().max(1000).optional(),
  }).strict().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid location data.' });
    return;
  }
  const { name, city, region, country, area, address, isOfficialMeetingSpot, meetingInstructions } = parsed.data;

  const location = await Location.create({
    name: name.trim(),
    city: city?.trim() || 'Addis Ababa',
    region: region?.trim() || '',
    country: country?.trim() || 'Ethiopia',
    area: area?.trim() || '',
    address: address?.trim() || '',
    isOfficialMeetingSpot: isOfficialMeetingSpot ?? false,
    meetingInstructions: meetingInstructions || 'Meet in a well-lit, public daytime location (e.g., bank foyer, cafe, or transit station).',
  });

  await logAudit({
    actorId: req.user._id,
    action: 'LOCATION_CREATED',
    entityType: 'Location',
    entityId: location._id,
    newState: location.toObject(),
    notes: `Public location "${name}" in ${location.city} created by admin.`,
    ipAddress: req.ip,
  });

  res.status(201).json({ success: true, location });
}

export const createCampusLocation = createLocation;

export async function updateLocation(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user || req.user.role !== 'ADMIN') {
    res.status(403).json({ success: false, message: 'Forbidden. Administrator access required.' });
    return;
  }

  const { id } = req.params;
  const parsed = z.object({
    name: z.string().trim().min(2).max(150).optional(),
    city: z.string().trim().max(100).optional(),
    region: z.string().trim().max(100).optional(),
    country: z.string().trim().max(100).optional(),
    area: z.string().trim().max(100).optional(),
    address: z.string().trim().max(300).optional(),
    isOfficialMeetingSpot: z.boolean().optional(),
    meetingInstructions: z.string().trim().max(1000).optional(),
    isActive: z.boolean().optional(),
  }).strict().refine((value) => Object.keys(value).length > 0).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Invalid location update.' });
    return;
  }
  const { name, city, region, country, area, address, isOfficialMeetingSpot, meetingInstructions, isActive } = parsed.data;

  const location = await Location.findById(id);
  if (!location) {
    res.status(404).json({ success: false, message: 'Location not found.' });
    return;
  }

  const previousState = location.toObject();
  if (name) location.name = name.trim();
  if (city) location.city = city.trim();
  if (region !== undefined) location.region = region;
  if (country) location.country = country.trim();
  if (area !== undefined) location.area = area;
  if (address !== undefined) location.address = address;
  if (isOfficialMeetingSpot !== undefined) location.isOfficialMeetingSpot = isOfficialMeetingSpot;
  if (meetingInstructions !== undefined) location.meetingInstructions = meetingInstructions;
  if (isActive !== undefined) location.isActive = isActive;

  await location.save();

  await logAudit({
    actorId: req.user._id,
    action: 'LOCATION_UPDATED',
    entityType: 'Location',
    entityId: location._id,
    previousState,
    newState: location.toObject(),
    notes: `Location "${location.name}" updated.`,
    ipAddress: req.ip,
  });

  res.json({ success: true, location });
}

export const updateCampusLocation = updateLocation;
