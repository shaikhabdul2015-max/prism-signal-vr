// src/ai/orchestration/PuzzleAgent.ts
import type { AgentEvaluation, AgentRole, WorldSnapshotInput } from './types';

export class PuzzleAgent {
  public readonly role: AgentRole = 'PUZZLE_INTELLIGENCE';

  public evaluate(world: WorldSnapshotInput): AgentEvaluation {
    const isStalled = world.timeInPhaseMs > 60000 && world.coherencePercent < 50;
    const isMastery = world.playerBoredom > 0.6 && world.coherencePercent > 80;

    let recommendation = 'Puzzle mechanics balanced; monitoring reflection stability.';
    let actionType = 'MONITOR';
    const params: Record<string, unknown> = {};

    if (isStalled) {
      recommendation = 'Synthesize subtle harmonic audio guide tone on active node.';
      actionType = 'TRIGGER_AUDIO_GUIDE';
      params.frequency = 440 + world.activeSegmentCount * 110;
    } else if (isMastery) {
      recommendation = 'Prepare multi-frequency cryptograph sequencing for Phase 2 decoding.';
      actionType = 'QUEUE_ADVANCED_CRYPTOGRAPH';
      params.complexityBonus = 1.2;
    }

    return {
      agentRole: this.role,
      timestamp: Date.now(),
      confidence: 0.95,
      recommendation,
      suggestedAction: {
        type: actionType,
        params,
      },
      metrics: {
        activeSegments: world.activeSegmentCount,
        isStalled,
        isMastery,
      },
    };
  }
}
