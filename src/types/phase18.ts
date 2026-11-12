/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 18: Enterprise Types for Database Infrastructure, Authentication,
 * Advanced Observability, Agent Coordination, Quest WebXR Validation & Incidents.
 */

import { VRTelemetry } from './diagnostics';
import { IncidentRecord, AgentSpecialistRole } from './phase17';

// ==========================================
// 1. Enterprise Authentication & User Roles
// ==========================================

export type EnterpriseUserRole = 'Admin' | 'Engineer' | 'Operator' | 'Viewer';

export interface EnterpriseUserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: EnterpriseUserRole;
  isSimulated: boolean;
  tenantId?: string;
  createdAt: string;
  lastLoginAt: string;
}

export interface AuthSessionState {
  isAuthenticated: boolean;
  user: EnterpriseUserProfile | null;
  token: string | null;
  tokenExpiresAt: number | null;
  isLoading: boolean;
  authError: string | null;
  provider: 'google' | 'firebase_emulator' | 'simulated_local' | 'none';
}

export interface RolePermissions {
  canExecuteTests: boolean;
  canAcknowledgeIncidents: boolean;
  canModifySystemConfig: boolean;
  canSyncToCloud: boolean;
  canExportTelemetry: boolean;
}

// ==========================================
// 2. Enterprise Database & Cloud Sync Types
// ==========================================

export interface DatabaseConnectionStatus {
  service: 'firestore' | 'offline_local';
  connected: boolean;
  latencyMs: number;
  lastSuccessfulPing: string | null;
  pendingWriteCount: number;
  isOfflineBufferActive: boolean;
  errorMessage?: string;
}

export interface PerformanceTrendAnalysis {
  sessionCount: number;
  averageFpsTrend: 'improving' | 'stable' | 'degrading';
  p95LatencyMs: number;
  medianLatencyMs: number;
  trackingStabilityScore: number; // 0 to 100
  dominantFailureCategory: string | null;
  historicalFpsPoints: { timestamp: string; fps: number }[];
  historicalLatencyPoints: { timestamp: string; latencyMs: number }[];
}

export interface UpgradedCloudStatusResponse {
  status: 'online' | 'degraded' | 'offline';
  databaseService: 'firestore' | 'offline_local';
  recordsStored: number;
  activeIncidentsStored: number;
  trendAnalysis: PerformanceTrendAnalysis;
  serverTimestamp: string;
  rule2Policy: 'STRICT_ENFORCEMENT';
}

// ==========================================
// 3. Advanced Observability & Monitoring
// ==========================================

export interface SystemMemoryMetrics {
  supported: boolean;
  jsHeapSizeLimitMb: number | null;
  totalJSHeapSizeMb: number | null;
  usedJSHeapSizeMb: number | null;
  memoryPressureScore: number; // 0 to 100
}

export interface SystemCadenceMetrics {
  currentFps: number;
  targetFps: number;
  frameTimeVarianceMs: number;
  cadenceJitterScore: number; // 0 (perfect) to 100 (jittery)
  droppedFramesLastSec: number;
}

export interface LiveObservabilitySnapshot {
  timestamp: string;
  provenance: 'Physical Hardware' | 'Simulation';
  fpsMetrics: SystemCadenceMetrics;
  apiLatencyHistoryMs: number[];
  averageApiLatencyMs: number;
  memoryMetrics: SystemMemoryMetrics;
  trackingStabilityPercent: number;
  availableSkeletonJointsCount: number; // Max 25
  cloudSyncHealth: 'healthy' | 'lagging' | 'disconnected';
  activeIncidentsCount: number;
  mttrSeconds: number; // Mean Time to Resolution
}

// ==========================================
// 4. Upgraded AI Agent Coordination
// ==========================================

export type AgentExecutionState = 'idle' | 'evaluating' | 'completed' | 'failed' | 'recovering';

export interface UpgradedAgentTask {
  taskId: string;
  agentRole: AgentSpecialistRole;
  state: AgentExecutionState;
  assignedTimestamp: string;
  completedTimestamp?: string;
  inputContext: Record<string, unknown>;
  findings: string[];
  recommendations: string[];
  confidence: number; // 0.0 to 1.0
  uncertaintyScore: number; // 0.0 to 1.0
  executionTimeMs: number;
  error?: string;
}

export interface AgentAuditLogEntry {
  id: string;
  timestamp: string;
  agentRole: AgentSpecialistRole;
  action: string;
  details: string;
  severity: 'info' | 'warning' | 'error';
}

export interface UpgradedAgentCoordinationReport {
  sessionId: string;
  overallConfidence: number;
  agents: Record<AgentSpecialistRole, UpgradedAgentTask>;
  auditTrail: AgentAuditLogEntry[];
  antiLoopGuardTriggered: boolean;
  chiefIntelligenceSummary: string;
  environmentalCausationStrictRule2Notice: string;
}

// ==========================================
// 5. Advanced Incident Intelligence
// ==========================================

export type IncidentClassification =
  | 'critical_tracking_blackout'
  | 'skeleton_joint_drift'
  | 'cadence_pipeline_stall'
  | 'network_sync_partition'
  | 'environmental_inconclusive'
  | 'hardware_sensor_drop';

export interface UpgradedIncidentRecord extends IncidentRecord {
  classification: IncidentClassification;
  severityScore: number; // 0 to 100
  correlatedIncidentIds: string[];
  automatedRecoverySteps: string[];
  assignedOperator?: string;
  notesHistory: { timestamp: string; author: string; note: string }[];
  resolutionDurationSeconds?: number;
}

// ==========================================
// 6. Meta Quest WebXR Hardware Validation
// ==========================================

export interface QuestHardwareFeatures {
  isMetaQuestDevice: boolean;
  detectedModel: 'Meta Quest 3' | 'Meta Quest Pro' | 'Meta Quest 2' | 'Unknown WebXR Device' | 'Desktop / Non-VR';
  handTrackingSupported: boolean;
  controllersSupported: boolean;
  supportedRefreshRatesHz: number[];
  currentRefreshRateHz: number | null;
  jointConfidenceReporting: boolean;
  sixDoFHeadsetDetected: boolean;
  fallbackActive: boolean;
}

export interface WebXRValidationResult {
  timestamp: string;
  isPhysicalVRConnected: boolean;
  features: QuestHardwareFeatures;
  sessionInitValidation: {
    status: 'passed' | 'failed' | 'simulated';
    mode: 'immersive-vr' | 'inline' | 'none';
    featuresRequested: string[];
    featuresGranted: string[];
  };
  warnings: string[];
  gracefulFallbackReady: boolean;
}
