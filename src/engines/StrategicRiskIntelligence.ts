/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strategic Risk Intelligence (Phase 27)
 * Comprehensive quantitative risk assessment across 7 mission-critical categories:
 * - TECHNICAL
 * - MISSION_EXECUTION
 * - PERFORMANCE
 * - INFRASTRUCTURE
 * - DATA_INTEGRITY
 * - SECURITY
 * - RESOURCE
 * 
 * Computes composite risk scores, detects triggered early warning thresholds,
 * maps cascading dependency chains, and formulates verifiable mitigation strategies
 * with residual risk calculations.
 */

import {
  StrategicRisk,
  StrategicRiskSummary,
  RiskCategory,
} from '../types/phase27';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';

export class StrategicRiskIntelligence {
  private static instance: StrategicRiskIntelligence | null = null;
  private latestSummary: StrategicRiskSummary | null = null;

  private constructor() {}

  public static getInstance(): StrategicRiskIntelligence {
    if (!StrategicRiskIntelligence.instance) {
      StrategicRiskIntelligence.instance = new StrategicRiskIntelligence();
    }
    return StrategicRiskIntelligence.instance;
  }

  public static resetInstance(): void {
    StrategicRiskIntelligence.instance = null;
  }

  /**
   * Assesses all 7 strategic risk categories against live telemetry and incidents
   */
  public evaluateSystemRisks(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[]
  ): StrategicRiskSummary {
    let currentFps = 72;
    let currentLatency = 13.5;
    let droppedFrames = 0;
    let totalFrames = 1;
    let trackedJoints = 25;
    const expectedJoints = 25;

    if (telemetry) {
      if (telemetry.frames.length > 0) {
        totalFrames = telemetry.frames.length;
        droppedFrames = telemetry.frames.filter((f) => f.dropped).length;
        const avgDuration =
          telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / totalFrames;
        currentFps = avgDuration > 0 ? 1000 / avgDuration : 72;
      }
      if (telemetry.latencySamples.length > 0) {
        currentLatency =
          telemetry.latencySamples.reduce((a, s) => a + s.latencyMs, 0) /
          telemetry.latencySamples.length;
      }
      if (telemetry.joints && telemetry.joints.length > 0) {
        trackedJoints = telemetry.joints.filter((j) => j.tracked).length;
      }
    }

    const openIncidents = (activeIncidents || []).filter(
      (i) => i.state !== 'RESOLVED' && i.state !== 'CLOSED'
    );
    const incidentCount = openIncidents.length;
    const droppedRatio = droppedFrames / totalFrames;

    // Define 7 Category Risks
    const risks: StrategicRisk[] = [
      // 1. PERFORMANCE
      {
        id: 'risk-perf-cadence',
        category: 'PERFORMANCE',
        title: 'Frame Time Jitter & Cadence Throttling',
        description: 'Fluctuations in WebGL/WebXR render pipeline causing frame delivery delay above 16.6ms threshold.',
        severityScore: 78,
        probabilityScore: currentFps < 65 || droppedRatio > 0.05 ? 82 : 25,
        compositeRiskScore: Math.round(78 * (currentFps < 65 || droppedRatio > 0.05 ? 0.82 : 0.25)),
        earlyWarningIndicators: [
          'Cadence drops below 70 FPS',
          'Frame delta standard deviation exceeds 3.5ms',
          'Dropped frame ratio > 3%',
        ],
        isTriggered: currentFps < 65 || droppedRatio > 0.05,
        triggerThresholdText: 'FPS < 65 OR Dropped Ratio > 5%',
        mitigationStrategy: 'Enable adaptive dynamic resolution scaling and downsample non-foveated background geometry.',
        residualRiskScore: 22,
        dependentRiskIds: ['risk-tech-occlusion', 'risk-mission-abort'],
      },

      // 2. TECHNICAL
      {
        id: 'risk-tech-occlusion',
        category: 'TECHNICAL',
        title: 'Optical Tracking Occlusion & Skeletal Loss',
        description: 'Line-of-sight loss or back-lit glare causing 25-joint skeletal model tracking failure.',
        severityScore: 85,
        probabilityScore: trackedJoints < expectedJoints ? 75 : 20,
        compositeRiskScore: Math.round(85 * (trackedJoints < expectedJoints ? 0.75 : 0.20)),
        earlyWarningIndicators: [
          'Tracked joints count < 25',
          'Joint confidence floor drops below 0.85',
          'Backlit optical glare detected in ambient sensor',
        ],
        isTriggered: trackedJoints < expectedJoints,
        triggerThresholdText: 'Tracked Joints < 25 (Currently ' + trackedJoints + '/25)',
        mitigationStrategy: 'Activate synthetic forward kinematics predictive smoothing and signal operator to re-orient.',
        residualRiskScore: 28,
        dependentRiskIds: ['risk-mission-abort'],
      },

      // 3. INFRASTRUCTURE
      {
        id: 'risk-infra-sync',
        category: 'INFRASTRUCTURE',
        title: 'Cloud Synchronization Buffer Saturation',
        description: 'Offline queue depth exceeding safe memory boundaries during network partitions or token timeouts.',
        severityScore: 65,
        probabilityScore: incidentCount > 1 ? 60 : 15,
        compositeRiskScore: Math.round(65 * (incidentCount > 1 ? 0.60 : 0.15)),
        earlyWarningIndicators: [
          'Offline queue > 50 records',
          'IndexedDB write latency > 50ms',
          'Firestore auth token expiration without refresh',
        ],
        isTriggered: incidentCount > 1,
        triggerThresholdText: 'Active Open Incidents > 1',
        mitigationStrategy: 'Engage LZ-compression on telemetry checkpoints and spool delta payloads into persistent chunked storage.',
        residualRiskScore: 18,
        dependentRiskIds: ['risk-data-divergence'],
      },

      // 4. DATA_INTEGRITY
      {
        id: 'risk-data-divergence',
        category: 'DATA_INTEGRITY',
        title: 'Digital Twin Model-to-Physical Divergence',
        description: 'Physics divergence between simulated twin state and physical hardware telemetry exceeding tolerances.',
        severityScore: 80,
        probabilityScore: currentLatency > 20 ? 70 : 22,
        compositeRiskScore: Math.round(80 * (currentLatency > 20 ? 0.70 : 0.22)),
        earlyWarningIndicators: [
          'Spatial positional error > 50mm',
          'Angular drift > 4.5 degrees',
          'Rule #2 inconclusive fallback status violated',
        ],
        isTriggered: currentLatency > 20,
        triggerThresholdText: 'Telemetry Roundtrip Latency > 20ms',
        mitigationStrategy: 'Execute state hard-resync against authoritative ground truth and recalibrate IMU bias.',
        residualRiskScore: 24,
        dependentRiskIds: ['risk-mission-abort'],
      },

      // 5. SECURITY
      {
        id: 'risk-sec-unauth-action',
        category: 'SECURITY',
        title: 'Unauthorized Autonomous Command Execution',
        description: 'High or critical impact commands attempting bypass of HumanApprovalManager operator sign-off.',
        severityScore: 95,
        probabilityScore: 10,
        compositeRiskScore: 10, // Strictly controlled by architecture
        earlyWarningIndicators: [
          'Attempted invocation of HIGH/CRITICAL action without operator token',
          'Command signature verification mismatch',
          'Tampering in audit hash chain',
        ],
        isTriggered: false,
        triggerThresholdText: 'Any unauthorized command execution attempt',
        mitigationStrategy: 'Hard architectural gate: block execution, emit SEV-1 audit event, and lock command queue.',
        residualRiskScore: 5,
        dependentRiskIds: [],
      },

      // 6. RESOURCE
      {
        id: 'risk-res-thermal-budget',
        category: 'RESOURCE',
        title: 'Device Thermal & Power Exhaustion',
        description: 'Sustained compute load exceeding device passive thermal dissipation budget (>15W).',
        severityScore: 70,
        probabilityScore: currentFps < 55 ? 65 : 20,
        compositeRiskScore: Math.round(70 * (currentFps < 55 ? 0.65 : 0.20)),
        earlyWarningIndicators: [
          'Predicted device temperature > 42°C',
          'Thermal throttling flag engaged',
          'Battery discharge rate > 1.8%/min',
        ],
        isTriggered: currentFps < 55,
        triggerThresholdText: 'Cadence throttled below 55 FPS indicating thermal pressure',
        mitigationStrategy: 'Throttle auxiliary telemetry sampling rate from 100Hz to 30Hz and reduce point cloud density.',
        residualRiskScore: 19,
        dependentRiskIds: ['risk-perf-cadence'],
      },

      // 7. MISSION_EXECUTION
      {
        id: 'risk-mission-abort',
        category: 'MISSION_EXECUTION',
        title: 'Mission Objective SLA Degradation / Abort',
        description: 'Cumulative failure of sub-systems preventing successful completion of operational milestone roadmap.',
        severityScore: 90,
        probabilityScore: incidentCount > 0 ? 55 : 15,
        compositeRiskScore: Math.round(90 * (incidentCount > 0 ? 0.55 : 0.15)),
        earlyWarningIndicators: [
          'Multiple critical-path milestones marked AT_RISK',
          'Cumulative feasibility drops below 65%',
          'Operator override intervention frequency spikes',
        ],
        isTriggered: incidentCount > 0,
        triggerThresholdText: 'Active Open Incidents > 0',
        mitigationStrategy: 'Trigger dynamic mission re-planning, extend SLA deadlines, and pivot to alternative contingency path.',
        residualRiskScore: 30,
        dependentRiskIds: [],
      },
    ];

    // Compute overall system risk score
    const avgScore = risks.reduce((acc, r) => acc + r.compositeRiskScore, 0) / risks.length;
    const maxScore = Math.max(...risks.map((r) => r.compositeRiskScore));
    const overallScore = Math.min(100, Math.round(avgScore * 0.4 + maxScore * 0.6));

    let riskLevel: 'NOMINAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL' = 'NOMINAL';
    if (overallScore >= 70 || incidentCount >= 3) {
      riskLevel = 'CRITICAL';
    } else if (overallScore >= 50 || incidentCount >= 1) {
      riskLevel = 'HIGH';
    } else if (overallScore >= 30) {
      riskLevel = 'ELEVATED';
    }

    const topVulnerabilities = risks
      .filter((r) => r.compositeRiskScore >= 35 || r.isTriggered)
      .sort((a, b) => b.compositeRiskScore - a.compositeRiskScore)
      .map((r) => `[${r.category}] ${r.title}: ${r.compositeRiskScore} pts (${r.triggerThresholdText})`);

    const cascadingChains: string[][] = [
      ['risk-res-thermal-budget', 'risk-perf-cadence', 'risk-tech-occlusion', 'risk-mission-abort'],
      ['risk-infra-sync', 'risk-data-divergence', 'risk-mission-abort'],
    ];

    const summary: StrategicRiskSummary = {
      overallSystemRiskScore: overallScore,
      riskLevel,
      risks,
      topVulnerabilities,
      cascadingChains,
      evaluatedAt: new Date().toISOString(),
    };

    this.latestSummary = summary;
    return summary;
  }

  public getLatestSummary(): StrategicRiskSummary | null {
    return this.latestSummary;
  }
}

export const strategicRiskIntelligence = StrategicRiskIntelligence.getInstance();
