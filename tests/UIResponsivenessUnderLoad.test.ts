/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 1.1 Automated Test Suite: Main-Thread UI Performance & Frame Budget Optimization
 * Validates requestAnimationFrame-based update batching, frame-budget monitoring,
 * long-task detection, and main-thread responsiveness under 50,000+ event workloads.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  UIFrameBudgetMonitor,
} from '../src/engines/UIFrameBudgetMonitor';
import {
  HighThroughputEventQueueEngine,
} from '../src/engines/HighThroughputEventQueueEngine';
import {
  DistributedEventBus,
} from '../src/engines/DistributedEventBus';

describe('Stage 1.1: Main-Thread UI Performance & Frame Budget Suite', () => {
  beforeEach(() => {
    UIFrameBudgetMonitor.resetInstance();
    HighThroughputEventQueueEngine.resetInstance();
    DistributedEventBus.resetInstance();
  });

  afterEach(() => {
    UIFrameBudgetMonitor.resetInstance();
    HighThroughputEventQueueEngine.resetInstance();
    DistributedEventBus.resetInstance();
  });

  // --------------------------------------------------------------------------
  // TEST 1: COALESCES 50,000+ EVENT UPDATES INTO BATCHED FRAME TICKS
  // --------------------------------------------------------------------------
  it('1. coalesces 50,000+ rapid event updates into batched frame updates without listener thrashing', async () => {
    const monitor = new UIFrameBudgetMonitor({ targetFps: 60 });
    let executionCount = 0;
    let latestValue = -1;

    const totalEvents = 50000;
    const startMs = performance.now();

    // Rapidly schedule 50,000 updates for the same UI key
    for (let i = 0; i < totalEvents; i++) {
      monitor.scheduleUpdate('live-telemetry-feed', () => {
        executionCount++;
        latestValue = i;
      });
    }

    // Flush synchronous frame boundary
    monitor.flushSync();

    const durationMs = performance.now() - startMs;
    const metrics = monitor.getMetrics();

    // Crucial check: Instead of 50,000 listener executions, exactly 1 coalesced execution ran!
    assert.equal(executionCount, 1, 'Coalescing must collapse rapid updates within frame into a single execution');
    assert.equal(latestValue, totalEvents - 1, 'Coalesced execution must deliver the latest event state');
    assert.equal(metrics.coalescedUpdatesCount, totalEvents - 1, '50,000 - 1 updates must be marked as coalesced');
    assert.ok(durationMs < 200, `Scheduling and coalescing 50,000 updates must take <200ms (measured: ${durationMs.toFixed(2)}ms)`);
  });

  // --------------------------------------------------------------------------
  // TEST 2: FRAME BUDGET OVERRUN AND LONG TASK (>50MS) DETECTION
  // --------------------------------------------------------------------------
  it('2. accurately detects frame budget breaches (>16.6ms) and long tasks (>50ms)', () => {
    const monitor = new UIFrameBudgetMonitor({
      targetFps: 60, // 16.67ms frame budget
      longTaskThresholdMs: 50.0,
    });

    // 1. Normal task (well within 16.6ms budget)
    monitor.scheduleUpdate('normal-task', () => {
      // Light work
      let sum = 0;
      for (let i = 0; i < 1000; i++) sum += i;
    });
    monitor.flushSync();

    let metrics = monitor.getMetrics();
    assert.equal(metrics.framesExceededBudgetCount, 0, 'Normal task must not exceed frame budget');
    assert.equal(metrics.longTasksCount, 0, 'Normal task must not be flagged as long task');

    // 2. Heavy task that exceeds budget and triggers long task
    monitor.scheduleUpdate('heavy-task', () => {
      // Spin for ~55ms to exceed 50ms long task threshold
      const tEnd = performance.now() + 55;
      while (performance.now() < tEnd) {
        // Active spin
      }
    });
    monitor.flushSync();

    metrics = monitor.getMetrics();
    assert.ok(metrics.framesExceededBudgetCount >= 1, 'Task exceeding 16.6ms must increment framesExceededBudgetCount');
    assert.ok(metrics.longTasksCount >= 1, 'Task exceeding 50ms must increment longTasksCount');
    assert.ok(metrics.lastFrameDurationMs >= 50.0, `Last frame duration must reflect measured execution (measured: ${metrics.lastFrameDurationMs}ms)`);
  });

  // --------------------------------------------------------------------------
  // TEST 3: ADAPTIVE THROTTLING ACTIVATION & RELIEF
  // --------------------------------------------------------------------------
  it('3. engages adaptive throttling under frame saturation and disengages when normalized', () => {
    const monitor = new UIFrameBudgetMonitor({
      targetFps: 60, // 16.67ms budget
      budgetWarningThresholdRatio: 0.85, // 14.17ms warning threshold
      enableAdaptiveThrottling: true,
    });

    assert.equal(monitor.getMetrics().isThrottlingActive, false);

    // Run task exceeding 85% of budget (~20ms)
    monitor.scheduleUpdate('heavy-spin', () => {
      const tEnd = performance.now() + 20;
      while (performance.now() < tEnd) {}
    });
    monitor.flushSync();

    assert.equal(monitor.getMetrics().isThrottlingActive, true, 'Throttling must activate when frame exceeds 85% budget');

    // Run light task (<50% of budget)
    monitor.scheduleUpdate('light-spin', () => {
      // Near-zero duration
    });
    monitor.flushSync();

    assert.equal(monitor.getMetrics().isThrottlingActive, false, 'Throttling must clear once frame duration normalizes');
  });

  // --------------------------------------------------------------------------
  // TEST 4: QUEUE INGESTION AND RENDERING ISOLATION UNDER 50,000 EVENT BURST
  // --------------------------------------------------------------------------
  it('4. strictly isolates 50,000-event queue ingestion from UI rendering overhead', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 60000,
      batchSize: 5000,
      enableEventBusBridge: false,
    });

    let uiRenderUpdateCount = 0;
    // Register telemetry listener that updates UI
    const unsubTelemetry = queue.subscribeTelemetry(() => {
      uiRenderUpdateCount++;
    });

    const burstSize = 50000;
    const t0 = performance.now();

    for (let i = 0; i < burstSize; i++) {
      queue.enqueue({
        eventType: 'BURST_50K',
        source: 'MassiveSensorCluster',
        priority: 'MEDIUM',
        payload: { sample: i },
        suppressionFingerprint: `burst-50k-${i}`,
      });
    }

    const enqueueDurationMs = performance.now() - t0;
    await queue.drain();

    // Flush any pending batched UI notification
    queue.flushUIUpdates();
    unsubTelemetry();

    const telemetry = queue.getTelemetry();
    assert.equal(telemetry.eventsEnqueuedTotal, burstSize);
    assert.equal(telemetry.eventsProcessedTotal, burstSize);
    assert.equal(telemetry.eventsDroppedTotal, 0);

    // Verify UI updates were coalesced and did NOT thrash 50,000 times
    assert.ok(
      uiRenderUpdateCount < 50,
      `UI updates must be coalesced to <50 frames during 50,000-event burst (actual: ${uiRenderUpdateCount} updates)`
    );

    // Ingestion of 50,000 events must complete rapidly
    assert.ok(
      enqueueDurationMs < 1000,
      `50,000 events enqueued in <1000ms (actual: ${enqueueDurationMs.toFixed(2)}ms, throughput: ${Math.round((burstSize / enqueueDurationMs) * 1000)} eps)`
    );
  });

  // --------------------------------------------------------------------------
  // TEST 5: MEMORY STABILITY UNDER 50,000+ EVENT BURSTS WITH UI BATCHING
  // --------------------------------------------------------------------------
  it('5. preserves memory stability and bounds heap growth under 50,000-event burst with UI batching active', async () => {
    const monitor = UIFrameBudgetMonitor.getInstance();
    const queue = new HighThroughputEventQueueEngine({
      capacity: 60000,
      batchSize: 5000,
      enableEventBusBridge: false,
    });

    let uiNotifications = 0;
    queue.subscribeTelemetry(() => {
      uiNotifications++;
    });

    const startHeap = process.memoryUsage().heapUsed;
    const eventCount = 50000;

    for (let i = 0; i < eventCount; i++) {
      queue.enqueue({
        eventType: 'MEM_TEST_50K',
        source: 'ReactorDiagnostics',
        payload: { index: i, flag: 'memory_check' },
        suppressionFingerprint: `mem-50k-${i}`,
      });
    }

    await queue.drain();
    monitor.flushSync();

    const endHeap = process.memoryUsage().heapUsed;
    const heapDeltaMb = (endHeap - startHeap) / (1024 * 1024);

    // Assert heap growth across 50,000 events is strictly bounded (<50MB, ~700 bytes per event)
    assert.ok(heapDeltaMb < 50.0, `Heap growth for 50k events must remain bounded (measured: ${heapDeltaMb.toFixed(2)} MB)`);
    assert.equal(queue.getTelemetry().eventsProcessedTotal, eventCount);
  });

  // --------------------------------------------------------------------------
  // TEST 6: DISTRIBUTED EVENT BUS AUTOMATIC UI BATCHING INTEGRATION
  // --------------------------------------------------------------------------
  it('6. automatically protects DistributedEventBus UI subscribers from synchronous flooding', () => {
    const bus = DistributedEventBus.getInstance();
    let uiSubscriberCallCount = 0;
    let receivedEventsCount = 0;

    // Simulate React component subscription (e.g., DistributedIntelligenceDashboard)
    const unsub = bus.subscribe((allEvents) => {
      uiSubscriberCallCount++;
      receivedEventsCount = allEvents.length;
    });

    // Rapidly publish 2,000 events to the bus
    const publishCount = 2000;
    for (let i = 0; i < publishCount; i++) {
      bus.publish({
        eventType: 'BUS_FLOOD_TEST',
        source: 'AgentStressTester',
        priority: 'LOW',
        payload: { seq: i },
        suppressionFingerprint: `bus-flood-${i}`,
      });
    }

    // Prior to flush, the UI subscriber was NOT invoked 2,000 times synchronously
    assert.ok(
      uiSubscriberCallCount <= 1,
      `UI subscriber must not be called 2,000 times synchronously (actual: ${uiSubscriberCallCount})`
    );

    // Flush frame
    bus.flushUIUpdates();

    assert.ok(uiSubscriberCallCount <= 2, 'UI subscriber was called at most twice (initial + batched flush)');
    assert.ok(receivedEventsCount > 0, 'UI subscriber received latest events');
    unsub();
  });
});
