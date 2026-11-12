/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Zero-Trust Monitor
 * Master coordinator for runtime zero-trust validation across sessions, RBAC, and KMS operations.
 */

import { SessionRiskMonitor } from './SessionRiskMonitor';
import { AccessPolicyEvaluator, SecurityPrincipal } from './AccessPolicyEvaluator';
import { RuntimeSecurityMonitor } from './RuntimeSecurityMonitor';
import { ThreatDetectionEngine } from '../threat-detection/ThreatDetectionEngine';

export class ZeroTrustMonitor {
  private static instance: ZeroTrustMonitor | null = null;
  public readonly sessionRisk: SessionRiskMonitor;
  public readonly runtimeSecurity: RuntimeSecurityMonitor;

  private constructor() {
    this.sessionRisk = SessionRiskMonitor.getInstance();
    this.runtimeSecurity = RuntimeSecurityMonitor.getInstance();
  }

  public static getInstance(): ZeroTrustMonitor {
    if (!ZeroTrustMonitor.instance) {
      ZeroTrustMonitor.instance = new ZeroTrustMonitor();
    }
    return ZeroTrustMonitor.instance;
  }

  public static resetInstance(): void {
    SessionRiskMonitor.resetInstance();
    RuntimeSecurityMonitor.resetInstance();
    ZeroTrustMonitor.instance = null;
  }

  /**
   * Complete Zero-Trust gate check before permitting any API request.
   */
  public async validateRequest(params: {
    principal?: SecurityPrincipal;
    sessionId?: string;
    clientIp: string;
    userAgent: string;
    requiredPermission?: string;
    resourceTenantId?: string;
    endpoint?: string;
  }): Promise<{ allowed: boolean; status: number; reason?: string }> {
    // 1. Session check if sessionId provided
    if (params.sessionId) {
      const sessionValidation = this.sessionRisk.validateSession(
        params.sessionId,
        params.clientIp,
        params.userAgent
      );

      if (!sessionValidation.valid) {
        if (sessionValidation.anomalyType === 'IP_MUTATION' || sessionValidation.anomalyType === 'UA_MUTATION') {
          // Ingest as threat
          const threatEngine = ThreatDetectionEngine.getInstance();
          await threatEngine.ingestSignal({
            type: sessionValidation.anomalyType === 'IP_MUTATION' ? 'SESSION_IP_MUTATION' : 'SESSION_UA_MUTATION',
            sourceIp: params.clientIp,
            sessionId: params.sessionId,
            userId: params.principal?.userId,
            endpoint: params.endpoint,
            userAgent: params.userAgent,
          });
        }

        return {
          allowed: false,
          status: sessionValidation.requiresStepUp ? 403 : 401,
          reason: sessionValidation.reason,
        };
      }
    }

    // 2. Permission check if requiredPermission provided
    if (params.requiredPermission) {
      if (!params.principal) {
        return {
          allowed: false,
          status: 403,
          reason: 'Unauthenticated: Principal required for privileged permission check',
        };
      }

      const access = AccessPolicyEvaluator.evaluateAccess(
        params.principal,
        params.requiredPermission,
        params.resourceTenantId
      );

      if (!access.granted) {
        const threatEngine = ThreatDetectionEngine.getInstance();
        await threatEngine.ingestSignal({
          type: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          sourceIp: params.clientIp,
          userId: params.principal.userId,
          endpoint: params.endpoint,
          statusCode: 403,
          metadata: { requiredPermission: params.requiredPermission, reason: access.reason },
        });

        return {
          allowed: false,
          status: 403,
          reason: access.reason,
        };
      }
    }

    return { allowed: true, status: 200 };
  }
}
