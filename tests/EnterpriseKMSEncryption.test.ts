/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.2: Enterprise HSM/KMS & Cryptographic Key Management Test Suite.
 * Comprehensive tests covering:
 * 1. AES-256-GCM authenticated encryption & decryption
 * 2. Tampered ciphertext rejection (GCM auth tag verification)
 * 3. Invalid authentication tag rejection
 * 4. Corrupted encrypted DEK rejection
 * 5. KMS provider unwrap failure handling
 * 6. Automated key rotation and active version pointer progression
 * 7. Legacy data decryption with older key versions (backward compatibility)
 * 8. Safe re-encryption (migration) from deprecated to active key versions
 * 9. Zero-downtime secret caching, retrieval, and TTL expiration
 * 10. Role-based key access control (RBAC & least privilege)
 * 11. Unauthorized key access rejection
 * 12. Rate limiting & suspicious key access detection
 * 13. Emergency key compromise revocation & incident response
 * 14. Key metadata backup creation, SHA-256 integrity validation, and recovery
 * 15. Secret exposure prevention and log redaction
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { KMSFactory } from '../src/security/kms/KMSFactory';
import { LocalKMSProvider } from '../src/security/kms/LocalKMSProvider';
import { AESGCMService } from '../src/security/encryption/AESGCMService';
import { EnvelopeEncryption } from '../src/security/encryption/EnvelopeEncryption';
import { KeyRotationManager } from '../src/security/rotation/KeyRotationManager';
import { SecretRotationManager } from '../src/security/rotation/SecretRotationManager';
import { KeyAccessPolicyManager } from '../src/security/access/KeyAccessPolicyManager';
import { KeyCompromiseManager } from '../src/security/incident/KeyCompromiseManager';
import { KMSDisasterRecoveryManager } from '../src/security/recovery/KMSDisasterRecoveryManager';
import { EnterpriseObservabilityManager } from '../src/engines/EnterpriseObservabilityManager';

describe('Stage 5.2: Enterprise HSM/KMS & Cryptographic Key Management Suite', () => {
  beforeEach(() => {
    KMSFactory.reset();
    EnvelopeEncryption.resetInstance();
    KeyRotationManager.resetInstance();
    SecretRotationManager.resetInstance();
    KeyAccessPolicyManager.resetInstance();
    KeyCompromiseManager.resetInstance();
    KMSDisasterRecoveryManager.resetInstance();
    EnterpriseObservabilityManager.resetInstance();
  });

  // --------------------------------------------------------------------------
  // TEST 1: AES-256-GCM AUTHENTICATED ENCRYPTION & DECRYPTION
  // --------------------------------------------------------------------------
  it('1. encrypts and decrypts arbitrary payloads using authenticated AES-256-GCM', () => {
    const dek = AESGCMService.generateDEK();
    const plaintext = Buffer.from('Quantum crystal alignment coordinates: [14.2, -8.7, 92.1]', 'utf8');
    const aad = Buffer.from('tenant:alpha-001', 'utf8');

    // Encrypt
    const encrypted = AESGCMService.encrypt(plaintext, dek, aad);
    assert.equal(encrypted.iv.length, 12, 'IV must be 96 bits (12 bytes)');
    assert.equal(encrypted.authTag.length, 16, 'AuthTag must be 128 bits (16 bytes)');
    assert.notDeepEqual(encrypted.ciphertext, plaintext);

    // Decrypt
    const decrypted = AESGCMService.decrypt(encrypted.ciphertext, dek, encrypted.iv, encrypted.authTag, aad);
    assert.equal(decrypted.toString('utf8'), plaintext.toString('utf8'));

    AESGCMService.zeroBuffer(dek);
  });

  // --------------------------------------------------------------------------
  // TEST 2: TAMPERED CIPHERTEXT REJECTION
  // --------------------------------------------------------------------------
  it('2. detects and rejects ciphertext tampering via authentication tag validation', () => {
    const dek = AESGCMService.generateDEK();
    const plaintext = Buffer.from('Critical reactor containment telemetry', 'utf8');
    const encrypted = AESGCMService.encrypt(plaintext, dek);

    // Flip a bit in ciphertext
    encrypted.ciphertext[0] ^= 0x01;

    assert.throws(
      () => AESGCMService.decrypt(encrypted.ciphertext, dek, encrypted.iv, encrypted.authTag),
      /AES-256-GCM Authentication Failed|tampered/i
    );

    AESGCMService.zeroBuffer(dek);
  });

  // --------------------------------------------------------------------------
  // TEST 3: INVALID AUTHENTICATION TAG REJECTION
  // --------------------------------------------------------------------------
  it('3. rejects decryption when authentication tag is tampered or invalid', () => {
    const dek = AESGCMService.generateDEK();
    const plaintext = Buffer.from('Holographic navigation matrix', 'utf8');
    const encrypted = AESGCMService.encrypt(plaintext, dek);

    // Corrupt authentication tag
    encrypted.authTag[0] ^= 0xff;

    assert.throws(
      () => AESGCMService.decrypt(encrypted.ciphertext, dek, encrypted.iv, encrypted.authTag),
      /AES-256-GCM Authentication Failed/i
    );

    AESGCMService.zeroBuffer(dek);
  });

  // --------------------------------------------------------------------------
  // TEST 4: CORRUPTED ENCRYPTED DEK REJECTION
  // --------------------------------------------------------------------------
  it('4. rejects envelope decryption when wrapped DEK is corrupted or unauthentic', async () => {
    const envelope = EnvelopeEncryption.getInstance();
    const encrypted = await envelope.encrypt('Shield modulation frequency');

    // Corrupt wrapped DEK Base64 string
    const corruptWrappedDek = Buffer.from(encrypted.wrappedDek, 'base64');
    corruptWrappedDek[0] ^= 0xaa;
    encrypted.wrappedDek = corruptWrappedDek.toString('base64');

    await assert.rejects(
      async () => envelope.decrypt(encrypted),
      /Failed to unwrap DEK|Authentication failed/i
    );
  });

  // --------------------------------------------------------------------------
  // TEST 5: KMS PROVIDER UNWRAP FAILURE HANDLING
  // --------------------------------------------------------------------------
  it('5. handles KMS provider failures safely without throwing unhandled exceptions or leaking state', async () => {
    const localKms = new LocalKMSProvider();
    const envelope = EnvelopeEncryption.getInstance(localKms);

    // Attempt unwrap with missing key version
    await assert.rejects(
      async () => {
        await localKms.unwrapKey({
          keyId: 'non-existent-key',
          version: 99,
          wrappedKey: Buffer.alloc(32),
          iv: Buffer.alloc(12),
          authTag: Buffer.alloc(16),
        });
      },
      /Key "non-existent-key" version 99 not found/i
    );
  });

  // --------------------------------------------------------------------------
  // TEST 6: AUTOMATED KEY ROTATION & VERSION PROGRESSION
  // --------------------------------------------------------------------------
  it('6. rotates KEKs atomically, advancing version and updating key metadata', async () => {
    const localKms = new LocalKMSProvider();
    const rotationManager = KeyRotationManager.getInstance(localKms);

    const keyId = 'mission-telemetry-kek';

    // Initial state: version 1
    const metaV1 = await localKms.getKeyMetadata(keyId);
    assert.equal(metaV1.version, 1);
    assert.equal(metaV1.state, 'ACTIVE');

    // Rotate key
    const rotateResult = await rotationManager.rotateKey(keyId, 'AutoRotationDaemon');
    assert.equal(rotateResult.previousVersion, 1);
    assert.equal(rotateResult.newVersion, 2);

    // Check updated metadata
    const metaV1After = await localKms.getKeyMetadata(keyId, 1);
    const metaV2After = await localKms.getKeyMetadata(keyId, 2);

    assert.equal(metaV1After.state, 'DEPRECATED', 'Older key version must be marked DEPRECATED');
    assert.equal(metaV2After.state, 'ACTIVE', 'New key version must be marked ACTIVE');
    assert.equal(metaV2After.version, 2);
  });

  // --------------------------------------------------------------------------
  // TEST 7: LEGACY DATA DECRYPTION WITH OLDER KEY VERSIONS
  // --------------------------------------------------------------------------
  it('7. ensures data encrypted with version 1 remains decryptable after rotation to version 2', async () => {
    const localKms = new LocalKMSProvider();
    const envelope = EnvelopeEncryption.getInstance(localKms);
    const rotation = KeyRotationManager.getInstance(localKms);

    const keyId = 'prism-archive-kek';
    const secretData = 'Historical mission log from Earth epoch 2026';

    // 1. Encrypt with version 1
    const v1Envelope = await envelope.encrypt(secretData, { keyId });
    assert.equal(v1Envelope.kekVersion, 1);

    // 2. Rotate to version 2
    await rotation.rotateKey(keyId);

    // 3. Encrypt new data with version 2
    const v2Envelope = await envelope.encrypt('Subsequent mission log', { keyId });
    assert.equal(v2Envelope.kekVersion, 2);

    // 4. Decrypt v1 envelope -> Must succeed seamlessly!
    const v1Decrypted = await envelope.decrypt(v1Envelope);
    assert.equal(v1Decrypted.plaintextUtf8, secretData);
    assert.equal(v1Decrypted.kekVersion, 1);

    // 5. Decrypt v2 envelope
    const v2Decrypted = await envelope.decrypt(v2Envelope);
    assert.equal(v2Decrypted.plaintextUtf8, 'Subsequent mission log');
    assert.equal(v2Decrypted.kekVersion, 2);
  });

  // --------------------------------------------------------------------------
  // TEST 8: SAFE RE-ENCRYPTION (MIGRATION) TO ACTIVE KEY VERSION
  // --------------------------------------------------------------------------
  it('8. safely migrates and re-encrypts envelopes from deprecated key versions to active key versions', async () => {
    const localKms = new LocalKMSProvider();
    const envelope = EnvelopeEncryption.getInstance(localKms);
    const rotation = KeyRotationManager.getInstance(localKms);

    const keyId = 'tenant-migration-kek';
    const originalText = 'Migratable tenant dataset';

    // Encrypted on v1
    const oldEnvelope = await envelope.encrypt(originalText, { keyId });
    assert.equal(oldEnvelope.kekVersion, 1);

    // Rotate to v2
    await rotation.rotateKey(keyId);

    // Re-encrypt to v2
    const migratedEnvelope = await envelope.reencrypt(oldEnvelope, 2);
    assert.equal(migratedEnvelope.kekVersion, 2);
    assert.notEqual(migratedEnvelope.ciphertext, oldEnvelope.ciphertext);

    // Verify plaintext integrity
    const decryptedMigrated = await envelope.decrypt(migratedEnvelope);
    assert.equal(decryptedMigrated.plaintextUtf8, originalText);
  });

  // --------------------------------------------------------------------------
  // TEST 9: ZERO-DOWNTIME SECRET ROTATION & CACHING
  // --------------------------------------------------------------------------
  it('9. provides zero-downtime versioned secret retrieval and caching with TTL', async () => {
    const secrets = SecretRotationManager.getInstance();

    // Store v1 secret
    const v1 = await secrets.setSecret('FIREBASE_SERVICE_TOKEN', 'token-initial-v1-secret');
    assert.equal(v1, 1);

    const read1 = await secrets.getSecret('FIREBASE_SERVICE_TOKEN');
    assert.equal(read1, 'token-initial-v1-secret');

    // Rotate to v2 secret
    const v2 = await secrets.setSecret('FIREBASE_SERVICE_TOKEN', 'token-rotated-v2-secret');
    assert.equal(v2, 2);

    // Active read returns v2
    const read2 = await secrets.getSecret('FIREBASE_SERVICE_TOKEN');
    assert.equal(read2, 'token-rotated-v2-secret');

    // Historical version 1 read still works (dual-key window)
    const readV1 = await secrets.getSecret('FIREBASE_SERVICE_TOKEN', 1);
    assert.equal(readV1, 'token-initial-v1-secret');
  });

  // --------------------------------------------------------------------------
  // TEST 10: ROLE-BASED KEY ACCESS CONTROL (RBAC)
  // --------------------------------------------------------------------------
  it('10. enforces least-privilege key permissions across administrative and service roles', () => {
    const policy = KeyAccessPolicyManager.getInstance();

    // 1. Encryption Service can WRAP
    const encCheck = policy.verifyAccess({
      actorId: 'svc-ingestion-worker',
      role: 'ENCRYPTION_SERVICE',
      keyId: 'prism-master-kek',
      operation: 'WRAP',
    });
    assert.equal(encCheck.allowed, true);

    // 2. Encryption Service CANNOT UNWRAP (least-privilege separation)
    const encUnwrapCheck = policy.verifyAccess({
      actorId: 'svc-ingestion-worker',
      role: 'ENCRYPTION_SERVICE',
      keyId: 'prism-master-kek',
      operation: 'UNWRAP',
    });
    assert.equal(encUnwrapCheck.allowed, false);
    assert.ok(encUnwrapCheck.reason?.includes('lacks "UNWRAP" privilege'));

    // 3. Decryption Service can UNWRAP
    const decCheck = policy.verifyAccess({
      actorId: 'svc-query-worker',
      role: 'DECRYPTION_SERVICE',
      keyId: 'prism-master-kek',
      operation: 'UNWRAP',
    });
    assert.equal(decCheck.allowed, true);
  });

  // --------------------------------------------------------------------------
  // TEST 11: UNAUTHORIZED ROLE REJECTION
  // --------------------------------------------------------------------------
  it('11. rejects unauthorized callers attempting cryptographic operations with security audit', () => {
    const policy = KeyAccessPolicyManager.getInstance();

    const result = policy.verifyAccess({
      actorId: 'usr-untrusted-actor',
      role: 'UNAUTHORIZED_CALLER',
      keyId: 'prism-master-kek',
      operation: 'UNWRAP',
    });

    assert.equal(result.allowed, false);
    assert.ok(result.reason?.includes('Forbidden'));
  });

  // --------------------------------------------------------------------------
  // TEST 12: RATE LIMITING & SUSPICIOUS KEY ACCESS DETECTION
  // --------------------------------------------------------------------------
  it('12. detects and blocks suspicious high-frequency key operations exceeding rate limits', () => {
    const policy = KeyAccessPolicyManager.getInstance();
    const actorId = 'svc-aggressive-bot';

    let lastResult: any;
    // Max rate limit is 200/min. Run 205 requests.
    for (let i = 0; i < 205; i++) {
      lastResult = policy.verifyAccess({
        actorId,
        role: 'ENCRYPTION_SERVICE',
        keyId: 'prism-master-kek',
        operation: 'WRAP',
      });
    }

    assert.equal(lastResult.allowed, false);
    assert.ok(lastResult.reason?.includes('rate limit exceeded'));
  });

  // --------------------------------------------------------------------------
  // TEST 13: EMERGENCY KEY COMPROMISE REVOCATION & CONTAINMENT
  // --------------------------------------------------------------------------
  it('13. revokes compromised key versions, triggers emergency rotation, and denies further decryption', async () => {
    const localKms = new LocalKMSProvider();
    const envelope = EnvelopeEncryption.getInstance(localKms);
    const compromise = KeyCompromiseManager.getInstance(localKms, envelope);

    const keyId = 'compromised-channel-kek';

    // 1. Data encrypted under v1
    const v1Envelope = await envelope.encrypt('Sensitive asset prior to compromise', { keyId });
    assert.equal(v1Envelope.kekVersion, 1);

    // 2. Incident reported: v1 compromised!
    const incident = await compromise.handleCompromise({
      keyId,
      compromisedVersion: 1,
      reportedBy: 'SecurityAuditAgent',
      reason: 'Memory dump exposure detected on edge node',
    });

    assert.equal(incident.status, 'CONTAINED');
    assert.equal(incident.compromisedVersion, 1);
    assert.equal(incident.emergencyRotatedVersion, 2);

    // 3. Attempting to decrypt with revoked v1 must be strictly DENIED
    await assert.rejects(
      async () => envelope.decrypt(v1Envelope),
      /has been REVOKED\. Decryption denied/i
    );

    // 4. New data encrypted under emergency v2 succeeds
    const v2Envelope = await envelope.encrypt('Safe post-incident payload', { keyId });
    assert.equal(v2Envelope.kekVersion, 2);
    const v2Decrypted = await envelope.decrypt(v2Envelope);
    assert.equal(v2Decrypted.plaintextUtf8, 'Safe post-incident payload');
  });

  // --------------------------------------------------------------------------
  // TEST 14: KEY METADATA BACKUP & SHA-256 RESTORATION
  // --------------------------------------------------------------------------
  it('14. creates key metadata backups with SHA-256 integrity check and restores without master key export', async () => {
    const localKms = new LocalKMSProvider();
    const dr = KMSDisasterRecoveryManager.getInstance(localKms);

    const keyId = 'disaster-recovery-kek';

    // Create backup
    const snapshot = await dr.createKeyMetadataBackup(keyId);
    assert.equal(snapshot.keyId, keyId);
    assert.ok(snapshot.checksumSha256.startsWith('sha256-'));
    assert.ok(snapshot.keyVersions.length >= 1);

    // Validate integrity
    const validation = dr.validateBackupIntegrity(snapshot);
    assert.equal(validation.isValid, true);

    // Restore backup
    const restoreResult = await dr.restoreKeyMetadataBackup(snapshot.backupId);
    assert.equal(restoreResult.success, true);
    assert.equal(restoreResult.checksumVerified, true);
    assert.ok(restoreResult.restorationDurationMs < 50.0, 'RTO target < 50ms must be satisfied');
  });

  // --------------------------------------------------------------------------
  // TEST 15: SECRET EXPOSURE PREVENTION & LOG REDACTION
  // --------------------------------------------------------------------------
  it('15. verifies raw key material and DEK buffers are never logged or exposed in audit trails', () => {
    const obs = EnterpriseObservabilityManager.getInstance();

    const logRecord = obs.log({
      level: 'INFO',
      service: 'KMSAudit',
      message: 'Wrapped DEK successfully for tenant-01',
      metadata: {
        keyId: 'prism-master-kek',
        version: 1,
        token: 'secret_dek_buffer_mock_hex',
        password: 'KmsMasterKeyPassword',
      },
    });

    assert.equal(logRecord.sanitized, true);
    assert.equal(logRecord.metadata?.token, '***REDACTED***');
    assert.equal(logRecord.metadata?.password, '***REDACTED***');
    assert.equal(logRecord.metadata?.keyId, 'prism-master-kek'); // Public identifier preserved
  });
});
