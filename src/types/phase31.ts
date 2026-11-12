/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 31: Distributed AI Architecture & Multi-Agent Intelligence Network Types.
 * Complete type definitions for distributed orchestration, agent networking,
 * workload balancing, inter-agent messaging, knowledge synchronization,
 * circuit breakers, distributed event bus, model routing, and consensus.
 */

import { AgentSpecialistRole, IncidentRecord } from './phase17';

export type DistributedTaskStatus =
  | 'QUEUED'
  | 'ASSIGNED'
  | 'RUNNING'
  | 'WAITING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'
  | 'RETRYING';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export type ExecutionEnvironmentMode = 'LOCAL_DEVELOPMENT' | 'CLOUD_FIRESTORE' | 'OFFLINE_FALLBACK';

export interface DistributedTaskRecord<TPayload = any, TResult = any> {
  id: string;
  idempotencyKey: string;
  taskType: string;
  title: string;
  priority: TaskPriority;
  status: DistributedTaskStatus;
  assignedAgentId: string | null;
  assignedWorkerId: string | null;
  dependencies: string[]; // Task IDs that must complete first
  subtasks?: string[];
  parentTaskId?: string;
  payload: TPayload;
  result?: TResult;
  failureReason?: string;
  retryCount: number;
  maxRetries: number;
  timeoutMs: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  provenance: ExecutionEnvironmentMode;
  executionHost: string; // e.g., 'localhost (Browser Worker)'
  metadata?: Record<string, any>;
}

export type AgentAvailabilityStatus = 'IDLE' | 'BUSY' | 'OFFLINE' | 'DEGRADED';
export type AgentHealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNRESPONSIVE';

export interface DistributedAgentDescriptor {
  id: string; // e.g., 'agent-operations-lead'
  role: AgentSpecialistRole;
  name: string;
  capabilities: string[];
  availability: AgentAvailabilityStatus;
  healthStatus: AgentHealthStatus;
  currentWorkload: number; // Active task count
  maxCapacity: number;
  assignedTaskIds: string[];
  completedTaskCount: number;
  failedTaskCount: number;
  lastHeartbeat: string;
  latencyMs: number;
  endpoint: string;
  permissions: string[];
}

export type MessageCategory =
  | 'TASK_REQUEST'
  | 'TASK_RESPONSE'
  | 'STATUS_UPDATE'
  | 'KNOWLEDGE_SHARE'
  | 'ALERT'
  | 'CONSENSUS_REQUEST'
  | 'CONSENSUS_RESPONSE'
  | 'HEALTH_REPORT';

export interface AgentMessageEnvelope<TData = any> {
  id: string;
  correlationId: string;
  senderId: string;
  receiverId: string; // Specific agent ID or 'BROADCAST'
  category: MessageCategory;
  payload: TData;
  timestamp: string;
  expiresAt: string;
  signature: string; // SHA-256 or pseudo-HMAC digest for integrity
  ackRequired: boolean;
  acknowledgedAt?: string;
  deliveryStatus: 'PENDING' | 'DELIVERED' | 'ACKNOWLEDGED' | 'EXPIRED' | 'REJECTED';
  rejectionReason?: string;
}

export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerRecord {
  id: string;
  targetServiceOrAgent: string;
  state: CircuitBreakerState;
  failureCount: number;
  consecutiveSuccesses: number;
  failureThreshold: number;
  successThreshold: number;
  resetTimeoutMs: number;
  lastFailureTime?: string;
  nextAttemptTime?: string;
  lastStateChange: string;
}

export interface DistributedKnowledgeItem<T = any> {
  id: string;
  key: string;
  domain: string;
  data: T;
  version: number;
  sourceAgentId: string;
  timestamp: string;
  checksum: string;
  conflictState: 'SYNCHRONIZED' | 'CONFLICT_DETECTED' | 'LOCAL_PENDING';
  resolutionStrategy?: 'LATEST_TIMESTAMP' | 'HIGHER_VERSION' | 'MANUAL_SUPERVISOR';
}

export interface DistributedEventRecord<TPayload = any> {
  id: string;
  eventType: string;
  source: string;
  timestamp: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  payload: TPayload;
  acknowledgedBy: string[];
  suppressionFingerprint: string;
  correlatedIncidentId?: string;
}

export interface AIProviderRoute {
  providerId: string;
  name: string;
  modelName: string;
  capabilities: string[];
  healthState: 'ONLINE' | 'DEGRADED' | 'OFFLINE' | 'UNCONFIGURED';
  averageLatencyMs: number;
  costPer1kTokensUSD: number | null; // Null if free/browser-local
  activeRequests: number;
  rateLimitRemaining: number;
  lastEvaluatedAt: string;
  isFallback: boolean;
}

export interface DistributedConsensusOpinion {
  agentId: string;
  agentRole: AgentSpecialistRole;
  stance: 'APPROVE' | 'REJECT' | 'ABSTAIN' | 'MODIFY';
  confidence: number; // 0 - 100
  rationale: string;
  suggestedAction?: string;
  timestamp: string;
}

export interface DistributedConsensusReport {
  id: string;
  topic: string;
  taskOrIncidentId?: string;
  participatingAgents: string[];
  opinions: DistributedConsensusOpinion[];
  agreementLevel: number; // 0 - 100%
  disagreements: string[];
  confidenceScore: number;
  unresolvedQuestions: string[];
  finalRecommendation: string;
  requiresHumanApproval: boolean;
  humanApprovalState: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_REQUIRED';
  approvedBy?: string;
  createdAt: string;
}

export interface SystemAuditHistoryRecord {
  id: string;
  timestamp: string;
  category: 'TASK' | 'AGENT' | 'MESSAGE' | 'KNOWLEDGE' | 'FAULT' | 'SECURITY' | 'CONSENSUS';
  action: string;
  actor: string;
  details: string;
  success: boolean;
}

export interface DistributedPlatformOverview {
  totalTasksRegistered: number;
  tasksCompleted: number;
  tasksQueuedOrRunning: number;
  tasksFailed: number;
  activeAgentsCount: number;
  healthyAgentsCount: number;
  totalMessagesExchanged: number;
  knowledgeEntitiesSynced: number;
  circuitBreakersTripped: number;
  eventsDispatched: number;
  environmentMode: ExecutionEnvironmentMode;
  systemHealthScore: number; // 0 - 100
}
