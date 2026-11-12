/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 26 Type Definitions: Autonomous Evolution & Meta-Intelligence Engine.
 * Covers Meta-Reasoning, Autonomous Research, Cross-Phase Knowledge Integration,
 * Adaptive Strategy Optimization, Advanced Digital Twin Intelligence, and AI Reliability Assessment.
 */

import { AgentRole } from './phase17';

export type SpecialistAgentType = AgentRole;

// -------------------------------------------------------------
// MODULE 1: META-REASONING ENGINE TYPES
// -------------------------------------------------------------

export type ReasoningStrategy = 'BAYESIAN' | 'DEDUCTIVE' | 'HEURISTIC' | 'COUNTERFACTUAL' | 'HYBRID_ENSEMBLE';

export type ReasoningWeaknessType =
  | 'MISSING_EVIDENCE'
  | 'UNSUPPORTED_ASSUMPTION'
  | 'CONTRADICTORY_CONCLUSION'
  | 'CONFIDENCE_MISCALIBRATION'
  | 'SAMPLE_SIZE_INSUFFICIENT'
  | 'LOGICAL_LEAP';

export type CognitiveBiasType =
  | 'CONFIRMATION_BIAS'
  | 'RECENCY_BIAS'
  | 'AVAILABILITY_BIAS'
  | 'ANCHORING_BIAS'
  | 'OVERCONFIDENCE_BIAS';

export interface ReasoningWeakness {
  id: string;
  type: ReasoningWeaknessType;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  affectedHypothesisOrDecision: string;
  recommendedMitigation: string;
}

export interface CognitiveBiasIndicator {
  type: CognitiveBiasType;
  detected: boolean;
  score: number; // 0.0 - 1.0 (confidence of bias presence)
  details: string;
}

export interface StrategyComparisonResult {
  strategy: ReasoningStrategy;
  confidenceScore: number; // 0 - 100
  evidenceCompletenessScore: number; // 0 - 100
  robustnessScore: number; // 0 - 100
  computationalCost: 'MINIMAL' | 'BALANCED' | 'INTENSIVE';
  primaryConclusion: string;
}

export interface MetaReasoningEvaluation {
  id: string;
  evaluatedAt: string;
  sourceReasoningId: string;
  overallQualityScore: number; // 0 - 100
  evidenceCompletenessScore: number; // 0 - 100
  calibrationScore: number; // 0 - 100 (100 = perfectly calibrated)
  status: 'OPTIMAL' | 'ACCEPTABLE' | 'DEGRADED' | 'INSUFFICIENT_EVIDENCE';
  weaknesses: ReasoningWeakness[];
  biasIndicators: CognitiveBiasIndicator[];
  strategyComparisons: StrategyComparisonResult[];
  recommendedStrategy: ReasoningStrategy;
  isSufficientEvidence: boolean;
  metaSummary: string;
  auditedBy: string;
}

// -------------------------------------------------------------
// MODULE 2: AUTONOMOUS RESEARCH INTELLIGENCE TYPES
// -------------------------------------------------------------

export type ResearchSourceType =
  | 'INTERNAL_TELEMETRY'
  | 'DIAGNOSTIC_BASE'
  | 'HISTORICAL_INCIDENTS'
  | 'DIGITAL_TWIN_ARCHIVE'
  | 'WEBXR_STANDARDS'
  | 'PEER_BENCHMARK'
  | 'EXTERNAL_KNOWLEDGE_BASE';

export interface ResearchCitation {
  citationId: string;
  title: string;
  sourceType: ResearchSourceType;
  referenceUrlOrKey: string;
  reliabilityScore: number; // 0.0 - 1.0
  publishedOrSampledAt: string;
  authorOrProvider: string;
  isPeerReviewedOrVerified: boolean;
}

export interface ResearchQuestion {
  questionId: string;
  questionText: string;
  subQuestions: string[];
  priority: 'P0' | 'P1' | 'P2';
  resolved: boolean;
}

export interface ExtractedEvidence {
  evidenceId: string;
  citationId: string;
  claimText: string;
  strength: 'STRONG' | 'MODERATE' | 'WEAK';
  relevanceScore: number; // 0.0 - 1.0
  telemetryMetric?: string;
  observedValue?: string | number;
}

export interface ResearchSummary {
  taskId: string;
  topic: string;
  objective: string;
  methodology: string;
  questions: ResearchQuestion[];
  extractedEvidence: ExtractedEvidence[];
  citations: ResearchCitation[];
  synthesis: string;
  limitations: string[];
  recommendations: string[];
  confidenceScore: number; // 0 - 100
  generatedAt: string;
  isProviderSynthesized: boolean;
  requiresOperatorApproval: boolean;
  approvalStatus?: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ResearchTask {
  id: string;
  topic: string;
  scope: string;
  status: 'QUEUED' | 'IN_PROGRESS' | 'SYNTHESIZED' | 'FAILED' | 'WAITING_APPROVAL';
  createdAt: string;
  completedAt?: string;
  summary?: ResearchSummary;
}

// -------------------------------------------------------------
// MODULE 3: CROSS-PHASE KNOWLEDGE INTEGRATION TYPES
// -------------------------------------------------------------

export interface CrossPhaseModuleDependency {
  sourceModule: string;
  targetModule: string;
  interactionType: 'DATA_STREAM' | 'SUPERVISORY' | 'FAILOVER' | 'AUDIT_LOG' | 'STATE_SYNC';
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'DISCONNECTED';
  lastSynchronizedAt: string;
}

export interface CrossPhaseConflict {
  conflictId: string;
  detectedAt: string;
  phaseA: string;
  phaseB: string;
  natureOfConflict: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'ACTIVE' | 'RESOLVED' | 'SUPPRESSED';
  suggestedMediation: string;
  resolutionTimestamp?: string;
}

export interface IncidentCorrelationRecord {
  incidentId: string;
  phaseIntroduced: string;
  telemetrySignatures: string[];
  impactedComponents: string[];
  resolutionOutcome: string;
  recurrenceProbability: number; // 0.0 - 1.0
}

export interface CrossPhaseKnowledgeState {
  totalMappedModules: number;
  activeDependencies: CrossPhaseModuleDependency[];
  activeConflicts: CrossPhaseConflict[];
  resolvedConflictsCount: number;
  correlatedIncidents: IncidentCorrelationRecord[];
  knowledgeIntegrityScore: number; // 0 - 100
  lastIndexedAt: string;
}

// -------------------------------------------------------------
// MODULE 4: ADAPTIVE STRATEGY OPTIMIZER TYPES
// -------------------------------------------------------------

export interface StrategyConstraint {
  maxLatencyMs: number;
  minFrameRateFps: number;
  maxCpuUtilizationPercent: number;
  maxPowerBudgetWatts: number;
  requiredTrackingConfidence: number;
}

export interface OperationalStrategyOption {
  strategyId: string;
  name: string;
  description: string;
  executionMode: 'CONSERVATIVE_FAILSAFE' | 'BALANCED_NOMINAL' | 'MAX_PERFORMANCE' | 'RESOURCE_PRESERVATION';
  resourceEfficiencyScore: number; // 0 - 100
  safetyMarginScore: number; // 0 - 100
  expectedSuccessProbability: number; // 0 - 100
  estimatedCompletionTimeMs: number;
  riskRating: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL';
  tradeoffs: string[];
  requiresOperatorApproval: boolean;
}

export interface StrategyOptimizationResult {
  evaluationId: string;
  timestamp: string;
  activeConstraints: StrategyConstraint;
  evaluatedStrategies: OperationalStrategyOption[];
  recommendedStrategyId: string;
  optimizationRationale: string;
  compositeScore: number; // 0 - 100
  approvalRequestId?: string;
  approvalStatus: 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';
}

// -------------------------------------------------------------
// MODULE 5: ADVANCED DIGITAL TWIN INTELLIGENCE TYPES
// -------------------------------------------------------------

export interface StateDivergenceAlert {
  alertId: string;
  timestamp: string;
  metricName: string;
  digitalTwinValue: number | string;
  physicalSensorValue: number | string;
  divergencePercent: number;
  thresholdPercent: number;
  severity: 'WARNING' | 'CRITICAL';
  isSimulatedData: boolean; // MUST be true if from simulated run, false if physical
}

export interface CounterfactualScenario {
  scenarioId: string;
  name: string;
  description: string;
  perturbedVariables: Record<string, number | string | boolean>;
  simulatedOutcomes: {
    predictedFps: number;
    predictedLatencyMs: number;
    trackingStabilityPercent: number;
    failureRiskPercent: number;
    survivabilityIndex: number; // 0 - 100
  };
  isSimulatedData: true; // Strict adherence to simulation labeling
  simulatedAt: string;
}

export interface AdvancedDigitalTwinAnalysis {
  analysisId: string;
  timestamp: string;
  isPhysicalVRActive: boolean;
  isSimulatedData: boolean;
  currentObservedSyncScore: number; // 0 - 100
  activeDivergenceAlerts: StateDivergenceAlert[];
  counterfactualScenarios: CounterfactualScenario[];
  recommendedProactiveActions: string[];
}

// -------------------------------------------------------------
// MODULE 6: AI RELIABILITY & SELF-ASSESSMENT TYPES
// -------------------------------------------------------------

export interface AgentReliabilityMetric {
  agentRole: SpecialistAgentType;
  recommendationCount: number;
  verifiedSuccessfulOutcomes: number;
  accuracyRate: number; // 0.0 - 1.0
  brierCalibrationScore: number; // 0.0 (perfect) - 1.0 (poor)
  consensusAgreementRate: number; // 0.0 - 1.0
  evidenceCoverageRate: number; // 0.0 - 1.0
  reliabilityGrade: 'TIER_1_OPTIMAL' | 'TIER_2_STABLE' | 'TIER_3_DEGRADED' | 'INSUFFICIENT_DATA';
}

export interface AIReliabilityAssessmentReport {
  reportId: string;
  assessedAt: string;
  totalEvaluatedDecisions: number;
  sampleSizeAdequate: boolean;
  systemReliabilityScore: number; // 0 - 100
  meanBrierScore: number; // 0.0 - 1.0
  statusMessage: string;
  agentMetrics: AgentReliabilityMetric[];
  identifiedBlindspots: string[];
  confidenceInterval: [number, number]; // e.g. [82.5, 91.2]
}

// -------------------------------------------------------------
// MODULE 7: GLOBAL EVOLUTION STATE
// -------------------------------------------------------------

export interface GlobalEvolutionState {
  metaReasoningHistory: MetaReasoningEvaluation[];
  researchTasks: ResearchTask[];
  crossPhaseKnowledge: CrossPhaseKnowledgeState;
  strategyOptimizations: StrategyOptimizationResult[];
  digitalTwinAnalyses: AdvancedDigitalTwinAnalysis[];
  reliabilityReports: AIReliabilityAssessmentReport[];
  lastUpdated: string;
}
