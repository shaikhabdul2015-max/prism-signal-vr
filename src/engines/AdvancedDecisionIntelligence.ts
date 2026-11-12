/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 25: Advanced Decision Intelligence.
 * Multi-option comparison, risk-benefit trade-off scoring, composite prioritization,
 * and mandatory human operator approval integration for high-risk autonomous interventions.
 */

import {
  DecisionComparison,
  DecisionOption,
} from '../types/phase25';
import { HumanApprovalManager } from './HumanApprovalManager';

export class AdvancedDecisionIntelligence {
  private static instance: AdvancedDecisionIntelligence | null = null;
  private decisions: Map<string, DecisionComparison> = new Map();

  private constructor() {
    this.seedDefaultDecisions();
  }

  public static getInstance(): AdvancedDecisionIntelligence {
    if (!AdvancedDecisionIntelligence.instance) {
      AdvancedDecisionIntelligence.instance = new AdvancedDecisionIntelligence();
    }
    return AdvancedDecisionIntelligence.instance;
  }

  public static resetInstance(): void {
    AdvancedDecisionIntelligence.instance = null;
  }

  private seedDefaultDecisions(): void {
    const defaultDec: DecisionComparison = {
      decisionId: 'dec-perf-stabilization-01',
      title: 'Render Pipeline Latency Spike Mitigation',
      context: 'Frame render latency exceeded 22ms under dynamic multi-agent telemetry capture.',
      timestamp: new Date().toISOString(),
      options: [
        {
          id: 'opt-drs-enable',
          title: 'Activate Dynamic Resolution Scaling (DRS) at 85% Viewport',
          description: 'Sheds GPU fillrate load by 28% with negligible visual fidelity degradation.',
          feasibilityScore: 0.95,
          riskScore: 0.15,
          benefitScore: 0.88,
          latencyImpactMs: -5.4,
          costImpactUnits: 0,
          requiresHumanApproval: false,
          pros: ['Instant recovery (<1 frame)', 'Zero cloud egress cost', 'Reversible in real-time'],
          cons: ['Slight softening of peripheral textures'],
        },
        {
          id: 'opt-throttle-tests',
          title: 'Pause Background Continuous Test Scenarios',
          description: 'Frees CPU cycles by deferring active mock stress tests to idle periods.',
          feasibilityScore: 0.9,
          riskScore: 0.25,
          benefitScore: 0.65,
          latencyImpactMs: -3.1,
          costImpactUnits: 0,
          requiresHumanApproval: false,
          pros: ['Reduces main thread task contention', 'Easy to resume'],
          cons: ['Delayed regression detection for subsequent session frames'],
        },
        {
          id: 'opt-full-reset',
          title: 'Emergency WebXR Session Reload & Pipeline Flush',
          description: 'Full hardware session teardown and re-initialization.',
          feasibilityScore: 0.6,
          riskScore: 0.85,
          benefitScore: 0.95,
          latencyImpactMs: -12.0,
          costImpactUnits: 5,
          requiresHumanApproval: true,
          pros: ['Guaranteed memory clearing', 'Resets driver state'],
          cons: ['Blackout period of ~1.2s for user in headset', 'Drops active WebGL context'],
        },
      ],
      recommendedOptionId: 'opt-drs-enable',
      compositePriorityScore: 0.84,
      approvalRequired: false,
      executionStatus: 'APPROVED',
      operatorReviewNote: 'Automated policy approved zero-impact DRS activation.',
    };

    this.decisions.set(defaultDec.decisionId, defaultDec);
  }

  /**
   * Evaluate a set of options and synthesize a weighted decision matrix
   */
  public evaluateDecision(params: {
    title: string;
    context: string;
    options: DecisionOption[];
    weights?: { benefit: number; feasibility: number; risk: number };
  }): DecisionComparison {
    const decisionId = `dec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const weights = params.weights || { benefit: 0.45, feasibility: 0.35, risk: 0.2 };

    // Calculate score for each option
    let bestScore = -Infinity;
    let recommendedOption: DecisionOption | null = null;

    params.options.forEach((opt) => {
      // Composite score: (benefit * wB + feasibility * wF) - (risk * wR)
      const score = opt.benefitScore * weights.benefit + opt.feasibilityScore * weights.feasibility - opt.riskScore * weights.risk;
      if (score > bestScore) {
        bestScore = score;
        recommendedOption = opt;
      }
    });

    const recOpt = recommendedOption || params.options[0];
    const normalizedCompositeScore = Math.max(0, Math.min(1, Number(bestScore.toFixed(3))));

    // Determine if operator approval is required (risk >= 0.7 or flag true)
    const approvalRequired = recOpt.riskScore >= 0.7 || recOpt.requiresHumanApproval;
    let approvalRequestId: string | undefined;

    if (approvalRequired) {
      try {
        const ham = HumanApprovalManager.getInstance();
        const req = ham.createApprovalRequest({
          commandId: decisionId,
          commandName: `Cognitive Decision: ${params.title}`,
          actionSummary: `Recommended: ${recOpt.title} (Risk: ${(recOpt.riskScore * 100).toFixed(0)}%, Benefit: ${(recOpt.benefitScore * 100).toFixed(0)}%)`,
          initiator: 'ChiefIntelligenceAgent',
          targetModule: 'mod-cognitive-intelligence',
          impactLevel: recOpt.riskScore >= 0.8 ? 'CRITICAL' : 'HIGH',
          justification: params.context,
          riskAssessmentSummary: `Risk score ${(recOpt.riskScore * 100).toFixed(0)}% requires operator approval under cognitive safety rules.`,
          timeoutMs: 1000 * 60 * 5, // 5 min
        });
        approvalRequestId = req.approvalId;
      } catch {
        // Fallback if testing environment isolates HumanApprovalManager
      }
    }

    const decision: DecisionComparison = {
      decisionId,
      title: params.title,
      context: params.context,
      timestamp: new Date().toISOString(),
      options: params.options,
      recommendedOptionId: recOpt.id,
      compositePriorityScore: normalizedCompositeScore,
      approvalRequired,
      approvalRequestId,
      executionStatus: approvalRequired ? 'PENDING_APPROVAL' : 'APPROVED',
    };

    this.decisions.set(decisionId, decision);
    return decision;
  }

  public getDecision(decisionId: string): DecisionComparison | undefined {
    return this.decisions.get(decisionId);
  }

  public getAllDecisions(): DecisionComparison[] {
    return Array.from(this.decisions.values());
  }

  public updateDecisionStatus(
    decisionId: string,
    status: DecisionComparison['executionStatus'],
    operatorNote?: string
  ): boolean {
    const dec = this.decisions.get(decisionId);
    if (!dec) return false;
    dec.executionStatus = status;
    if (operatorNote) dec.operatorReviewNote = operatorNote;
    return true;
  }
}

export const advancedDecisionIntelligence = AdvancedDecisionIntelligence.getInstance();
