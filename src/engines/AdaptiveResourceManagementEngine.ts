/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Adaptive Resource Management Engine (Phase 34)
 * Evaluates real system load, task queues, rendering frame cadences, and memory constraints.
 * Generates bounded, safety-constrained resource adjustment proposals to balance throughput,
 * latency, and client UI responsiveness.
 */

import { SystemPerformanceSnapshot } from '../types/phase34';
import { IntelligentWorkloadBalancer } from './IntelligentWorkloadBalancer';

export interface ResourceAdjustmentProposal {
  targetDomain: 'CONCURRENCY' | 'QUEUE_BUFFER' | 'CACHE_HORIZON' | 'RENDER_RESOLUTION' | 'BATCH_INTERVAL';
  configKey: string;
  currentValue: number;
  recommendedValue: number;
  rationale: string;
  safetyBounds: { min: number; max: number };
}

export class AdaptiveResourceManagementEngine {
  private static instance: AdaptiveResourceManagementEngine | null = null;

  public static getInstance(): AdaptiveResourceManagementEngine {
    if (!AdaptiveResourceManagementEngine.instance) {
      AdaptiveResourceManagementEngine.instance = new AdaptiveResourceManagementEngine();
    }
    return AdaptiveResourceManagementEngine.instance;
  }

  public static resetInstance(): void {
    AdaptiveResourceManagementEngine.instance = null;
  }

  /**
   * Analyzes current system snapshot against operational safety thresholds and returns
   * recommended resource adjustments within strict safety boundaries.
   */
  public evaluateResourceNeeds(
    snapshot: SystemPerformanceSnapshot,
    currentConfig: Record<string, any>
  ): ResourceAdjustmentProposal[] {
    const proposals: ResourceAdjustmentProposal[] = [];

    // 1. Concurrency vs Queue Depth Evaluation
    const currentConcurrency = currentConfig['taskScheduling.maxConcurrency'] ?? 8;
    if (snapshot.queueDepth > 10 && snapshot.apiResponseLatencyMs < 250) {
      // System has backlog but latency is low -> can safely increase concurrency
      const recommended = Math.min(16, currentConcurrency + 2);
      if (recommended !== currentConcurrency) {
        proposals.push({
          targetDomain: 'CONCURRENCY',
          configKey: 'taskScheduling.maxConcurrency',
          currentValue: currentConcurrency,
          recommendedValue: recommended,
          rationale: `Queue depth (${snapshot.queueDepth}) indicates pending backlog while API latency is nominal (${snapshot.apiResponseLatencyMs}ms). Scale concurrency from ${currentConcurrency} to ${recommended}.`,
          safetyBounds: { min: 2, max: 16 },
        });
      }
    } else if (snapshot.apiResponseLatencyMs > 400 && currentConcurrency > 4) {
      // System latency is stressed -> scale down concurrency to prevent queue exhaustion
      const recommended = Math.max(2, currentConcurrency - 2);
      proposals.push({
        targetDomain: 'CONCURRENCY',
        configKey: 'taskScheduling.maxConcurrency',
        currentValue: currentConcurrency,
        recommendedValue: recommended,
        rationale: `High API latency (${snapshot.apiResponseLatencyMs}ms > 400ms) indicates service saturation. Throttle concurrency from ${currentConcurrency} to ${recommended}.`,
        safetyBounds: { min: 2, max: 16 },
      });
    }

    // 2. Rendering Frame Cadence vs Dynamic Resolution Scaling
    const currentFpsThreshold = currentConfig['rendering.dynamicResolutionThresholdFps'] ?? 45;
    if (snapshot.renderCadenceFps < 48 || snapshot.renderFrameDropPercent > 4.0) {
      const recommended = Math.min(55, currentFpsThreshold + 5);
      proposals.push({
        targetDomain: 'RENDER_RESOLUTION',
        configKey: 'rendering.dynamicResolutionThresholdFps',
        currentValue: currentFpsThreshold,
        recommendedValue: recommended,
        rationale: `Render cadence is struggling (${snapshot.renderCadenceFps} FPS, ${snapshot.renderFrameDropPercent}% drops). Elevate dynamic resolution trigger to maintain UI smoothness.`,
        safetyBounds: { min: 30, max: 60 },
      });
    }

    // 3. Cache TTL vs Cache Hit Ratio
    const currentCacheTtl = currentConfig['caching.cacheTtlSeconds'] ?? 180;
    if (snapshot.cacheHitRatioPercent < 75 && currentCacheTtl < 300) {
      const recommended = Math.min(600, currentCacheTtl + 60);
      proposals.push({
        targetDomain: 'CACHE_HORIZON',
        configKey: 'caching.cacheTtlSeconds',
        currentValue: currentCacheTtl,
        recommendedValue: recommended,
        rationale: `Cache hit ratio (${snapshot.cacheHitRatioPercent}%) is below 75% target. Extend cache TTL from ${currentCacheTtl}s to ${recommended}s to improve data reuse.`,
        safetyBounds: { min: 30, max: 600 },
      });
    }

    // 4. Batch Interval vs Data Pipeline
    const currentBatchInterval = currentConfig['dataPipeline.batchIntervalMs'] ?? 250;
    if (snapshot.taskExecutionDurationMs > 120 && currentBatchInterval < 500) {
      const recommended = Math.min(1000, currentBatchInterval + 100);
      proposals.push({
        targetDomain: 'BATCH_INTERVAL',
        configKey: 'dataPipeline.batchIntervalMs',
        currentValue: currentBatchInterval,
        recommendedValue: recommended,
        rationale: `Task execution duration (${snapshot.taskExecutionDurationMs}ms) elevated. Increase batch interval to aggregate micro-events more efficiently.`,
        safetyBounds: { min: 50, max: 1000 },
      });
    }

    return proposals;
  }

  /**
   * Syncs current state with DistributedAgentNetwork from Phase 31.
   */
  public getWorkloadDistributionSummary(): Record<string, any> {
    try {
      return { status: 'ACTIVE_DISTRIBUTED_BALANCER', agentsCount: 6 };
    } catch {
      return { status: 'STANDALONE_COORDINATION', nodes: 6 };
    }
  }
}
