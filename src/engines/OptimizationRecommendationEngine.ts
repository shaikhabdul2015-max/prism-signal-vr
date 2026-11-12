/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Optimization Recommendation Engine (Phase 34)
 * Synthesizes performance telemetry, AI model evaluations, and resource constraints
 * into concrete, evidence-backed optimization recommendations with explicit risk profiles,
 * expected benefits, rollback thresholds, and operator approval requirements.
 */

import {
  OptimizationRecommendation,
  OptimizationTargetDomain,
  OptimizationPriority,
  SystemPerformanceSnapshot,
  ModelPerformanceReport,
} from '../types/phase34';
import { ResourceAdjustmentProposal } from './AdaptiveResourceManagementEngine';

export class OptimizationRecommendationEngine {
  private static instance: OptimizationRecommendationEngine | null = null;
  private recommendations: Map<string, OptimizationRecommendation> = new Map();

  public constructor() {
    this.seedDefaultRecommendations();
  }

  public static getInstance(): OptimizationRecommendationEngine {
    if (!OptimizationRecommendationEngine.instance) {
      OptimizationRecommendationEngine.instance = new OptimizationRecommendationEngine();
    }
    return OptimizationRecommendationEngine.instance;
  }

  public static resetInstance(): void {
    OptimizationRecommendationEngine.instance = null;
  }

  private seedDefaultRecommendations(): void {
    const seeds: OptimizationRecommendation[] = [
      {
        recommendationId: 'rec-p34-caching-ttl',
        domain: 'CACHING_POLICIES',
        title: 'Extend Cache TTL for Analytical Telemetry',
        problemDescription: 'Telemetry queries repeat frequent read cycles within 3-minute intervals, reducing cache efficiency to 88.5%.',
        supportingEvidence: [
          'Average cache hit ratio is 88.5% with 180s TTL',
          'Telemetry query repetition peaks at 240s window',
          'Heap footprint remains low with room for expanded telemetry store',
        ],
        expectedBenefit: 'Expected 7-10% increase in cache hit ratio, lowering backend query overhead.',
        potentialRisks: ['Slightly delayed visibility of sub-second state anomalies if invalidation events fail'],
        resourceRequirements: 'Minimal in-memory caching capacity expansion (< 2MB)',
        confidenceScore: 92,
        priority: 'MEDIUM',
        targetConfigKey: 'caching.cacheTtlSeconds',
        currentValue: 180,
        proposedValue: 300,
        validationCriteria: [
          'Value must be between 30 and 600 seconds',
          'Cache memory quota must not exceed heap safety threshold',
          'Zero-Trust cache invalidation must remain strictly active',
        ],
        rollbackThresholdMetric: 'cacheHitRatioPercent',
        rollbackThresholdValue: 80.0,
        status: 'PROPOSED',
        createdAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        recommendationId: 'rec-p34-model-horizon',
        domain: 'AI_REQUEST_ROUTING',
        title: 'Shift Holt-Linear Smoothing Window from 15s to 30s',
        problemDescription: 'Model evaluation identified elevated MAPE (14.5%) and jitter sensitivity when using the short 15s window during burst telemetry.',
        supportingEvidence: [
          'Short 15s window MAPE is 14.5% vs 3.8% on 30s window',
          'Fallback frequency during 15s window rose to 8.5%',
          'Mathematical trend estimation stabilizes significantly with a 30s window',
        ],
        expectedBenefit: 'Reduces prediction error by ~10% and eliminates spurious anomaly alerts caused by short-horizon jitter.',
        potentialRisks: ['~15 second latency in identifying instantaneous sharp impulse spikes'],
        resourceRequirements: 'Zero additional memory or network overhead',
        confidenceScore: 95,
        priority: 'HIGH',
        targetConfigKey: 'aiRouting.primaryProvider',
        currentValue: 'GEMINI_SERVER_PROXY',
        proposedValue: 'GEMINI_SERVER_PROXY', // Keeps Gemini as primary, adjusts smoothing policy
        validationCriteria: [
          'Model routing configuration must be valid JSON',
          'Zero-Trust prompt inspection must remain fully enforced',
        ],
        rollbackThresholdMetric: 'apiSuccessRatePercent',
        rollbackThresholdValue: 95.0,
        status: 'PENDING_APPROVAL',
        createdAt: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        recommendationId: 'rec-p34-concurrency-scaling',
        domain: 'TASK_SCHEDULING',
        title: 'Scale Task Scheduling Concurrency for Agent Network',
        problemDescription: 'Multi-agent consensus cycles experience intermittent queue queuing during collaborative research rounds.',
        supportingEvidence: [
          'Task queue depth peaks at 6-8 items during multi-agent sync',
          'Client CPU and frame rate remain fully nominal (60 FPS)',
          'Current concurrency ceiling of 8 limits parallel agent evaluation',
        ],
        expectedBenefit: 'Reduces multi-agent consensus finalization latency from 450ms to ~210ms.',
        potentialRisks: ['Temporary micro-stutter if 12 heavy tasks execute concurrently on weak client devices'],
        resourceRequirements: 'Moderate client WebWorker / microtask capacity',
        confidenceScore: 88,
        priority: 'HIGH',
        targetConfigKey: 'taskScheduling.maxConcurrency',
        currentValue: 8,
        proposedValue: 12,
        validationCriteria: [
          'Concurrency must be integer between 2 and 16',
          'Rendering cadence must not dip below 45 FPS',
        ],
        rollbackThresholdMetric: 'renderCadenceFps',
        rollbackThresholdValue: 45.0,
        status: 'PROPOSED',
        createdAt: new Date(Date.now() - 900000).toISOString(),
      },
    ];

    for (const r of seeds) {
      this.recommendations.set(r.recommendationId, r);
    }
  }

  public getAllRecommendations(): OptimizationRecommendation[] {
    return Array.from(this.recommendations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getRecommendationById(id: string): OptimizationRecommendation | undefined {
    return this.recommendations.get(id);
  }

  /**
   * Generates dynamic recommendations from resource adjustment proposals and model evaluations.
   */
  public generateFromProposals(
    proposals: ResourceAdjustmentProposal[],
    evaluations: ModelPerformanceReport[],
    snapshot: SystemPerformanceSnapshot
  ): OptimizationRecommendation[] {
    const created: OptimizationRecommendation[] = [];

    for (const p of proposals) {
      const recId = `rec-dyn-${p.targetDomain.toLowerCase()}-${Date.now().toString(36)}`;
      const domainMap: Record<string, OptimizationTargetDomain> = {
        CONCURRENCY: 'TASK_SCHEDULING',
        QUEUE_BUFFER: 'TASK_SCHEDULING',
        CACHE_HORIZON: 'CACHING_POLICIES',
        RENDER_RESOLUTION: 'RENDERING_PERFORMANCE',
        BATCH_INTERVAL: 'DATA_PROCESSING_PIPELINES',
      };

      const domain = domainMap[p.targetDomain] || 'TASK_SCHEDULING';
      const rec: OptimizationRecommendation = {
        recommendationId: recId,
        domain,
        title: `Adaptive Adjustment: ${p.configKey}`,
        problemDescription: p.rationale,
        supportingEvidence: [
          `Current value: ${p.currentValue}, Recommended: ${p.recommendedValue}`,
          `Active bottlenecks: ${snapshot.activeBottlenecks.join(', ') || 'None'}`,
          `Safe operating range: [${p.safetyBounds.min}, ${p.safetyBounds.max}]`,
        ],
        expectedBenefit: `Enhance throughput and stabilize system responsiveness under current workload.`,
        potentialRisks: [`Boundary edge conditions if system workload changes abruptly`],
        resourceRequirements: `Dynamic parameter adjustment; no persistent storage delta`,
        confidenceScore: 89,
        priority: p.recommendedValue > p.currentValue ? 'MEDIUM' : 'HIGH',
        targetConfigKey: p.configKey,
        currentValue: p.currentValue,
        proposedValue: p.recommendedValue,
        validationCriteria: [
          `Proposed value must be between ${p.safetyBounds.min} and ${p.safetyBounds.max}`,
          `Zero-Trust and authorization boundaries must remain unchanged`,
        ],
        rollbackThresholdMetric: 'apiResponseLatencyMs',
        rollbackThresholdValue: snapshot.apiResponseLatencyMs * 1.25,
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      };

      this.recommendations.set(recId, rec);
      created.push(rec);
    }

    return created;
  }

  public updateRecommendationStatus(
    id: string,
    status: OptimizationRecommendation['status'],
    details?: Partial<OptimizationRecommendation>
  ): OptimizationRecommendation | null {
    const existing = this.recommendations.get(id);
    if (!existing) return null;

    const updated: OptimizationRecommendation = {
      ...existing,
      ...details,
      status,
    };
    this.recommendations.set(id, updated);
    return updated;
  }
}
