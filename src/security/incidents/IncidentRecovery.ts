/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Incident Recovery Verifier
 * Verifies post-incident remediation, containment integrity, and service restoration.
 */

import { ResponseRollbackManager } from '../response/ResponseRollback';
import { KMSFactory } from '../kms/KMSFactory';

export interface RecoveryVerificationReport {
  incidentId: string;
  isContained: boolean;
  kmsOperational: boolean;
  activeMitigationsCount: number;
  allChecksPassed: boolean;
  verifiedAt: string;
}

export class IncidentRecoveryVerifier {
  public static async verifyRemediation(
    incidentId: string,
    targetIp?: string
  ): Promise<RecoveryVerificationReport> {
    const rollback = ResponseRollbackManager.getInstance();
    const activeMits = rollback.getActiveMitigations();
    const isContained = targetIp ? rollback.isTargetMitigated('QUARANTINE_IP_TEMP', targetIp) : true;

    // Verify KMS health
    let kmsOperational = true;
    try {
      const kms = KMSFactory.getProvider();
      kmsOperational = await kms.isHealthy();
    } catch {
      kmsOperational = false;
    }

    const allChecksPassed = isContained && kmsOperational;

    return {
      incidentId,
      isContained,
      kmsOperational,
      activeMitigationsCount: activeMits.length,
      allChecksPassed,
      verifiedAt: new Date().toISOString(),
    };
  }
}
