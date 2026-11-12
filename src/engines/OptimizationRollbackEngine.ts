/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Optimization Rollback Engine (Phase 34)
 * Automated regression detection and instant rollback execution subsystem.
 * Monitors newly applied optimizations during the MEASURE stage, triggering an automatic
 * rollback if performance degrades by > 10% or if explicit rollback thresholds are violated.
 * Also provides an operator-override instant rollback trigger.
 */

import {
  OptimizationRecommendation,
  OptimizationRollbackRecord,
  SystemPerformanceSnapshot,
} from '../types/phase34';
import { SelfOptimizationEngine } from './SelfOptimizationEngine';

export class OptimizationRollbackEngine {
  private static instance: OptimizationRollbackEngine | null = null;
  private rollbackHistory: OptimizationRollbackRecord[] = [];

  public static getInstance(): OptimizationRollbackEngine {
    if (!OptimizationRollbackEngine.instance) {
      OptimizationRollbackEngine.instance = new OptimizationRollbackEngine();
    }
    return OptimizationRollbackEngine.instance;
  }

  public static resetInstance(): void {
    OptimizationRollbackEngine.instance = null;
  }

  /**
   * Evaluates post-application measurement against pre-optimization baseline.
   * If a performance regression (>10% degradation or breached threshold) is detected,
   * it executes an automated rollback.
   */
  public evaluatePostMeasurement(
    recommendation: OptimizationRecommendation,
    baseline: SystemPerformanceSnapshot,
    currentMeasurement: SystemPerformanceSnapshot
  ): { regressionDetected: boolean; rollbackRecord?: OptimizationRollbackRecord; reason?: string } {
    const metricKey = recommendation.rollbackThresholdMetric as keyof SystemPerformanceSnapshot;
    const threshold = recommendation.rollbackThresholdValue;

    const baseVal = Number(baseline[metricKey]) || 0;
    const currentVal = Number(currentMeasurement[metricKey]) || 0;

    let regressionDetected = false;
    let reason = '';

    // If higher is worse (latency, frame drop, queue depth)
    if (['apiResponseLatencyMs', 'aiProviderResponseTimeMs', 'taskExecutionDurationMs', 'queueDepth', 'renderFrameDropPercent'].includes(metricKey)) {
      if (currentVal > threshold) {
        regressionDetected = true;
        reason = `Metric "${metricKey}" exceeded rollback threshold (${currentVal} > ${threshold}).`;
      } else if (baseVal > 0 && currentVal > baseVal * 1.10) {
        regressionDetected = true;
        const degradationPct = Math.round(((currentVal - baseVal) / baseVal) * 100);
        reason = `Metric "${metricKey}" degraded by ${degradationPct}% (> 10% tolerance) from baseline ${baseVal} to ${currentVal}.`;
      }
    } else {
      // If higher is better (FPS, hit ratio, success rate)
      if (currentVal < threshold) {
        regressionDetected = true;
        reason = `Metric "${metricKey}" dropped below minimum rollback threshold (${currentVal} < ${threshold}).`;
      } else if (baseVal > 0 && currentVal < baseVal * 0.90) {
        regressionDetected = true;
        const degradationPct = Math.round(((baseVal - currentVal) / baseVal) * 100);
        reason = `Metric "${metricKey}" degraded by ${degradationPct}% (> 10% tolerance) from baseline ${baseVal} to ${currentVal}.`;
      }
    }

    if (regressionDetected) {
      const rollbackRecord = this.executeRollback(
        recommendation,
        'AUTOMATIC_REGRESSION_DETECTION',
        reason,
        currentVal,
        baseVal
      );
      return { regressionDetected: true, rollbackRecord, reason };
    }

    return { regressionDetected: false };
  }

  /**
   * Executes a parameter rollback, either automated or manual by operator.
   */
  public executeRollback(
    recommendation: OptimizationRecommendation,
    triggeredBy: 'AUTOMATIC_REGRESSION_DETECTION' | 'OPERATOR_MANUAL_OVERRIDE',
    reason: string,
    currentMetricValue: number,
    baselineMetricValue: number
  ): OptimizationRollbackRecord {
    const selfOpt = SelfOptimizationEngine.getInstance();

    const rollbackResult = selfOpt.rollbackChange(
      recommendation.targetConfigKey,
      recommendation.currentValue,
      reason
    );

    const record: OptimizationRollbackRecord = {
      rollbackId: `rbk-${recommendation.recommendationId}-${Date.now().toString(36)}`,
      recommendationId: recommendation.recommendationId,
      configKey: recommendation.targetConfigKey,
      restoredValue: recommendation.currentValue,
      triggeredBy,
      triggerReason: reason,
      preRollbackMetricValue: currentMetricValue,
      baselineMetricValue: baselineMetricValue,
      rollbackTimestamp: new Date().toISOString(),
      rollbackSuccessful: rollbackResult.success,
    };

    this.rollbackHistory.unshift(record);
    return record;
  }

  public getRollbackHistory(): OptimizationRollbackRecord[] {
    return [...this.rollbackHistory];
  }
}
