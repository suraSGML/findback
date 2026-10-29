# 📡 FindBack — REST API Specification

**Base Endpoint:** `http://localhost:5000/api`  
**Authentication:** Bearer JWT in `Authorization` header (`Authorization: Bearer <token>`)

---

## 1. Authentication & User Profile (`/api/auth`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Public | Register new public community user (`USER` role, requires `name`, `email`, `password`, `city`, optional `phone`) |
| `POST` | `/api/auth/login` | Public | Authenticate user credentials & receive JWT token |
| `GET` | `/api/auth/me` | Authenticated | Retrieve authenticated user profile with reputation statistics |
| `PUT` | `/api/auth/profile` | Authenticated | Update user profile (`name`, `bio`, `phone`, `city`, `avatar`) |

---

## 2. Lost & Found Management (`/api/lost-found`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/lost-found/lost` | Public | Search and filter active lost item reports (`search`, `category`, `city`, `region`, `status`, `page`, `limit`) |
| `GET` | `/api/lost-found/lost/:id` | Public | Retrieve detailed lost item report |
| `POST` | `/api/lost-found/lost` | Authenticated | Post lost item report (automatically computes heuristic correlation matches) |
| `PUT` | `/api/lost-found/lost/:id` | Reporter/Admin | Update report details or mark status (`RETURNED`, `CLOSED`) |
| `GET` | `/api/lost-found/found` | Public | Search found property (confidential `secretIdentifyingDetails` shielded from non-finders/non-admins) |
| `GET` | `/api/lost-found/found/:id` | Public | Retrieve found property details (confidential attributes masked) |
| `POST` | `/api/lost-found/found` | Authenticated | Report found property with optional secret identifying features |
| `PUT` | `/api/lost-found/found/:id` | Finder/Admin | Update found report details, custody, or status |
| `GET` | `/api/lost-found/matches` | Authenticated | Get heuristic similarity matches for user's reports with match score breakdown |
| `PUT` | `/api/lost-found/matches/:id` | Authenticated | Update match status (`CONFIRMED`, `DISMISSED`) |

---

## 3. Ownership Claims & Verification (`/api/claims`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/claims` | Authenticated | Submit ownership claim with proof description, identifying answers, serial numbers, and photos |
| `GET` | `/api/claims` | Finder/Admin | Retrieve claims awaiting verification for items posted by finder or platform queue |
| `GET` | `/api/claims/my-claims` | Authenticated | Retrieve claims filed by the authenticated user |
| `GET` | `/api/claims/:id` | Claimant/Finder/Admin | View claim details, verification history, and challenge Q&A thread |
| `POST` | `/api/claims/:id/question` | Finder/Admin | Challenge claimant with specific verification question |
| `POST` | `/api/claims/:id/answer` | Claimant | Submit answer to finder/admin verification challenge question |
| `PUT` | `/api/claims/:id/review` | Finder/Admin | Approve or reject claim (claimants are prevented from approving their own claims) |
| `POST` | `/api/claims/confirm-return` | Finder/Admin | Record the handover; owner confirmation is required to finalize the return |
| `POST` | `/api/claims/:id/confirm-receipt` | Claimant | Confirm receipt, complete the return certificate, and publish the confirmed return |

---

## 4. Secure Peer Messaging (`/api/messages`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/messages/conversations` | Authenticated | List user conversations linked to lost/found items and claims |
| `GET` | `/api/messages/:conversationId?page=1&limit=100` | Participant/Admin | Retrieve a bounded, chronologically ordered page of message history and mark unread items as read; response includes total/page/limit/pages metadata |
| `POST` | `/api/messages` | Authenticated | Send message linked to `lostReportId`, `foundReportId`, or `claimId` |

---

## 5. Safety & Abuse Moderation (`/api/reports`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/reports` | Authenticated | Submit report against suspicious lost/found post, user misconduct, or fraudulent claim |
| `GET` | `/api/reports` | Admin | Retrieve moderation queue of pending abuse reports |
| `PUT` | `/api/reports/:id/resolve` | Admin | Resolve report (`WARNING_ISSUED`, `CONTENT_REMOVED`, `ACCOUNT_SUSPENDED`, `DISMISSED`) |

---

## 6. Executive Administration & Governance (`/api/admin`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/analytics` | Admin | Real-time recovery analytics (total users, active lost, active found, recovery rate, returns, pending claims) |
| `GET` | `/api/admin/users` | Admin | Manage user directory (`search`, `role`, `verificationStatus`, `isSuspended`) |
| `PUT` | `/api/admin/users/:id` | Admin | Update user role (`USER`, `ADMIN`), verification status, or suspend/reactivate account |
| `GET` | `/api/admin/audit-logs` | Admin | Paginated immutable governance audit trail |
| `GET` | `/api/admin/policy` | Admin | Retrieve system policies, safety tips, and heuristic match weights |
| `PUT` | `/api/admin/policy` | Admin | Re-calibrate heuristic matching weights and platform policies |

---

## 7. Metadata: Categories & Safe Meeting Locations (`/api/categories`, `/api/locations`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/categories` | Public | List active lost & found categories (Electronics, Wallets, IDs, Keys, etc.) |
| `GET` | `/api/locations` | Public | List designated safe public meeting spots with instructions |
| `POST` | `/api/locations` | Admin | Register new official public safe meeting hub |

---

## 8. Media Uploads (`/api/upload`)

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/upload` | Authenticated | Upload item photos (multipart/form-data) |

## 9. Notifications

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/notifications?page=1&limit=50` | Authenticated | Retrieve a page of the user's notification history, unread count, and pagination metadata |
| `PUT` | `/api/notifications/:id/read` | Authenticated | Mark one owned notification as read, or use `all` to mark all as read |
