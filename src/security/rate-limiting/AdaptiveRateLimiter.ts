/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Adaptive Rate Limiter
 * Enforces per-IP and per-user rate limiting with dynamic penalty escalation.
 */

import { RateLimitPolicy, RateLimitTier } from './RateLimitPolicy';
import {
  IRateLimitStore,
  InMemoryRateLimitStore,
  DistributedRedisRateLimitStore,
} from './RateLimitStore';
import { ResponseExecutor } from '../response/ResponseExecutor';

export interface RateLimitCheckResult {
  allowed: boolean;
  tier: RateLimitTier;
  limit: number;
  remaining: number;
  resetMs: number;
  retryAfterSeconds?: number;
}

export class AdaptiveRateLimiter {
  private static instance: AdaptiveRateLimiter | null = null;
  private store: IRateLimitStore;
  private tierOverrides: Map<string, { tier: RateLimitTier; expiresAt: number }> = new Map();

  private constructor(store?: IRateLimitStore) {
    if (store) {
      this.store = store;
    } else if (typeof process !== 'undefined' && process.env.REDIS_HOST) {
      this.store = new DistributedRedisRateLimitStore();
    } else {
      this.store = new InMemoryRateLimitStore();
    }
  }

  public getStore(): IRateLimitStore {
    return this.store;
  }

  public static getInstance(store?: IRateLimitStore): AdaptiveRateLimiter {
    if (!AdaptiveRateLimiter.instance) {
      AdaptiveRateLimiter.instance = new AdaptiveRateLimiter(store);
    }
    return AdaptiveRateLimiter.instance;
  }

  public static resetInstance(): void {
    if (AdaptiveRateLimiter.instance) {
      AdaptiveRateLimiter.instance.clear();
    }
    AdaptiveRateLimiter.instance = null;
  }

  public async clear(): Promise<void> {
    this.tierOverrides.clear();
    await this.store.clearAll();
  }

  /**
   * Dynamically elevates penalty tier for a client key (IP or user ID).
   */
  public elevatePenalty(key: string, tier: RateLimitTier, customDurationSeconds?: number): void {
    const quota = RateLimitPolicy.getQuota(tier);
    const duration = customDurationSeconds || quota.penaltyDurationSeconds || 600;
    const expiresAt = Date.now() + duration * 1000;
    this.tierOverrides.set(key, { tier, expiresAt });
  }

  /**
   * Resolves the active rate limit tier for a given key.
   */
  public getEffectiveTier(key: string): RateLimitTier {
    const override = this.tierOverrides.get(key);
    if (override) {
      if (Date.now() < override.expiresAt) {
        return override.tier;
      }
      this.tierOverrides.delete(key);
    }
    return 'STANDARD';
  }

  /**
   * Consumes a token and checks if the request is permitted.
   */
  public async checkLimit(key: string, clientIp?: string): Promise<RateLimitCheckResult> {
    // 1. Strict Quarantine Check
    if (clientIp && ResponseExecutor.isIpQuarantined(clientIp)) {
      return {
        allowed: false,
        tier: 'LOCKDOWN',
        limit: 0,
        remaining: 0,
        resetMs: 3600000,
        retryAfterSeconds: 3600,
      };
    }

    const tier = this.getEffectiveTier(key);
    const quota = RateLimitPolicy.getQuota(tier);

    if (tier === 'LOCKDOWN' || quota.limitPerMinute === 0) {
      return {
        allowed: false,
        tier: 'LOCKDOWN',
        limit: 0,
        remaining: 0,
        resetMs: 3600000,
        retryAfterSeconds: 3600,
      };
    }

    const refillRatePerSec = quota.limitPerMinute / 60;
    const maxCapacity = quota.burstCapacity > 0 ? quota.burstCapacity : quota.limitPerMinute;

    const res = await this.store.consumeToken(key, maxCapacity, refillRatePerSec);

    return {
      allowed: res.allowed,
      tier,
      limit: quota.limitPerMinute,
      remaining: res.remaining,
      resetMs: res.resetMs,
      retryAfterSeconds: res.allowed ? undefined : Math.ceil(res.resetMs / 1000),
    };
  }
}
