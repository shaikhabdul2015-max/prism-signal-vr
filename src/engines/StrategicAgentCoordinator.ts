/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strategic Agent Coordinator (Phase 27)
 * Orchestrates strategic consensus among the 6 specialist AI agents:
 * 1. OperationsAgent - Execution continuity, mission milestones, hardware stability.
 * 2. TestAgent - Validation rigour, edge case verification, synthetic scenario coverage.
 * 3. TrackingAgent - 25-joint skeleton fidelity, optical occlusion filtering, forward kinematics.
 * 4. PerformanceAgent - Render latency, cadence (FPS), thermal limits, memory boundaries.
 * 5. IncidentAgent - Root cause containment, failure isolation, SLA breach alerts.
 * 6. ChiefIntelligenceAgent - Executive alignment, cross-phase strategic synthesis.
 * 
 * Analyzes strategic perspectives, identifies operational disagreements,
 * computes the consensus index, and routes unresolved disputes to HumanApprovalManager.
 */

import {
  AgentStrategicPosition,
  DisagreementRecord,
  StrategicAgentCoordinationResult,
  AgentStance,
} from '../types/phase27';
import { AgentRole } from '../types/phase17';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';

export class StrategicAgentCoordinator {
  private static instance: StrategicAgentCoordinator | null = null;
  private latestResult: StrategicAgentCoordinationResult | null = null;

  private constructor() {}

  public static getInstance(): StrategicAgentCoordinator {
    if (!StrategicAgentCoordinator.instance) {
      StrategicAgentCoordinator.instance = new StrategicAgentCoordinator();
    }
    return StrategicAgentCoordinator.instance;
  }

  public static resetInstance(): void {
    StrategicAgentCoordinator.instance = null;
  }

  /**
   * Evaluates strategic stances of all 6 specialist agents and calculates consensus
   */
  public coordinateStrategicAlignment(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[]
  ): StrategicAgentCoordinationResult {
    let currentFps = 72;
    let currentLatency = 13.5;
    let trackedJoints = 25;

    if (telemetry) {
      if (telemetry.frames.length > 0) {
        const avg =
          telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / telemetry.frames.length;
        currentFps = avg > 0 ? 1000 / avg : 72;
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
    const incidentPressure = openIncidents.length;

    // Stances for each agent
    const positions: AgentStrategicPosition[] = [];

    // 1. OperationsAgent
    const opsStance: AgentStance = incidentPressure > 0 ? 'CAUTION' : 'CONCUR';
    positions.push({
      agentRole: 'OperationsAgent',
      agentName: 'Operations Director Agent',
      priorityFocus: 'Mission SLA Continuity & Milestone Adherence',
      confidenceScore: incidentPressure > 0 ? 78 : 94,
      recommendedStrategicDirection: incidentPressure > 0 
        ? 'Isolate incident-prone pipeline stages and extend immediate milestone timelines.'
        : 'Maintain nominal 72Hz operational loop and advance medium-term objectives.',
      stance: opsStance,
      rationale: `Operating with ${incidentPressure} active incidents. Hardware telemetry reflects ${currentFps.toFixed(0)} FPS.`,
    });

    // 2. TestAgent
    const testStance: AgentStance = currentLatency > 18 ? 'CAUTION' : 'CONCUR';
    positions.push({
      agentRole: 'TestAgent',
      agentName: 'Validation & Stress Agent',
      priorityFocus: 'Verification Rigour & Counterfactual Scenario Coverage',
      confidenceScore: 88,
      recommendedStrategicDirection: 'Schedule synthetic jitter stress tests and verify Rule #2 inconclusive boundaries.',
      stance: testStance,
      rationale: `Latency sample variance is ${currentLatency.toFixed(1)}ms. Edge-case test queue requires periodic exercise.`,
    });

    // 3. TrackingAgent
    const trackStance: AgentStance = trackedJoints < 25 ? 'DIVERGENT' : 'CONCUR';
    positions.push({
      agentRole: 'TrackingAgent',
      agentName: 'Spatial Kinematics Agent',
      priorityFocus: '25-Joint Skeleton Fidelity & Forward Kinematics',
      confidenceScore: trackedJoints < 25 ? 65 : 96,
      recommendedStrategicDirection: trackedJoints < 25
        ? 'DIVERGENT: Prioritize sensor re-acquisition over high cadence; engage joint predictive interpolation.'
        : 'Lock continuous 25-joint optical tracking filter.',
      stance: trackStance,
      rationale: `Current joint lock: ${trackedJoints}/25 joints. Occlusion risks require immediate stabilization.`,
    });

    // 4. PerformanceAgent
    const perfStance: AgentStance = currentFps < 60 ? 'DIVERGENT' : currentLatency > 20 ? 'CAUTION' : 'CONCUR';
    positions.push({
      agentRole: 'PerformanceAgent',
      agentName: 'Resource & Cadence Agent',
      priorityFocus: 'Thermal Dissipation, Framerate & Latency Budgets',
      confidenceScore: currentFps < 60 ? 70 : 92,
      recommendedStrategicDirection: currentFps < 60
        ? 'DIVERGENT: Enforce thermal throttling clamp and downscale render passes to protect device headroom.'
        : 'Cadence stable within 14ms frame window; sustain balanced profile.',
      stance: perfStance,
      rationale: `Frame cadence: ${currentFps.toFixed(0)} FPS. Latency: ${currentLatency.toFixed(1)}ms.`,
    });

    // 5. IncidentAgent
    const incStance: AgentStance = incidentPressure >= 2 ? 'DIVERGENT' : incidentPressure === 1 ? 'CAUTION' : 'CONCUR';
    positions.push({
      agentRole: 'IncidentAgent',
      agentName: 'Anomaly & Resilience Agent',
      priorityFocus: 'Failure Containment & Autonomous Self-Healing',
      confidenceScore: incidentPressure > 0 ? 82 : 98,
      recommendedStrategicDirection: incidentPressure > 0
        ? 'Halt execution of non-critical milestone tasks until active incidents are mitigated.'
        : 'Zero active anomalies; green flag for strategic progression.',
      stance: incStance,
      rationale: `${incidentPressure} unmitigated incidents currently recorded in operational memory.`,
    });

    // 6. ChiefIntelligenceAgent
    const chiefStance: AgentStance = 'CONCUR';
    positions.push({
      agentRole: 'ChiefIntelligenceAgent',
      agentName: 'Chief Strategic Intelligence Agent',
      priorityFocus: 'Strategic Synthesis & Long-Term Mission Optimization',
      confidenceScore: 90,
      recommendedStrategicDirection: 'Synthesize multi-agent vectors into unified adaptive operational directive.',
      stance: chiefStance,
      rationale: 'Harmonizing operational throughput with safety constraints across all 6 specialized domains.',
    });

    // Detect Disagreements
    const activeDisagreements: DisagreementRecord[] = [];

    // Conflict A: Performance vs Tracking / Operations
    if (perfStance === 'DIVERGENT' || trackStance === 'DIVERGENT') {
      activeDisagreements.push({
        id: 'disagree-perf-track-01',
        issue: 'Thermal Cadence Clamping vs Spatial Tracking Resolution',
        agentPositions: [
          {
            agentRole: 'PerformanceAgent',
            agentName: 'Resource & Cadence Agent',
            position: 'Downsample render passes and cap refresh rate to protect thermal envelope.',
            stance: perfStance,
          },
          {
            agentRole: 'TrackingAgent',
            agentName: 'Spatial Kinematics Agent',
            position: 'Maintain highest sensor frequency to avoid losing 25-joint skeleton lock.',
            stance: trackStance,
          },
        ],
        consensusResolutionProposal: 'Decouple tracking sensor polling rate (90Hz) from display render rate (60Hz) using synthetic interpolation.',
        requiresHumanIntervention: currentFps < 50 && trackedJoints < 20,
      });
    }

    // Conflict B: Incident Agent vs Operations
    if (incStance === 'DIVERGENT') {
      activeDisagreements.push({
        id: 'disagree-inc-ops-02',
        issue: 'Milestone Execution Pace vs Incident Quarantining',
        agentPositions: [
          {
            agentRole: 'IncidentAgent',
            agentName: 'Anomaly & Resilience Agent',
            position: 'Pause milestone advancement to quarantine and resolve detected anomalies.',
            stance: incStance,
          },
          {
            agentRole: 'OperationsAgent',
            agentName: 'Operations Director Agent',
            position: 'Maintain mission timeline with fallback redundancy.',
            stance: opsStance,
          },
        ],
        consensusResolutionProposal: 'Quarantine affected sub-modules while routing unaffected milestones through secondary execution pipeline.',
        requiresHumanIntervention: incidentPressure >= 3,
      });
    }

    // Consensus Index Calculation
    const concurCount = positions.filter((p) => p.stance === 'CONCUR').length;
    const cautionCount = positions.filter((p) => p.stance === 'CAUTION').length;
    const divergentCount = positions.filter((p) => p.stance === 'DIVERGENT').length;

    // Weighted consensus formula
    const rawConsensus = ((concurCount * 1.0 + cautionCount * 0.6 + divergentCount * 0.1) / positions.length) * 100;
    const consensusIndex = Math.round(rawConsensus);

    const humanApprovalRequired = consensusIndex < 70 || activeDisagreements.some((d) => d.requiresHumanIntervention);

    let overallStrategicDirection = 'Sustain nominal multi-horizon mission trajectory with standard telemetry monitoring.';
    if (divergentCount > 0) {
      overallStrategicDirection = 'Re-balance operational priorities: mediate performance and tracking trade-offs under operator supervision.';
    } else if (cautionCount > 1) {
      overallStrategicDirection = 'Proceed with heightened monitoring: enforce early warning triggers across telemetry jitter buffers.';
    }

    const result: StrategicAgentCoordinationResult = {
      timestamp: new Date().toISOString(),
      agentPositions: positions,
      consensusIndex,
      overallStrategicDirection,
      activeDisagreements,
      humanApprovalRequired,
    };

    this.latestResult = result;
    return result;
  }

  public getLatestResult(): StrategicAgentCoordinationResult | null {
    return this.latestResult;
  }
}

export const strategicAgentCoordinator = StrategicAgentCoordinator.getInstance();
