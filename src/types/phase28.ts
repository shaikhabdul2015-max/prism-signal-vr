/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 28 Type Definitions: Autonomous Mission Research & Execution Intelligence.
 * Covers Objective Understanding, Evidence-Based Autonomous Research,
 * Multi-Tier Evidence Validation, Mission Execution Intelligence,
 * Autonomous Task Orchestration across the 6 specialist agents,
 * Predictive Execution Monitoring, Autonomous Recovery Intelligence under Human Gates,
 * and Cross-Phase Mission Knowledge Integration.
 */

import { AgentRole } from './phase17';

export type SpecialistAgentRole = AgentRole;

// -------------------------------------------------------------
// MODULE 1: MISSION LIFECYCLE & CORE ENTITIES
// -------------------------------------------------------------

export type MissionLifecycleState =
  | 'DRAFT'
  | 'RESEARCHING'
  | 'PLANNING'
  | 'AWAITING_APPROVAL'
  | 'READY'
  | 'EXECUTING'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type MissionPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface MissionObjective {
  id: string;
  title: string;
  statement: string;
  scope: string;
  targetMetrics: {
    minCadenceFps: number;
    maxLatencyMs: number;
    minJointConfidence: number;
    maxAllowedFailures: number;
  };
  constraints: string[];
  priority: MissionPriority;
  assignedLeadAgent: AgentRole;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// MODULE 2: AUTONOMOUS MISSION RESEARCH
// -------------------------------------------------------------

export type ResearchSourceType =
  | 'INTERNAL_TELEMETRY'
  | 'DIAGNOSTIC_BASE'
  | 'HISTORICAL_INCIDENTS'
  | 'DIGITAL_TWIN_ARCHIVE'
  | 'WEBXR_STANDARDS'
  | 'PEER_BENCHMARK'
  | 'OPERATOR_DIRECTIVE';

export type EvidenceVerificationStatus =
  | 'VERIFIED'
  | 'PARTIALLY_VERIFIED'
  | 'UNVERIFIED'
  | 'CONTRADICTED'
  | 'INSUFFICIENT_EVIDENCE';

export interface ResearchCitation {
  citationId: string;
  title: string;
  sourceType: ResearchSourceType;
  referenceUrlOrKey: string;
  reliabilityScore: number; // 0.0 to 1.0
  authorOrProvider: string;
  isPeerReviewedOrVerified: boolean;
  retrievedAt: string;
}

export interface ResearchEvidence {
  evidenceId: string;
  citationId: string;
  claim: string;
  dataSnippet: string;
  verificationStatus: EvidenceVerificationStatus;
  confidenceScore: number; // 0 to 100
  metricKey?: string;
  measuredValue?: string | number;
  isSimulatedData: boolean;
  provenance: string;
  recordedAt: string;
}

export interface ContradictionRecord {
  contradictionId: string;
  primaryClaim: string;
  contradictingClaim: string;
  sourceAId: string;
  sourceBId: string;
  impactOnMission: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedResolution: string;
}

export interface ResearchGap {
  gapId: string;
  missingInformation: string;
  requiredForTask: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  remedyAction: string;
}

export interface MissionResearchResult {
  researchId: string;
  missionId: string;
  researchObjective: string;
  decomposedQuestions: string[];
  sources: ResearchCitation[];
  evidence: ResearchEvidence[];
  verificationStatus: EvidenceVerificationStatus;
  confidenceLevel: number; // 0 to 100
  contradictions: ContradictionRecord[];
  researchGaps: ResearchGap[];
  summary: string;
  researchedAt: string;
}

// -------------------------------------------------------------
// MODULE 3: TASK ORCHESTRATION & DEPENDENCIES
// -------------------------------------------------------------

export type TaskExecutionStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRYING'
  | 'CANCELLED'
  | 'BLOCKED';

export interface TaskDependency {
  precedingTaskId: string;
  requiredStatus: TaskExecutionStatus;
}

export interface MissionExecutionTask {
  taskId: string;
  missionId: string;
  title: string;
  description: string;
  assignedAgent: AgentRole;
  priority: MissionPriority;
  status: TaskExecutionStatus;
  dependencies: TaskDependency[];
  estimatedDurationMs: number;
  actualDurationMs?: number;
  retryCount: number;
  maxRetries: number;
  requiredEvidenceIds: string[];
  verifiedCompletionEvidence?: {
    evidenceSnippet: string;
    verifiedByAgent: AgentRole;
    verifiedAt: string;
    metricProof: Record<string, number | string | boolean>;
  };
  failureReason?: string;
  startedAt?: string;
  completedAt?: string;
}

export interface MissionExecutionPlan {
  planId: string;
  missionId: string;
  version: string;
  tasks: MissionExecutionTask[];
  executionSequence: string[][]; // stages of parallel task IDs
  estimatedTotalDurationMs: number;
  readinessScore: number; // 0 to 100
  requiresOperatorApproval: boolean;
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// MODULE 4: PREDICTIVE EXECUTION MONITORING
// -------------------------------------------------------------

export interface ExecutionAnomaly {
  anomalyId: string;
  taskId?: string;
  metric: string;
  expectedValue: number | string;
  actualValue: number | string;
  deviationPercent: number;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  detectedAt: string;
}

export interface EarlyWarningAlert {
  alertId: string;
  title: string;
  description: string;
  likelihoodPercent: number; // 0 to 100
  estimatedTimeUntilBreachMs: number;
  isSimulatedPrediction: boolean; // strictly true for model forecasts
  recommendedAction: string;
  emittedAt: string;
}

export interface PredictiveExecutionStatus {
  missionId: string;
  state: MissionLifecycleState;
  expectedProgressPercent: number; // 0 to 100
  actualProgressPercent: number; // 0 to 100
  progressVariancePercent: number; // negative is delay
  isDelayed: boolean;
  delayForecastMs: number;
  failureProbability: number; // 0 to 100
  resourceUtilization: {
    cpuPercent: number;
    latencyMs: number;
    frameCadenceFps: number;
    activeWorkerThreads: number;
  };
  anomalies: ExecutionAnomaly[];
  alerts: EarlyWarningAlert[];
  monitoredAt: string;
}

// -------------------------------------------------------------
// MODULE 5: AUTONOMOUS RECOVERY INTELLIGENCE
// -------------------------------------------------------------

export type FailureClassification =
  | 'SENSOR_OCCLUSION'
  | 'CADENCE_THROTTLING'
  | 'DEPENDENCY_TIMEOUT'
  | 'EVIDENCE_DISCREPANCY'
  | 'RESOURCE_EXHAUSTION'
  | 'AGENT_DISAGREEMENT'
  | 'OPERATOR_ABORT';

export type RecoveryStrategyType =
  | 'RETRY_WITH_BACKOFF'
  | 'ALTERNATIVE_TASK_PATH'
  | 'FALLBACK_SAFE_MODE'
  | 'REALLOCATE_AGENT_RESOURCE'
  | 'PAUSE_FOR_OPERATOR_DECISION';

export interface RecoveryRecommendation {
  recommendationId: string;
  missionId: string;
  failedTaskId: string;
  classification: FailureClassification;
  rootCauseSummary: string;
  strategy: RecoveryStrategyType;
  actionSummary: string;
  alternativeSequence?: string[];
  feasibilityScore: number; // 0 to 100
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresHumanApproval: boolean;
  approvalId?: string;
  status: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';
  generatedAt: string;
}

// -------------------------------------------------------------
// MODULE 6: MULTI-AGENT MISSION COLLABORATION
// -------------------------------------------------------------

export interface AgentMissionRoleSpec {
  role: AgentRole;
  responsibilityName: string;
  scopeOfAuthority: string;
  assignedTaskIds: string[];
  activeEvaluationStance: 'CONCUR' | 'CAUTION' | 'DIVERGENT' | 'NEUTRAL';
  evidenceReviewSummary: string;
  confidenceScore: number; // 0 to 100
}

export interface AgentDisagreementRecord {
  disagreementId: string;
  topic: string;
  dissentingAgent: AgentRole;
  counterAgent: AgentRole;
  rationale: string;
  mediationProposal: string;
  escalatedToOperator: boolean;
}

export interface MultiAgentMissionCoordinationState {
  missionId: string;
  agents: AgentMissionRoleSpec[];
  consensusScore: number; // 0 to 100
  activeDisagreements: AgentDisagreementRecord[];
  overallConsensusProposal: string;
  requiresOperatorIntervention: boolean;
  evaluatedAt: string;
}

// -------------------------------------------------------------
// MODULE 7: MISSION KNOWLEDGE & REUSABLE PATTERNS
// -------------------------------------------------------------

export interface ReusableMissionPattern {
  patternId: string;
  name: string;
  domain: string;
  typicalTasks: string[];
  historicalSuccessRate: number; // 0 to 100
  averageDurationMs: number;
  knownPitfalls: string[];
  provenancePhase: number;
}

export interface MissionKnowledgeState {
  patterns: ReusableMissionPattern[];
  historicalOutcomesCount: number;
  crossPhaseConnectionsCount: number;
  outdatedKnowledgeFlagged: string[];
  lastSyncedAt: string;
}

// -------------------------------------------------------------
// MODULE 8: AGGREGATED SYSTEM STATE
// -------------------------------------------------------------

export interface AutonomousMissionEntity {
  id: string;
  objective: MissionObjective;
  state: MissionLifecycleState;
  researchResult: MissionResearchResult | null;
  executionPlan: MissionExecutionPlan | null;
  executionStatus: PredictiveExecutionStatus | null;
  recoveryRecommendations: RecoveryRecommendation[];
  coordination: MultiAgentMissionCoordinationState | null;
  createdAt: string;
  updatedAt: string;
}

export interface AutonomousMissionExecutionSystemState {
  activeMissions: AutonomousMissionEntity[];
  selectedMissionId: string | null;
  knowledgeState: MissionKnowledgeState;
  persistenceMode: 'LOCAL_DEVELOPMENT' | 'CLOUD_FIRESTORE' | 'OFFLINE_FALLBACK';
  lastUpdated: string;
}
