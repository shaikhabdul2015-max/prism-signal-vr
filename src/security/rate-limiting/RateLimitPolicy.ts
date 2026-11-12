/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Adaptive Rate Limiting Policies
 */

export type RateLimitTier = 'STANDARD' | 'SUSPICIOUS' | 'DEGRADED' | 'LOCKDOWN';

export interface RateLimitQuota {
  limitPerMinute: number;
  burstCapacity: number;
  penaltyDurationSeconds: number;
}

export class RateLimitPolicy {
  public static readonly TIERS: Record<RateLimitTier, RateLimitQuota> = {
    STANDARD: {
      limitPerMinute: 120,
      burstCapacity: 20,
      penaltyDurationSeconds: 0,
    },
    SUSPICIOUS: {
      limitPerMinute: 20,
      burstCapacity: 5,
      penaltyDurationSeconds: 600, // 10 mins
    },
    DEGRADED: {
      limitPerMinute: 5,
      burstCapacity: 2,
      penaltyDurationSeconds: 1800, // 30 mins
    },
    LOCKDOWN: {
      limitPerMinute: 0,
      burstCapacity: 0,
      penaltyDurationSeconds: 3600, // 1 hour
    },
  };

  public static getQuota(tier: RateLimitTier): RateLimitQuota {
    return this.TIERS[tier] || this.TIERS.STANDARD;
  }
}
