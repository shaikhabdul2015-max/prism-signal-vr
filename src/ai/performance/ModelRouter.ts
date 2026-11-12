// src/ai/performance/ModelRouter.ts
import { AIRequestCache } from './AIRequestCache';
import { InferenceCostMonitor } from './InferenceCostMonitor';

export interface RouteRequestInput {
  requestId: string;
  taskType: 'hint_generation' | 'narrative_synthesis' | 'orchestration_eval';
  payload: Record<string, unknown>;
  bypassCache?: boolean;
}

export interface RouteResponseOutput<T = unknown> {
  requestId: string;
  data: T;
  source: 'cache' | 'upstream_llama' | 'local_heuristic';
  latencyMs: number;
  tokensUsed: number;
}

export class ModelRouter {
  private cache: AIRequestCache<unknown>;
  private costMonitor: InferenceCostMonitor;
  private readonly defaultTimeoutMs: number;

  constructor(
    cache?: AIRequestCache<unknown>,
    costMonitor?: InferenceCostMonitor,
    defaultTimeoutMs = 4000
  ) {
    this.cache = cache || new AIRequestCache();
    this.costMonitor = costMonitor || new InferenceCostMonitor();
    this.defaultTimeoutMs = defaultTimeoutMs;
  }

  public async route<T>(
    input: RouteRequestInput,
    localHeuristicFallback: () => T
  ): Promise<RouteResponseOutput<T>> {
    const startTime = Date.now();
    const cacheKey = `${input.taskType}-${JSON.stringify(input.payload)}`;

    // 1. Check Cache
    if (!input.bypassCache) {
      const cached = this.cache.get(cacheKey) as T | null;
      if (cached) {
        this.costMonitor.recordCacheEvent(true);
        const measuredLatency = Date.now() - startTime;
        return {
          requestId: input.requestId,
          data: cached,
          source: 'cache',
          latencyMs: Math.max(0.5, measuredLatency),
          tokensUsed: 0,
        };
      }
    }

    this.costMonitor.recordCacheEvent(false);

    // 2. Upstream fetch attempt (if in browser environment with active backend)
    let upstreamData: T | null = null;
    let tokensUsed = 0;
    let source: 'upstream_llama' | 'local_heuristic' = 'local_heuristic';

    if (typeof fetch === 'function' && typeof window !== 'undefined') {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.defaultTimeoutMs);

        const res = await fetch('/api/llama/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input.payload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.ok) {
          const json = await res.json();
          upstreamData = json as T;
          source = 'upstream_llama';
          tokensUsed = 120; // Estimated baseline
        }
      } catch {
        // Fall through to local heuristic
      }
    }

    // 3. Fallback to Local Heuristic
    const finalData = upstreamData ?? localHeuristicFallback();
    const measuredLatency = Date.now() - startTime;
    const latencyMs = Math.max(0.5, measuredLatency);

    // Record in Cost Monitor
    this.costMonitor.recordInference({
      requestId: input.requestId,
      model: source === 'upstream_llama' ? 'meta-llama-3.3-70b' : 'local-deterministic-engine',
      promptTokens: source === 'upstream_llama' ? 80 : 0,
      completionTokens: source === 'upstream_llama' ? 40 : 0,
      totalTokens: tokensUsed,
      latencyMs,
      estimatedCostUSD: source === 'upstream_llama' ? (tokensUsed / 1_000_000) * 0.59 : 0.0,
    });

    // Cache the result
    this.cache.set(cacheKey, finalData);

    return {
      requestId: input.requestId,
      data: finalData,
      source,
      latencyMs,
      tokensUsed,
    };
  }

  public getCache(): AIRequestCache<unknown> {
    return this.cache;
  }

  public getCostMonitor(): InferenceCostMonitor {
    return this.costMonitor;
  }
}
