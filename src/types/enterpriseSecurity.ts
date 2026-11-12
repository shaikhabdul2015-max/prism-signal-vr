/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Enterprise Security, Zero-Trust Architecture, Observability,
 * Disaster Recovery & Chaos Engineering Types (Stage 4).
 */

import { TenantRole } from './multiTenantSync';

// ============================================================================
// 1. Zero-Trust & Authorization Types
// ============================================================================

export interface SecurityPrincipal {
  userId: string;
  email: string | null;
  role: TenantRole;
  tenantId: string;
  isTokenVerified: boolean;
  tokenExpiresAt: number;
  sessionNonce: string;
}

export type SecurityAction = 'READ' | 'WRITE' | 'DELETE' | 'EXECUTE' | 'ADMIN';

export interface AuthorizationRequest {
  principal: SecurityPrincipal;
  resource: string;
  action: SecurityAction;
  tenantId: string;
  context?: {
    clientIp?: string;
    userAgent?: string;
    timestamp?: string;
    attributes?: Record<string, unknown>;
  };
}

export interface AuthorizationDecision {
  allowed: boolean;
  decisionId: string;
  principalId: string;
  tenantId: string;
  resource: string;
  action: SecurityAction;
  evaluatedAt: string;
  reason: string;
  policyId: string;
}

// ============================================================================
// 2. Distributed Tracing Types (W3C Trace Context Compliant)
// ============================================================================

export interface TraceContext {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  traceFlags: string; // e.g. "01" (sampled)
}

export interface SpanRecord {
  spanId: string;
  traceId: string;
  parentSpanId?: string;
  name: string;
  service: string;
  startTimeUs: number;
  endTimeUs?: number;
  durationUs?: number;
  statusCode: 'OK' | 'ERROR' | 'UNSET';
  attributes: Record<string, string | number | boolean>;
  events: { name: string; timestampUs: number; attributes?: Record<string, unknown> }[];
  statusMessage?: string;
}

// ============================================================================
// 3. Centralized Observability & Telemetry Types
// ============================================================================

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';

export interface StructuredLogRecord {
  logId: string;
  timestamp: string;
  level: LogLevel;
  service: string;
  message: string;
  traceId?: string;
  spanId?: string;
  tenantId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  sanitized: boolean;
}

export interface EnterpriseSystemMetrics {
  timestamp: string;
  uptimeSeconds: number;
  eventProcessingThroughputEps: number;
  queueDepth: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  memoryPressurePct: number;
  cloudSyncStatus: 'HEALTHY' | 'DEGRADED' | 'OFFLINE';
  authFailureCount: number;
  apiErrorRatePct: number;
  webxrSessionState: 'IDLE' | 'ACTIVE' | 'ERROR' | 'UNSUPPORTED';
  gpuRecoveryEventsCount: number;
  tenantCounts: {
    activeTenants: number;
    totalDocuments: number;
    pendingReplications: number;
  };
}

// ============================================================================
// 4. Disaster Recovery & Backup Types
// ============================================================================

export interface TenantBackupSnapshot {
  backupId: string;
  tenantId: string;
  createdAt: string;
  documentCount: number;
  documents: Record<string, unknown>[];
  checksumSha256: string;
  rpoTargetSeconds: number;
  rtoTargetMs: number;
  status: 'VALID' | 'CORRUPTED' | 'RESTORING' | 'EXPIRED';
  createdBy: string;
}

export interface RestorationResult {
  success: boolean;
  backupId: string;
  tenantId: string;
  restoredAt: string;
  restoredDocumentsCount: number;
  restorationDurationMs: number;
  checksumVerified: boolean;
  error?: string;
}

// ============================================================================
// 5. Chaos Engineering Types
// ============================================================================

export type ChaosFaultType =
  | 'NETWORK_PARTITION'
  | 'API_TIMEOUT'
  | 'AUTH_SERVICE_FAILURE'
  | 'CLOUD_SYNC_DISRUPTION'
  | 'DATABASE_FAILURE'
  | 'QUEUE_BURST_FLOOD'
  | 'MEMORY_PRESSURE_SPIKE';

export interface ChaosExperimentConfig {
  experimentId: string;
  faultType: ChaosFaultType;
  durationMs: number;
  intensityPct: number; // 0 to 100
  targetService: string;
}

export interface ChaosExperimentResult {
  experimentId: string;
  faultType: ChaosFaultType;
  startedAt: string;
  completedAt: string;
  detectionTimeMs: number;
  recoveryTimeMs: number;
  dataIntegrityMaintained: boolean;
  eventLossCount: number;
  duplicateOperationsCount: number;
  systemRemainedResponsive: boolean;
}
