/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 33: Predictive Intelligence, Cognitive Analytics & Decision Optimization Engine Types.
 * Complete type definitions for time-series forecasting, multi-factor predictions,
 * temporal pattern analysis, scenario simulations, explainable decision support,
 * predictive risk scoring, adaptive learning feedback loops, and 6-agent coordination.
 */

import { AgentSpecialistRole } from './phase17';

export type TelemetryProvenanceTier =
  | 'OBSERVED_DATA'
  | 'CALCULATED_INDICATOR'
  | 'MODEL_GENERATED_PREDICTION'
  | 'SIMULATED_DEMO_DATA';

export type TrendDirection = 'RISING' | 'STABLE' | 'DECLINING' | 'VOLATILE';

export type ForecastScenarioType = 'BEST_CASE' | 'EXPECTED_CASE' | 'WORST_CASE' | 'ALTERNATIVE_CASE';

export type DecisionApprovalState = 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';

export type RiskSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DataPoint {
  timestamp: string;
  value: number;
  provenance: TelemetryProvenanceTier;
  confidence?: number;
}

export interface MetricForecastSeries {
  metricKey: string;
  metricLabel: string;
  unit: string;
  historical: DataPoint[];
  forecast: DataPoint[];
  lowerConfidenceBound: DataPoint[];
  upperConfidenceBound: DataPoint[];
  horizonSeconds: number;
  calculatedAt: string;
}

export interface TemporalPatternAnalysis {
  patternId: string;
  metricKey: string;
  trend: TrendDirection;
  trendSlope: number; // rate of change per second
  volatilityIndex: number; // standard deviation of residuals (0 - 100)
  seasonalityDetected: boolean;
  cyclePeriodSeconds?: number;
  changePoints: Array<{ timestamp: string; changeMagnitude: number; description: string }>;
  temporalAnomalies: Array<{ timestamp: string; observedValue: number; expectedValue: number; deviationSigma: number }>;
  dataCompletenessPercent: number; // handles missing data safely
  analyzedAt: string;
}

export interface ForecastScenario {
  scenarioId: string;
  type: ForecastScenarioType;
  title: string;
  probabilityPercent: number | null; // Null if statistical evidence is insufficient
  horizonSeconds: number;
  assumptions: string[];
  projectedMetrics: Record<string, number>;
  limitingFactors: string[];
  potentialImpacts: string[];
  recommendedPreparation: string;
}

export interface DecisionOption {
  optionId: string;
  title: string;
  description: string;
  targetSubsystem: string;
  operationalImpact: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  projectedBenefits: string[];
  projectedRisks: string[];
  tradeOffs: string[];
  costBenefitRatio: number;
  compositeScore: number; // 0 - 100
  requiresHumanApproval: boolean;
}

export interface DecisionRecommendation {
  recommendationId: string;
  topic: string;
  evaluatedOptions: DecisionOption[];
  recommendedOptionId: string;
  justification: string;
  decisionFactors: Array<{ factor: string; weight: number; impactOnChoice: string }>;
  confidenceScore: number; // 0 - 100%
  approvalState: DecisionApprovalState;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  createdAt: string;
}

export interface PredictiveRiskIndicator {
  riskId: string;
  category: 'CADENCE_STALL' | 'TRACKING_LOSS' | 'RESOURCE_CONTENTION' | 'SECURITY_BREACH' | 'RESONANCE_DESTABILIZATION';
  severity: RiskSeverity;
  currentRiskScore: number; // 0 - 100
  projectedRiskScore30s: number;
  projectedRiskScore60s: number;
  trend: TrendDirection;
  earlyWarningTriggered: boolean;
  warningThreshold: number;
  triggerFactors: string[];
  mitigationSteps: string[];
  assessedAt: string;
}

export interface ExplanationFactor {
  factorName: string;
  contributionPercent: number; // Positive or negative influence
  direction: 'FAVORABLE' | 'ADVERSE' | 'NEUTRAL';
  description: string;
}

export interface PredictionExplanation {
  predictionId: string;
  modelIdentifier: string;
  calculationMethod: 'EXPONENTIAL_SMOOTHING' | 'POLYNOMIAL_REGRESSION' | 'BAYESIAN_KALMAN_UPDATE' | 'MULTI_FACTOR_WEIGHTED';
  calibratedConfidence: number; // Calibrated score (not raw uncalibrated probability)
  dataQualityRating: 'HIGH' | 'MEDIUM' | 'DEGRADED' | 'SPARSE';
  keyAssumptions: string[];
  contributingFactors: ExplanationFactor[];
  knownLimitations: string[];
  provenanceStatement: string;
}

export interface AdaptiveLearningRecord {
  recordId: string;
  predictionId: string;
  metricKey: string;
  predictedValue: number;
  actualObservedValue: number | null;
  errorAbsolute: number | null;
  errorPercentage: number | null;
  modelVersion: string;
  feedbackTimestamp: string;
  learningIteration: number;
  degradationAlert: boolean;
}

export interface AgentAnalyticalContribution {
  agentRole: AgentSpecialistRole;
  agentId: string;
  focusDomain: string;
  observedIndicators: string[];
  recommendation: string;
  confidenceScore: number;
  dissentingRemarks?: string;
}

export interface MultiAgentAnalyticalConsensus {
  consensusId: string;
  timestamp: string;
  overallHealthForecast: 'OPTIMAL' | 'STABLE' | 'DEGRADING' | 'CRITICAL_RISK';
  agentContributions: AgentAnalyticalContribution[];
  consensusAlignmentPercent: number;
  unresolvedDisagreements: string[];
  unifiedAnalyticalDirective: string;
}

export interface PredictiveIntelligenceState {
  forecasts: MetricForecastSeries[];
  temporalPatterns: TemporalPatternAnalysis[];
  scenarios: ForecastScenario[];
  activeRecommendations: DecisionRecommendation[];
  riskIndicators: PredictiveRiskIndicator[];
  explanations: Record<string, PredictionExplanation>;
  learningRecords: AdaptiveLearningRecord[];
  agentConsensus: MultiAgentAnalyticalConsensus | null;
  systemModelVersion: string;
  overallForecastingAccuracyPercent: number;
  lastUpdated: string;
  persistenceMode: 'LOCAL_DEVELOPMENT' | 'CLOUD_FIRESTORE' | 'OFFLINE_FALLBACK';
}
