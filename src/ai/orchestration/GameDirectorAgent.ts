// src/ai/orchestration/GameDirectorAgent.ts
import type { AgentEvaluation, AgentRole, WorldSnapshotInput } from './types';

export class GameDirectorAgent {
  public readonly role: AgentRole = 'GAME_DIRECTOR';
  private currentTension = 0.2; // 0.0 to 1.0

  public evaluate(world: WorldSnapshotInput): AgentEvaluation {
    // Tension curve: builds with coherence, spikes when near breakthrough, relaxes during contemplation
    let targetTension = (world.coherencePercent / 100) * 0.7;

    if (world.playerFrustration > 0.6) {
      // Lower tension to alleviate player stress
      targetTension = Math.max(0.15, targetTension - 0.25);
    } else if (world.activeSegmentCount >= 3) {
      // Approaching final target receiver, ramp tension to climax
      targetTension = Math.min(0.95, targetTension + 0.3);
    }

    // Exponential smoothing
    this.currentTension = Number((this.currentTension * 0.7 + targetTension * 0.3).toFixed(3));

    let recommendation = 'Maintain steady exploration pacing.';
    if (this.currentTension > 0.75) {
      recommendation = 'Prepare auditory and visual climax; player is nearing quantum coherence.';
    } else if (world.playerFrustration > 0.6) {
      recommendation = 'Throttle encounter pressure; trigger gentle environmental guidance cues.';
    }

    return {
      agentRole: this.role,
      timestamp: Date.now(),
      confidence: 0.94,
      recommendation,
      suggestedAction: {
        type: 'SET_GLOBAL_TENSION',
        params: { tensionLevel: this.currentTension },
      },
      metrics: {
        currentTension: this.currentTension,
        targetTension,
        coherence: world.coherencePercent,
      },
    };
  }

  public getTension(): number {
    return this.currentTension;
  }
}
