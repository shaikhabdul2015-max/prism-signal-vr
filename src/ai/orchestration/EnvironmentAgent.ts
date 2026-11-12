// src/ai/orchestration/EnvironmentAgent.ts
import type { AgentEvaluation, AgentRole, WorldSnapshotInput } from './types';

export class EnvironmentAgent {
  public readonly role: AgentRole = 'ENVIRONMENT_INTELLIGENCE';

  public evaluate(world: WorldSnapshotInput): AgentEvaluation {
    const isHighTension = world.activeSegmentCount >= 3 || world.coherencePercent > 75;
    const isFrustrated = world.playerFrustration > 0.6;

    // Environmental lighting & fog parameters
    const ambientIntensity = isFrustrated ? 0.8 : isHighTension ? 0.45 : 0.6;
    const particleSpeed = isHighTension ? 1.8 : 0.8;
    const fogDensity = isHighTension ? 0.025 : 0.015;
    const chromaticAberration = isHighTension ? 0.003 : 0.0;

    let recommendation = 'Standard crystalline void environment lighting active.';
    if (isFrustrated) {
      recommendation = 'Brighten ambient fill light to enhance optical visibility and reduce eye strain.';
    } else if (isHighTension) {
      recommendation = 'Intensify cosmic starfield motion and narrow focal depth for dramatic convergence.';
    }

    return {
      agentRole: this.role,
      timestamp: Date.now(),
      confidence: 0.92,
      recommendation,
      suggestedAction: {
        type: 'UPDATE_ENVIRONMENT_PARAMETERS',
        params: {
          ambientIntensity,
          particleSpeed,
          fogDensity,
          chromaticAberration,
        },
      },
      metrics: {
        ambientIntensity,
        particleSpeed,
        fogDensity,
      },
    };
  }
}
