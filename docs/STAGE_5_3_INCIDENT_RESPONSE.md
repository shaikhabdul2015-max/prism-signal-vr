# STAGE 5.3 — INCIDENT RESPONSE & FORENSIC EVIDENCE CHAIN OF CUSTODY

## 1. Incident Lifecycle State Machine

```
+------------+       (triage)       +---------------+
|  DETECTED  | -------------------> | INVESTIGATING |
+-----+------+                      +-------+-------+
      |                                     |
      | (rapid contain)                     | (contain)
      v                                     v
+------------+                      +---------------+
| CONTAINED  | <--------------------+   CONTAINED   |
+-----+------+                      +-------+-------+
      |
      v (remediate & verify)
+------------+
| REMEDIATED |
+-----+------+
      |
      v (close & archive)
+------------+
|   CLOSED   |
+------------+
```

---

## 2. Cryptographic Evidence Sealing (SHA-256 Chain of Custody)

Every incident created by `IncidentManager` generates forensic evidence sealed in the `IncidentEvidenceLocker`:
- Evidence payload contains sanitized network signals, target endpoints, timestamps, and detection rule IDs.
- A cryptographic SHA-256 digest is generated across the serialized evidence block.
- Any attempt to tamper with evidence data post-creation causes `verifyIntegrity()` to return `false`, ensuring admissibility for compliance audits.

---

## 3. Post-Incident Remediation Verification

Prior to advancing an incident from `CONTAINED` to `REMEDIATED` or `CLOSED`, `IncidentRecoveryVerifier` runs automated integrity checks:
1. Verifies target malicious IP remains under active quarantine.
2. Verifies KMS provider is fully operational and responsive.
3. Confirms active mitigation counts and verifies no anomalous signal spikes persist.
