# 🏛️ FindBack — System Architecture & Design Specification

## 1. Architectural Style & Overview
FindBack is architected as a **Modular N-Tier Client-Server Platform** with clear domain boundaries, strong privacy firewalls, and asynchronous real-time event streaming.

```
┌─────────────────────────────────────────────────────────────┐
│                    React Client UI Layer                    │
│      (Public Community Feed | User Dashboard | Admin)       │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTP REST API                │ WebSocket (Socket.io)
               ▼                              │
┌─────────────────────────────────────────────────────────────┐
│                 Express.js API Gateway                      │
│  ├── Helmet / CORS / Rate Limiting                          │
│  ├── JWT Authentication & Simplified RBAC (USER / ADMIN)    │
│  └── Input Validation & Sanitization (Zod)                  │
├─────────────────────────────────────────────────────────────┤
│                    Domain Service Layer                     │
│  ├── AuthService        ├── LostFoundService                │
│  ├── MatchEngineService ├── ClaimVerificationService        │
│  ├── MessageService     ├── NotificationService             │
│  ├── ModerationService  ├── SafeLocationService             │
│  └── AuditLogService    └── AnalyticsService                │
├─────────────────────────────────────────────────────────────┤
│                     Data Access Layer                       │
│  └── Mongoose ODM (Projections, Indexes, Constraints)       │
├─────────────────────────────────────────────────────────────┤
│                     Storage Engine                          │
│  ├── MongoDB (Persistent Database - Atlas or Local)         │
│  └── File Storage (Local Uploads / Cloud Adapter)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles
1. **100% Free Public Service**: Designed without subscription tiers, transaction fees, paywalls, or commercial commission gateways to maximize community trust and participation.
2. **Strict Information Asymmetry Shield**: Secret identifying attributes (e.g., engraving, lock screen wallpaper, hidden scratches, serial numbers) entered by finders are stripped at the database query level (`-secretIdentifyingDetails`) and shielded from any user who is not the original finder or a platform administrator.
3. **Multi-Level Geographic Hierarchy**: Handles locations seamlessly across City (Addis Ababa, Hawassa, Bahir Dar, Dire Dawa), Region, Sub-city/Kebele, and Specific Landmark/Transit Hub tokens.
4. **Anti-Fraud Claim Verification Protocol**: Enforces finite-state transitions on claims. Claimants are strictly forbidden from approving their own claims; only the finder or an Administrator can authorize a claim and record a return.
5. **Zero-Trust Identity & Authorization**: Decodes and verifies JWT signatures on every protected endpoint, preventing role self-elevation during registration or profile updates.

---

## 3. Heuristic Matching Engine Architecture
The Heuristic Matching Engine correlates newly posted lost items against existing found items (and vice versa) using a weighted, normalized multi-variable scoring vector:

$$\text{FinalScore} = \frac{\sum_{i=1}^n (S_i \times W_i)}{\sum_{i=1}^n W_i}$$

Where:
- $S_i \in [0, 100]$: Normalized similarity score for variable $i$.
- $W_i$: Administrator-calibrated weight coefficient for variable $i$.

### Heuristic Pipeline Steps:
1. **Category Filter**: Exact category match required ($S_{\text{category}} = 100$) or returns $0$.
2. **Geographic Proximity**: Same city and landmark token = 100%, same city = 70%, same region = 40%, differing regions = 10%.
3. **Temporal Proximity**: Found within 24 hours of loss = 100%, within 3 days = 85%, within 7 days = 65%, $> 30$ days = 20%. Found before loss = penalized.
4. **Visual & Brand Overlap**: Case-insensitive substring matching on color and brand.
5. **Tokenized Description Overlap**: Tokenized text similarity with punctuation stripping and length normalization.
6. **Notification Trigger**: Whenever $\text{FinalScore} \ge 50\%$, the system records a `LostFoundMatch` and emits real-time in-app notifications and Socket.IO events to both the reporter and finder.

---

## 4. Finite State Machines (FSM)

### A. Lost Item Report Lifecycle
```text
[ACTIVE / OPEN] ──(Heuristic Correlated)──> [POTENTIAL_MATCH]
       │                                           │
       │                                           │ (Match Confirmed)
       ▼                                           ▼
   [EXPIRED] <──────(Return Handover)────── [RETURNED / RESOLVED]
```

### B. Ownership Claim Lifecycle
```text
[SUBMITTED] ──> [UNDER_REVIEW] ──(Finder/Admin Question)──> [MORE_INFO_REQUESTED]
       │                                                           │
       │                                                   (Claimant Answers)
       │                                                           │
       ▼                                                           ▼
 [REJECTED] <──────────────(Finder/Admin Decision)────────────── [APPROVED]
                                                                   │
                                                           (Handover Finalized)
                                                                   ▼
                                                               [RETURNED]
```

---

## 5. Security & Privacy Safeguards
- **Password Protection**: Passwords hashed using bcrypt with salt rounds $\ge 10$.
- **Serialization Sanitization**: `User.toSafeObject()` excludes password hashes, reset tokens, and internal security metadata.
- **Role Elevation Defense**: Public registration unconditionally assigns `USER`. Modifying roles to `ADMIN` is strictly reserved for authenticated administrators.
- **Audit Trails**: Critical operations (user suspensions, policy weight modifications, claim dispute resolutions) are logged with immutable audit logs.
