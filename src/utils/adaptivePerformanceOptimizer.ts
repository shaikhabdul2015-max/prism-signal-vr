/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 19: Adaptive Performance Optimizer for Meta Quest WebXR.
 * Manages Dynamic Resolution Scaling (DRS), shader/shadow fidelity profiles,
 * and cadence pacing to preserve target 72/90/120 Hz refresh rates.
 */

import {
  PerformanceProfileLevel,
  AdaptivePerformanceConfig,
  AdaptivePerformanceState,
  PerformanceAdaptationEvent,
} from '../types/phase19';

export const PROFILE_CONFIGS: Record<PerformanceProfileLevel, Omit<AdaptivePerformanceConfig, 'profile' | 'targetFps' | 'cadenceToleranceMs' | 'autoOptimizationEnabled'>> = {
  Ultra: {
    renderScale: 1.0,
    shadowQuality: 'high',
    particleDensity: 1.0,
    skeletonSmoothingWeight: 0.85,
  },
  High: {
    renderScale: 0.95,
    shadowQuality: 'high',
    particleDensity: 0.85,
    skeletonSmoothingWeight: 0.75,
  },
  Balanced: {
    renderScale: 0.85,
    shadowQuality: 'low',
    particleDensity: 0.70,
    skeletonSmoothingWeight: 0.65,
  },
  Performance: {
    renderScale: 0.75,
    shadowQuality: 'off',
    particleDensity: 0.40,
    skeletonSmoothingWeight: 0.50,
  },
  PowerSaver: {
    renderScale: 0.60,
    shadowQuality: 'off',
    particleDensity: 0.20,
    skeletonSmoothingWeight: 0.35,
  },
};

export class AdaptivePerformanceOptimizer {
  private static instance: AdaptivePerformanceOptimizer | null = null;
  private state: AdaptivePerformanceState;
  private consecutiveLowFpsTicks = 0;
  private consecutiveHighFpsTicks = 0;
  private lastAdaptationTimestamp = 0;
  private listeners: Set<(state: AdaptivePerformanceState) => void> = new Set();

  private constructor() {
    this.state = {
      config: {
        profile: 'Balanced',
        targetFps: 72,
        cadenceToleranceMs: 2.5,
        autoOptimizationEnabled: true,
        ...PROFILE_CONFIGS.Balanced,
      },
      currentFps: 72,
      recentAdaptations: [],
      throttlingActive: false,
      cooldownRemainingMs: 0,
    };
  }

  public static getInstance(): AdaptivePerformanceOptimizer {
    if (!AdaptivePerformanceOptimizer.instance) {
      AdaptivePerformanceOptimizer.instance = new AdaptivePerformanceOptimizer();
    }
    return AdaptivePerformanceOptimizer.instance;
  }

  public getState(): AdaptivePerformanceState {
    return {
      ...this.state,
      config: { ...this.state.config },
      recentAdaptations: [...this.state.recentAdaptations],
    };
  }

  public subscribe(callback: (state: AdaptivePerformanceState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const currentState = this.getState();
    this.listeners.forEach((cb) => {
      try {
        cb(currentState);
      } catch (err) {
        console.error('[AdaptivePerformanceOptimizer] Listener error:', err);
      }
    });
  }

  /**
   * Updates real-time FPS and performs cadence checks.
   */
  public reportCadence(fps: number): void {
    this.state.currentFps = fps;
    const now = Date.now();
    const target = this.state.config.targetFps;

    // Respect 3-second adaptation cooldown to prevent rapid oscillating thrash
    const cooldownPeriodMs = 3000;
    const elapsedSinceLastAdapt = now - this.lastAdaptationTimestamp;
    this.state.cooldownRemainingMs = Math.max(0, cooldownPeriodMs - elapsedSinceLastAdapt);

    if (!this.state.config.autoOptimizationEnabled) {
      this.notify();
      return;
    }

    if (elapsedSinceLastAdapt < cooldownPeriodMs) {
      this.notify();
      return;
    }

    // Drop threshold: FPS < target - 5 (e.g. < 67 for 72 Hz)
    if (fps < target - 5) {
      this.consecutiveLowFpsTicks++;
      this.consecutiveHighFpsTicks = 0;

      if (this.consecutiveLowFpsTicks >= 3) {
        this.stepDownQuality(`Sustained frame rate drop to ${fps.toFixed(1)} FPS below target ${target} FPS.`);
        this.consecutiveLowFpsTicks = 0;
      }
    } else if (fps >= target - 1) {
      // Recovery threshold: FPS solid near target
      this.consecutiveHighFpsTicks++;
      this.consecutiveLowFpsTicks = 0;

      if (this.consecutiveHighFpsTicks >= 10 && this.state.throttlingActive) {
        this.stepUpQuality(`Sustained high frame rate at ${fps.toFixed(1)} FPS; restoring headroom.`);
        this.consecutiveHighFpsTicks = 0;
      }
    } else {
      this.consecutiveLowFpsTicks = 0;
      this.consecutiveHighFpsTicks = 0;
    }

    this.notify();
  }

  /**
   * Steps down performance profile or render scale.
   */
  public stepDownQuality(reason: string): void {
    const currentProfile = this.state.config.profile;
    const profileOrder: PerformanceProfileLevel[] = ['Ultra', 'High', 'Balanced', 'Performance', 'PowerSaver'];
    const currentIndex = profileOrder.indexOf(currentProfile);

    if (currentIndex < profileOrder.length - 1) {
      const newProfile = profileOrder[currentIndex + 1];
      this.applyProfile(newProfile, 'cadence_drop', reason);
    } else if (this.state.config.renderScale > 0.50) {
      // Already at PowerSaver, decrease scale incrementally
      const prevScale = this.state.config.renderScale;
      const newScale = Math.max(0.50, Math.round((prevScale - 0.1) * 100) / 100);
      this.state.config.renderScale = newScale;
      this.state.throttlingActive = true;
      this.lastAdaptationTimestamp = Date.now();

      this.recordAdaptationEvent({
        id: `adapt-${Date.now()}`,
        timestamp: new Date().toISOString(),
        trigger: 'cadence_drop',
        previousProfile: currentProfile,
        newProfile: currentProfile,
        previousRenderScale: prevScale,
        newRenderScale: newScale,
        fpsAtTrigger: this.state.currentFps,
        targetFps: this.state.config.targetFps,
        reason,
      });
    }
  }

  /**
   * Steps up quality profile when frame pacing is healthy.
   */
  public stepUpQuality(reason: string): void {
    const currentProfile = this.state.config.profile;
    const profileOrder: PerformanceProfileLevel[] = ['PowerSaver', 'Performance', 'Balanced', 'High', 'Ultra'];
    const currentIndex = profileOrder.indexOf(currentProfile);

    if (currentIndex < profileOrder.length - 1) {
      const newProfile = profileOrder[currentIndex + 1];
      this.applyProfile(newProfile, 'cadence_recovery', reason);
    } else {
      this.state.throttlingActive = false;
    }
  }

  /**
   * Sets profile explicitly (supports manual overrides).
   */
  public setProfile(profile: PerformanceProfileLevel, isManual: boolean = true): void {
    const trigger = isManual ? 'manual_override' : 'cadence_drop';
    const reason = isManual ? `Operator manually set profile to ${profile}` : 'Automatic cadence adjustment';
    this.applyProfile(profile, trigger, reason);
  }

  public setAutoOptimization(enabled: boolean): void {
    this.state.config.autoOptimizationEnabled = enabled;
    this.notify();
  }

  public setTargetFps(target: 72 | 90 | 120): void {
    this.state.config.targetFps = target;
    this.notify();
  }

  private applyProfile(
    newProfile: PerformanceProfileLevel,
    trigger: PerformanceAdaptationEvent['trigger'],
    reason: string
  ): void {
    const prevProfile = this.state.config.profile;
    const prevScale = this.state.config.renderScale;
    const newConfig = PROFILE_CONFIGS[newProfile];

    this.state.config = {
      ...this.state.config,
      profile: newProfile,
      ...newConfig,
    };

    this.state.throttlingActive = newProfile === 'Performance' || newProfile === 'PowerSaver';
    this.lastAdaptationTimestamp = Date.now();

    this.recordAdaptationEvent({
      id: `adapt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      trigger,
      previousProfile: prevProfile,
      newProfile,
      previousRenderScale: prevScale,
      newRenderScale: newConfig.renderScale,
      fpsAtTrigger: this.state.currentFps,
      targetFps: this.state.config.targetFps,
      reason,
    });

    this.notify();
  }

  private recordAdaptationEvent(event: PerformanceAdaptationEvent): void {
    this.state.recentAdaptations.unshift(event);
    if (this.state.recentAdaptations.length > 25) {
      this.state.recentAdaptations.pop();
    }
  }
}

export const adaptiveOptimizer = AdaptivePerformanceOptimizer.getInstance();
