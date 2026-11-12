/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Zero-Downtime Secret Rotation Manager (Stage 5.2)
 * Manages versioned application secrets, dual-key transition windows,
 * atomic active-key switching, in-memory TTL caching, and failed rotation rollback.
 */

import { EnvelopeEncryption } from '../encryption/EnvelopeEncryption';
import { EncryptedEnvelope } from '../encryption/EncryptionTypes';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export interface VersionedSecret {
  secretId: string;
  version: number;
  encryptedEnvelope: EncryptedEnvelope;
  createdAt: string;
  expiresAt?: string;
}

interface CachedSecret {
  plaintext: string;
  version: number;
  cachedAtMs: number;
  ttlMs: number;
}

export class SecretRotationManager {
  private static instance: SecretRotationManager | null = null;
  private envelopeEncryption: EnvelopeEncryption;

  // Map: secretId -> (Map: version -> VersionedSecret)
  private secretsStore: Map<string, Map<number, VersionedSecret>> = new Map();
  // Map: secretId -> activeVersionNumber
  private activeVersions: Map<string, number> = new Map();
  // In-memory decrypted cache with TTL
  private cache: Map<string, CachedSecret> = new Map();
  private defaultTtlMs = 5 * 60 * 1000; // 5 minutes

  private constructor(envelopeEncryption?: EnvelopeEncryption) {
    this.envelopeEncryption = envelopeEncryption || EnvelopeEncryption.getInstance();
  }

  public static getInstance(envelopeEncryption?: EnvelopeEncryption): SecretRotationManager {
    if (!SecretRotationManager.instance) {
      SecretRotationManager.instance = new SecretRotationManager(envelopeEncryption);
    }
    return SecretRotationManager.instance;
  }

  public static resetInstance(): void {
    if (SecretRotationManager.instance) {
      SecretRotationManager.instance.clearCache();
      SecretRotationManager.instance = null;
    }
  }

  /**
   * Stores a new secret or updates a secret with a new version atomically.
   */
  public async setSecret(secretId: string, plaintextSecret: string): Promise<number> {
    let versionMap = this.secretsStore.get(secretId);
    if (!versionMap) {
      versionMap = new Map();
      this.secretsStore.set(secretId, versionMap);
    }

    const previousVersion = this.activeVersions.get(secretId) || 0;
    const newVersion = previousVersion + 1;

    try {
      // Encrypt with EnvelopeEncryption
      const envelope = await this.envelopeEncryption.encrypt(plaintextSecret, {
        additionalData: `secret:${secretId}:v${newVersion}`,
      });

      const secretRecord: VersionedSecret = {
        secretId,
        version: newVersion,
        encryptedEnvelope: envelope,
        createdAt: new Date().toISOString(),
      };

      versionMap.set(newVersion, secretRecord);
      this.activeVersions.set(secretId, newVersion);

      // Invalidate old cache and prime with new version
      this.cache.set(secretId, {
        plaintext: plaintextSecret,
        version: newVersion,
        cachedAtMs: Date.now(),
        ttlMs: this.defaultTtlMs,
      });

      const obs = EnterpriseObservabilityManager.getInstance();
      obs.log({
        level: 'SECURITY',
        service: 'SecretRotationManager',
        message: `Secret "${secretId}" rotated to version ${newVersion}`,
        metadata: { secretId, newVersion, previousVersion },
      });

      return newVersion;
    } catch (err: any) {
      // Rollback active pointer if failed
      if (previousVersion > 0) {
        this.activeVersions.set(secretId, previousVersion);
      }
      throw new Error(`Failed to atomically set secret "${secretId}": ${err.message}`);
    }
  }

  /**
   * Retrieves a secret by ID, checking the in-memory TTL cache first.
   * Supports dual-key transitions: if a specific version is requested, decrypts that version.
   */
  public async getSecret(secretId: string, specificVersion?: number): Promise<string> {
    const versionMap = this.secretsStore.get(secretId);
    if (!versionMap || versionMap.size === 0) {
      throw new Error(`Secret Error: Secret "${secretId}" not found`);
    }

    const targetVersion = specificVersion || this.activeVersions.get(secretId);
    if (!targetVersion) {
      throw new Error(`Secret Error: No active version for secret "${secretId}"`);
    }

    // Check TTL cache if fetching the active version
    if (!specificVersion || specificVersion === this.activeVersions.get(secretId)) {
      const cached = this.cache.get(secretId);
      if (cached && Date.now() - cached.cachedAtMs < cached.ttlMs && cached.version === targetVersion) {
        return cached.plaintext;
      }
    }

    const secretRecord = versionMap.get(targetVersion);
    if (!secretRecord) {
      throw new Error(`Secret Error: Version ${targetVersion} for secret "${secretId}" not found`);
    }

    // Decrypt envelope
    const decrypted = await this.envelopeEncryption.decrypt(secretRecord.encryptedEnvelope);
    const plaintext = decrypted.plaintextUtf8;

    // Cache decrypted secret
    this.cache.set(secretId, {
      plaintext,
      version: targetVersion,
      cachedAtMs: Date.now(),
      ttlMs: this.defaultTtlMs,
    });

    return plaintext;
  }

  public getActiveVersion(secretId: string): number | undefined {
    return this.activeVersions.get(secretId);
  }

  public clearCache(): void {
    this.cache.clear();
  }
}

export const secretRotationManager = SecretRotationManager.getInstance();
