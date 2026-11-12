import { VRTelemetry, TestCategory, TestStatus, LightingPreset } from './diagnostics';
import { PredictiveDiagnosticsReport } from './phase15';

// ============================================================================
// Phase 17: Telemetry Source & System Operational Status
// ============================================================================

export type TelemetrySource = 'Physical Hardware' | 'Recorded Session' | 'Simulation';

export type SystemOperationalStatus =
  | 'Operational'
  | 'Warning'
  | 'Critical'
  | 'Offline'
  | 'Simulated';

export interface VROperationsOverview {
  systemStatus: SystemOperationalStatus;
  telemetrySource: TelemetrySource;
  activeSessionId: string | null;
  sessionDurationMs: number;
  detectedHeadset: string;
  isVRActive: boolean;
  fps: number;
  latencyMs: number;
  trackedJointsCount: number;
  expectedJointsCount: number;
  trackingStability: 'Optimal' | 'Degraded' | 'Occluded' | 'Lost';
  recentInterruptionCount: number;
  overallHealthScore: number; // 0 to 100
  activeIncidentsCount: number;
  activeTestQueueLength: number;
  cloudSyncStatus: CloudSyncStatus;
  rule2CausationStatus: 'INCONCLUSIVE' | 'CONFIRMED';
  timestamp: string;
}

// ============================================================================
// Phase 17: Module 3 - Intelligent Test Orchestrator Types
// ============================================================================

export type TestExecutionState =
  | 'CREATED'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export type TestPriority = 'critical' | 'high' | 'medium' | 'low';

export interface TestScenarioConfig {
  id: string;
  name: string;
  category: TestCategory;
  priority: TestPriority;
  description: string;
  timeoutMs: number;
  maxRetries: number;
  retryBackoffMs: number;
  thresholds: {
    minJointCount: number;
    maxLatencyMs: number;
    minFps: number;
    maxRecoveryTimeMs: number;
  };
  lightingPreset?: LightingPreset;
}

export interface TestExecutionRecord {
  executionId: string;
  scenarioId: string;
  scenarioName: string;
  category: TestCategory;
  priority: TestPriority;
  state: TestExecutionState;
  idempotencyKey: string;
  retryCount: number;
  maxRetries: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  resultStatus: TestStatus;
  progressPercent: number; // 0 to 100
  logs: Array<{ timestamp: string; message: string; level: 'info' | 'warn' | 'error' }>;
  error?: string;
  observedMetrics?: {
    fps: number;
    latencyMs: number;
    trackedJoints: number;
    interruptions: number;
  };
}

// ============================================================================
// Phase 17: Module 4 - Cloud Intelligence Engine Types
// ============================================================================

export type CloudSyncStatus =
  | 'synced'
  | 'syncing'
  | 'queued'
  | 'offline'
  | 'conflict'
  | 'error';

export interface CloudSyncPayload {
  syncId: string;
  clientTimestamp: string;
  telemetrySource: TelemetrySource;
  telemetrySnapshot: VRTelemetry;
  incidentSnapshots: IncidentRecord[];
  testExecutions: TestExecutionRecord[];
}

export interface CloudSyncResult {
  syncId: string;
  serverTimestamp: string;
  status: CloudSyncStatus;
  recordsSyncedCount: number;
  conflictsResolvedCount: number;
  message: string;
  provenance: {
    source: TelemetrySource;
    verifiedOnServer: boolean;
  };
}

export interface OfflineQueueItem {
  id: string;
  enqueuedAt: string;
  retryAttempts: number;
  payload: CloudSyncPayload;
}

export interface CrossSessionAnalytics {
  totalSessionsRecorded: number;
  averageFps: number;
  averageLatencyMs: number;
  totalTrackingLossEvents: number;
  passRatePercent: number;
  frequentFailureCategories: Array<{ category: TestCategory; failureCount: number }>;
  lastSyncTimestamp: string | null;
}

// ============================================================================
// Phase 17: Module 5 - AI Incident Management Types
// ============================================================================

export type IncidentSeverity = 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type IncidentCategory =
  | 'tracking_loss'
  | 'render_cadence_drop'
  | 'latency_spike'
  | 'skeleton_corruption'
  | 'environmental_inconclusive'
  | 'test_timeout';

export type IncidentLifecycleState =
  | 'DETECTED'
  | 'INVESTIGATING'
  | 'ACTION_REQUIRED'
  | 'RESOLVED'
  | 'CLOSED';

export interface IncidentRecord {
  incidentId: string;
  fingerprint: string; // Used for deduplication
  sessionId: string;
  category: IncidentCategory;
  severity: IncidentSeverity;
  state: IncidentLifecycleState;
  title: string;
  detectedAt: string;
  resolvedAt: string | null;
  telemetryEvidence: Record<string, string | number | boolean>;
  diagnosticExplanation: string;
  recommendedAction: string;
  resolutionNotes: string | null;
  resolvedBy: string | null;
  rule2ComplianceVerified: boolean;
  occurrenceCount: number; // Increment for deduplicated recurring occurrences
  lastSeenTimestamp?: string;
}

// ============================================================================
// Phase 17: Module 8 - Multi-Agent Coordination Types
// ============================================================================

export type AgentRole =
  | 'OperationsAgent'
  | 'TestAgent'
  | 'TrackingAgent'
  | 'PerformanceAgent'
  | 'IncidentAgent'
  | 'ChiefIntelligenceAgent';

export type AgentSpecialistRole = AgentRole;

export interface AgentActivityReport {
  role: AgentRole;
  status: 'active' | 'idle' | 'analyzing' | 'warning';
  lastAction: string;
  confidenceScore: number; // 0 to 100
  uncertaintyDisclosed: boolean;
  evidenceCount: number;
  findings: string[];
  lastActiveAt: string;
}

export interface CommandCenterConsolidation {
  timestamp: string;
  chiefExecutiveBriefing: string;
  systemVerdict: SystemOperationalStatus;
  agentReports: AgentActivityReport[];
  criticalDirectives: string[];
  rule2ComplianceAudit: {
    status: 'INCONCLUSIVE' | 'CONFIRMED';
    proofRequired: string;
    isViolated: boolean;
  };
}
