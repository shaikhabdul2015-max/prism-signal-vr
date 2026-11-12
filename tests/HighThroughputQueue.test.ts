/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 1 Automated Test Suite: High-Throughput & Concurrency Validation
 * Comprehensive performance, backpressure, slow-consumer isolation, and 
 * stress benchmark test suite for HighThroughputEventQueueEngine.
 */

import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  HighThroughputEventQueueEngine,
} from '../src/engines/HighThroughputEventQueueEngine';

describe('Stage 1: HighThroughputEventQueueEngine Stress & Concurrency Suite', () => {
  beforeEach(() => {
    HighThroughputEventQueueEngine.resetInstance();
  });

  afterEach(() => {
    HighThroughputEventQueueEngine.resetInstance();
  });

  // --------------------------------------------------------------------------
  // TEST 1: 1,000 EVENTS/SEC SUSTAINED WORKLOAD
  // --------------------------------------------------------------------------
  it('1. processes 1,000 events/sec sustained workload with zero unsuppressed loss', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 5000,
      batchSize: 500,
      enableEventBusBridge: false,
    });

    let consumedCount = 0;
    queue.registerConsumer('test-consumer-1k', 'TELEMETRY_1K', () => {
      consumedCount++;
    });

    const targetCount = 1000;
    const startMs = performance.now();

    for (let i = 0; i < targetCount; i++) {
      const enqueued = queue.enqueue({
        eventType: 'TELEMETRY_1K',
        source: 'SensorNode-Alpha',
        priority: 'MEDIUM',
        payload: { sampleIndex: i, voltage: 3.3 },
        suppressionFingerprint: `sample-1k-${i}`,
      });
      assert.equal(enqueued, true, 'Every unique event must be accepted');
    }

    await queue.drain();
    const durationMs = performance.now() - startMs;
    const effectiveEps = (targetCount / (durationMs / 1000));

    assert.equal(consumedCount, targetCount, 'All 1,000 events must be consumed without loss');
    assert.ok(effectiveEps >= 1000, `Throughput must exceed 1,000 eps (measured: ${Math.round(effectiveEps)} eps)`);

    const telemetry = queue.getTelemetry();
    assert.equal(telemetry.eventsEnqueuedTotal, targetCount);
    assert.equal(telemetry.eventsProcessedTotal, targetCount);
    assert.equal(telemetry.eventsDroppedTotal, 0);
  });

  // --------------------------------------------------------------------------
  // TEST 2: 5,000 EVENTS/SEC WORKLOAD
  // --------------------------------------------------------------------------
  it('2. processes 5,000 events/sec workload with low latency percentiles', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 10000,
      batchSize: 1000,
      enableEventBusBridge: false,
    });

    let consumedCount = 0;
    queue.registerConsumer('test-consumer-5k', 'TELEMETRY_5K', () => {
      consumedCount++;
    });

    const targetCount = 5000;
    const startMs = performance.now();

    for (let i = 0; i < targetCount; i++) {
      queue.enqueue({
        eventType: 'TELEMETRY_5K',
        source: 'SensorCluster-Beta',
        priority: 'MEDIUM',
        payload: { index: i, coherence: 0.98 },
        suppressionFingerprint: `sample-5k-${i}`,
      });
    }

    await queue.drain();
    const durationMs = performance.now() - startMs;
    const effectiveEps = (targetCount / (durationMs / 1000));

    assert.equal(consumedCount, targetCount);
    assert.ok(effectiveEps >= 5000, `Throughput must exceed 5,000 eps (measured: ${Math.round(effectiveEps)} eps)`);

    const telemetry = queue.getTelemetry();
    assert.ok(telemetry.latency.p95Ms < 250.0, `P95 queue residence latency should remain bounded (measured: ${telemetry.latency.p95Ms}ms)`);
  });

  // --------------------------------------------------------------------------
  // TEST 3: 10,000 EVENTS/SEC HIGH-THROUGHPUT BURST
  // --------------------------------------------------------------------------
  it('3. handles 10,000 events/sec high-throughput burst without event loss', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 20000,
      batchSize: 2000,
      enableEventBusBridge: false,
    });

    let consumedCount = 0;
    queue.registerConsumer('test-consumer-10k', 'BURST_10K', () => {
      consumedCount++;
    });

    const targetCount = 10000;
    const startMs = performance.now();

    for (let i = 0; i < targetCount; i++) {
      queue.enqueue({
        eventType: 'BURST_10K',
        source: 'ClusterMesh-Gamma',
        priority: 'HIGH',
        payload: { burstId: i },
        suppressionFingerprint: `burst-10k-${i}`,
      });
    }

    await queue.drain();
    const durationMs = performance.now() - startMs;
    const effectiveEps = (targetCount / (durationMs / 1000));

    assert.equal(consumedCount, targetCount);
    assert.ok(effectiveEps >= 10000, `Throughput must exceed 10,000 eps (measured: ${Math.round(effectiveEps)} eps)`);
  });

  // --------------------------------------------------------------------------
  // TEST 4: 20,000 EVENTS/SEC PEAK STRESS TEST
  // --------------------------------------------------------------------------
  it('4. sustains 20,000 events/sec peak stress test with verified throughput', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 30000,
      batchSize: 3000,
      enableEventBusBridge: false,
    });

    let consumedCount = 0;
    queue.registerConsumer('test-consumer-20k', 'STRESS_20K', () => {
      consumedCount++;
    });

    const targetCount = 20000;
    const startMs = performance.now();

    for (let i = 0; i < targetCount; i++) {
      queue.enqueue({
        eventType: 'STRESS_20K',
        source: 'CoreReactor-Omega',
        priority: 'CRITICAL',
        payload: { stressSeq: i, resonanceKhz: 432.0 },
        suppressionFingerprint: `stress-20k-${i}`,
      });
    }

    await queue.drain();
    const durationMs = performance.now() - startMs;
    const effectiveEps = (targetCount / (durationMs / 1000));

    assert.equal(consumedCount, targetCount, 'All 20,000 events must be processed');
    assert.ok(effectiveEps >= 15000, `Throughput under 20k stress must exceed 15k eps (measured: ${Math.round(effectiveEps)} eps)`);

    const telemetry = queue.getTelemetry();
    assert.equal(telemetry.eventsDroppedTotal, 0);
    assert.ok(telemetry.latency.p99Ms < 1000.0, `P99 queue residence latency must remain bounded (measured: ${telemetry.latency.p99Ms}ms)`);
  });

  // --------------------------------------------------------------------------
  // TEST 5: MULTI-PRODUCER CONCURRENT INGESTION
  // --------------------------------------------------------------------------
  it('5. coordinates multi-producer concurrent ingestion across 6 simulated agents', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 10000,
      batchSize: 500,
      enableEventBusBridge: false,
    });

    const receivedByAgent: Record<string, number> = {};
    const agents = [
      'OperationsAgent',
      'TestAgent',
      'TrackingAgent',
      'PerformanceAgent',
      'IncidentAgent',
      'ChiefIntelligenceAgent',
    ];

    agents.forEach((ag) => {
      receivedByAgent[ag] = 0;
      queue.registerConsumer(`consumer-${ag}`, `AGENT_TASK_${ag}`, () => {
        receivedByAgent[ag]++;
      });
    });

    const eventsPerProducer = 500;
    const producerPromises = agents.map(async (ag) => {
      for (let i = 0; i < eventsPerProducer; i++) {
        queue.enqueue({
          eventType: `AGENT_TASK_${ag}`,
          source: ag,
          priority: 'NORMAL' as any,
          payload: { taskIndex: i },
          suppressionFingerprint: `agent-${ag}-${i}`,
        });
      }
    });

    await Promise.all(producerPromises);
    await queue.drain();

    agents.forEach((ag) => {
      assert.equal(
        receivedByAgent[ag],
        eventsPerProducer,
        `Agent ${ag} should process all ${eventsPerProducer} events`
      );
    });

    const telemetry = queue.getTelemetry();
    assert.equal(telemetry.eventsProcessedTotal, agents.length * eventsPerProducer);
  });

  // --------------------------------------------------------------------------
  // TEST 6: RING-BUFFER CAPACITY & OVERFLOW EVICTION POLICIES
  // --------------------------------------------------------------------------
  it('6. enforces ring-buffer capacity and correctly executes overflow eviction', async () => {
    const capacity = 100;
    const queue = new HighThroughputEventQueueEngine({
      capacity,
      overflowPolicy: 'DROP_OLDEST',
      enableEventBusBridge: false,
    });

    // Enqueue 150 events (exceeds capacity of 100)
    for (let i = 0; i < 150; i++) {
      queue.enqueue({
        eventType: 'OVERFLOW_TEST',
        source: 'TestOverflow',
        priority: 'LOW',
        payload: { id: i },
        suppressionFingerprint: `oflow-${i}`,
      });
    }

    const telemetry = queue.getTelemetry();
    // Capacity is strictly enforced at 100
    assert.ok(telemetry.currentQueueDepth <= capacity);
    assert.equal(telemetry.eventsDroppedTotal, 50, 'Exactly 50 overflowed events must be dropped');
  });

  // --------------------------------------------------------------------------
  // TEST 7: DYNAMIC BACKPRESSURE WATERMARKS
  // --------------------------------------------------------------------------
  it('7. triggers backpressure at high-watermark and relieves it at low-watermark', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 1000,
      highWatermarkRatio: 0.8, // 800 events
      lowWatermarkRatio: 0.2,  // 200 events
      batchSize: 100,
      enableEventBusBridge: false,
    });

    assert.equal(queue.getTelemetry().isBackpressureActive, false);

    // Enqueue 850 events to exceed high-watermark of 800
    for (let i = 0; i < 850; i++) {
      queue.enqueue({
        eventType: 'BACKPRESSURE_TEST',
        source: 'LoadSource',
        payload: { i },
        suppressionFingerprint: `bp-${i}`,
      });
    }

    assert.equal(queue.getTelemetry().isBackpressureActive, true, 'Backpressure must engage at >80% capacity');

    // Drain down below 200 events
    await queue.drain();

    assert.equal(queue.getTelemetry().isBackpressureActive, false, 'Backpressure must disengage at low-watermark');
  });

  // --------------------------------------------------------------------------
  // TEST 8: SLOW-CONSUMER ISOLATION
  // --------------------------------------------------------------------------
  it('8. isolates slow consumers and prevents them from blocking fast consumers', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 500,
      batchSize: 50,
      enableEventBusBridge: false,
    });

    let fastProcessed = 0;
    let slowProcessed = 0;

    // Fast consumer
    queue.registerConsumer('fast-consumer', 'PARALLEL_TEST', () => {
      fastProcessed++;
    });

    // Slow consumer with 10ms artificial delay
    queue.registerConsumer(
      'slow-consumer',
      'PARALLEL_TEST',
      async () => {
        await new Promise((r) => setTimeout(r, 10));
        slowProcessed++;
      },
      { timeoutMs: 50 }
    );

    for (let i = 0; i < 50; i++) {
      queue.enqueue({
        eventType: 'PARALLEL_TEST',
        source: 'ParallelSource',
        payload: { index: i },
        suppressionFingerprint: `par-${i}`,
      });
    }

    await queue.drain();

    assert.equal(fastProcessed, 50, 'Fast consumer must process 100% of events');
    assert.equal(slowProcessed, 50, 'Slow consumer must process events without crashing pipeline');

    const telemetry = queue.getTelemetry();
    const slowTelemetry = telemetry.consumers.find((c) => c.consumerId === 'slow-consumer');
    assert.ok(slowTelemetry);
    assert.ok(slowTelemetry.avgExecutionDurationMs >= 8.0, 'Slow consumer duration must be tracked accurately');
  });

  // --------------------------------------------------------------------------
  // TEST 9: CONSUMER EXCEPTION FAULT ISOLATION & CIRCUIT BREAKER
  // --------------------------------------------------------------------------
  it('9. isolates consumer exceptions and quarantines repeatedly failing consumers', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 200,
      batchSize: 50,
      consecutiveErrorThreshold: 3,
      enableEventBusBridge: false,
    });

    let healthyCount = 0;

    // Healthy consumer
    queue.registerConsumer('healthy-consumer', 'CRASH_TEST', () => {
      healthyCount++;
    });

    // Defective consumer that throws consistently
    queue.registerConsumer('failing-consumer', 'CRASH_TEST', () => {
      throw new Error('Simulated hardware bus disconnect');
    });

    for (let i = 0; i < 10; i++) {
      queue.enqueue({
        eventType: 'CRASH_TEST',
        source: 'CrashTester',
        payload: { i },
        suppressionFingerprint: `crash-${i}`,
      });
    }

    await queue.drain();

    assert.equal(healthyCount, 10, 'Healthy consumer must process all events despite failing consumer');

    const telemetry = queue.getTelemetry();
    const failingTelemetry = telemetry.consumers.find((c) => c.consumerId === 'failing-consumer');

    assert.ok(failingTelemetry);
    assert.equal(failingTelemetry.status, 'QUARANTINED', 'Failing consumer must be automatically quarantined');
    assert.ok(failingTelemetry.quarantineReason?.includes('consecutive failures'));
  });

  // --------------------------------------------------------------------------
  // TEST 10: DUPLICATE STORM SUPPRESSION
  // --------------------------------------------------------------------------
  it('10. suppresses duplicate storm flood within sliding suppression window', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 2000,
      duplicateSuppressionWindowMs: 4000,
      enableEventBusBridge: false,
    });

    let processedCount = 0;
    queue.registerConsumer('dup-consumer', 'DUP_STORM', () => {
      processedCount++;
    });

    const stormCount = 1000;
    const sameFingerprint = 'storm-idempotent-fingerprint-001';

    for (let i = 0; i < stormCount; i++) {
      queue.enqueue({
        eventType: 'DUP_STORM',
        source: 'StormSimulator',
        payload: { burstIndex: i },
        suppressionFingerprint: sameFingerprint,
      });
    }

    await queue.drain();

    assert.equal(processedCount, 1, 'Exactly one event must be processed from identical duplicate storm');

    const telemetry = queue.getTelemetry();
    assert.equal(telemetry.duplicatesSuppressedTotal, stormCount - 1);
  });

  // --------------------------------------------------------------------------
  // TEST 11: MEMORY STABILITY UNDER SUSTAINED BURST CYCLES
  // --------------------------------------------------------------------------
  it('11. preserves memory stability and bounds heap growth over 5 sustained burst cycles', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 10000,
      batchSize: 1000,
      enableEventBusBridge: false,
    });

    queue.registerConsumer('mem-consumer', 'MEM_CYCLE', () => {});

    const startHeap = process.memoryUsage().heapUsed;

    for (let cycle = 0; cycle < 5; cycle++) {
      for (let i = 0; i < 2000; i++) {
        queue.enqueue({
          eventType: 'MEM_CYCLE',
          source: 'CycleSource',
          payload: { cycle, i, data: new Array(10).fill('stable') },
          suppressionFingerprint: `cycle-${cycle}-${i}`,
        });
      }
      await queue.drain();
    }

    const endHeap = process.memoryUsage().heapUsed;
    const heapGrowthMb = (endHeap - startHeap) / (1024 * 1024);

    // Assert that heap growth across 10,000 processed events in 5 cycles is bounded (<25MB)
    assert.ok(heapGrowthMb < 25.0, `Heap growth must be strictly bounded (measured: ${heapGrowthMb.toFixed(2)} MB)`);
    assert.equal(queue.getTelemetry().eventsProcessedTotal, 10000);
  });

  // --------------------------------------------------------------------------
  // TEST 12: GRACEFUL DRAINAGE, SHUTDOWN & POST-OVERLOAD RECOVERY
  // --------------------------------------------------------------------------
  it('12. executes graceful drainage, rejects writes post-shutdown, and verifies overload recovery', async () => {
    const queue = new HighThroughputEventQueueEngine({
      capacity: 1000,
      enableEventBusBridge: false,
    });

    let consumed = 0;
    queue.registerConsumer('drain-consumer', 'DRAIN_EVENT', () => {
      consumed++;
    });

    for (let i = 0; i < 200; i++) {
      queue.enqueue({
        eventType: 'DRAIN_EVENT',
        source: 'DrainSource',
        payload: { i },
        suppressionFingerprint: `drain-${i}`,
      });
    }

    // Gracefully shut down
    await queue.shutdown();

    assert.equal(consumed, 200, 'All enqueued events must be drained before complete shutdown');

    // Attempting to enqueue after shutdown must be rejected
    const postShutdownEnqueue = queue.enqueue({
      eventType: 'DRAIN_EVENT',
      source: 'LateSource',
      payload: { late: true },
      suppressionFingerprint: 'late-event',
    });

    assert.equal(postShutdownEnqueue, false, 'Enqueue after shutdown must be rejected');
    assert.equal(queue.getTelemetry().isShutdown, true);
  });
});
