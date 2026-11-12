/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Adaptive Quality Manager (Stage 5.1)
 * Dynamically computes optimal asset quality tier (ULTRA_LOW -> ULTRA)
 * based on network bandwidth, rendering frame rate, GPU capabilities,
 * device tier, and memory pressure.
 * 
 * Guarantees:
 * - Never compromises WebXR session stability (drops tier during frame budget overruns).
 * - Detects software WebGL and constrains tier to LOW/MEDIUM to preserve 60-90 FPS.
 * - Throttles quality tier during poor network conditions (2G/3G) to prevent queue backpressure.
 */

import { AssetQualityTier, NetworkTier } from '../types/assetStreaming';
import { NetworkPerformanceDetector } from './NetworkPerformanceDetector';
import { UIFrameBudgetMonitor } from '../engines/UIFrameBudgetMonitor';

export interface QualityManagerOptions {
  forceTier?: AssetQualityTier | null;
  targetVRFps?: number; // Default 90
  minDownscaleFps?: number; // Below 75 FPS in VR -> downscale
}

export class AdaptiveQualityManager {
  private static instance: AdaptiveQualityManager | null = null;
  private currentTier: AssetQualityTier = 'HIGH';
  private forcedTier: AssetQualityTier | null = null;
  private isSoftwareGl = false;
  private isMobile = false;
  private listeners: Set<(tier: AssetQualityTier) => void> = new Set();

  private constructor(options?: QualityManagerOptions) {
    this.forcedTier = options?.forceTier || null;
    this.detectHardwareBaseline();
    this.recomputeQualityTier();
  }

  public static getInstance(options?: QualityManagerOptions): AdaptiveQualityManager {
    if (!AdaptiveQualityManager.instance) {
      AdaptiveQualityManager.instance = new AdaptiveQualityManager(options);
    }
    return AdaptiveQualityManager.instance;
  }

  public static resetInstance(): void {
    if (AdaptiveQualityManager.instance) {
      AdaptiveQualityManager.instance.listeners.clear();
      AdaptiveQualityManager.instance = null;
    }
  }

  private detectHardwareBaseline(): void {
    if (typeof window === 'undefined') return;

    // Detect mobile device
    this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

    // Detect software WebGL renderer
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) {
        this.isSoftwareGl = true;
      } else {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        this.isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      }
    } catch {
      this.isSoftwareGl = false;
    }
  }

  public evaluateQualityTier(params?: {
    networkTier?: NetworkTier;
    currentFps?: number;
    isVRActive?: boolean;
    memoryPressureRatio?: number;
  }): AssetQualityTier {
    if (this.forcedTier) {
      return this.forcedTier;
    }

    const netDetector = NetworkPerformanceDetector.getInstance();
    const netTier = params?.networkTier || netDetector.getCapabilities().tier;
    const currentFps = params?.currentFps ?? this.queryCurrentFps();
    const isVR = params?.isVRActive ?? false;
    const memoryPressure = params?.memoryPressureRatio ?? 0;

    // 1. Extreme constraints: Offline or severe network
    if (netTier === 'OFFLINE' || netTier === 'SLOW_2G') {
      return 'ULTRA_LOW';
    }

    // 2. High memory pressure (>85% heap or cache capacity)
    if (memoryPressure > 0.85) {
      return 'LOW';
    }

    // 3. Software WebGL: Limit to LOW or ULTRA_LOW to avoid frame drops
    if (this.isSoftwareGl) {
      if (netTier === '2G' || currentFps < 30) return 'ULTRA_LOW';
      return 'LOW';
    }

    // 4. WebXR Active Frame Rate Safeguards
    if (isVR) {
      // In VR, frame rate drops below 75 FPS cause severe motion discomfort
      if (currentFps < 65) return 'ULTRA_LOW';
      if (currentFps < 80) return 'LOW';
      if (currentFps < 88) return 'MEDIUM';
      if (netTier === 'HIGH_SPEED' || netTier === '5G') return 'HIGH';
      return 'MEDIUM';
    }

    // 5. Standard 2D Display Quality Resolution
    if (netTier === '2G') return 'LOW';
    if (netTier === '3G') return this.isMobile ? 'LOW' : 'MEDIUM';
    if (netTier === '4G') {
      if (currentFps < 45) return 'MEDIUM';
      return this.isMobile ? 'MEDIUM' : 'HIGH';
    }

    // 6. High Speed / 5G
    if (currentFps >= 55) {
      return this.isMobile ? 'HIGH' : 'ULTRA';
    }
    return 'HIGH';
  }

  private queryCurrentFps(): number {
    try {
      const monitor = UIFrameBudgetMonitor.getInstance();
      return monitor.getMetrics().currentFps || 60;
    } catch {
      return 60;
    }
  }

  public recomputeQualityTier(): AssetQualityTier {
    const newTier = this.evaluateQualityTier();
    if (newTier !== this.currentTier) {
      this.currentTier = newTier;
      this.listeners.forEach((fn) => fn(this.currentTier));
    }
    return this.currentTier;
  }

  public getCurrentTier(): AssetQualityTier {
    return this.currentTier;
  }

  public setForcedTier(tier: AssetQualityTier | null): void {
    this.forcedTier = tier;
    this.recomputeQualityTier();
  }

  public subscribe(listener: (tier: AssetQualityTier) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const adaptiveQualityManager = AdaptiveQualityManager.getInstance();
