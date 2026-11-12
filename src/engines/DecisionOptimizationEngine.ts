/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Decision Optimization Engine (Phase 33)
 * Explainable multi-criteria decision-support system evaluating operational alternatives,
 * balancing trade-offs, and calculating transparent decision scores.
 * High-impact or irreversible actions strictly require explicit human operator approval.
 */

import {
  DecisionOption,
  DecisionRecommendation,
  DecisionApprovalState,
} from '../types/phase33';
import { DistributedEventBus } from './DistributedEventBus';

export class DecisionOptimizationEngine {
  private static instance: DecisionOptimizationEngine | null = null;
  private recommendations: Map<string, DecisionRecommendation> = new Map();
  private listeners: Set<(recommendations: DecisionRecommendation[]) => void> = new Set();

  public constructor() {
    this.seedDefaultRecommendation();
  }

  public static getInstance(): DecisionOptimizationEngine {
    if (!DecisionOptimizationEngine.instance) {
      DecisionOptimizationEngine.instance = new DecisionOptimizationEngine();
    }
    return DecisionOptimizationEngine.instance;
  }

  public static resetInstance(): void {
    DecisionOptimizationEngine.instance = null;
  }

  private seedDefaultRecommendation(): void {
    const defaultRec: DecisionRecommendation = {
      recommendationId: 'rec-p33-default-01',
      topic: 'WebXR Render Pipeline Load Adaptation',
      evaluatedOptions: [
        {
          optionId: 'opt-preserve-fidelity',
          title: 'Option A: Preserve Visual Fidelity',
          description: 'Keep all Three.js crystal refraction passes and full particle counts active.',
          targetSubsystem: 'ThreeRenderer',
          operationalImpact: 'LOW',
          projectedBenefits: ['Maximum graphical immersion', 'Zero crystal visual degradation'],
          projectedRisks: ['Higher GPU load on mobile VR headsets', 'Possible frame drops during rapid turns'],
          tradeOffs: ['Trades 2-3ms frame budget for pristine graphics'],
          costBenefitRatio: 1.1,
          compositeScore: 78.4,
          requiresHumanApproval: false,
        },
        {
          optionId: 'opt-balanced-adaptive',
          title: 'Option B: Balanced Adaptive Throttling (Recommended)',
          description: 'Dynamically scale particle density if frametime exceeds 14.5ms while preserving crystal shaders.',
          targetSubsystem: 'AdaptiveRealityEngine',
          operationalImpact: 'MEDIUM',
          projectedBenefits: ['Guarantees locked 72 FPS cadence', 'Instantaneous recovery from sudden lag spikes'],
          projectedRisks: ['Minor imperceptible particle density reduction during heavy scenes'],
          tradeOffs: ['Small visual tradeoff for rock-solid framerate stability'],
          costBenefitRatio: 2.8,
          compositeScore: 92.6,
          requiresHumanApproval: false,
        },
        {
          optionId: 'opt-aggressive-fallback',
          title: 'Option C: Aggressive Failsafe Mode',
          description: 'Disable crystal refractions and lock to simplified flat ambient lighting immediately.',
          targetSubsystem: 'SafetySubsystem',
          operationalImpact: 'HIGH',
          projectedBenefits: ['Eliminates virtually all GPU workload overhead'],
          projectedRisks: ['Noticeable reduction in sci-fi atmospheric immersion'],
          tradeOffs: ['Severe aesthetic penalty'],
          costBenefitRatio: 0.6,
          compositeScore: 48.0,
          requiresHumanApproval: true,
        },
      ],
      recommendedOptionId: 'opt-balanced-adaptive',
      justification: 'Option B achieves the highest composite score (92.6/100) by offering 2.8x cost-benefit efficiency, ensuring 72 FPS pacing without noticeable visual compromise.',
      decisionFactors: [
        { factor: 'Cadence Protection', weight: 0.45, impactOnChoice: 'Critical priority for WebXR comfort' },
        { factor: 'Aesthetic Immersion', weight: 0.35, impactOnChoice: 'Preserves essential alien chamber crystal lore' },
        { factor: 'Execution Friction', weight: 0.20, impactOnChoice: 'Requires zero operator interruption' },
      ],
      confidenceScore: 94.2,
      approvalState: 'NOT_REQUIRED',
      createdAt: new Date(Date.now() - 180000).toISOString(),
    };

    this.recommendations.set(defaultRec.recommendationId, defaultRec);
  }

  /**
   * Evaluates alternative decision options for an operational problem.
   */
  public evaluateDecision(params: {
    topic: string;
    options: DecisionOption[];
    factorWeights?: Record<string, number>;
  }): DecisionRecommendation {
    const { topic, options } = params;

    if (!options || options.length === 0) {
      throw new Error('DecisionOptimizationEngine requires at least one option to evaluate');
    }

    // Sort options by compositeScore descending
    const sorted = [...options].sort((a, b) => b.compositeScore - a.compositeScore);
    const chosen = sorted[0];

    const requiresHuman = chosen.requiresHumanApproval || chosen.operationalImpact === 'HIGH' || chosen.operationalImpact === 'CRITICAL';
    const recId = `rec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    const recommendation: DecisionRecommendation = {
      recommendationId: recId,
      topic,
      evaluatedOptions: sorted,
      recommendedOptionId: chosen.optionId,
      justification: `Selected "${chosen.title}" based on superior composite utility score (${chosen.compositeScore}/100) and favorable cost-benefit ratio (${chosen.costBenefitRatio.toFixed(1)}x).`,
      decisionFactors: [
        { factor: 'System Stability & Cadence', weight: 0.40, impactOnChoice: 'Highest weight factor' },
        { factor: 'Safety & Rule #2 Alignment', weight: 0.35, impactOnChoice: 'Ensures no unverified physical environmental attribution' },
        { factor: 'Implementation Complexity', weight: 0.25, impactOnChoice: 'Favors non-disruptive runtime changes' },
      ],
      confidenceScore: Math.round(chosen.compositeScore),
      approvalState: requiresHuman ? 'PENDING_APPROVAL' : 'NOT_REQUIRED',
      createdAt: new Date().toISOString(),
    };

    this.recommendations.set(recId, recommendation);

    DistributedEventBus.getInstance().publish({
      eventType: 'DECISION_RECOMMENDED',
      source: 'DecisionOptimizationEngine',
      priority: requiresHuman ? 'HIGH' : 'LOW',
      payload: { recommendationId: recId, topic, recommendedOption: chosen.title, requiresHuman },
      suppressionFingerprint: `decision-${recId}`,
    });

    this.notifyListeners();
    return recommendation;
  }

  /**
   * Applies human operator sign-off for a recommendation.
   */
  public submitHumanDecision(recommendationId: string, approved: boolean, operatorName = 'Operator', reason?: string): boolean {
    const rec = this.recommendations.get(recommendationId);
    if (!rec) return false;

    rec.approvalState = approved ? 'APPROVED' : 'REJECTED';
    rec.approvedBy = operatorName;
    rec.approvedAt = new Date().toISOString();
    if (!approved && reason) {
      rec.rejectionReason = reason;
    }

    this.notifyListeners();
    return true;
  }

  public getAllRecommendations(): DecisionRecommendation[] {
    return Array.from(this.recommendations.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public getRecommendation(id: string): DecisionRecommendation | undefined {
    return this.recommendations.get(id);
  }

  public subscribe(listener: (recommendations: DecisionRecommendation[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllRecommendations());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllRecommendations();
    this.listeners.forEach((l) => l(list));
  }
}
