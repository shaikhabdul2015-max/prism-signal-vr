/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 1.1: UI Frame Budget Monitor & RAF Update Batching Engine
 * Implements requestAnimationFrame-based update batching, frame-budget monitoring,
 * long-task detection, and adaptive UI throttling under extreme event pressure (50k+ eps).
 * 
 * Objectives:
 * - Coalesces high-frequency event updates into a single DOM update per frame (60 FPS / 90 FPS).
 * - Tracks frame execution budget (16.6ms for 60Hz, 11.1ms for 90Hz VR).
 * - Detects long tasks (>50ms W3C threshold) and frame budget overruns.
 * - Enforces strict isolation: background event ingestion runs at peak throughput (50k+ eps)
 *   while the UI thread receives smooth, throttled snapshots without freezing.
 */

export type FrameRateTarget = 60 | 90 | 120;

export interface FrameBudgetConfig {
  targetFps?: FrameRateTarget;
  longTaskThresholdMs?: number; // W3C default: 50ms
  budgetWarningThresholdRatio?: number; // e.g., 0.85 (85% of budget)
  enableAdaptiveThrottling?: boolean;
}

export interface FramePerformanceMetrics {
  targetFps: number;
  frameBudgetMs: number;
  currentFps: number;
  lastFrameDurationMs: number;
  avgFrameDurationMs: number;
  p95FrameDurationMs: number;
  p99FrameDurationMs: number;
  budgetUtilizationPercent: number;
  totalFramesSampled: number;
  framesExceededBudgetCount: number;
  longTasksCount: number;
  isThrottlingActive: boolean;
  coalescedUpdatesCount: number;
  flushedBatchesCount: number;
}

export type BatchedTaskFn = () => void;

export class UIFrameBudgetMonitor {
  private static instance: UIFrameBudgetMonitor | null = null;

  // Frame budget settings
  private targetFps: FrameRateTarget;
  private frameBudgetMs: number;
  private longTaskThresholdMs: number;
  private budgetWarningThresholdMs: number;
  private enableAdaptiveThrottling: boolean;

  // Pending batched tasks (taskKey -> callback)
  private pendingTasks: Map<string, BatchedTaskFn> = new Map();
  private isRafScheduled = false;
  private isThrottlingActive = false;

  // Performance telemetry
  private totalFramesSampled = 0;
  private framesExceededBudgetCount = 0;
  private longTasksCount = 0;
  private coalescedUpdatesCount = 0;
  private flushedBatchesCount = 0;
  private lastFrameDurationMs = 0;
  private recentFrameDurationsMs: number[] = [];
  private readonly maxDurationSamples = 120;

  // FPS calculation over sliding window
  private fpsFrameCounter = 0;
  private fpsWindowStartMs = Date.now();
  private currentFps = 60;

  // Listeners for frame health snapshots
  private listeners: Set<(metrics: FramePerformanceMetrics) => void> = new Set();
  private fpsTimerHandle: NodeJS.Timeout | null = null;

  public constructor(config: FrameBudgetConfig = {}) {
    this.targetFps = config.targetFps ?? 60;
    this.frameBudgetMs = Number((1000 / this.targetFps).toFixed(2)); // 16.67ms for 60fps, 11.11ms for 90fps
    this.longTaskThresholdMs = config.longTaskThresholdMs ?? 50.0;
    this.budgetWarningThresholdMs = this.frameBudgetMs * (config.budgetWarningThresholdRatio ?? 0.85);
    this.enableAdaptiveThrottling = config.enableAdaptiveThrottling ?? true;

    if (typeof setInterval !== 'undefined') {
      this.fpsTimerHandle = setInterval(() => this.calculateFpsWindow(), 1000);
      if (this.fpsTimerHandle && typeof this.fpsTimerHandle === 'object' && 'unref' in this.fpsTimerHandle) {
        (this.fpsTimerHandle as any).unref();
      }
    }
  }

  public static getInstance(config?: FrameBudgetConfig): UIFrameBudgetMonitor {
    if (!UIFrameBudgetMonitor.instance) {
      UIFrameBudgetMonitor.instance = new UIFrameBudgetMonitor(config);
    }
    return UIFrameBudgetMonitor.instance;
  }

  public static resetInstance(): void {
    if (UIFrameBudgetMonitor.instance) {
      UIFrameBudgetMonitor.instance.dispose();
      UIFrameBudgetMonitor.instance = null;
    }
  }

  /**
   * Schedules a UI update callback coalesced by key.
   * If called 10,000 times within the same animation frame for key 'telemetry',
   * only the latest callback executes on the next frame tick.
   */
  public scheduleUpdate(key: string, task: BatchedTaskFn): void {
    if (this.pendingTasks.has(key)) {
      this.coalescedUpdatesCount++;
    }
    this.pendingTasks.set(key, task);

    this.requestFrameDispatch();
  }

  /**
   * Invokes all pending batched tasks immediately (synchronous flush).
   * Useful for testing and deterministic state sync.
   */
  public flushSync(): void {
    this.executeFrameTasks();
  }

  /**
   * Requests animation frame in browser, or microtask/timer tick in Node.js test runtimes.
   */
  private requestFrameDispatch(): void {
    if (this.isRafScheduled) {
      return;
    }

    this.isRafScheduled = true;

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => this.executeFrameTasks());
    } else if (typeof setImmediate === 'function') {
      setImmediate(() => this.executeFrameTasks());
    } else {
      setTimeout(() => this.executeFrameTasks(), Math.max(1, Math.floor(this.frameBudgetMs)));
    }
  }

  /**
   * Executes the batched frame tasks and measures the frame execution duration.
   */
  private executeFrameTasks(): void {
    this.isRafScheduled = false;

    if (this.pendingTasks.size === 0) {
      return;
    }

    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();

    // Snapshot and clear pending tasks before execution to allow new tasks to enqueue
    const tasksToRun = Array.from(this.pendingTasks.values());
    this.pendingTasks.clear();
    this.flushedBatchesCount++;

    // Execute tasks
    for (const task of tasksToRun) {
      try {
        task();
      } catch (err) {
        console.error('[UIFrameBudgetMonitor] Task execution error:', err);
      }
    }

    const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const frameDurationMs = Math.max(0.01, t1 - t0);

    this.recordFrameDuration(frameDurationMs);
  }

  /**
   * Records duration metrics and evaluates long tasks and budget breaches.
   */
  public recordFrameDuration(durationMs: number): void {
    this.totalFramesSampled++;
    this.fpsFrameCounter++;
    this.lastFrameDurationMs = Number(durationMs.toFixed(3));

    this.recentFrameDurationsMs.push(durationMs);
    if (this.recentFrameDurationsMs.length > this.maxDurationSamples) {
      this.recentFrameDurationsMs.shift();
    }

    // Long Task Detection (>50ms W3C threshold)
    if (durationMs >= this.longTaskThresholdMs) {
      this.longTasksCount++;
    }

    // Frame Budget Overrun Check (>16.6ms for 60fps)
    if (durationMs > this.frameBudgetMs) {
      this.framesExceededBudgetCount++;
    }

    // Adaptive Throttling State Evaluation
    if (this.enableAdaptiveThrottling) {
      if (durationMs >= this.budgetWarningThresholdMs) {
        this.isThrottlingActive = true;
      } else if (this.isThrottlingActive && durationMs < this.frameBudgetMs * 0.5) {
        this.isThrottlingActive = false;
      }
    }

    this.notifyMetricsListeners();
  }

  public recordFrame(durationMs: number): void {
    this.recordFrameDuration(durationMs);
  }

  private calculateFpsWindow(): void {
    const now = Date.now();
    const elapsedSec = Math.max(0.001, (now - this.fpsWindowStartMs) / 1000);
    this.currentFps = Math.min(this.targetFps, Math.round(this.fpsFrameCounter / elapsedSec));
    this.fpsFrameCounter = 0;
    this.fpsWindowStartMs = now;

    this.notifyMetricsListeners();
  }

  /**
   * Returns a complete point-in-time snapshot of UI frame performance.
   */
  public getMetrics(): FramePerformanceMetrics {
    const sorted = [...this.recentFrameDurationsMs].sort((a, b) => a - b);
    const count = sorted.length;

    const avg = count > 0 ? sorted.reduce((sum, d) => sum + d, 0) / count : 0;
    const p95 = count > 0 ? sorted[Math.floor(count * 0.95)] : 0;
    const p99 = count > 0 ? sorted[Math.floor(count * 0.99)] : 0;

    const utilization = Number(((avg / this.frameBudgetMs) * 100).toFixed(2));

    return {
      targetFps: this.targetFps,
      frameBudgetMs: this.frameBudgetMs,
      currentFps: this.currentFps,
      lastFrameDurationMs: this.lastFrameDurationMs,
      avgFrameDurationMs: Number(avg.toFixed(3)),
      p95FrameDurationMs: Number(p95.toFixed(3)),
      p99FrameDurationMs: Number(p99.toFixed(3)),
      budgetUtilizationPercent: utilization,
      totalFramesSampled: this.totalFramesSampled,
      framesExceededBudgetCount: this.framesExceededBudgetCount,
      longTasksCount: this.longTasksCount,
      isThrottlingActive: this.isThrottlingActive,
      coalescedUpdatesCount: this.coalescedUpdatesCount,
      flushedBatchesCount: this.flushedBatchesCount,
    };
  }

  public subscribe(listener: (metrics: FramePerformanceMetrics) => void): () => void {
    this.listeners.add(listener);
    listener(this.getMetrics());
    return () => this.listeners.delete(listener);
  }

  private notifyMetricsListeners(): void {
    if (this.listeners.size === 0) return;
    const m = this.getMetrics();
    this.listeners.forEach((l) => {
      try {
        l(m);
      } catch {
        // Safe subscriber containment
      }
    });
  }

  public getPendingUpdatesCount(): number {
    return this.pendingTasks.size;
  }

  public dispose(): void {
    if (this.fpsTimerHandle) {
      clearInterval(this.fpsTimerHandle);
      this.fpsTimerHandle = null;
    }
    this.pendingTasks.clear();
    this.listeners.clear();
    this.isRafScheduled = false;
  }
}
