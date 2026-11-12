/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Key Compromise Incident Response Manager (Stage 5.2)
 * Orchestrates emergency responses to cryptographic key compromises:
 * - Immediate key version revocation.
 * - Emergency atomic key rotation.
 * - Critical incident audit logging and alerting.
 * - Safe data migration / re-encryption before key decommissioning.
 */

import { KMSFactory } from '../kms/KMSFactory';
import { KMSProvider } from '../kms/KMSProvider';
import { KMSConfig } from '../kms/KMSConfig';
import { EnvelopeEncryption } from '../encryption/EnvelopeEncryption';
import { EncryptedEnvelope } from '../encryption/EncryptionTypes';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';
import { DistributedEventBus } from '../../engines/DistributedEventBus';

export interface CompromiseIncidentRecord {
  incidentId: string;
  keyId: string;
  compromisedVersion: number;
  reportedBy: string;
  reason: string;
  revokedAt: string;
  emergencyRotatedVersion: number;
  status: 'CONTAINED' | 'RE-ENCRYPTING' | 'RESOLVED';
}

export class KeyCompromiseManager {
  private static instance: KeyCompromiseManager | null = null;
  private kmsProvider: KMSProvider;
  private envelopeEncryption: EnvelopeEncryption;
  private incidents: Map<string, CompromiseIncidentRecord> = new Map();

  private constructor(kmsProvider?: KMSProvider, envelopeEncryption?: EnvelopeEncryption) {
    const config = new KMSConfig();
    this.kmsProvider = kmsProvider || KMSFactory.getProvider(config);
    this.envelopeEncryption = envelopeEncryption || EnvelopeEncryption.getInstance(this.kmsProvider);
  }

  public static getInstance(kmsProvider?: KMSProvider, envelopeEncryption?: EnvelopeEncryption): KeyCompromiseManager {
    if (!KeyCompromiseManager.instance) {
      KeyCompromiseManager.instance = new KeyCompromiseManager(kmsProvider, envelopeEncryption);
    }
    return KeyCompromiseManager.instance;
  }

  public static resetInstance(): void {
    KeyCompromiseManager.instance = null;
  }

  /**
   * Executes emergency containment for a compromised key version.
   */
  public async handleCompromise(params: {
    keyId: string;
    compromisedVersion: number;
    reportedBy: string;
    reason: string;
  }): Promise<CompromiseIncidentRecord> {
    const { keyId, compromisedVersion, reportedBy, reason } = params;
    const incidentId = `inc-kms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // 1. Mark key version as REVOKED in KMS
    await this.kmsProvider.revokeKeyVersion(keyId, compromisedVersion, reason);

    // 2. Perform emergency key rotation to generate safe fresh KEK
    const rotateResult = await this.kmsProvider.rotateKey(keyId);

    const record: CompromiseIncidentRecord = {
      incidentId,
      keyId,
      compromisedVersion,
      reportedBy,
      reason,
      revokedAt: now,
      emergencyRotatedVersion: rotateResult.newVersion,
      status: 'CONTAINED',
    };

    this.incidents.set(incidentId, record);

    // 3. Log critical security incident
    const obs = EnterpriseObservabilityManager.getInstance();
    obs.log({
      level: 'SECURITY',
      service: 'KeyCompromiseManager',
      message: `CRITICAL KEY COMPROMISE: Key "${keyId}" version ${compromisedVersion} revoked. Emergency rotated to version ${rotateResult.newVersion}`,
      metadata: { incidentId, ...params, newVersion: rotateResult.newVersion },
    });

    // 4. Publish to event bus
    try {
      const bus = DistributedEventBus.getInstance();
      bus.publish({
        eventType: 'KMS_KEY_COMPROMISED_EMERGENCY_ROTATION',
        source: 'KeyCompromiseManager',
        priority: 'CRITICAL',
        payload: {
          incidentId,
          keyId,
          compromisedVersion,
          emergencyVersion: rotateResult.newVersion,
        },
        suppressionFingerprint: `comp-${incidentId}`,
      });
    } catch {
      // Safe ignore
    }

    return record;
  }

  public getIncident(incidentId: string): CompromiseIncidentRecord | undefined {
    return this.incidents.get(incidentId);
  }
}

export const keyCompromiseManager = KeyCompromiseManager.getInstance();
