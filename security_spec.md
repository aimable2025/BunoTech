# Security Specification (`security_spec.md`) — AIMABLE MAOMBI BUNOTI — BUNO TECH

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every path not explicitly matched is denied (`allow read, write: if false;`).
2. **Identity & Email Verification**: All standard write operations require `request.auth != null && request.auth.token.email_verified == true`.
3. **Zero Privilege Escalation**: A non-admin user creating `/users/{userId}` MUST set `role == 'client'` and `status == 'active'`, and `uid == request.auth.uid && userId == request.auth.uid`. Users can never self-assign `role == 'admin'`.
4. **PII Isolation**: `/users/{userId}` contains PII (`email`, `phone`). Reading (`get`/`list`) is strictly limited to `resource.data.uid == request.auth.uid || isVerifiedAdminEmail()`. Blanket `isSignedIn()` reads are forbidden.
5. **Relational Ownership**:
   - `serviceRequests`: `clientId` must equal `request.auth.uid` on client creation and remain immutable.
   - `quotes`: `clientId` must equal `request.auth.uid` on client creation and remain immutable. Clients can only transition status to `accepted`, `rejected`, or `discount_requested` (when not in terminal state `accepted`/`rejected`/`expired`), whereas only Admin can grant/reject discounts (`discount_approved`, `discount_rejected`, `finalTotal`).
   - `subscriptions` & `payments`: Clients can only submit `status == 'pending'` / `status == 'pending_verification'`. Only Admin can activate a subscription (`status == 'active'`) or confirm a payment (`status == 'confirmed'`).
6. **Public Catalog Integrity**: `services`, `pricing`, `portfolio`, `partners`, `subscriptionPlans`, `templates`, and `settings` can only be read by the public if `resource.data.isPublic == true`. Only Admin can create, update, or delete catalog items.
7. **Temporal Integrity**: Every document creation enforces `incoming().createdAt == request.time`, and every update enforces `incoming().updatedAt == request.time` and immutability of `createdAt`.
8. **Cost-Optimized `allow list`**: No `get()` or `exists()` calls are permitted inside any `allow list` block. All `allow list` rules evaluate `resource.data` directly or check `isVerifiedAdminEmail()`.

## 2. The "Dirty Dozen" Adversarial Payloads

1. **Payload 1 (Self-Admin Escalation)**: Authenticated client writes `/users/{uid}` with `{"role": "admin"}` -> `PERMISSION_DENIED`.
2. **Payload 2 (PII Harvesting)**: Authenticated client `userA` attempts `get(/users/userB)` -> `PERMISSION_DENIED`.
3. **Payload 3 (Shadow Field Injection)**: Client updates `/users/{uid}` with extra field `{"isSuperUser": true}` -> `PERMISSION_DENIED` via `hasOnly()`.
4. **Payload 4 (Unverified Admin Spoof)**: Attacker with `email: "aimablebunoti@gmail.com"` but `email_verified: false` attempts admin write -> `PERMISSION_DENIED`.
5. **Payload 5 (Fake Active Subscription)**: Client creates `/subscriptions/sub1` with `{"status": "active"}` without admin confirmation -> `PERMISSION_DENIED` (clients can only create with `status == 'pending'`).
6. **Payload 6 (Self-Approved Quote Discount)**: Client updates `/quotes/q1` with `{"status": "discount_approved", "finalTotal": 1}` -> `PERMISSION_DENIED` (only Admin can approve discounts or change `finalTotal`).
7. **Payload 7 (Terminal State Mutation)**: Client attempts to update `/quotes/q1` after `status == 'accepted'` -> `PERMISSION_DENIED`.
8. **Payload 8 (ID Poisoning / 1MB String)**: Attacker attempts to create `/serviceRequests/bad$id` or inject a 10,000-char `title` -> `PERMISSION_DENIED`.
9. **Payload 9 (Fake Published Testimonial)**: Client creates `/testimonials/t1` with `{"status": "published", "isPublic": true}` -> `PERMISSION_DENIED` (clients can only create `status == 'pending' && isPublic == false`).
10. **Payload 10 (Forged Timestamp)**: Client creates `/documents/d1` with a past/future `createdAt` instead of `request.time` -> `PERMISSION_DENIED`.
11. **Payload 11 (Cross-Tenant Quote Scraping)**: Client executes `list` on `/quotes` without filtering by `clientId == request.auth.uid` -> `PERMISSION_DENIED`.
12. **Payload 12 (Audit Log Tampering)**: User or attacker attempts `update` or `delete` on `/auditLogs/{logId}` -> `PERMISSION_DENIED` (append-only).
