/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Cross-Phase Knowledge Integrator (Phase 26)
 * Integrates verified technical knowledge, dependencies, and operational models
 * across Phases 1 through 25. Detects cross-phase contradictions, maps component
 * interactions, correlates historical incident patterns, and provides mediation.
 */

import {
  CrossPhaseKnowledgeState,
  CrossPhaseModuleDependency,
  CrossPhaseConflict,
  IncidentCorrelationRecord,
} from '../types/phase26';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import { commandAuditService } from '../services/CommandAuditService';

export class CrossPhaseKnowledgeIntegrator {
  private static instance: CrossPhaseKnowledgeIntegrator | null = null;
  private conflicts: Map<string, CrossPhaseConflict> = new Map();
  private dependencies: CrossPhaseModuleDependency[] = [];
  private correlatedIncidents: IncidentCorrelationRecord[] = [];

  private constructor() {
    this.initializeModuleDependencies();
    this.initializeIncidentCorrelations();
  }

  public static getInstance(): CrossPhaseKnowledgeIntegrator {
    if (!CrossPhaseKnowledgeIntegrator.instance) {
      CrossPhaseKnowledgeIntegrator.instance = new CrossPhaseKnowledgeIntegrator();
    }
    return CrossPhaseKnowledgeIntegrator.instance;
  }

  public static resetInstance(): void {
    CrossPhaseKnowledgeIntegrator.instance = null;
  }

  private initializeModuleDependencies(): void {
    this.dependencies = [
      {
        sourceModule: 'DiagnosticsEngine (P1-16)',
        targetModule: 'IncidentManager (P17)',
        interactionType: 'DATA_STREAM',
        healthStatus: 'HEALTHY',
        lastSynchronizedAt: new Date().toISOString(),
      },
      {
        sourceModule: 'IncidentManager (P17)',
        targetModule: 'SelfHealingEngine (P19)',
        interactionType: 'SUPERVISORY',
        healthStatus: 'HEALTHY',
        lastSynchronizedAt: new Date().toISOString(),
      },
      {
        sourceModule: 'SelfHealingEngine (P19)',
        targetModule: 'CollectiveIntelligenceEngine (P20)',
        interactionType: 'STATE_SYNC',
        healthStatus: 'HEALTHY',
        lastSynchronizedAt: new Date().toISOString(),
      },
      {
        sourceModule: 'DigitalTwinEngine (P21)',
        targetModule: 'MissionIntelligence (P22)',
        interactionType: 'DATA_STREAM',
        healthStatus: 'HEALTHY',
        lastSynchronizedAt: new Date().toISOString(),
      },
      {
        sourceModule: 'UnifiedCommandCenter (P23)',
        targetModule: 'AutonomousWorkflowOrchestrator (P24)',
        interactionType: 'SUPERVISORY',
        healthStatus: 'HEALTHY',
        lastSynchronizedAt: new Date().toISOString(),
      },
      {
        sourceModule: 'CognitiveReasoningEngine (P25)',
        targetModule: 'MetaReasoningEngine (P26)',
        interactionType: 'AUDIT_LOG',
        healthStatus: 'HEALTHY',
        lastSynchronizedAt: new Date().toISOString(),
      },
      {
        sourceModule: 'HumanApprovalManager (P23-25)',
        targetModule: 'CommandAuditService (P23)',
        interactionType: 'AUDIT_LOG',
        healthStatus: 'HEALTHY',
        lastSynchronizedAt: new Date().toISOString(),
      },
    ];
  }

  private initializeIncidentCorrelations(): void {
    this.correlatedIncidents = [
      {
        incidentId: 'INC_CORR_CADENCE_JITTER',
        phaseIntroduced: 'Phase 17 (Live Diagnostics)',
        telemetrySignatures: ['frameDurationMs > 16.66ms', 'droppedFrames > 2'],
        impactedComponents: ['WebXR Render Pipeline', 'Spatial Visual Presentation'],
        resolutionOutcome: 'Engage Dynamic Resolution Scaling and Flush GPU buffer',
        recurrenceProbability: 0.18,
      },
      {
        incidentId: 'INC_CORR_OPTICAL_OCCLUSION',
        phaseIntroduced: 'Phase 19 (Autonomous Recovery)',
        telemetrySignatures: ['jointConfidence < 0.50', 'occludedJointCount >= 4'],
        impactedComponents: ['Joint Tracking Model', 'Inverse Kinematics Solver'],
        resolutionOutcome: 'Switch to Kalman Temporal Smoothing Pose Filter',
        recurrenceProbability: 0.24,
      },
      {
        incidentId: 'INC_CORR_PHOTOMETRIC_DEGRADATION',
        phaseIntroduced: 'Phase 21 (Digital Twin Environment)',
        telemetrySignatures: ['ambientLux < 15.0', 'opticalFeatureCount < 100'],
        impactedComponents: ['Inside-out SLAM Core', 'Spatial Anchor Registry'],
        resolutionOutcome: 'Trigger HIGH_CONTRAST Lighting Preset Fallback',
        recurrenceProbability: 0.12,
      },
    ];
  }

  /**
   * Scans cross-phase states and active telemetry/incidents to detect conflicts.
   */
  public auditCrossPhaseConsistency(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[],
    isPhysicalVRActive: boolean = false
  ): CrossPhaseKnowledgeState {
    const detectedConflicts: CrossPhaseConflict[] = [];

    // Conflict Check 1: Hardware Execution vs Offline Physical State
    if (!isPhysicalVRActive && telemetry && telemetry.sessionId.includes('physical_live')) {
      const conflictId = `conflict_hw_offline_${Date.now()}`;
      detectedConflicts.push({
        conflictId,
        detectedAt: new Date().toISOString(),
        phaseA: 'Phase 21 (Digital Twin Simulation)',
        phaseB: 'Phase 17 (Physical Hardware Telemetry)',
        natureOfConflict: 'Physical live session claimed while physical VR hardware is inactive/disconnected.',
        severity: 'HIGH',
        status: 'ACTIVE',
        suggestedMediation: 'Reclassify telemetry feed as SIMULATED or prompt operator to connect WebXR headset.',
      });
    }

    // Conflict Check 2: Unresolved Critical Incident vs High-Load Mission
    const unresolvedCritical = (activeIncidents || []).filter(
      (inc) => inc.state !== 'RESOLVED' && inc.state !== 'CLOSED' && inc.severity === 'CRITICAL'
    );
    if (unresolvedCritical.length > 0) {
      const conflictId = `conflict_critical_unresolved_${Date.now()}`;
      detectedConflicts.push({
        conflictId,
        detectedAt: new Date().toISOString(),
        phaseA: 'Phase 17 (Incident Management)',
        phaseB: 'Phase 22 (Autonomous Mission Operations)',
        natureOfConflict: `${unresolvedCritical.length} unresolved critical incident(s) open while autonomous operations engine is armed.`,
        severity: 'CRITICAL',
        status: 'ACTIVE',
        suggestedMediation: 'Halt non-essential mission queues until incident root cause is remediated.',
      });
    }

    // Conflict Check 3: Lighting Divergence between Twin and Hardware
    if (telemetry && telemetry.lightingPreset === 'low_light' && telemetry.frames.some((f) => (f.frameDurationMs ?? 0) > 25)) {
      const conflictId = `conflict_lux_cadence_${Date.now()}`;
      detectedConflicts.push({
        conflictId,
        detectedAt: new Date().toISOString(),
        phaseA: 'Phase 21 (Environmental Twin)',
        phaseB: 'Phase 19 (Self-Healing Recovery)',
        natureOfConflict: 'Night environment with low lux causing severe frame latency spikes.',
        severity: 'MEDIUM',
        status: 'ACTIVE',
        suggestedMediation: 'Apply dynamic exposure compensation and boost internal ambient illumination.',
      });
    }

    // Update internal conflict map
    for (const conf of detectedConflicts) {
      this.conflicts.set(conf.conflictId, conf);
    }

    const activeList = Array.from(this.conflicts.values()).filter((c) => c.status === 'ACTIVE');
    const resolvedCount = Array.from(this.conflicts.values()).filter((c) => c.status === 'RESOLVED').length;

    const penalty = activeList.reduce((acc, c) => {
      if (c.severity === 'CRITICAL') return acc + 25;
      if (c.severity === 'HIGH') return acc + 15;
      if (c.severity === 'MEDIUM') return acc + 8;
      return acc + 3;
    }, 0);

    const knowledgeIntegrityScore = Math.max(20, 100 - penalty);

    if (activeList.some((c) => c.severity === 'CRITICAL')) {
      commandAuditService.recordEntry({
        eventType: 'COMMAND_DISPATCHED',
        actor: 'AUTONOMOUS_OPERATIONS_MANAGER',
        impactLevel: 'HIGH',
        commandId: `conflict_alert_${Date.now()}`,
        details: `Detected ${activeList.length} active cross-phase conflict(s). Knowledge integrity: ${knowledgeIntegrityScore}%`,
      });
    }

    return {
      totalMappedModules: this.dependencies.length + 5,
      activeDependencies: [...this.dependencies],
      activeConflicts: activeList,
      resolvedConflictsCount: resolvedCount,
      correlatedIncidents: [...this.correlatedIncidents],
      knowledgeIntegrityScore,
      lastIndexedAt: new Date().toISOString(),
    };
  }

  public resolveConflict(conflictId: string, mediationNote: string): boolean {
    const conflict = this.conflicts.get(conflictId);
    if (!conflict) return false;

    conflict.status = 'RESOLVED';
    conflict.resolutionTimestamp = new Date().toISOString();
    conflict.suggestedMediation = `Resolved: ${mediationNote}`;

    commandAuditService.recordEntry({
      eventType: 'OPERATOR_OVERRIDE',
      actor: 'OPERATOR',
      impactLevel: 'LOW',
      commandId: conflictId,
      details: `Conflict ${conflictId} marked resolved. Note: ${mediationNote}`,
    });

    return true;
  }

  public getKnowledgeState(): CrossPhaseKnowledgeState {
    return this.auditCrossPhaseConsistency();
  }
}
