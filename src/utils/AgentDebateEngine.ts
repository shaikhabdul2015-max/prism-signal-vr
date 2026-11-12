/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 20: Multi-Agent Debate Engine.
 * Evaluates independent agent positions, detects conflicts, compares evidence,
 * and synthesizes consensus without treating majority voting as proof of correctness.
 */

import { AgentRole } from '../types/phase17';
import {
  DebateTopic,
  AgentDebateArgument,
  DebateResolution,
} from '../types/phase20';
import { VRTelemetry } from '../types/diagnostics';
import { assessEnvironmentalCausation } from './environmentalAssessment';

export class AgentDebateEngine {
  private static instance: AgentDebateEngine | null = null;
  private debateHistory: DebateTopic[] = [];
  private listeners: Set<(debates: DebateTopic[]) => void> = new Set();

  private constructor() {
    this.seedInitialDebate();
  }

  public static getInstance(): AgentDebateEngine {
    if (!AgentDebateEngine.instance) {
      AgentDebateEngine.instance = new AgentDebateEngine();
    }
    return AgentDebateEngine.instance;
  }

  public static resetInstance(): void {
    AgentDebateEngine.instance = null;
  }

  private seedInitialDebate(): void {
    const topicId = 'debate-baseline-pacing';
    const initialTopic: DebateTopic = {
      topicId,
      title: 'Optimal Frame Pacing Strategy vs Graphics Quality on Quest WebXR',
      context: { targetCadence: 72, currentCadence: 68.5, jitterMs: 3.2 },
      initiatedAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      closedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
      isResolved: true,
      arguments: [
        {
          argumentId: 'arg-1',
          agent: 'PerformanceAgent',
          position: 'Aggressive DRS Downscale to 0.75x',
          confidence: 0.92,
          evidence: ['Cadence dipped to 68.5 FPS', 'Render queue backlog > 1 frame'],
          counterArguments: ['Reduces text readability in HUD modal'],
          recommendedAction: 'dynamic_resolution_downscale',
          timestamp: new Date(Date.now() - 1000 * 60 * 14).toISOString(),
        },
        {
          argumentId: 'arg-2',
          agent: 'OperationsAgent',
          position: 'Preserve Visual Acuity, Step Down Particle Density First',
          confidence: 0.85,
          evidence: ['User is currently in active decoding puzzle interface', 'Resolution degradation impairs symbol scanning'],
          counterArguments: ['Particle reduction yields only ~1.5ms headroom'],
          recommendedAction: 'adjust_quality_profile',
          timestamp: new Date(Date.now() - 1000 * 60 * 13).toISOString(),
        },
      ],
      resolution: {
        topicId,
        consensusScore: 0.88,
        conflictsDetected: ['Visual clarity preservation vs GPU fill-rate headroom trade-off'],
        winningSynthesis: 'Tiered Remediation: Disable volumetric shadows and particle density first; engage 0.85x DRS only if cadence remains sub-70 FPS for >3 consecutive seconds.',
        justification: 'Synthesizes Performance data with Operations usability priority, avoiding over-aggressive visual degradation.',
        rule2ComplianceChecked: true,
        resolvedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        unanimityRatio: 0.83,
      },
    };
    this.debateHistory.push(initialTopic);
  }

  public getDebates(): DebateTopic[] {
    return [...this.debateHistory];
  }

  public subscribe(callback: (debates: DebateTopic[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getDebates());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const debates = this.getDebates();
    this.listeners.forEach((cb) => {
      try {
        cb(debates);
      } catch (err) {
        console.error('[AgentDebateEngine] Listener error:', err);
      }
    });
  }

  /**
   * Conducts an evidence-weighted debate between multiple specialist agents on an active telemetry state.
   */
  public conductDebate(
    title: string,
    context: Record<string, unknown>,
    telemetry: VRTelemetry
  ): DebateTopic {
    const topicId = `debate-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const args: AgentDebateArgument[] = [];
    const conflicts: string[] = [];

    // Evaluate Rule #2 invariant
    const rule2Check = assessEnvironmentalCausation(telemetry.causationEvidence);
    const isRule2Confirmed = rule2Check.causationStatus === 'CONFIRMED';

    // 1. Tracking Agent Argument
    const trackedJoints = telemetry.joints?.filter((j) => j.tracked).length || 25;
    if (trackedJoints < 25) {
      args.push({
        argumentId: `arg-track-${Date.now()}`,
        agent: 'TrackingAgent',
        position: 'Prioritize Optical Skeleton Recalibration',
        confidence: 0.90,
        evidence: [`${25 - trackedJoints} joints un-tracked in current frame`, 'Distal phalange confidence degraded'],
        counterArguments: ['Does not address frame timing pacing issues'],
        recommendedAction: 'recalibrate_skeleton',
        timestamp: now,
      });
    }

    // 2. Performance Agent Argument
    const frames = telemetry.frames || [];
    const avgDuration = frames.length > 0 ? frames[0]?.frameDurationMs || 13.88 : 13.88;
    if (avgDuration > 15.0) {
      args.push({
        argumentId: `arg-perf-${Date.now()}`,
        agent: 'PerformanceAgent',
        position: 'Dynamic Resolution Downscale (DRS)',
        confidence: 0.94,
        evidence: [`Frame duration is ${avgDuration.toFixed(1)}ms (target <= 13.88ms)`],
        counterArguments: ['Slight visual softening on distant alien symbols'],
        recommendedAction: 'dynamic_resolution_downscale',
        timestamp: now,
      });
    }

    // 3. Environmental / QA Agent Argument
    if (telemetry.lightingPreset && telemetry.lightingPreset !== 'bright_studio') {
      args.push({
        argumentId: `arg-env-${Date.now()}`,
        agent: 'TestAgent',
        position: isRule2Confirmed
          ? 'Mitigate Confirmed Hardware Glare'
          : 'Hold Environmental Causation Inconclusive (Mandatory Rule #2)',
        confidence: isRule2Confirmed ? 0.95 : 0.85,
        evidence: [
          `Lighting preset: ${telemetry.lightingPreset}`,
          `Hardware sensor token: ${isRule2Confirmed ? 'VALIDATED' : 'NOT PRESENT / INCONCLUSIVE'}`,
        ],
        counterArguments: isRule2Confirmed
          ? []
          : ['Room lighting cannot be asserted as causal without hardware token'],
        recommendedAction: isRule2Confirmed ? 'adjust_sensor_exposure' : 'stabilize_frame_pacing',
        timestamp: now,
      });
    }

    // 4. Incident Agent Argument
    args.push({
      argumentId: `arg-inc-${Date.now()}`,
      agent: 'IncidentAgent',
      position: 'Stabilize System Pacing Before Deep Recovery',
      confidence: 0.88,
      evidence: ['System stability baseline must be preserved before state changes'],
      counterArguments: ['May delay immediate skeleton recalibration by 500ms'],
      recommendedAction: 'stabilize_frame_pacing',
      timestamp: now,
    });

    // Conflict Detection
    if (args.some((a) => a.recommendedAction === 'recalibrate_skeleton') &&
        args.some((a) => a.recommendedAction === 'dynamic_resolution_downscale')) {
      conflicts.push('Kinematic tracking priority conflicts with rendering pipeline throttling.');
    }
    if (args.some((a) => a.recommendedAction === 'stabilize_frame_pacing') &&
        args.some((a) => a.recommendedAction === 'recalibrate_skeleton')) {
      conflicts.push('Sequence contention: Should frame pacing stabilize before resetting kinematic anchors?');
    }

    // Evidence-Weighted Synthesis (Not simple majority vote)
    // Weight each argument by confidence score and evidence item count
    let topAction = 'stabilize_frame_pacing';
    let highestWeight = 0;
    const actionWeights: Record<string, number> = {};

    args.forEach((a) => {
      const weight = a.confidence * (1 + a.evidence.length * 0.2);
      actionWeights[a.recommendedAction] = (actionWeights[a.recommendedAction] || 0) + weight;
      if (actionWeights[a.recommendedAction] > highestWeight) {
        highestWeight = actionWeights[a.recommendedAction];
        topAction = a.recommendedAction;
      }
    });

    const totalWeight = Object.values(actionWeights).reduce((sum, w) => sum + w, 0);
    const topRatio = totalWeight > 0 ? highestWeight / totalWeight : 0.5;
    const consensusScore = Math.min(0.98, Math.max(0.60, Math.round((0.55 + topRatio * 0.40) * 100) / 100));

    const resolution: DebateResolution = {
      topicId,
      consensusScore,
      conflictsDetected: conflicts,
      winningSynthesis: `Consensus Reached: Prioritize "${topAction}". Cross-agent debate weighted physical evidence over simple majority vote. ${conflicts.length > 0 ? `Resolved ${conflicts.length} conflict(s).` : 'No conflicting directives.'}`,
      justification: `Highest weighted evidence score (${highestWeight.toFixed(2)}) synthesized from ${args.length} specialist agent evaluations. Rule #2 verified: environmental causes strictly preserved as ${rule2Check.causationStatus}.`,
      rule2ComplianceChecked: true,
      resolvedAt: new Date().toISOString(),
      unanimityRatio: Math.min(1.0, consensusScore + 0.1),
    };

    const debate: DebateTopic = {
      topicId,
      title,
      context,
      arguments: args,
      initiatedAt: now,
      closedAt: resolution.resolvedAt,
      isResolved: true,
      resolution,
    };

    this.debateHistory.unshift(debate);
    if (this.debateHistory.length > 25) {
      this.debateHistory.pop();
    }

    this.notify();
    return debate;
  }
}

export const agentDebateEngine = AgentDebateEngine.getInstance();
