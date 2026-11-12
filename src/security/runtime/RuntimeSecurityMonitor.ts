/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Runtime Security Monitor
 * Continuously validates privileged runtime operations and KMS accesses.
 */

import { ThreatDetectionEngine } from '../threat-detection/ThreatDetectionEngine';
import { DistributedEventBus } from '../../engines/DistributedEventBus';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export class RuntimeSecurityMonitor {
  private static instance: RuntimeSecurityMonitor | null = null;

  private constructor() {}

  public static getInstance(): RuntimeSecurityMonitor {
    if (!RuntimeSecurityMonitor.instance) {
      RuntimeSecurityMonitor.instance = new RuntimeSecurityMonitor();
    }
    return RuntimeSecurityMonitor.instance;
  }

  public static resetInstance(): void {
    RuntimeSecurityMonitor.instance = null;
  }

  /**
   * Records and monitors a KMS cryptographic key operation.
   */
  public async monitorKMSAccess(params: {
    action: 'WRAP' | 'UNWRAP' | 'ENCRYPT' | 'DECRYPT' | 'ROTATE' | 'REVOKE';
    keyId: string;
    version?: number;
    actorId: string;
    sourceIp: string;
    success: boolean;
    errorReason?: string;
  }): Promise<void> {
    if (!params.success) {
      const threatEngine = ThreatDetectionEngine.getInstance();
      await threatEngine.ingestSignal({
        type: 'KMS_UNAUTHORIZED',
        sourceIp: params.sourceIp,
        userId: params.actorId,
        endpoint: `/kms/${params.keyId}`,
        metadata: {
          action: params.action,
          keyId: params.keyId,
          version: params.version,
          errorReason: params.errorReason,
        },
      });

      try {
        const obs = EnterpriseObservabilityManager.getInstance();
        obs.log({
          level: 'ERROR',
          service: 'RuntimeSecurityMonitor',
          message: `[KMS_SECURITY_ALERT] Failed ${params.action} on ${params.keyId} by ${params.actorId}: ${params.errorReason}`,
          metadata: params,
        });
      } catch {
        // Non-blocking
      }
    }
  }

  /**
   * Monitors sensitive configuration and permission mutations.
   */
  public async monitorPrivilegedMutation(params: {
    actorId: string;
    action: string;
    resource: string;
    sourceIp: string;
    isAuthorized: boolean;
  }): Promise<void> {
    if (!params.isAuthorized) {
      const threatEngine = ThreatDetectionEngine.getInstance();
      await threatEngine.ingestSignal({
        type: 'PRIVILEGE_ESCALATION_ATTEMPT',
        sourceIp: params.sourceIp,
        userId: params.actorId,
        endpoint: `/security/${params.resource}`,
        metadata: { action: params.action, resource: params.resource },
      });
    }
  }
}
