# SECURITY & ZERO-TRUST COMPLIANCE AUDIT

**Audit Date:** 2026-11-10T13:30:00Z  
**Scope:** Authentication, RBAC, API Security, Secret Management, KMS/Encryption, Security Headers, Input Validation, Dependencies, Rate Limiting, Audit Logging, Data Isolation

---

## 1. Live Server & Middleware Verification (`http://localhost:3000`)

Measured against the running Express server (`server.ts` + `server/middleware/securityMiddleware.ts`):

| Control | Live Observed Value | Assessment |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | **VERIFIED** |
| `X-Frame-Options` | `SAMEORIGIN` | **VERIFIED** |
| `X-XSS-Protection` | `1; mode=block` | **VERIFIED** |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | **VERIFIED** |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | **VERIFIED** |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=(), fullscreen=(self), xr-spatial-tracking=(self)` | **VERIFIED** (Camera denied by default) |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://www.gstatic.com; ...` | **PARTIALLY_VERIFIED** (`unsafe-inline`/`unsafe-eval` permitted for Vite dev compatibility) |
| `X-Trace-Id` | Propagated (`trc-...`) | **VERIFIED** |
| Replay Nonce Duplicate (`POST /api/cloud/sync`) | HTTP `409 Conflict` | **VERIFIED** when headers provided; **PARTIALLY_VERIFIED** because missing `x-request-nonce`/`x-request-timestamp` headers bypass check |
| Stale Timestamp (`-600s` drift) | HTTP `400 Bad Request` | **VERIFIED** |

---

## 2. Cryptographic & KMS Posture (Stage 5.2)

- **Secret & Weak Cipher Scan (`scripts/devsecops-gate.sh`):** **0** leaked private keys, service accounts, or Groq `gsk_` tokens in `src/`; **0** banned weak ciphers (`DES`, `RC4`, `Blowfish`, `AES-128-ECB`, `MD5`) in `src/security/`.
- **Envelope Encryption (`AESGCMService` + `EnvelopeEncryption` + `LocalKMSProvider`):** Uses 256-bit CSPRNG DEKs, 96-bit IVs, 128-bit GCM auth tags, AAD verification, and immediate buffer zeroing (`buffer.fill(0)`). Runtime round-trip verified (`2.325 ms`, integrity verified).
- **Cloud KMS (`GoogleCloudKMSProvider`):** Properly parameterized via environment variables (`GCP_PROJECT_ID`, `GCP_KMS_LOCATION`, `GCP_KMS_KEYRING`, `GCP_KMS_KEY_ID`) and official `@google-cloud/kms` SDK; unit-tested with mocked clients. Live GCP KMS API calls remain **NOT_TESTED** without service credentials.

---

## 3. Authentication, RBAC & Multi-Tenant Data Isolation

- **Firestore Rules (`firestore.rules`):** Hardened tenant-isolated collections (`/tenants/{tenantId}/members`, `telemetry`, `incidents`, `documents`) validate IDs, roles (`SUPER_ADMIN`, `TENANT_ADMIN`, `EDITOR`, `VIEWER`), membership existence, and finish with a default-deny catch-all (`allow read, write: if false`).
  - *Gap Identified:* Legacy root collections `/vr_telemetry/{sessionId}` and `/vr_incidents/{fingerprint}` (`lines 169–179`) allow `read, create, update` to any `isSignedIn()` user without tenant/owner scoping.
- **Simulated Local Auth (`firebaseAuthService.ts`):** Gracefully supports offline/local simulation when `VITE_FIREBASE_BYPASS_REMOTE="true"`, storing session profiles in `localStorage`. Never ships production Firebase service-account secrets.
- **Spatial Privacy (`SpatialSecurityGuard.ts`):** `camera_recognition` and `room_scanning` default to `'denied'`; grants without `hardwareSupported === true` downgrade to `'unavailable'`; spatial telemetry quantizes coordinates (`0.5m` step), buckets timestamps (`5000ms`), and anonymizes session IDs (`anon-...`).

---

## 4. Dependency, Rate Limiting & Timeout Findings

1. **Supply Chain (`npm audit --json`):** **0** vulnerability advisories (**0** critical, **0** high, **0** moderate).
2. **Server Timeout Ordering Defect:** `server.ts` applies `requestTimeoutMiddleware(8000)` globally, whereas `server/routes/llama.ts` applies a `10000ms` timeout before falling back to its deterministic rule engine. Any upstream LLM request taking 8–10s will terminate with `504 Gateway Timeout` before fallback executes.
3. **Disconnected Rate Limiters:** `server.ts` (`serverRateLimiter(240)`) and `server/routes/cloud.ts` (`120/min`) use local per-process `Map` stores rather than `DistributedRedisRateLimitStore` (`src/security/rate-limiting/RateLimitStore.ts`), limiting multi-instance enforcement.
4. **Hash-Chained Audit Log (`CommandAuditService.ts`):** Uses a deterministic FNV/linear hash (`CH23-...`) in browser-compatible code rather than SHA-256 SubtleCrypto/Node crypto, and notes honestly in source comments that client memory storage is not hardware-immutable.
