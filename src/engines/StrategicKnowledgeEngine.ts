/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strategic Knowledge & Memory Engine (Phase 27)
 * Bridges strategic mission planning with historical operational knowledge,
 * cross-phase architecture patterns (Phases 17-26), and active telemetry memory.
 * Performs rigorous Outdated Assumption Audits to identify obsolete operational
 * heuristics and prevents recurring systemic blind spots.
 */

import {
  StrategicKnowledgeAssociation,
  OutdatedAssumptionAudit,
} from '../types/phase27';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';

export class StrategicKnowledgeEngine {
  private static instance: StrategicKnowledgeEngine | null = null;
  private associations: StrategicKnowledgeAssociation[] = [];

  private constructor() {
    this.associations = this.initializeDefaultAssociations();
  }

  public static getInstance(): StrategicKnowledgeEngine {
    if (!StrategicKnowledgeEngine.instance) {
      StrategicKnowledgeEngine.instance = new StrategicKnowledgeEngine();
    }
    return StrategicKnowledgeEngine.instance;
  }

  public static resetInstance(): void {
    StrategicKnowledgeEngine.instance = null;
  }

  private initializeDefaultAssociations(): StrategicKnowledgeAssociation[] {
    return [
      {
        id: 'assoc-cadence-thermal',
        topic: 'Cadence vs Thermal Dissipation Equilibrium',
        objectiveId: 'obj-imm-telemetry',
        historicalIncidentRefs: ['INC-THROTTLE-001', 'INC-FRAME-DROP-042'],
        relatedPhases: [17, 19, 21, 26],
        verifiedAxioms: [
          'Render loops under 14ms maintain sub-perceptual vestibular latency.',
          'Passive mobile VR chassis can dissipate up to 14W continuous before throttling.',
          'Rule #2 inconclusive fallback prevents false certainty during intermittent occlusion.',
        ],
        outdatedAssumptions: [
          {
            id: 'audit-assump-01',
            assumption: '90Hz render loop is always achievable without active thermal headroom penalties.',
            initialContext: 'Early desktop prototype testing in Phase 17.',
            invalidatedReason: 'Extended run telemetry proved thermal throttling occurs after 35 minutes on untethered hardware.',
            flaggedAt: new Date(Date.now() - 48 * 3600000).toISOString(),
            severity: 'HIGH',
            status: 'RESOLVED',
          },
        ],
        provenance: 'PHYSICAL_HARDWARE',
        lastVerifiedAt: new Date().toISOString(),
      },
      {
        id: 'assoc-multi-agent-consensus',
        topic: 'Multi-Agent Collective Decision Bounds',
        objectiveId: 'obj-med-adaptive-autonomy',
        historicalIncidentRefs: ['INC-AGENT-DEADLOCK-009'],
        relatedPhases: [20, 23, 25, 26],
        verifiedAxioms: [
          'Agent specialization improves anomaly discovery rate across discrete operational vectors.',
          'Autonomous commands with impact level HIGH or CRITICAL must be gated by HumanApprovalManager.',
          'Audit trail hashes must remain verifiable across both local storage and cloud sync.',
        ],
        outdatedAssumptions: [
          {
            id: 'audit-assump-02',
            assumption: 'Majority voting without confidence weighting is sufficient for autonomous consensus.',
            initialContext: 'Collective Intelligence engine prototype in Phase 20.',
            invalidatedReason: 'Domain specialist agents (e.g. TrackingAgent) were being out-voted on kinematics problems by non-specialist agents.',
            flaggedAt: new Date(Date.now() - 24 * 3600000).toISOString(),
            severity: 'HIGH',
            status: 'RESOLVED',
          },
        ],
        provenance: 'OPERATOR_DIRECTIVE',
        lastVerifiedAt: new Date().toISOString(),
      },
      {
        id: 'assoc-digital-twin-fidelity',
        topic: 'Digital Twin Differential Kinematics Fidelity',
        objectiveId: 'obj-short-twin-sync',
        historicalIncidentRefs: ['INC-TWIN-DRIFT-013'],
        relatedPhases: [21, 25, 26],
        verifiedAxioms: [
          'Forward kinematics simulation must strictly mark all synthetic predictions with isSimulatedData: true.',
          'Sensor fusion between IMU accelerometer and optical camera arrays prevents dead-reckoning divergence.',
        ],
        outdatedAssumptions: [
          {
            id: 'audit-assump-03',
            assumption: 'Synthetic forward kinematics can extrapolate occluded joints indefinitely without ground-truth drift.',
            initialContext: 'Digital Twin Core rollout in Phase 21.',
            invalidatedReason: 'Error margins compounded exponentially beyond 200ms of optical occlusion.',
            flaggedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
            severity: 'MEDIUM',
            status: 'REQUIRES_REVISION',
          },
        ],
        provenance: 'SIMULATED_TWIN',
        lastVerifiedAt: new Date().toISOString(),
      },
    ];
  }

  /**
   * Audits assumptions against current telemetry conditions
   */
  public auditOperationalAssumptions(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[]
  ): OutdatedAssumptionAudit[] {
    const allAudits: OutdatedAssumptionAudit[] = [];
    this.associations.forEach((assoc) => {
      allAudits.push(...assoc.outdatedAssumptions);
    });

    // Check if new assumption invalidations should be generated
    if (telemetry) {
      if (telemetry.frames.length > 0) {
        const avg =
          telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / telemetry.frames.length;
        const fps = avg > 0 ? 1000 / avg : 72;
        if (fps < 50) {
          const exists = allAudits.some((a) => a.assumption.includes('Cadence drops below 50'));
          if (!exists) {
            const newAudit: OutdatedAssumptionAudit = {
              id: `audit-assump-dyn-${Date.now()}`,
              assumption: 'Ambient lighting and thermal cooling guarantee minimum 60 FPS hold.',
              initialContext: 'Operational benchmark baseline.',
              invalidatedReason: `Observed frame cadence plunged to ${fps.toFixed(1)} FPS during current session.`,
              flaggedAt: new Date().toISOString(),
              severity: 'HIGH',
              status: 'REQUIRES_REVISION',
            };
            this.associations[0].outdatedAssumptions.push(newAudit);
            allAudits.push(newAudit);
          }
        }
      }
    }

    return allAudits;
  }

  public getAssociations(): StrategicKnowledgeAssociation[] {
    return [...this.associations];
  }

  public addAssociation(association: StrategicKnowledgeAssociation): void {
    this.associations.push(association);
  }
}

export const strategicKnowledgeEngine = StrategicKnowledgeEngine.getInstance();
