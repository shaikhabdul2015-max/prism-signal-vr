/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Incident Notification Dispatcher
 */

import { DistributedEventBus } from '../../engines/DistributedEventBus';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export class IncidentNotificationDispatcher {
  public static dispatchAlert(params: {
    incidentId: string;
    title: string;
    severity: string;
    sourceIp: string;
    status: string;
  }): void {
    try {
      const eventBus = DistributedEventBus.getInstance();
      eventBus.publish({
        eventType: 'SECURITY_EVENT' as any,
        source: 'IncidentNotificationDispatcher',
        priority: params.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        payload: {
          action: 'INCIDENT_ALERT',
          incidentId: params.incidentId,
          title: params.title,
          severity: params.severity,
          sourceIp: params.sourceIp,
          status: params.status,
          timestamp: new Date().toISOString(),
        },
        suppressionFingerprint: `incident_${params.incidentId}_${params.status}`,
      });

      const obs = EnterpriseObservabilityManager.getInstance();
      obs.log({
        level: params.severity === 'CRITICAL' ? 'ERROR' : 'WARN',
        service: 'IncidentNotificationDispatcher',
        message: `[SECURITY_INCIDENT_ALERT] ${params.title} (ID: ${params.incidentId}, Severity: ${params.severity})`,
        metadata: params,
      });
    } catch {
      // Non-blocking
    }
  }
}
