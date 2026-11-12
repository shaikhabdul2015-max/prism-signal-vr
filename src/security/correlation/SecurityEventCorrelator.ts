/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Security Event Correlator
 * Centralized security event correlation engine aggregating signals across W3C traces,
 * IPs, user sessions, and cryptographic key operations.
 */

import { ThreatEvent } from '../threat-detection/ThreatEvent';
import { EventCorrelationStore } from './EventCorrelationStore';
import { AttackPatternAnalyzer, CorrelatedAttackCluster } from './AttackPatternAnalyzer';
import { DistributedEventBus } from '../../engines/DistributedEventBus';
import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';

export class SecurityEventCorrelator {
  private static instance: SecurityEventCorrelator | null = null;
  private store: EventCorrelationStore;

  private constructor() {
    this.store = EventCorrelationStore.getInstance();
  }

  public static getInstance(): SecurityEventCorrelator {
    if (!SecurityEventCorrelator.instance) {
      SecurityEventCorrelator.instance = new SecurityEventCorrelator();
    }
    return SecurityEventCorrelator.instance;
  }

  public static resetInstance(): void {
    EventCorrelationStore.resetInstance();
    SecurityEventCorrelator.instance = null;
  }

  /**
   * Ingests a threat event and evaluates cross-event correlations.
   */
  public async correlateEvent(event: ThreatEvent): Promise<CorrelatedAttackCluster | null> {
    this.store.storeEvent(event);

    // Retrieve recent events from the same source IP (5 min window)
    const recentFromIp = this.store.getEventsBySourceIp(event.sourceIp, 300);
    const cluster = AttackPatternAnalyzer.analyzePattern(recentFromIp, event.sourceIp);

    if (cluster && cluster.isCoordinatedAttack) {
      try {
        const obs = EnterpriseObservabilityManager.getInstance();
        obs.log({
          level: 'ERROR',
          service: 'SecurityEventCorrelator',
          message: `[COORDINATED_ATTACK_DETECTED] Source: ${event.sourceIp}, Pattern: ${cluster.patternName} (${cluster.stageCount} stages)`,
          metadata: {
            sourceIp: event.sourceIp,
            stages: cluster.stages,
            confidence: cluster.confidence,
          },
        });

        const eventBus = DistributedEventBus.getInstance();
        eventBus.publish({
          eventType: 'SECURITY_EVENT' as any,
          source: 'SecurityEventCorrelator',
          priority: 'CRITICAL',
          payload: {
            action: 'COORDINATED_ATTACK_DETECTED',
            sourceIp: event.sourceIp,
            pattern: cluster.patternName,
            stages: cluster.stages,
            confidence: cluster.confidence,
          },
          suppressionFingerprint: `coord_attack_${event.sourceIp}_${cluster.stages.length}`,
        });
      } catch {
        // Non-blocking
      }
    }

    return cluster;
  }
}
