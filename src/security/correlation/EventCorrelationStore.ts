/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Event Correlation Store
 * Stores recent sanitized security events for correlation, timeline analysis, and pattern discovery.
 */

import { ThreatEvent } from '../threat-detection/ThreatEvent';

export class EventCorrelationStore {
  private static instance: EventCorrelationStore | null = null;
  private events: ThreatEvent[] = [];
  private maxEvents = 1000;

  private constructor() {}

  public static getInstance(): EventCorrelationStore {
    if (!EventCorrelationStore.instance) {
      EventCorrelationStore.instance = new EventCorrelationStore();
    }
    return EventCorrelationStore.instance;
  }

  public static resetInstance(): void {
    if (EventCorrelationStore.instance) {
      EventCorrelationStore.instance.events = [];
    }
    EventCorrelationStore.instance = null;
  }

  public storeEvent(event: ThreatEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }
  }

  public getEventsBySourceIp(ip: string, timeWindowSeconds = 300): ThreatEvent[] {
    const cutoff = Date.now() - timeWindowSeconds * 1000;
    return this.events.filter(
      (e) => e.sourceIp === ip && new Date(e.timestamp).getTime() >= cutoff
    );
  }

  public getEventsByUserId(userId: string, timeWindowSeconds = 300): ThreatEvent[] {
    const cutoff = Date.now() - timeWindowSeconds * 1000;
    return this.events.filter(
      (e) => e.userId === userId && new Date(e.timestamp).getTime() >= cutoff
    );
  }

  public getAllRecentEvents(limit = 100): ThreatEvent[] {
    return this.events.slice(-limit).reverse();
  }
}
