/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 25: AGI-Inspired Cognitive Intelligence & Evolution Engine Types.
 * Defines models for structured reasoning, decision intelligence,
 * retrieval-based continuous learning, multi-agent cognitive collaboration,
 * 3-tier predictive scenario intelligence, self-evaluation calibration,
 * and knowledge graphs.
 * 
 * NOTE: This is an AGI-inspired modular cognitive architecture. It does NOT
 * claim Artificial General Intelligence, and does NOT claim model weight self-training.
 */

import { AgentRole } from './phase17';

export type CognitiveEngineStatus = 'IDLE' | 'ANALYZING' | 'SYNTHESIZING' | 'EVALUATING' | 'ERROR';

export type EvidenceProvenance = 'PHYSICAL_HARDWARE' | 'SIMULATED_TWIN' | 'HISTORICAL_ARCHIVE' | 'OPERATOR_INPUT';

export type KnowledgeNodeType = 
  | 'MODULE' 
  | 'AGENT' 
  | 'TELEMETRY_METRIC' 
  | 'DIRECTIVE' 
  | 'FAILURE_MODE' 
  | 'OBJECTIVE' 
  | 'SAFETY_RULE'
  | 'REASONING_NODE';

export type KnowledgeRelationType = 
  | 'DEPENDS_ON' 
  | 'MONITORS' 
  | 'CONTROLS' 
  | 'MITIGATES' 
  | 'EVALUATES' 
  | 'FEEDS_INTO'
  | 'CORRELATED_WITH';

export interface KnowledgeNode {
  id: string;
  name: string;
  type: KnowledgeNodeType;
  properties: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeRelationship {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relation: KnowledgeRelationType;
  weight: number; // 0.0 to 1.0
  metadata?: Record<string, unknown>;
}

export interface KnowledgeGraphSnapshot {
  nodes: KnowledgeNode[];
  relationships: KnowledgeRelationship[];
  nodeCount: number;
  relationshipCount: number;
  timestamp: string;
  cyclicDependencyDetected: boolean;
  cycles?: string[][];
}

export interface CognitiveEvidenceItem {
  id: string;
  label: string;
  metricKey: string;
  observedValue: number | string | boolean;
  expectedBaseline: number | string | boolean;
  provenance: EvidenceProvenance;
  weight: number; // 0.0 to 1.0
  timestamp: string;
}

export interface Hypothesis {
  id: string;
  statement: string;
  rationale: string;
  evidenceSupportIds: string[];
  evidenceContradictionIds: string[];
  priorProbability: number; // 0.0 to 1.0
  posteriorProbability: number; // 0.0 to 1.0
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'INCONCLUSIVE';
}

export interface ReasoningStep {
  stepNumber: number;
  action: string;
  observation: string;
  deduction: string;
  uncertainty: number; // 0.0 to 1.0
}

export interface CognitiveReasoningResult {
  problemId: string;
  problemStatement: string;
  timestamp: string;
  hypotheses: Hypothesis[];
  selectedHypothesis: Hypothesis | null;
  evidenceItems: CognitiveEvidenceItem[];
  reasoningSteps: ReasoningStep[];
  uncertaintyScore: number; // 0.0 (certain) to 1.0 (uncertain)
  overallConfidence: number; // 0.0 to 1.0
  explainableConclusion: string;
  actionableDirectives: string[];
}

export interface DecisionOption {
  id: string;
  title: string;
  description: string;
  feasibilityScore: number; // 0.0 to 1.0
  riskScore: number; // 0.0 to 1.0
  benefitScore: number; // 0.0 to 1.0
  latencyImpactMs: number;
  costImpactUnits: number;
  requiresHumanApproval: boolean;
  pros: string[];
  cons: string[];
}

export interface DecisionComparison {
  decisionId: string;
  title: string;
  context: string;
  timestamp: string;
  options: DecisionOption[];
  recommendedOptionId: string;
  compositePriorityScore: number; // 0.0 to 1.0
  approvalRequired: boolean;
  approvalRequestId?: string;
  executionStatus: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'CANCELLED';
  operatorReviewNote?: string;
}

export interface LearningInsight {
  id: string;
  signatureHash: string; // for de-duplication
  category: 'INCIDENT_RECOVERY' | 'PERFORMANCE_TUNING' | 'TELEMETRY_ANOMALY' | 'MISSION_ADAPTATION';
  patternDescription: string;
  remedyApplied: string;
  outcomeSuccess: boolean;
  provenance: {
    telemetryMode: string;
    responsibleAgent: AgentRole;
    timestamp: string;
  };
  retrievalKeywords: string[];
  applicationCount: number;
}

export interface AgentPerspective {
  agentRole: AgentRole;
  agentName: string;
  stance: 'SUPPORT' | 'CRITIQUE' | 'ABSTAIN' | 'CONDITIONAL_APPROVAL';
  confidence: number; // 0.0 to 1.0
  argument: string;
  recommendedModifications: string[];
  timestamp: string;
}

export interface CognitiveConsensusReport {
  sessionId: string;
  issueDescription: string;
  perspectives: AgentPerspective[];
  consensusScore: number; // 0.0 to 1.0 (agreement ratio)
  dissentingViews: string[];
  unifiedDirective: string;
  timestamp: string;
  approvedByChiefOfficer: boolean;
}

export interface ScenarioProjection {
  type: 'BEST_CASE' | 'EXPECTED' | 'WORST_CASE';
  probability: number; // 0.0 to 1.0
  projectedFps: number;
  projectedLatencyMs: number;
  projectedIncidentProbability: number;
  projectedJointDriftMm: number;
  description: string;
  keyAssumptions: string[];
  mitigationStrategies: string[];
  isSimulatedData: boolean; // Must always be true for projections!
}

export interface ScenarioComparisonReport {
  timestamp: string;
  projections: {
    bestCase: ScenarioProjection;
    expected: ScenarioProjection;
    worstCase: ScenarioProjection;
  };
  volatilityIndex: number; // 0.0 to 1.0
  recommendedAction: string;
  activeDigitalTwinChecksum: string;
}

export interface DecisionEvaluationRecord {
  evaluationId: string;
  decisionId: string;
  predictedConfidence: number; // 0.0 to 1.0
  actualOutcomeSuccess: boolean;
  brierLoss: number; // (predicted - actual)^2
  feedbackNotes: string;
  timestamp: string;
}

export interface ConfidenceCalibrationMetric {
  totalEvaluations: number;
  averageConfidence: number;
  empiricalSuccessRate: number;
  meanBrierScore: number; // lower is better calibrated (0 = perfect)
  calibrationBias: 'OVERCONFIDENT' | 'UNDERCONFIDENT' | 'WELL_CALIBRATED';
  lastEvaluatedAt: string;
  suggestedDiscountFactor: number; // multiplier to adjust future confidence
}
