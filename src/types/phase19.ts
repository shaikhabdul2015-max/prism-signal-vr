/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 19: Autonomous Intelligence, Self-Healing Engine,
 * Root Cause Analysis, Adaptive Performance Optimization, and Unified Intelligence.
 */

import { VRTelemetry } from './diagnostics';
import { IncidentRecord, AgentSpecialistRole } from './phase17';
import { UpgradedIncidentRecord } from './phase18';

// ============================================================================
// 1. Self-Healing Engine Types
// ============================================================================

export type SelfHealingActionType =
  | 'recalibrate_skeleton'
  | 'stabilize_frame_pacing'
  | 'dynamic_resolution_downscale'
  | 'dynamic_resolution_restore'
  | 'purge_telemetry_buffers'
  | 'request_tracking_reacquisition'
  | 'adjust_quality_profile';

export type HealingExecutionStatus =
  | 'idle'
  | 'evaluating'
  | 'applying'
  | 'verifying'
  | 'resolved'
  | 'failed'
  | 'cooldown';

export interface HealingAttemptRecord {
  id: string;
  incidentId: string;
  actionType: SelfHealingActionType;
  status: 'success' | 'failure' | 'aborted';
  timestamp: string;
  retryCount: number;
  maxRetriesAllowed: number;
  preMetricValue: number;
  postMetricValue?: number;
  recoveryDurationMs: number;
  remediationDetails: string;
  rule2Notice?: string;
}

export interface SelfHealingPolicy {
  maxRetriesPerIncident: number;
  backoffCooldownMs: number;
  antiLoopMaxAttemptsPerWindow: number;
  antiLoopWindowMs: number;
  autoHealEnabled: boolean;
  minConfidenceToAct: number; // e.g. 0.70
}

export interface SelfHealingEngineState {
  status: HealingExecutionStatus;
  policy: SelfHealingPolicy;
  activeAttempts: HealingAttemptRecord[];
  history: HealingAttemptRecord[];
  antiLoopTriggered: boolean;
  totalResolvedCount: number;
  totalFailedCount: number;
  lastActionTimestamp: string | null;
}

// ============================================================================
// 2. Root Cause Analyzer Types
// ============================================================================

export type RootCauseCategory =
  | 'optical_sensor_occlusion'
  | 'rendering_pipeline_bottleneck'
  | 'memory_pressure_exhaustion'
  | 'network_cloud_partition'
  | 'environmental_inconclusive'
  | 'skeleton_joint_drift';

export interface DetailedHypothesis {
  id: string;
  category: RootCauseCategory;
  title: string;
  description: string;
  confidenceScore: number; // 0 to 100
  supportingEvidence: string[];
  counterEvidence: string[];
  recommendedActions: SelfHealingActionType[];
  rule2Assessment: {
    status: 'INCONCLUSIVE' | 'CONFIRMED';
    explanation: string;
    hardwareTokenVerified: boolean;
  };
}

export interface RootCauseComprehensiveReport {
  sessionId: string;
  timestamp: string;
  incidentId?: string;
  primaryHypothesis: DetailedHypothesis | null;
  competingHypotheses: DetailedHypothesis[];
  overallSystemHealthScore: number; // 0 to 100
  recommendedImmediateAction: SelfHealingActionType | null;
  correlationChain: string[];
  auditProof: string;
}

// ============================================================================
// 3. Adaptive Performance Optimizer Types
// ============================================================================

export type PerformanceProfileLevel =
  | 'Ultra'
  | 'High'
  | 'Balanced'
  | 'Performance'
  | 'PowerSaver';

export interface AdaptivePerformanceConfig {
  profile: PerformanceProfileLevel;
  renderScale: number; // 0.5 to 1.0
  shadowQuality: 'off' | 'low' | 'high';
  particleDensity: number; // 0.1 to 1.0
  skeletonSmoothingWeight: number; // 0.1 to 1.0
  targetFps: number; // 72, 90, or 120
  cadenceToleranceMs: number;
  autoOptimizationEnabled: boolean;
}

export interface PerformanceAdaptationEvent {
  id: string;
  timestamp: string;
  trigger: 'cadence_drop' | 'memory_spike' | 'tracking_lag' | 'manual_override' | 'cadence_recovery';
  previousProfile: PerformanceProfileLevel;
  newProfile: PerformanceProfileLevel;
  previousRenderScale: number;
  newRenderScale: number;
  fpsAtTrigger: number;
  targetFps: number;
  reason: string;
}

export interface AdaptivePerformanceState {
  config: AdaptivePerformanceConfig;
  currentFps: number;
  recentAdaptations: PerformanceAdaptationEvent[];
  throttlingActive: boolean;
  cooldownRemainingMs: number;
}

// ============================================================================
// 4. Autonomous Intelligence Dashboard Types
// ============================================================================

export interface AutonomousIntelligenceSnapshot {
  timestamp: string;
  healingState: SelfHealingEngineState;
  latestDiagnosis: RootCauseComprehensiveReport | null;
  adaptivePerformance: AdaptivePerformanceState;
  activePredictiveRisksCount: number;
  sixAgentConsensusConfidence: number; // 0.0 to 1.0
  autonomousSystemReliabilityIndex: number; // 0 to 100
  auditLogsCount: number;
}

// ============================================================================
// 5. Phase 19.5: Database Modes & Cloud Infrastructure Health
// ============================================================================

export type DatabaseMode =
  | 'LOCAL_DEVELOPMENT'
  | 'CLOUD_FIRESTORE'
  | 'OFFLINE_FALLBACK';

export type CloudInfrastructureHealth =
  | 'HEALTHY'
  | 'DEGRADED_CLOUD_MODE'
  | 'OFFLINE_ISOLATED';

export interface SyncAuditRecord {
  id: string;
  timestamp: string;
  operationId: string;
  recordsCount: number;
  status: 'SUCCESS' | 'FAILED' | 'QUEUED' | 'RECOVERED';
  hashProof: string;
  details: string;
  databaseMode: DatabaseMode;
}

export interface InfrastructureHealthReport {
  activeMode: DatabaseMode;
  targetMode: DatabaseMode;
  cloudHealth: CloudInfrastructureHealth;
  firestoreAvailable: boolean;
  firestoreLatencyMs: number;
  unavailabilityReason: string | null;
  pendingSyncCount: number;
  failedSyncCount: number;
  lastSuccessfulSync: string | null;
  backoffDelayMs: number;
  retryAttempts: number;
  auditLogs: SyncAuditRecord[];
}

