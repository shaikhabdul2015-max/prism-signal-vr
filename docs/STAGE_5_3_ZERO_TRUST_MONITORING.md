# STAGE 5.3 — ZERO-TRUST RUNTIME MONITORING & RBAC SPECIFICATION

## 1. Zero-Trust Architecture
PRISM SIGNAL: BEYOND THE VOID enforces continuous server-side authorization under the core tenet: **"Never Trust, Always Verify"**. Every incoming API and WebXR state request is verified for identity, session health, tenant boundary isolation, and least-privilege permission.

---

## 2. Session Integrity & Anomaly Signals

The `SessionRiskMonitor` verifies session telemetry on every transaction:
- **IP Mutation**: If an active session's source IP changes mid-session, access is rejected immediately as a potential session hijacking indicator.
- **User-Agent Mutation**: If browser/client fingerprints diverge from initialization parameters, access is suspended.
- **Session Lifetimes**: Max idle timeout (30 minutes) and max session age (24 hours) are enforced server-side.
- **Revocation Enforcement**: Revoked sessions in `ResponseExecutor` reject all subsequent requests with HTTP 401.

---

## 3. Server-Side Least-Privilege Role Hierarchy

```
ADMIN
  └── SECURITY_OPERATOR
        ├── KMS_ADMIN
        │     └── ENCRYPTION_SERVICE / DECRYPTION_SERVICE
        └── USER
              └── GUEST
```

- **Explicit Grants**: Operations require exact permission matching (e.g. `kms:wrap`, `security:approve`).
- **Fail-Closed Default**: Requests with missing principals, expired credentials, or ungranted permissions fail closed with HTTP 401 or HTTP 403.
