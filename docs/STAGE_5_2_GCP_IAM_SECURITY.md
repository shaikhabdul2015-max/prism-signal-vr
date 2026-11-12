# STAGE 5.2 — GOOGLE CLOUD IAM SECURITY & ZERO-TRUST GOVERNANCE

## 1. Zero-Trust IAM Architecture
In accordance with enterprise zero-trust principles, broad administrative roles (e.g. `roles/owner` or `roles/editor`) are strictly prohibited in PRISM SIGNAL: BEYOND THE VOID. Cryptographic duties are partitioned into dedicated service accounts and fine-grained Cloud IAM roles.

---

## 2. Dedicated Service Accounts & Role Mapping

| Service Identity | Bound IAM Role | Granted Permissions | Purpose |
| :--- | :--- | :--- | :--- |
| `sa-prism-ingest@{PROJECT}.iam.gserviceaccount.com` | `roles/cloudkms.cryptoKeyEncrypter` | `cloudkms.cryptoKeyVersions.useToEncrypt` | Wraps ephemeral DEKs during real-time telemetry and state ingestion. |
| `sa-prism-reader@{PROJECT}.iam.gserviceaccount.com` | `roles/cloudkms.cryptoKeyDecrypter` | `cloudkms.cryptoKeyVersions.useToDecrypt` | Unwraps DEKs for authorized multi-tenant state replication and audit consumers. |
| `sa-prism-ops@{PROJECT}.iam.gserviceaccount.com` | `roles/cloudkms.admin` | `cloudkms.cryptoKeys.create`, `cloudkms.cryptoKeys.update`, `cloudkms.cryptoKeyVersions.create` | Key lifecycle management, automated scheduled rotation, and disaster recovery. |
| `sa-prism-auditor@{PROJECT}.iam.gserviceaccount.com` | `roles/cloudkms.viewer` | `cloudkms.cryptoKeys.get`, `cloudkms.cryptoKeyVersions.list` | SOC2, FedRAMP, and ISO 27001 compliance audit trail inspection. |

---

## 3. Automated Permission Testing

`GoogleCloudKMSProvider.validateIAMPermissions()` executes `client.testIamPermissions()` across:
- `cloudkms.cryptoKeyVersions.useToEncrypt`
- `cloudkms.cryptoKeyVersions.useToDecrypt`
- `cloudkms.cryptoKeys.get`
- `cloudkms.cryptoKeys.update`

If any required permission is withheld, the provider returns a structured diagnostic report detailing missing IAM roles rather than failing silently.

---

## 4. Fail-Closed Security Posture

- When `KMS_PROVIDER=GOOGLE_CLOUD_KMS` is designated in configuration, `KMSFactory` instantiates `GoogleCloudKMSProvider`.
- If Google Cloud KMS is unreachable, unauthenticated, or denied, the system throws `GoogleCloudKMSError` immediately.
- **Strict Prohibition**: The factory and provider never silently fall back to local software encryption when production Cloud KMS is requested, eliminating silent security degradation vulnerabilities.
