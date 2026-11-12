/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Intrusion Detection Engine (Phase 32)
 * Passive, non-invasive security monitor that correlates cross-system security events,
 * detects unauthorized access spikes, agent identity mismatches, and rate-limit violations.
 * Integrates directly with IncidentManager without duplicate flooding.
 */

import { IncidentManager } from '../utils/incidentManager';
import { DistributedEventBus } from './DistributedEventBus';
import { DistributedFaultToleranceEngine } from './DistributedFaultToleranceEngine';
import { SystemAuditHistoryRecord } from '../types/phase31';

export interface IntrusionAlertRecord {
  alertId: string;
  timestamp: string;
  alertType: 'UNAUTHORIZED_ACCESS_BURST' | 'AGENT_IDENTITY_MISMATCH' | 'RATE_LIMIT_FLOOD' | 'SESSION_HIJACK_SUSPECT';
  source: string;
  severity: 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details: string;
  fingerprint: string;
  correlatedIncidentId?: string;
  acknowledged: boolean;
}

export class IntrusionDetectionEngine {
  private static instance: IntrusionDetectionEngine | null = null;
  private alerts: IntrusionAlertRecord[] = [];
  private seenFingerprints: Map<string, number> = new Map();
  private auditLogs: SystemAuditHistoryRecord[] = [];
  private listeners: Set<(alerts: IntrusionAlertRecord[]) => void> = new Set();

  public constructor() {
    this.seedInitialAlerts();
    this.listenToEventBus();
  }

  public static getInstance(): IntrusionDetectionEngine {
    if (!IntrusionDetectionEngine.instance) {
      IntrusionDetectionEngine.instance = new IntrusionDetectionEngine();
    }
    return IntrusionDetectionEngine.instance;
  }

  public static resetInstance(): void {
    IntrusionDetectionEngine.instance = null;
  }

  private seedInitialAlerts(): void {
    const seeds: IntrusionAlertRecord[] = [
      {
        alertId: 'ids-seed-01',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        alertType: 'UNAUTHORIZED_ACCESS_BURST',
        source: 'APISecurityGateway',
        severity: 'MEDIUM',
        details: 'Baseline ingress traffic pattern evaluated. No malicious anomalies detected.',
        fingerprint: 'ids-seed-01',
        acknowledged: true,
      },
    ];
    this.alerts.push(...seeds);
  }

  private listenToEventBus(): void {
    DistributedEventBus.getInstance().subscribeToEvent('SECURITY_THREAT_DETECTED', (evt) => {
      this.correlateEvent(evt);
    });
  }

  private correlateEvent(evt: any): void {
    const payload = evt.payload;
    if (!payload) return;

    if (payload.severity === 'CRITICAL' || payload.severity === 'HIGH') {
      this.recordAlert({
        alertType: payload.category === 'AGENT_IMPERSONATION' ? 'AGENT_IDENTITY_MISMATCH' : 'UNAUTHORIZED_ACCESS_BURST',
        source: payload.affectedComponent || 'ThreatDetector',
        severity: payload.severity,
        details: payload.explanation,
        fingerprint: `ids-corr-${payload.category}-${payload.affectedComponent}`,
      });
    }
  }

  public recordAlert(params: {
    alertType: IntrusionAlertRecord['alertType'];
    source: string;
    severity: IntrusionAlertRecord['severity'];
    details: string;
    fingerprint: string;
  }): IntrusionAlertRecord | null {
    const now = Date.now();
    const lastSeen = this.seenFingerprints.get(params.fingerprint);

    // 4000ms duplicate suppression window
    if (lastSeen && now - lastSeen < 4000) {
      return null;
    }

    this.seenFingerprints.set(params.fingerprint, now);

    const alertId = `ids-${now}-${Math.random().toString(36).substring(2, 6)}`;
    const alert: IntrusionAlertRecord = {
      alertId,
      timestamp: new Date(now).toISOString(),
      alertType: params.alertType,
      source: params.source,
      severity: params.severity,
      details: params.details,
      fingerprint: params.fingerprint,
      acknowledged: false,
    };

    // If critical or high, escalate to IncidentManager and record failure in fault tolerance
    if (params.severity === 'CRITICAL') {
      try {
        const incidentMgr = new IncidentManager();
        const created = incidentMgr.recordIncident({
          category: 'environmental_inconclusive',
          severity: 'CRITICAL',
          description: `[Intrusion Alert] ${params.alertType} from ${params.source}: ${params.details}`,
          recommendedAction: 'Inspect agent credentials, isolate client source IP, and conduct Zero-Trust review.',
          rule2ComplianceVerified: true,
        });
        if (created) {
          alert.correlatedIncidentId = created.incidentId;
        }

        // Notify fault tolerance to isolate source if agent
        if (params.source.startsWith('agent-')) {
          DistributedFaultToleranceEngine.getInstance().recordFailure(params.source, `Intrusion detection: ${params.details}`);
        }
      } catch (err) {
        console.warn('Incident correlation error:', err);
      }
    }

    this.alerts.unshift(alert);
    if (this.alerts.length > 100) {
      this.alerts.pop();
    }

    this.recordAudit(
      'SECURITY',
      'INTRUSION_ALERT',
      params.source,
      `[${params.severity}] ${params.alertType}: ${params.details}`,
      params.severity !== 'CRITICAL'
    );

    this.notifyListeners();
    return alert;
  }

  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find((a) => a.alertId === alertId);
    if (!alert) return false;

    alert.acknowledged = true;
    this.notifyListeners();
    return true;
  }

  public getAllAlerts(): IntrusionAlertRecord[] {
    return [...this.alerts];
  }

  public getAuditLogs(): SystemAuditHistoryRecord[] {
    return [...this.auditLogs];
  }

  private recordAudit(
    category: SystemAuditHistoryRecord['category'],
    action: string,
    actor: string,
    details: string,
    success: boolean
  ): void {
    this.auditLogs.unshift({
      id: `audit-ids-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      category,
      action,
      actor,
      details,
      success,
    });
    if (this.auditLogs.length > 100) {
      this.auditLogs.pop();
    }
  }

  public subscribe(listener: (alerts: IntrusionAlertRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllAlerts());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllAlerts();
    this.listeners.forEach((l) => l(list));
  }
}
