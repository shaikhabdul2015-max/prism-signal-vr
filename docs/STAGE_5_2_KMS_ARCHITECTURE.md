# PRISM SIGNAL: BEYOND THE VOID
## STAGE 5.2 — ENTERPRISE HSM/KMS ARCHITECTURE SPECIFICATION

### 1. Architecture Overview

PRISM SIGNAL: BEYOND THE VOID incorporates a provider-agnostic Key Management Service (KMS) and Hardware Security Module (HSM) architecture. Master Key Encryption Keys (KEKs) remain strictly isolated within HSM/KMS boundaries, while application datasets and spatial assets are protected using AES-256-GCM envelope encryption.

```
 [ Application Layer / WebXR Runtime ]
                  │
                  ▼ (Plaintext Data + AAD)
 ┌──────────────────────────────────────────────────────────────┐
 │               EnvelopeEncryption Coordinator                 │
 ├──────────────────────────────┬───────────────────────────────┤
 │ 1. Generate ephemeral DEK    │  crypto.randomBytes(32)       │
 │ 2. AES-256-GCM Data Encrypt  │  96-bit IV, 128-bit AuthTag   │
 └──────────────┬───────────────┴───────────────▲───────────────┘
                │ (Raw 256-bit DEK)             │ (Unwrapped DEK)
                ▼                               │
 ┌──────────────────────────────────────────────┴───────────────┐
 │                     KMSProvider Abstraction                  │
 ├──────────────────────────────────────────────────────────────┤
 │  wrapKey(keyId, dek, aad) ──► unwrapKey(keyId, wrapped, aad) │
 └──────────────────────────────┬───────────────────────────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
 ┌──────────────┐       ┌──────────────┐        ┌──────────────┐
 │ Google Cloud │       │   AWS KMS    │        │  Local KMS   │
 │     KMS      │       │ / Azure Vault│        │   Provider   │
 └──────────────┘       └──────────────┘        └──────────────┘
```

---

### 2. Envelope Encryption Protocol

1. **Data Encryption Key (DEK) Generation:**
   - For every encryption request, a unique 256-bit symmetric key is generated using Node.js cryptographically secure pseudorandom number generators (`crypto.randomBytes(32)`).
   - DEKs are single-use; a DEK is never reused across different payloads or tenant collections.
2. **Authenticated Symmetric Encryption:**
   - Standard: AES-256-GCM (Galois/Counter Mode, NIST SP 800-38D compliant).
   - IV: Unique 96-bit (12 bytes) Initialization Vector per ciphertext.
   - Authentication Tag: 128-bit (16 bytes) tag guaranteeing payload authenticity and ciphertext integrity.
   - Additional Authenticated Data (AAD): Tenant context and record IDs are cryptographically bound to the ciphertext, preventing ciphertext relocation attacks.
3. **Key Encryption Key (KEK) Wrapping:**
   - The plaintext DEK is sent to the active KMS provider for wrapping (`wrapKey`).
   - The wrapped DEK, its wrap IV, and its wrap AuthTag are stored alongside the ciphertext inside an authenticated `EncryptedEnvelope`.
4. **Memory Zeroing:**
   - Immediately following wrapping or decryption, plaintext DEK buffers in memory are zero-filled using `Buffer.fill(0)` via `AESGCMService.zeroBuffer()`.

---

### 3. Provider-Agnostic KMS Blueprints

#### A. Google Cloud KMS
- **Resource Path:** `projects/{project}/locations/{location}/keyRings/{keyRing}/cryptoKeys/{keyId}`
- **Operations:** Cloud KMS REST/gRPC API invoking `projects.locations.keyRings.cryptoKeys.encrypt` and `decrypt`.
- **Hardware Tier:** Cloud KMS HSM (FIPS 140-2 Level 3 certified).

#### B. AWS KMS
- **Key ARN:** `arn:aws:kms:{region}:{account}:key/{keyId}`
- **Operations:** AWS KMS `Encrypt` and `Decrypt` actions with Encryption Context matching tenant AAD.
- **Hardware Tier:** AWS CloudHSM / KMS FIPS 140-2 Level 3 validated HSMs.

#### C. Azure Key Vault
- **Vault URL:** `https://{vaultName}.vault.azure.net/keys/{keyName}`
- **Operations:** Azure Key Vault Cryptography Client `wrapKey` and `unwrapKey` with `RSA-OAEP-256` or `A256KW`.

#### D. PKCS#11 Hardware Security Modules (On-Premises / Air-Gapped)
- **Module Interface:** PKCS#11 v2.40 standard (`C_WrapKey`, `C_UnwrapKey`, `C_GenerateKey`).
- **Hardware:** YubiHSM2, Thales Luna HSM, Nitrokey HSM.

#### E. Local Development Provider (`LocalKMSProvider`)
- Implemented natively using Node.js `crypto` with in-memory 256-bit master KEKs and AES-256-GCM authenticated wrapping.
- Default fallback for automated testing, CI/CD pipelines, and local development where external cloud credentials are not provisioned.
