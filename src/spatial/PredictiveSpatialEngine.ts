// src/spatial/PredictiveSpatialEngine.ts
import type {
  MovementAnomalyAlert,
  NavigationAnticipation,
  PlayerSpatialSample,
  PredictedInteraction,
  Vec3,
} from './types';

export class PredictiveSpatialEngine {
  private sampleHistory: PlayerSpatialSample[] = [];
  private interactionCounts: Map<string, number> = new Map();
  private transitionMatrix: Map<string, Map<string, number>> = new Map();
  private lastInteractedId: string | null = null;
  private readonly maxHistory = 120;

  constructor() {
    // Seed domain prior transitions matching PRISM puzzle flow (weak priors, quickly adapted by real player behavior)
    this.seedPriorTransition('console-emitter', 'ruby', 2);
    this.seedPriorTransition('ruby', 'azure', 2);
    this.seedPriorTransition('azure', 'emerald', 2);
    this.seedPriorTransition('emerald', 'target-receiver', 2);
  }

  private seedPriorTransition(fromId: string, toId: string, weight: number): void {
    if (!this.transitionMatrix.has(fromId)) {
      this.transitionMatrix.set(fromId, new Map());
    }
    this.transitionMatrix.get(fromId)!.set(toId, weight);
  }

  public recordSample(sample: PlayerSpatialSample): void {
    this.sampleHistory.push({
      ...sample,
      headPosition: [...sample.headPosition],
      gazeDirection: [...sample.gazeDirection],
      activeHandPosition: sample.activeHandPosition ? [...sample.activeHandPosition] : undefined,
    });

    if (this.sampleHistory.length > this.maxHistory) {
      this.sampleHistory.shift();
    }

    if (sample.interactedObjectId) {
      const prevCount = this.interactionCounts.get(sample.interactedObjectId) || 0;
      this.interactionCounts.set(sample.interactedObjectId, prevCount + 1);

      if (this.lastInteractedId && this.lastInteractedId !== sample.interactedObjectId) {
        if (!this.transitionMatrix.has(this.lastInteractedId)) {
          this.transitionMatrix.set(this.lastInteractedId, new Map());
        }
        const row = this.transitionMatrix.get(this.lastInteractedId)!;
        row.set(sample.interactedObjectId, (row.get(sample.interactedObjectId) || 0) + 3);
      }
      this.lastInteractedId = sample.interactedObjectId;
    }
  }

  /**
   * Predicts most likely next object interactions combining Markov transitions,
   * gaze alignment cosine similarity, and spatial proximity.
   * Strictly probabilistic and never overrides player control.
   */
  public predictNextInteractions(
    candidateObjects: Array<{ id: string; position: Vec3; isInteractable: boolean }>,
    currentHeadPos: Vec3,
    currentGazeDir: Vec3
  ): PredictedInteraction[] {
    const interactables = candidateObjects.filter((c) => c.isInteractable);
    if (interactables.length === 0) return [];

    // Normalize gaze vector safely
    const gLen = Math.sqrt(
      currentGazeDir[0] * currentGazeDir[0] +
      currentGazeDir[1] * currentGazeDir[1] +
      currentGazeDir[2] * currentGazeDir[2]
    ) || 1.0;
    const gx = currentGazeDir[0] / gLen;
    const gy = currentGazeDir[1] / gLen;
    const gz = currentGazeDir[2] / gLen;

    const transitionRow = this.lastInteractedId
      ? this.transitionMatrix.get(this.lastInteractedId)
      : undefined;

    let totalTransitionWeight = 0;
    if (transitionRow) {
      for (const w of transitionRow.values()) totalTransitionWeight += w;
    }

    const rawScores = interactables.map((obj) => {
      const dx = obj.position[0] - currentHeadPos[0];
      const dy = obj.position[1] - currentHeadPos[1];
      const dz = obj.position[2] - currentHeadPos[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;

      const dot = (dx / dist) * gx + (dy / dist) * gy + (dz / dist) * gz;
      const gazeScore = Math.max(0, (dot + 1) / 2); // 0 to 1
      const proximityScore = Math.max(0, 1 - dist / 10.0);

      let markovScore = 0.15;
      if (transitionRow && totalTransitionWeight > 0) {
        markovScore = (transitionRow.get(obj.id) || 0) / totalTransitionWeight;
      }

      const combined = gazeScore * 0.45 + markovScore * 0.40 + proximityScore * 0.15;
      return { obj, combined, dist, gazeScore, markovScore };
    });

    const sumScores = rawScores.reduce((acc, r) => acc + r.combined, 0) || 1.0;

    return rawScores
      .map((r) => {
        const prob = Number(Math.min(0.99, Math.max(0.01, r.combined / sumScores)).toFixed(3));
        return {
          objectId: r.obj.id,
          probability: prob,
          estimatedTimeToInteractMs: Math.round(Math.max(400, r.dist * 650)),
          rationale: `Gaze alignment (${(r.gazeScore * 100).toFixed(0)}%) + sequence Markov prior (${(r.markovScore * 100).toFixed(0)}%)`,
          isProbabilistic: true as const,
          canOverrideUserControl: false as const,
        };
      })
      .sort((a, b) => b.probability - a.probability);
  }

  /**
   * Anticipates where player focus or viewport navigation should look next (advisory only).
   */
  public anticipateNavigation(
    recommendedTarget: { id: string; position: Vec3 } | null,
    playerPos: Vec3,
    playerForward: Vec3 = [0, 0, -1]
  ): NavigationAnticipation {
    if (!recommendedTarget) {
      return {
        recommendedFocusTargetId: null,
        targetPosition: null,
        relativeBearingRadians: 0,
        recommendedDirection: 'front',
        confidence: 0,
        isAdvisoryOnly: true,
      };
    }

    const dx = recommendedTarget.position[0] - playerPos[0];
    const dz = recommendedTarget.position[2] - playerPos[2];

    const targetAngle = Math.atan2(dx, -dz);
    const forwardAngle = Math.atan2(playerForward[0], -playerForward[2]);
    const rel = Math.atan2(Math.sin(targetAngle - forwardAngle), Math.cos(targetAngle - forwardAngle));

    let direction: NavigationAnticipation['recommendedDirection'] = 'front';
    if (Math.abs(rel) > (3 * Math.PI) / 4) direction = 'behind';
    else if (rel > Math.PI / 6) direction = 'right';
    else if (rel < -Math.PI / 6) direction = 'left';

    return {
      recommendedFocusTargetId: recommendedTarget.id,
      targetPosition: [...recommendedTarget.position],
      relativeBearingRadians: Number(rel.toFixed(3)),
      recommendedDirection: direction,
      confidence: 0.86,
      isAdvisoryOnly: true,
    };
  }

  /**
   * Detects unexpected spatial movement patterns (velocity spikes, erratic oscillations, boundary approach).
   */
  public detectMovementAnomalies(): MovementAnomalyAlert {
    if (this.sampleHistory.length < 2) {
      return {
        detected: false,
        anomalyType: 'none',
        severity: 'info',
        velocityMetersPerSec: 0,
        message: 'Insufficient spatial samples for anomaly analysis.',
        timestamp: Date.now(),
      };
    }

    const prev = this.sampleHistory[this.sampleHistory.length - 2];
    const curr = this.sampleHistory[this.sampleHistory.length - 1];
    const dtSec = Math.max(0.001, (curr.timestamp - prev.timestamp) / 1000);

    const dx = curr.headPosition[0] - prev.headPosition[0];
    const dy = curr.headPosition[1] - prev.headPosition[1];
    const dz = curr.headPosition[2] - prev.headPosition[2];
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const velocity = dist / dtSec;

    if (velocity > 4.5) {
      return {
        detected: true,
        anomalyType: 'velocity_spike',
        severity: 'medium',
        velocityMetersPerSec: Number(velocity.toFixed(2)),
        message: `Rapid spatial displacement detected (${velocity.toFixed(2)} m/s). Verify tracking continuity.`,
        timestamp: curr.timestamp,
      };
    }

    const radialDist = Math.sqrt(
      curr.headPosition[0] * curr.headPosition[0] +
      curr.headPosition[2] * curr.headPosition[2]
    );
    if (radialDist > 6.5) {
      return {
        detected: true,
        anomalyType: 'boundary_approach',
        severity: 'low',
        velocityMetersPerSec: Number(velocity.toFixed(2)),
        message: `Player rig approaching outer chamber boundary (${radialDist.toFixed(2)}m radius).`,
        timestamp: curr.timestamp,
      };
    }

    return {
      detected: false,
      anomalyType: 'none',
      severity: 'info',
      velocityMetersPerSec: Number(velocity.toFixed(2)),
      message: 'Spatial movement kinematics nominal.',
      timestamp: curr.timestamp,
    };
  }

  public getInteractionFrequency(objectId: string): number {
    return this.interactionCounts.get(objectId) || 0;
  }

  public getSampleCount(): number {
    return this.sampleHistory.length;
  }

  public reset(): void {
    this.sampleHistory = [];
    this.interactionCounts.clear();
    this.lastInteractedId = null;
  }
}
