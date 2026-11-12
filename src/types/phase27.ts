/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 27 Type Definitions: Advanced Strategic Intelligence Engine.
 * Covers Strategic Objective Decomposition, Long-Term Mission Planning,
 * Multi-Tier Scenario Intelligence (with strict isSimulatedData flags),
 * Quantitative Risk Intelligence across 7 categories,
 * Multi-Agent Strategic Coordination (with consensus and disagreement detection),
 * Strategic Knowledge Association & Assumption Auditing, and
 * Strategy Trade-Off Optimization under Human-in-the-Loop Governance.
 * 
 * NOTE: This is an AGI-inspired decision-support architecture for mission-critical
 * WebXR and spatial telemetry operations. It does not claim Artificial General Intelligence,
 * sentience, or unconstrained autonomous action.
 */

import { AgentRole } from './phase17';

export type SpecialistAgentType = AgentRole;

// -------------------------------------------------------------
// MODULE 1: STRATEGIC OBJECTIVES & ROADMAP
// -------------------------------------------------------------

export type StrategicHorizon = 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';

export type StrategicPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type ObjectiveStatus =
  | 'DRAFT'
  | 'ANALYZING'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'ACHIEVED'
  | 'SUPERSEDED';

export type MilestoneStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'AT_RISK';

export interface StrategicObjective {
  id: string;
  title: string;
  description: string;
  horizon: StrategicHorizon;
  priority: StrategicPriority;
  targetMetrics: {
    minCadenceFps: number;
    maxLatencyMs: number;
    minJointConfidence: number;
    maxIncidentRatePerHour: number;
  };
  constraints: string[];
  dependencies: string[]; // objective IDs
  status: ObjectiveStatus;
  progressPercent: number; // 0 - 100
  feasibilityScore: number; // 0 - 100
  resourceRequirementSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface StrategicMilestone {
  id: string;
  objectiveId: string;
  title: string;
  description: string;
  horizon: StrategicHorizon;
  dependencies: string[]; // milestone IDs
  estimatedDurationHours: number;
  criticalPath: boolean;
  status: MilestoneStatus;
  completionProbability: number; // 0 - 100
  completionDeadline: string;
}

export interface StrategicPlan {
  id: string;
  name: string;
  version: string;
  objectives: StrategicObjective[];
  milestones: StrategicMilestone[];
  criticalPathMilestoneIds: string[];
  overallFeasibility: number; // 0 - 100
  estimatedCompletionTime: string;
  dynamicRevisionCount: number;
  lastRevisionReason?: string;
  approvedByOperator: boolean;
  approvalId?: string;
  createdAt: string;
  updatedAt: string;
}

// -------------------------------------------------------------
// MODULE 2: STRATEGIC SCENARIO ANALYSIS
// -------------------------------------------------------------

export type StrategicScenarioType =
  | 'BEST_CASE'
  | 'EXPECTED'
  | 'WORST_CASE'
  | 'ALTERNATIVE_PATH';

export interface StrategicScenario {
  id: string;
  type: StrategicScenarioType;
  name: string;
  description: string;
  probability: number; // 0 - 100
  projectedCadenceFps: number;
  projectedLatencyMs: number;
  projectedIncidentLikelihood: number; // 0 - 100
  resourceEfficiencyScore: number; // 0 - 100
  cascadingRisks: string[];
  isSimulatedData: boolean; // Always true for predictions and digital twin models
  counterfactualParameters?: Record<string, number | string>;
  recommendation: string;
  estimatedSurvivalProbability: number; // 0 - 100
}

export interface ScenarioAnalysisReport {
  id: string;
  generatedAt: string;
  evaluatedObjectiveId: string;
  scenarios: StrategicScenario[];
  recommendedScenarioId: string;
  divergenceIndex: number; // 0 - 100
  sensitivityAnalysis: {
    latencySensitivity: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    thermalPressureImpact: string;
    framerateResilience: string;
  };
  isSimulatedData: boolean;
}

// -------------------------------------------------------------
// MODULE 3: STRATEGIC RISK INTELLIGENCE
// -------------------------------------------------------------

export type RiskCategory =
  | 'TECHNICAL'
  | 'MISSION_EXECUTION'
  | 'PERFORMANCE'
  | 'INFRASTRUCTURE'
  | 'DATA_INTEGRITY'
  | 'SECURITY'
  | 'RESOURCE';

export interface StrategicRisk {
  id: string;
  category: RiskCategory;
  title: string;
  description: string;
  severityScore: number; // 1 - 100
  probabilityScore: number; // 1 - 100
  compositeRiskScore: number; // 1 - 100
  earlyWarningIndicators: string[];
  isTriggered: boolean;
  triggerThresholdText: string;
  mitigationStrategy: string;
  residualRiskScore: number; // 1 - 100
  dependentRiskIds: string[];
}

export interface StrategicRiskSummary {
  overallSystemRiskScore: number; // 1 - 100
  riskLevel: 'NOMINAL' | 'ELEVATED' | 'HIGH' | 'CRITICAL';
  risks: StrategicRisk[];
  topVulnerabilities: string[];
  cascadingChains: string[][];
  evaluatedAt: string;
}

// -------------------------------------------------------------
// MODULE 4: MULTI-AGENT STRATEGIC COORDINATION
// -------------------------------------------------------------

export type AgentStance = 'CONCUR' | 'DIVERGENT' | 'CAUTION' | 'NEUTRAL';

export interface AgentStrategicPosition {
  agentRole: AgentRole;
  agentName: string;
  priorityFocus: string;
  confidenceScore: number; // 0 - 100
  recommendedStrategicDirection: string;
  stance: AgentStance;
  rationale: string;
}

export interface DisagreementRecord {
  id: string;
  issue: string;
  agentPositions: {
    agentRole: AgentRole;
    agentName: string;
    position: string;
    stance: AgentStance;
  }[];
  consensusResolutionProposal: string;
  requiresHumanIntervention: boolean;
}

export interface StrategicAgentCoordinationResult {
  timestamp: string;
  agentPositions: AgentStrategicPosition[];
  consensusIndex: number; // 0 - 100
  overallStrategicDirection: string;
  activeDisagreements: DisagreementRecord[];
  humanApprovalRequired: boolean;
}

// -------------------------------------------------------------
// MODULE 5: STRATEGIC KNOWLEDGE & ASSUMPTION AUDIT
// -------------------------------------------------------------

export interface OutdatedAssumptionAudit {
  id: string;
  assumption: string;
  initialContext: string;
  invalidatedReason: string;
  flaggedAt: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'AUDITED' | 'REQUIRES_REVISION' | 'RESOLVED';
}

export interface StrategicKnowledgeAssociation {
  id: string;
  topic: string;
  objectiveId?: string;
  historicalIncidentRefs: string[];
  relatedPhases: number[];
  verifiedAxioms: string[];
  outdatedAssumptions: OutdatedAssumptionAudit[];
  provenance: string;
  lastVerifiedAt: string;
}

// -------------------------------------------------------------
// MODULE 6: STRATEGY OPTIMIZATION & TRADE-OFF ARBITRATION
// -------------------------------------------------------------

export interface StrategyTradeoffAnalysis {
  strategyId: string;
  name: string;
  description: string;
  performanceGainPercent: number; // -50 to +100
  reliabilityMarginPercent: number; // 0 to 100
  safetyIndexPercent: number; // 0 to 100
  latencyBudgetDeltaMs: number; // negative is improvement
  energyConsumptionWatts: number;
  compositeScore: number; // 0 to 100
  isRecommended: boolean;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface StrategyOptimizationReport {
  id: string;
  generatedAt: string;
  competingStrategies: StrategyTradeoffAnalysis[];
  recommendedStrategyId: string;
  optimizationRationale: string;
  humanApprovalId?: string;
  humanApproved: boolean;
  isSimulatedEvaluation: boolean;
}

// -------------------------------------------------------------
// PERSISTENCE & OVERALL STATE
// -------------------------------------------------------------

export type PersistenceStorageMode = 'LOCAL_DEVELOPMENT' | 'CLOUD_FIRESTORE' | 'OFFLINE_FALLBACK';

export interface StrategicIntelligenceState {
  latestPlan: StrategicPlan | null;
  activeScenarios: StrategicScenario[];
  riskSummary: StrategicRiskSummary;
  coordination: StrategicAgentCoordinationResult;
  knowledgeSummary: StrategicKnowledgeAssociation[];
  optimizationReport: StrategyOptimizationReport | null;
  persistenceMode: PersistenceStorageMode;
  lastUpdated: string;
}
