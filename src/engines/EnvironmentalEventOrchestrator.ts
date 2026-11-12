/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Environmental Event Orchestrator (Phase 30)
 * Aggregates and dispatches environmental events, anomaly notifications,
 * and boundary guardrail breaches:
 * - Fingerprint-based duplicate event suppression
 * - Correlates critical sensor anomalies into IncidentManager
 * - Dispatches priority alerts to responsible AI agents
 * - Maintains chronological event log
 */

import {
  EnvironmentalEventRecord,
  EnvironmentalEventType,
  AnomalySeverity,
  SensorAnomaly,
} from '../types/phase30';
import { AgentRole } from '../types/phase17';
import { IncidentManager } from '../utils/incidentManager';

export class EnvironmentalEventOrchestrator {
  private static instance: EnvironmentalEventOrchestrator | null = null;
  private events: EnvironmentalEventRecord[] = [];
  private incidentManager: IncidentManager;
  private listeners: Set<(events: EnvironmentalEventRecord[]) => void> = new Set();
  private readonly MAX_EVENTS = 60;

  public constructor(incidentManager: IncidentManager = new IncidentManager()) {
    this.incidentManager = incidentManager;
  }

  public static getInstance(): EnvironmentalEventOrchestrator {
    if (!EnvironmentalEventOrchestrator.instance) {
      EnvironmentalEventOrchestrator.instance = new EnvironmentalEventOrchestrator();
    }
    return EnvironmentalEventOrchestrator.instance;
  }

  public static resetInstance(): void {
    EnvironmentalEventOrchestrator.instance = null;
  }

  /**
   * Dispatches a structured environmental event with deduplication
   */
  public dispatchEvent(
    eventType: EnvironmentalEventType,
    severity: AnomalySeverity,
    summary: string,
    details: Record<string, unknown> = {},
    assignedAgent: AgentRole = 'OperationsAgent'
  ): EnvironmentalEventRecord | null {
    const now = Date.now();

    // Check duplicate suppression within 4 seconds window
    const isDuplicate = this.events.some(
      (e) =>
        e.eventType === eventType &&
        e.summary === summary &&
        now - e.timestampMs < 4000
    );

    if (isDuplicate) {
      return null;
    }

    const eventRecord: EnvironmentalEventRecord = {
      id: `evt-${now}-${Math.random().toString(36).substring(2, 6)}`,
      timestampMs: now,
      eventType,
      severity,
      summary,
      details,
      assignedAgent,
      isSuppressedDuplicate: false,
    };

    // If severity is HIGH or CRITICAL, correlate with IncidentManager
    if (severity === 'HIGH' || severity === 'CRITICAL') {
      try {
        const incident = this.incidentManager.recordIncident({
          category: eventType === 'BOUNDARY_WARNING' ? 'environmental_inconclusive' : 'tracking_loss',
          severity: severity,
          description: `[Phase 30 Sensor] ${summary}`,
          recommendedAction: 'Inspect optical sensors and activate failsafe reality profile.',
          rule2ComplianceVerified: true,
        });
        eventRecord.correlatedIncidentId = incident.incidentId;
      } catch (err) {
        console.warn('[EnvironmentalEventOrchestrator] Incident correlation notice:', err);
      }
    }

    this.events.unshift(eventRecord);
    if (this.events.length > this.MAX_EVENTS) {
      this.events.pop();
    }

    this.notify();
    return eventRecord;
  }

  /**
   * Ingests anomalies from the anomaly detection engine
   */
  public ingestAnomaly(anomaly: SensorAnomaly): EnvironmentalEventRecord | null {
    let assignedAgent: AgentRole = 'OperationsAgent';
    if (anomaly.sourceSensor === 'WEBXR_TRACKING') assignedAgent = 'TrackingAgent';
    else if (anomaly.sourceSensor === 'BROWSER_PERFORMANCE') assignedAgent = 'PerformanceAgent';
    else if (anomaly.severity === 'CRITICAL') assignedAgent = 'IncidentAgent';

    return this.dispatchEvent(
      'ANOMALY_TRIGGER',
      anomaly.severity,
      `Anomaly in ${anomaly.sourceSensor}: ${anomaly.explanation}`,
      {
        anomalyId: anomaly.id,
        sourceSensor: anomaly.sourceSensor,
        observed: anomaly.observedMeasurement,
        expected: anomaly.expectedRange,
        recommendation: anomaly.recommendedResponse,
      },
      assignedAgent
    );
  }

  public getAllEvents(): EnvironmentalEventRecord[] {
    return [...this.events];
  }

  public getEventsBySeverity(severity: AnomalySeverity): EnvironmentalEventRecord[] {
    return this.events.filter((e) => e.severity === severity);
  }

  public clearEvents(): void {
    this.events = [];
    this.notify();
  }

  public subscribe(callback: (events: EnvironmentalEventRecord[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAllEvents());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const list = this.getAllEvents();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('[EnvironmentalEventOrchestrator] listener error:', err);
      }
    });
  }
}

export const environmentalEventOrchestrator = EnvironmentalEventOrchestrator.getInstance();
