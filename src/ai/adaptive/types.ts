// src/ai/adaptive/types.ts
/**
 * Types for Stage 6 Adaptive AI Game Intelligence & Immersive Evolution
 */

export type SkillTier = 'novice' | 'apprentice' | 'adept' | 'master';

export interface PlayerBehaviorMetrics {
  timestamp: number;
  interactionVelocity: number; // units/sec
  gazeDwellDurationMs: number;
  consecutiveErrors: number;
  timeSinceLastProgressMs: number;
  actionsPerMinute: number;
  hesitationScore: number; // 0.0 (decisive) to 1.0 (hesitant)
  frustrationIndex: number; // 0.0 to 1.0
  boredomIndex: number; // 0.0 to 1.0
  flowChannelIndex: number; // 0.0 (frustrated) -> 0.5 (optimal flow) -> 1.0 (bored)
}

export interface DifficultyAdjustmentState {
  currentTier: SkillTier;
  angularToleranceRadians: number; // alignment margin (e.g., 0.08 to 0.25 rad)
  hintFrequencyCooldownMs: number; // 5000ms to 45000ms
  beamResonanceMultiplier: number; // speed at which resonance builds (0.8x to 1.5x)
  puzzleComplexityTier: number; // 1 to 4
  adaptiveAssistanceActive: boolean;
  adjustmentReason: string;
  lastAdjustedTimestamp: number;
}

export interface PlayerSkillProfile {
  playerId: string;
  skillRating: number; // Elo-scale (800 to 2400, default 1200)
  spatialDexterityScore: number; // 0 to 100
  cognitiveSpeedScore: number; // 0 to 100
  puzzleResilienceScore: number; // 0 to 100
  totalPuzzlesSolved: number;
  totalAttempts: number;
  averageSolveTimeSeconds: number;
  lastUpdated: number;
}

export interface AdaptiveHint {
  id: string;
  level: 1 | 2 | 3; // 1: subtle nudge, 2: directional directional clue, 3: explicit spatial solution
  message: string;
  targetEntityId: string;
  recommendedAction: string;
  suggestedAngleDelta?: number;
  highlightCoordinates?: [number, number, number];
  timestamp: number;
}

export interface ProceduralPuzzleConfig {
  id: string;
  tier: SkillTier;
  nodeCount: number; // 3 to 6 optical nodes
  targetTolerances: Record<string, number>;
  timeBonusTargetSeconds: number;
  glyphSequenceLength: number;
  requiredResonanceThreshold: number;
}
