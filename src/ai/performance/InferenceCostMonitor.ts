// src/ai/performance/InferenceCostMonitor.ts
import type { AIPerformanceSummary, InferenceTokenRecord } from './types';

export class InferenceCostMonitor {
  private records: InferenceTokenRecord[] = [];
  private readonly maxRecords = 200;
  private cacheHits = 0;
  private cacheMisses = 0;

  public recordInference(record: Omit<InferenceTokenRecord, 'timestamp'>): InferenceTokenRecord {
    const fullRecord: InferenceTokenRecord = {
      ...record,
      timestamp: Date.now(),
    };

    this.records.push(fullRecord);
    if (this.records.length > this.maxRecords) {
      this.records.shift();
    }

    return fullRecord;
  }

  public recordCacheEvent(hit: boolean): void {
    if (hit) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
  }

  public getSummary(): AIPerformanceSummary {
    const totalRequests = this.records.length;
    let totalTokens = 0;
    let totalCost = 0;
    let totalLatency = 0;

    for (const r of this.records) {
      totalTokens += r.totalTokens;
      totalCost += r.estimatedCostUSD;
      totalLatency += r.latencyMs;
    }

    const totalCacheQueries = this.cacheHits + this.cacheMisses;

    return {
      totalRequests,
      cacheHits: this.cacheHits,
      cacheMisses: this.cacheMisses,
      cacheHitRatio: totalCacheQueries > 0 ? Number((this.cacheHits / totalCacheQueries).toFixed(3)) : 0.0,
      totalTokensConsumed: totalTokens,
      totalEstimatedCostUSD: Number(totalCost.toFixed(6)),
      averageLatencyMs: totalRequests > 0 ? Number((totalLatency / totalRequests).toFixed(1)) : 0.0,
    };
  }

  public getRecords(): InferenceTokenRecord[] {
    return [...this.records];
  }

  public reset(): void {
    this.records = [];
    this.cacheHits = 0;
    this.cacheMisses = 0;
  }
}
