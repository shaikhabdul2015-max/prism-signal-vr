/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 36: Unified Superintelligence Command Center & System-Wide Orchestration Types.
 * Complete type definitions for global orchestration, unified mission lifecycles,
 * cross-engine integration, executive 6-agent council, unified system health,
 * security governance, performance intelligence, and structured system readiness.
 */

import { AgentSpecialistRole } from './phase17';

export type { AgentSpecialistRole };

export type UnifiedMissionLifecycleStage =
  | 'MISSION_CREATED'
  | 'OBJECTIVES_VALIDATED'
  | 'RESOURCES_EVALUATED'
  | 'AGENTS_ASSIGNED'
  | 'EXECUTION_APPROVED'
  | 'TASKS_ORCHESTRATED'
  | 'EVIDENCE_COLLECTED'
  | 'RESULTS_VALIDATED'
  | 'MISSION_COMPLETED'
  | 'MISSION_FAILED';

export type ComponentHealthClassification = 'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export type SystemReadinessClassification = 'READY' | 'READY_WITH_LIMITATIONS' | 'NOT_READY' | 'UNKNOWN';

export type PersistenceTierMode = 'LOCAL_DEVELOPMENT' | 'CLOUD_FIRESTORE' | 'OFFLINE_FALLBACK';

export interface EngineRegistrationDescriptor {
  engineId: string;
  name: string;
  domain:
    | 'CORE_ORCHESTRATION'
    | 'PREDICTIVE_INTELLIGENCE'
    | 'AUTONOMOUS_OPTIMIZATION'
    | 'ZERO_TRUST_SECURITY'
    | 'UNIVERSAL_KNOWLEDGE'
    | 'SENSOR_ENVIRONMENTAL'
    | 'WEBXR_SPATIAL'
    | 'MISSION_EXECUTION';
  version: string;
  health: ComponentHealthClassification;
  capabilities: string[];
  dependencyEngineIds: string[];
  latencyMs: number;
  lastHeartbeat: string;
}

export interface CrossEngineTaskRecord {
  taskId: string;
  initiatingEngineId: string;
  targetEngineId: string;
  taskType: string;
  correlationId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CIRCUIT_BROKEN';
  payload: Record<string, any>;
  result?: Record<string, any>;
  executionDurationMs?: number;
  errorReason?: string;
  timestamp: string;
}

export interface UnifiedMissionRecord {
  missionId: string;
  title: string;
  objective: string;
  stage: UnifiedMissionLifecycleStage;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedAgents: AgentSpecialistRole[];
  humanApprovalRequired: boolean;
  approvedBy?: string;
  approvedAt?: string;
  collectedEvidence: string[];
  riskAssessment: {
    riskScore: number; // 0 - 100
    mitigationStrategy: string;
  };
  progressPercent: number;
  explainableSummary: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExecutiveCouncilObservation {
  agentRole: AgentSpecialistRole;
  agentName: string;
  observationSummary: string;
  confidenceScore: number; // 0 - 100%
  supportingEvidence: string[];
  proposedAction: string;
  requiresOperatorIntervention: boolean;
}

export interface ExecutiveCouncilReport {
  reportId: string;
  timestamp: string;
  agentObservations: ExecutiveCouncilObservation[];
  conflictingConclusionsDetected: boolean;
  conflictingDetails: string[];
  consensusAgreementPercent: number;
  unifiedDirective: string;
  approvedByCouncil: boolean;
}

export interface ComponentHealthStatus {
  componentId: string;
  componentName: string;
  category: 'ENGINE' | 'AI_PROVIDER' | 'PERSISTENCE' | 'EVENT_BUS' | 'WEBXR' | 'SENSORS';
  health: ComponentHealthClassification;
  latencyMs: number;
  lastChecked: string;
  details: string;
}

export interface SystemHealthReport {
  overallHealth: ComponentHealthClassification;
  healthyCount: number;
  degradedCount: number;
  unavailableCount: number;
  components: ComponentHealthStatus[];
  activeAlerts: string[];
  recommendedRecoveryActions: string[];
  generatedAt: string;
}

export interface UnifiedSecurityGovernanceState {
  zeroTrustEnforced: boolean;
  activeRoleClearance: string;
  tokenVerificationStatus: 'VALID' | 'EXPIRED' | 'UNAUTHENTICATED';
  knowledgeClassificationEnforced: boolean;
  promptInjectionDefenseActive: boolean;
  recentAuditLogsCount: number;
  securityAlerts: string[];
  lastSecurityScan: string;
}

export interface GlobalPerformanceReport {
  averageApiLatencyMs: number;
  averageAiResponseTimeMs: number;
  averageTaskDurationMs: number;
  cacheEfficiencyPercent: number;
  renderCadenceFps: number;
  renderFrameDropPercent: number;
  realMemoryHeapMb: number | null;
  isRealMemorySupported: boolean;
  identifiedBottlenecks: string[];
  lastEvaluated: string;
}

export interface SystemReadinessReport {
  readinessVerdict: SystemReadinessClassification;
  readinessScorePercent: number;
  verifiedCapabilities: string[];
  unverifiedCapabilities: string[];
  knownLimitations: string[];
  missingCredentials: string[];
  failedChecks: string[];
  recommendedActions: string[];
  assessedAt: string;
}

export interface WebXRSpatialStatus {
  webxrSupported: boolean;
  physicalSessionActive: boolean;
  activeControllersCount: number;
  trackingStability: 'OPTIMAL' | 'DEGRADED' | 'SIMULATED';
  sensorPermissionsGranted: boolean;
}

export interface UnifiedSuperintelligenceState {
  registeredEngines: EngineRegistrationDescriptor[];
  activeMissions: UnifiedMissionRecord[];
  executiveReport: ExecutiveCouncilReport;
  systemHealth: SystemHealthReport;
  securityGovernance: UnifiedSecurityGovernanceState;
  performanceMetrics: GlobalPerformanceReport;
  readinessReport: SystemReadinessReport;
  spatialStatus: WebXRSpatialStatus;
  persistenceMode: PersistenceTierMode;
  recentOrchestrationTasks: CrossEngineTaskRecord[];
  lastUpdated: string;
}
