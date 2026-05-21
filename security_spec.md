# Security Specification and Payload TDD (Phase 0)

This document details the security contracts, operational invariants, and the "Dirty Dozen" adversarial payloads designed to test and breach the systems.

## 1. Core Data Invariants

1. **Immutable Historical Records**: Once an audit log is created, it can never be modified or deleted (`allow update, delete: if false`). It is strictly append-only.
2. **Strict Transfer Transitions**: A stock transfer document (`status` in `transferts` collection) can only transition from `EN_TRANSIT` to `RECU`. Direct modification after reaching the terminal state `RECU` is strictly forbidden.
3. **Anti-Identity Spoofing**: No user can assign themselves a different `role` or toggle active status. All writes to the `/accounts/{userId}` collection must be bounded by the user's authentic UID matching the auth token (`request.auth.uid == userId`) and must not self-promote role levels.
4. **No Direct Inventory Manipulation**: Users cannot arbitrarily override article quantities without a transaction-bound mouvement or maintenance record. All stock updates must match an authenticated entry or exit.
5. **No System Data Spoofing**: Critical timestamps such as `createdAt`, `updatedAt`, `dateReception`, and `timestamp` must rely on `request.time` (server-side generation) instead of user-supplied values.

---

## 2. The "Dirty Dozen" Adversarial Payloads

These 12 payloads represent attacks on the identity, state machine, and data integrity of HydroMines:

### Payload 1: Superuser Promotion Attack
* **Target Collection**: `/accounts/attacker_uid`
* **Adversarial Goal**: Elevate a standard role (`MAGASINIER`) to `ADMIN`.
* **Payload**:
```json
{
  "id": "attacker_uid",
  "email": "attacker@gmail.com",
  "name": "Attacker",
  "role": "ADMIN",
  "active": true
}
```
* **Expected Result**: `PERMISSION_DENIED` - Users cannot modify or choose roles without existing admin privilegdes.

### Payload 2: Account Hijack Activation
* **Target Collection**: `/accounts/other_active_user_uid`
* **Adversarial Goal**: Disable an active warehouse user without permissions.
* **Payload**:
```json
{
  "active": false
}
```
* **Expected Result**: `PERMISSION_DENIED` - Updates to other users are restricted to administrators.

### Payload 3: Audit Log Alteration (Rewriting History)
* **Target Collection**: `/auditLogs/log_abc123`
* **Adversarial Goal**: Edit a recorded transaction log to hide a stock discrepancy.
* **Payload**:
```json
{
  "amount": 1000,
  "action": "CORRECTION_FALSE",
  "details": "Falsified log"
}
```
* **Expected Result**: `PERMISSION_DENIED` - Logs are strictly immutable.

### Payload 4: Audit Log Erasement
* **Target Collection**: `/auditLogs/log_abc123` (DELETE)
* **Adversarial Goal**: Remove a suspicious log trace completely.
* **Expected Result**: `PERMISSION_DENIED` - Deletes are forbidden.

### Payload 5: Transfer State Retrograde (Rolling back finished transaction)
* **Target Collection**: `/transferts/transfer_xyz`
* **Adversarial Goal**: Revert a completed `RECU` transfer back to `EN_TRANSIT` to double-receive items.
* **Payload**:
```json
{
  "status": "EN_TRANSIT"
}
```
* **Expected Result**: `PERMISSION_DENIED` - Terminal state `RECU` cannot be altered or retrograded.

### Payload 6: Arbitrary Quantity Override (Ghost Stock Injection)
* **Target Collection**: `/articles/article_abc`
* **Adversarial Goal**: Direct update of stock quantities to forge assets on site.
* **Payload**:
```json
{
  "quantity": 999999
}
```
* **Expected Result**: `PERMISSION_DENIED` - Directly changing quantity without valid role and transaction rules constraints is blocked.

### Payload 7: Future Timestamp Spoofing
* **Target Collection**: `/mouvements/mov_def456`
* **Adversarial Goal**: Inject a future date as a valid server date to corrupt timelines.
* **Payload**:
```json
{
  "id": "mov_def456",
  "date": "2030-01-01T00:00:00.000Z",
  "type": "ENTREE"
}
```
* **Expected Result**: `PERMISSION_DENIED` - Validations check actual request times (`request.time`).

### Payload 8: Resource Exhaustion ID Poisoning
* **Target Collection**: `/articles/some_malicious_mega_character_string_that_exceeds_128_chars_to_force_high_read_charges`
* **Adversarial Goal**: Denial of Wallet/Wallet Exhaustion attack using long invalid keys.
* **Expected Result**: `PERMISSION_DENIED` - ID validation limits size to 128 chars and forces format rules.

### Payload 9: Unverified User Manipulation
* **Target Collection**: `/mouvements/mov_789`
* **Adversarial Goal**: Write movements with an unverified email token.
* **Expected Result**: `PERMISSION_DENIED` - Rules require `request.auth.token.email_verified == true`.

### Payload 10: Non-Existent Article Linkage
* **Target Collection**: `/mouvements/mov_000`
* **Adversarial Goal**: Create a mouvement linked to a fake article ID.
* **Expected Result**: `PERMISSION_DENIED` - Creating/updating documents with broken links checks reference existence.

### Payload 11: Transfer Transit Hijacking
* **Target Collection**: `/transferts/transfer_xyz`
* **Adversarial Goal**: Modify the target site of an active transfer in transit to hijack goods.
* **Payload**:
```json
{
  "targetSite": "OUANSIMI"
}
```
* **Expected Result**: `PERMISSION_DENIED` - System properties of active transfers cannot be edited once dispatched.

### Payload 12: Anomaly Report Override
* **Target Collection**: `/anomalyReports/anomaly_123`
* **Adversarial Goal**: Dismiss or remove security warnings from the dashboard.
* **Expected Result**: `PERMISSION_DENIED` - Anomaly logs are written by the server/system and readable only.

---

## 3. Test Runner Definitions

Rules can be local-run or tested before production deployments to prevent security leaks. 
All validation assertions align with the zero-trust policy.
