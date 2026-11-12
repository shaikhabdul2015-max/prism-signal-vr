/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Anomaly Detection Types
 */

export interface MetricBaseline {
  metricName: string;
  count: number;
  mean: number;
  variance: number;
  standardDeviation: number;
  lastUpdated: string;
}

export interface UserBehavioralProfile {
  identityKey: string; // user:id or ip:address
  requestRateBaseline: MetricBaseline;
  errorRateBaseline: MetricBaseline;
  commonEndpoints: Map<string, number>;
  activeHoursBitmask: number; // 24-bit representation of typical active hours
  lastSeenTimestamp: number;
}

export interface AnomalySignal {
  metricName: string;
  baselineValue: number;
  observedValue: number;
  deviationSigma: number;
  confidence: number; // 0.0 - 1.0
  isAnomaly: boolean;
  explanation: string;
}

export interface AnomalyRecommendation {
  identityKey: string;
  anomalyScore: number; // 0 - 100
  confidence: number; // 0.0 - 1.0
  signals: AnomalySignal[];
  recommendedAction: 'MONITOR' | 'INVESTIGATE' | 'RATE_LIMIT' | 'RESTRICT' | 'BLOCK';
  rationale: string;
  isUntrustedRecommendation: true; // Strict architectural marker that AI recommendations must NOT independently authorize privileged actions
  timestamp: string;
}
