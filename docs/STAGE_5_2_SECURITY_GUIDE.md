# STAGE 5.2 — ENTERPRISE SECURITY GUIDE, RBAC & EMERGENCY COMPROMISE RESPONSE

## 1. Cryptographic Standard & Prohibited Ciphers

PRISM SIGNAL: BEYOND THE VOID enforces modern cryptographic standards across all modules.

### Approved Algorithms
- **Symmetric Data Encryption**: AES-256-GCM (NIST SP 800-38D).
  - Initialization Vector (IV): 96-bit (12 bytes) uniquely generated per operation via CSPRNG (`crypto.randomBytes(12)`).
  - Authentication Tag: 128-bit (16 bytes) mandatory verification.
  - Key Material: 256-bit (32 bytes).
- **Key Wrapping**: AES-256-GCM / Cloud KMS wrapping protocols.
- **Hashing**: SHA-256 / SHA-384 / SHA-512.

### Banned Algorithms (Enforced in DevSecOps Pipeline)
The DevSecOps pipeline (`scripts/devsecops-gate.sh` Gate 5) automatically scans the codebase for prohibited legacy primitives:
- `DES` / `3DES` (Insecure block size and key length).
- `RC4` (Biased keystream vulnerabilities).
- `MD5` / `MD4` (Collision vulnerability).
- `AES-ECB` (Deterministic ciphertext pattern leakage).

---

## 2. Role-Based Access Control (RBAC) & Principle of Least Privilege

`KeyAccessPolicyManager` isolates cryptographic duties into strict roles:

| Role | Allowed Operations | Forbidden Operations | Typical Consumer |
| :--- | :--- | :--- | :--- |
| `KMS_ADMIN` | `CREATE_KEY`, `ROTATE_KEY`, `REVOKE_KEY`, `BACKUP_KEY`, `RESTORE_KEY` | Direct `DECRYPT` on user data | DevSecOps automation, Security Officer |
| `ENCRYPTION_SERVICE` | `ENCRYPT`, `WRAP_KEY` | `DECRYPT`, `UNWRAP_KEY`, `REVOKE_KEY` | Ingestion pipelines, WebXR state publishers |
| `DECRYPTION_SERVICE` | `DECRYPT`, `UNWRAP_KEY` | `ENCRYPT`, `ROTATE_KEY`, `REVOKE_KEY` | Authorized state listeners, audit verification |
| `AUDITOR` | `AUDIT_LOGS`, `GET_KEY_METADATA` | `ENCRYPT`, `DECRYPT`, `WRAP_KEY`, `UNWRAP_KEY` | Compliance monitors, SOC2 auditor agents |

### Adaptive Rate Limiting & Anomaly Detection
- Each principal is subject to rate limiting (e.g. max 5,000 ops/min).
- Excessive failed decrypt operations trigger automatic quarantine and alert generation via `DistributedEventBus`.

---

## 3. Emergency Key Compromise Response Framework

`KeyCompromiseManager` manages incidents where a KEK or key version may have been leaked or exposed:

```
[ Compromise Detected / Reported ]
                 |
                 v
[ KeyCompromiseManager.declareCompromise() ]
                 |
                 +--> 1. Immediate State Change: ACTIVE -> REVOKED
                 |
                 +--> 2. Key Material Zeroing: Purged from active cache
                 |
                 +--> 3. Emergency Provisioning: Spawn new clean key version
                 |
                 +--> 4. High-Priority Alert: Broadcast via DistributedEventBus
                 |
                 +--> 5. Security Incident Log: Timestamp, reason, operator ID recorded
```

### Containment SLA
- Compromise revocation execution: **< 1.0 ms**
- All subsequent encrypt/decrypt attempts against the compromised key version fail closed immediately with `SecurityError: Key version is revoked`.
