/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Asset Streaming Monitor (Stage 5.1)
 * High-performance telemetry and observability monitor for WebXR asset streaming.
 * Tracks bandwidth consumption, decode latencies, cache performance, and failure rates.
 * Integrates with EnterpriseObservabilityManager and DistributedTracingEngine.
 */

import {
  AssetQualityTier,
  AssetStreamingTelemetry,
  NetworkTier,
} from '../types/assetStreaming';
import { EnterpriseObservabilityManager } from '../engines/EnterpriseObservabilityManager';
import { DistributedTracingEngine } from '../engines/DistributedTracingEngine';

export class AssetStreamingMonitor {
  private static instance: AssetStreamingMonitor | null = null;

  private totalAssetsRequested = 0;
  private totalAssetsLoaded = 0;
  private totalBytesDownloaded = 0;
  private cacheHits = 0;
  private cacheMisses = 0;
  private failedAssetsCount = 0;
  private retriedRequestsCount = 0;
  private fallbackAssetsLoaded = 0;
  private modelDecodeDurations: number[] = [];
  private textureDecodeDurations: number[] = [];
  private assetLoadDurations: number[] = [];
  private activeDownloadsCount = 0;
  private memoryUsageBytes = 0;
  private currentQualityTier: AssetQualityTier = 'HIGH';
  private currentNetworkTier: NetworkTier = '4G';

  private constructor() {}

  public static getInstance(): AssetStreamingMonitor {
    if (!AssetStreamingMonitor.instance) {
      AssetStreamingMonitor.instance = new AssetStreamingMonitor();
    }
    return AssetStreamingMonitor.instance;
  }

  public static resetInstance(): void {
    if (AssetStreamingMonitor.instance) {
      AssetStreamingMonitor.instance.reset();
      AssetStreamingMonitor.instance = null;
    }
  }

  public reset(): void {
    this.totalAssetsRequested = 0;
    this.totalAssetsLoaded = 0;
    this.totalBytesDownloaded = 0;
    this.cacheHits = 0;
    this.cacheMisses = 0;
    this.failedAssetsCount = 0;
    this.retriedRequestsCount = 0;
    this.fallbackAssetsLoaded = 0;
    this.modelDecodeDurations = [];
    this.textureDecodeDurations = [];
    this.assetLoadDurations = [];
    this.activeDownloadsCount = 0;
    this.memoryUsageBytes = 0;
  }

  public recordRequest(assetId: string, sizeEstimateBytes: number = 0): void {
    this.totalAssetsRequested += 1;
    this.activeDownloadsCount += 1;

    try {
      const obs = EnterpriseObservabilityManager.getInstance();
      obs.log({
        level: 'DEBUG',
        service: 'AssetStreamingMonitor',
        message: `Asset request dispatched: ${assetId}`,
        metadata: { assetId, sizeEstimateBytes },
      });
    } catch {
      // Ignore during isolated unit tests
    }
  }

  public recordSuccess(params: {
    assetId: string;
    bytes: number;
    durationMs: number;
    isCached: boolean;
    isFallback: boolean;
  }): void {
    this.activeDownloadsCount = Math.max(0, this.activeDownloadsCount - 1);
    this.totalAssetsLoaded += 1;
    this.assetLoadDurations.push(params.durationMs);
    if (this.assetLoadDurations.length > 500) this.assetLoadDurations.shift();

    if (params.isCached) {
      this.cacheHits += 1;
    } else {
      this.cacheMisses += 1;
      this.totalBytesDownloaded += params.bytes;
    }

    if (params.isFallback) {
      this.fallbackAssetsLoaded += 1;
    }
  }

  public recordFailure(assetId: string, error: string, retryCount: number): void {
    this.activeDownloadsCount = Math.max(0, this.activeDownloadsCount - 1);
    this.failedAssetsCount += 1;

    try {
      const obs = EnterpriseObservabilityManager.getInstance();
      obs.log({
        level: 'WARN',
        service: 'AssetStreamingMonitor',
        message: `Asset loading failure for ${assetId}: ${error} (retries: ${retryCount})`,
        metadata: { assetId, error, retryCount },
      });
    } catch {
      // Ignore
    }
  }

  public recordRetry(assetId: string, attempt: number): void {
    this.retriedRequestsCount += 1;
  }

  public recordModelDecode(durationMs: number): void {
    this.modelDecodeDurations.push(durationMs);
    if (this.modelDecodeDurations.length > 200) this.modelDecodeDurations.shift();
  }

  public recordTextureDecode(durationMs: number): void {
    this.textureDecodeDurations.push(durationMs);
    if (this.textureDecodeDurations.length > 200) this.textureDecodeDurations.shift();
  }

  public updateMemoryUsage(bytes: number): void {
    this.memoryUsageBytes = bytes;
  }

  public updateTiers(quality: AssetQualityTier, network: NetworkTier): void {
    this.currentQualityTier = quality;
    this.currentNetworkTier = network;
  }

  public getTelemetry(): AssetStreamingTelemetry {
    const avg = (arr: number[]) => (arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);

    return {
      totalAssetsRequested: this.totalAssetsRequested,
      totalAssetsLoaded: this.totalAssetsLoaded,
      totalBytesDownloaded: this.totalBytesDownloaded,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      failedAssetsCount: this.failedAssetsCount,
      retriedRequestsCount: this.retriedRequestsCount,
      fallbackAssetsLoaded: this.fallbackAssetsLoaded,
      avgModelDecodeDurationMs: Number(avg(this.modelDecodeDurations).toFixed(2)),
      avgTextureDecodeDurationMs: Number(avg(this.textureDecodeDurations).toFixed(2)),
      avgAssetLoadDurationMs: Number(avg(this.assetLoadDurations).toFixed(2)),
      activeDownloadsCount: this.activeDownloadsCount,
      memoryUsageBytes: this.memoryUsageBytes,
      currentQualityTier: this.currentQualityTier,
      currentNetworkTier: this.currentNetworkTier,
    };
  }
}

export const assetStreamingMonitor = AssetStreamingMonitor.getInstance();
