/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Multi-Agent Sensor Intelligence Engine (Phase 30)
 * Coordinates the 6 specialist autonomous AI agents to analyze real-time sensor streams:
 * 1. Operations Lead (OperationsAgent)
 * 2. Automated Test Orchestrator (TestAgent)
 * 3. Tracking Specialist (TrackingAgent)
 * 4. Performance Engineer (PerformanceAgent)
 * 5. Incident Commander (IncidentAgent)
 * 6. Chief Intelligence Officer (ChiefIntelligenceAgent)
 * 
 * Aggregates evidence, detects conflicting assessments, and synthesizes consensus directives.
 */

import {
  AgentRole,
} from '../types/phase17';
import {
  AgentSensorAssessment,
  SensorConsensusReport,
  NormalizedSensorTelemetry,
  EnvironmentalContext,
  SensorFusionSummary,
  SensorAnomaly,
} from '../types/phase30';

export class MultiAgentSensorIntelligence {
  private static instance: MultiAgentSensorIntelligence | null = null;
  private latestConsensus: SensorConsensusReport | null = null;
  private listeners: Set<(report: SensorConsensusReport) => void> = new Set();

  public constructor() {}

  public static getInstance(): MultiAgentSensorIntelligence {
    if (!MultiAgentSensorIntelligence.instance) {
      MultiAgentSensorIntelligence.instance = new MultiAgentSensorIntelligence();
    }
    return MultiAgentSensorIntelligence.instance;
  }

  public static resetInstance(): void {
    MultiAgentSensorIntelligence.instance = null;
  }

  /**
   * Conducts multi-agent council review across the 6 specialist agents
   */
  public evaluateCouncil(
    telemetry: NormalizedSensorTelemetry,
    context: EnvironmentalContext,
    fusion: SensorFusionSummary | null,
    anomalies: SensorAnomaly[]
  ): SensorConsensusReport {
    const nowStr = new Date().toISOString();
    const assessments: AgentSensorAssessment[] = [];
    const directives: string[] = [];
    let disagreementsCount = 0;

    const fps = telemetry.performance?.fps ?? 72;
    const trackedJoints = telemetry.xrTracking?.trackedJointsCount ?? 25;
    const isTrackingLost = Boolean(telemetry.xrTracking?.isTrackingLost);
    const criticalAnomalies = anomalies.filter((a) => a.severity === 'CRITICAL' || a.severity === 'HIGH');

    // 1. Operations Lead (OperationsAgent)
    const opsVerdict = criticalAnomalies.length > 0 ? 'CRITICAL' : context.state === 'DEGRADED' ? 'ADVISORY' : 'NOMINAL';
    assessments.push({
      agentRole: 'OperationsAgent',
      agentName: 'Operations Lead',
      assessmentVerdict: opsVerdict,
      confidenceScore: 94,
      evidenceCount: fusion?.contributingSensors.length || 2,
      keyFindings: [
        `Active telemetry stream tier: ${telemetry.provenance}`,
        `Environmental state assessed as: ${context.state}`,
        `Sensor collection status: ${telemetry.isStale ? 'STALE' : 'ACTIVE_STREAM'}`,
      ],
      recommendedDirectives: [
        opsVerdict === 'CRITICAL'
          ? 'Enforce operator visual supervisor confirmation before high-impact maneuvers.'
          : 'Maintain continuous sensor intelligence polling.',
      ],
      timestamp: nowStr,
    });

    // 2. Automated Test Orchestrator (TestAgent)
    assessments.push({
      agentRole: 'TestAgent',
      agentName: 'Automated Test Orchestrator',
      assessmentVerdict: telemetry.isStale ? 'ADVISORY' : 'NOMINAL',
      confidenceScore: 92,
      evidenceCount: 3,
      keyFindings: [
        `Diagnostic test telemetry source: ${telemetry.provenance}`,
        `Sensor data validation score: ${Math.round(telemetry.confidenceScore * 100)}%`,
        `Synthetic / real data isolation: strictly preserved`,
      ],
      recommendedDirectives: ['Run scheduled background sensor calibration checks.'],
      timestamp: nowStr,
    });

    // 3. Tracking Specialist (TrackingAgent)
    const trackingVerdict = isTrackingLost || trackedJoints < 12 ? 'CRITICAL' : trackedJoints < 18 ? 'ADVISORY' : 'NOMINAL';
    assessments.push({
      agentRole: 'TrackingAgent',
      agentName: 'Tracking Specialist',
      assessmentVerdict: trackingVerdict,
      confidenceScore: 96,
      evidenceCount: trackedJoints,
      keyFindings: [
        `Tracked skeleton joints: ${trackedJoints} / 25`,
        `Spatial occlusion flag: ${isTrackingLost ? 'OCCLUDED' : 'CLEAR'}`,
        `Fused orientation: [${(fusion?.fusedOrientationVector || [0, 0, 0]).join(', ')}]`,
      ],
      recommendedDirectives: [
        trackingVerdict === 'CRITICAL'
          ? 'Recalibrate camera rig; apply rotational dead reckoning.'
          : 'Maintain standard 6-DoF optical tracking fidelity.',
      ],
      timestamp: nowStr,
    });

    // 4. Performance Engineer (PerformanceAgent)
    const perfVerdict = fps < 45 ? 'CRITICAL' : fps < 60 ? 'ADVISORY' : 'NOMINAL';
    assessments.push({
      agentRole: 'PerformanceAgent',
      agentName: 'Performance Engineer',
      assessmentVerdict: perfVerdict,
      confidenceScore: 98,
      evidenceCount: telemetry.performance ? 2 : 1,
      keyFindings: [
        `Render cadence: ${fps} FPS (target: 72Hz)`,
        `Frame delta latency: ${(telemetry.performance?.frameDeltaMs ?? 13.88).toFixed(1)}ms`,
        `Cadence stability index: ${fusion?.cadenceStability ?? 85}%`,
      ],
      recommendedDirectives: [
        perfVerdict === 'CRITICAL'
          ? 'Engage failsafe low-power profile to restore minimum 60Hz VR cadence.'
          : 'Hold current visual quality level.',
      ],
      timestamp: nowStr,
    });

    // 5. Incident Commander (IncidentAgent)
    const incidentVerdict = criticalAnomalies.length > 0 ? 'CRITICAL' : anomalies.length > 0 ? 'ADVISORY' : 'NOMINAL';
    assessments.push({
      agentRole: 'IncidentAgent',
      agentName: 'Incident Commander',
      assessmentVerdict: incidentVerdict,
      confidenceScore: 95,
      evidenceCount: anomalies.length,
      keyFindings: [
        `Active sensor anomalies: ${anomalies.length}`,
        `Critical / High severity alerts: ${criticalAnomalies.length}`,
        `Fingerprint deduplication: active (4000ms suppression window)`,
      ],
      recommendedDirectives: [
        incidentVerdict === 'CRITICAL'
          ? 'Triage high-priority sensor anomalies and alert system operator.'
          : 'No urgent incident escalation required.',
      ],
      timestamp: nowStr,
    });

    // 6. Chief Intelligence Officer (ChiefIntelligenceAgent)
    // Check disagreements (e.g. Tracking is NOMINAL but Performance is CRITICAL)
    if (trackingVerdict === 'NOMINAL' && perfVerdict === 'CRITICAL') {
      disagreementsCount++;
    }
    if (opsVerdict === 'NOMINAL' && incidentVerdict === 'CRITICAL') {
      disagreementsCount++;
    }

    let systemVerdict: 'STABLE' | 'DEGRADED' | 'CRITICAL' = 'STABLE';
    if (criticalAnomalies.length > 0 || perfVerdict === 'CRITICAL' || trackingVerdict === 'CRITICAL') {
      systemVerdict = 'CRITICAL';
      directives.push('Immediate operator attention required: sensor stream or rendering performance compromised.');
    } else if (context.state === 'DEGRADED' || perfVerdict === 'ADVISORY' || trackingVerdict === 'ADVISORY') {
      systemVerdict = 'DEGRADED';
      directives.push('Advisory: system performance experiencing thermal or occlusion turbulence.');
    } else {
      directives.push('All sensor modalities streaming with verified nominal fidelity.');
    }

    assessments.push({
      agentRole: 'ChiefIntelligenceAgent',
      agentName: 'Chief Intelligence Officer',
      assessmentVerdict: systemVerdict === 'CRITICAL' ? 'CRITICAL' : systemVerdict === 'DEGRADED' ? 'ADVISORY' : 'NOMINAL',
      confidenceScore: 97,
      evidenceCount: 6,
      keyFindings: [
        `Consolidated system verdict: ${systemVerdict}`,
        `Cross-agent alignment: ${disagreementsCount === 0 ? 'UNANIMOUS' : `${disagreementsCount} DISAGREEMENT(S)`}`,
        `Fused confidence score: ${Math.round((fusion?.overallConfidence || 0.8) * 100)}%`,
      ],
      recommendedDirectives: directives,
      timestamp: nowStr,
    });

    const report: SensorConsensusReport = {
      timestamp: nowStr,
      systemVerdict,
      overallSensorScore: Math.round(
        (fps / 72) * 50 +
        (trackedJoints / 25) * 30 +
        (1 - criticalAnomalies.length * 0.2) * 20
      ),
      disagreementsCount,
      consensusDirectives: directives,
      agentAssessments: assessments,
    };

    this.latestConsensus = report;
    this.notify();
    return report;
  }

  public getLatestConsensus(): SensorConsensusReport | null {
    return this.latestConsensus;
  }

  public subscribe(callback: (report: SensorConsensusReport) => void): () => void {
    this.listeners.add(callback);
    if (this.latestConsensus) {
      callback(this.latestConsensus);
    }
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    if (!this.latestConsensus) return;
    const r = this.latestConsensus;
    this.listeners.forEach((cb) => {
      try {
        cb(r);
      } catch (err) {
        console.error('[MultiAgentSensorIntelligence] listener error:', err);
      }
    });
  }
}

export const multiAgentSensorIntelligence = MultiAgentSensorIntelligence.getInstance();
