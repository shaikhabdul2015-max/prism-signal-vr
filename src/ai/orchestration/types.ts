// src/ai/orchestration/types.ts
/**
 * Types for Stage 6 Multi-Agent AI Orchestration
 */

export type AgentRole =
  | 'GAME_DIRECTOR'
  | 'ENVIRONMENT_INTELLIGENCE'
  | 'PUZZLE_INTELLIGENCE'
  | 'NARRATIVE_INTELLIGENCE'
  | 'PLAYER_ASSISTANCE'
  | 'SPATIAL_INTELLIGENCE';

export interface AgentMessage {
  id: string;
  senderRole: AgentRole;
  targetRole: AgentRole | 'BROADCAST';
  priority: 'low' | 'medium' | 'high' | 'critical';
  topic: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

export interface AgentEvaluation {
  agentRole: AgentRole;
  timestamp: number;
  confidence: number; // 0.0 to 1.0
  recommendation: string;
  suggestedAction?: {
    type: string;
    params: Record<string, unknown>;
  };
  metrics: Record<string, number | string | boolean>;
}

export interface OrchestrationCycleResult {
  cycleId: string;
  timestamp: number;
  globalTensionLevel: number; // 0.0 (calm) to 1.0 (climax)
  agentEvaluations: Record<AgentRole, AgentEvaluation>;
  synthesizedDirective: string;
  appliedActions: Array<{
    targetSystem: string;
    action: string;
    details: Record<string, unknown>;
  }>;
  modelUsed: string;
  aborted?: boolean;
  abortReason?: string;
  humanControlActive?: boolean;
  humanInputEpoch?: number;
  suspendedAutonomousActions?: number;
  securityBlockedActions?: Array<{
    scope: string;
    action: string;
    reason: string;
  }>;
}

export interface WorldSnapshotInput {
  gamePhase: string;
  coherencePercent: number;
  activeSegmentCount: number;
  timeInPhaseMs: number;
  playerFrustration: number;
  playerBoredom: number;
  playerSkillRating: number;
  lastPlayerAction: string;
  spatialContext?: {
    playerPosition: [number, number, number];
    playerGazeDirection: [number, number, number];
    isHumanInputActive?: boolean;
  };
  requestedSpatialScopes?: Array<
    'camera_recognition' | 'room_scanning' | 'spatial_anchors' | 'hand_tracking'
  >;
}
