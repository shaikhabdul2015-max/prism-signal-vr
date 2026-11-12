/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.2: Google Cloud KMS & Enterprise Cryptographic Key Management Test Suite.
 * Validates:
 * 1. Google Cloud KMS provider instantiation and resource path resolution
 * 2. Live environment probe handling (truthful reporting of service status)
 * 3. DEK wrapping via Google Cloud KMS encrypt operation
 * 4. DEK unwrapping via Google Cloud KMS decrypt operation
 * 5. Full EnvelopeEncryption coordinator integration with Google Cloud KMS KEK
 * 6. Single-use 256-bit DEK generation and memory zeroing post-operation
 * 7. GCM authentication tag verification and tampered payload rejection
 * 8. CryptoKeyVersion creation and primary key version rotation
 * 9. Legacy envelope decryption using historical key versions (backward compatibility)
 * 10. Re-encryption / migration from deprecated key version to primary key version
 * 11. IAM least-privilege permission validation and missing permission detection
 * 12. Structured error classification (PERMISSION_DENIED, SERVICE_DISABLED, NOT_FOUND)
 * 13. Fail-closed security architecture (strict rejection of silent local fallback)
 * 14. Disaster recovery metadata backup and SHA-256 verification
 * 15. Real-time cryptographic performance benchmarks (encrypt, decrypt, rotation)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  GoogleCloudKMSProvider,
  GoogleCloudKMSError,
} from '../src/security/kms/providers/GoogleCloudKMSProvider';
import { KMSFactory } from '../src/security/kms/KMSFactory';
import { KMSConfig } from '../src/security/kms/KMSConfig';
import { EnvelopeEncryption } from '../src/security/encryption/EnvelopeEncryption';
import { AESGCMService } from '../src/security/encryption/AESGCMService';
import { KMSDisasterRecoveryManager } from '../src/security/recovery/KMSDisasterRecoveryManager';
import crypto from 'node:crypto';

/**
 * Creates a deterministic mock Google Cloud KMS client with simulated key store.
 */
function createMockCloudKMSClient() {
  const versions: Map<string, { version: number; state: string; name: string; createTime: { seconds: number } }> = new Map();
  let primaryVersion = 1;
  const initialKeyName = 'projects/ais-asia-east1-0c8ec1ba1703435/locations/global/keyRings/prism-keyring/cryptoKeys/prism-kek';
  
  versions.set(`${initialKeyName}/cryptoKeyVersions/1`, {
    version: 1,
    state: 'ENABLED',
    name: `${initialKeyName}/cryptoKeyVersions/1`,
    createTime: { seconds: Math.floor(Date.now() / 1000) },
  });

  return {
    cryptoKeyPath(project: string, location: string, keyRing: string, key: string) {
      return `projects/${project}/locations/${location}/keyRings/${keyRing}/cryptoKeys/${key}`;
    },
    cryptoKeyVersionPath(project: string, location: string, keyRing: string, key: string, version: string) {
      return `projects/${project}/locations/${location}/keyRings/${keyRing}/cryptoKeys/${key}/cryptoKeyVersions/${version}`;
    },
    keyRingPath(project: string, location: string, keyRing: string) {
      return `projects/${project}/locations/${location}/keyRings/${keyRing}`;
    },

    async encrypt(req: { name: string; plaintext: Buffer; additionalAuthenticatedData?: Buffer }) {
      // Simulate KMS envelope wrap with HMAC-SHA256 signature and mock cipher
      const baseKeyName = req.name.split('/cryptoKeyVersions/')[0];
      const iv = crypto.randomBytes(12);
      const cipher = crypto.createCipheriv('aes-256-gcm', crypto.createHash('sha256').update(baseKeyName).digest(), iv);
      if (req.additionalAuthenticatedData) cipher.setAAD(req.additionalAuthenticatedData);
      const ct = Buffer.concat([cipher.update(req.plaintext), cipher.final()]);
      const tag = cipher.getAuthTag();
      // Combine [iv(12) + tag(16) + ct] as the KMS wrapped payload
      const combined = Buffer.concat([iv, tag, ct]);

      // If encrypt was called with cryptoKey name, pick primary version
      let versionName = req.name;
      if (!versionName.includes('/cryptoKeyVersions/')) {
        versionName = `${req.name}/cryptoKeyVersions/${primaryVersion}`;
      }

      return [{ ciphertext: combined, name: versionName }];
    },

    async decrypt(req: { name: string; ciphertext: Buffer; additionalAuthenticatedData?: Buffer }) {
      if (!req.ciphertext || req.ciphertext.length < 28) {
        throw new Error('INVALID_ARGUMENT: Ciphertext buffer too short');
      }
      const iv = req.ciphertext.subarray(0, 12);
      const tag = req.ciphertext.subarray(12, 28);
      const ct = req.ciphertext.subarray(28);

      // Decrypt using simulated key based on base cryptoKey
      const baseKeyName = req.name.split('/cryptoKeyVersions/')[0];
      const keyHash = crypto.createHash('sha256').update(baseKeyName).digest();
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyHash, iv);
      decipher.setAuthTag(tag);
      if (req.additionalAuthenticatedData) decipher.setAAD(req.additionalAuthenticatedData);
      const pt = Buffer.concat([decipher.update(ct), decipher.final()]);

      return [{ plaintext: pt }];
    },

    async getCryptoKey(req: { name: string }) {
      return [{
        name: req.name,
        primary: {
          name: `${req.name}/cryptoKeyVersions/${primaryVersion}`,
          state: 'ENABLED',
        },
        createTime: { seconds: Math.floor(Date.now() / 1000) },
      }];
    },

    async getCryptoKeyVersion(req: { name: string }) {
      const v = versions.get(req.name);
      if (!v) {
        const err: any = new Error(`CryptoKeyVersion not found: ${req.name}`);
        err.code = 404;
        throw err;
      }
      return [v];
    },

    async createCryptoKeyVersion(req: { parent: string; cryptoKeyVersion: any }) {
      const nextVer = versions.size + 1;
      const vName = `${req.parent}/cryptoKeyVersions/${nextVer}`;
      const newV = {
        version: nextVer,
        state: 'ENABLED',
        name: vName,
        createTime: { seconds: Math.floor(Date.now() / 1000) },
      };
      versions.set(vName, newV);
      return [newV];
    },

    async updateCryptoKeyPrimaryVersion(req: { name: string; cryptoKeyVersionId: string }) {
      primaryVersion = parseInt(req.cryptoKeyVersionId, 10) || primaryVersion;
      return [{ name: req.name, primary: { name: `${req.name}/cryptoKeyVersions/${primaryVersion}` } }];
    },

    async destroyCryptoKeyVersion(req: { name: string }) {
      const v = versions.get(req.name);
      if (v) {
        v.state = 'DESTROY_SCHEDULED';
      }
      return [v];
    },

    async listCryptoKeyVersions(req: { parent: string }) {
      const list = Array.from(versions.values()).filter((v) => v.name.startsWith(req.parent));
      return [list];
    },

    async testIamPermissions(req: { resource: string; permissions: string[] }) {
      // Simulate granted least-privilege permissions
      return [{ permissions: req.permissions }];
    },

    async getKeyRing(req: { name: string }) {
      return [{ name: req.name }];
    },
  };
}

describe('Stage 5.2: Google Cloud KMS & Cryptographic Integration Suite', () => {
  beforeEach(() => {
    KMSFactory.reset();
    EnvelopeEncryption.resetInstance();
  });

  // --------------------------------------------------------------------------
  // TEST 1: PROVIDER INSTANTIATION & RESOURCE PATHS
  // --------------------------------------------------------------------------
  it('1. discovers and formats hierarchical Cloud KMS resource paths correctly', () => {
    const provider = new GoogleCloudKMSProvider({
      projectId: 'ais-asia-east1-0c8ec1ba1703435',
      locationId: 'global',
      keyRingId: 'prism-keyring',
      keyId: 'prism-kek',
      client: createMockCloudKMSClient(),
    });

    assert.equal(provider.providerType, 'GOOGLE_CLOUD_KMS');
    assert.equal(
      provider.getKeyRingPath(),
      'projects/ais-asia-east1-0c8ec1ba1703435/locations/global/keyRings/prism-keyring'
    );
    assert.equal(
      provider.getCryptoKeyPath('prism-kek'),
      'projects/ais-asia-east1-0c8ec1ba1703435/locations/global/keyRings/prism-keyring/cryptoKeys/prism-kek'
    );
    assert.equal(
      provider.getCryptoKeyVersionPath('prism-kek', 1),
      'projects/ais-asia-east1-0c8ec1ba1703435/locations/global/keyRings/prism-keyring/cryptoKeys/prism-kek/cryptoKeyVersions/1'
    );
  });

  // --------------------------------------------------------------------------
  // TEST 2: LIVE ENVIRONMENT DIAGNOSTIC PROBE
  // --------------------------------------------------------------------------
  it('2. probes live environment truthfully without fabricating cloud success', async () => {
    // When instantiated with default client in test sandbox, verify structured health status reporting
    const provider = new GoogleCloudKMSProvider({
      projectId: 'ais-asia-east1-0c8ec1ba1703435',
      locationId: 'global',
      keyRingId: 'prism-keyring',
      keyId: 'prism-kek',
    });

    const status = await provider.getHealthStatus();
    assert.equal(typeof status.healthy, 'boolean');
    assert.equal(status.projectId, 'ais-asia-east1-0c8ec1ba1703435');
    assert.ok(status.cryptoKeyPath.includes('prism-kek'));
    // If not healthy, reason must be structured (e.g. SERVICE_DISABLED or PERMISSION_DENIED)
    if (!status.healthy) {
      assert.ok(status.reason && status.reason.length > 0, 'Reason must be detailed on unready cloud KMS');
    }
  });

  // --------------------------------------------------------------------------
  // TEST 3: DEK WRAPPING VIA CLOUD KMS ENCRYPT
  // --------------------------------------------------------------------------
  it('3. wraps 256-bit DEK using Google Cloud KMS encrypt operation', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });

    const rawDek = AESGCMService.generateDEK();
    const aad = Buffer.from('tenant:alpha-void', 'utf8');

    const wrapResult = await provider.wrapKey({
      keyId: 'prism-kek',
      plaintextKey: rawDek,
      additionalAuthenticatedData: aad,
    });

    assert.equal(wrapResult.keyId, 'prism-kek');
    assert.equal(wrapResult.version, 1);
    assert.ok(Buffer.isBuffer(wrapResult.wrappedKey));
    assert.ok(wrapResult.wrappedKey.length >= 32, 'Wrapped key must contain ciphertext payload');
  });

  // --------------------------------------------------------------------------
  // TEST 4: DEK UNWRAPPING VIA CLOUD KMS DECRYPT
  // --------------------------------------------------------------------------
  it('4. unwraps DEK using Google Cloud KMS decrypt operation and restores exact key', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });

    const originalDek = AESGCMService.generateDEK();
    const aad = Buffer.from('tenant:alpha-void', 'utf8');

    const wrapped = await provider.wrapKey({
      keyId: 'prism-kek',
      plaintextKey: originalDek,
      additionalAuthenticatedData: aad,
    });

    const unwrapped = await provider.unwrapKey({
      keyId: 'prism-kek',
      version: wrapped.version,
      wrappedKey: wrapped.wrappedKey,
      additionalAuthenticatedData: aad,
    });

    assert.deepEqual(unwrapped.plaintextKey, originalDek, 'Unwrapped DEK must match original DEK');
    assert.equal(unwrapped.version, 1);
  });

  // --------------------------------------------------------------------------
  // TEST 5: FULL ENVELOPE ENCRYPTION WITH CLOUD KMS KEK
  // --------------------------------------------------------------------------
  it('5. executes end-to-end envelope encryption and decryption with Cloud KMS provider', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const envelopeEngine = EnvelopeEncryption.getInstance(provider, 'prism-kek');

    const payload = 'PRISM_QUANTUM_TELEMETRY: [Vector3(12.4, -0.9, 108.5)]';
    const aad = 'session:webxr-controller-01';

    // 1. Encrypt
    const envelope = await envelopeEngine.encrypt(payload, {
      additionalData: aad,
    });

    assert.equal(envelope.schemaVersion, 1);
    assert.equal(envelope.algorithm, 'AES_256_GCM');
    assert.equal(envelope.kekKeyId, 'prism-kek');
    assert.equal(envelope.kekVersion, 1);
    assert.ok(envelope.wrappedDek.length > 0);
    assert.ok(envelope.ciphertext.length > 0);
    assert.ok(envelope.authTag.length > 0);

    // 2. Decrypt
    const result = await envelopeEngine.decrypt(envelope);
    assert.equal(result.plaintextUtf8, payload);
    assert.equal(result.kekKeyId, 'prism-kek');
    assert.equal(result.kekVersion, 1);
  });

  // --------------------------------------------------------------------------
  // TEST 6: SINGLE-USE DEK & MEMORY ZEROING
  // --------------------------------------------------------------------------
  it('6. generates unique DEK per envelope and wipes transient key buffers', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const envelopeEngine = EnvelopeEncryption.getInstance(provider, 'prism-kek');

    const env1 = await envelopeEngine.encrypt('payload-alpha');
    const env2 = await envelopeEngine.encrypt('payload-alpha'); // Same payload

    // Even with identical payload, DEKs and IVs must differ
    assert.notEqual(env1.wrappedDek, env2.wrappedDek);
    assert.notEqual(env1.ciphertext, env2.ciphertext);
    assert.notEqual(env1.iv, env2.iv);

    // Verify zeroing method behavior
    const testBuf = Buffer.from('super-secret-key-32-byte-length!', 'utf8');
    AESGCMService.zeroBuffer(testBuf);
    assert.ok(testBuf.every((byte) => byte === 0), 'Buffer must be completely zeroed');
  });

  // --------------------------------------------------------------------------
  // TEST 7: TAMPERED CIPHERTEXT & AUTH TAG REJECTION
  // --------------------------------------------------------------------------
  it('7. rejects tampered ciphertext or modified authentication tags', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const envelopeEngine = EnvelopeEncryption.getInstance(provider, 'prism-kek');

    const envelope = await envelopeEngine.encrypt('unmodified data');

    // Tamper ciphertext
    const ctBuf = Buffer.from(envelope.ciphertext, 'base64');
    ctBuf[0] ^= 0xff;
    const tamperedCt = { ...envelope, ciphertext: ctBuf.toString('base64') };

    await assert.rejects(
      async () => await envelopeEngine.decrypt(tamperedCt),
      /Data was tampered with or corrupted/
    );

    // Tamper auth tag
    const tagBuf = Buffer.from(envelope.authTag, 'base64');
    tagBuf[0] ^= 0xaa;
    const tamperedTag = { ...envelope, authTag: tagBuf.toString('base64') };

    await assert.rejects(
      async () => await envelopeEngine.decrypt(tamperedTag),
      /Data was tampered with or corrupted/
    );
  });

  // --------------------------------------------------------------------------
  // TEST 8: CRYPTOKEYVERSION ROTATION
  // --------------------------------------------------------------------------
  it('8. creates new CryptoKeyVersion and safely promotes it to primary', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });

    const rotation = await provider.rotateKey('prism-kek');
    assert.equal(rotation.keyId, 'prism-kek');
    assert.equal(rotation.previousVersion, 1);
    assert.equal(rotation.newVersion, 2);
    assert.ok(rotation.rotatedAt);

    // Verify listKeyVersions reflects both versions
    const versions = await provider.listKeyVersions('prism-kek');
    assert.equal(versions.length, 2);
    assert.equal(versions[0].version, 1);
    assert.equal(versions[1].version, 2);
    assert.equal(versions[1].state, 'ACTIVE');
  });

  // --------------------------------------------------------------------------
  // TEST 9: BACKWARD COMPATIBILITY WITH HISTORICAL KEY VERSIONS
  // --------------------------------------------------------------------------
  it('9. decrypts envelopes encrypted under older key versions after rotation', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const envelopeEngine = EnvelopeEncryption.getInstance(provider, 'prism-kek');

    // 1. Encrypt with Version 1
    const v1Envelope = await envelopeEngine.encrypt('Mission Payload v1');
    assert.equal(v1Envelope.kekVersion, 1);

    // 2. Rotate to Version 2
    await provider.rotateKey('prism-kek');

    // 3. Encrypt new record with Version 2
    const v2Envelope = await envelopeEngine.encrypt('Mission Payload v2');
    assert.equal(v2Envelope.kekVersion, 2);

    // 4. Verify BOTH v1 and v2 envelopes decrypt successfully without errors
    const dec1 = await envelopeEngine.decrypt(v1Envelope);
    const dec2 = await envelopeEngine.decrypt(v2Envelope);

    assert.equal(dec1.plaintextUtf8, 'Mission Payload v1');
    assert.equal(dec1.kekVersion, 1);
    assert.equal(dec2.plaintextUtf8, 'Mission Payload v2');
    assert.equal(dec2.kekVersion, 2);
  });

  // --------------------------------------------------------------------------
  // TEST 10: SAFE RE-ENCRYPTION & MIGRATION TO NEW PRIMARY VERSION
  // --------------------------------------------------------------------------
  it('10. migrates legacy envelope to active primary key version without data loss', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const envelopeEngine = EnvelopeEncryption.getInstance(provider, 'prism-kek');

    const v1Envelope = await envelopeEngine.encrypt('Legacy archival data', {
      additionalData: 'archive:tenant-01',
    });
    assert.equal(v1Envelope.kekVersion, 1);

    // Rotate
    await provider.rotateKey('prism-kek');

    // Re-encrypt
    const migratedEnvelope = await envelopeEngine.reencrypt(v1Envelope, 2);
    assert.equal(migratedEnvelope.kekVersion, 2);
    assert.equal(migratedEnvelope.additionalData, 'archive:tenant-01');

    const decrypted = await envelopeEngine.decrypt(migratedEnvelope);
    assert.equal(decrypted.plaintextUtf8, 'Legacy archival data');
  });

  // --------------------------------------------------------------------------
  // TEST 11: IAM LEAST-PRIVILEGE PERMISSION VALIDATION
  // --------------------------------------------------------------------------
  it('11. verifies least-privilege IAM permissions and detects missing grants', async () => {
    // 1. Full permissions test
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const iamCheck = await provider.validateIAMPermissions();

    assert.equal(iamCheck.hasEncrypt, true);
    assert.equal(iamCheck.hasDecrypt, true);
    assert.equal(iamCheck.hasAdmin, true);
    assert.equal(iamCheck.missingPermissions.length, 0);

    // 2. Client missing decrypt permission
    const restrictedClient = {
      ...mockClient,
      async testIamPermissions() {
        return [{ permissions: ['cloudkms.cryptoKeyVersions.useToEncrypt', 'cloudkms.cryptoKeys.get'] }];
      },
    };
    const restrictedProvider = new GoogleCloudKMSProvider({ client: restrictedClient });
    const restrictedCheck = await restrictedProvider.validateIAMPermissions();

    assert.equal(restrictedCheck.hasEncrypt, true);
    assert.equal(restrictedCheck.hasDecrypt, false, 'Must detect missing decrypt permission');
    assert.ok(restrictedCheck.missingPermissions.includes('cloudkms.cryptoKeyVersions.useToDecrypt'));
  });

  // --------------------------------------------------------------------------
  // TEST 12: STRUCTURED ERROR CLASSIFICATION
  // --------------------------------------------------------------------------
  it('12. translates GCP API errors into structured GoogleCloudKMSError objects', async () => {
    const failingClient = {
      ...createMockCloudKMSClient(),
      async encrypt() {
        const err: any = new Error('PERMISSION_DENIED: The caller does not have permission');
        err.code = 403;
        throw err;
      },
    };

    const provider = new GoogleCloudKMSProvider({ client: failingClient });

    await assert.rejects(
      async () => await provider.wrapKey({ keyId: 'prism-kek', plaintextKey: Buffer.alloc(32) }),
      (err: any) => {
        assert.ok(err instanceof GoogleCloudKMSError);
        assert.equal(err.code, 'PERMISSION_DENIED');
        assert.equal(err.status, 403);
        return true;
      }
    );
  });

  // --------------------------------------------------------------------------
  // TEST 13: FAIL-CLOSED BEHAVIOR (NO SILENT FALLBACK)
  // --------------------------------------------------------------------------
  it('13. enforces fail-closed security when Google Cloud KMS is configured', () => {
    const config = new KMSConfig({ providerType: 'GOOGLE_CLOUD_KMS' });
    const provider = KMSFactory.getProvider(config);

    assert.equal(provider.providerType, 'GOOGLE_CLOUD_KMS', 'Must strictly return GoogleCloudKMSProvider');
    assert.notEqual(provider.providerType, 'LOCAL', 'Never silently degrade to LOCAL provider');
  });

  // --------------------------------------------------------------------------
  // TEST 14: DISASTER RECOVERY & SHA-256 INTEGRITY
  // --------------------------------------------------------------------------
  it('14. validates encrypted disaster recovery metadata backup and SHA-256 integrity', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const drManager = KMSDisasterRecoveryManager.getInstance(provider);

    const snapshot = await drManager.createKeyMetadataBackup('prism-kek');

    assert.ok(snapshot.checksumSha256 && snapshot.checksumSha256.startsWith('sha256-'));
    assert.equal(snapshot.keyId, 'prism-kek');
    assert.ok(snapshot.keyVersions.length >= 1);

    // Valid integrity verification
    const validation = drManager.validateBackupIntegrity(snapshot);
    assert.equal(validation.isValid, true);

    // Valid restoration
    const restoreResult = await drManager.restoreKeyMetadataBackup(snapshot.backupId);
    assert.equal(restoreResult.success, true);
    assert.equal(restoreResult.checksumVerified, true);
    assert.ok(restoreResult.restoredVersionsCount >= 1);

    // Corrupted restoration
    const tampered = { ...snapshot, checksumSha256: 'sha256-' + '0'.repeat(64) };
    const invalidCheck = drManager.validateBackupIntegrity(tampered);
    assert.equal(invalidCheck.isValid, false);
  });

  // --------------------------------------------------------------------------
  // TEST 15: CRYPTOGRAPHIC PERFORMANCE BENCHMARK
  // --------------------------------------------------------------------------
  it('15. benchmarks envelope encryption, decryption, and key rotation throughput', async () => {
    const mockClient = createMockCloudKMSClient();
    const provider = new GoogleCloudKMSProvider({ client: mockClient });
    const envelopeEngine = EnvelopeEncryption.getInstance(provider, 'prism-kek');

    const sampleData = 'Telemetry Vector: [0.123, 4.567, -8.901]';
    const iterations = 50;

    // Encrypt benchmark
    const t0 = performance.now();
    for (let i = 0; i < iterations; i++) {
      await envelopeEngine.encrypt(sampleData);
    }
    const encryptDuration = performance.now() - t0;
    const avgEncryptMs = encryptDuration / iterations;

    // Decrypt benchmark
    const testEnv = await envelopeEngine.encrypt(sampleData);
    const t1 = performance.now();
    for (let i = 0; i < iterations; i++) {
      await envelopeEngine.decrypt(testEnv);
    }
    const decryptDuration = performance.now() - t1;
    const avgDecryptMs = decryptDuration / iterations;

    // Rotation benchmark
    const t2 = performance.now();
    await provider.rotateKey('prism-kek');
    const rotateDuration = performance.now() - t2;

    assert.ok(avgEncryptMs < 5.0, `Average encrypt latency must be < 5.0ms (got ${avgEncryptMs.toFixed(3)}ms)`);
    assert.ok(avgDecryptMs < 5.0, `Average decrypt latency must be < 5.0ms (got ${avgDecryptMs.toFixed(3)}ms)`);
    assert.ok(rotateDuration < 50.0, `Rotation duration must be < 50.0ms (got ${rotateDuration.toFixed(3)}ms)`);
  });
});
