// src/ai/orchestration/NarrativeAgent.ts
import type { AgentEvaluation, AgentRole, WorldSnapshotInput } from './types';

export class NarrativeAgent {
  public readonly role: AgentRole = 'NARRATIVE_INTELLIGENCE';

  private loreExcerpts = [
    'Carrier frequency 1420.405 MHz synchronized with galactic hydrogen line.',
    'Fragment decoded: "The Void is not empty. It awaits the third prism harmonic."',
    'Ancient crystal resonance matches pre-collapse quantum beacon protocols.',
    'Telemetry log: Photonic bridge integrity stabilizing across sector 7.',
    'Transmission decoded: "We cast our knowledge into the light before the stars faded."',
  ];

  public evaluate(world: WorldSnapshotInput): AgentEvaluation {
    const excerptIndex = Math.min(
      this.loreExcerpts.length - 1,
      Math.floor((world.coherencePercent / 100) * this.loreExcerpts.length)
    );
    const selectedLore = this.loreExcerpts[excerptIndex];

    return {
      agentRole: this.role,
      timestamp: Date.now(),
      confidence: 0.90,
      recommendation: `Reveal narrative lore fragment: "${selectedLore}"`,
      suggestedAction: {
        type: 'BROADCAST_LORE_FRAGMENT',
        params: {
          loreText: selectedLore,
          coherenceTier: Math.floor(world.coherencePercent / 25),
        },
      },
      metrics: {
        coherencePercent: world.coherencePercent,
        selectedExcerptIndex: excerptIndex,
      },
    };
  }

  public getLoreFragment(coherencePercent: number): string {
    const idx = Math.min(
      this.loreExcerpts.length - 1,
      Math.floor((coherencePercent / 100) * this.loreExcerpts.length)
    );
    return this.loreExcerpts[idx];
  }
}
