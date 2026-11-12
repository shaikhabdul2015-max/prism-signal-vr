/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Incident Manager
 * Master orchestrator for security incidents, evidence chain of custody,
 * lifecycle state progression, and remediation audits.
 */

import { ThreatEvent } from '../threat-detection/ThreatEvent';
import { IncidentStatus, IncidentWorkflow } from './IncidentWorkflow';
import { ForensicEvidenceItem, IncidentEvidenceLocker } from './IncidentEvidence';
import { IncidentNotificationDispatcher } from './IncidentNotification';
import { IncidentRecoveryVerifier, RecoveryVerificationReport } from './IncidentRecovery';
import { IncidentTimeline, TimelineEntry } from '../correlation/IncidentTimeline';

export interface SecurityIncident {
  id: string;
  title: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: IncidentStatus;
  createdAt: string;
  updatedAt: string;
  sourceIp: string;
  userId?: string;
  relatedThreatIds: string[];
  evidence: ForensicEvidenceItem[];
  timeline: TimelineEntry[];
  assignedOperator?: string;
  resolutionNotes?: string;
}

export class IncidentManager {
  private static instance: IncidentManager | null = null;
  private incidents: Map<string, SecurityIncident> = new Map();
  private evidenceLocker: IncidentEvidenceLocker = new IncidentEvidenceLocker();

  private constructor() {}

  public static getInstance(): IncidentManager {
    if (!IncidentManager.instance) {
      IncidentManager.instance = new IncidentManager();
    }
    return IncidentManager.instance;
  }

  public static resetInstance(): void {
    if (IncidentManager.instance) {
      IncidentManager.instance.incidents.clear();
    }
    IncidentManager.instance = null;
  }

  /**
   * Creates an incident from a severe ThreatEvent.
   */
  public createIncidentFromThreat(threat: ThreatEvent): SecurityIncident {
    const id = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();

    const sealedEv = this.evidenceLocker.sealEvidence('THREAT_TRIGGER', 'ThreatDetectionEngine', {
      threatId: threat.id,
      category: threat.category,
      riskScore: threat.riskScore,
      details: threat.details,
      context: threat.context,
    });

    const timeline = IncidentTimeline.buildTimeline([threat]);

    const incident: SecurityIncident = {
      id,
      title: `${threat.severity} Security Incident: ${threat.title}`,
      severity: threat.severity === 'INFORMATIONAL' ? 'LOW' : threat.severity,
      status: 'DETECTED',
      createdAt: now,
      updatedAt: now,
      sourceIp: threat.sourceIp,
      userId: threat.userId,
      relatedThreatIds: [threat.id],
      evidence: [sealedEv],
      timeline,
    };

    this.incidents.set(id, incident);

    IncidentNotificationDispatcher.dispatchAlert({
      incidentId: id,
      title: incident.title,
      severity: incident.severity,
      sourceIp: incident.sourceIp,
      status: incident.status,
    });

    return incident;
  }

  /**
   * Transitions an incident state through the approved lifecycle.
   */
  public updateIncidentStatus(
    incidentId: string,
    targetStatus: IncidentStatus,
    operatorId: string,
    notes?: string
  ): boolean {
    const incident = this.incidents.get(incidentId);
    if (!incident) return false;

    if (!IncidentWorkflow.canTransition(incident.status, targetStatus)) {
      throw new Error(`Invalid status transition from ${incident.status} to ${targetStatus}`);
    }

    incident.status = targetStatus;
    incident.updatedAt = new Date().toISOString();
    incident.assignedOperator = operatorId;
    if (notes) incident.resolutionNotes = notes;

    IncidentNotificationDispatcher.dispatchAlert({
      incidentId,
      title: incident.title,
      severity: incident.severity,
      sourceIp: incident.sourceIp,
      status: targetStatus,
    });

    return true;
  }

  /**
   * Verifies remediation of an incident.
   */
  public async verifyIncidentRemediation(incidentId: string): Promise<RecoveryVerificationReport> {
    const incident = this.incidents.get(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }
    return IncidentRecoveryVerifier.verifyRemediation(incidentId, incident.sourceIp);
  }

  public getIncident(id: string): SecurityIncident | undefined {
    return this.incidents.get(id);
  }

  public getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values()).filter((i) => i.status !== 'CLOSED');
  }

  public getAllIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values()).reverse();
  }
}
