/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Adaptive Strategy Optimizer (Phase 26)
 * Formulates and compares competing operational and tactical execution strategies.
 * Evaluates trade-offs across resource efficiency, safety margin, success probability,
 * latency budgets, and active incidents. Enforces human operator authorization gates
 * for high-risk and critical-impact operational modes.
 */

import {
  OperationalStrategyOption,
  StrategyConstraint,
  StrategyOptimizationResult,
} from '../types/phase26';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import { HumanApprovalManager } from './HumanApprovalManager';
import { commandAuditService } from '../services/CommandAuditService';

export class AdaptiveStrategyOptimizer {
  private static instance: AdaptiveStrategyOptimizer | null = null;
  private history: StrategyOptimizationResult[] = [];

  private defaultConstraints: StrategyConstraint = {
    maxLatencyMs: 20.0,
    minFrameRateFps: 72.0,
    maxCpuUtilizationPercent: 80.0,
    maxPowerBudgetWatts: 15.0,
    requiredTrackingConfidence: 0.85,
  };

  private constructor() {}

  public static getInstance(): AdaptiveStrategyOptimizer {
    if (!AdaptiveStrategyOptimizer.instance) {
      AdaptiveStrategyOptimizer.instance = new AdaptiveStrategyOptimizer();
    }
    return AdaptiveStrategyOptimizer.instance;
  }

  public static resetInstance(): void {
    AdaptiveStrategyOptimizer.instance = null;
  }

  /**
   * Evaluates available operational strategies against active telemetry, constraints,
   * and incidents to recommend an optimal policy.
   */
  public evaluateAndOptimizeStrategies(
    telemetry?: VRTelemetry,
    customConstraints?: Partial<StrategyConstraint>,
    activeIncidents?: IncidentRecord[]
  ): StrategyOptimizationResult {
    const constraints: StrategyConstraint = {
      ...this.defaultConstraints,
      ...customConstraints,
    };

    // Calculate current telemetry pressure
    let currentFps = 72;
    let currentLatency = 14;
    let jointOcclusionRate = 0.05;

    if (telemetry && telemetry.frames.length > 0) {
      const avgDuration =
        telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / telemetry.frames.length;
      currentFps = avgDuration > 0 ? 1000 / avgDuration : 72;
    }
    if (telemetry && telemetry.latencySamples.length > 0) {
      currentLatency =
        telemetry.latencySamples.reduce((a, s) => a + s.latencyMs, 0) /
        telemetry.latencySamples.length;
    }
    if (telemetry && telemetry.joints.length > 0) {
      const occluded = telemetry.joints.filter((j) => !j.tracked).length;
      jointOcclusionRate = occluded / telemetry.joints.length;
    }

    const hasCriticalIncidents = (activeIncidents || []).some(
      (inc) => inc.state !== 'RESOLVED' && inc.state !== 'CLOSED' && inc.severity === 'CRITICAL'
    );

    // Strategy 1: CONSERVATIVE_FAILSAFE
    const strategyFailsafe: OperationalStrategyOption = {
      strategyId: 'strat_failsafe_01',
      name: 'Conservative Failsafe & Pose Clamping',
      description: 'Caps rendering resolution to 0.8x, forces 72Hz cadence, and clamps joint velocities to prevent divergence.',
      executionMode: 'CONSERVATIVE_FAILSAFE',
      resourceEfficiencyScore: 94,
      safetyMarginScore: 98,
      expectedSuccessProbability: 95,
      estimatedCompletionTimeMs: 450,
      riskRating: 'LOW',
      tradeoffs: ['Visual acuity reduced by 20%', 'Max interaction speed capped'],
      requiresOperatorApproval: false,
    };

    // Strategy 2: BALANCED_NOMINAL
    const strategyBalanced: OperationalStrategyOption = {
      strategyId: 'strat_balanced_02',
      name: 'Adaptive Dynamic Resolution Nominal',
      description: 'Dynamically scales viewport resolution between 0.85x and 1.1x while running Kalman-filtered spatial tracking.',
      executionMode: 'BALANCED_NOMINAL',
      resourceEfficiencyScore: 82,
      safetyMarginScore: 85,
      expectedSuccessProbability: 91,
      estimatedCompletionTimeMs: 250,
      riskRating: 'LOW',
      tradeoffs: ['Slight resolution adjustments during sudden head movements'],
      requiresOperatorApproval: false,
    };

    // Strategy 3: MAX_PERFORMANCE
    const strategyMaxPerf: OperationalStrategyOption = {
      strategyId: 'strat_maxperf_03',
      name: 'Uncapped High-Fidelity Ray-Tracing',
      description: 'Bypasses resolution throttling to render at native 120Hz with full spatial physics and multi-agent coordination.',
      executionMode: 'MAX_PERFORMANCE',
      resourceEfficiencyScore: 42,
      safetyMarginScore: 52,
      expectedSuccessProbability: currentLatency > 18 ? 62 : 84,
      estimatedCompletionTimeMs: 120,
      riskRating: 'HIGH',
      tradeoffs: ['High thermal dissipation', 'Increased risk of frame dropping under heavy geometry'],
      requiresOperatorApproval: true, // HIGH risk requires human approval
    };

    // Strategy 4: RESOURCE_PRESERVATION
    const strategyEco: OperationalStrategyOption = {
      strategyId: 'strat_resource_04',
      name: 'Eco-Sensing Power Throttling',
      description: 'Reduces headset power draw by throttling tracking polling to 30Hz and running asynchronous time-warp.',
      executionMode: 'RESOURCE_PRESERVATION',
      resourceEfficiencyScore: 98,
      safetyMarginScore: 78,
      expectedSuccessProbability: 80,
      estimatedCompletionTimeMs: 600,
      riskRating: 'MODERATE',
      tradeoffs: ['Higher motion jitter during rapid head turns', 'Reduced tracking fidelity'],
      requiresOperatorApproval: false,
    };

    const evaluatedStrategies = [strategyFailsafe, strategyBalanced, strategyMaxPerf, strategyEco];

    // Compute composite score for each
    const scored = evaluatedStrategies.map((strat) => {
      let weightSafety = 0.4;
      let weightEfficiency = 0.3;
      let weightSuccess = 0.3;

      if (hasCriticalIncidents || currentFps < constraints.minFrameRateFps) {
        weightSafety = 0.6;
        weightEfficiency = 0.2;
        weightSuccess = 0.2;
      }

      const score =
        strat.safetyMarginScore * weightSafety +
        strat.resourceEfficiencyScore * weightEfficiency +
        strat.expectedSuccessProbability * weightSuccess;

      return { strat, score };
    });

    // Sort descending by score
    scored.sort((a, b) => b.score - a.score);

    const winner = scored[0].strat;
    const compositeScore = Math.round(scored[0].score);

    let rationale = `Strategy "${winner.name}" selected as optimal with composite utility score of ${compositeScore}/100. `;
    if (hasCriticalIncidents) {
      rationale += 'Safety weighting prioritized due to active critical incidents in system telemetry.';
    } else if (currentFps < constraints.minFrameRateFps) {
      rationale += `Frame rate degradation detected (${currentFps.toFixed(1)} FPS vs ${constraints.minFrameRateFps} FPS threshold). Prioritizing safety margin.`;
    } else {
      rationale += 'Nominal operating conditions permit balanced resource and performance optimization.';
    }

    let approvalRequestId: string | undefined;
    let approvalStatus: StrategyOptimizationResult['approvalStatus'] = 'NOT_REQUIRED';

    // Gate high-risk strategy if selected
    if (winner.requiresOperatorApproval || winner.riskRating === 'HIGH' || winner.riskRating === 'CRITICAL') {
      const approvalManager = HumanApprovalManager.getInstance();
      const req = approvalManager.createApprovalRequest({
        commandId: `strat_cmd_${winner.strategyId}_${Date.now()}`,
        commandName: winner.name,
        actionSummary: winner.description,
        initiator: 'AUTONOMOUS_OPERATIONS_MANAGER',
        targetModule: 'AdaptiveStrategyOptimizer',
        impactLevel: winner.riskRating === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        justification: `Deploying strategy "${winner.name}" involves ${winner.riskRating.toLowerCase()} operational risk.`,
        riskAssessmentSummary: `Tradeoffs: ${winner.tradeoffs.join(', ')}`,
      });
      approvalRequestId = req.approvalId;
      approvalStatus = 'PENDING';
    }

    const result: StrategyOptimizationResult = {
      evaluationId: `strat_eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      activeConstraints: constraints,
      evaluatedStrategies,
      recommendedStrategyId: winner.strategyId,
      optimizationRationale: rationale,
      compositeScore,
      approvalRequestId,
      approvalStatus,
    };

    this.history.unshift(result);
    if (this.history.length > 50) {
      this.history.pop();
    }

    commandAuditService.recordEntry({
      eventType: 'COMMAND_DISPATCHED',
      actor: 'AUTONOMOUS_OPERATIONS_MANAGER',
      impactLevel: 'LOW',
      commandId: `strat_opt_${winner.strategyId}`,
      details: `Recommended: ${winner.name} (Score: ${compositeScore}). Gated: ${approvalStatus}`,
    });

    return result;
  }

  public getHistory(): StrategyOptimizationResult[] {
    return [...this.history];
  }

  public getLatestResult(): StrategyOptimizationResult | null {
    return this.history[0] || null;
  }
}
