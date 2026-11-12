/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 22: Advanced Autonomous Mission Intelligence Platform Types.
 * Enables intelligent mission generation, task decomposition, dynamic adaptation,
 * context-aware autonomous decisions, multi-agent mission distribution,
 * predictive risk forecasting, digital twin synchronization, and operator approval gates.
 */

import { AgentRole } from './phase17';
import { VRTelemetry } from './diagnostics';
import {
  MissionPriority,
  MissionState,
  MissionTaskStatus,
} from './phase20';
import { DigitalTwinSnapshot } from './phase21';

// ============================================================================
// 1. Mission Intelligence & Feasibility Types
// ============================================================================

export type MissionObjectiveType =
  | 'STABILITY_SWEEP'
  | 'RESONANCE_ALIGNMENT'
  | 'THERMAL_CADENCE_RECOVERY'
  | 'OPTICAL_TRACKING_CALIBRATION'
  | 'CLOUD_RESILIENCE_AUDIT'
  | 'DIGITAL_TWIN_PREDICTIVE_STRESS';

export interface MissionFeasibilityAssessment {
  score: number; // 0 to 100
  isFeasible: boolean;
  estimatedDurationMs: number;
  computeBudgetUnits: number;
  requiredAgents: AgentRole[];
  bottlenecks: string[];
  prerequisites: string[];
  evaluatedAt: string;
}

export interface MissionRiskAssessment {
  overallRiskScore: number; // 0 to 100
  failureProbabilityPercent: number; // 0 to 100
  resourceRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  trackingStabilityRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  environmentalRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  performanceDegradationForecast: string;
  uncertaintyDisclosure: string; // Strictly prohibits presenting predictions as guaranteed outcomes
  evaluatedAt: string;
}

// ============================================================================
// 2. Autonomous Decisions & Human Approval Workflows
// ============================================================================

export interface AlternativeDecision {
  action: string;
  agent: AgentRole;
  tradeOff: string;
  confidence: number; // 0.0 to 1.0
}

export interface AutonomousMissionDecision {
  decisionId: string;
  missionId: string;
  topic: string;
  chosenAction: string;
  rationale: string;
  confidenceScore: number; // 0.0 to 1.0
  evidence: string[];
  alternatives: AlternativeDecision[];
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  requiresOperatorApproval: boolean;
  operatorApproved: boolean;
  operatorApprovedBy?: string;
  operatorApprovedAt?: string;
  uncertaintyReport: string;
  createdAt: string;
}

// ============================================================================
// 3. Dynamic Adaptation & Mission Tasks
// ============================================================================

export type AdaptationTrigger =
  | 'ENVIRONMENTAL_SHIFT'
  | 'CADENCE_DEGRADATION'
  | 'TRACKING_LOSS'
  | 'OPERATOR_INTERVENTION'
  | 'DEADLOCK_RECOVERY';

export interface DynamicAdaptationRecord {
  adaptationId: string;
  missionId: string;
  timestamp: string;
  trigger: AdaptationTrigger;
  triggerDetail: string;
  actionsTaken: string[];
  tasksInjected: string[];
  tasksReprioritized: string[];
  confidenceScore: number;
}

export interface AutonomousMissionTask {
  taskId: string;
  title: string;
  description: string;
  assignedAgent: AgentRole;
  dependencies: string[];
  status: MissionTaskStatus;
  estimatedDurationMs: number;
  actualDurationMs?: number;
  isHighImpact: boolean;
  operatorApproved: boolean;
  retryCount: number;
  maxRetries: number;
  resultSummary?: string;
  assignedAt?: string;
  completedAt?: string;
  isolatedFromHardware?: boolean;
}

export interface AutonomousMission {
  missionId: string;
  title: string;
  objectiveType: MissionObjectiveType;
  description: string;
  priority: MissionPriority;
  state: MissionState;
  tasks: AutonomousMissionTask[];
  feasibility: MissionFeasibilityAssessment;
  riskAssessment: MissionRiskAssessment;
  decisions: AutonomousMissionDecision[];
  adaptations: DynamicAdaptationRecord[];
  twinSnapshotRef?: {
    snapshotId: string;
    checksum: string;
    version: number;
  };
  progressPercent: number; // 0 to 100
  requiresHumanApproval: boolean;
  humanApprovalGranted: boolean;
  healthScore: number; // 0 to 100
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  lastUpdated: string;
}

// ============================================================================
// 4. Execution Controller & Audit Log Types
// ============================================================================

export interface MissionExecutionLog {
  logId: string;
  missionId: string;
  taskId?: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  message: string;
  actor: AgentRole | 'OPERATOR' | 'EXECUTION_CONTROLLER';
  timestamp: string;
}

export interface MissionExecutionSnapshot {
  activeMissions: AutonomousMission[];
  executionQueue: AutonomousMission[];
  completedMissions: AutonomousMission[];
  approvalQueue: AutonomousMissionTask[];
  logs: MissionExecutionLog[];
  isExecutionPaused: boolean;
  overallMissionHealth: number;
  lastSyncTimestamp: string;
}
