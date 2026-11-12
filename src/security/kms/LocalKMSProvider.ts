/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Local Development KMS Provider (Stage 5.2)
 * Production-grade local KMS provider utilizing Node.js native crypto CSPRNG,
 * AES-256-GCM authenticated key wrapping, key versioning state machines,
 * and zero-plaintext leakage in memory.
 * 
 * Used for local development, air-gapped deployments, and automated testing
 * when external Cloud KMS credentials are not available.
 */

import crypto from 'crypto';
import { KMSProvider } from './KMSProvider';
import {
  KeyMetadata,
  KMSProviderType,
  RotateKeyResult,
  UnwrapKeyParams,
  UnwrapKeyResult,
  WrapKeyParams,
  WrapKeyResult,
} from './types';

interface InternalKeyVersionRecord {
  metadata: KeyMetadata;
  rawKeyMaterial: Buffer; // Kept strictly private inside this module
}

export class LocalKMSProvider extends KMSProvider {
  public readonly providerType: KMSProviderType = 'LOCAL';

  // Map: keyId -> (Map: version -> InternalKeyVersionRecord)
  private keyRings: Map<string, Map<number, InternalKeyVersionRecord>> = new Map();
  // Map: keyId -> activeVersionNumber
  private activeVersions: Map<string, number> = new Map();

  public constructor() {
    super();
  }

  /**
   * Initializes or fetches a key with at least version 1.
   */
  private ensureKeyInitialized(keyId: string): number {
    let ring = this.keyRings.get(keyId);
    if (!ring) {
      ring = new Map();
      this.keyRings.set(keyId, ring);
    }

    if (!this.activeVersions.has(keyId)) {
      const v1KeyMaterial = crypto.randomBytes(32); // 256-bit KEK
      const v1Metadata: KeyMetadata = {
        keyId,
        version: 1,
        provider: 'LOCAL',
        algorithm: 'AES_256_GCM',
        state: 'ACTIVE',
        createdAt: new Date().toISOString(),
        usageCount: 0,
        description: `Local KEK version 1 for ${keyId}`,
      };
      ring.set(1, { metadata: v1Metadata, rawKeyMaterial: v1KeyMaterial });
      this.activeVersions.set(keyId, 1);
      return 1;
    }

    return this.activeVersions.get(keyId)!;
  }

  public async wrapKey(params: WrapKeyParams): Promise<WrapKeyResult> {
    const { keyId, plaintextKey, additionalAuthenticatedData } = params;
    const version = params.version || this.ensureKeyInitialized(keyId);

    const ring = this.keyRings.get(keyId);
    const keyRecord = ring?.get(version);

    if (!keyRecord) {
      throw new Error(`KMS Error: Key "${keyId}" version ${version} not found`);
    }

    if (keyRecord.metadata.state === 'REVOKED') {
      throw new Error(`KMS Security Violation: Key "${keyId}" version ${version} has been revoked`);
    }

    if (keyRecord.metadata.state === 'DESTROYED') {
      throw new Error(`KMS Security Violation: Key "${keyId}" version ${version} has been destroyed`);
    }

    // Wrap DEK with AES-256-GCM
    const iv = crypto.randomBytes(12); // Standard 96-bit IV for GCM
    const cipher = crypto.createCipheriv('aes-256-gcm', keyRecord.rawKeyMaterial, iv);

    if (additionalAuthenticatedData) {
      cipher.setAAD(additionalAuthenticatedData);
    }

    const wrappedKey = Buffer.concat([cipher.update(plaintextKey), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Increment usage counter
    keyRecord.metadata.usageCount += 1;

    return {
      keyId,
      version,
      wrappedKey,
      iv,
      authTag,
    };
  }

  public async unwrapKey(params: UnwrapKeyParams): Promise<UnwrapKeyResult> {
    const { keyId, version, wrappedKey, iv, authTag, additionalAuthenticatedData } = params;

    this.ensureKeyInitialized(keyId);
    const ring = this.keyRings.get(keyId);
    const keyRecord = ring?.get(version);

    if (!keyRecord) {
      throw new Error(`KMS Error: Key "${keyId}" version ${version} not found`);
    }

    if (keyRecord.metadata.state === 'REVOKED') {
      throw new Error(`KMS Security Violation: Key "${keyId}" version ${version} has been REVOKED. Decryption denied.`);
    }

    if (keyRecord.metadata.state === 'DESTROYED') {
      throw new Error(`KMS Security Violation: Key "${keyId}" version ${version} has been DESTROYED`);
    }

    if (!iv || iv.length === 0) {
      throw new Error('KMS Error: Missing Initialization Vector (IV) for key unwrap');
    }

    if (!authTag || authTag.length === 0) {
      throw new Error('KMS Error: Missing Authentication Tag for key unwrap');
    }

    try {
      const decipher = crypto.createDecipheriv('aes-256-gcm', keyRecord.rawKeyMaterial, iv);
      decipher.setAuthTag(authTag);

      if (additionalAuthenticatedData) {
        decipher.setAAD(additionalAuthenticatedData);
      }

      const plaintextKey = Buffer.concat([decipher.update(wrappedKey), decipher.final()]);

      // Validate DEK length (AES-256 requires 32 bytes)
      if (plaintextKey.length !== 32) {
        throw new Error(`KMS Error: Unwrapped key length mismatch: expected 32 bytes, got ${plaintextKey.length}`);
      }

      keyRecord.metadata.usageCount += 1;

      return {
        plaintextKey,
        version,
      };
    } catch (err: any) {
      throw new Error(`KMS Cryptographic Error: Failed to unwrap DEK (Authentication failed or corrupted ciphertext): ${err.message}`);
    }
  }

  public async rotateKey(keyId: string): Promise<RotateKeyResult> {
    const previousVersion = this.ensureKeyInitialized(keyId);
    const ring = this.keyRings.get(keyId)!;

    // Deprecate previous active version (still allows decryption of older records)
    const prevRecord = ring.get(previousVersion);
    if (prevRecord && prevRecord.metadata.state === 'ACTIVE') {
      prevRecord.metadata.state = 'DEPRECATED';
    }

    // Create new active version with fresh 256-bit KEK
    const newVersion = previousVersion + 1;
    const newKeyMaterial = crypto.randomBytes(32);
    const now = new Date().toISOString();

    const newMetadata: KeyMetadata = {
      keyId,
      version: newVersion,
      provider: 'LOCAL',
      algorithm: 'AES_256_GCM',
      state: 'ACTIVE',
      createdAt: now,
      rotatedAt: now,
      usageCount: 0,
      description: `Local KEK version ${newVersion} for ${keyId}`,
    };

    ring.set(newVersion, { metadata: newMetadata, rawKeyMaterial: newKeyMaterial });
    this.activeVersions.set(keyId, newVersion);

    return {
      keyId,
      previousVersion,
      newVersion,
      rotatedAt: now,
    };
  }

  public async getKeyMetadata(keyId: string, version?: number): Promise<KeyMetadata> {
    const v = version || this.ensureKeyInitialized(keyId);
    const ring = this.keyRings.get(keyId);
    const record = ring?.get(v);

    if (!record) {
      throw new Error(`KMS Error: Key "${keyId}" version ${v} not found`);
    }

    // Return a cloned copy without exposing rawKeyMaterial
    return { ...record.metadata };
  }

  public async revokeKeyVersion(keyId: string, version: number, reason: string): Promise<void> {
    this.ensureKeyInitialized(keyId);
    const ring = this.keyRings.get(keyId);
    const record = ring?.get(version);

    if (!record) {
      throw new Error(`KMS Error: Key "${keyId}" version ${version} not found`);
    }

    record.metadata.state = 'REVOKED';
    record.metadata.revokedAt = new Date().toISOString();
    record.metadata.revocationReason = reason;
  }

  public async listKeyVersions(keyId: string): Promise<KeyMetadata[]> {
    this.ensureKeyInitialized(keyId);
    const ring = this.keyRings.get(keyId);
    if (!ring) return [];

    return Array.from(ring.values()).map((r) => ({ ...r.metadata }));
  }

  public async isHealthy(): Promise<boolean> {
    return true;
  }

  /**
   * Diagnostic helper for testing memory cleanup
   */
  public clearAllKeys(): void {
    for (const ring of this.keyRings.values()) {
      for (const record of ring.values()) {
        record.rawKeyMaterial.fill(0); // Zero out key memory
      }
      ring.clear();
    }
    this.keyRings.clear();
    this.activeVersions.clear();
  }
}
