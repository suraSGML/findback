# ⚙️ FindBack — Local Setup & Deployment Guide

This guide walks through configuring, running, and deploying the FindBack lost-and-found community platform.

---

## 1. System Requirements
- Node.js `v18.0.0` or higher (Node `v24+` fully supported)
- npm `v9.0.0` or higher
- MongoDB instance (MongoDB Atlas cluster URI or local MongoDB daemon)

---

## 2. Environment Variables Configuration

### Server Environment (`server/.env`):
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/findback
JWT_SECRET=<generate-a-random-secret-at-least-32-characters>
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=
TRUST_PROXY=
```

Copy `server/.env.example` to `server/.env` for local development. Never commit `.env` files. For production, provide secrets through the hosting provider's secret manager. If a database URI or JWT secret was previously committed or shared, rotate it before deployment.

### Client Environment (`client/.env`):
```env
VITE_API_BASE_URL=/api
VITE_SOCKET_URL=
```
For a separately hosted API, use the API origin and `/api` path for `VITE_API_BASE_URL` (for example `https://api.example.com/api`) and the backend origin for `VITE_SOCKET_URL` (for example `https://api.example.com`).

---

## 3. Step-by-Step Installation

### Step 1: Install Dependencies
```bash
# In the project root:
npm install --prefix server
npm install --prefix client
```

### Step 2: Seed Realistic Ethiopian Datasets
Populates categories, safe public meeting locations, sample users (`admin@findback.org`, `user@findback.org`), lost and found items in Addis Ababa and Hawassa, heuristic matches, and claims:
```bash
npm run seed --prefix server
```

### Step 3: Run the Automated Test Suite
```bash
npm test --prefix server
```

### Step 4: Start the Servers
Open two terminal windows:

**Terminal 1 (Backend API & Socket Server):**
```bash
cd server
npm run dev
```
> The API server will be active at `http://localhost:5000`.

**Terminal 2 (React Vite Client):**
```bash
cd client
npm run dev
```
> The frontend application will be active at `http://localhost:5173`.

---

## 4. Production Deployment

### Frontend (e.g., Vercel / Netlify / Cloudflare Pages):
1. Build the production bundle:
   ```bash
   npm run build --prefix client
   ```
2. Set root directory to `client` and output directory to `dist`.
3. Set `VITE_API_BASE_URL=https://your-findback-api.com/api` and `VITE_SOCKET_URL=https://your-findback-api.com`.
4. Configure the backend `CLIENT_URL` to the exact frontend origin (multiple allowed origins may be comma-separated).

### Backend (e.g., Render / Railway / DigitalOcean / AWS EC2):
1. Configure `MONGODB_URI`, a cryptographically random `JWT_SECRET` of at least 32 characters, `CLIENT_URL`, `PORT`, `UPLOAD_DIR`, and SMTP settings (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM`). Set `TRUST_PROXY=1` only when the server is behind exactly one trusted reverse proxy.
2. Build command: `npm install && npm run build`.
3. Start command: `npm run start` or `npx tsx src/index.ts`.
4. Set `NODE_ENV=production`. Startup rejects a missing or weak JWT secret.
5. Attach persistent storage for `UPLOAD_DIR`; the default local filesystem is not durable on many hosting platforms.

Password recovery requires a working SMTP account. The reset token is random, stored only as a SHA-256 hash, expires after 30 minutes, and can be used once.

### CI
GitHub Actions runs server/client builds, backend integration tests against an isolated in-memory MongoDB instance, and frontend tests for pull requests and pushes.
