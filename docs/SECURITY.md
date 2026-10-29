# 🔒 FindBack — Security & Privacy Architecture

Security in FindBack is engineered to prevent fraudulent claims, identity harvesting, privilege escalation, and unsafe physical encounters.

---

## 1. Authentication & Role-Based Access Control (RBAC)
- **Cryptographic JWT Tokens**: Session tokens are signed using HMAC SHA-256 with strong secrets (`JWT_SECRET`).
- **Strict Role Boundaries**: The platform operates with strictly two roles:
  - `USER`: General public community member.
  - `ADMIN`: Platform executive governance.
- **Role Elevation Defense**: Public registration unconditionally sets `role: 'USER'`. Any attempt to supply `role: 'ADMIN'` during registration or self-profile updates is rejected.
- **Account Suspension Enforcement**: Suspended users are immediately blocked at the token authentication middleware level before reaching any controller logic.
- **Production Secret Validation**: Production startup requires an explicitly configured JWT secret of at least 32 characters and refuses the built-in development fallbacks.
- **Origin Restrictions**: HTTP and Socket.IO CORS use the configured `CLIENT_URL` allowlist rather than wildcard origins.
- **Socket Authorization**: Socket connections require a valid session token and current account state. The server assigns the private user room from the verified identity, and conversation rooms require participant membership.
- **Session Revocation**: Password reset increments a per-user token version; existing HTTP and Socket.IO sessions are rejected.
- **Rate Limits**: Authentication endpoints are limited to 10 attempts per IP per 15 minutes. Image uploads are limited to 30 requests per IP per hour, with up to five 5 MB files per request. Other APIs do not currently have a global or per-user rate limit; configure additional limits and a shared store before a multi-instance deployment.
- **Private Report Queries**: User-specific report queries require authentication and ownership or admin access. Public searches accept only public report states and bounded, escaped filters.
- **Claim State Controls**: Claimants can only attach their own lost reports to actual matches. An atomic found-report status reservation prevents competing active claims. Private identifying details are excluded from claimant-facing claim responses and claimant contact fields are not included in other participants' claim responses. Returns require an approved claim and owner receipt confirmation is applied once.
- **Conversation and Match Authorization**: A message recipient must be the other participant in the conversation. Only a report owner or administrator can change a match status.
- **Workflow State Protection**: Report update endpoints accept descriptive edits and closure only; claim approval and actual return statuses are handled through their dedicated workflows.
- **Upload Limits**: Uploads are checked against JPEG, PNG, WEBP, and GIF file signatures, limited to five 5 MB files per request, and rate-limited by IP. Per-user daily quotas are not implemented.
- **Upload Retention**: Uploaded files are stored locally under `UPLOAD_DIR`; automated retention cleanup is not currently implemented. Persistent storage, backups, and retention policies remain deployment responsibilities.
- **Password Recovery**: Reset tokens are generated cryptographically, stored only as SHA-256 hashes, expire after 30 minutes, and are cleared after successful use.
- **Destructive Tooling**: Seed, reset, and clear scripts require explicit development-only confirmation and refuse to run in production. Seeded credentials must be configured privately rather than using a checked-in password.

---

## 2. Privacy & The "Secret Details Shield"
- **Information Asymmetry in Found Property**: Confidential identifying details are excluded from public searches and claimant-facing claim details. The finder can use them to assess proof without disclosing the answer.
- **Contact Data Protection**: Claim detail responses expose public profile fields but omit claimant email and phone. In-app messages are available to the conversation participants and authorized administrators.
- **Password Protection**: Passwords are encrypted using bcrypt with $\ge 10$ salt rounds and configured with `select: false` on the User model.
- **Automated Test Isolation**: The integration suite uses an in-memory MongoDB instance and never connects to or clears the configured application database.

---

## 3. Anti-Fraud Claim Verification
- **Self-Approval Guardrails**: Claimants can submit proof, answer challenge questions, and provide photos, but **can never approve their own claim**. Only the finder or a platform Administrator has review authority.
- **Challenge Q&A Threads**: Finders can issue specific challenge questions to verify ownership before agreeing to meet.
- **Immutable Return Logging**: Final physical handovers create a `ReturnRecord` storing the finder, receiver, date, location, notes, and optional handover evidence photo.

---

## 4. Physical Handover Safety
- **Public Safe Meeting Locations**: Designated public locations (e.g., Meskel Square, Bole Medhanialem Center, transit stations, municipal service centers).
- **In-App Safety Checklist**: Advice on meeting in daylight, in crowded public areas, and never sharing sensitive banking credentials or payment codes.

---

## 5. Immutable Governance Audit Trail
Key administrative, moderation, claim, and return actions generate an `AuditLog` entry storing:
- `actorId`: The administrator who initiated the action.
- `action`: Operation name (e.g., `USER_ACCESS_MODIFIED`, `SYSTEM_POLICY_UPDATED`, `REPORT_RESOLVED`).
- `entityType` & `entityId`: Target resource.
- `previousState` & `newState`: State snapshots.
- `ipAddress` & `timestamp`.
Audit logs cannot be modified or deleted through API endpoints. Database administrators and deployment operators remain responsible for backup retention and operational access.

## 6. Operational Boundaries
- SMTP delivery has not been validated against a live provider; password recovery remains unavailable until deployment-specific credentials are configured and tested.
- Owner receipt finalization uses MongoDB transactions. The production database must support transactions (for example, MongoDB Atlas or a replica set); standalone MongoDB deployments cannot safely run this workflow.
- Run the supplied checks in CI and staging; passing builds and focused tests do not constitute a penetration test or accessibility certification.
- Use HTTPS, restricted database credentials, backups, monitored security contacts, and persistent upload storage in production.
