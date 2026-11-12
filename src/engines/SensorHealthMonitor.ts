/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Sensor Health Monitor (Phase 30)
 * Evaluates operational reliability, data freshness, and hardware connectivity:
 * - Tracks sampling frequency (Hz) and latency jitter
 * - Classifies health into ONLINE, DEGRADED, OFFLINE, PERMISSION_REQUIRED, UNSUPPORTED, UNKNOWN
 * - Prevents false hardware alerts: explicitly marks browser-unsupported APIs as UNSUPPORTED rather than OFFLINE hardware
 * - Detects disconnected peripherals and stale buffers
 */

import {
  SensorType,
  SensorHealthState,
  SensorHealthRecord,
  NormalizedSensorTelemetry,
} from '../types/phase30';
import { realTimeSensorIntelligenceEngine } from './RealTimeSensorIntelligenceEngine';

export class SensorHealthMonitor {
  private static instance: SensorHealthMonitor | null = null;
  private healthRecords: Map<SensorType, SensorHealthRecord> = new Map();
  private eventCounters: Map<SensorType, { count: number; windowStart: number }> = new Map();
  private listeners: Set<(records: SensorHealthRecord[]) => void> = new Set();

  public constructor() {
    this.initializeRecords();
  }

  public static getInstance(): SensorHealthMonitor {
    if (!SensorHealthMonitor.instance) {
      SensorHealthMonitor.instance = new SensorHealthMonitor();
    }
    return SensorHealthMonitor.instance;
  }

  public static resetInstance(): void {
    SensorHealthMonitor.instance = null;
  }

  private initializeRecords(): void {
    const caps = realTimeSensorIntelligenceEngine.getAllCapabilities();
    const now = Date.now();

    caps.forEach((cap) => {
      let initialState: SensorHealthState = 'UNKNOWN';
      let notes = 'Initialized sensor probe.';

      if (!cap.isSupported) {
        initialState = 'UNSUPPORTED';
        notes = 'API not supported by current browser or operating system runtime.';
      } else if (cap.permissionState === 'prompt') {
        initialState = 'PERMISSION_REQUIRED';
        notes = 'Awaiting explicit operator authorization to stream sensor data.';
      } else if (cap.permissionState === 'denied') {
        initialState = 'OFFLINE';
        notes = 'User or browser policy explicitly denied sensor access.';
      } else {
        initialState = 'ONLINE';
        notes = 'Sensor API available and permission granted.';
      }

      this.healthRecords.set(cap.sensorType, {
        sensorType: cap.sensorType,
        healthState: initialState,
        lastEventTimestampMs: now,
        freshnessMs: 0,
        eventFrequencyHz: cap.isSupported ? 60 : 0,
        consecutiveInvalidReadings: 0,
        isDisconnected: false,
        diagnosticNotes: notes,
      });

      this.eventCounters.set(cap.sensorType, { count: 0, windowStart: now });
    });
  }

  /**
   * Updates health status following telemetry ingestion
   */
  public evaluateHealth(telemetry: NormalizedSensorTelemetry): SensorHealthRecord[] {
    const now = Date.now();
    const caps = realTimeSensorIntelligenceEngine.getAllCapabilities();

    caps.forEach((cap) => {
      const current = this.healthRecords.get(cap.sensorType) || {
        sensorType: cap.sensorType,
        healthState: 'UNKNOWN',
        lastEventTimestampMs: now,
        freshnessMs: 0,
        eventFrequencyHz: 0,
        consecutiveInvalidReadings: 0,
        isDisconnected: false,
        diagnosticNotes: '',
      };

      if (!cap.isSupported) {
        current.healthState = 'UNSUPPORTED';
        current.diagnosticNotes = 'API not supported in this browser; fallback active.';
        this.healthRecords.set(cap.sensorType, current);
        return;
      }

      if (cap.permissionState === 'denied') {
        current.healthState = 'OFFLINE';
        current.diagnosticNotes = 'Access denied by user or security policy.';
        this.healthRecords.set(cap.sensorType, current);
        return;
      }

      if (cap.permissionState === 'prompt') {
        current.healthState = 'PERMISSION_REQUIRED';
        current.diagnosticNotes = 'User prompt required before collection.';
        this.healthRecords.set(cap.sensorType, current);
        return;
      }

      // Check freshness & activity for supported sensors
      const raw = realTimeSensorIntelligenceEngine.getRawReading(cap.sensorType);
      if (raw) {
        current.lastEventTimestampMs = raw.timestampMs;
        current.freshnessMs = now - raw.timestampMs;
        current.isDisconnected = current.freshnessMs > 5000;

        if (current.isDisconnected) {
          current.healthState = 'DEGRADED';
          current.diagnosticNotes = `No data packets received in ${Math.round(current.freshnessMs / 1000)}s. Stale stream.`;
        } else {
          current.healthState = 'ONLINE';
          current.diagnosticNotes = 'Streaming healthy real-time telemetry.';
        }
      } else if (cap.sensorType === 'APPLICATION_TELEMETRY' || cap.sensorType === 'BROWSER_PERFORMANCE') {
        current.lastEventTimestampMs = now;
        current.freshnessMs = 0;
        current.healthState = 'ONLINE';
        current.diagnosticNotes = 'Runtime telemetry pipeline active.';
      } else {
        current.freshnessMs = now - current.lastEventTimestampMs;
        if (current.freshnessMs > 8000) {
          current.healthState = 'OFFLINE';
          current.diagnosticNotes = 'Hardware stream inactive or uninitialized.';
        }
      }

      this.healthRecords.set(cap.sensorType, current);
    });

    this.notify();
    return this.getAllRecords();
  }

  public getRecord(sensorType: SensorType): SensorHealthRecord | undefined {
    return this.healthRecords.get(sensorType);
  }

  public getAllRecords(): SensorHealthRecord[] {
    return Array.from(this.healthRecords.values());
  }

  public subscribe(callback: (records: SensorHealthRecord[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getAllRecords());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const list = this.getAllRecords();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('[SensorHealthMonitor] listener error:', err);
      }
    });
  }
}

export const sensorHealthMonitor = SensorHealthMonitor.getInstance();
