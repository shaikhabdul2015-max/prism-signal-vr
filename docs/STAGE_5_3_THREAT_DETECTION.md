# STAGE 5.3 — AUTONOMOUS THREAT DETECTION SPECIFICATION

## 1. Executive Summary & Capabilities
Stage 5.3 introduces real-time intelligent threat detection for PRISM SIGNAL: BEYOND THE VOID. The architecture combines deterministic sliding-window rules, behavioral baselining, and threat classification to identify attacks with sub-millisecond evaluation latency.

---

## 2. Supported Threat Categories & Detection Rules

| Threat Category | Trigger Criteria | Sliding Window | Base Severity | Base Score |
| :--- | :--- | :--- | :--- | :--- |
| **BRUTE_FORCE** | ≥ 5 failed authentications targeting a single identity/IP | 60s | HIGH | 70 |
| **CREDENTIAL_STUFFING** | ≥ 6 failed authentications across ≥ 3 distinct user accounts from single IP | 60s | CRITICAL | 90 |
| **SUSPICIOUS_KMS_OPERATION** | Unauthorized wrap/unwrap, tampering, or access to revoked key versions | 120s | CRITICAL | 95 |
| **PRIVILEGE_ESCALATION** | Non-admin caller probing admin endpoints or unauthorized role assumption | 60s | CRITICAL | 95 |
| **SESSION_HIJACKING** | Mid-session IP address jitter or User-Agent fingerprint mutation | 300s | HIGH | 85 |
| **API_ABUSE** | ≥ 100 requests in 10s from a single source IP | 10s | MEDIUM | 55 |
| **RESOURCE_EXHAUSTION** | Request payload > 5MB or excessive socket connection churn | 30s | HIGH | 80 |
| **INJECTION_ATTEMPT** | SQL, NoSQL, or command injection signatures in query parameters | Instant | CRITICAL | 90 |

---

## 3. Threat Risk Scoring Engine (0–100 Scale)

The `ThreatScoring` module computes deterministic risk scores normalized between 0 and 100:
$$\text{Score} = \text{BaseScore} + \text{FreqBonus} + \text{PrivilegeBonus} + \text{AnomalyBonus} + \text{HistoryBonus}$$

### Severity Mapping
- **CRITICAL** (90–100): Direct incident response trigger, temporary IP quarantine, Level 4 policy.
- **HIGH** (75–89): Session revocation, suspicious penalty tier rate limiting.
- **MEDIUM** (50–74): Step-up authentication challenge, session restriction.
- **LOW** (25–49): Telemetry tracking, rate limiting.
- **INFORMATIONAL** (0–24): Telemetry recording.

---

## 4. Deduplication & Memory Management
- **Suppression Window**: 10 seconds per unique threat fingerprint (`category:source:window`).
- **Sliding History**: In-memory signal buffers automatically evict entries older than 5 minutes.
- **Privacy & Safety**: Passwords, authorization tokens, session secrets, and cryptographic keys are strictly redacted (`[REDACTED]`) before context serialization or event bus publication.
