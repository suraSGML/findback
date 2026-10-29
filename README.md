# 🔍 FindBack — Nationwide General-Purpose Lost & Found Community Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-v20%2B-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-cyan.svg)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-teal.svg)](https://tailwindcss.com/)

> **FindBack is a 100% free, general-purpose public lost-and-found platform.** Designed to reconnect individuals with lost personal property across Ethiopian cities (Addis Ababa, Hawassa, Bahir Dar, Dire Dawa, and beyond) using multi-variable heuristic correlation, anti-fraud ownership claims, and verified safe handovers.

---

## 📌 1. The Real-World Problem
Every day, thousands of personal possessions are misplaced in taxis, buses, airports, cafes, shopping centers, libraries, and public streets:
1. **Fragmented Search**: Lost belongings are broadcast across noisy Telegram channels, unorganized Facebook groups, and paper notices with near-zero searchability.
2. **Low Recovery Rate**: Over 80% of found items are never reclaimed because finders have no centralized, privacy-conscious way to discover the rightful owner.
3. **Fraud & Scams**: Public posts displaying serial numbers, lock screens, or distinguishing marks invite fraudulent claims by opportunistic bad actors.
4. **Monetization Barriers**: Commercial services charge subscription fees or ransom recovery commissions, discouraging community participation.

---

## 🌟 2. The FindBack Solution

### A. 100% Free Community Service
- **Zero Cost to Everyone**: No paywalls, subscription tiers, listing fees, or commission charges.
- **Open Public Registration**: Anyone with a name, email, and phone can sign up instantly without institutional email restrictions.

### B. Intelligent Heuristic Matching Engine
FindBack correlates lost and found reports using an automated, multi-factor heuristic scoring vector:
$$\text{Score} = \sum (\text{Variable}_i \times \text{Weight}_i)$$
- **Category Match (20%)**: Primary and sub-category taxonomy alignment.
- **Location Proximity (25%)**: Geographic correlation across City (Addis Ababa, Hawassa, etc.), Region, Locality, and Landmark tokens.
- **Date Proximity (15%)**: Temporal closeness between when the item was lost and when it was found.
- **Time Window Match (10%)**: Morning, afternoon, evening alignment.
- **Color & Visual Characteristics (10%)**: Exterior palette match.
- **Brand & Model (10%)**: Device or accessory manufacturer match.
- **Tokenized Description Similarity (10%)**: Cosine similarity across distinctive keywords.

### C. Anti-Fraud Ownership Claims & "Secret Detail Shield"
- **Shielded Confidential Attributes**: Finders record a private identifying characteristic (e.g., specific lock screen wallpaper, engraving, scratch location, or serial number suffix) that is **completely stripped** from all public endpoints.
- **Peer Challenge Q&A**: Finders and Administrators can issue verification challenges directly to claimants.
- **Self-Approval Guardrails**: Claimants can never approve their own claims; only the finder or an Administrator can authorize a claim.
- **Safe Public Meeting Guidance**: Designated safe public meeting locations with built-in safety checklists.

### D. Simplified Roles & Governance
- **Strictly Two Roles**: `USER` (public community member) and `ADMIN` (governance, policy calibration, abuse moderation, and audit logs).
- **Abuse Moderation**: Flag suspicious reports, remove inappropriate content, and suspend malicious users.
- **Immutable Audit Trail**: Key governance actions are logged with actor, timestamp, previous state, and new state.

---

## 🛠️ 3. Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, React Router v6 |
| **Backend** | Node.js, Express.js (ES Modules), TypeScript (`tsx`), Helmet, CORS, Morgan |
| **Database** | MongoDB with Mongoose ODM (Atlas & local support) |
| **Real-time** | Socket.IO for instant peer messaging and match alerts |
| **Security** | JWT Authentication, Bcrypt password hashing, RBAC Middleware, Zod Validation |
| **Testing** | Automated integration test suite verifying Auth, Masking, Heuristics, & Claims |

---

## 👥 4. Role-Based Access Control (RBAC)

| Role | Access Level | Responsibilities |
| :--- | :--- | :--- |
| **USER** | Public Community Member | Report lost belongings, post found items with secret details, view automated matches, file ownership claims, challenge claimants on found items, coordinate handovers in private chat. |
| **ADMIN** | Executive Governance | View nationwide recovery analytics, manage user accounts & suspensions, resolve abuse inquiries, recalibrate matching weights, inspect immutable audit logs. |

---

## 🚀 5. Quick Start

### Prerequisites
- Node.js `v18+` (Tested on Node `v24+`)
- npm `v9+`
- MongoDB instance (MongoDB Atlas or local MongoDB)

### Installation
```bash
# In the project root:
npm install --prefix server
npm install --prefix client
```

### Seed Realistic Ethiopian Datasets
Seed the database with preconfigured users, realistic lost and found reports (phones, wallets, keys, backpacks in Addis Ababa & Hawassa), heuristic matches, and claims:
Seeding replaces data in the configured database. It is disabled in production and requires explicit confirmation and a private development password. Never use it against a shared or production database.
```powershell
Set-Location server
$env:CONFIRM_DESTRUCTIVE_SEED="true"
$env:SEED_DEMO_PASSWORD="<unique-development-password-at-least-12-characters>"
npm run seed
```

### Running Locally

In separate terminal tabs:

**Tab 1 — Backend (Port 5000):**
```bash
cd server
npm run dev
```

**Tab 2 — Frontend (Port 5173):**
```bash
cd client
npm run dev
```

Open your browser at `http://localhost:5173`.

---

## 🎭 6. Seeded Development Accounts

Seeding creates `user@findback.org`, `admin@findback.org`, and other sample accounts. Their shared password is the private value you supplied through `SEED_DEMO_PASSWORD` when seeding; no demo password is built into the repository. A successful seed replaces the configured database contents. If you have lost the password for an existing account, do not reseed a database containing data you need; use the configured recovery flow or create a new account.

---

## 🧪 7. Automated Test Suite

Run the full integration test suite:
```bash
npm test --prefix server
```
Run client component tests:
```bash
npm test --prefix client -- --run
```
Tests verify:
- Safe registration defaulting to `USER` without self-elevated roles.
- Strict confidentiality masking of secret identifying characteristics from public endpoints.
- Accurate heuristic matching scoring ($\ge 50\%$ threshold).
- Challenge question and response flow between finder and claimant.
- Prevention of self-approval by claimants.
- Administrative policy recalibration and audit logging.

---

## 📖 8. Technical Documentation
- [System Architecture](file:///c:/Users/surag/Desktop/New%20folder%20(2)/docs/ARCHITECTURE.md)
- [REST API Specification](file:///c:/Users/surag/Desktop/New%20folder%20(2)/docs/API.md)
- [Database Schema & Entity Models](file:///c:/Users/surag/Desktop/New%20folder%20(2)/docs/DATABASE.md)
- [Security & Privacy Governance](file:///c:/Users/surag/Desktop/New%20folder%20(2)/docs/SECURITY.md)
- [Deployment & Setup Guide](file:///c:/Users/surag/Desktop/New%20folder%20(2)/docs/SETUP.md)
