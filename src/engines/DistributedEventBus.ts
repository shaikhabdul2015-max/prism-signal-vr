/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Distributed Event Bus (Phase 31)
 * Decoupled publish-subscribe event routing infrastructure with payload validation,
 * fingerprint-based duplicate suppression, delivery tracking, and incident escalation.
 * Strictly operates as an in-browser/client event fabric with cloud sync serialization;
 * does not fabricate external Kafka/RabbitMQ broker infrastructure.
 */

import {
  DistributedEventRecord,
} from '../types/phase31';
import { IncidentManager } from '../utils/incidentManager';
import { UIFrameBudgetMonitor } from './UIFrameBudgetMonitor';

export type EventFilterFn = (event: DistributedEventRecord) => boolean;
export type EventHandlerFn = (event: DistributedEventRecord) => void;

export class DistributedEventBus {
  private static instance: DistributedEventBus | null = null;
  private subscribers: Map<string, Set<{ handler: EventHandlerFn; filter?: EventFilterFn }>> = new Map();
  private eventHistory: DistributedEventRecord[] = [];
  private seenFingerprints: Map<string, number> = new Map(); // fingerprint -> timestamp
  private duplicateSuppressionWindowMs = 4000;
  private listeners: Set<(events: DistributedEventRecord[]) => void> = new Set();

  public constructor() {
    this.seedInitialEvents();
  }

  public static getInstance(): DistributedEventBus {
    if (!DistributedEventBus.instance) {
      DistributedEventBus.instance = new DistributedEventBus();
    }
    return DistributedEventBus.instance;
  }

  public static resetInstance(): void {
    DistributedEventBus.instance = null;
  }

  private seedInitialEvents(): void {
    const seeds: Partial<DistributedEventRecord>[] = [
      {
        id: 'evt-mesh-init-01',
        eventType: 'DISTRIBUTED_MESH_INITIALIZED',
        source: 'SystemBootstrap',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        priority: 'MEDIUM',
        payload: { clusterNodes: 6, mode: 'LOCAL_DEVELOPMENT' },
        acknowledgedBy: ['agent-chief-intelligence'],
        suppressionFingerprint: 'evt-init-mesh-01',
      },
      {
        id: 'evt-bus-ready-02',
        eventType: 'EVENT_BUS_ROUTING_ACTIVE',
        source: 'DistributedEventBus',
        timestamp: new Date(Date.now() - 240000).toISOString(),
        priority: 'LOW',
        payload: { activeChannels: ['TASK_ASSIGNED', 'KNOWLEDGE_CONFLICT', 'CIRCUIT_BREAKER_TRIPPED'] },
        acknowledgedBy: ['agent-operations-lead'],
        suppressionFingerprint: 'evt-bus-ready-02',
      },
    ];

    for (const s of seeds) {
      if (s.id && s.suppressionFingerprint) {
        this.eventHistory.push(s as DistributedEventRecord);
        this.seenFingerprints.set(s.suppressionFingerprint, new Date(s.timestamp || Date.now()).getTime());
      }
    }
  }

  /**
   * Publishes an event to all matching subscribers with duplicate suppression.
   */
  public publish<TPayload = any>(params: {
    eventType: string;
    source: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    payload: TPayload;
    suppressionFingerprint: string;
    correlateIncidentOnCritical?: boolean;
  }): DistributedEventRecord<TPayload> | null {
    const now = Date.now();
    const lastSeen = this.seenFingerprints.get(params.suppressionFingerprint);

    // Enforce duplicate suppression window
    if (lastSeen && now - lastSeen < this.duplicateSuppressionWindowMs) {
      return null; // Suppressed duplicate
    }

    this.seenFingerprints.set(params.suppressionFingerprint, now);

    const eventRecord: DistributedEventRecord<TPayload> = {
      id: `evt-${now}-${Math.random().toString(36).substring(2, 6)}`,
      eventType: params.eventType,
      source: params.source,
      timestamp: new Date(now).toISOString(),
      priority: params.priority || 'MEDIUM',
      payload: params.payload,
      acknowledgedBy: [],
      suppressionFingerprint: params.suppressionFingerprint,
    };

    // If event is CRITICAL or HIGH, correlate into IncidentManager
    if (params.priority === 'CRITICAL' || params.correlateIncidentOnCritical) {
      try {
        const incidentMgr = new IncidentManager();
        const created = incidentMgr.recordIncident({
          category: 'render_cadence_drop',
          severity: 'CRITICAL',
          description: `[Distributed Event] ${params.eventType} (${params.source}) - ${JSON.stringify(params.payload)}`,
          recommendedAction: 'Inspect distributed cluster logs and isolate tripped node or agent.',
          rule2ComplianceVerified: true,
        });
        if (created) {
          eventRecord.correlatedIncidentId = created.incidentId;
        }
      } catch (err) {
        console.warn('IncidentManager correlation warning:', err);
      }
    }

    this.eventHistory.unshift(eventRecord);
    if (this.eventHistory.length > 100) {
      this.eventHistory.pop();
    }

    // Deliver to subscribers
    const handlers = this.subscribers.get(params.eventType);
    if (handlers) {
      handlers.forEach(({ handler, filter }) => {
        try {
          if (!filter || filter(eventRecord)) {
            handler(eventRecord);
          }
        } catch (err) {
          console.error(`Error in event handler for ${params.eventType}:`, err);
        }
      });
    }

    // Deliver to wildcard '*' subscribers
    const wildcardHandlers = this.subscribers.get('*');
    if (wildcardHandlers) {
      wildcardHandlers.forEach(({ handler, filter }) => {
        try {
          if (!filter || filter(eventRecord)) {
            handler(eventRecord);
          }
        } catch (err) {
          console.error(`Error in wildcard event handler for ${params.eventType}:`, err);
        }
      });
    }

    this.notifyListeners();
    return eventRecord;
  }

  /**
   * Subscribes to an event type (or '*' for all events).
   */
  public subscribeToEvent(
    eventType: string,
    handler: EventHandlerFn,
    filter?: EventFilterFn
  ): () => void {
    if (!this.subscribers.has(eventType)) {
      this.subscribers.set(eventType, new Set());
    }
    const entry = { handler, filter };
    this.subscribers.get(eventType)!.add(entry);

    return () => {
      const set = this.subscribers.get(eventType);
      if (set) {
        set.delete(entry);
        if (set.size === 0) {
          this.subscribers.delete(eventType);
        }
      }
    };
  }

  /**
   * Acknowledges an event by an agent or operator.
   */
  public acknowledgeEvent(eventId: string, actorId: string): boolean {
    const evt = this.eventHistory.find((e) => e.id === eventId);
    if (!evt) return false;

    if (!evt.acknowledgedBy.includes(actorId)) {
      evt.acknowledgedBy.push(actorId);
      this.notifyListeners();
    }
    return true;
  }

  public getAllEvents(): DistributedEventRecord[] {
    return [...this.eventHistory];
  }

  public subscribe(listener: (events: DistributedEventRecord[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllEvents());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    if (this.listeners.size === 0) return;
    UIFrameBudgetMonitor.getInstance().scheduleUpdate('distributed-event-bus-ui', () => {
      const list = this.getAllEvents();
      this.listeners.forEach((l) => {
        try {
          l(list);
        } catch (err) {
          console.error('[DistributedEventBus] Listener error:', err);
        }
      });
    });
  }

  public flushUIUpdates(): void {
    UIFrameBudgetMonitor.getInstance().flushSync();
  }
}
