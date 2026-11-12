/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 20: Collective Autonomous Intelligence System Types.
 * Enables multi-agent collaboration, agent-to-agent communication,
 * debate engine, intelligent mission planning, shared intelligence memory,
 * autonomous task distribution, and explainable AI decision tracking.
 */

import { AgentRole } from './phase17';

// ============================================================================
// 1. Agent-to-Agent Communication & Messaging
// ============================================================================

export type AgentMessageType =
  | 'TASK_REQUEST'
  | 'TASK_ACK'
  | 'EVIDENCE_SHARE'
  | 'DEBATE_PROPOSAL'
  | 'CONSENSUS_VOTE'
  | 'STATUS_UPDATE'
  | 'ALERT_BROADCAST';

export interface AgentMessage {
  messageId: string;
  sender: AgentRole;
  recipient: AgentRole | 'BROADCAST';
  messageType: AgentMessageType;
  content: string;
  payload?: Record<string, unknown>;
  timestamp: string;
  requiresAck: boolean;
  acknowledged: boolean;
  correlationId?: string;
}

export interface AgentWorkloadStatus {
  agent: AgentRole;
  currentTaskCount: number;
  maxCapacity: number;
  isAvailable: boolean;
  activeTaskId?: string;
  lastActiveTimestamp: string;
}

// ============================================================================
// 2. Multi-Agent Debate & Consensus Engine
// ============================================================================

export interface AgentDebateArgument {
  argumentId: string;
  agent: AgentRole;
  position: string;
  confidence: number; // 0.0 to 1.0
  evidence: string[];
  counterArguments: string[];
  recommendedAction: string;
  timestamp: string;
}

export interface DebateTopic {
  topicId: string;
  title: string;
  context: Record<string, unknown>;
  arguments: AgentDebateArgument[];
  initiatedAt: string;
  closedAt?: string;
  isResolved: boolean;
  resolution?: DebateResolution;
}

export interface DebateResolution {
  topicId: string;
  consensusScore: number; // 0.0 to 1.0
  conflictsDetected: string[];
  winningSynthesis: string;
  justification: string;
  rule2ComplianceChecked: boolean;
  resolvedAt: string;
  unanimityRatio: number; // 0.0 to 1.0
}

// ============================================================================
// 3. Intelligent Mission Planning & Execution
// ============================================================================

export type MissionPriority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type MissionState =
  | 'PLANNING'
  | 'PENDING_APPROVAL'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABORTED';

export type MissionTaskStatus =
  | 'PENDING'
  | 'READY'
  | 'ASSIGNED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface MissionTask {
  taskId: string;
  title: string;
  description: string;
  assignedAgent: AgentRole;
  dependencies: string[]; // task IDs that must complete first
  status: MissionTaskStatus;
  estimatedDurationMs: number;
  actualDurationMs?: number;
  isHighImpact: boolean; // Requires human operator approval if true
  operatorApproved?: boolean;
  retryCount: number;
  maxRetries: number;
  resultSummary?: string;
  assignedAt?: string;
  completedAt?: string;
}

export interface VRIntelligenceMission {
  missionId: string;
  title: string;
  objective: string;
  priority: MissionPriority;
  state: MissionState;
  tasks: MissionTask[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progressPercent: number; // 0 to 100
  requiresHumanApproval: boolean;
  humanApprovalGranted: boolean;
  impactScore: number; // 0 to 100
}

// ============================================================================
// 4. Shared Intelligence Memory
// ============================================================================

export type MemoryCategory =
  | 'DECISION'
  | 'MISSION_OUTCOME'
  | 'INCIDENT_PATTERN'
  | 'RECOVERY_RESULT'
  | 'VERIFIED_RECOMMENDATION';

export interface IntelligenceMemoryItem {
  memoryId: string;
  category: MemoryCategory;
  title: string;
  summary: string;
  tags: string[];
  evidenceHash: string;
  contributingAgents: AgentRole[];
  confidenceScore: number;
  verified: boolean;
  recordedAt: string;
  retentionTtlDays?: number;
}

// ============================================================================
// 5. Explainable AI Decision System
// ============================================================================

export interface AlternativeRecommendation {
  agent: AgentRole;
  recommendation: string;
  tradeOff: string;
  confidence: number;
}

export interface ExplainableDecision {
  decisionId: string;
  title: string;
  decisionSummary: string;
  primaryRecommendation: string;
  supportingEvidence: string[];
  participatingAgents: AgentRole[];
  alternativeRecommendations: AlternativeRecommendation[];
  confidenceScore: number; // 0.0 to 1.0
  uncertaintyDisclosure: string;
  humanApprovalStatus: 'APPROVED' | 'PENDING' | 'REJECTED' | 'NOT_REQUIRED';
  createdAt: string;
}

// ============================================================================
// 6. Collective Intelligence Center Snapshot
// ============================================================================

export interface CollectiveIntelligenceSnapshot {
  activeMissions: VRIntelligenceMission[];
  recentMessages: AgentMessage[];
  recentDebates: DebateTopic[];
  recentDecisions: ExplainableDecision[];
  memoryItems: IntelligenceMemoryItem[];
  workloads: Record<AgentRole, AgentWorkloadStatus>;
  consensusAverageScore: number; // 0.0 to 1.0
  pendingApprovalCount: number;
  timestamp: string;
}
