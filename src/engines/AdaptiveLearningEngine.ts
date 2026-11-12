/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Adaptive Learning Engine (Phase 33)
 * Controlled feedback-loop engine that records model predictions, correlates them
 * with actual later observations, tracks error metrics (Mean Absolute Error, MAPE),
 * and flags model performance degradation. Never silently mutates production configurations.
 */

import { AdaptiveLearningRecord } from '../types/phase33';
import { DistributedEventBus } from './DistributedEventBus';

export class AdaptiveLearningEngine {
  private static instance: AdaptiveLearningEngine | null = null;
  private records: AdaptiveLearningRecord[] = [];
  private currentModelVersion = 'v33.1.0-holt-linear';
  private iterationCount = 12;
  private degradationThresholdPercent = 15.0; // MAPE ceiling before alert
  private listeners: Set<(records: AdaptiveLearningRecord[]) => void> = new Set();

  public constructor() {
    this.seedLearningHistory();
  }

  public static getInstance(): AdaptiveLearningEngine {
    if (!AdaptiveLearningEngine.instance) {
      AdaptiveLearningEngine.instance = new AdaptiveLearningEngine();
    }
    return AdaptiveLearningEngine.instance;
  }

  public static resetInstance(): void {
    AdaptiveLearningEngine.instance = null;
  }

  private seedLearningHistory(): void {
    const now = Date.now();
    const samples: AdaptiveLearningRecord[] = [
      {
        recordId: 'lrn-01',
        predictionId: 'pred-cadence-01',
        metricKey: 'cadence_fps',
        predictedValue: 71.5,
        actualObservedValue: 72.0,
        errorAbsolute: 0.5,
        errorPercentage: 0.69,
        modelVersion: this.currentModelVersion,
        feedbackTimestamp: new Date(now - 120000).toISOString(),
        learningIteration: 10,
        degradationAlert: false,
      },
      {
        recordId: 'lrn-02',
        predictionId: 'pred-cadence-02',
        metricKey: 'cadence_fps',
        predictedValue: 70.8,
        actualObservedValue: 71.0,
        errorAbsolute: 0.2,
        errorPercentage: 0.28,
        modelVersion: this.currentModelVersion,
        feedbackTimestamp: new Date(now - 60000).toISOString(),
        learningIteration: 11,
        degradationAlert: false,
      },
      {
        recordId: 'lrn-03',
        predictionId: 'pred-tracking-03',
        metricKey: 'tracking_joints',
        predictedValue: 25.0,
        actualObservedValue: 25.0,
        errorAbsolute: 0.0,
        errorPercentage: 0.0,
        modelVersion: this.currentModelVersion,
        feedbackTimestamp: new Date(now - 30000).toISOString(),
        learningIteration: 12,
        degradationAlert: false,
      },
    ];

    this.records.push(...samples);
  }

  /**
   * Registers a prediction outcome and compares against observed telemetry.
   */
  public recordOutcome(params: {
    predictionId: string;
    metricKey: string;
    predictedValue: number;
    actualObservedValue: number;
  }): AdaptiveLearningRecord {
    const { predictionId, metricKey, predictedValue, actualObservedValue } = params;
    const absError = Math.round(Math.abs(predictedValue - actualObservedValue) * 100) / 100;
    const denom = actualObservedValue !== 0 ? Math.abs(actualObservedValue) : 1;
    const errorPct = Math.round((absError / denom) * 10000) / 100;

    this.iterationCount += 1;
    const degradationAlert = errorPct > this.degradationThresholdPercent;

    const record: AdaptiveLearningRecord = {
      recordId: `lrn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      predictionId,
      metricKey,
      predictedValue,
      actualObservedValue,
      errorAbsolute: absError,
      errorPercentage: errorPct,
      modelVersion: this.currentModelVersion,
      feedbackTimestamp: new Date().toISOString(),
      learningIteration: this.iterationCount,
      degradationAlert,
    };

    this.records.unshift(record);
    if (this.records.length > 100) {
      this.records.pop();
    }

    // Emit event
    DistributedEventBus.getInstance().publish({
      eventType: 'PREDICTION_OUTCOME_RECORDED',
      source: 'AdaptiveLearningEngine',
      priority: degradationAlert ? 'HIGH' : 'LOW',
      payload: record,
      suppressionFingerprint: `outcome-${record.recordId}`,
    });

    if (degradationAlert) {
      DistributedEventBus.getInstance().publish({
        eventType: 'MODEL_PERFORMANCE_DEGRADED',
        source: 'AdaptiveLearningEngine',
        priority: 'HIGH',
        payload: {
          metricKey,
          errorPercentage: errorPct,
          threshold: this.degradationThresholdPercent,
        },
        suppressionFingerprint: `degrade-${metricKey}`,
      });
    }

    this.notifyListeners();
    return record;
  }

  /**
   * Computes aggregate forecasting accuracy statistics across all records.
   */
  public getAccuracyStatistics(): {
    meanAbsoluteError: number;
    meanAbsolutePercentageError: number;
    accuracyPercent: number;
    totalEvaluations: number;
    modelVersion: string;
  } {
    if (this.records.length === 0) {
      return {
        meanAbsoluteError: 0,
        meanAbsolutePercentageError: 0,
        accuracyPercent: 100,
        totalEvaluations: 0,
        modelVersion: this.currentModelVersion,
      };
    }

    let sumMae = 0;
    let sumMape = 0;

    for (const r of this.records) {
      sumMae += r.errorAbsolute ?? 0;
      sumMape += r.errorPercentage ?? 0;
    }

    const meanMae = Math.round((sumMae / this.records.length) * 100) / 100;
    const meanMape = Math.round((sumMape / this.records.length) * 100) / 100;
    const accuracy = Math.max(0, Math.min(100, Math.round((100 - meanMape) * 10) / 10));

    return {
      meanAbsoluteError: meanMae,
      meanAbsolutePercentageError: meanMape,
      accuracyPercent: accuracy,
      totalEvaluations: this.records.length,
      modelVersion: this.currentModelVersion,
    };
  }

  public getAllRecords(): AdaptiveLearningRecord[] {
    return [...this.records];
  }

  public subscribe(listener: (records: AdaptiveLearningRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllRecords());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllRecords();
    this.listeners.forEach((l) => l(list));
  }
}
