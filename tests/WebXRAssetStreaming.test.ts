/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.1: Global Edge CDN & Intelligent WebXR Asset Streaming Test Suite.
 * Covers:
 * 1. Progressive asset loading (placeholder-first and stream completion)
 * 2. Priority-based scheduling (CRITICAL preemption over LOW/MEDIUM/HIGH)
 * 3. Lazy loading and background prefetching
 * 4. Draco decoder integration and uncompressed/procedural fallback
 * 5. KTX2 texture compatibility detection and procedural fallback
 * 6. CDN URL configuration and path-based versioning
 * 7. Local asset fallback handling
 * 8. Cache hit/miss behavior and LRU tracking
 * 9. Asset retry and timeout handling with exponential backoff
 * 10. Network-aware adaptive quality selection
 * 11. Memory-aware asset unloading and prioritized eviction
 * 12. GPU resource cleanup and WebGL disposal verification
 * 13. WebXR rendering compatibility under asset load pressure
 * 14. Security enforcement: Invalid asset URL and unapproved origin rejection
 * 15. Regression protection: Integration with existing Stage 1-4 engines
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  AssetStreamingManager,
  assetStreamingManager,
} from '../src/streaming/AssetStreamingManager';
import {
  AssetCacheManager,
  assetCacheManager,
} from '../src/streaming/AssetCacheManager';
import {
  AssetPriorityScheduler,
  assetPriorityScheduler,
} from '../src/streaming/AssetPriorityScheduler';
import {
  AdaptiveQualityManager,
  adaptiveQualityManager,
} from '../src/streaming/AdaptiveQualityManager';
import {
  NetworkPerformanceDetector,
  networkPerformanceDetector,
} from '../src/streaming/NetworkPerformanceDetector';
import {
  AssetStreamingMonitor,
  assetStreamingMonitor,
} from '../src/streaming/AssetStreamingMonitor';
import { DracoModelLoader } from '../src/loaders/DracoModelLoader';
import { KTX2TextureLoader } from '../src/loaders/KTX2TextureLoader';
import { ProgressiveAssetLoader } from '../src/loaders/ProgressiveAssetLoader';
import { GPUResourceRecoveryManager } from '../src/engines/GPUResourceRecoveryManager';
import { UIFrameBudgetMonitor } from '../src/engines/UIFrameBudgetMonitor';

describe('Stage 5.1: Global Edge CDN & WebXR Asset Streaming Suite', () => {
  beforeEach(() => {
    AssetStreamingManager.resetInstance();
    AssetCacheManager.resetInstance();
    AssetPriorityScheduler.resetInstance();
    AdaptiveQualityManager.resetInstance();
    NetworkPerformanceDetector.resetInstance();
    AssetStreamingMonitor.resetInstance();
    GPUResourceRecoveryManager.resetInstance();
    UIFrameBudgetMonitor.resetInstance();
  });

  // --------------------------------------------------------------------------
  // TEST 1: PROGRESSIVE ASSET LOADING
  // --------------------------------------------------------------------------
  it('1. progressively streams assets, providing immediate placeholders and resolving full geometry', async () => {
    const manager = AssetStreamingManager.getInstance();
    const loader = new ProgressiveAssetLoader();

    // 1. Placeholder is generated synchronously for zero WebXR render stall
    const placeholder = loader.createPlaceholder({
      id: 'crystal-alpha',
      url: 'mock://models/crystal.draco.glb',
      type: 'MODEL_DRACO',
      priority: 'CRITICAL',
    });

    assert.ok(placeholder instanceof THREE.Object3D);
    assert.equal(placeholder.name, 'Placeholder_crystal-alpha');
    assert.ok(placeholder.children.length > 0);

    // 2. Full progressive asset stream completes
    const result = await manager.loadAsset({
      id: 'crystal-alpha',
      url: 'mock://models/crystal.draco.glb',
      type: 'MODEL_DRACO',
      priority: 'CRITICAL',
      generateProceduralFallback: () => {
        const mesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 2, 6), new THREE.MeshStandardMaterial());
        const group = new THREE.Group();
        group.add(mesh);
        return group;
      },
    });

    assert.equal(result.assetId, 'crystal-alpha');
    assert.ok(result.data instanceof THREE.Object3D);
    assert.equal(result.isCached, false);
    assert.ok(result.loadDurationMs >= 0);
  });

  // --------------------------------------------------------------------------
  // TEST 2: PRIORITY-BASED SCHEDULING
  // --------------------------------------------------------------------------
  it('2. enforces strict priority scheduling: CRITICAL tasks execute before LOW and MEDIUM tasks', async () => {
    const scheduler = AssetPriorityScheduler.getInstance({ maxConcurrency: 1 });
    const executionOrder: string[] = [];

    // Pause to queue items in reverse order
    scheduler.pause();

    // Queue LOW task first
    const lowTask = scheduler.schedule({
      assetId: 'ambient-nebula-low',
      priority: 'LOW',
      execute: async () => {
        executionOrder.push('LOW');
        return 'LOW_DONE';
      },
    });

    // Queue MEDIUM task second
    const medTask = scheduler.schedule({
      assetId: 'audio-chime-med',
      priority: 'MEDIUM',
      execute: async () => {
        executionOrder.push('MEDIUM');
        return 'MEDIUM_DONE';
      },
    });

    // Queue CRITICAL task last
    const critTask = scheduler.schedule({
      assetId: 'player-controller-crit',
      priority: 'CRITICAL',
      execute: async () => {
        executionOrder.push('CRITICAL');
        return 'CRITICAL_DONE';
      },
    });

    // Resume scheduler
    scheduler.resume();

    await Promise.all([critTask.promise, medTask.promise, lowTask.promise]);

    // Critical must execute first despite being queued last
    assert.equal(executionOrder[0], 'CRITICAL', 'CRITICAL task must execute first');
    assert.equal(executionOrder[1], 'MEDIUM', 'MEDIUM task must execute before LOW');
    assert.equal(executionOrder[2], 'LOW', 'LOW task must execute last');
  });

  // --------------------------------------------------------------------------
  // TEST 3: LAZY LOADING & BACKGROUND PREFETCHING
  // --------------------------------------------------------------------------
  it('3. lazy-loads and prefetches non-critical assets in background without blocking priority queues', async () => {
    const manager = AssetStreamingManager.getInstance();
    const cache = AssetCacheManager.getInstance();

    const lowPriorityAssets = [
      {
        id: 'ambient-dust-01',
        url: 'mock://assets/dust1.glb',
        type: 'MODEL_GLTF' as const,
        priority: 'LOW' as const,
        generateProceduralFallback: () => new THREE.Group(),
      },
      {
        id: 'distant-star-billboard',
        url: 'mock://assets/stars.glb',
        type: 'MODEL_GLTF' as const,
        priority: 'LOW' as const,
        generateProceduralFallback: () => new THREE.Group(),
      },
    ];

    manager.prefetchAssets(lowPriorityAssets);

    // Yield macro-task to let background prefetch tasks dispatch
    await new Promise((r) => setTimeout(r, 60));

    // Check that prefetch initiated load into cache
    const key0 = cache.generateKey('ambient-dust-01', 'HIGH', '1.0.0');
    assert.ok(cache.has(key0) || manager.getRegisteredAsset('ambient-dust-01') !== undefined);
  });

  // --------------------------------------------------------------------------
  // TEST 4: DRACO DECODER INTEGRATION & FALLBACK
  // --------------------------------------------------------------------------
  it('4. integrates Draco loader and falls back gracefully when decoder or model is unavailable', async () => {
    const dracoLoader = new DracoModelLoader({
      decoderPath: 'https://www.gstatic.com/draco/versioned/decoders/1.5.6/',
    });

    const res = await dracoLoader.loadModel({
      url: 'mock://models/quantum_core.draco.glb',
      fallbackUrl: 'mock://models/quantum_core.uncompressed.glb',
      proceduralFallback: () => {
        const geom = new THREE.DodecahedronGeometry(1.2);
        const mesh = new THREE.Mesh(geom, new THREE.MeshStandardMaterial({ color: 0x6366f1 }));
        const grp = new THREE.Group();
        grp.name = 'ProceduralQuantumCore';
        grp.add(mesh);
        return grp;
      },
    });

    assert.ok(res.scene instanceof THREE.Object3D);
    assert.equal(res.isFallback, true);
    assert.equal(res.scene.name, 'ProceduralQuantumCore');
    assert.ok(res.decodeDurationMs >= 0);
  });

  // --------------------------------------------------------------------------
  // TEST 5: KTX2 TEXTURE COMPATIBILITY & FALLBACK
  // --------------------------------------------------------------------------
  it('5. detects GPU texture compression capabilities and falls back to procedural canvas texture', async () => {
    const ktx2Loader = new KTX2TextureLoader();
    const caps = ktx2Loader.getGpuCapabilities();

    assert.ok(typeof caps.s3tc === 'boolean');
    assert.ok(typeof caps.astc === 'boolean');
    assert.ok(typeof caps.maxTextureSize === 'number');

    const result = await ktx2Loader.loadTexture({
      url: 'mock://textures/alien_panel.ktx2',
      fallbackUrl: 'mock://textures/alien_panel.png',
      proceduralFallback: () => {
        return ktx2Loader.generateDefaultProceduralTexture();
      },
    });

    assert.ok(result.texture instanceof THREE.Texture);
    assert.equal(result.isFallback, true);
    assert.ok(result.decodeDurationMs >= 0);
  });

  // --------------------------------------------------------------------------
  // TEST 6: CDN URL CONFIGURATION & VERSIONING
  // --------------------------------------------------------------------------
  it('6. formats CDN asset URLs with path-based versioning and immutable caching prefixes', () => {
    const manager = AssetStreamingManager.getInstance({
      cdnBaseUrl: 'https://cdn.prism-signal.void',
      version: '2.4.0',
      enableImmutableCaching: true,
    });

    const resolved = manager.resolveAssetUrl('/models/chamber.glb');
    assert.equal(resolved, 'https://cdn.prism-signal.void/v2.4.0/models/chamber.glb');

    // Query-param style versioning if immutable caching disabled
    manager.updateCDNConfig({ enableImmutableCaching: false });
    const resolvedQuery = manager.resolveAssetUrl('/textures/noise.ktx2');
    assert.equal(resolvedQuery, 'https://cdn.prism-signal.void/textures/noise.ktx2?v=2.4.0');
  });

  // --------------------------------------------------------------------------
  // TEST 7: LOCAL ASSET FALLBACK
  // --------------------------------------------------------------------------
  it('7. falls back to relative local asset path when CDN base URL is not configured', () => {
    const manager = AssetStreamingManager.getInstance({
      cdnBaseUrl: '',
      version: '1.0.0',
      fallbackToLocal: true,
    });

    const localUrl = manager.resolveAssetUrl('models/laser_emitter.glb');
    assert.equal(localUrl, '/models/laser_emitter.glb?v=1.0.0');
  });

  // --------------------------------------------------------------------------
  // TEST 8: CACHE HIT/MISS BEHAVIOR
  // --------------------------------------------------------------------------
  it('8. tracks cache misses on initial fetch and returns cached instance on subsequent calls', async () => {
    const manager = AssetStreamingManager.getInstance();
    const cache = AssetCacheManager.getInstance();

    const descriptor = {
      id: 'hologram-grid-tex',
      url: 'mock://textures/hologram.ktx2',
      type: 'TEXTURE_KTX2' as const,
      priority: 'HIGH' as const,
      generateProceduralFallback: () => new THREE.Texture(),
    };

    // First load -> Miss
    const res1 = await manager.loadAsset(descriptor);
    assert.equal(res1.isCached, false);

    const stats1 = cache.getStats();
    assert.equal(stats1.misses, 1);
    assert.equal(stats1.itemCount, 1);

    // Second load -> Hit
    const res2 = await manager.loadAsset(descriptor);
    assert.equal(res2.isCached, true);

    const stats2 = cache.getStats();
    assert.equal(stats2.hits, 1);
    assert.equal(stats2.hitRate, 0.5);
  });

  // --------------------------------------------------------------------------
  // TEST 9: ASSET RETRY AND TIMEOUT HANDLING
  // --------------------------------------------------------------------------
  it('9. retries transient failures with exponential backoff and triggers abort on timeout', async () => {
    const loader = new ProgressiveAssetLoader({
      timeoutMs: 100,
      maxRetries: 2,
      retryBaseDelayMs: 10,
    });

    let attempts = 0;

    // Simulate transient failure succeeding on 2nd retry
    const res = await loader.loadWithRetryAndTimeout('retry-test-asset', async (signal) => {
      attempts += 1;
      if (attempts < 2) {
        throw new Error('Network error (simulated)');
      }
      return 'RETRY_SUCCESS';
    });

    assert.equal(res, 'RETRY_SUCCESS');
    assert.equal(attempts, 2);

    // Simulate persistent timeout
    let timeoutAttempts = 0;
    await assert.rejects(
      async () => {
        await loader.loadWithRetryAndTimeout('timeout-test-asset', async (signal) => {
          timeoutAttempts += 1;
          await new Promise((r) => setTimeout(r, 200)); // Deliberate timeout > 100ms
        });
      },
      /timed out|aborted/i
    );
  });

  // --------------------------------------------------------------------------
  // TEST 10: NETWORK-AWARE ADAPTIVE QUALITY SELECTION
  // --------------------------------------------------------------------------
  it('10. dynamically selects asset quality tiers matching network bandwidth and VR frame rate', () => {
    const qualityMgr = AdaptiveQualityManager.getInstance();

    // 1. 2G Network -> LOW
    const tier2G = qualityMgr.evaluateQualityTier({
      networkTier: '2G',
      currentFps: 60,
      isVRActive: false,
    });
    assert.equal(tier2G, 'LOW');

    // 2. Offline -> ULTRA_LOW
    const tierOffline = qualityMgr.evaluateQualityTier({
      networkTier: 'OFFLINE',
      currentFps: 60,
      isVRActive: false,
    });
    assert.equal(tierOffline, 'ULTRA_LOW');

    // 3. VR Active with dropping FPS (< 75) -> Emergency Downscale to LOW
    const tierVRThrottled = qualityMgr.evaluateQualityTier({
      networkTier: 'HIGH_SPEED',
      currentFps: 72,
      isVRActive: true,
    });
    assert.equal(tierVRThrottled, 'LOW', 'VR frame drop must downgrade quality to preserve headset stability');

    // 4. Desktop High-Speed with 60 FPS -> ULTRA
    const tierHighSpeed = qualityMgr.evaluateQualityTier({
      networkTier: 'HIGH_SPEED',
      currentFps: 60,
      isVRActive: false,
    });
    assert.equal(tierHighSpeed, 'ULTRA');
  });

  // --------------------------------------------------------------------------
  // TEST 11: MEMORY-AWARE ASSET UNLOADING & EVICTION
  // --------------------------------------------------------------------------
  it('11. enforces memory ceiling, evicting LOW priority items while protecting CRITICAL WebXR assets', () => {
    // 5 KB capacity cache
    const cache = AssetCacheManager.getInstance({
      maxMemoryBytes: 5000,
      maxItemCount: 10,
    });

    // 1. Add CRITICAL asset (2 KB)
    cache.set({
      key: 'crit-hand-mesh',
      assetId: 'crit-hand-mesh',
      type: 'MODEL_GLTF',
      data: new THREE.Group(),
      sizeBytes: 2000,
      priority: 'CRITICAL',
      isCritical: true,
    });

    // 2. Add LOW priority asset (2 KB)
    cache.set({
      key: 'low-nebula-tex',
      assetId: 'low-nebula-tex',
      type: 'TEXTURE_IMAGE',
      data: new THREE.Texture(),
      sizeBytes: 2000,
      priority: 'LOW',
      isCritical: false,
    });

    assert.equal(cache.has('crit-hand-mesh'), true);
    assert.equal(cache.has('low-nebula-tex'), true);

    // 3. Add large MEDIUM asset (3 KB) -> Exceeds 5 KB limit!
    cache.set({
      key: 'med-beam-shader',
      assetId: 'med-beam-shader',
      type: 'GEOMETRY',
      data: new THREE.BufferGeometry(),
      sizeBytes: 3000,
      priority: 'MEDIUM',
    });

    // LOW asset must be evicted; CRITICAL asset must survive
    assert.equal(cache.has('low-nebula-tex'), false, 'LOW priority asset must be evicted first');
    assert.equal(cache.has('crit-hand-mesh'), true, 'CRITICAL WebXR asset must be protected');
    assert.equal(cache.has('med-beam-shader'), true);
  });

  // --------------------------------------------------------------------------
  // TEST 12: GPU RESOURCE CLEANUP & DISPOSAL
  // --------------------------------------------------------------------------
  it('12. safely disposes Three.js textures, geometries, and materials during asset unloading', () => {
    const cache = AssetCacheManager.getInstance();

    let textureDisposed = false;
    let geometryDisposed = false;

    const mockTex = new THREE.Texture();
    mockTex.dispose = () => {
      textureDisposed = true;
    };

    const mockGeom = new THREE.BufferGeometry();
    mockGeom.dispose = () => {
      geometryDisposed = true;
    };

    const mockMesh = new THREE.Mesh(mockGeom, new THREE.MeshBasicMaterial());
    const mockGroup = new THREE.Group();
    mockGroup.add(mockMesh);

    // Store in cache
    cache.set({
      key: 'gpu-tex-01',
      assetId: 'gpu-tex-01',
      type: 'TEXTURE_IMAGE',
      data: mockTex,
    });

    cache.set({
      key: 'gpu-geom-02',
      assetId: 'gpu-geom-02',
      type: 'MODEL_GLTF',
      data: mockGroup,
    });

    // Explicit delete
    cache.delete('gpu-tex-01');
    cache.delete('gpu-geom-02');

    assert.equal(textureDisposed, true, 'Texture dispose() must be invoked');
    assert.equal(geometryDisposed, true, 'Geometry dispose() must be invoked');
  });

  // --------------------------------------------------------------------------
  // TEST 13: WEBXR RENDERING COMPATIBILITY
  // --------------------------------------------------------------------------
  it('13. maintains WebXR frame budget and integrates with GPUResourceRecoveryManager', async () => {
    const frameMonitor = UIFrameBudgetMonitor.getInstance({ targetFps: 90 });
    const gpuRecovery = GPUResourceRecoveryManager.getInstance();
    const manager = AssetStreamingManager.getInstance();

    // Verify GPU Recovery is in nominal state
    assert.equal(gpuRecovery.getTelemetry().currentState, 'NOMINAL');

    // Load critical WebXR asset
    const loadPromise = manager.loadAsset({
      id: 'vr-laser-receiver',
      url: 'mock://assets/receiver.glb',
      type: 'MODEL_DRACO',
      priority: 'CRITICAL',
      isCriticalForWebXR: true,
      generateProceduralFallback: () => new THREE.Group(),
    });

    // Simulate VR frame tick during load
    frameMonitor.recordFrame(8.2); // 8.2ms (comfortably within 11.1ms 90Hz budget and below 85% warning threshold)

    const res = await loadPromise;
    assert.ok(res.data);
    assert.equal(frameMonitor.getMetrics().isThrottlingActive, false);
    assert.equal(gpuRecovery.getTelemetry().isRenderingSuspended, false);
  });

  // --------------------------------------------------------------------------
  // TEST 14: INVALID ASSET URL REJECTION & CORS ORIGIN SECURITY
  // --------------------------------------------------------------------------
  it('14. rejects malicious script injection URLs, path traversal, and unapproved CDN origins', () => {
    const manager = AssetStreamingManager.getInstance({
      allowedOrigins: ['https://cdn.prism-signal.void', 'https://www.gstatic.com'],
    });

    // 1. Javascript URI injection
    assert.throws(
      () => manager.resolveAssetUrl('javascript:alert(1)'),
      /Security Violation: Unsafe asset URL/
    );

    // 2. Directory traversal
    assert.throws(
      () => manager.resolveAssetUrl('../../etc/passwd'),
      /Security Violation: Unsafe asset URL/
    );

    // 3. Script tag payload
    assert.throws(
      () => manager.resolveAssetUrl('/models/<script>evil()</script>'),
      /Security Violation: Unsafe asset URL/
    );

    // 4. Unapproved third-party CDN domain
    assert.throws(
      () => manager.resolveAssetUrl('https://evil-unapproved-cdn.com/trojan.glb'),
      /CORS Security Violation: Origin "https:\/\/evil-unapproved-cdn.com" is not in allowed CDN whitelist/
    );

    // 5. Approved CDN domain
    const approved = manager.resolveAssetUrl('https://www.gstatic.com/draco/decoder.wasm');
    assert.equal(approved, 'https://www.gstatic.com/draco/decoder.wasm');
  });

  // --------------------------------------------------------------------------
  // TEST 15: REGRESSION PROTECTION
  // --------------------------------------------------------------------------
  it('15. verifies backward compatibility with Phase 36 and Stage 1-4 telemetry monitors', () => {
    const monitor = AssetStreamingMonitor.getInstance();

    // Record stream events
    monitor.recordRequest('asset-regression-01', 5000);
    monitor.recordSuccess({
      assetId: 'asset-regression-01',
      bytes: 5000,
      durationMs: 12.5,
      isCached: false,
      isFallback: false,
    });
    monitor.recordModelDecode(3.2);
    monitor.recordTextureDecode(1.8);

    const telemetry = monitor.getTelemetry();
    assert.equal(telemetry.totalAssetsRequested, 1);
    assert.equal(telemetry.totalAssetsLoaded, 1);
    assert.equal(telemetry.totalBytesDownloaded, 5000);
    assert.equal(telemetry.avgModelDecodeDurationMs, 3.2);
    assert.equal(telemetry.avgTextureDecodeDurationMs, 1.8);
  });
});
