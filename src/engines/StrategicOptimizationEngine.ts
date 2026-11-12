/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strategic Optimization & Trade-Off Engine (Phase 27)
 * Evaluates competing operational strategies across multiple competing vectors:
 * - Throughput & Cadence Performance
 * - Reliability Margin
 * - Safety & Vestibular Comfort Index
 * - Latency Budget Delta
 * - Power / Thermal Footprint
 * 
 * CRITICAL GOVERNANCE:
 * Enforces strict Human-in-the-Loop authorization gates via HumanApprovalManager
 * and immutable event logging via CommandAuditService for any HIGH or CRITICAL
 * impact operational transitions.
 */

import {
  StrategyTradeoffAnalysis,
  StrategyOptimizationReport,
} from '../types/phase27';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import { HumanApprovalManager } from './HumanApprovalManager';
import { commandAuditService } from '../services/CommandAuditService';

export class StrategicOptimizationEngine {
  private static instance: StrategicOptimizationEngine | null = null;
  private latestReport: StrategyOptimizationReport | null = null;

  private constructor() {}

  public static getInstance(): StrategicOptimizationEngine {
    if (!StrategicOptimizationEngine.instance) {
      StrategicOptimizationEngine.instance = new StrategicOptimizationEngine();
    }
    return StrategicOptimizationEngine.instance;
  }

  public static resetInstance(): void {
    StrategicOptimizationEngine.instance = null;
  }

  /**
   * Evaluates competing strategies and generates a comprehensive trade-off report.
   * If the winning strategy is HIGH or CRITICAL impact, gates execution behind HumanApprovalManager.
   */
  public evaluateStrategyTradeoffs(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[]
  ): StrategyOptimizationReport {
    let currentFps = 72;
    let currentLatency = 13.5;

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
    }

    const openIncidents = (activeIncidents || []).filter(
      (i) => i.state !== 'RESOLVED' && i.state !== 'CLOSED'
    );
    const incidentPressure = openIncidents.length;

    // Competing Strategies
    const strategies: StrategyTradeoffAnalysis[] = [
      // Strategy 1: BALANCED_NOMINAL
      {
        strategyId: 'strat-balanced-nominal',
        name: 'Balanced Dynamic Profile (72Hz)',
        description: 'Standard operational cadence with adaptive dynamic resolution and 25-joint continuous filtering.',
        performanceGainPercent: 0,
        reliabilityMarginPercent: 88,
        safetyIndexPercent: 94,
        latencyBudgetDeltaMs: 0,
        energyConsumptionWatts: 12.5,
        compositeScore: 89,
        isRecommended: incidentPressure === 0 && currentFps >= 68,
        impactLevel: 'LOW',
      },

      // Strategy 2: HIGH_THROUGHPUT_TURBO
      {
        strategyId: 'strat-turbo-90hz',
        name: 'High-Throughput Precision (90Hz)',
        description: 'Uncapped 90Hz render loop and multi-threaded forward kinematics for maximum spatial accuracy.',
        performanceGainPercent: 25,
        reliabilityMarginPercent: 72,
        safetyIndexPercent: 82,
        latencyBudgetDeltaMs: -3.5, // 3.5ms improvement
        energyConsumptionWatts: 16.8, // Exceeds passive thermal budget
        compositeScore: 81,
        isRecommended: false,
        impactLevel: 'HIGH',
      },

      // Strategy 3: RESILIENT_CONSERVATION
      {
        strategyId: 'strat-resilient-conservation',
        name: 'Resilient Thermal & Fault Conservation (60Hz)',
        description: 'Conservative 60Hz loop, aggressive occlusion interpolation, downscaled background point cloud.',
        performanceGainPercent: -15,
        reliabilityMarginPercent: 97,
        safetyIndexPercent: 98,
        latencyBudgetDeltaMs: +2.0,
        energyConsumptionWatts: 8.8,
        compositeScore: incidentPressure > 0 || currentFps < 65 ? 93 : 84,
        isRecommended: incidentPressure > 0 || currentFps < 65,
        impactLevel: 'MEDIUM',
      },

      // Strategy 4: ZERO_TOLERANCE_FAILSAFE
      {
        strategyId: 'strat-zero-tolerance-failsafe',
        name: 'Autonomous Failsafe Quarantining Mode',
        description: 'Isolates external cloud sync, forces physical sensor lock, and halts non-essential test scenarios.',
        performanceGainPercent: -35,
        reliabilityMarginPercent: 99,
        safetyIndexPercent: 99,
        latencyBudgetDeltaMs: +4.0,
        energyConsumptionWatts: 6.5,
        compositeScore: incidentPressure >= 3 ? 96 : 70,
        isRecommended: incidentPressure >= 3,
        impactLevel: 'CRITICAL',
      },
    ];

    // Determine recommended strategy
    let recommended = strategies.find((s) => s.isRecommended);
    if (!recommended) {
      recommended = strategies[0];
      recommended.isRecommended = true;
    }

    // Sort so recommended is at top of decision matrix
    const sortedStrategies = strategies.map((s) => ({
      ...s,
      isRecommended: s.strategyId === recommended!.strategyId,
    }));

    let humanApprovalId: string | undefined = undefined;
    let humanApproved = true;

    // Check if operator approval is required for the recommended strategy
    if (recommended.impactLevel === 'HIGH' || recommended.impactLevel === 'CRITICAL') {
      const approvalMgr = HumanApprovalManager.getInstance();
      const existingReq = approvalMgr
        .getPendingRequests()
        .find((r) => r.commandId === recommended!.strategyId);

      if (existingReq) {
        humanApprovalId = existingReq.approvalId;
        humanApproved = existingReq.status === 'APPROVED';
      } else {
        const req = approvalMgr.createApprovalRequest({
          commandId: recommended.strategyId,
          commandName: `Engage Strategy: ${recommended.name}`,
          actionSummary: recommended.description,
          initiator: 'ChiefIntelligenceAgent',
          targetModule: 'SystemRuntimeScheduler',
          impactLevel: recommended.impactLevel,
          justification: `Optimal trade-off chosen under current telemetry stress (FPS: ${currentFps.toFixed(0)}, Incidents: ${incidentPressure}).`,
          riskAssessmentSummary: `Safety: ${recommended.safetyIndexPercent}%, Reliability Margin: ${recommended.reliabilityMarginPercent}%, Power: ${recommended.energyConsumptionWatts}W.`,
        });
        humanApprovalId = req.approvalId;
        humanApproved = false;

        // Audit Trail entry
        commandAuditService.recordEntry({
          eventType: 'COMMAND_DISPATCHED',
          actor: 'ChiefIntelligenceAgent',
          impactLevel: recommended.impactLevel,
          commandId: recommended.strategyId,
          approvalId: req.approvalId,
          details: JSON.stringify({
            event: 'APPROVAL_REQUESTED',
            strategyName: recommended.name,
            compositeScore: recommended.compositeScore,
            incidentPressure,
          }),
        });
      }
    }

    const report: StrategyOptimizationReport = {
      id: `opt-rep-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      competingStrategies: sortedStrategies,
      recommendedStrategyId: recommended.strategyId,
      optimizationRationale: `Selected '${recommended.name}' as optimal trade-off with composite optimality score of ${recommended.compositeScore}/100.`,
      humanApprovalId,
      humanApproved,
      isSimulatedEvaluation: true,
    };

    this.latestReport = report;
    return report;
  }

  public getLatestReport(): StrategyOptimizationReport | null {
    return this.latestReport;
  }
}

export const strategicOptimizationEngine = StrategicOptimizationEngine.getInstance();
