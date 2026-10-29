import { Router, Response } from 'express';
import { upload } from '../middleware/upload.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { persistValidatedImages } from '../middleware/upload.js';
import rateLimit from 'express-rate-limit';

const router = Router();
const uploadRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Upload limit reached. Please try again later.' },
});

router.post('/', uploadRateLimit, authenticate, upload.array('images', 5), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
  const files = (req.files as Express.Multer.File[]) || [];
  if (files.length === 0) {
    res.status(400).json({ success: false, message: 'No image files uploaded.' });
    return;
  }

  const urls = await persistValidatedImages(files);
  res.json({
    success: true,
    urls,
    message: `${files.length} image(s) uploaded successfully.`,
  });
}));

export default router;
