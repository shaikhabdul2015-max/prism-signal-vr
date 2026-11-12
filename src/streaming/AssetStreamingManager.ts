/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Asset Streaming Manager (Stage 5.1 Central Engine)
 * Enterprise-grade, modular WebXR asset streaming and Edge CDN delivery engine.
 * 
 * Orchestrates:
 * 1. CDN-Ready URL Routing & Origin Security Validation
 * 2. Progressive 3D Model & Compressed Texture Streaming
 * 3. Multi-tier Priority Scheduling (CRITICAL WebXR Assets First)
 * 4. Adaptive Quality Resolution (ULTRA_LOW -> ULTRA)
 * 5. Memory-Aware LRU Caching & GPU Resource Disposal
 * 6. Automated Fallback to Procedural Geometries & Textures
 * 7. Real-Time Telemetry & Distributed Tracing
 */

import * as THREE from 'three';
import {
  AssetDescriptor,
  AssetLoadProgress,
  AssetQualityTier,
  CDNConfig,
  ProgressiveLoadResult,
} from '../types/assetStreaming';
import { AssetCacheManager } from './AssetCacheManager';
import { AssetPriorityScheduler } from './AssetPriorityScheduler';
import { AdaptiveQualityManager } from './AdaptiveQualityManager';
import { NetworkPerformanceDetector } from './NetworkPerformanceDetector';
import { AssetStreamingMonitor } from './AssetStreamingMonitor';
import { DracoModelLoader } from '../loaders/DracoModelLoader';
import { KTX2TextureLoader } from '../loaders/KTX2TextureLoader';
import { ProgressiveAssetLoader } from '../loaders/ProgressiveAssetLoader';
import { DistributedTracingEngine } from '../engines/DistributedTracingEngine';

export class AssetStreamingManager {
  private static instance: AssetStreamingManager | null = null;

  private cdnConfig: CDNConfig;
  private cacheManager: AssetCacheManager;
  private scheduler: AssetPriorityScheduler;
  private qualityManager: AdaptiveQualityManager;
  private networkDetector: NetworkPerformanceDetector;
  private monitor: AssetStreamingMonitor;
  private dracoLoader: DracoModelLoader;
  private ktx2Loader: KTX2TextureLoader;
  private progressiveLoader: ProgressiveAssetLoader;
  private registeredAssets: Map<string, AssetDescriptor> = new Map();

  private constructor(config?: Partial<CDNConfig>) {
    this.cdnConfig = {
      cdnBaseUrl: config?.cdnBaseUrl ?? (typeof process !== 'undefined' ? process.env.VITE_CDN_BASE_URL || '' : ''),
      version: config?.version || '1.0.0',
      fallbackToLocal: config?.fallbackToLocal ?? true,
      allowedOrigins: config?.allowedOrigins || [
        'self',
        'https://cdn.jsdelivr.net',
        'https://www.gstatic.com',
        'https://storage.googleapis.com',
        'https://cloudflare-ipfs.com',
      ],
      enableImmutableCaching: config?.enableImmutableCaching ?? true,
      cacheTtlSeconds: config?.cacheTtlSeconds || 31536000,
      timeoutMs: config?.timeoutMs || 10000,
      maxRetries: config?.maxRetries ?? 3,
    };

    this.cacheManager = AssetCacheManager.getInstance();
    this.scheduler = AssetPriorityScheduler.getInstance();
    this.qualityManager = AdaptiveQualityManager.getInstance();
    this.networkDetector = NetworkPerformanceDetector.getInstance();
    this.monitor = AssetStreamingMonitor.getInstance();
    this.dracoLoader = new DracoModelLoader();
    this.ktx2Loader = new KTX2TextureLoader();
    this.progressiveLoader = new ProgressiveAssetLoader({
      timeoutMs: this.cdnConfig.timeoutMs,
      maxRetries: this.cdnConfig.maxRetries,
    });
  }

  public static getInstance(config?: Partial<CDNConfig>): AssetStreamingManager {
    if (!AssetStreamingManager.instance) {
      AssetStreamingManager.instance = new AssetStreamingManager(config);
    }
    return AssetStreamingManager.instance;
  }

  public static resetInstance(): void {
    if (AssetStreamingManager.instance) {
      AssetStreamingManager.instance.dispose();
      AssetStreamingManager.instance = null;
    }
  }

  public updateCDNConfig(newConfig: Partial<CDNConfig>): void {
    this.cdnConfig = { ...this.cdnConfig, ...newConfig };
  }

  public getCDNConfig(): CDNConfig {
    return { ...this.cdnConfig };
  }

  public registerAsset(descriptor: AssetDescriptor): void {
    this.registeredAssets.set(descriptor.id, descriptor);
  }

  public getRegisteredAsset(assetId: string): AssetDescriptor | undefined {
    return this.registeredAssets.get(assetId);
  }

  /**
   * Validates and resolves asset URL against CDN base, version, and security whitelist.
   */
  public resolveAssetUrl(url: string, version?: string): string {
    if (!url) return '';

    // 1. Security Check: Block unsafe schemes and path traversals
    if (
      url.startsWith('javascript:') ||
      url.startsWith('vbscript:') ||
      url.includes('..') ||
      url.includes('<script')
    ) {
      throw new Error(`Security Violation: Unsafe asset URL rejected: ${url}`);
    }

    // If already absolute URL, validate origin
    if (url.startsWith('http://') || url.startsWith('https://')) {
      this.validateOrigin(url);
      return url;
    }

    // If mock or local blob/data URL, return as-is
    if (url.startsWith('mock://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }

    // 2. Format with CDN Base URL and versioning
    const baseUrl = this.cdnConfig.cdnBaseUrl.trim();
    const ver = version || this.cdnConfig.version;
    const cleanPath = url.startsWith('/') ? url : `/${url}`;

    if (baseUrl) {
      const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      if (this.cdnConfig.enableImmutableCaching) {
        return `${cleanBase}/v${ver}${cleanPath}`;
      }
      return `${cleanBase}${cleanPath}?v=${ver}`;
    }

    // Default to local relative path with version query
    return `${cleanPath}?v=${ver}`;
  }

  public validateOrigin(url: string): boolean {
    try {
      const parsed = new URL(url);
      const origin = parsed.origin;

      if (this.cdnConfig.allowedOrigins.includes('self') && typeof window !== 'undefined') {
        if (origin === window.location.origin) return true;
      }

      const isAllowed = this.cdnConfig.allowedOrigins.some((allowed) => {
        if (allowed === 'self') return false;
        return origin === allowed || parsed.hostname.endsWith(allowed.replace('https://', ''));
      });

      if (!isAllowed) {
        throw new Error(`CORS Security Violation: Origin "${origin}" is not in allowed CDN whitelist`);
      }
      return true;
    } catch (err: any) {
      if (err.message.includes('CORS Security Violation')) throw err;
      // Not a valid URL structure
      return false;
    }
  }

  /**
   * Stream asset with progressive placeholder, priority scheduling, and caching.
   */
  public async loadAsset<T = any>(
    assetIdOrDescriptor: string | AssetDescriptor,
    onProgress?: (progress: AssetLoadProgress) => void
  ): Promise<ProgressiveLoadResult<T>> {
    const descriptor: AssetDescriptor =
      typeof assetIdOrDescriptor === 'string'
        ? this.registeredAssets.get(assetIdOrDescriptor) || {
            id: assetIdOrDescriptor,
            url: assetIdOrDescriptor,
            type: 'MODEL_GLTF',
            priority: 'HIGH',
          }
        : assetIdOrDescriptor;

    const tracer = DistributedTracingEngine.getInstance();
    const span = tracer.startSpan({
      name: `AssetStreaming:loadAsset:${descriptor.id}`,
      service: 'AssetStreamingManager',
      attributes: {
        'asset.id': descriptor.id,
        'asset.type': descriptor.type,
        'asset.priority': descriptor.priority,
      },
    });

    const startTime = performance.now();
    const qualityTier = this.qualityManager.getCurrentTier();
    const cacheKey = this.cacheManager.generateKey(descriptor.id, qualityTier, descriptor.version || this.cdnConfig.version);

    // 1. Check LRU Cache
    const cachedData = this.cacheManager.get<T>(cacheKey);
    if (cachedData !== null && cachedData !== undefined) {
      const duration = performance.now() - startTime;
      this.monitor.recordSuccess({
        assetId: descriptor.id,
        bytes: descriptor.sizeBytes || 0,
        durationMs: duration,
        isCached: true,
        isFallback: false,
      });

      tracer.endSpan(span.spanId, { statusCode: 'OK' });
      return {
        assetId: descriptor.id,
        data: cachedData,
        isFallback: false,
        isCached: true,
        loadDurationMs: duration,
        qualityTier,
        resolvedUrl: descriptor.url,
      };
    }

    // 2. Select Quality Variant URL
    let targetUrl = descriptor.url;
    if (descriptor.qualityVariants && descriptor.qualityVariants[qualityTier]) {
      targetUrl = descriptor.qualityVariants[qualityTier]!;
    }
    const resolvedUrl = this.resolveAssetUrl(targetUrl, descriptor.version);

    this.monitor.recordRequest(descriptor.id, descriptor.sizeBytes || 0);

    // 3. Schedule via Priority Scheduler
    const { promise } = this.scheduler.schedule({
      assetId: descriptor.id,
      priority: descriptor.priority,
      execute: async (signal) => {
        return this.progressiveLoader.loadWithRetryAndTimeout(
          descriptor.id,
          async (execSignal, progCb) => {
            return this.dispatchLoader(descriptor, resolvedUrl, execSignal, progCb);
          },
          onProgress
        );
      },
    });

    try {
      const rawResult = await promise;
      const duration = performance.now() - startTime;

      // Cache the loaded result
      this.cacheManager.set({
        key: cacheKey,
        assetId: descriptor.id,
        type: descriptor.type,
        data: rawResult.data,
        sizeBytes: descriptor.sizeBytes,
        priority: descriptor.priority,
        isCritical: descriptor.priority === 'CRITICAL' || descriptor.isCriticalForWebXR,
        qualityTier,
      });

      this.monitor.recordSuccess({
        assetId: descriptor.id,
        bytes: descriptor.sizeBytes || 1024,
        durationMs: duration,
        isCached: false,
        isFallback: rawResult.isFallback,
      });

      this.monitor.updateTiers(qualityTier, this.networkDetector.getCapabilities().tier);
      tracer.endSpan(span.spanId, { statusCode: 'OK' });

      return {
        assetId: descriptor.id,
        data: rawResult.data,
        isFallback: rawResult.isFallback,
        isCached: false,
        loadDurationMs: duration,
        qualityTier,
        resolvedUrl,
      };
    } catch (err: any) {
      tracer.endSpan(span.spanId, { statusCode: 'ERROR', statusMessage: err?.message });
      throw err;
    }
  }

  private async dispatchLoader(
    descriptor: AssetDescriptor,
    resolvedUrl: string,
    signal: AbortSignal,
    onProgress?: (progress: AssetLoadProgress) => void
  ): Promise<{ data: any; isFallback: boolean }> {
    // 1. 3D Model glTF / Draco
    if (descriptor.type === 'MODEL_GLTF' || descriptor.type === 'MODEL_DRACO') {
      const res = await this.dracoLoader.loadModel({
        url: resolvedUrl,
        fallbackUrl: descriptor.fallbackUrl,
        proceduralFallback: descriptor.generateProceduralFallback as any,
        signal,
      });
      return { data: res.scene, isFallback: res.isFallback };
    }

    // 2. Texture KTX2 / Image
    if (descriptor.type === 'TEXTURE_KTX2' || descriptor.type === 'TEXTURE_IMAGE') {
      const res = await this.ktx2Loader.loadTexture({
        url: resolvedUrl,
        fallbackUrl: descriptor.fallbackUrl,
        proceduralFallback: descriptor.generateProceduralFallback as any,
        signal,
      });
      return { data: res.texture, isFallback: res.isFallback };
    }

    // 3. Procedural / Geometry fallback
    if (descriptor.generateProceduralFallback) {
      const fallback = descriptor.generateProceduralFallback();
      return { data: fallback, isFallback: true };
    }

    // Generic placeholder
    const defaultPlaceholder = this.progressiveLoader.createPlaceholder(descriptor);
    return { data: defaultPlaceholder, isFallback: true };
  }

  /**
   * Pre-fetches low and medium priority assets in the background during idle periods.
   */
  public prefetchAssets(descriptors: AssetDescriptor[]): void {
    for (const d of descriptors) {
      this.registerAsset(d);
      const priority = d.priority === 'CRITICAL' ? 'HIGH' : d.priority;
      this.loadAsset({ ...d, priority }).catch((err) => {
        // Non-fatal background prefetch error
        console.debug(`Prefetch skipped or delayed for ${d.id}`, err);
      });
    }
  }

  public unloadAsset(assetId: string): boolean {
    const keyPrefix = `${assetId}::`;
    let deleted = false;
    const stats = this.cacheManager.getStats();

    // Invalidate across quality variants
    const tiers: AssetQualityTier[] = ['ULTRA_LOW', 'LOW', 'MEDIUM', 'HIGH', 'ULTRA'];
    for (const tier of tiers) {
      const key = this.cacheManager.generateKey(assetId, tier, this.cdnConfig.version);
      if (this.cacheManager.delete(key)) {
        deleted = true;
      }
    }
    return deleted;
  }

  public dispose(): void {
    this.scheduler.cancelAll();
    this.cacheManager.clear();
    this.dracoLoader.dispose();
    this.ktx2Loader.dispose();
    this.registeredAssets.clear();
  }
}

export const assetStreamingManager = AssetStreamingManager.getInstance();
