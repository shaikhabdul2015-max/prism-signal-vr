/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 34: Autonomous Intelligence Evolution & Self-Optimization Engine Types.
 * Complete type definitions for controlled self-optimization, system performance tracking,
 * adaptive resource management, AI model evaluation, continuous learning feedback,
 * optimization recommendations, pre/post-validation, rollback automation, and 6-agent coordination.
 */

import { AgentSpecialistRole } from './phase17';

export type EvolutionLifecycleStage =
  | 'OBSERVE'
  | 'ANALYZE'
  | 'IDENTIFY'
  | 'RECOMMEND'
  | 'VALIDATE'
  | 'REQUEST_APPROVAL'
  | 'APPLY'
  | 'MEASURE'
  | 'ROLLBACK';

export type OptimizationTargetDomain =
  | 'AI_REQUEST_ROUTING'
  | 'TASK_SCHEDULING'
  | 'AGENT_WORKLOAD_DISTRIBUTION'
  | 'CACHING_POLICIES'
  | 'DATA_PROCESSING_PIPELINES'
  | 'RENDERING_PERFORMANCE'
  | 'BACKGROUND_TASK_EXECUTION'
  | 'RETRY_TIMEOUT_POLICIES';

export type OptimizationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type OptimizationStatus =
  | 'PROPOSED'
  | 'VALIDATING'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'APPLIED'
  | 'MEASURING'
  | 'COMPLETED_SUCCESS'
  | 'ROLLED_BACK'
  | 'REJECTED';

export type MetricMeasurementType = 'MEASURED_METRIC' | 'CALCULATED_AGGREGATE' | 'ESTIMATED_VALUE';

export interface PerformanceMetricSample {
  timestamp: string;
  metricKey: string;
  value: number;
  unit: string;
  type: MetricMeasurementType;
  source: string;
}

export interface SystemPerformanceSnapshot {
  timestamp: string;
  apiResponseLatencyMs: number;
  apiSuccessRatePercent: number;
  aiProviderResponseTimeMs: number;
  taskExecutionDurationMs: number;
  queueDepth: number;
  activeAgentsCount: number;
  cacheHitRatioPercent: number;
  renderCadenceFps: number;
  renderFrameDropPercent: number;
  measuredMemoryMb: number | null; // Null if browser environment does not support performance.memory
  isMemoryMeasured: boolean;
  activeBottlenecks: string[];
}

export interface ModelPerformanceReport {
  modelId: string;
  modelName: string;
  providerType: 'SERVER_PROXY' | 'LOCAL_HEURISTIC' | 'WEB_WORKER';
  evaluatedHorizon: 'SHORT_15S' | 'MEDIUM_30S' | 'EXTENDED_60S_120S';
  averageLatencyMs: number;
  successRatePercent: number;
  estimatedCostPer1kTokensUSD: number | null;
  outputQualityScore: number; // 0 - 100
  fallbackFrequencyPercent: number;
  predictionAccuracyPercent: number; // For Holt-Linear / CUSUM algorithms
  meanAbsoluteError: number;
  meanAbsolutePercentageError: number;
  degradationDetected: boolean;
  recommendedAction?: string;
  evaluatedAt: string;
}

export interface OptimizationRecommendation {
  recommendationId: string;
  domain: OptimizationTargetDomain;
  title: string;
  problemDescription: string;
  supportingEvidence: string[];
  expectedBenefit: string;
  potentialRisks: string[];
  resourceRequirements: string;
  confidenceScore: number; // 0 - 100%
  priority: OptimizationPriority;
  targetConfigKey: string;
  currentValue: any;
  proposedValue: any;
  validationCriteria: string[];
  rollbackThresholdMetric: string;
  rollbackThresholdValue: number;
  status: OptimizationStatus;
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  appliedAt?: string;
  preOptimizationBaseline?: SystemPerformanceSnapshot;
  postOptimizationMeasurement?: SystemPerformanceSnapshot;
  createdAt: string;
}

export interface ValidationCheckResult {
  checkId: string;
  checkName: string;
  passed: boolean;
  details: string;
  timestamp: string;
}

export interface OptimizationValidationReport {
  validationId: string;
  recommendationId: string;
  schemaValid: boolean;
  securityCompliant: boolean; // Must NEVER weaken Phase 32 Zero-Trust controls!
  resourceConstraintsSatisfied: boolean;
  dependenciesVerified: boolean;
  regressionRiskAcceptable: boolean;
  checks: ValidationCheckResult[];
  overallValidationPassed: boolean;
  validatedAt: string;
}

export interface OptimizationRollbackRecord {
  rollbackId: string;
  recommendationId: string;
  configKey: string;
  restoredValue: any;
  triggeredBy: 'AUTOMATIC_REGRESSION_DETECTION' | 'OPERATOR_MANUAL_OVERRIDE';
  triggerReason: string;
  preRollbackMetricValue: number;
  baselineMetricValue: number;
  rollbackTimestamp: string;
  rollbackSuccessful: boolean;
}

export interface ContinuousLearningProgress {
  totalOutcomesCollected: number;
  totalOptimizationsApplied: number;
  successfulOptimizationsCount: number;
  rollbacksCount: number;
  currentConfigurationVersion: string;
  learningIteration: number;
  optimizationSuccessRatePercent: number;
  lastUpdated: string;
}

export interface AgentEvolutionRoleContribution {
  agentRole: AgentSpecialistRole;
  agentId: string;
  assignedDomain: string;
  findings: string[];
  proposedOptimizationIds: string[];
  approvalStance: 'APPROVE' | 'REJECT' | 'NEUTRAL';
  evaluationRationale: string;
  confidenceScore: number;
}

export interface MultiAgentEvolutionConsensus {
  consensusId: string;
  timestamp: string;
  activeCycle: EvolutionLifecycleStage;
  agentContributions: AgentEvolutionRoleContribution[];
  consensusAgreementPercent: number;
  strategicDirective: string;
  dissentingRemarks: string[];
}

export interface AutonomousIntelligenceEvolutionState {
  currentStage: EvolutionLifecycleStage;
  systemPerformance: SystemPerformanceSnapshot;
  performanceHistory: PerformanceMetricSample[];
  modelEvaluations: ModelPerformanceReport[];
  recommendations: OptimizationRecommendation[];
  pendingApprovals: OptimizationRecommendation[];
  validationReports: Record<string, OptimizationValidationReport>;
  rollbackHistory: OptimizationRollbackRecord[];
  learningProgress: ContinuousLearningProgress;
  agentConsensus: MultiAgentEvolutionConsensus | null;
  activeConfiguration: Record<string, any>;
  persistenceMode: 'LOCAL_DEVELOPMENT' | 'CLOUD_FIRESTORE' | 'OFFLINE_FALLBACK';
  lastUpdated: string;
}
