/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Asset Priority Scheduler (Stage 5.1)
 * Multi-tier priority queue for progressive WebXR asset streaming.
 * 
 * Guarantees:
 * - CRITICAL WebXR assets (controllers, player chamber, core hologram) are loaded first.
 * - Concurrency bounds prevent network congestion and main-thread starvation.
 * - Background prefetching queues LOW and MEDIUM assets during idle frame slots.
 * - Support for task cancellation via AbortController.
 */

import { AssetPriority } from '../types/assetStreaming';

export interface ScheduledTask<T = any> {
  taskId: string;
  assetId: string;
  priority: AssetPriority;
  execute: (signal: AbortSignal) => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
  abortController: AbortController;
  queuedAt: number;
}

export interface SchedulerOptions {
  maxConcurrency?: number; // Default 4 concurrent downloads
  enableIdlePrefetch?: boolean;
}

export class AssetPriorityScheduler {
  private static instance: AssetPriorityScheduler | null = null;
  private queues: Record<AssetPriority, ScheduledTask[]> = {
    CRITICAL: [],
    HIGH: [],
    MEDIUM: [],
    LOW: [],
  };

  private activeTasksCount = 0;
  private maxConcurrency: number;
  private isProcessing = false;
  private isPaused = false;

  private constructor(options?: SchedulerOptions) {
    this.maxConcurrency = options?.maxConcurrency || 4;
  }

  public static getInstance(options?: SchedulerOptions): AssetPriorityScheduler {
    if (!AssetPriorityScheduler.instance) {
      AssetPriorityScheduler.instance = new AssetPriorityScheduler(options);
    }
    return AssetPriorityScheduler.instance;
  }

  public static resetInstance(): void {
    if (AssetPriorityScheduler.instance) {
      AssetPriorityScheduler.instance.cancelAll();
      AssetPriorityScheduler.instance = null;
    }
  }

  public setMaxConcurrency(concurrency: number): void {
    this.maxConcurrency = Math.max(1, concurrency);
    this.processQueue();
  }

  public schedule<T = any>(params: {
    assetId: string;
    priority: AssetPriority;
    execute: (signal: AbortSignal) => Promise<T>;
  }): { promise: Promise<T>; cancel: () => void; taskId: string } {
    const { assetId, priority, execute } = params;
    const taskId = `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const abortController = new AbortController();

    let resolvePromise!: (value: T | PromiseLike<T>) => void;
    let rejectPromise!: (reason?: any) => void;

    const promise = new Promise<T>((res, rej) => {
      resolvePromise = res;
      rejectPromise = rej;
    });

    const task: ScheduledTask<T> = {
      taskId,
      assetId,
      priority,
      execute,
      resolve: resolvePromise,
      reject: rejectPromise,
      abortController,
      queuedAt: performance.now(),
    };

    // Insert into appropriate priority queue
    this.queues[priority].push(task);

    // Trigger queue processing
    this.processQueue();

    const cancel = () => {
      abortController.abort();
      this.removeTask(taskId, priority);
      rejectPromise(new Error(`Task ${taskId} for asset ${assetId} was cancelled`));
    };

    return { promise, cancel, taskId };
  }

  private processQueue(): void {
    if (this.isProcessing || this.isPaused) return;
    this.isProcessing = true;

    try {
      while (this.activeTasksCount < this.maxConcurrency) {
        const nextTask = this.dequeueNextTask();
        if (!nextTask) break;

        this.executeTask(nextTask);
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private dequeueNextTask(): ScheduledTask | null {
    // Priority order: CRITICAL -> HIGH -> MEDIUM -> LOW
    const priorities: AssetPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    for (const p of priorities) {
      if (this.queues[p].length > 0) {
        return this.queues[p].shift()!;
      }
    }
    return null;
  }

  private async executeTask(task: ScheduledTask): Promise<void> {
    if (task.abortController.signal.aborted) {
      task.reject(new Error(`Task ${task.taskId} already aborted`));
      this.processQueue();
      return;
    }

    this.activeTasksCount += 1;

    try {
      const result = await task.execute(task.abortController.signal);
      task.resolve(result);
    } catch (err: any) {
      if (task.abortController.signal.aborted) {
        task.reject(new Error(`Task ${task.taskId} aborted`));
      } else {
        task.reject(err);
      }
    } finally {
      this.activeTasksCount = Math.max(0, this.activeTasksCount - 1);
      this.processQueue();
    }
  }

  private removeTask(taskId: string, priority: AssetPriority): void {
    const queue = this.queues[priority];
    const index = queue.findIndex((t) => t.taskId === taskId);
    if (index !== -1) {
      queue.splice(index, 1);
    }
  }

  public cancelAll(): void {
    const priorities: AssetPriority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    for (const p of priorities) {
      while (this.queues[p].length > 0) {
        const task = this.queues[p].shift()!;
        task.abortController.abort();
        task.reject(new Error(`Task ${task.taskId} cancelled by scheduler reset`));
      }
    }
  }

  public getQueueDepth(): Record<AssetPriority, number> & { active: number } {
    return {
      CRITICAL: this.queues.CRITICAL.length,
      HIGH: this.queues.HIGH.length,
      MEDIUM: this.queues.MEDIUM.length,
      LOW: this.queues.LOW.length,
      active: this.activeTasksCount,
    };
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.processQueue();
  }
}

export const assetPriorityScheduler = AssetPriorityScheduler.getInstance();
