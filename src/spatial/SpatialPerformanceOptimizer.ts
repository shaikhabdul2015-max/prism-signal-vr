// src/spatial/SpatialPerformanceOptimizer.ts
import type { SpatialPerformanceMetrics, Vec3 } from './types';

/**
 * Lightweight zero-GC object pool for 3D vectors and spatial descriptors
 */
export class Vector3Pool {
  private pool: Vec3[] = [];
  private reusedCount = 0;
  private createdCount = 0;
  private readonly maxSize: number;

  constructor(initialSize = 32, maxSize = 256) {
    this.maxSize = maxSize;
    for (let i = 0; i < initialSize; i++) {
      this.pool.push([0, 0, 0]);
      this.createdCount++;
    }
  }

  public acquire(x = 0, y = 0, z = 0): Vec3 {
    const vec = this.pool.pop();
    if (vec) {
      vec[0] = x;
      vec[1] = y;
      vec[2] = z;
      this.reusedCount++;
      return vec;
    }
    this.createdCount++;
    return [x, y, z];
  }

  public release(vec: Vec3): void {
    if (this.pool.length < this.maxSize) {
      vec[0] = 0;
      vec[1] = 0;
      vec[2] = 0;
      this.pool.push(vec);
    }
  }

  public getStats() {
    return {
      available: this.pool.length,
      reused: this.reusedCount,
      created: this.createdCount,
    };
  }
}

/**
 * Coordinates adaptive spatial update frequency, dirty-flag event skipping,
 * frame-time budgeting, and pooled allocations.
 */
export class SpatialPerformanceOptimizer {
  public readonly vectorPool: Vector3Pool;
  private currentUpdateHz = 72;
  private lastTickDurationMs = 0.5;
  private tickSamples: number[] = [];
  private dirtyRecomputesSkipped = 0;
  private lastProcessedTimestamp = 0;
  private isDirty = true;
  private activeTrackedNodes = 0;

  constructor(poolInitialSize = 48) {
    this.vectorPool = new Vector3Pool(poolInitialSize);
  }

  public markDirty(): void {
    this.isDirty = true;
  }

  public setActiveTrackedNodes(count: number): void {
    this.activeTrackedNodes = count;
  }

  /**
   * Determines whether spatial computation should execute this frame
   * based on dirty state and adaptive frequency interval.
   */
  public shouldProcessFrame(currentTimeMs = Date.now(), forceIfDirty = true): boolean {
    const minIntervalMs = 1000 / this.currentUpdateHz;
    const elapsed = currentTimeMs - this.lastProcessedTimestamp;

    if (!this.isDirty && elapsed < minIntervalMs) {
      this.dirtyRecomputesSkipped++;
      return false;
    }

    if (forceIfDirty && this.isDirty) {
      return true;
    }

    if (elapsed >= minIntervalMs) {
      return true;
    }

    this.dirtyRecomputesSkipped++;
    return false;
  }

  public recordFrameBudget(renderFrameDeltaMs: number, spatialTickDurationMs: number, currentTimeMs = Date.now()): void {
    const safeTick = Math.max(0.1, spatialTickDurationMs);
    this.lastTickDurationMs = Number(safeTick.toFixed(3));
    this.tickSamples.push(this.lastTickDurationMs);
    if (this.tickSamples.length > 60) {
      this.tickSamples.shift();
    }

    // Adaptive frequency scaling based on WebXR frame budget (11.1ms for 90Hz, 13.8ms for 72Hz, 16.6ms for 60Hz)
    if (renderFrameDeltaMs > 22.0) {
      this.currentUpdateHz = 20; // Throttle spatial AI updates under heavy GPU load
    } else if (renderFrameDeltaMs > 15.0) {
      this.currentUpdateHz = 45;
    } else {
      this.currentUpdateHz = 72;
    }

    this.lastProcessedTimestamp = currentTimeMs;
    this.isDirty = false;
  }

  public getMetrics(): SpatialPerformanceMetrics {
    const poolStats = this.vectorPool.getStats();
    const avg =
      this.tickSamples.length > 0
        ? this.tickSamples.reduce((a, b) => a + b, 0) / this.tickSamples.length
        : this.lastTickDurationMs;

    return {
      pooledAllocationsReused: poolStats.reused,
      pooledAllocationsCreated: poolStats.created,
      currentUpdateHz: this.currentUpdateHz,
      lastSpatialTickMs: this.lastTickDurationMs,
      averageSpatialTickMs: Number(avg.toFixed(3)),
      dirtyRecomputesSkipped: this.dirtyRecomputesSkipped,
      activeTrackedNodes: this.activeTrackedNodes,
    };
  }

  public reset(): void {
    this.currentUpdateHz = 72;
    this.tickSamples = [];
    this.dirtyRecomputesSkipped = 0;
    this.isDirty = true;
  }
}
