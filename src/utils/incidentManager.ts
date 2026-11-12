/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Upgraded Incident Manager (Phase 18).
 * Provides intelligent classification, severity scoring, incident correlation,
 * fingerprint-based deduplication, automated recovery recommendations,
 * lifecycle analytics, and operator intervention tracking.
 */

import { VRTelemetry } from '../types/diagnostics';
import {
  IncidentRecord,
  IncidentSeverity,
  IncidentCategory,
  IncidentLifecycleState,
} from '../types/phase17';
import {
  IncidentClassification,
  UpgradedIncidentRecord,
} from '../types/phase18';
import { assessEnvironmentalCausation } from './environmentalAssessment';

export interface IncidentLifecycleAnalytics {
  totalIncidents: number;
  activeCount: number;
  resolvedCount: number;
  meanTimeToResolutionSeconds: number;
  bySeverity: Record<string, number>;
  byClassification: Record<string, number>;
}

export class IncidentManager {
  private incidents: Map<string, UpgradedIncidentRecord> = new Map();
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.saveToStorage();
    this.listeners.forEach((l) => l());
  }

  public getAllIncidents(): UpgradedIncidentRecord[] {
    return Array.from(this.incidents.values()).sort(
      (a, b) => new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
    );
  }

  public getActiveIncidents(): UpgradedIncidentRecord[] {
    return this.getAllIncidents().filter(
      (i) => i.state !== 'RESOLVED' && i.state !== 'CLOSED' && (i.state as string) !== 'Ignored'
    );
  }

  /**
   * Scans live telemetry and automatically registers or updates incidents with deduplication.
   */
  public auditTelemetryForIncidents(telemetry: VRTelemetry): UpgradedIncidentRecord[] {
    const detected: UpgradedIncidentRecord[] = [];
    const now = new Date().toISOString();
    const sessionId = telemetry.sessionId || 'session-live';

    // 1. Check for Optical Tracking Loss
    const interruptions = telemetry.trackingEvents?.filter((e) => !e.tracking).length || 0;
    if (interruptions > 0) {
      const severity: IncidentSeverity = interruptions > 4 ? 'CRITICAL' : 'HIGH';
      const severityScore = Math.min(100, 50 + interruptions * 10);
      const fingerprint = `inc-loss-${sessionId}`;
      const existing = this.incidents.get(fingerprint);

      if (existing && existing.state !== 'RESOLVED' && existing.state !== 'CLOSED') {
        existing.occurrenceCount += 1;
        existing.detectedAt = now;
        existing.lastSeenTimestamp = now;
        existing.telemetryEvidence.interruptionCount = interruptions;
        existing.severityScore = Math.max(existing.severityScore, severityScore);
        detected.push(existing);
      } else {
        const incident: UpgradedIncidentRecord = {
          incidentId: `inc-loss-${Date.now()}`,
          fingerprint,
          sessionId,
          category: 'tracking_loss',
          classification: 'critical_tracking_blackout',
          severity,
          severityScore,
          state: 'ACTION_REQUIRED',
          title: `Optical Hand Tracking Loss Detected (${interruptions} interruptions)`,
          detectedAt: now,
          lastSeenTimestamp: now,
          resolvedAt: null,
          telemetryEvidence: {
            interruptionCount: interruptions,
            expectedJoints: telemetry.expectedJointCount || 25,
          },
          diagnosticExplanation:
            'Frequent optical tracking dropouts detected. Hands may be outside optical camera frustum or mutually occluded.',
          recommendedAction:
            'Adjust hand pose toward central camera frustum and inspect for bimanual crossing boundaries.',
          automatedRecoverySteps: [
            'Bring hands 30cm in front of headset in clear view',
            'Spread fingers open for 2 seconds to allow tracker re-initialization',
            'Inspect headset camera lenses for smudges or physical obstructions',
          ],
          correlatedIncidentIds: [],
          notesHistory: [],
          resolutionNotes: null,
          resolvedBy: null,
          rule2ComplianceVerified: true,
          occurrenceCount: 1,
        };
        this.incidents.set(fingerprint, incident);
        detected.push(incident);
      }
    }

    // 2. Check for Skeleton Corruption / Joint Missing
    const trackedJoints = telemetry.joints?.filter((j) => j.tracked).length || 0;
    const expected = telemetry.expectedJointCount || 25;
    if (trackedJoints < expected && trackedJoints > 0) {
      const missingCount = expected - trackedJoints;
      const severity: IncidentSeverity = missingCount > 8 ? 'HIGH' : 'MEDIUM';
      const severityScore = Math.min(90, 30 + missingCount * 4);
      const fingerprint = `inc-skeleton-${sessionId}`;
      const existing = this.incidents.get(fingerprint);

      if (existing && existing.state !== 'RESOLVED' && existing.state !== 'CLOSED') {
        existing.occurrenceCount += 1;
        existing.detectedAt = now;
        existing.lastSeenTimestamp = now;
        existing.telemetryEvidence.missingJointCount = missingCount;
        existing.severityScore = Math.max(existing.severityScore, severityScore);
        detected.push(existing);
      } else {
        const incident: UpgradedIncidentRecord = {
          incidentId: `inc-skel-${Date.now()}`,
          fingerprint,
          sessionId,
          category: 'skeleton_corruption',
          classification: 'skeleton_joint_drift',
          severity,
          severityScore,
          state: 'INVESTIGATING',
          title: `Skeletal Anatomical Coverage Degraded (${missingCount} missing joints)`,
          detectedAt: now,
          lastSeenTimestamp: now,
          resolvedAt: null,
          telemetryEvidence: {
            observedJoints: trackedJoints,
            expectedJoints: expected,
            missingJointCount: missingCount,
          },
          diagnosticExplanation:
            'Hand skeleton missing anatomical joints. Optical camera tracking algorithm lost confidence on finger chains.',
          recommendedAction:
            'Spread fingers into static palm-forward pose to allow tracking pipeline to re-acquire full 25-joint skeleton.',
          automatedRecoverySteps: [
            'Avoid overlapping fingers or forming closed fists during alignment',
            'Hold palms perpendicular to line of sight for 1.5 seconds',
          ],
          correlatedIncidentIds: [],
          notesHistory: [],
          resolutionNotes: null,
          resolvedBy: null,
          rule2ComplianceVerified: true,
          occurrenceCount: 1,
        };
        this.incidents.set(fingerprint, incident);
        detected.push(incident);
      }
    }

    // 3. Check for Render Cadence / Frame Drops
    const frames = telemetry.frames || [];
    const droppedFrames = frames.filter((f) => f.dropped).length;
    const avgDelta = frames[0]?.frameDurationMs || 13.8;
    const fps = Math.round(1000 / avgDelta);

    if (droppedFrames > 0 || fps < 60) {
      const severity: IncidentSeverity = fps < 45 ? 'CRITICAL' : 'HIGH';
      const severityScore = fps < 45 ? 95 : 70;
      const fingerprint = `inc-cadence-${sessionId}`;
      const existing = this.incidents.get(fingerprint);

      if (existing && existing.state !== 'RESOLVED' && existing.state !== 'CLOSED') {
        existing.occurrenceCount += 1;
        existing.detectedAt = now;
        existing.lastSeenTimestamp = now;
        detected.push(existing);
      } else {
        const incident: UpgradedIncidentRecord = {
          incidentId: `inc-cadence-${Date.now()}`,
          fingerprint,
          sessionId,
          category: 'render_cadence_drop',
          classification: 'cadence_pipeline_stall',
          severity,
          severityScore,
          state: 'ACTION_REQUIRED',
          title: `Render Loop Pacing Degraded (~${fps} FPS)`,
          detectedAt: now,
          lastSeenTimestamp: now,
          resolvedAt: null,
          telemetryEvidence: {
            fps,
            frameDurationMs: avgDelta,
            droppedFramesCount: droppedFrames,
          },
          diagnosticExplanation:
            'Frame rate dropped below comfort target. May induce visual disorientation in immersive WebXR sessions.',
          recommendedAction:
            'Profile Three.js shader passes and throttle non-essential dynamic scene lighting.',
          automatedRecoverySteps: [
            'Reduce particle count and dynamic crystal refractions',
            'Throttle background AI diagnostic intervals to 10s',
          ],
          correlatedIncidentIds: [],
          notesHistory: [],
          resolutionNotes: null,
          resolvedBy: null,
          rule2ComplianceVerified: true,
          occurrenceCount: 1,
        };
        this.incidents.set(fingerprint, incident);
        detected.push(incident);
      }
    }

    // 4. Rule #2 Environmental Illumination Inconclusive Check
    const assessment = assessEnvironmentalCausation(telemetry.causationEvidence);
    if (telemetry.lightingPreset && assessment.causationStatus !== 'CONFIRMED') {
      const fingerprint = `inc-env-rule2-${sessionId}`;
      if (!this.incidents.has(fingerprint)) {
        const incident: UpgradedIncidentRecord = {
          incidentId: `inc-env-${Date.now()}`,
          fingerprint,
          sessionId,
          category: 'environmental_inconclusive',
          classification: 'environmental_inconclusive',
          severity: 'INFO',
          severityScore: 10,
          state: 'RESOLVED',
          title: 'Rule #2 Environmental Lighting Non-Attribution Enforced',
          detectedAt: now,
          lastSeenTimestamp: now,
          resolvedAt: now,
          telemetryEvidence: {
            lightingPreset: telemetry.lightingPreset,
            hardwareTokenValidated: false,
          },
          diagnosticExplanation:
            'Mandatory Rule #2 active: Room illumination is treated as contextual metadata and cannot be blamed for tracking loss without validated hardware tokens.',
          recommendedAction: 'Maintain room illumination classification as strictly INCONCLUSIVE.',
          automatedRecoverySteps: ['None required. Rule #2 compliance automatically verified.'],
          correlatedIncidentIds: [],
          notesHistory: [],
          resolutionNotes: 'Automatically verified compliant with Rule #2.',
          resolvedBy: 'Rule2DeterministicValidator',
          rule2ComplianceVerified: true,
          occurrenceCount: 1,
        };
        this.incidents.set(fingerprint, incident);
        detected.push(incident);
      }
    }

    // Correlate co-occurring incidents in this session
    this.correlateSessionIncidents(sessionId);

    this.notify();
    return detected;
  }

  /**
   * Correlates incidents sharing the same session or temporal window.
   */
  private correlateSessionIncidents(sessionId: string): void {
    const sessionIncidents = Array.from(this.incidents.values()).filter(
      (i) => i.sessionId === sessionId
    );
    const ids = sessionIncidents.map((i) => i.incidentId);

    sessionIncidents.forEach((inc) => {
      inc.correlatedIncidentIds = ids.filter((id) => id !== inc.incidentId);
    });
  }

  /**
   * Updates lifecycle state and records operator notes.
   */
  public updateIncidentState(
    incidentId: string,
    state: IncidentLifecycleState | 'New' | 'Investigating' | 'Mitigated' | 'Resolved' | 'Ignored',
    notes?: string,
    resolvedBy = 'QA Engineer'
  ): boolean {
    const incident = Array.from(this.incidents.values()).find((i) => i.incidentId === incidentId);
    if (!incident) return false;

    // Normalize lifecycle state
    let targetState: IncidentLifecycleState = 'INVESTIGATING';
    if (state === 'ACTION_REQUIRED' || state === 'New') targetState = 'ACTION_REQUIRED';
    else if (state === 'INVESTIGATING' || state === 'Investigating') targetState = 'INVESTIGATING';
    else if (state === 'RESOLVED' || state === 'Resolved' || state === 'Mitigated') targetState = 'RESOLVED';
    else if (state === 'CLOSED' || state === 'Ignored') targetState = 'CLOSED';

    incident.state = targetState;
    const now = new Date().toISOString();

    if (notes) {
      incident.notesHistory = incident.notesHistory || [];
      incident.notesHistory.push({
        timestamp: now,
        author: resolvedBy,
        note: notes,
      });
    }

    if (targetState === 'RESOLVED' || targetState === 'CLOSED') {
      incident.resolvedAt = now;
      incident.resolutionNotes = notes || incident.resolutionNotes || 'Incident resolved.';
      incident.resolvedBy = resolvedBy;
      const detectedMs = new Date(incident.detectedAt).getTime();
      const resolvedMs = new Date(now).getTime();
      incident.resolutionDurationSeconds = Math.max(1, Math.round((resolvedMs - detectedMs) / 1000));
    }

    this.notify();
    return true;
  }

  /**
   * Records an explicit operator intervention on an incident.
   */
  public recordOperatorIntervention(incidentId: string, operatorName: string, note: string): boolean {
    const incident = Array.from(this.incidents.values()).find((i) => i.incidentId === incidentId);
    if (!incident) return false;

    incident.assignedOperator = operatorName;
    incident.notesHistory = incident.notesHistory || [];
    incident.notesHistory.push({
      timestamp: new Date().toISOString(),
      author: operatorName,
      note,
    });

    this.notify();
    return true;
  }

  /**
   * Directly records a structured incident with custom parameters.
   */
  public recordIncident(params: {
    category: IncidentCategory;
    severity: IncidentSeverity;
    description: string;
    recommendedAction: string;
    rule2ComplianceVerified?: boolean;
  }): UpgradedIncidentRecord {
    const now = new Date().toISOString();
    const id = `inc-sensor-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const incident: UpgradedIncidentRecord = {
      incidentId: id,
      fingerprint: id,
      sessionId: 'session-sensor',
      category: params.category,
      classification: 'critical_tracking_blackout',
      severity: params.severity,
      severityScore: params.severity === 'CRITICAL' ? 95 : 75,
      state: 'ACTION_REQUIRED',
      title: params.description,
      detectedAt: now,
      lastSeenTimestamp: now,
      resolvedAt: null,
      telemetryEvidence: {},
      diagnosticExplanation: params.description,
      recommendedAction: params.recommendedAction,
      automatedRecoverySteps: ['Review optical sensors', 'Apply failsafe reality mode'],
      correlatedIncidentIds: [],
      notesHistory: [],
      resolutionNotes: null,
      resolvedBy: null,
      rule2ComplianceVerified: params.rule2ComplianceVerified ?? true,
      occurrenceCount: 1,
    };
    this.incidents.set(id, incident);
    this.notify();
    return incident;
  }

  /**
   * Calculates comprehensive incident lifecycle analytics.
   */
  public getLifecycleAnalytics(): IncidentLifecycleAnalytics {
    const all = this.getAllIncidents();
    const resolved = all.filter((i) => i.resolvedAt !== null);

    let totalDurationSec = 0;
    resolved.forEach((r) => {
      if (r.resolutionDurationSeconds) {
        totalDurationSec += r.resolutionDurationSeconds;
      }
    });

    const bySeverity: Record<string, number> = {};
    const byClassification: Record<string, number> = {};

    all.forEach((i) => {
      bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
      const c = i.classification || 'unknown';
      byClassification[c] = (byClassification[c] || 0) + 1;
    });

    return {
      totalIncidents: all.length,
      activeCount: this.getActiveIncidents().length,
      resolvedCount: resolved.length,
      meanTimeToResolutionSeconds: resolved.length > 0 ? Math.round(totalDurationSec / resolved.length) : 0,
      bySeverity,
      byClassification,
    };
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const list = Array.from(this.incidents.values()).slice(-50);
        localStorage.setItem('PRISM_INCIDENTS_STORE_V1', JSON.stringify(list));
      }
    } catch {
      // Storage unavailable
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('PRISM_INCIDENTS_STORE_V1');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            parsed.forEach((inc: UpgradedIncidentRecord) => {
              this.incidents.set(inc.fingerprint || inc.incidentId, inc);
            });
          }
        }
      }
    } catch {
      this.incidents.clear();
    }
  }
}
