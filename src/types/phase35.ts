/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 35: Global Intelligence Network & Universal Knowledge Orchestration Engine Types.
 * Complete type definitions for global intelligence networking, universal knowledge graphs,
 * cross-agent knowledge exchange, multi-source fusion, semantic search & keyword fallback,
 * context-aware retrieval, conflict resolution, synchronization, and zero-trust governance.
 */

import { AgentSpecialistRole } from './phase17';
export type { AgentSpecialistRole };

export type IntelligenceSourceType =
  | 'INTERNAL_ENGINE'
  | 'AI_PROVIDER'
  | 'AGENT_SPECIALIST'
  | 'PREDICTIVE_SUBSYSTEM'
  | 'SENSOR_TELEMETRY'
  | 'MISSION_RESEARCH'
  | 'HISTORICAL_ARCHIVE'
  | 'USER_DIRECTIVE';

export type IntelligenceSourceHealth = 'OPTIMAL' | 'DEGRADED' | 'UNAVAILABLE' | 'INITIALIZING';

export type IntelligenceSourceConnection =
  | 'LOCAL_MEMORY'
  | 'CLIENT_WORKER'
  | 'HTTP_SERVER_PROXY'
  | 'CLOUD_FIRESTORE'
  | 'OFFLINE_CACHE';

export interface IntelligenceSourceDescriptor {
  id: string;
  name: string;
  type: IntelligenceSourceType;
  health: IntelligenceSourceHealth;
  connection: IntelligenceSourceConnection;
  capabilities: string[];
  latencyMs: number;
  reliabilityScore: number; // 0 - 100%
  lastPing: string;
  isCloudConnected: boolean; // Clearly distinguishes real cloud from local memory
}

export interface NetworkTopologyNode {
  id: string;
  label: string;
  category: 'CORE_ENGINE' | 'AGENT' | 'STORAGE' | 'EXTERNAL_GATEWAY' | 'PIPELINE';
  status: 'ONLINE' | 'STANDBY' | 'DEGRADED';
  throughputMsgSec: number;
}

export interface NetworkTopologyEdge {
  id: string;
  source: string;
  target: string;
  protocol: 'MEMORY_BUS' | 'EVENT_BUS' | 'HTTP_PROXY' | 'SYNC_LINK';
  latencyMs: number;
}

export interface NetworkTopologySnapshot {
  nodes: NetworkTopologyNode[];
  edges: NetworkTopologyEdge[];
  activeSourcesCount: number;
  healthySourcesRatio: number;
  timestamp: string;
}

// Universal Knowledge Graph
export type UniversalRelationshipType =
  | 'RELATED_TO'
  | 'DEPENDS_ON'
  | 'DERIVED_FROM'
  | 'SUPPORTS'
  | 'CONTRADICTS'
  | 'PREDICTS'
  | 'GENERATED_BY'
  | 'VALIDATED_BY';

export type KnowledgeClassificationTier = 'PUBLIC' | 'OPERATIONAL' | 'RESTRICTED' | 'CONFIDENTIAL';

export interface UniversalKnowledgeNode {
  id: string;
  label: string;
  category:
    | 'DOMAIN_FACT'
    | 'PREDICTION'
    | 'MISSION_METRIC'
    | 'SECURITY_RULE'
    | 'AGENT_HYPOTHESIS'
    | 'OPTIMIZATION_ACTION'
    | 'SENSOR_OBSERVATION';
  properties: Record<string, any>;
  evidenceReferences: string[];
  provenanceSourceId: string;
  authorRole?: AgentSpecialistRole;
  confidence: number; // 0 - 100
  version: number;
  createdAt: string;
  updatedAt: string;
  classification: KnowledgeClassificationTier;
}

export interface UniversalKnowledgeEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationship: UniversalRelationshipType;
  weight: number;
  confidence: number;
  provenance: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export interface KnowledgeLineageEntry {
  nodeId: string;
  parentNodeIds: string[];
  derivationType: string;
  timestamp: string;
  actor: string;
}

// Cross-Agent Knowledge Exchange
export type AgentKnowledgeMessageType =
  | 'PUBLISH'
  | 'QUERY_REQUEST'
  | 'QUERY_RESPONSE'
  | 'EVIDENCE_SHARE'
  | 'CONFLICT_ALERT'
  | 'ACKNOWLEDGEMENT'
  | 'DIRECTIVE';

export interface AgentKnowledgeMessage {
  messageId: string;
  senderRole: AgentSpecialistRole;
  targetRole: AgentSpecialistRole | 'BROADCAST';
  timestamp: string;
  messageType: AgentKnowledgeMessageType;
  correlationId: string;
  topic: string;
  payload: Record<string, any>;
  evidenceReferences: string[];
  validationStatus: 'VALID' | 'PENDING' | 'REJECTED';
  accessTier: 'OPERATIONAL' | 'RESTRICTED';
}

// Multi-Source Intelligence Fusion
export interface FusedIntelligenceRecord {
  fusionId: string;
  primaryConcept: string;
  synthesizedFacts: string[];
  contributingSourceIds: string[];
  confidenceScore: number;
  reliabilityIndicator: 'HIGH_CONVERGENCE' | 'MODERATE_CONFIDENCE' | 'POTENTIAL_DIVERGENCE' | 'CONTRADICTION_FLAGGED';
  duplicateCountSuppressed: number;
  contradictionsIdentified: string[];
  fusionTimestamp: string;
}

// Semantic Search & Retrieval
export interface SemanticSearchResult {
  nodeId: string;
  label: string;
  category: string;
  snippet: string;
  relevanceScore: number; // 0 - 100
  matchType: 'SEMANTIC_SIMILARITY' | 'EXACT_KEYWORD' | 'METADATA_FILTER';
  source: string;
  confidence: number;
  matchedTerms: string[];
}

export interface SearchFilter {
  category?: string;
  source?: string;
  minConfidence?: number;
  startDate?: string;
  endDate?: string;
  classification?: KnowledgeClassificationTier;
}

export interface SearchQueryRecord {
  queryId: string;
  queryText: string;
  searchType: 'SEMANTIC_HYBRID' | 'KEYWORD_FALLBACK';
  resultsCount: number;
  executionTimeMs: number;
  timestamp: string;
}

// Context-Aware Retrieval
export interface RetrievalContext {
  activeMissionId?: string;
  requestingAgent: AgentSpecialistRole;
  operationalContext: string;
  maxResults?: number;
  accessLevel: KnowledgeClassificationTier;
}

export interface ContextualRetrievalDossier {
  contextId: string;
  requestingAgent: AgentSpecialistRole;
  operationalContext: string;
  items: UniversalKnowledgeNode[];
  citations: string[];
  explanations: string[];
  missingContextWarnings: string[];
  retrievalTimestamp: string;
}

// Knowledge Conflict Resolution
export interface KnowledgeConflictRecord {
  conflictId: string;
  conflictingNodeIds: string[];
  subject: string;
  description: string;
  opposingSources: string[];
  detectedAt: string;
  evidenceQualityScoreA: number;
  evidenceQualityScoreB: number;
  recommendedResolution: string;
  requiresHumanApproval: boolean;
  status: 'DETECTED' | 'PENDING_APPROVAL' | 'RESOLVED' | 'DISMISSED';
  resolutionDetails?: {
    chosenNodeId?: string;
    rationale: string;
    approvedBy: string;
    resolvedAt: string;
  };
}

// Global Knowledge Synchronization
export type SyncMode = 'LOCAL_DEVELOPMENT' | 'CLOUD_FIRESTORE' | 'OFFLINE_FALLBACK';
export type SyncStatus = 'SYNCHRONIZED' | 'SYNCING' | 'QUEUED_OFFLINE' | 'CONFLICT_PAUSED' | 'ERROR';

export interface KnowledgeSyncRecord {
  syncId: string;
  timestamp: string;
  mode: SyncMode;
  status: SyncStatus;
  localVersion: number;
  cloudVersion: number | null;
  itemsSyncedCount: number;
  pendingQueueCount: number;
  errorReason?: string;
  isCloudActive: boolean;
}

// Governance and Security
export interface GovernanceAuditLog {
  logId: string;
  timestamp: string;
  actor: string;
  action:
    | 'ACCESS_GRANTED'
    | 'ACCESS_DENIED'
    | 'PROMPT_INJECTION_DEFENSE_TRIGGERED'
    | 'NODE_CREATED'
    | 'NODE_MUTATED'
    | 'CONFLICT_RESOLVED'
    | 'SYNC_DISPATCHED';
  resourceId: string;
  details: string;
  securityLevel: 'INFO' | 'WARN' | 'CRITICAL';
}

// Six-Agent Coordination Summary
export interface AgentIntelligenceContribution {
  agentRole: AgentSpecialistRole;
  agentName: string;
  mandate: string;
  activeKnowledgeNodesCount: number;
  messagesSentCount: number;
  knowledgeStatus: 'HEALTHY' | 'SYNCING' | 'AUDITING';
  strategicInsight: string;
}

// Aggregated Network State
export interface GlobalIntelligenceNetworkState {
  networkTopology: NetworkTopologySnapshot;
  sources: IntelligenceSourceDescriptor[];
  nodesCount: number;
  edgesCount: number;
  recentMessages: AgentKnowledgeMessage[];
  recentFusions: FusedIntelligenceRecord[];
  activeConflicts: KnowledgeConflictRecord[];
  lastSync: KnowledgeSyncRecord;
  governanceLogs: GovernanceAuditLog[];
  agentContributions: AgentIntelligenceContribution[];
  persistenceMode: SyncMode;
  lastUpdated: string;
}
