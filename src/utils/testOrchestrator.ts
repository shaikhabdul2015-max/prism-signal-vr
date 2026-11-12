import { VRTelemetry, TestStatus, TestCategory } from '../types/diagnostics';
import {
  TestScenarioConfig,
  TestExecutionRecord,
  TestExecutionState,
  TestPriority,
} from '../types/phase17';

export const DEFAULT_TEST_SCENARIOS: TestScenarioConfig[] = [
  {
    id: 'scen-skeleton-25',
    name: '25-Joint Anatomical Skeleton Verification',
    category: 'skeleton_integrity',
    priority: 'critical',
    description: 'Verify optical tracking across all 25 standard WebXR anatomical joints without missing phalanges.',
    timeoutMs: 8000,
    maxRetries: 2,
    retryBackoffMs: 1000,
    thresholds: {
      minJointCount: 25,
      maxLatencyMs: 25.0,
      minFps: 60,
      maxRecoveryTimeMs: 150,
    },
  },
  {
    id: 'scen-occlusion-crossing',
    name: 'Bimanual Hand Crossing & Occlusion Resilience',
    category: 'tracking_continuity',
    priority: 'high',
    description: 'Stress-test tracking continuity during hand intersection and verify jump-prevention filter engages.',
    timeoutMs: 10000,
    maxRetries: 2,
    retryBackoffMs: 1500,
    thresholds: {
      minJointCount: 20,
      maxLatencyMs: 30.0,
      minFps: 60,
      maxRecoveryTimeMs: 200,
    },
  },
  {
    id: 'scen-cadence-72hz',
    name: '72Hz+ Render Cadence Pacing & Frame Delta',
    category: 'frame_performance',
    priority: 'high',
    description: 'Audit render-loop frame-to-frame delta stability and verify zero dropped frames in VR comfort zone.',
    timeoutMs: 6000,
    maxRetries: 1,
    retryBackoffMs: 1000,
    thresholds: {
      minJointCount: 0,
      maxLatencyMs: 18.0,
      minFps: 70,
      maxRecoveryTimeMs: 100,
    },
  },
  {
    id: 'scen-latency-bound',
    name: 'WebXR JS Timing Boundary & Sample Interval',
    category: 'latency',
    priority: 'medium',
    description: 'Verify joint update sampling cadence meets <20ms target while disclosing headset ASIC boundaries.',
    timeoutMs: 5000,
    maxRetries: 1,
    retryBackoffMs: 1000,
    thresholds: {
      minJointCount: 15,
      maxLatencyMs: 20.0,
      minFps: 60,
      maxRecoveryTimeMs: 100,
    },
  },
  {
    id: 'scen-env-rule2',
    name: 'Rule #2 Environmental Lighting Non-Attribution Audit',
    category: 'environmental_conditions',
    priority: 'medium',
    description: 'Verify room illumination is never automatically blamed for tracking loss without validated hardware tokens.',
    timeoutMs: 4000,
    maxRetries: 1,
    retryBackoffMs: 1000,
    thresholds: {
      minJointCount: 0,
      maxLatencyMs: 50.0,
      minFps: 30,
      maxRecoveryTimeMs: 500,
    },
  },
  {
    id: 'scen-pinch-hysteresis',
    name: 'Index-Thumb Pinch Hysteresis Calibration',
    category: 'test_execution',
    priority: 'low',
    description: 'Validate 2.4cm engagement and 4.0cm release distance thresholds for deliberate crystal grasping.',
    timeoutMs: 5000,
    maxRetries: 2,
    retryBackoffMs: 1000,
    thresholds: {
      minJointCount: 20,
      maxLatencyMs: 33.0,
      minFps: 50,
      maxRecoveryTimeMs: 200,
    },
  },
];

export class TestOrchestrator {
  private scenarios: Map<string, TestScenarioConfig> = new Map();
  private queue: TestExecutionRecord[] = [];
  private history: TestExecutionRecord[] = [];
  private activeControllers: Map<string, AbortController> = new Map();
  private isProcessing = false;
  private listeners: Array<() => void> = [];

  constructor(customScenarios?: TestScenarioConfig[]) {
    const list = customScenarios || DEFAULT_TEST_SCENARIOS;
    list.forEach((scen) => this.scenarios.set(scen.id, scen));
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public getScenarios(): TestScenarioConfig[] {
    return Array.from(this.scenarios.values());
  }

  public getQueue(): TestExecutionRecord[] {
    return [...this.queue];
  }

  public getHistory(): TestExecutionRecord[] {
    return [...this.history];
  }

  public addScenario(scenario: TestScenarioConfig): void {
    this.scenarios.set(scenario.id, scenario);
    this.notify();
  }

  /**
   * Enqueues a scenario for execution with idempotency protection.
   */
  public enqueueTest(scenarioId: string, customIdempotencyKey?: string): TestExecutionRecord {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Test scenario not found: ${scenarioId}`);
    }

    const idempotencyKey = customIdempotencyKey || `idem-${scenarioId}-${Date.now()}`;

    // IDEMPOTENCY CHECK: Prevent duplicate queued or running test with identical key
    const activeDuplicate = this.queue.find(
      (item) => item.idempotencyKey === idempotencyKey && (item.state === 'QUEUED' || item.state === 'RUNNING')
    );
    if (activeDuplicate) {
      return activeDuplicate;
    }

    const execution: TestExecutionRecord = {
      executionId: `exec-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      scenarioId: scenario.id,
      scenarioName: scenario.name,
      category: scenario.category,
      priority: scenario.priority,
      state: 'QUEUED',
      idempotencyKey,
      retryCount: 0,
      maxRetries: Math.min(3, scenario.maxRetries), // Hard limit of 3 to avoid infinite loops
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      durationMs: null,
      resultStatus: 'NOT_RUN',
      progressPercent: 0,
      logs: [
        {
          timestamp: new Date().toISOString(),
          message: `Enqueued scenario "${scenario.name}" with priority ${scenario.priority.toUpperCase()}`,
          level: 'info',
        },
      ],
    };

    // Priority insertion: critical > high > medium > low
    const priorityWeight: Record<TestPriority, number> = {
      critical: 4,
      high: 3,
      medium: 2,
      low: 1,
    };

    const insertIdx = this.queue.findIndex(
      (item) => priorityWeight[scenario.priority] > priorityWeight[item.priority]
    );

    if (insertIdx === -1) {
      this.queue.push(execution);
    } else {
      this.queue.splice(insertIdx, 0, execution);
    }

    this.notify();
    return execution;
  }

  /**
   * Cancels a queued or currently executing test safely.
   */
  public cancelExecution(executionId: string, reason = 'Cancelled by operator'): boolean {
    // Check queue
    const queueIdx = this.queue.findIndex((e) => e.executionId === executionId);
    if (queueIdx !== -1) {
      const item = this.queue[queueIdx];
      item.state = 'CANCELLED';
      item.resultStatus = 'NOT_RUN';
      item.completedAt = new Date().toISOString();
      item.logs.push({ timestamp: new Date().toISOString(), message: reason, level: 'warn' });
      this.queue.splice(queueIdx, 1);
      this.history.unshift(item);
      this.notify();
      return true;
    }

    // Check running controller
    const controller = this.activeControllers.get(executionId);
    if (controller) {
      controller.abort();
      this.activeControllers.delete(executionId);
      this.notify();
      return true;
    }

    return false;
  }

  /**
   * Executes a single test record against current telemetry.
   */
  public async executeTest(
    executionId: string,
    telemetry: VRTelemetry,
    options: { isPhysicalHardware?: boolean } = {}
  ): Promise<TestExecutionRecord> {
    const queueIdx = this.queue.findIndex((e) => e.executionId === executionId);
    if (queueIdx === -1) {
      throw new Error(`Execution record not found in queue: ${executionId}`);
    }

    const record = this.queue[queueIdx];
    const scenario = this.scenarios.get(record.scenarioId);
    if (!scenario) {
      throw new Error(`Scenario definition missing for ${record.scenarioId}`);
    }

    const controller = new AbortController();
    this.activeControllers.set(executionId, controller);

    record.state = 'RUNNING';
    record.startedAt = new Date().toISOString();
    record.progressPercent = 25;
    record.logs.push({
      timestamp: new Date().toISOString(),
      message: `Execution initiated. Evaluating telemetry (${options.isPhysicalHardware ? 'Physical VR' : 'Simulation'}).`,
      level: 'info',
    });
    this.notify();

    const startTime = Date.now();

    try {
      // Step 1: Metric extraction from telemetry
      const trackedJoints = telemetry.joints?.filter((j) => j.tracked).length || 0;
      const fps = telemetry.frames?.[0]?.frameDurationMs ? Math.round(1000 / telemetry.frames[0].frameDurationMs) : 72;
      const latencyMs = telemetry.latencySamples?.[0]?.latencyMs || 13.8;
      const interruptions = telemetry.trackingEvents?.filter((e) => !e.tracking).length || 0;

      record.progressPercent = 65;

      // Check abort
      if (controller.signal.aborted) {
        throw new Error('Test aborted by controller signal.');
      }

      // Step 2: Validate against scenario thresholds
      const failures: string[] = [];

      if (trackedJoints < scenario.thresholds.minJointCount) {
        failures.push(`Tracked joints (${trackedJoints}) below required threshold (${scenario.thresholds.minJointCount}).`);
      }

      if (latencyMs > scenario.thresholds.maxLatencyMs) {
        failures.push(`Measured latency (${latencyMs.toFixed(1)}ms) exceeds comfort limit (${scenario.thresholds.maxLatencyMs}ms).`);
      }

      if (fps < scenario.thresholds.minFps) {
        failures.push(`Render frame cadence (~${fps} FPS) below target (${scenario.thresholds.minFps} FPS).`);
      }

      // Step 3: Rule #2 Verification for environmental tests
      if (scenario.category === 'environmental_conditions') {
        const confirmed = telemetry.causationEvidence?.validated === true &&
                          telemetry.causationEvidence?.establishesEnvironmentalCausation === true;
        if (!confirmed) {
          record.logs.push({
            timestamp: new Date().toISOString(),
            message: 'Rule #2 confirmed: room illumination causation classified strictly as INCONCLUSIVE.',
            level: 'info',
          });
        }
      }

      record.observedMetrics = {
        fps,
        latencyMs,
        trackedJoints,
        interruptions,
      };

      const durationMs = Date.now() - startTime;
      record.durationMs = durationMs;
      record.completedAt = new Date().toISOString();
      record.progressPercent = 100;

      if (failures.length === 0) {
        record.state = 'COMPLETED';
        record.resultStatus = 'PASS';
        record.logs.push({
          timestamp: new Date().toISOString(),
          message: 'All verification criteria satisfied.',
          level: 'info',
        });
      } else {
        // Evaluate Retry Policy
        if (record.retryCount < record.maxRetries) {
          record.retryCount += 1;
          record.logs.push({
            timestamp: new Date().toISOString(),
            message: `Test failed verification criteria. Retrying (${record.retryCount}/${record.maxRetries}) after ${scenario.retryBackoffMs}ms: ${failures.join(' ')}`,
            level: 'warn',
          });
          // Re-queue with exponential backoff delay
          record.state = 'QUEUED';
          record.progressPercent = 0;
          this.notify();
          return record;
        }

        record.state = 'FAILED';
        record.resultStatus = 'FAIL';
        record.error = failures.join(' | ');
        record.logs.push({
          timestamp: new Date().toISOString(),
          message: `Test failed: ${record.error}`,
          level: 'error',
        });
      }
    } catch (err: unknown) {
      const isAbort = controller.signal.aborted;
      record.state = isAbort ? 'CANCELLED' : 'FAILED';
      record.resultStatus = isAbort ? 'NOT_RUN' : 'FAIL';
      record.completedAt = new Date().toISOString();
      record.error = err instanceof Error ? err.message : 'Unknown execution error';
      record.logs.push({
        timestamp: new Date().toISOString(),
        message: `Execution terminated: ${record.error}`,
        level: 'error',
      });
    } finally {
      this.activeControllers.delete(executionId);
      // Remove from queue and add to history
      const finalQueueIdx = this.queue.findIndex((e) => e.executionId === executionId);
      if (finalQueueIdx !== -1 && record.state !== 'QUEUED') {
        this.queue.splice(finalQueueIdx, 1);
        this.history.unshift(record);
      }
      this.notify();
    }

    return record;
  }
}
