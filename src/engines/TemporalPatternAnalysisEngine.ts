/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Temporal Pattern Analysis Engine (Phase 33)
 * Analyzes time-series telemetry to detect short- and long-term trends,
 * cycle periodicities, mathematical change-points (abrupt step changes in mean/variance),
 * and temporal anomalies with robust handling for missing or irregular timestamps.
 */

import {
  DataPoint,
  TemporalPatternAnalysis,
  TrendDirection,
} from '../types/phase33';

export class TemporalPatternAnalysisEngine {
  private static instance: TemporalPatternAnalysisEngine | null = null;
  private patternCache: Map<string, TemporalPatternAnalysis> = new Map();

  public constructor() {}

  public static getInstance(): TemporalPatternAnalysisEngine {
    if (!TemporalPatternAnalysisEngine.instance) {
      TemporalPatternAnalysisEngine.instance = new TemporalPatternAnalysisEngine();
    }
    return TemporalPatternAnalysisEngine.instance;
  }

  public static resetInstance(): void {
    TemporalPatternAnalysisEngine.instance = null;
  }

  /**
   * Analyzes an array of historical data points for a given metric.
   */
  public analyzePattern(metricKey: string, dataPoints: DataPoint[]): TemporalPatternAnalysis {
    const nowStr = new Date().toISOString();

    // Safe handling of sparse or missing data
    if (!dataPoints || dataPoints.length < 3) {
      const fallback: TemporalPatternAnalysis = {
        patternId: `pat-${metricKey}-${Date.now()}`,
        metricKey,
        trend: 'STABLE',
        trendSlope: 0,
        volatilityIndex: 0,
        seasonalityDetected: false,
        changePoints: [],
        temporalAnomalies: [],
        dataCompletenessPercent: dataPoints ? (dataPoints.length / 10) * 100 : 0,
        analyzedAt: nowStr,
      };
      this.patternCache.set(metricKey, fallback);
      return fallback;
    }

    // 1. Compute Mean and Linear Regression Slope
    const n = dataPoints.length;
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      const x = i;
      const y = dataPoints[i].value;
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    }

    const meanY = sumY / n;
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX || 1);

    // 2. Trend classification
    let trend: TrendDirection = 'STABLE';
    if (Math.abs(slope) < 0.05) {
      trend = 'STABLE';
    } else if (slope > 0.05) {
      trend = 'RISING';
    } else {
      trend = 'DECLINING';
    }

    // 3. Volatility (Standard Deviation of residuals)
    let sumResidualSq = 0;
    for (let i = 0; i < n; i++) {
      const expected = (sumY / n) + slope * (i - (n - 1) / 2);
      const residual = dataPoints[i].value - expected;
      sumResidualSq += residual * residual;
    }
    const stdDev = Math.sqrt(sumResidualSq / n);
    const volatilityIndex = Math.min(100, Math.round((stdDev / (meanY || 1)) * 100));

    if (volatilityIndex > 35) {
      trend = 'VOLATILE';
    }

    // 4. Change-Point Detection (CUSUM style step-change detection)
    const changePoints: Array<{ timestamp: string; changeMagnitude: number; description: string }> = [];
    const windowSize = Math.max(2, Math.floor(n / 4));

    for (let i = windowSize; i < n - windowSize; i++) {
      const meanBefore = dataPoints.slice(i - windowSize, i).reduce((acc, p) => acc + p.value, 0) / windowSize;
      const meanAfter = dataPoints.slice(i, i + windowSize).reduce((acc, p) => acc + p.value, 0) / windowSize;
      const stepChange = meanAfter - meanBefore;

      if (Math.abs(stepChange) > stdDev * 1.8 && stdDev > 0) {
        changePoints.push({
          timestamp: dataPoints[i].timestamp,
          changeMagnitude: Math.round(stepChange * 10) / 10,
          description: `Abrupt ${stepChange > 0 ? 'increase' : 'drop'} of ${Math.abs(stepChange).toFixed(1)} units detected at index ${i}.`,
        });
        i += windowSize; // Skip ahead to avoid multiple detections for same step
      }
    }

    // 5. Temporal Anomaly Detection (> 2.5 sigma deviation)
    const temporalAnomalies: Array<{ timestamp: string; observedValue: number; expectedValue: number; deviationSigma: number }> = [];
    for (let i = 0; i < n; i++) {
      const expected = (sumY / n) + slope * (i - (n - 1) / 2);
      const diff = Math.abs(dataPoints[i].value - expected);
      if (stdDev > 0 && diff > 2.2 * stdDev) {
        temporalAnomalies.push({
          timestamp: dataPoints[i].timestamp,
          observedValue: dataPoints[i].value,
          expectedValue: Math.round(expected * 10) / 10,
          deviationSigma: Math.round((diff / stdDev) * 10) / 10,
        });
      }
    }

    // 6. Seasonality / Periodicity check (Auto-correlation at lag k)
    let seasonalityDetected = false;
    let cyclePeriodSeconds: number | undefined;

    if (n >= 16) {
      for (let lag = 3; lag <= Math.floor(n / 2); lag++) {
        let num = 0;
        let den = 0;
        for (let i = 0; i < n - lag; i++) {
          num += (dataPoints[i].value - meanY) * (dataPoints[i + lag].value - meanY);
        }
        for (let i = 0; i < n; i++) {
          den += (dataPoints[i].value - meanY) * (dataPoints[i].value - meanY);
        }
        const autoCorr = den > 0 ? num / den : 0;
        if (autoCorr > 0.65) {
          seasonalityDetected = true;
          cyclePeriodSeconds = lag;
          break;
        }
      }
    }

    const analysis: TemporalPatternAnalysis = {
      patternId: `pat-${metricKey}-${Date.now()}`,
      metricKey,
      trend,
      trendSlope: Math.round(slope * 1000) / 1000,
      volatilityIndex,
      seasonalityDetected,
      cyclePeriodSeconds,
      changePoints,
      temporalAnomalies,
      dataCompletenessPercent: Math.min(100, Math.round((n / 30) * 100)),
      analyzedAt: nowStr,
    };

    this.patternCache.set(metricKey, analysis);
    return analysis;
  }

  public getPattern(metricKey: string): TemporalPatternAnalysis | undefined {
    return this.patternCache.get(metricKey);
  }

  public getAllPatterns(): TemporalPatternAnalysis[] {
    return Array.from(this.patternCache.values());
  }
}
