# STAGE 5.2 — GOOGLE CLOUD KMS INTEGRATION SPECIFICATION

## 1. Executive Summary & Architectural Scope
PRISM SIGNAL: BEYOND THE VOID integrates official Google Cloud Key Management Service (Cloud KMS) as a hardware-grade Key Encryption Key (KEK) provider. This architecture decouples data encryption keys (DEKs) generated per record from master key storage, ensuring zero exposure of raw master keys to application memory or client runtimes.

---

## 2. Component Hierarchy & Resource Paths

```
Google Cloud Platform (Project: ais-asia-east1-0c8ec1ba1703435 / 527838610455)
  |
  +-- Location: global
        |
        +-- KeyRing: prism-keyring
              |
              +-- CryptoKey: prism-kek (Purpose: ENCRYPT_DECRYPT, Algorithm: GOOGLE_SYMMETRIC_ENCRYPTION)
                    |
                    +-- CryptoKeyVersion: 1 (State: ENABLED, Primary)
                    +-- CryptoKeyVersion: 2 (State: ENABLED, Post-Rotation)
```

### Fully Qualified Resource Path Names
- **KeyRing**: `projects/ais-asia-east1-0c8ec1ba1703435/locations/global/keyRings/prism-keyring`
- **CryptoKey**: `projects/ais-asia-east1-0c8ec1ba1703435/locations/global/keyRings/prism-keyring/cryptoKeys/prism-kek`
- **CryptoKeyVersion**: `projects/ais-asia-east1-0c8ec1ba1703435/locations/global/keyRings/prism-keyring/cryptoKeys/prism-kek/cryptoKeyVersions/{versionId}`

---

## 3. Envelope Encryption Workflow with Google Cloud KMS

```
[ Application Data ]
         |
         v
[ Generate 256-bit CSPRNG DEK ] ---> [ Encrypt Data via AES-256-GCM ]
         |                                           |
         v (Plaintext DEK)                           v
[ Google Cloud KMS encrypt() ]                  [ Ciphertext + IV + AuthTag ]
  (Uses Cloud KEK)                                   |
         |                                           |
         v (Wrapped DEK)                             |
[ Authenticated Encrypted Envelope ] <---------------+
  - schemaVersion: 1
  - algorithm: AES_256_GCM
  - kekKeyId: prism-kek
  - kekVersion: 1
  - wrappedDek (Base64)
  - ciphertext (Base64)
  - iv (Base64)
  - authTag (Base64)
```

### Memory Scrubbing
Plaintext DEK buffers are zeroed out immediately post-encryption and post-decryption using `AESGCMService.zeroBuffer(dek)` in structured `finally` blocks, preventing heap memory inspection vulnerabilities.

---

## 4. Key Rotation & Multi-Version Decryption

Google Cloud KMS provides native key versioning:
1. **Rotation**: Creating a new version with `createCryptoKeyVersion()` assigns an incremented version ID and sets state to `ENABLED`.
2. **Primary Promotion**: `updateCryptoKeyPrimaryVersion()` directs all subsequent `encrypt()` calls to use the new version.
3. **Decryption Compatibility**: Historical envelopes encrypted under older versions continue to unwrap through `decrypt()` because Google Cloud KMS automatically identifies the correct version from the ciphertext payload.
4. **Deferred Migration**: Historical envelopes can be migrated to the new primary version via `EnvelopeEncryption.reencrypt()` without decrypting other database records.
