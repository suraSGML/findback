# 🗄️ FindBack — Database Schema & Data Dictionary

FindBack uses MongoDB with Mongoose ODM. Schemas are strictly typed, normalized, and indexed for high-concurrency geo-text searches and low-latency queries.

---

## 1. Entity Relationship Overview

```
 [User] ────────────────────────┐
    │ 1..*                      ▼
    ├───────────────────> [LostReport] <────────────── [Category]
    │                           │                           ▲
    │                           ▼                           │
    ├───────────────────> [LostFoundMatch] <────────────────┤
    │                           ▲                           │
    │ 1..*                      │                           │
    ├───────────────────> [FoundReport] ────────────────────┘
    │                           ▲
    │                           │
    ├───────────────────> [Claim] ───> [ReturnRecord]
    │
    ├───────────────────> [Conversation] ───> [Message]
    │
    ├───────────────────> [Report] (Abuse Moderation)
    │
    └───────────────────> [AuditLog]
```

---

## 2. Collections & Schemas

### A. `users`
- `_id`: ObjectId
- `name`: String (Required, trimmed, indexed)
- `email`: String (Required, unique, lowercase, indexed)
- `password`: String (Bcrypt hash, `select: false`)
- `phone`: String (Optional, for SMS/handover coordination)
- `country`: String (Default: `'Ethiopia'`)
- `region`: String (e.g., `'Oromia'`, `'Amhara'`, `'Sidama'`)
- `city`: String (Indexed, e.g., `'Addis Ababa'`, `'Hawassa'`)
- `avatar`: String (Profile image URI)
- `bio`: String
- `role`: Enum `['USER', 'ADMIN']` (Default: `'USER'`)
- `verificationStatus`: Enum `['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED']` (Default: `'VERIFIED'`)
- `reputation`: Subdocument
  - `ratingAverage`: Number (Default: 5.0)
  - `itemsReturned`: Number (Default: 0)
  - `itemsRecovered`: Number (Default: 0)
- `isSuspended`: Boolean (Default: false)
- `suspensionReason`: String
- `createdAt`, `updatedAt`: Timestamps

### B. `categories`
- `_id`: ObjectId
- `name`: String (e.g., `'Mobile Phones & Tablets'`, `'Wallets & Purses'`, `'Keys & Fobs'`)
- `slug`: String (Unique, e.g., `'phones-tablets'`)
- `description`: String
- `icon`: String (Lucide icon identifier)
- `isActive`: Boolean (Default: true)

### C. `locations` (Safe Public Meeting Hubs & Landmarks)
- `_id`: ObjectId
- `name`: String (e.g., `'Meskel Square Public Hub'`, `'Bole Medhanialem Center'`)
- `city`: String (Required, indexed)
- `region`: String
- `country`: String (Default: `'Ethiopia'`)
- `area`: String
- `address`: String
- `isOfficialMeetingSpot`: Boolean (Default: true)
- `meetingInstructions`: String
- `isActive`: Boolean (Default: true)

### D. `lostreports`
- `_id`: ObjectId
- `reporter`: ObjectId $\to$ `User` (Indexed)
- `title`: String (Required, text-indexed)
- `category`: ObjectId $\to$ `Category` (Indexed)
- `description`: String (Required, text-indexed)
- `color`: String
- `brand`: String
- `distinguishingCharacteristics`: String
- `country`: String
- `region`: String
- `city`: String (Indexed)
- `locationName`: String
- `lastKnownLocation`: ObjectId $\to$ `Location` (Optional)
- `dateLost`: Date (Required, indexed)
- `approximateTime`: String
- `images`: Array of Strings
- `status`: Enum `['ACTIVE', 'OPEN', 'POTENTIAL_MATCH', 'POSSIBLE_MATCH', 'CLAIM_PENDING', 'MATCH_CONFIRMED', 'RETURN_PENDING', 'RETURNED', 'CLOSED', 'EXPIRED']`
- `createdAt`, `updatedAt`: Timestamps

### E. `foundreports`
- `_id`: ObjectId
- `finder`: ObjectId $\to$ `User` (Indexed)
- `title`: String (Required, text-indexed)
- `category`: ObjectId $\to$ `Category` (Indexed)
- `description`: String (Required, text-indexed)
- `color`: String
- `brand`: String
- `country`: String
- `region`: String
- `city`: String (Indexed)
- `locationName`: String
- `foundLocation`: ObjectId $\to$ `Location` (Optional)
- `dateFound`: Date (Required, indexed)
- `approximateTime`: String
- `custodyStatus`: Enum `['WITH_FINDER', 'TRANSFERRED_TO_CUSTODIAN', 'TRANSFERRED_TO_OFFICER']`
- `custodyLocationDetails`: String
- `images`: Array of Strings
- `secretIdentifyingDetails`: String (Sensitive, excluded from public queries via projection)
- `status`: Enum `['AVAILABLE_FOR_CLAIM', 'REPORTED', 'UNDER_REVIEW', 'POTENTIAL_MATCH', 'CLAIM_PENDING', 'CLAIM_APPROVED', 'RETURNED', 'CLOSED']`
- `createdAt`, `updatedAt`: Timestamps

### F. `lostfoundmatches`
- `_id`: ObjectId
- `lostReport`: ObjectId $\to$ `LostReport` (Indexed)
- `foundReport`: ObjectId $\to$ `FoundReport` (Indexed)
- `matchScore`: Number (0–100, indexed)
- `breakdown`: Subdocument (`category`, `location`, `date`, `time`, `color`, `brand`, `description`)
- `reasons`: Array of Strings
- `status`: Enum `['SUGGESTED', 'CONFIRMED', 'DISMISSED']`
- `createdAt`: Timestamp

### G. `claims`
- `_id`: ObjectId
- `foundReport`: ObjectId $\to$ `FoundReport` (Indexed)
- `claimant`: ObjectId $\to$ `User` (Indexed)
- `lostReport`: ObjectId $\to$ `LostReport` (Optional)
- `proofDescription`: String (Required)
- `distinguishingFeaturesAnswer`: String (Required)
- `serialNumber`: String
- `proofImages`: Array of Strings
- `officerQuestions`: Array of Subdocuments (`question`, `askedBy`, `askedAt`, `answer`, `answeredAt`)
- `status`: Enum `['SUBMITTED', 'UNDER_REVIEW', 'MORE_INFO_REQUESTED', 'APPROVED', 'REJECTED', 'RETURNED']`
- `reviewedBy`: ObjectId $\to$ `User`
- `reviewDecisionNotes`: String
- `createdAt`, `updatedAt`: Timestamps

### H. `returnrecords`
- `_id`: ObjectId
- `foundReport`: ObjectId $\to$ `FoundReport`
- `lostReport`: ObjectId $\to$ `LostReport`
- `claim`: ObjectId $\to$ `Claim`
- `returnedBy`: ObjectId $\to$ `User`
- `receivedBy`: ObjectId $\to$ `User`
- `returnDate`: Date
- `pickupLocation`: ObjectId $\to$ `Location`
- `handoverLocationName`: String
- `notes`: String
- `evidenceImage`: String
- `createdAt`: Timestamp

### I. `conversations` & `messages`
- `conversations`:
  - `participants`: Array of ObjectId $\to$ `User`
  - `lostReport`: ObjectId $\to$ `LostReport` (Optional context)
  - `foundReport`: ObjectId $\to$ `FoundReport` (Optional context)
  - `claim`: ObjectId $\to$ `Claim` (Optional context)
  - `lastMessage`: String
  - `lastMessageAt`: Date
  - `unreadCount`: Map of Numbers
- `messages`:
  - `conversation`: ObjectId $\to$ `Conversation`
  - `sender`: ObjectId $\to$ `User`
  - `recipient`: ObjectId $\to$ `User`
  - `content`: String
  - `read`: Boolean
  - `readAt`: Date

### J. `reports` (Abuse & Safety Moderation)
- `_id`: ObjectId
- `reporter`: ObjectId $\to$ `User`
- `module`: Enum `['LOST_AND_FOUND', 'USER_SAFETY']`
- `targetType`: Enum `['LOST_REPORT', 'FOUND_REPORT', 'USER', 'CLAIM']`
- `targetId`: String
- `reason`: String
- `details`: String
- `status`: Enum `['PENDING', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED']`
- `actionTaken`: String
- `adminNotes`: String
- `resolvedBy`: ObjectId $\to$ `User`

### K. `auditlogs` & `systempolicies`
- Immutable governance records tracking actor, action, previousState, newState, timestamp, and IP address.
