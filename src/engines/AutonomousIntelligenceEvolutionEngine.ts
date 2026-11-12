/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Autonomous Intelligence Evolution Engine (Phase 34)
 * Orchestrates the 9-stage closed-loop evolution lifecycle:
 * OBSERVE -> ANALYZE -> IDENTIFY -> RECOMMEND -> VALIDATE -> REQUEST_APPROVAL -> APPLY -> MEASURE -> ROLLBACK
 * Enforces strict reversibility, controlled parameter application, and baseline measurement comparisons.
 */

import {
  EvolutionLifecycleStage,
  OptimizationRecommendation,
  SystemPerformanceSnapshot,
  OptimizationValidationReport,
  OptimizationRollbackRecord,
} from '../types/phase34';
import { SystemPerformanceIntelligence } from './SystemPerformanceIntelligence';
import { SelfOptimizationEngine } from './SelfOptimizationEngine';
import { AIModelEvaluationEngine } from './AIModelEvaluationEngine';
import { AdaptiveResourceManagementEngine } from './AdaptiveResourceManagementEngine';
import { OptimizationRecommendationEngine } from './OptimizationRecommendationEngine';
import { OptimizationValidationEngine } from './OptimizationValidationEngine';
import { OptimizationRollbackEngine } from './OptimizationRollbackEngine';
import { ContinuousLearningOrchestrator } from './ContinuousLearningOrchestrator';

export interface LifecycleStageTransitionEvent {
  fromStage: EvolutionLifecycleStage;
  toStage: EvolutionLifecycleStage;
  timestamp: string;
  contextMessage: string;
}

export class AutonomousIntelligenceEvolutionEngine {
  private static instance: AutonomousIntelligenceEvolutionEngine | null = null;
  private currentStage: EvolutionLifecycleStage = 'OBSERVE';
  private stageHistory: LifecycleStageTransitionEvent[] = [];
  private activeRecommendation: OptimizationRecommendation | null = null;
  private activeBaseline: SystemPerformanceSnapshot | null = null;
  private listeners: Set<(stage: EvolutionLifecycleStage) => void> = new Set();

  public constructor() {
    this.stageHistory.push({
      fromStage: 'OBSERVE',
      toStage: 'OBSERVE',
      timestamp: new Date().toISOString(),
      contextMessage: 'Evolution lifecycle engine initialized in OBSERVE state.',
    });
  }

  public static getInstance(): AutonomousIntelligenceEvolutionEngine {
    if (!AutonomousIntelligenceEvolutionEngine.instance) {
      AutonomousIntelligenceEvolutionEngine.instance = new AutonomousIntelligenceEvolutionEngine();
    }
    return AutonomousIntelligenceEvolutionEngine.instance;
  }

  public static resetInstance(): void {
    AutonomousIntelligenceEvolutionEngine.instance = null;
  }

  public getCurrentStage(): EvolutionLifecycleStage {
    return this.currentStage;
  }

  public getStageHistory(): LifecycleStageTransitionEvent[] {
    return [...this.stageHistory];
  }

  public getActiveRecommendation(): OptimizationRecommendation | null {
    return this.activeRecommendation;
  }

  /**
   * Advances the evolution lifecycle to the designated stage with context logging.
   */
  public transitionToStage(nextStage: EvolutionLifecycleStage, contextMessage: string): void {
    const fromStage = this.currentStage;
    this.currentStage = nextStage;
    this.stageHistory.push({
      fromStage,
      toStage: nextStage,
      timestamp: new Date().toISOString(),
      contextMessage,
    });
    this.listeners.forEach((fn) => fn(nextStage));
  }

  /**
   * Runs an end-to-end autonomous evolution observation and analysis cycle.
   */
  public runObservationCycle(): {
    stage: EvolutionLifecycleStage;
    snapshot: SystemPerformanceSnapshot;
    recommendationsCount: number;
  } {
    const perfEngine = SystemPerformanceIntelligence.getInstance();
    const resEngine = AdaptiveResourceManagementEngine.getInstance();
    const modelEngine = AIModelEvaluationEngine.getInstance();
    const recEngine = OptimizationRecommendationEngine.getInstance();
    const selfOpt = SelfOptimizationEngine.getInstance();

    // Stage 1: OBSERVE
    this.transitionToStage('OBSERVE', 'Ingesting real runtime telemetry and rendering metrics.');
    const snapshot = perfEngine.captureSnapshot();

    // Stage 2: ANALYZE
    this.transitionToStage('ANALYZE', 'Analyzing system throughput, latency thresholds, and model horizons.');
    const currentConfig = selfOpt.getCurrentConfig().parameters;
    const resourceProposals = resEngine.evaluateResourceNeeds(snapshot, currentConfig);
    const modelEvals = modelEngine.getAllEvaluations();

    // Stage 3: IDENTIFY
    this.transitionToStage('IDENTIFY', `Identified ${snapshot.activeBottlenecks.length} active bottlenecks.`);

    // Stage 4: RECOMMEND
    this.transitionToStage('RECOMMEND', 'Synthesizing evidence-based optimization recommendations.');
    const generated = recEngine.generateFromProposals(resourceProposals, modelEvals, snapshot);

    return {
      stage: this.currentStage,
      snapshot,
      recommendationsCount: recEngine.getAllRecommendations().length,
    };
  }

  /**
   * Initiates validation for a specific recommendation.
   */
  public validateRecommendation(recommendationId: string): OptimizationValidationReport {
    const recEngine = OptimizationRecommendationEngine.getInstance();
    const valEngine = OptimizationValidationEngine.getInstance();

    const rec = recEngine.getRecommendationById(recommendationId);
    if (!rec) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    this.transitionToStage('VALIDATE', `Conducting multi-point safety verification for "${rec.title}".`);
    recEngine.updateRecommendationStatus(recommendationId, 'VALIDATING');

    const report = valEngine.validateRecommendation(rec);
    if (report.overallValidationPassed) {
      recEngine.updateRecommendationStatus(recommendationId, 'PENDING_APPROVAL');
      this.transitionToStage('REQUEST_APPROVAL', `Recommendation "${rec.title}" passed validation. Awaiting operator approval.`);
    } else {
      recEngine.updateRecommendationStatus(recommendationId, 'REJECTED', {
        rejectionReason: 'Failed pre-application validation safety checks.',
      });
      this.transitionToStage('IDENTIFY', `Validation failed for "${rec.title}". Reverting to IDENTIFY stage.`);
    }

    return report;
  }

  /**
   * Applies an approved recommendation, capturing baseline and transitioning to MEASURE.
   */
  public applyApprovedOptimization(recommendationId: string, operatorId = 'OPERATOR-CHIEF-01'): {
    success: boolean;
    recommendation: OptimizationRecommendation;
    baseline: SystemPerformanceSnapshot;
  } {
    const recEngine = OptimizationRecommendationEngine.getInstance();
    const perfEngine = SystemPerformanceIntelligence.getInstance();
    const selfOpt = SelfOptimizationEngine.getInstance();

    const rec = recEngine.getRecommendationById(recommendationId);
    if (!rec) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    // Capture pre-optimization baseline
    const baseline = perfEngine.captureSnapshot();
    this.activeBaseline = baseline;
    this.activeRecommendation = rec;

    // Transition to APPLY
    this.transitionToStage('APPLY', `Applying configuration change for ${rec.targetConfigKey} approved by ${operatorId}.`);

    selfOpt.applyValidatedChange(rec.targetConfigKey, rec.proposedValue, `Optimization: ${rec.title}`);

    const updated = recEngine.updateRecommendationStatus(recommendationId, 'APPLIED', {
      approvedBy: operatorId,
      approvedAt: new Date().toISOString(),
      appliedAt: new Date().toISOString(),
      preOptimizationBaseline: baseline,
    })!;

    // Transition immediately to MEASURE
    this.transitionToStage('MEASURE', `Monitoring post-application stability for metric "${rec.rollbackThresholdMetric}".`);
    recEngine.updateRecommendationStatus(recommendationId, 'MEASURING');

    return {
      success: true,
      recommendation: updated,
      baseline,
    };
  }

  /**
   * Evaluates post-application measurement and confirms success or executes rollback.
   */
  public evaluateMeasurementOutcome(
    recommendationId: string,
    simulatedCurrentOverrides?: Partial<SystemPerformanceSnapshot>
  ): {
    outcome: 'SUCCESS' | 'ROLLED_BACK';
    measurement: SystemPerformanceSnapshot;
    rollbackRecord?: OptimizationRollbackRecord;
  } {
    const recEngine = OptimizationRecommendationEngine.getInstance();
    const perfEngine = SystemPerformanceIntelligence.getInstance();
    const rollbackEngine = OptimizationRollbackEngine.getInstance();
    const learningOrchestrator = ContinuousLearningOrchestrator.getInstance();

    const rec = recEngine.getRecommendationById(recommendationId);
    if (!rec || !this.activeBaseline) {
      throw new Error(`Active recommendation or baseline missing for ${recommendationId}`);
    }

    const currentMeasurement = perfEngine.captureSnapshot(simulatedCurrentOverrides);
    recEngine.updateRecommendationStatus(recommendationId, 'MEASURING', {
      postOptimizationMeasurement: currentMeasurement,
    });

    const evalResult = rollbackEngine.evaluatePostMeasurement(rec, this.activeBaseline, currentMeasurement);

    if (evalResult.regressionDetected) {
      this.transitionToStage('ROLLBACK', `Performance regression detected. Reverting ${rec.targetConfigKey}.`);
      recEngine.updateRecommendationStatus(recommendationId, 'ROLLED_BACK', {
        rejectionReason: evalResult.reason,
      });

      learningOrchestrator.recordOptimizationOutcome(
        rec.recommendationId,
        rec.domain,
        rec.targetConfigKey,
        false,
        evalResult.reason || 'Regression rollback'
      );

      return {
        outcome: 'ROLLED_BACK',
        measurement: currentMeasurement,
        rollbackRecord: evalResult.rollbackRecord,
      };
    }

    // Success
    recEngine.updateRecommendationStatus(recommendationId, 'COMPLETED_SUCCESS');
    learningOrchestrator.recordOptimizationOutcome(
      rec.recommendationId,
      rec.domain,
      rec.targetConfigKey,
      true,
      `Successfully optimized ${rec.targetConfigKey} with verified stability.`
    );

    this.transitionToStage('OBSERVE', `Optimization "${rec.title}" completed successfully. Returning to continuous observation.`);
    this.activeRecommendation = null;
    this.activeBaseline = null;

    return {
      outcome: 'SUCCESS',
      measurement: currentMeasurement,
    };
  }

  /**
   * Operator-initiated manual rollback.
   */
  public triggerManualRollback(recommendationId: string, operatorReason: string): OptimizationRollbackRecord {
    const recEngine = OptimizationRecommendationEngine.getInstance();
    const perfEngine = SystemPerformanceIntelligence.getInstance();
    const rollbackEngine = OptimizationRollbackEngine.getInstance();
    const learningOrchestrator = ContinuousLearningOrchestrator.getInstance();

    const rec = recEngine.getRecommendationById(recommendationId);
    if (!rec) {
      throw new Error(`Recommendation ${recommendationId} not found`);
    }

    const currentSnapshot = perfEngine.getLatestSnapshot();
    const baselineSnapshot = rec.preOptimizationBaseline || currentSnapshot;

    this.transitionToStage('ROLLBACK', `Operator manual override triggered rollback for "${rec.title}".`);

    const rollbackRecord = rollbackEngine.executeRollback(
      rec,
      'OPERATOR_MANUAL_OVERRIDE',
      operatorReason,
      Number((currentSnapshot as any)[rec.rollbackThresholdMetric]) || 0,
      Number((baselineSnapshot as any)[rec.rollbackThresholdMetric]) || 0
    );

    recEngine.updateRecommendationStatus(recommendationId, 'ROLLED_BACK', {
      rejectionReason: `Manual override: ${operatorReason}`,
    });

    learningOrchestrator.recordOptimizationOutcome(
      rec.recommendationId,
      rec.domain,
      rec.targetConfigKey,
      false,
      `Manual operator rollback: ${operatorReason}`
    );

    this.transitionToStage('OBSERVE', `System restored to baseline. Returning to OBSERVE.`);
    return rollbackRecord;
  }

  public subscribe(listener: (stage: EvolutionLifecycleStage) => void): () => void {
    this.listeners.add(listener);
    listener(this.currentStage);
    return () => this.listeners.delete(listener);
  }
}
