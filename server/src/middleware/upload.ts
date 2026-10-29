import multer from 'multer';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { ENV } from '../config/env.js';

export type SupportedImageType = 'jpeg' | 'png' | 'webp' | 'gif';

export function detectImageType(buffer: Buffer): SupportedImageType | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg';
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) return 'png';
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) return 'webp';
  if (
    buffer.length >= 6 &&
    ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))
  ) return 'gif';
  return null;
}

export async function persistValidatedImages(files: Express.Multer.File[]): Promise<string[]> {
  await fs.promises.mkdir(ENV.UPLOAD_DIR, { recursive: true });
  const savedPaths: string[] = [];
  try {
    for (const file of files) {
      const type = detectImageType(file.buffer);
      if (!type) {
        throw Object.assign(new Error('Invalid image content. Upload a JPEG, PNG, WEBP, or GIF image.'), {
          statusCode: 400,
        });
      }
      const filename = `findback-${randomUUID()}.${type}`;
      const filePath = path.join(ENV.UPLOAD_DIR, filename);
      await fs.promises.writeFile(filePath, file.buffer, { flag: 'wx' });
      savedPaths.push(filePath);
    }
    return savedPaths.map((filePath) => `/uploads/${path.basename(filePath)}`);
  } catch (error) {
    await Promise.all(savedPaths.map((filePath) => fs.promises.unlink(filePath).catch(() => undefined)));
    throw error;
  }
}

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 5,
  },
});
