/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Rate Limit Store
 * Abstract store interface with in-memory token bucket implementation
 * and production-grade Distributed Redis Cluster integration with atomic Lua scripts.
 */

import Redis, { Cluster } from 'ioredis';

export interface TokenBucket {
  tokens: number;
  lastRefillTimestamp: number;
}

export interface IRateLimitStore {
  consumeToken(key: string, maxTokens: number, refillRatePerSec: number): Promise<{ allowed: boolean; remaining: number; resetMs: number }>;
  resetKey(key: string): Promise<void>;
  clearAll(): Promise<void>;
}

export class InMemoryRateLimitStore implements IRateLimitStore {
  private buckets: Map<string, TokenBucket> = new Map();

  public async consumeToken(
    key: string,
    maxTokens: number,
    refillRatePerSec: number
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const now = Date.now();
    let bucket = this.buckets.get(key);

    if (!bucket) {
      bucket = {
        tokens: maxTokens,
        lastRefillTimestamp: now,
      };
      this.buckets.set(key, bucket);
    }

    // Refill tokens based on elapsed time
    const elapsedSeconds = Math.max(0, (now - bucket.lastRefillTimestamp) / 1000);
    const tokensToAdd = elapsedSeconds * refillRatePerSec;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + tokensToAdd);
    bucket.lastRefillTimestamp = now;

    if (bucket.tokens >= 1) {
      bucket.tokens -= 1;
      const remaining = Math.floor(bucket.tokens);
      const resetMs = Math.ceil(((maxTokens - bucket.tokens) / refillRatePerSec) * 1000);
      return { allowed: true, remaining, resetMs };
    } else {
      const resetMs = Math.ceil(((1 - bucket.tokens) / refillRatePerSec) * 1000);
      return { allowed: false, remaining: 0, resetMs };
    }
  }

  public async resetKey(key: string): Promise<void> {
    this.buckets.delete(key);
  }

  public async clearAll(): Promise<void> {
    this.buckets.clear();
  }
}

export interface RedisClusterNode {
  host: string;
  port: number;
}

export interface RedisRateLimitConfig {
  nodes?: RedisClusterNode[];
  standaloneHost?: string;
  standalonePort?: number;
  password?: string;
  tls?: boolean;
  keyPrefix?: string;
  connectionTimeout?: number;
  fallbackToMemory?: boolean;
  client?: any; // For unit testing and mocked clusters
}

export class DistributedRedisRateLimitStore implements IRateLimitStore {
  private client: Redis | Cluster | any = null;
  private memoryFallback: InMemoryRateLimitStore = new InMemoryRateLimitStore();
  private fallbackToMemory: boolean;
  private isConnected = false;
  private keyPrefix: string;

  private static readonly LUA_TOKEN_BUCKET = `
local key = KEYS[1]
local maxTokens = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(data[1])
local lastRefill = tonumber(data[2])

if not tokens then
  tokens = maxTokens
  lastRefill = now
else
  local elapsed = math.max(0, (now - lastRefill) / 1000)
  tokens = math.min(maxTokens, tokens + (elapsed * refillRate))
  lastRefill = now
end

if tokens >= 1 then
  tokens = tokens - 1
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('EXPIRE', key, math.ceil(maxTokens / refillRate) + 60)
  return {1, math.floor(tokens), math.ceil(((maxTokens - tokens) / refillRate) * 1000)}
else
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('EXPIRE', key, math.ceil(maxTokens / refillRate) + 60)
  return {0, 0, math.ceil(((1 - tokens) / refillRate) * 1000)}
end
`;

  public constructor(config?: RedisRateLimitConfig) {
    this.fallbackToMemory = config?.fallbackToMemory !== false;
    this.keyPrefix = config?.keyPrefix || 'prism:ratelimit:';

    if (config?.client) {
      this.client = config.client;
      this.isConnected = true;
    } else {
      const redisHost = config?.standaloneHost || (typeof process !== 'undefined' ? process.env.REDIS_HOST : undefined);
      const redisPort = config?.standalonePort || (typeof process !== 'undefined' ? Number(process.env.REDIS_PORT) || 6379 : 6379);

      if (redisHost) {
        try {
          if (config?.nodes && config.nodes.length > 0) {
            this.client = new Redis.Cluster(config.nodes, {
              redisOptions: {
                password: config.password,
                tls: config.tls ? {} : undefined,
                connectTimeout: config.connectionTimeout || 2000,
              },
            });
          } else {
            this.client = new Redis({
              host: redisHost,
              port: redisPort,
              password: config?.password || (typeof process !== 'undefined' ? process.env.REDIS_PASSWORD : undefined),
              tls: config?.tls ? {} : undefined,
              connectTimeout: config?.connectionTimeout || 2000,
              lazyConnect: true,
            });
          }

          this.client.on('connect', () => {
            this.isConnected = true;
          });

          this.client.on('error', (err: any) => {
            this.isConnected = false;
            if (!this.fallbackToMemory) {
              console.error('[DistributedRedisRateLimitStore] Redis error:', err.message);
            }
          });
        } catch (err: any) {
          this.isConnected = false;
          if (!this.fallbackToMemory) {
            throw err;
          }
        }
      } else {
        // No Redis host configured in environment
        this.isConnected = false;
      }
    }
  }

  public async consumeToken(
    key: string,
    maxTokens: number,
    refillRatePerSec: number
  ): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
    const fullKey = `${this.keyPrefix}${key}`;

    if (this.isConnected && this.client) {
      try {
        const now = Date.now();
        // Execute atomic Lua token bucket script
        const result = await this.client.eval(
          DistributedRedisRateLimitStore.LUA_TOKEN_BUCKET,
          1,
          fullKey,
          String(maxTokens),
          String(refillRatePerSec),
          String(now)
        );

        if (Array.isArray(result)) {
          const allowed = Number(result[0]) === 1;
          const remaining = Number(result[1]);
          const resetMs = Number(result[2]);
          return { allowed, remaining, resetMs };
        }
      } catch (err) {
        if (!this.fallbackToMemory) {
          throw err;
        }
      }
    }

    // Safe degraded mode: Memory token bucket fallback
    return this.memoryFallback.consumeToken(key, maxTokens, refillRatePerSec);
  }

  public async resetKey(key: string): Promise<void> {
    const fullKey = `${this.keyPrefix}${key}`;
    if (this.isConnected && this.client) {
      try {
        await this.client.del(fullKey);
      } catch {
        // Fallback
      }
    }
    await this.memoryFallback.resetKey(key);
  }

  public async clearAll(): Promise<void> {
    if (this.isConnected && this.client) {
      try {
        const keys = await this.client.keys(`${this.keyPrefix}*`);
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } catch {
        // Fallback
      }
    }
    await this.memoryFallback.clearAll();
  }

  public async checkConnectivity(): Promise<{
    connected: boolean;
    provider: 'REDIS_CLUSTER' | 'REDIS_STANDALONE' | 'IN_MEMORY_FALLBACK';
    latencyMs?: number;
    error?: string;
  }> {
    if (!this.client || !this.isConnected) {
      return {
        connected: false,
        provider: 'IN_MEMORY_FALLBACK',
        error: 'Redis cluster not configured or unreachable. Operating in in-memory fallback mode.',
      };
    }

    try {
      const t0 = performance.now();
      await this.client.ping();
      const latencyMs = Number((performance.now() - t0).toFixed(2));
      return {
        connected: true,
        provider: this.client instanceof Redis.Cluster ? 'REDIS_CLUSTER' : 'REDIS_STANDALONE',
        latencyMs,
      };
    } catch (err: any) {
      return {
        connected: false,
        provider: 'IN_MEMORY_FALLBACK',
        error: err.message,
      };
    }
  }
}
