// src/ai/adaptive/PlayerBehaviorAnalyzer.ts
import type { PlayerBehaviorMetrics } from './types';

export interface RawPlayerInputEvent {
  type: 'grab' | 'rotate' | 'release' | 'ray_dwell' | 'misalignment' | 'success' | 'idle';
  timestamp: number;
  position?: [number, number, number];
  rotationDelta?: number;
  durationMs?: number;
  targetId?: string;
  isSuccessful?: boolean;
}

export class PlayerBehaviorAnalyzer {
  private recentEvents: RawPlayerInputEvent[] = [];
  private consecutiveErrors = 0;
  private lastProgressTimestamp = Date.now();
  private readonly maxWindowDurationMs = 60000; // 1-minute rolling window

  public recordEvent(event: RawPlayerInputEvent): void {
    const now = event.timestamp || Date.now();
    this.recentEvents.push({ ...event, timestamp: now });

    if (event.type === 'success' || event.isSuccessful === true) {
      this.consecutiveErrors = 0;
      this.lastProgressTimestamp = now;
    } else if (event.type === 'misalignment' || event.isSuccessful === false) {
      this.consecutiveErrors++;
    }

    this.pruneOldEvents(now);
  }

  public analyze(currentTime = Date.now()): PlayerBehaviorMetrics {
    this.pruneOldEvents(currentTime);

    const windowMinutes = Math.max(0.1, (currentTime - (this.recentEvents[0]?.timestamp || currentTime)) / 60000);
    const actionsPerMinute = Math.min(120, this.recentEvents.length / windowMinutes);

    // Calculate interaction velocity (rotation rad/sec or translation speed)
    let totalVelocity = 0;
    let velocityCount = 0;
    let totalDwellMs = 0;

    for (const evt of this.recentEvents) {
      if (evt.type === 'rotate' && evt.rotationDelta !== undefined && evt.durationMs) {
        totalVelocity += Math.abs(evt.rotationDelta) / (evt.durationMs / 1000);
        velocityCount++;
      } else if (evt.type === 'ray_dwell' && evt.durationMs) {
        totalDwellMs += evt.durationMs;
      }
    }

    const avgVelocity = velocityCount > 0 ? totalVelocity / velocityCount : 1.0;
    const timeSinceLastProgressMs = Math.max(0, currentTime - this.lastProgressTimestamp);

    // Hesitation score: long dwells with low velocity and high idle
    const hesitationScore = Math.min(1.0, Math.max(0.0,
      (totalDwellMs / 15000) * 0.4 +
      (timeSinceLastProgressMs > 30000 ? 0.4 : (timeSinceLastProgressMs / 30000) * 0.3) +
      (actionsPerMinute < 10 ? 0.3 : 0.0)
    ));

    // Frustration index: high consecutive errors + fast erratic movement or stagnant progress
    let frustrationIndex = 0.0;
    if (this.consecutiveErrors >= 3) {
      frustrationIndex += Math.min(0.5, (this.consecutiveErrors - 2) * 0.15);
    }
    if (timeSinceLastProgressMs > 45000) {
      frustrationIndex += Math.min(0.5, (timeSinceLastProgressMs - 45000) / 60000);
    }
    frustrationIndex = Math.min(1.0, Math.max(0.0, frustrationIndex));

    // Boredom index: solved too quickly with zero errors and high idle
    let boredomIndex = 0.0;
    if (this.consecutiveErrors === 0 && timeSinceLastProgressMs < 10000 && actionsPerMinute > 30) {
      boredomIndex = 0.7;
    } else if (actionsPerMinute < 5 && timeSinceLastProgressMs < 15000) {
      boredomIndex = 0.4;
    }

    // Flow Channel Index: 0.0 (high frustration/too hard) -> 0.5 (perfect flow) -> 1.0 (high boredom/too easy)
    const flowChannelIndex = Math.min(1.0, Math.max(0.0,
      0.5 - (frustrationIndex * 0.5) + (boredomIndex * 0.5)
    ));

    return {
      timestamp: currentTime,
      interactionVelocity: Number(avgVelocity.toFixed(3)),
      gazeDwellDurationMs: totalDwellMs,
      consecutiveErrors: this.consecutiveErrors,
      timeSinceLastProgressMs,
      actionsPerMinute: Number(actionsPerMinute.toFixed(1)),
      hesitationScore: Number(hesitationScore.toFixed(3)),
      frustrationIndex: Number(frustrationIndex.toFixed(3)),
      boredomIndex: Number(boredomIndex.toFixed(3)),
      flowChannelIndex: Number(flowChannelIndex.toFixed(3)),
    };
  }

  public reset(): void {
    this.recentEvents = [];
    this.consecutiveErrors = 0;
    this.lastProgressTimestamp = Date.now();
  }

  private pruneOldEvents(currentTime: number): void {
    const cutoff = currentTime - this.maxWindowDurationMs;
    this.recentEvents = this.recentEvents.filter((e) => e.timestamp >= cutoff);
  }
}
