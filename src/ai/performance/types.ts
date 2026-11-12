// src/ai/performance/types.ts
/**
 * Types for Stage 6 AI Performance Optimization
 */

export interface CacheEntry<T> {
  key: string;
  data: T;
  timestamp: number;
  ttlMs: number;
  hitCount: number;
}

export interface ModelRoutingOption {
  id: string;
  name: string;
  provider: 'groq' | 'local_heuristic' | 'cache';
  maxTimeoutMs: number;
  costPer1MTokensUSD: number;
  isAvailable: boolean;
}

export interface InferenceTokenRecord {
  requestId: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  latencyMs: number;
  estimatedCostUSD: number;
  timestamp: number;
}

export interface AIPerformanceSummary {
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  cacheHitRatio: number;
  totalTokensConsumed: number;
  totalEstimatedCostUSD: number;
  averageLatencyMs: number;
}
