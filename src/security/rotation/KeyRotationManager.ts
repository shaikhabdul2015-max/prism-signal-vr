/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Key Rotation Manager (Stage 5.2)
 * Orchestrates automated, scheduled, and emergency cryptographic key rotations.
 * 
 * Principles:
 * 1. Monotonic version incrementation with atomic active key pointer transition.
 * 2. Older key versions are marked DEPRECATED, never destroyed while data depends on them.
 * 3. Graceful decryption of legacy records with seamless re-encryption workflows.
 * 4. Audit logging of every rotation lifecycle event.
 */

import { KMSFactory } from '../kms/KMSFactory';
import { KMSProvider } from '../kms/KMSProvider';
import { KMSConfig } from '../kms/KMSConfig';
import { KeyMetadata, RotateKeyResult } from '../kms/types';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';
import { DistributedEventBus } from '../../engines/DistributedEventBus';

export interface RotationPolicy {
  keyId: string;
  intervalDays: number;
  warningThresholdDays: number;
  autoRotate: boolean;
}

export class KeyRotationManager {
  private static instance: KeyRotationManager | null = null;
  private kmsProvider: KMSProvider;
  private policies: Map<string, RotationPolicy> = new Map();

  private constructor(kmsProvider?: KMSProvider) {
    const config = new KMSConfig();
    this.kmsProvider = kmsProvider || KMSFactory.getProvider(config);
    this.policies.set(config.defaultKeyId, {
      keyId: config.defaultKeyId,
      intervalDays: config.autoRotationIntervalDays,
      warningThresholdDays: config.rotationWarningThresholdDays,
      autoRotate: true,
    });
  }

  public static getInstance(kmsProvider?: KMSProvider): KeyRotationManager {
    if (!KeyRotationManager.instance) {
      KeyRotationManager.instance = new KeyRotationManager(kmsProvider);
    }
    return KeyRotationManager.instance;
  }

  public static resetInstance(): void {
    KeyRotationManager.instance = null;
  }

  public setPolicy(policy: RotationPolicy): void {
    this.policies.set(policy.keyId, policy);
  }

  public getPolicy(keyId: string): RotationPolicy | undefined {
    return this.policies.get(keyId);
  }

  /**
   * Performs an atomic key rotation.
   */
  public async rotateKey(keyId: string, actorId: string = 'SystemAutoRotation'): Promise<RotateKeyResult> {
    const obs = EnterpriseObservabilityManager.getInstance();
    const startTime = performance.now();

    try {
      const result = await this.kmsProvider.rotateKey(keyId);
      const durationMs = performance.now() - startTime;

      // Record audit event
      obs.log({
        level: 'SECURITY',
        service: 'KeyRotationManager',
        message: `Key "${keyId}" rotated successfully from version ${result.previousVersion} to ${result.newVersion}`,
        metadata: {
          keyId,
          previousVersion: result.previousVersion,
          newVersion: result.newVersion,
          actorId,
          durationMs,
        },
      });

      // Broadcast to DistributedEventBus
      try {
        const bus = DistributedEventBus.getInstance();
        bus.publish({
          eventType: 'CRYPTOGRAPHIC_KEY_ROTATED',
          source: 'KeyRotationManager',
          priority: 'HIGH',
          payload: {
            keyId,
            previousVersion: result.previousVersion,
            newVersion: result.newVersion,
            rotatedAt: result.rotatedAt,
          },
          suppressionFingerprint: `rot-${keyId}-${result.newVersion}`,
        });
      } catch {
        // Safe ignore
      }

      return result;
    } catch (err: any) {
      obs.log({
        level: 'ERROR',
        service: 'KeyRotationManager',
        message: `Key rotation failed for "${keyId}": ${err.message}`,
        metadata: { keyId, error: err.message, actorId },
      });
      throw err;
    }
  }

  /**
   * Checks if an active key has exceeded its rotation policy interval.
   */
  public async isRotationDue(keyId: string): Promise<{ isDue: boolean; ageDays: number; reason?: string }> {
    const policy = this.policies.get(keyId) || {
      keyId,
      intervalDays: 90,
      warningThresholdDays: 14,
      autoRotate: true,
    };

    const activeMeta = await this.kmsProvider.getKeyMetadata(keyId);
    const createdTimestamp = new Date(activeMeta.createdAt).getTime();
    const ageMs = Date.now() - createdTimestamp;
    const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));

    if (ageDays >= policy.intervalDays) {
      return {
        isDue: true,
        ageDays,
        reason: `Key age (${ageDays} days) exceeds rotation interval (${policy.intervalDays} days)`,
      };
    }

    return {
      isDue: false,
      ageDays,
    };
  }

  /**
   * Returns complete history of all versions for a key.
   */
  public async getKeyHistory(keyId: string): Promise<KeyMetadata[]> {
    return this.kmsProvider.listKeyVersions(keyId);
  }
}

export const keyRotationManager = KeyRotationManager.getInstance();
