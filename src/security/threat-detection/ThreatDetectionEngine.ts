/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Threat Detection Engine
 * Coordinates real-time threat ingestion, sliding-window analysis, deduplication,
 * and security event dispatch.
 */

import { RawSecuritySignal, ThreatEvent } from './ThreatEvent';
import { ThreatClassifier } from './ThreatClassifier';
import { DistributedEventBus } from '../../engines/DistributedEventBus';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export class ThreatDetectionEngine {
  private static instance: ThreatDetectionEngine | null = null;
  private signalHistory: Map<string, RawSecuritySignal[]> = new Map();
  private recentThreats: Map<string, number> = new Map(); // Fingerprint -> timestamp (deduplication)
  private allowlistedIps: Set<string> = new Set(['127.0.0.1', 'localhost', '::1']);
  private detectedEvents: ThreatEvent[] = [];
  private suppressionWindowMs = 10000; // 10s deduplication suppression

  private constructor() {}

  public static getInstance(): ThreatDetectionEngine {
    if (!ThreatDetectionEngine.instance) {
      ThreatDetectionEngine.instance = new ThreatDetectionEngine();
    }
    return ThreatDetectionEngine.instance;
  }

  public static resetInstance(): void {
    if (ThreatDetectionEngine.instance) {
      ThreatDetectionEngine.instance.clear();
    }
    ThreatDetectionEngine.instance = null;
  }

  public clear(): void {
    this.signalHistory.clear();
    this.recentThreats.clear();
    this.detectedEvents = [];
  }

  public addAllowlistIp(ip: string): void {
    this.allowlistedIps.add(ip);
  }

  public removeAllowlistIp(ip: string): void {
    this.allowlistedIps.delete(ip);
  }

  /**
   * Ingests a raw security signal (e.g. failed login, 403, high rate) and evaluates for threats.
   */
  public async ingestSignal(
    signal: RawSecuritySignal,
    options?: { anomalyScore?: number; targetIsAdmin?: boolean }
  ): Promise<ThreatEvent | null> {
    const timestamp = signal.timestamp || Date.now();
    const sourceKey = signal.userId ? `user:${signal.userId}` : `ip:${signal.sourceIp}`;

    // Append to sliding window
    let history = this.signalHistory.get(sourceKey);
    if (!history) {
      history = [];
      this.signalHistory.set(sourceKey, history);
    }

    history.push({ ...signal, timestamp });

    // Evict signals older than 5 minutes
    const fiveMinutesAgo = timestamp - 300000;
    while (history.length > 0 && (history[0].timestamp || 0) < fiveMinutesAgo) {
      history.shift();
    }

    // Evaluate signals
    const threat = ThreatClassifier.classifySignals(history, sourceKey, options);

    if (threat) {
      // Check deduplication
      const lastTriggered = this.recentThreats.get(threat.fingerprint);
      if (lastTriggered && timestamp - lastTriggered < this.suppressionWindowMs) {
        // Suppress duplicated threat event within window
        return null;
      }

      this.recentThreats.set(threat.fingerprint, timestamp);
      this.detectedEvents.push(threat);

      // Keep recent detected events bounded to 200 items
      if (this.detectedEvents.length > 200) {
        this.detectedEvents.shift();
      }

      // Publish to DistributedEventBus
      try {
        const eventBus = DistributedEventBus.getInstance();
        eventBus.publish({
          eventType: 'SECURITY_EVENT' as any,
          source: 'ThreatDetectionEngine',
          priority: threat.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
          payload: {
            threatId: threat.id,
            category: threat.category,
            severity: threat.severity,
            riskScore: threat.riskScore,
            title: threat.title,
            sourceIp: threat.sourceIp,
            userId: threat.userId,
            endpoint: threat.endpoint,
            timestamp: threat.timestamp,
          },
          suppressionFingerprint: threat.fingerprint,
        });
      } catch {
        // Non-blocking
      }

      // Log via EnterpriseObservabilityManager
      try {
        const obs = EnterpriseObservabilityManager.getInstance();
        obs.log({
          level: threat.severity === 'CRITICAL' ? 'ERROR' : 'WARN',
          service: 'ThreatDetectionEngine',
          message: `[THREAT_DETECTED] ${threat.title} (Severity: ${threat.severity}, Score: ${threat.riskScore})`,
          metadata: {
            threatId: threat.id,
            category: threat.category,
            riskScore: threat.riskScore,
            sourceIp: threat.sourceIp,
          },
        });
      } catch {
        // Non-blocking
      }

      return threat;
    }

    return null;
  }

  public getRecentThreats(limit = 50): ThreatEvent[] {
    return this.detectedEvents.slice(-limit).reverse();
  }

  public getThreatCountByCategory(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const evt of this.detectedEvents) {
      counts[evt.category] = (counts[evt.category] || 0) + 1;
    }
    return counts;
  }

  public getThreatCountBySeverity(): Record<string, number> {
    const counts: Record<string, number> = {
      INFORMATIONAL: 0,
      LOW: 0,
      MEDIUM: 0,
      HIGH: 0,
      CRITICAL: 0,
    };
    for (const evt of this.detectedEvents) {
      counts[evt.severity] = (counts[evt.severity] || 0) + 1;
    }
    return counts;
  }
}
