// src/ai/adaptive/DynamicDifficultyEngine.ts
import type { DifficultyAdjustmentState, PlayerBehaviorMetrics, SkillTier } from './types';
import { PlayerBehaviorAnalyzer } from './PlayerBehaviorAnalyzer';
import { PlayerSkillEstimator } from './PlayerSkillEstimator';

export interface DifficultyConfig {
  baseToleranceRadians: number;
  minToleranceRadians: number;
  maxToleranceRadians: number;
  baseHintCooldownMs: number;
  minHintCooldownMs: number;
  maxHintCooldownMs: number;
}

const DEFAULT_CONFIG: DifficultyConfig = {
  baseToleranceRadians: 0.12,
  minToleranceRadians: 0.05,
  maxToleranceRadians: 0.28,
  baseHintCooldownMs: 20000,
  minHintCooldownMs: 5000,
  maxHintCooldownMs: 45000,
};

export class DynamicDifficultyEngine {
  private state: DifficultyAdjustmentState;
  private readonly config: DifficultyConfig;
  private readonly analyzer: PlayerBehaviorAnalyzer;
  private readonly skillEstimator: PlayerSkillEstimator;

  constructor(
    analyzer?: PlayerBehaviorAnalyzer,
    skillEstimator?: PlayerSkillEstimator,
    config: Partial<DifficultyConfig> = {}
  ) {
    this.analyzer = analyzer || new PlayerBehaviorAnalyzer();
    this.skillEstimator = skillEstimator || new PlayerSkillEstimator();
    this.config = { ...DEFAULT_CONFIG, ...config };

    this.state = {
      currentTier: 'apprentice',
      angularToleranceRadians: this.config.baseToleranceRadians,
      hintFrequencyCooldownMs: this.config.baseHintCooldownMs,
      beamResonanceMultiplier: 1.0,
      puzzleComplexityTier: 2,
      adaptiveAssistanceActive: false,
      adjustmentReason: 'Initial baseline calibrated for standard WebXR session.',
      lastAdjustedTimestamp: Date.now(),
    };
  }

  public getState(): DifficultyAdjustmentState {
    return { ...this.state };
  }

  public evaluateAndAdjust(currentTime = Date.now()): DifficultyAdjustmentState {
    const metrics: PlayerBehaviorMetrics = this.analyzer.analyze(currentTime);
    const recommendedTier: SkillTier = this.skillEstimator.getRecommendedTier();

    let newTolerance = this.state.angularToleranceRadians;
    let newHintCooldown = this.state.hintFrequencyCooldownMs;
    let newResonanceMultiplier = this.state.beamResonanceMultiplier;
    let assistanceActive = false;
    let reason = 'Flow state nominal; maintaining balanced challenge.';

    // Rule 1: High Frustration or Stagnation -> Loosen tolerance, accelerate resonance, provide assistance
    if (metrics.frustrationIndex > 0.6 || metrics.consecutiveErrors >= 3 || metrics.timeSinceLastProgressMs > 60000) {
      newTolerance = Math.min(this.config.maxToleranceRadians, this.state.angularToleranceRadians + 0.04);
      newHintCooldown = Math.max(this.config.minHintCooldownMs, this.state.hintFrequencyCooldownMs - 5000);
      newResonanceMultiplier = Math.min(1.5, this.state.beamResonanceMultiplier + 0.15);
      assistanceActive = true;
      reason = `Player frustration detected (index: ${metrics.frustrationIndex}). Relaxed angular tolerance to ${(newTolerance * (180 / Math.PI)).toFixed(1)}° and accelerated resonance.`;
    }
    // Rule 2: Boredom or Fast Mastery -> Tighten tolerance, increase challenge
    else if (metrics.boredomIndex > 0.5 && metrics.consecutiveErrors === 0 && metrics.flowChannelIndex > 0.75) {
      newTolerance = Math.max(this.config.minToleranceRadians, this.state.angularToleranceRadians - 0.02);
      newHintCooldown = Math.min(this.config.maxHintCooldownMs, this.state.hintFrequencyCooldownMs + 5000);
      newResonanceMultiplier = Math.max(0.8, this.state.beamResonanceMultiplier - 0.1);
      reason = `High skill flow detected. Tightened alignment tolerance to ${(newTolerance * (180 / Math.PI)).toFixed(1)}° to preserve engagement.`;
    }
    // Rule 3: Tier alignment
    if (this.state.currentTier !== recommendedTier) {
      this.state.currentTier = recommendedTier;
      const tierComplexityMap: Record<SkillTier, number> = {
        novice: 1,
        apprentice: 2,
        adept: 3,
        master: 4,
      };
      this.state.puzzleComplexityTier = tierComplexityMap[recommendedTier];
    }

    this.state.angularToleranceRadians = Number(newTolerance.toFixed(4));
    this.state.hintFrequencyCooldownMs = Math.round(newHintCooldown);
    this.state.beamResonanceMultiplier = Number(newResonanceMultiplier.toFixed(2));
    this.state.adaptiveAssistanceActive = assistanceActive;
    this.state.adjustmentReason = reason;
    this.state.lastAdjustedTimestamp = currentTime;

    return this.getState();
  }

  public getAnalyzer(): PlayerBehaviorAnalyzer {
    return this.analyzer;
  }

  public getSkillEstimator(): PlayerSkillEstimator {
    return this.skillEstimator;
  }
}
