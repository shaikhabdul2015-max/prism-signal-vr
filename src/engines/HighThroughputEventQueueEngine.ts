/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * High-Throughput Event Queue Engine (Stage 1 Core Architecture)
 * Production-grade asynchronous event ingestion and dispatch fabric with:
 * - High-speed Circular Ring-Buffer architecture (zero-reallocation during steady state)
 * - Microtask-batched dispatch to decouple high-frequency producers from UI render loops
 * - Dynamic Backpressure Management with configurable High/Low Watermarks
 * - Slow-Consumer Isolation with execution deadlines and circuit breaker quarantine
 * - Comprehensive Telemetry & Latency Profiling (P50, P95, P99, Throughput EPS)
 * - Seamless interoperability with Phase 31 DistributedEventBus
 */

import { DistributedEventRecord } from '../types/phase31';
import { DistributedEventBus } from './DistributedEventBus';
import { UIFrameBudgetMonitor } from './UIFrameBudgetMonitor';

export type QueueOverflowPolicy = 'DROP_OLDEST' | 'REJECT_NEW' | 'DROP_LOW_PRIORITY';
export type ConsumerHealthStatus = 'HEALTHY' | 'SLOW' | 'DEGRADED' | 'QUARANTINED';

export interface HighThroughputQueueConfig {
  capacity?: number;
  batchSize?: number;
  flushIntervalMs?: number;
  highWatermarkRatio?: number; // e.g. 0.80
  lowWatermarkRatio?: number;  // e.g. 0.20
  overflowPolicy?: QueueOverflowPolicy;
  duplicateSuppressionWindowMs?: number;
  consumerTimeoutMs?: number;
  consecutiveErrorThreshold?: number;
  enableEventBusBridge?: boolean;
}

export interface LatencyTelemetry {
  sampleCount: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  minMs: number;
}

export interface ConsumerTelemetry {
  consumerId: string;
  eventType: string;
  status: ConsumerHealthStatus;
  eventsProcessed: number;
  consecutiveFailures: number;
  totalFailures: number;
  avgExecutionDurationMs: number;
  lastExecutionAt?: string;
  quarantineReason?: string;
}

export interface QueueTelemetrySnapshot {
  capacity: number;
  currentQueueDepth: number;
  bufferUtilizationPercent: number;
  isBackpressureActive: boolean;
  eventsEnqueuedTotal: number;
  eventsProcessedTotal: number;
  eventsDroppedTotal: number;
  duplicatesSuppressedTotal: number;
  currentThroughputEps: number;
  latency: LatencyTelemetry;
  consumers: ConsumerTelemetry[];
  isDraining: boolean;
  isShutdown: boolean;
  timestamp: string;
}

export type QueueEventHandler<TPayload = any> = (
  event: DistributedEventRecord<TPayload>
) => Promise<void> | void;

interface RegisteredConsumer {
  id: string;
  eventType: string;
  handler: QueueEventHandler;
  timeoutMs: number;
  consecutiveFailures: number;
  totalFailures: number;
  eventsProcessed: number;
  totalDurationMs: number;
  status: ConsumerHealthStatus;
  quarantineReason?: string;
  lastExecutionAt?: string;
}

interface QueuedEventEnvelope<TPayload = any> {
  event: DistributedEventRecord<TPayload>;
  enqueuedAtMs: number;
  processedAtMs?: number;
}

export class HighThroughputEventQueueEngine {
  private static instance: HighThroughputEventQueueEngine | null = null;

  // Ring Buffer State
  private ringBuffer: Array<QueuedEventEnvelope | null>;
  private capacity: number;
  private head = 0; // Points to next read
  private tail = 0; // Points to next write
  private currentCount = 0;

  // Configuration
  private batchSize: number;
  private flushIntervalMs: number;
  private highWatermark: number;
  private lowWatermark: number;
  private overflowPolicy: QueueOverflowPolicy;
  private duplicateSuppressionWindowMs: number;
  private consumerTimeoutMs: number;
  private consecutiveErrorThreshold: number;
  private enableEventBusBridge: boolean;

  // Backpressure & Lifecycle State
  private isBackpressureEngaged = false;
  private isProcessingScheduled = false;
  private isDraining = false;
  private isShutdown = false;
  private timerHandle: NodeJS.Timeout | null = null;

  // Consumers & Suppression
  private consumers: Map<string, RegisteredConsumer> = new Map(); // consumerId -> consumer
  private subscribersByEvent: Map<string, Set<string>> = new Map(); // eventType -> Set of consumerIds
  private seenFingerprints: Map<string, number> = new Map(); // fingerprint -> timestampMs

  // Performance Telemetry & Profiling
  private eventsEnqueuedTotal = 0;
  private eventsProcessedTotal = 0;
  private eventsDroppedTotal = 0;
  private duplicatesSuppressedTotal = 0;
  private recentLatenciesMs: number[] = [];
  private readonly maxLatencySamples = 2000;

  // Throughput Rate Calculation
  private throughputRateCounter = 0;
  private throughputRateWindowStart = Date.now();
  private currentThroughputEps = 0;

  // Listeners for telemetry subscribers
  private telemetryListeners: Set<(snapshot: QueueTelemetrySnapshot) => void> = new Set();

  public constructor(config: HighThroughputQueueConfig = {}) {
    this.capacity = Math.max(100, config.capacity ?? 10000);
    this.batchSize = Math.max(1, config.batchSize ?? 500);
    this.flushIntervalMs = Math.max(1, config.flushIntervalMs ?? 5);
    this.highWatermark = Math.floor(this.capacity * (config.highWatermarkRatio ?? 0.8));
    this.lowWatermark = Math.floor(this.capacity * (config.lowWatermarkRatio ?? 0.2));
    this.overflowPolicy = config.overflowPolicy ?? 'DROP_LOW_PRIORITY';
    this.duplicateSuppressionWindowMs = config.duplicateSuppressionWindowMs ?? 4000;
    this.consumerTimeoutMs = config.consumerTimeoutMs ?? 500;
    this.consecutiveErrorThreshold = config.consecutiveErrorThreshold ?? 3;
    this.enableEventBusBridge = config.enableEventBusBridge ?? true;

    this.ringBuffer = new Array(this.capacity).fill(null);

    // Start background telemetry rate heartbeat
    if (typeof setInterval !== 'undefined') {
      this.timerHandle = setInterval(() => {
        this.updateThroughputRate();
        this.pruneSuppressionFingerprints();
      }, 1000);
      if (this.timerHandle && typeof this.timerHandle === 'object' && 'unref' in this.timerHandle) {
        (this.timerHandle as any).unref();
      }
    }
  }

  public static getInstance(config?: HighThroughputQueueConfig): HighThroughputEventQueueEngine {
    if (!HighThroughputEventQueueEngine.instance) {
      HighThroughputEventQueueEngine.instance = new HighThroughputEventQueueEngine(config);
    }
    return HighThroughputEventQueueEngine.instance;
  }

  public static resetInstance(): void {
    if (HighThroughputEventQueueEngine.instance) {
      HighThroughputEventQueueEngine.instance.shutdown();
      HighThroughputEventQueueEngine.instance = null;
    }
  }

  /**
   * Enqueues an event for asynchronous high-throughput dispatch.
   * Returns true if successfully enqueued, false if dropped (overflow, duplicate, or shutdown).
   */
  public enqueue<TPayload = any>(params: {
    eventType: string;
    source: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    payload: TPayload;
    suppressionFingerprint?: string;
  }): boolean {
    if (this.isShutdown) {
      this.eventsDroppedTotal++;
      return false;
    }

    const now = Date.now();
    const fingerprint = params.suppressionFingerprint || `${params.eventType}-${params.source}-${now}-${Math.random().toString(36).slice(2, 6)}`;

    // 1. Duplicate Suppression Check
    const lastSeen = this.seenFingerprints.get(fingerprint);
    if (lastSeen && now - lastSeen < this.duplicateSuppressionWindowMs) {
      this.duplicatesSuppressedTotal++;
      return false;
    }
    this.seenFingerprints.set(fingerprint, now);

    const eventRecord: DistributedEventRecord<TPayload> = {
      id: `htq-${now}-${Math.random().toString(36).slice(2, 7)}`,
      eventType: params.eventType,
      source: params.source,
      timestamp: new Date(now).toISOString(),
      priority: params.priority || 'MEDIUM',
      payload: params.payload,
      acknowledgedBy: [],
      suppressionFingerprint: fingerprint,
    };

    // 2. Capacity & Backpressure Checks
    if (this.currentCount >= this.capacity) {
      const handled = this.handleBufferOverflow(eventRecord, now);
      if (!handled) {
        this.eventsDroppedTotal++;
        return false;
      }
    } else {
      // Normal enqueue into ring buffer
      this.ringBuffer[this.tail] = { event: eventRecord, enqueuedAtMs: now };
      this.tail = (this.tail + 1) % this.capacity;
      this.currentCount++;
    }

    this.eventsEnqueuedTotal++;
    this.throughputRateCounter++;

    // Evaluate Backpressure Transitions
    if (!this.isBackpressureEngaged && this.currentCount >= this.highWatermark) {
      this.isBackpressureEngaged = true;
      this.emitInternalEvent('BACKPRESSURE_ENGAGED', {
        currentDepth: this.currentCount,
        capacity: this.capacity,
        utilization: (this.currentCount / this.capacity) * 100,
      });
    }

    // Schedule asynchronous batch processing if not already scheduled
    this.scheduleProcessing();

    return true;
  }

  /**
   * Handles buffer overflow based on configured policy.
   */
  private handleBufferOverflow(
    incomingEvent: DistributedEventRecord,
    now: number
  ): boolean {
    if (this.overflowPolicy === 'REJECT_NEW') {
      return false; // Reject incoming event
    }

    if (this.overflowPolicy === 'DROP_LOW_PRIORITY') {
      // If incoming event is LOW and buffer is full, reject it
      if (incomingEvent.priority === 'LOW') {
        return false;
      }

      // Look for a LOW priority item in the buffer to evict
      let scanIdx = this.head;
      let foundLowIdx = -1;
      for (let i = 0; i < this.currentCount; i++) {
        const item = this.ringBuffer[scanIdx];
        if (item && item.event.priority === 'LOW') {
          foundLowIdx = scanIdx;
          break;
        }
        scanIdx = (scanIdx + 1) % this.capacity;
      }

      if (foundLowIdx !== -1) {
        // Evict the low priority item and insert new event at tail
        this.ringBuffer[foundLowIdx] = { event: incomingEvent, enqueuedAtMs: now };
        this.eventsDroppedTotal++;
        return true;
      }

      // If no LOW items found and incoming is not CRITICAL, drop it
      if (incomingEvent.priority !== 'CRITICAL') {
        return false;
      }
    }

    // Default: DROP_OLDEST (evict head item)
    this.ringBuffer[this.head] = null;
    this.head = (this.head + 1) % this.capacity;
    this.currentCount--;
    this.eventsDroppedTotal++;

    // Insert new item at tail
    this.ringBuffer[this.tail] = { event: incomingEvent, enqueuedAtMs: now };
    this.tail = (this.tail + 1) % this.capacity;
    this.currentCount++;
    return true;
  }

  /**
   * Registers an event consumer with execution timeout protection and health monitoring.
   */
  public registerConsumer<TPayload = any>(
    consumerId: string,
    eventType: string,
    handler: QueueEventHandler<TPayload>,
    options: { timeoutMs?: number } = {}
  ): () => void {
    const consumer: RegisteredConsumer = {
      id: consumerId,
      eventType,
      handler,
      timeoutMs: options.timeoutMs ?? this.consumerTimeoutMs,
      consecutiveFailures: 0,
      totalFailures: 0,
      eventsProcessed: 0,
      totalDurationMs: 0,
      status: 'HEALTHY',
    };

    this.consumers.set(consumerId, consumer);

    if (!this.subscribersByEvent.has(eventType)) {
      this.subscribersByEvent.set(eventType, new Set());
    }
    this.subscribersByEvent.get(eventType)!.add(consumerId);

    // Return unregister callback
    return () => {
      this.unregisterConsumer(consumerId);
    };
  }

  public unregisterConsumer(consumerId: string): boolean {
    const consumer = this.consumers.get(consumerId);
    if (!consumer) return false;

    const eventSubscribers = this.subscribersByEvent.get(consumer.eventType);
    if (eventSubscribers) {
      eventSubscribers.delete(consumerId);
      if (eventSubscribers.size === 0) {
        this.subscribersByEvent.delete(consumer.eventType);
      }
    }

    this.consumers.delete(consumerId);
    return true;
  }

  /**
   * Schedules microtask/tick-based batch processing loop.
   */
  private scheduleProcessing(): void {
    if (this.isProcessingScheduled || this.currentCount === 0) {
      return;
    }

    this.isProcessingScheduled = true;

    // Use queueMicrotask if available, otherwise setImmediate / setTimeout
    if (typeof queueMicrotask === 'function') {
      queueMicrotask(() => this.processNextBatch());
    } else if (typeof setImmediate === 'function') {
      setImmediate(() => this.processNextBatch());
    } else {
      setTimeout(() => this.processNextBatch(), 0);
    }
  }

  /**
   * Asynchronously processes the next batch of queued events.
   */
  private async processNextBatch(): Promise<void> {
    this.isProcessingScheduled = false;

    if (this.currentCount === 0 || (this.isShutdown && !this.isDraining)) {
      return;
    }

    const countToProcess = Math.min(this.batchSize, this.currentCount);
    const batch: QueuedEventEnvelope[] = [];

    for (let i = 0; i < countToProcess; i++) {
      const item = this.ringBuffer[this.head];
      if (item) {
        batch.push(item);
        this.ringBuffer[this.head] = null;
        this.head = (this.head + 1) % this.capacity;
        this.currentCount--;
      }
    }

    const processTimestamp = Date.now();

    // Dispatch batch to consumers concurrently without blocking queue loop
    for (const envelope of batch) {
      const event = envelope.event;
      envelope.processedAtMs = processTimestamp;

      // Track latency
      const transitLatency = Math.max(0, processTimestamp - envelope.enqueuedAtMs);
      this.recordLatencySample(transitLatency);
      this.eventsProcessedTotal++;

      // Dispatch to matching consumers and wildcard consumers
      await this.dispatchToConsumers(event);

      // Optional bridge to DistributedEventBus for existing system integration
      if (this.enableEventBusBridge) {
        try {
          DistributedEventBus.getInstance().publish({
            eventType: event.eventType,
            source: event.source,
            priority: event.priority,
            payload: event.payload,
            suppressionFingerprint: event.suppressionFingerprint,
          });
        } catch {
          // Non-fatal bridge containment
        }
      }
    }

    // Check if backpressure can now be relieved
    if (this.isBackpressureEngaged && this.currentCount <= this.lowWatermark) {
      this.isBackpressureEngaged = false;
      this.emitInternalEvent('BACKPRESSURE_RELIEVED', {
        currentDepth: this.currentCount,
        capacity: this.capacity,
        utilization: (this.currentCount / this.capacity) * 100,
      });
    }

    // If more items remain in the ring buffer, schedule the next batch
    if (this.currentCount > 0 && !this.isShutdown) {
      this.scheduleProcessing();
    } else if (this.isDraining && this.currentCount === 0) {
      this.isDraining = false;
    }
  }

  /**
   * Dispatches an event to registered consumers with timeout protection and fault isolation.
   */
  private async dispatchToConsumers(event: DistributedEventRecord): Promise<void> {
    const targetConsumerIds = new Set<string>();

    const exactMatch = this.subscribersByEvent.get(event.eventType);
    if (exactMatch) {
      exactMatch.forEach((id) => targetConsumerIds.add(id));
    }

    const wildcardMatch = this.subscribersByEvent.get('*');
    if (wildcardMatch) {
      wildcardMatch.forEach((id) => targetConsumerIds.add(id));
    }

    if (targetConsumerIds.size === 0) {
      return;
    }

    const promises: Promise<void>[] = [];

    for (const consumerId of targetConsumerIds) {
      const consumer = this.consumers.get(consumerId);
      if (!consumer) continue;

      // Skip quarantined consumers
      if (consumer.status === 'QUARANTINED') {
        continue;
      }

      promises.push(this.executeConsumerWithGuards(consumer, event));
    }

    // Await all consumer promises; errors are trapped individually inside executeConsumerWithGuards
    await Promise.allSettled(promises);
  }

  /**
   * Executes a single consumer callback protected by an execution timeout and circuit breaker.
   */
  private async executeConsumerWithGuards(
    consumer: RegisteredConsumer,
    event: DistributedEventRecord
  ): Promise<void> {
    const startMs = Date.now();
    let timeoutId: NodeJS.Timeout | undefined;

    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`Consumer execution deadline exceeded (${consumer.timeoutMs}ms)`));
        }, consumer.timeoutMs);
      });

      const handlerPromise = Promise.resolve().then(() => consumer.handler(event));

      try {
        await Promise.race([handlerPromise, timeoutPromise]);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = undefined;
        }
      }

      const durationMs = Date.now() - startMs;
      consumer.eventsProcessed++;
      consumer.totalDurationMs += durationMs;
      consumer.consecutiveFailures = 0;
      consumer.lastExecutionAt = new Date().toISOString();

      if (durationMs > consumer.timeoutMs * 0.7) {
        consumer.status = 'SLOW';
      } else {
        consumer.status = 'HEALTHY';
      }
    } catch (err: unknown) {
      const durationMs = Date.now() - startMs;
      consumer.consecutiveFailures++;
      consumer.totalFailures++;
      consumer.totalDurationMs += durationMs;
      consumer.lastExecutionAt = new Date().toISOString();

      const errMsg = err instanceof Error ? err.message : String(err);

      if (consumer.consecutiveFailures >= this.consecutiveErrorThreshold) {
        consumer.status = 'QUARANTINED';
        consumer.quarantineReason = `Exceeded threshold of ${this.consecutiveErrorThreshold} consecutive failures: ${errMsg}`;
        this.emitInternalEvent('CONSUMER_QUARANTINED', {
          consumerId: consumer.id,
          reason: consumer.quarantineReason,
        });
      } else {
        consumer.status = 'DEGRADED';
      }
    }
  }

  private recordLatencySample(sampleMs: number): void {
    this.recentLatenciesMs.push(sampleMs);
    if (this.recentLatenciesMs.length > this.maxLatencySamples) {
      this.recentLatenciesMs.shift();
    }
  }

  private updateThroughputRate(): void {
    const now = Date.now();
    const elapsedSec = Math.max(0.001, (now - this.throughputRateWindowStart) / 1000);
    this.currentThroughputEps = Math.round(this.throughputRateCounter / elapsedSec);
    this.throughputRateCounter = 0;
    this.throughputRateWindowStart = now;

    this.notifyTelemetryListeners();
  }

  private pruneSuppressionFingerprints(): void {
    const now = Date.now();
    for (const [fp, ts] of this.seenFingerprints.entries()) {
      if (now - ts > this.duplicateSuppressionWindowMs * 2) {
        this.seenFingerprints.delete(fp);
      }
    }
  }

  private emitInternalEvent(type: string, data: any): void {
    try {
      DistributedEventBus.getInstance().publish({
        eventType: `QUEUE_${type}`,
        source: 'HighThroughputEventQueueEngine',
        priority: 'HIGH',
        payload: data,
        suppressionFingerprint: `queue-${type}-${Date.now()}`,
      });
    } catch {
      // Internal bus containment
    }
  }

  /**
   * Returns a comprehensive point-in-time telemetry snapshot of queue health and performance.
   */
  public getTelemetry(): QueueTelemetrySnapshot {
    const latenciesSorted = [...this.recentLatenciesMs].sort((a, b) => a - b);
    const count = latenciesSorted.length;

    const p50 = count > 0 ? latenciesSorted[Math.floor(count * 0.5)] : 0;
    const p95 = count > 0 ? latenciesSorted[Math.floor(count * 0.95)] : 0;
    const p99 = count > 0 ? latenciesSorted[Math.floor(count * 0.99)] : 0;
    const avg = count > 0 ? latenciesSorted.reduce((a, b) => a + b, 0) / count : 0;
    const min = count > 0 ? latenciesSorted[0] : 0;
    const max = count > 0 ? latenciesSorted[count - 1] : 0;

    const consumerTelemetries: ConsumerTelemetry[] = Array.from(this.consumers.values()).map((c) => ({
      consumerId: c.id,
      eventType: c.eventType,
      status: c.status,
      eventsProcessed: c.eventsProcessed,
      consecutiveFailures: c.consecutiveFailures,
      totalFailures: c.totalFailures,
      avgExecutionDurationMs: c.eventsProcessed > 0 ? Number((c.totalDurationMs / c.eventsProcessed).toFixed(3)) : 0,
      lastExecutionAt: c.lastExecutionAt,
      quarantineReason: c.quarantineReason,
    }));

    return {
      capacity: this.capacity,
      currentQueueDepth: this.currentCount,
      bufferUtilizationPercent: Number(((this.currentCount / this.capacity) * 100).toFixed(2)),
      isBackpressureActive: this.isBackpressureEngaged,
      eventsEnqueuedTotal: this.eventsEnqueuedTotal,
      eventsProcessedTotal: this.eventsProcessedTotal,
      eventsDroppedTotal: this.eventsDroppedTotal,
      duplicatesSuppressedTotal: this.duplicatesSuppressedTotal,
      currentThroughputEps: this.currentThroughputEps,
      latency: {
        sampleCount: count,
        avgMs: Number(avg.toFixed(3)),
        p50Ms: Number(p50.toFixed(3)),
        p95Ms: Number(p95.toFixed(3)),
        p99Ms: Number(p99.toFixed(3)),
        minMs: Number(min.toFixed(3)),
        maxMs: Number(max.toFixed(3)),
      },
      consumers: consumerTelemetries,
      isDraining: this.isDraining,
      isShutdown: this.isShutdown,
      timestamp: new Date().toISOString(),
    };
  }

  public subscribeTelemetry(listener: (snapshot: QueueTelemetrySnapshot) => void): () => void {
    this.telemetryListeners.add(listener);
    listener(this.getTelemetry());
    return () => this.telemetryListeners.delete(listener);
  }

  private notifyTelemetryListeners(): void {
    if (this.telemetryListeners.size === 0) return;
    UIFrameBudgetMonitor.getInstance().scheduleUpdate('htq-telemetry-ui', () => {
      const snapshot = this.getTelemetry();
      this.telemetryListeners.forEach((l) => {
        try {
          l(snapshot);
        } catch {
          // Listener containment
        }
      });
    });
  }

  public flushUIUpdates(): void {
    UIFrameBudgetMonitor.getInstance().flushSync();
  }

  /**
   * Asynchronously drains all remaining items in the queue.
   */
  public async drain(): Promise<void> {
    this.isDraining = true;
    while (this.currentCount > 0) {
      await this.processNextBatch();
      await new Promise((r) => setTimeout(r, 2));
    }
    this.isDraining = false;
  }

  /**
   * Gracefully shuts down the queue engine, halting timers and draining pending events.
   */
  public async shutdown(): Promise<void> {
    await this.drain();
    this.isShutdown = true;
    if (this.timerHandle) {
      clearInterval(this.timerHandle);
      this.timerHandle = null;
    }
  }
}
