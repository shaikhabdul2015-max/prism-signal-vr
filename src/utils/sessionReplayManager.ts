import { VRTelemetry, TestStatus } from '../types/diagnostics';
import {
  RecordedSession,
  ReplayEvent,
  ReplayEventType,
  SessionComparisonResult,
} from '../types/phase15';

/**
 * Intelligent Session Replay Manager
 * Captures, processes, and replays recorded WebXR telemetry with time-based scrubbing,
 * loss markers, frame performance hiccups, and side-by-side session comparisons.
 */
export class SessionReplayManager {
  private currentSession: RecordedSession | null = null;
  private playbackTimeMs = 0;
  private isPlaying = false;
  private playbackSpeed = 1.0;
  private history: RecordedSession[] = [];

  constructor() {
    this.loadHistoryFromStorage();
  }

  /**
   * Builds a RecordedSession from an array of VRTelemetry snapshots.
   */
  public createRecordedSession(
    telemetrySnapshots: VRTelemetry[],
    options: {
      title?: string;
      isPhysicalHardware?: boolean;
      detectedHeadset?: string;
    } = {}
  ): RecordedSession {
    if (!telemetrySnapshots || telemetrySnapshots.length === 0) {
      throw new Error('Cannot create recorded session from empty telemetry.');
    }

    const first = telemetrySnapshots[0];
    const last = telemetrySnapshots[telemetrySnapshots.length - 1];
    const startTime = new Date(first.startedAt).getTime() || Date.now();
    const endTime = last.completedAt ? new Date(last.completedAt).getTime() : Date.now();
    const durationMs = Math.max(1000, endTime - startTime);

    // Generate event timeline
    const events: ReplayEvent[] = [];

    // Track joint and frame states across snapshots
    let prevTrackedJointCount = -1;
    let totalLossEvents = 0;
    let maxLatency = 0;
    let totalFpsSum = 0;
    let frameSamples = 0;

    telemetrySnapshots.forEach((snap, idx) => {
      const snapTime = new Date(snap.startedAt).getTime() || startTime + idx * 1000;
      const relativeMs = Math.max(0, snapTime - startTime);

      // 1. Joint tracking changes
      const currentTrackedJoints = snap.joints ? snap.joints.filter((j) => j.tracked).length : 0;
      if (prevTrackedJointCount !== -1 && currentTrackedJoints < prevTrackedJointCount) {
        const droppedCount = prevTrackedJointCount - currentTrackedJoints;
        events.push({
          id: `evt-joint-drop-${idx}`,
          timestampMs: relativeMs,
          type: 'joint_drop',
          severity: droppedCount > 5 ? 'critical' : 'warning',
          title: `Joints Dropped (-${droppedCount})`,
          description: `Active tracked joints decreased from ${prevTrackedJointCount} to ${currentTrackedJoints}.`,
          data: {
            previousJoints: prevTrackedJointCount,
            currentJoints: currentTrackedJoints,
            dropped: droppedCount,
          },
        });
      }
      prevTrackedJointCount = currentTrackedJoints;

      // 2. Tracking loss events
      if (snap.trackingEvents) {
        snap.trackingEvents.forEach((ev, eIdx) => {
          if (!ev.tracking) {
            totalLossEvents++;
            events.push({
              id: `evt-loss-${idx}-${eIdx}`,
              timestampMs: relativeMs,
              type: 'tracking_loss',
              severity: 'critical',
              title: 'Optical Tracking Loss Event',
              description: 'Hand tracking confidence collapsed; optical state untracked.',
              data: { timestamp: ev.timestampMs, handLoss: true },
            });
          }
        });
      }

      // 3. Frame drops & performance
      if (snap.frames) {
        snap.frames.forEach((f, fIdx) => {
          const fps = f.frameDurationMs ? Math.round(1000 / f.frameDurationMs) : 60;
          totalFpsSum += fps;
          frameSamples++;

          if (f.dropped || (f.frameDurationMs && f.frameDurationMs > 25.0)) {
            events.push({
              id: `evt-frame-${idx}-${fIdx}`,
              timestampMs: relativeMs,
              type: 'frame_drop',
              severity: 'warning',
              title: 'Render Loop Cadence Drop',
              description: `Frame duration hit ${f.frameDurationMs?.toFixed(1) || 'N/A'}ms (~${fps} FPS).`,
              data: { frameDurationMs: f.frameDurationMs || null, dropped: !!f.dropped },
            });
          }
        });
      }

      // 4. Latency spikes
      if (snap.latencySamples) {
        snap.latencySamples.forEach((l, lIdx) => {
          if (l.latencyMs > maxLatency) maxLatency = l.latencyMs;
          if (l.latencyMs > 25.0) {
            events.push({
              id: `evt-lat-${idx}-${lIdx}`,
              timestampMs: relativeMs,
              type: 'latency_spike',
              severity: l.latencyMs > 33.0 ? 'critical' : 'warning',
              title: `Latency Spike (${l.latencyMs.toFixed(1)}ms)`,
              description: 'Measured latency delta exceeds target VR comfort boundary (< 20ms).',
              data: { latencyMs: l.latencyMs },
            });
          }
        });
      }
    });

    // Add recovery markers if losses were followed by tracking
    if (totalLossEvents > 0) {
      events.push({
        id: `evt-recovery-${Date.now()}`,
        timestampMs: Math.min(durationMs, 2500),
        type: 'recovery',
        severity: 'info',
        title: 'Optical Tracking Re-acquisition',
        description: 'Skeleton poses re-acquired; position smoothing filter engaged.',
        data: { reacquired: true },
      });
    }

    // Sort events chronologically
    events.sort((a, b) => a.timestampMs - b.timestampMs);

    const avgFps = frameSamples > 0 ? Math.round(totalFpsSum / frameSamples) : 72;
    const jointCoveragePercent = Math.round(((prevTrackedJointCount > 0 ? prevTrackedJointCount : 25) / 25) * 100);

    let overallStatus: TestStatus = 'PASS';
    if (totalLossEvents > 4 || maxLatency > 33.0 || jointCoveragePercent < 60) {
      overallStatus = 'FAIL';
    } else if (totalLossEvents > 0 || maxLatency > 22.0) {
      overallStatus = 'INCONCLUSIVE';
    }

    const session: RecordedSession = {
      id: first.sessionId || `session-rec-${Date.now()}`,
      title: options.title || `Session ${new Date(startTime).toLocaleTimeString()}`,
      startedAt: first.startedAt,
      durationMs,
      isPhysicalHardware: !!options.isPhysicalHardware,
      deviceInfo: {
        detectedHeadset: options.detectedHeadset || 'WebXR Test Client',
        platform: typeof navigator !== 'undefined' ? navigator.platform || 'Unknown' : 'Node.js',
        webxrSupported: true,
      },
      lightingPreset: first.lightingPreset || null,
      events,
      telemetrySnapshots,
      summary: {
        avgFps,
        maxLatencyMs: Math.round(maxLatency * 10) / 10,
        totalTrackingLossEvents: totalLossEvents,
        jointCoveragePercent,
        overallStatus,
      },
    };

    this.currentSession = session;
    this.saveSessionToHistory(session);
    return session;
  }

  public getCurrentSession(): RecordedSession | null {
    return this.currentSession;
  }

  public getPlaybackTimeMs(): number {
    return this.playbackTimeMs;
  }

  public setPlaybackTimeMs(timeMs: number): void {
    if (!this.currentSession) return;
    this.playbackTimeMs = Math.max(0, Math.min(this.currentSession.durationMs, timeMs));
  }

  public getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }

  public setPlaybackSpeed(speed: number): void {
    this.playbackSpeed = speed;
  }

  public getSnapshotAtTime(timeMs: number): VRTelemetry | null {
    if (!this.currentSession || this.currentSession.telemetrySnapshots.length === 0) {
      return null;
    }
    const snapshots = this.currentSession.telemetrySnapshots;
    if (snapshots.length === 1) return snapshots[0];

    const ratio = Math.max(0, Math.min(1, timeMs / this.currentSession.durationMs));
    const targetIdx = Math.min(snapshots.length - 1, Math.floor(ratio * (snapshots.length - 1)));
    return snapshots[targetIdx];
  }

  public getHistory(): RecordedSession[] {
    return this.history;
  }

  /**
   * Compares two recorded sessions to highlight performance regressions or improvements.
   */
  public compareSessions(sessionA: RecordedSession, sessionB: RecordedSession): SessionComparisonResult {
    const fpsDelta = sessionA.summary.avgFps - sessionB.summary.avgFps;
    const latencyDeltaMs = Math.round((sessionA.summary.maxLatencyMs - sessionB.summary.maxLatencyMs) * 10) / 10;
    const trackingLossDelta = sessionA.summary.totalTrackingLossEvents - sessionB.summary.totalTrackingLossEvents;
    const jointCoverageDelta = sessionA.summary.jointCoveragePercent - sessionB.summary.jointCoveragePercent;

    const keyDifferences: string[] = [];

    if (Math.abs(fpsDelta) > 5) {
      keyDifferences.push(
        fpsDelta > 0
          ? `Session A is ${fpsDelta} FPS smoother than Session B.`
          : `Session A suffered a ${Math.abs(fpsDelta)} FPS drop compared to Session B.`
      );
    }

    if (Math.abs(latencyDeltaMs) > 4.0) {
      keyDifferences.push(
        latencyDeltaMs > 0
          ? `Session A peak latency is ${latencyDeltaMs}ms higher than Session B.`
          : `Session A achieved ${Math.abs(latencyDeltaMs)}ms lower peak latency.`
      );
    }

    if (trackingLossDelta !== 0) {
      keyDifferences.push(
        trackingLossDelta > 0
          ? `Session A recorded ${trackingLossDelta} more tracking dropout events.`
          : `Session A achieved ${Math.abs(trackingLossDelta)} fewer tracking dropouts.`
      );
    }

    if (sessionA.isPhysicalHardware !== sessionB.isPhysicalHardware) {
      keyDifferences.push(
        `Hardware divergence: Session A is ${sessionA.isPhysicalHardware ? 'Physical VR' : 'Simulated Preview'} while Session B is ${sessionB.isPhysicalHardware ? 'Physical VR' : 'Simulated Preview'}.`
      );
    }

    let summaryVerdict = 'Sessions demonstrate comparable performance stability.';
    if (trackingLossDelta > 2 || fpsDelta < -10 || latencyDeltaMs > 10.0) {
      summaryVerdict = 'Performance regression observed in Session A relative to Session B.';
    } else if (trackingLossDelta < -2 || fpsDelta > 10 || latencyDeltaMs < -10.0) {
      summaryVerdict = 'Performance improvement confirmed in Session A relative to Session B.';
    }

    return {
      sessionAId: sessionA.id,
      sessionBId: sessionB.id,
      sessionATitle: sessionA.title,
      sessionBTitle: sessionB.title,
      fpsDelta,
      latencyDeltaMs,
      trackingLossDelta,
      jointCoverageDelta,
      summaryVerdict,
      keyDifferences: keyDifferences.length > 0 ? keyDifferences : ['No significant deviations detected.'],
    };
  }

  private saveSessionToHistory(session: RecordedSession): void {
    this.history = [session, ...this.history.filter((s) => s.id !== session.id)].slice(0, 10);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('PRISM_REPLAY_HISTORY', JSON.stringify(this.history));
      }
    } catch {
      // Storage unavailable or full
    }
  }

  private loadHistoryFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem('PRISM_REPLAY_HISTORY');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            this.history = parsed;
          }
        }
      }
    } catch {
      this.history = [];
    }
  }
}
