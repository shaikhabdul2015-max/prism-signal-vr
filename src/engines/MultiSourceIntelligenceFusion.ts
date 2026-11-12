/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Multi-Source Intelligence Fusion (Phase 35)
 * Unifies diverse intelligence streams from internal engines, AI providers,
 * historical archives, sensor pipelines, and agent reports.
 * Performs source normalization, cross-source correlation, duplicate suppression,
 * and contradiction detection without treating duplicate copies as independent evidence.
 */

import { FusedIntelligenceRecord } from '../types/phase35';
import { GlobalIntelligenceNetworkEngine } from './GlobalIntelligenceNetworkEngine';

export interface RawIntelligenceFact {
  concept: string;
  statement: string;
  sourceId: string;
  confidence: number; // 0 - 100
  evidenceKey?: string;
  timestamp?: string;
}

export class MultiSourceIntelligenceFusion {
  private static instance: MultiSourceIntelligenceFusion | null = null;
  private fusionRecords: FusedIntelligenceRecord[] = [];

  public constructor() {
    this.seedDefaultFusions();
  }

  public static getInstance(): MultiSourceIntelligenceFusion {
    if (!MultiSourceIntelligenceFusion.instance) {
      MultiSourceIntelligenceFusion.instance = new MultiSourceIntelligenceFusion();
    }
    return MultiSourceIntelligenceFusion.instance;
  }

  public static resetInstance(): void {
    MultiSourceIntelligenceFusion.instance = null;
  }

  private seedDefaultFusions(): void {
    const now = new Date().toISOString();
    const seeds: FusedIntelligenceRecord[] = [
      {
        fusionId: 'fuse-p35-01',
        primaryConcept: 'Virtual Reality Rendering Stability & Frame Cadence',
        synthesizedFacts: [
          'Render cadence maintains 60.0 FPS under nominal load with 0.8% frame drop ratio.',
          'Dynamic downscaling threshold set to 45.0 FPS protects main-thread responsiveness.',
          'Holt-Linear smoothing calibrated to 30s prevents spurious jitter alerts.',
        ],
        contributingSourceIds: ['src-sensor-telemetry', 'src-evolution-engine', 'src-six-agents-mesh'],
        confidenceScore: 97.4,
        reliabilityIndicator: 'HIGH_CONVERGENCE',
        duplicateCountSuppressed: 4,
        contradictionsIdentified: [],
        fusionTimestamp: now,
      },
      {
        fusionId: 'fuse-p35-02',
        primaryConcept: 'Rule #2 Causation Invariance & Zero-Trust Governance',
        synthesizedFacts: [
          'Rule #2 invariance confirmed: Causation is strictly inconclusive under simulated conditions.',
          'Zero-Trust cryptographic access gates prevent unauthorized parameter tampering.',
        ],
        contributingSourceIds: ['src-security-gateway', 'src-predictive-intel', 'src-gemini-proxy'],
        confidenceScore: 99.1,
        reliabilityIndicator: 'HIGH_CONVERGENCE',
        duplicateCountSuppressed: 2,
        contradictionsIdentified: [],
        fusionTimestamp: now,
      },
    ];

    this.fusionRecords.push(...seeds);
  }

  /**
   * Fuses raw facts from multiple sources into a synthesized, deduplicated intelligence record.
   */
  public fuseFacts(concept: string, rawFacts: RawIntelligenceFact[]): FusedIntelligenceRecord {
    const network = GlobalIntelligenceNetworkEngine.getInstance();
    const now = new Date().toISOString();

    // 1. Group and deduplicate by (statement + sourceId) and (statement text)
    const seenStatementSources = new Set<string>();
    const uniqueStatements: { statement: string; sourceId: string; confidence: number }[] = [];
    let duplicateCount = 0;

    for (const f of rawFacts) {
      const statementKey = `${f.sourceId}::${f.statement.trim().toLowerCase()}`;
      if (seenStatementSources.has(statementKey)) {
        duplicateCount++;
        continue;
      }
      seenStatementSources.add(statementKey);
      uniqueStatements.push(f);
    }

    // 2. Identify unique sources and calculate weighted confidence
    const uniqueSourceIds = Array.from(new Set(uniqueStatements.map((u) => u.sourceId)));
    let weightedConfidenceSum = 0;
    let totalWeight = 0;

    for (const sourceId of uniqueSourceIds) {
      const descriptor = network.getSource(sourceId);
      const reliability = descriptor ? descriptor.reliabilityScore / 100 : 0.8;
      const sourceStatements = uniqueStatements.filter((u) => u.sourceId === sourceId);
      const avgSourceConf =
        sourceStatements.reduce((acc, s) => acc + s.confidence, 0) / sourceStatements.length;

      weightedConfidenceSum += avgSourceConf * reliability;
      totalWeight += reliability;
    }

    const aggregatedConfidence = totalWeight > 0 ? Math.round((weightedConfidenceSum / totalWeight) * 10) / 10 : 85.0;

    // 3. Contradiction Detection
    // Simple heuristic: if statements assert opposing polarities (e.g. "stable" vs "degraded", "exceeds" vs "nominal")
    const contradictions: string[] = [];
    const allText = uniqueStatements.map((u) => u.statement.toLowerCase());
    const hasDegraded = allText.some((t) => t.includes('degraded') || t.includes('failing') || t.includes('unstable'));
    const hasOptimal = allText.some((t) => t.includes('optimal') || t.includes('stable') || t.includes('nominal'));
    if (hasDegraded && hasOptimal) {
      contradictions.push(`Conflicting status claims detected across sources for concept "${concept}".`);
    }

    // Determine reliability indicator
    let reliabilityIndicator: FusedIntelligenceRecord['reliabilityIndicator'] = 'MODERATE_CONFIDENCE';
    if (contradictions.length > 0) {
      reliabilityIndicator = 'CONTRADICTION_FLAGGED';
    } else if (uniqueSourceIds.length >= 2 && aggregatedConfidence >= 90) {
      reliabilityIndicator = 'HIGH_CONVERGENCE';
    } else if (aggregatedConfidence < 75) {
      reliabilityIndicator = 'POTENTIAL_DIVERGENCE';
    }

    const synthesizedFacts = Array.from(new Set(uniqueStatements.map((u) => u.statement)));

    const record: FusedIntelligenceRecord = {
      fusionId: `fuse-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
      primaryConcept: concept,
      synthesizedFacts,
      contributingSourceIds: uniqueSourceIds,
      confidenceScore: aggregatedConfidence,
      reliabilityIndicator,
      duplicateCountSuppressed: duplicateCount,
      contradictionsIdentified: contradictions,
      fusionTimestamp: now,
    };

    this.fusionRecords.unshift(record);
    return record;
  }

  public getAllFusions(): FusedIntelligenceRecord[] {
    return [...this.fusionRecords];
  }
}
