// src/ai/adaptive/AdaptivePuzzleEngine.ts
import type { AdaptiveHint, ProceduralPuzzleConfig, SkillTier } from './types';
import type { CrystalId } from '../../types/game';

export interface PuzzleEvaluationInput {
  crystals: Array<{
    id: CrystalId;
    currentRotationY: number;
    targetRotationY: number;
    isAligned: boolean;
  }>;
  activeSegmentCount: number;
  timeSinceLastActionMs: number;
  attemptsCount: number;
}

export class AdaptivePuzzleEngine {
  private currentConfig: ProceduralPuzzleConfig;
  private lastHintTimestamp = 0;

  constructor(tier: SkillTier = 'apprentice') {
    this.currentConfig = this.generatePuzzleConfig(tier);
  }

  public getConfig(): ProceduralPuzzleConfig {
    return { ...this.currentConfig };
  }

  public generatePuzzleConfig(tier: SkillTier): ProceduralPuzzleConfig {
    const configs: Record<SkillTier, ProceduralPuzzleConfig> = {
      novice: {
        id: `puzzle-${tier}-${Date.now()}`,
        tier,
        nodeCount: 3,
        targetTolerances: { ruby: 0.22, azure: 0.20, emerald: 0.20 },
        timeBonusTargetSeconds: 90,
        glyphSequenceLength: 3,
        requiredResonanceThreshold: 75,
      },
      apprentice: {
        id: `puzzle-${tier}-${Date.now()}`,
        tier,
        nodeCount: 3,
        targetTolerances: { ruby: 0.14, azure: 0.12, emerald: 0.12 },
        timeBonusTargetSeconds: 60,
        glyphSequenceLength: 4,
        requiredResonanceThreshold: 85,
      },
      adept: {
        id: `puzzle-${tier}-${Date.now()}`,
        tier,
        nodeCount: 4,
        targetTolerances: { ruby: 0.09, azure: 0.08, emerald: 0.08 },
        timeBonusTargetSeconds: 45,
        glyphSequenceLength: 5,
        requiredResonanceThreshold: 92,
      },
      master: {
        id: `puzzle-${tier}-${Date.now()}`,
        tier,
        nodeCount: 5,
        targetTolerances: { ruby: 0.06, azure: 0.05, emerald: 0.05 },
        timeBonusTargetSeconds: 30,
        glyphSequenceLength: 6,
        requiredResonanceThreshold: 98,
      },
    };

    this.currentConfig = configs[tier];
    return this.getConfig();
  }

  public evaluateProgressAndSynthesizeHint(
    input: PuzzleEvaluationInput,
    currentTime = Date.now(),
    hintCooldownMs = 15000
  ): AdaptiveHint | null {
    // Respect hint cooldown
    if (currentTime - this.lastHintTimestamp < hintCooldownMs) {
      return null;
    }

    // Find the first unaligned crystal in the beam chain
    const unaligned = input.crystals.find((c) => !c.isAligned);
    if (!unaligned) {
      return null; // All aligned!
    }

    // Determine hint level based on attempts and idle time
    let level: 1 | 2 | 3 = 1;
    if (input.attemptsCount >= 5 || input.timeSinceLastActionMs > 45000) {
      level = 3;
    } else if (input.attemptsCount >= 2 || input.timeSinceLastActionMs > 20000) {
      level = 2;
    }

    // Calculate angular delta to target
    const angleDelta = unaligned.targetRotationY - unaligned.currentRotationY;
    const normalizedDelta = Math.atan2(Math.sin(angleDelta), Math.cos(angleDelta));
    const directionStr = normalizedDelta > 0 ? 'clockwise' : 'counter-clockwise';
    const degrees = Math.abs(Math.round(normalizedDelta * (180 / Math.PI)));

    let message = '';
    let action = '';

    if (level === 1) {
      message = `Subtle harmonic resonance detected near the ${unaligned.id.toUpperCase()} pedestal. Check beam deflection.`;
      action = `Inspect the ${unaligned.id} crystal orientation.`;
    } else if (level === 2) {
      message = `Rotate the ${unaligned.id.toUpperCase()} crystal ${directionStr} to converge the photonic beam onto the next optical node.`;
      action = `Turn ${directionStr} toward the resonance threshold.`;
    } else {
      message = `ALIGNMENT LOCK: Turn ${unaligned.id.toUpperCase()} ~${degrees}° ${directionStr} to achieve quantum coherence.`;
      action = `Rotate ${degrees}° ${directionStr}.`;
    }

    this.lastHintTimestamp = currentTime;

    return {
      id: `hint-${unaligned.id}-${level}-${currentTime}`,
      level,
      message,
      targetEntityId: unaligned.id,
      recommendedAction: action,
      suggestedAngleDelta: Number(normalizedDelta.toFixed(3)),
      timestamp: currentTime,
    };
  }
}
