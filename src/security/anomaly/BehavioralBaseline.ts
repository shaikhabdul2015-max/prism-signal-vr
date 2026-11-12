/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Behavioral Baseline Engine
 * Computes online statistical baselines (mean, variance, standard deviation)
 * using Welford's algorithm for incremental updates.
 */

import { MetricBaseline, UserBehavioralProfile } from './AnomalyTypes';

export class BehavioralBaselineManager {
  private static instance: BehavioralBaselineManager | null = null;
  private profiles: Map<string, UserBehavioralProfile> = new Map();

  private constructor() {}

  public static getInstance(): BehavioralBaselineManager {
    if (!BehavioralBaselineManager.instance) {
      BehavioralBaselineManager.instance = new BehavioralBaselineManager();
    }
    return BehavioralBaselineManager.instance;
  }

  public static resetInstance(): void {
    if (BehavioralBaselineManager.instance) {
      BehavioralBaselineManager.instance.profiles.clear();
    }
    BehavioralBaselineManager.instance = null;
  }

  /**
   * Initializes or fetches an existing profile for an identity.
   */
  public getOrCreateProfile(identityKey: string): UserBehavioralProfile {
    let profile = this.profiles.get(identityKey);
    if (!profile) {
      profile = {
        identityKey,
        requestRateBaseline: this.createEmptyBaseline('request_rate_per_min'),
        errorRateBaseline: this.createEmptyBaseline('error_rate_percentage'),
        commonEndpoints: new Map(),
        activeHoursBitmask: 0,
        lastSeenTimestamp: Date.now(),
      };
      this.profiles.set(identityKey, profile);
    }
    return profile;
  }

  /**
   * Incremental Welford update for online mean and sample variance.
   */
  public updateBaseline(baseline: MetricBaseline, newValue: number): void {
    baseline.count += 1;
    const delta = newValue - baseline.mean;
    baseline.mean += delta / baseline.count;
    const delta2 = newValue - baseline.mean;
    baseline.variance += delta * delta2;
    baseline.standardDeviation = baseline.count > 1 ? Math.sqrt(baseline.variance / (baseline.count - 1)) : 0;
    baseline.lastUpdated = new Date().toISOString();
  }

  /**
   * Records observed user activity to evolve the behavioral baseline.
   */
  public recordObservation(
    identityKey: string,
    observation: {
      requestRatePerMinute: number;
      errorRatePercentage: number;
      endpoint?: string;
      hourOfDay?: number;
    }
  ): void {
    const profile = this.getOrCreateProfile(identityKey);
    profile.lastSeenTimestamp = Date.now();

    this.updateBaseline(profile.requestRateBaseline, observation.requestRatePerMinute);
    this.updateBaseline(profile.errorRateBaseline, observation.errorRatePercentage);

    if (observation.endpoint) {
      const count = profile.commonEndpoints.get(observation.endpoint) || 0;
      profile.commonEndpoints.set(observation.endpoint, count + 1);
    }

    if (observation.hourOfDay !== undefined && observation.hourOfDay >= 0 && observation.hourOfDay < 24) {
      profile.activeHoursBitmask |= (1 << observation.hourOfDay);
    }
  }

  public getProfile(identityKey: string): UserBehavioralProfile | undefined {
    return this.profiles.get(identityKey);
  }

  private createEmptyBaseline(metricName: string): MetricBaseline {
    return {
      metricName,
      count: 0,
      mean: 0,
      variance: 0,
      standardDeviation: 0,
      lastUpdated: new Date().toISOString(),
    };
  }
}
