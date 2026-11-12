// src/ai/orchestration/PlayerAssistanceAgent.ts
import type { AgentEvaluation, AgentRole, WorldSnapshotInput } from './types';

export class PlayerAssistanceAgent {
  public readonly role: AgentRole = 'PLAYER_ASSISTANCE';

  public evaluate(world: WorldSnapshotInput): AgentEvaluation {
    const needsGuidance = world.playerFrustration > 0.55 || world.timeInPhaseMs > 50000;

    let recommendation = 'Player progressing autonomously; suppress HUD hints.';
    let actionType = 'SUPPRESS_ASSISTANCE';
    const params: Record<string, unknown> = {};

    if (needsGuidance) {
      recommendation = 'Render subtle non-intrusive holographic alignment glyph in periphery.';
      actionType = 'SHOW_SPATIAL_ASSISTANCE';
      params.pulseSpeed = 0.5;
      params.opacity = 0.4;
      params.targetCrystal = world.activeSegmentCount === 0 ? 'ruby' : world.activeSegmentCount === 1 ? 'azure' : 'emerald';
    }

    return {
      agentRole: this.role,
      timestamp: Date.now(),
      confidence: 0.93,
      recommendation,
      suggestedAction: {
        type: actionType,
        params,
      },
      metrics: {
        needsGuidance,
        playerFrustration: world.playerFrustration,
      },
    };
  }
}
