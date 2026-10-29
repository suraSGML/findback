import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { User } from '../models/User.js';
import { ENV } from '../config/env.js';
import { AuthenticatedRequest } from '../middleware/auth.js';
import { logAudit } from '../services/auditLogger.js';

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(6, 'Password must be at least 6 characters').max(128),
  phone: z.string().trim().max(40).optional(),
  country: z.string().trim().max(100).optional(),
  region: z.string().trim().max(100).optional(),
  city: z.string().trim().max(100).optional(),
}).strict();

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const data = registerSchema.parse(req.body);

    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) {
      res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(data.password, salt);

    // Strictly enforce USER role — ordinary registration can NEVER create an ADMIN
    const user = await User.create({
      name: data.name.trim(),
      email: data.email.toLowerCase().trim(),
      password: hashedPassword,
      phone: data.phone?.trim() || '',
      country: data.country?.trim() || 'Ethiopia',
      region: data.region?.trim() || '',
      city: data.city?.trim() || 'Addis Ababa',
      role: 'USER',
      verificationStatus: 'VERIFIED',
    });

    const token = jwt.sign({ id: user._id, role: user.role, tokenVersion: user.tokenVersion }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });

    await logAudit({
      actorId: user._id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      notes: `User registered: ${user.email} from ${user.city}, ${user.country}`,
      ipAddress: req.ip,
    });

    res.status(201).json({
      success: true,
      message: 'Account registered successfully. Welcome to FindBack!',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    throw err;
  }
}

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(254),
  password: z.string().min(1, 'Password is required').max(128),
}).strict();

const forgotPasswordSchema = z.object({
  email: z.string().trim().email().max(254),
}).strict();

const resetPasswordSchema = z.object({
  token: z.string().regex(/^[a-f\d]{64}$/i),
  password: z.string().min(10, 'Password must be at least 10 characters').max(128),
}).strict();

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, message: 'Enter a valid email address.' });
    return;
  }

  if (!ENV.SMTP_HOST || !ENV.SMTP_USER || !ENV.SMTP_PASSWORD || !ENV.SMTP_FROM) {
    res.status(503).json({
      success: false,
      message: 'Password recovery email is not configured. Please contact the platform administrator.',
    });
    return;
  }

  const user = await User.findOne({ email: parsed.data.email.toLowerCase() });
  if (!user) {
    res.json({
      success: true,
      message: 'If an account exists for that email, password recovery instructions will be sent.',
    });
    return;
  }

  const token = crypto.randomBytes(32).toString('hex');
  user.resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');
  user.resetPasswordExpires = new Date(Date.now() + 30 * 60 * 1000);
  await user.save();

  const resetUrl = new URL('/reset-password', ENV.CLIENT_URLS[0]);
  resetUrl.searchParams.set('token', token);

  try {
    const transport = nodemailer.createTransport({
      host: ENV.SMTP_HOST,
      port: ENV.SMTP_PORT,
      secure: ENV.SMTP_PORT === 465,
      auth: { user: ENV.SMTP_USER, pass: ENV.SMTP_PASSWORD },
    });

    await transport.sendMail({
      from: ENV.SMTP_FROM,
      to: user.email,
      subject: 'Reset your FindBack password',
      text: `Use this one-time link within 30 minutes to reset your FindBack password: ${resetUrl.toString()}`,
      html: `<p>Use this one-time link within 30 minutes to reset your FindBack password:</p><p><a href="${resetUrl.toString()}">Reset password</a></p>`,
    });
  } catch (error) {
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    console.error('[Password Recovery Email Error]', error);
    res.status(503).json({
      success: false,
      message: 'Password recovery email could not be sent. Please try again later.',
    });
    return;
  }

  res.json({
    success: true,
    message: 'If an account exists for that email, password recovery instructions will be sent.',
  });
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: parsed.error.issues[0]?.message || 'Invalid password reset request.',
    });
    return;
  }

  const tokenHash = crypto.createHash('sha256').update(parsed.data.token).digest('hex');
  const user = await User.findOne({
    resetPasswordToken: tokenHash,
    resetPasswordExpires: { $gt: new Date() },
  }).select('+resetPasswordToken +resetPasswordExpires +tokenVersion');

  if (!user) {
    res.status(400).json({ success: false, message: 'This password reset link is invalid or has expired.' });
    return;
  }

  user.password = await bcrypt.hash(parsed.data.password, 12);
  user.tokenVersion += 1;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  res.json({ success: true, message: 'Password reset successfully. You can now sign in.' });
}

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password +tokenVersion');
    if (!user || !user.password) {
      res.status(401).json({ success: false, message: 'Invalid email address or password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      res.status(401).json({ success: false, message: 'Invalid email address or password.' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({
        success: false,
        message: `Account is suspended. Reason: ${user.suspensionReason || 'Violation of community safety guidelines.'}`,
      });
      return;
    }

    const token = jwt.sign({ id: user._id, role: user.role, tokenVersion: user.tokenVersion }, ENV.JWT_SECRET, {
      expiresIn: ENV.JWT_EXPIRES_IN as any,
    });

    res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: user.toSafeObject(),
    });
  } catch (err) {
    throw err;
  }
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated.' });
    return;
  }

  res.json({
    success: true,
    user: req.user.toSafeObject(),
  });
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  if (!req.user) {
    res.status(401).json({ success: false, message: 'Not authenticated.' });
    return;
  }

  const profileSchema = z.object({
    name: z.string().trim().min(2).max(100).optional(),
    bio: z.string().trim().max(500).optional(),
    phone: z.string().trim().max(40).optional(),
    avatar: z.string().trim().max(2048).optional(),
    city: z.string().trim().min(1).max(100).optional(),
    region: z.string().trim().max(100).optional(),
    country: z.string().trim().min(1).max(100).optional(),
  }).strict().refine((value) => Object.keys(value).length > 0, 'At least one profile field is required.');
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      success: false,
      message: 'Invalid profile data.',
      errors: parsed.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  const { name, bio, phone, avatar, city, region, country } = parsed.data;

  const user = await User.findById(req.user._id);
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found.' });
    return;
  }

  if (name) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (avatar !== undefined) user.avatar = avatar;
  if (city) user.city = city.trim();
  if (region !== undefined) user.region = region.trim();
  if (country) user.country = country.trim();

  // Role and verification status can NEVER be modified through user profile updates
  await user.save();

  res.json({
    success: true,
    message: 'Profile updated successfully.',
    user: user.toSafeObject(),
  });
}
