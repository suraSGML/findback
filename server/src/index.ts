import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { ENV } from './config/env.js';
import { BRAND } from './config/brand.js';
import { connectDB } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { setSocketIO } from './services/notificationService.js';
import { authenticateSocketIdentity, isConversationParticipant } from './middleware/socketAuth.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import locationRoutes from './routes/locationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import lostFoundRoutes from './routes/lostFoundRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

const app = express();
const httpServer = http.createServer(app);
if (ENV.TRUST_PROXY !== false) {
  app.set('trust proxy', ENV.TRUST_PROXY);
}
const corsOptions = {
  origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
    callback(null, !origin || ENV.CLIENT_URLS.includes(origin));
  },
  credentials: true,
};

// Socket.IO Setup
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: ENV.CLIENT_URLS,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});
setSocketIO(io);

io.on('connection', (socket) => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);

  socket.on('join:conversation', async (conversationId: string) => {
    try {
      if (await isConversationParticipant(userId, conversationId)) {
        await socket.join(`conversation:${conversationId}`);
      }
    } catch (error) {
      console.error('[Socket] Failed to authorize conversation room:', error);
    }
  });

  socket.on('leave:conversation', (conversationId: string) => {
    if (conversationId) {
      socket.leave(`conversation:${conversationId}`);
    }
  });
});

io.use(async (socket, next) => {
  try {
    socket.data.userId = await authenticateSocketIdentity(socket.handshake.auth?.token);
    next();
  } catch {
    next(new Error('Invalid or expired session.'));
  }
});

// Middleware
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { success: false, message: 'Too many authentication attempts. Please try again later.' },
});

// Static files for uploads
app.use('/uploads', express.static(ENV.UPLOAD_DIR));

// API Health Check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    platform: `${BRAND.name} API`,
    version: BRAND.version,
    timestamp: new Date().toISOString(),
  });
});

// Retained FindBack Subsystem Routes
app.use('/api/auth/login', authRateLimit);
app.use('/api/auth/register', authRateLimit);
app.use('/api/auth/forgot-password', authRateLimit);
app.use('/api/auth/reset-password', authRateLimit);
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/lost-found', lostFoundRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

// 404 Handler for undefined API routes
app.use('/api/*', (_req, res) => {
  res.status(404).json({ success: false, message: 'Requested FindBack API endpoint does not exist.' });
});

// Global Error Handler
app.use(errorHandler);

// Safety handlers for uncaught rejections/exceptions
process.on('unhandledRejection', (reason: any) => {
  console.error('[Unhandled Rejection]', reason);
});

process.on('uncaughtException', (err: any) => {
  console.error('[Uncaught Exception]', err);
});

// Start server
if (process.env.NODE_ENV !== 'test') {
  connectDB().then(() => {
    httpServer.listen(ENV.PORT, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 ${BRAND.name} Platform running on http://localhost:${ENV.PORT}`);
      console.log(`📡 WebSocket Real-Time Engine Active`);
      console.log(`🔒 Identity Modes: USER & ADMIN`);
      console.log(`======================================================\n`);
    });
  });
}

export { app, httpServer, io };
