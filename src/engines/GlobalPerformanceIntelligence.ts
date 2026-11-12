/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Global Performance Intelligence (Phase 36)
 * Aggregates runtime telemetry from Phase 33 Cognitive Analytics and Phase 34 Self-Optimization.
 * Strictly never fabricates CPU, memory, cloud hardware, or artificial network metrics.
 */

import { GlobalPerformanceReport } from '../types/phase36';
import { SystemPerformanceIntelligence } from './SystemPerformanceIntelligence';

export class GlobalPerformanceIntelligence {
  private static instance: GlobalPerformanceIntelligence | null = null;
  private currentReport: GlobalPerformanceReport;
  private listeners: Set<(report: GlobalPerformanceReport) => void> = new Set();

  public constructor() {
    this.currentReport = this.evaluateGlobalPerformance();
  }

  public static getInstance(): GlobalPerformanceIntelligence {
    if (!GlobalPerformanceIntelligence.instance) {
      GlobalPerformanceIntelligence.instance = new GlobalPerformanceIntelligence();
    }
    return GlobalPerformanceIntelligence.instance;
  }

  public static resetInstance(): void {
    GlobalPerformanceIntelligence.instance = null;
  }

  public evaluateGlobalPerformance(): GlobalPerformanceReport {
    const perfIntel = SystemPerformanceIntelligence.getInstance();
    const snapshot = perfIntel.getLatestSnapshot();
    const now = new Date().toISOString();

    const report: GlobalPerformanceReport = {
      averageApiLatencyMs: snapshot.apiResponseLatencyMs,
      averageAiResponseTimeMs: snapshot.aiProviderResponseTimeMs,
      averageTaskDurationMs: snapshot.taskExecutionDurationMs,
      cacheEfficiencyPercent: snapshot.cacheHitRatioPercent,
      renderCadenceFps: snapshot.renderCadenceFps,
      renderFrameDropPercent: snapshot.renderFrameDropPercent,
      realMemoryHeapMb: snapshot.measuredMemoryMb,
      isRealMemorySupported: snapshot.isMemoryMeasured,
      identifiedBottlenecks: snapshot.activeBottlenecks,
      lastEvaluated: now,
    };

    this.currentReport = report;
    this.notifyChange();
    return report;
  }

  public getLatestPerformance(): GlobalPerformanceReport {
    return { ...this.currentReport };
  }

  public subscribe(listener: (report: GlobalPerformanceReport) => void): () => void {
    this.listeners.add(listener);
    listener(this.getLatestPerformance());
    return () => this.listeners.delete(listener);
  }

  private notifyChange(): void {
    const rep = this.getLatestPerformance();
    this.listeners.forEach((fn) => fn(rep));
  }
}
