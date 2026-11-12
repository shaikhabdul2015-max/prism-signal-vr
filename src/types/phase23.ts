/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23: Advanced Autonomous Command & Control System Types.
 * Defines schemas for Unified Command Center module registration,
 * autonomous operations, human approval gates, predictive mission control,
 * multi-agent command distribution, system intelligence monitoring,
 * and hash-chained command audit trails.
 */

import { AgentRole } from './phase17';
import { DatabaseMode } from './phase19';
import { MissionPriority, MissionState } from './phase20';

// ============================================================================
// 1. Unified Command Center & Module Registry
// ============================================================================

export type ModuleCategory =
  | 'CORE_TELEMETRY'
  | 'AI_INTELLIGENCE'
  | 'DIGITAL_TWIN'
  | 'MISSION_PLANNING'
  | 'SECURITY_RBAC'
  | 'CLOUD_INFRASTRUCTURE'
  | 'ORCHESTRATION';

export type ModuleHealthStatus = 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'OFFLINE';

export interface RegisteredModule {
  moduleId: string;
  name: string;
  category: ModuleCategory;
  version: string;
  status: ModuleHealthStatus;
  lastHeartbeat: string;
  latencyMs: number;
  activeWorkloads: number;
  capabilities: string[];
  metrics?: Record<string, string | number | boolean>;
}

export type CommandImpactLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CommandExecutionStatus =
  | 'QUEUED'
  | 'PENDING_APPROVAL'
  | 'EXECUTING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REJECTED'
  | 'EXPIRED';

export interface CommandExecutionRecord {
  commandId: string;
  commandName: string;
  targetModuleId: string;
  initiator: AgentRole | 'OPERATOR' | 'AUTONOMOUS_OPERATIONS_MANAGER';
  parameters: Record<string, unknown>;
  impactLevel: CommandImpactLevel;
  status: CommandExecutionStatus;
  requiresApproval: boolean;
  approvalId?: string;
  dispatchedAt: string;
  completedAt?: string;
  resultSummary?: string;
  errorMessage?: string;
  retryCount: number;
  maxRetries: number;
}

// ============================================================================
// 2. Human-in-the-Loop Approval Manager
// ============================================================================

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface ApprovalRequest {
  approvalId: string;
  commandId: string;
  commandName: string;
  actionSummary: string;
  initiator: AgentRole | 'AUTONOMOUS_OPERATIONS_MANAGER';
  targetModule: string;
  impactLevel: CommandImpactLevel;
  justification: string;
  riskAssessmentSummary: string;
  status: ApprovalStatus;
  createdAt: string;
  expiresAt: string; // Timeout protection
  decidedAt?: string;
  decidedBy?: string;
  decisionNotes?: string;
}

// ============================================================================
// 3. Multi-Agent Command Coordination
// ============================================================================

export interface AgentTaskAssignment {
  assignmentId: string;
  agent: AgentRole;
  commandId: string;
  title: string;
  priority: MissionPriority;
  status: 'ASSIGNED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED';
  assignedAt: string;
  completedAt?: string;
  evidence: string[];
}

export interface AgentConflictEvent {
  conflictId: string;
  involvedAgents: AgentRole[];
  conflictingDirectives: string[];
  detectedAt: string;
  resolutionStrategy: 'PRIORITY_OVERRIDE' | 'CONSENSUS_DEBATE' | 'OPERATOR_ESCALATION';
  winningDirective?: string;
  resolvedAt?: string;
  isResolved: boolean;
}

export interface MultiAgentConsensus {
  consensusId: string;
  topic: string;
  consensusScore: number; // 0.0 to 1.0
  participatingAgents: AgentRole[];
  unanimous: boolean;
  recommendation: string;
  explanation: string;
  timestamp: string;
}

// ============================================================================
// 4. Predictive Mission Control & Digital Twin Sync
// ============================================================================

export interface MissionRiskVector {
  dimension: 'HARDWARE_SENSORS' | 'FRAME_CADENCE' | 'NETWORK_LATENCY' | 'OPTICAL_TRACKING' | 'THERMAL_HEADROOM';
  riskScore: number; // 0 to 100
  status: 'LOW' | 'ELEVATED' | 'CRITICAL';
  projectedImpact: string;
  isMeasuredData: boolean; // Must clearly distinguish measured data from simulated predictions
}

export interface PredictiveMissionAssessment {
  assessmentId: string;
  missionId: string;
  failureProbabilityPercent: number; // 0 to 100
  overallRiskLevel: 'NOMINAL' | 'MODERATE' | 'SEVERE';
  riskVectors: MissionRiskVector[];
  twinSyncIntegrity: {
    twinSnapshotId: string;
    synchronized: boolean;
    driftMs: number;
    checksum: string;
  };
  interruptionWarnings: string[];
  recommendedMitigations: string[];
  evaluationTimestamp: string;
  uncertaintyDisclaimer: string;
}

// ============================================================================
// 5. Real-Time System Intelligence Monitor
// ============================================================================

export interface SystemIntelligenceReport {
  overallHealthScore: number; // 0 to 100
  operationalVerdict: 'ALL_SYSTEMS_NOMINAL' | 'DEGRADED_PERFORMANCE' | 'CRITICAL_INTERVENTION_REQUIRED';
  timestamp: string;
  telemetry: {
    cadenceFps: number | 'Unavailable';
    frameDeltaMs: number | 'Unavailable';
    trackedJoints: number | 'Unavailable';
    expectedJoints: number;
    latencyMs: number | 'Unavailable';
    trackingState: string;
  };
  memoryUsageMb: number | 'Unavailable';
  activeIncidentsCount: number;
  cloudSync: {
    mode: DatabaseMode;
    connected: boolean;
    pendingQueueLength: number;
    statusLabel: string;
  };
  agentAvailability: Record<AgentRole, {
    status: 'AVAILABLE' | 'BUSY' | 'OFFLINE';
    activeTaskCount: number;
  }>;
}

// ============================================================================
// 6. Advanced Hash-Chained Audit Trails
// ============================================================================

export interface HashChainedAuditRecord {
  auditId: string;
  sequenceNumber: number;
  previousHash: string;
  currentHash: string;
  timestamp: string;
  eventType: 'COMMAND_DISPATCHED' | 'APPROVAL_GRANTED' | 'APPROVAL_REJECTED' | 'EXECUTION_SUCCESS' | 'EXECUTION_FAILED' | 'OPERATOR_OVERRIDE';
  actor: AgentRole | 'OPERATOR' | 'AUTONOMOUS_OPERATIONS_MANAGER';
  commandId?: string;
  approvalId?: string;
  details: string;
  impactLevel: CommandImpactLevel;
  databaseMode: DatabaseMode;
  immutableStorageVerified: boolean; // Must NOT claim immutability unless backend immutable storage exists
}
