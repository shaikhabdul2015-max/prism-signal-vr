/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 25: Cognitive Self-Evaluation Engine.
 * Evaluates cognitive decisions against empirical ground truth outcomes,
 * calculates Brier score calibration, detects overconfidence/underconfidence biases,
 * and enforces strict safety boundaries prohibiting self-authorization of critical actions.
 */

import {
  DecisionEvaluationRecord,
  ConfidenceCalibrationMetric,
} from '../types/phase25';

export class CognitiveSelfEvaluation {
  private static instance: CognitiveSelfEvaluation | null = null;
  private evaluations: Map<string, DecisionEvaluationRecord> = new Map();

  private constructor() {
    this.seedDefaultEvaluations();
  }

  public static getInstance(): CognitiveSelfEvaluation {
    if (!CognitiveSelfEvaluation.instance) {
      CognitiveSelfEvaluation.instance = new CognitiveSelfEvaluation();
    }
    return CognitiveSelfEvaluation.instance;
  }

  public static resetInstance(): void {
    CognitiveSelfEvaluation.instance = null;
  }

  private seedDefaultEvaluations(): void {
    const defaultEvals = [
      { id: 'eval-01', decId: 'dec-perf-stabilization-01', conf: 0.84, success: true, notes: 'DRS activation sustained 72 FPS successfully.' },
      { id: 'eval-02', decId: 'dec-tracking-kalman-02', conf: 0.78, success: true, notes: 'Kalman filtering smoothed optical jitter.' },
      { id: 'eval-03', decId: 'dec-mem-cleanup-03', conf: 0.90, success: false, notes: 'Texture cache purge caused 1-frame hitch.' },
      { id: 'eval-04', decId: 'dec-incident-suppress-04', conf: 0.72, success: true, notes: 'Suppression policy correctly filtered telemetry noise.' },
    ];

    defaultEvals.forEach((e) => {
      const brierLoss = Number(Math.pow(e.conf - (e.success ? 1 : 0), 2).toFixed(4));
      this.evaluations.set(e.id, {
        evaluationId: e.id,
        decisionId: e.decId,
        predictedConfidence: e.conf,
        actualOutcomeSuccess: e.success,
        brierLoss,
        feedbackNotes: e.notes,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Records an empirical evaluation of a past cognitive decision
   */
  public recordEvaluation(params: {
    decisionId: string;
    predictedConfidence: number;
    actualOutcomeSuccess: boolean;
    feedbackNotes: string;
  }): DecisionEvaluationRecord {
    const evaluationId = `eval-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const outcomeNumeric = params.actualOutcomeSuccess ? 1.0 : 0.0;
    const brierLoss = Number(Math.pow(params.predictedConfidence - outcomeNumeric, 2).toFixed(4));

    const record: DecisionEvaluationRecord = {
      evaluationId,
      decisionId: params.decisionId,
      predictedConfidence: Math.max(0.0, Math.min(1.0, params.predictedConfidence)),
      actualOutcomeSuccess: params.actualOutcomeSuccess,
      brierLoss,
      feedbackNotes: params.feedbackNotes,
      timestamp: new Date().toISOString(),
    };

    this.evaluations.set(evaluationId, record);
    return record;
  }

  /**
   * Computes the statistical confidence calibration metrics and discount factor
   */
  public getCalibrationMetrics(): ConfidenceCalibrationMetric {
    const evalList = Array.from(this.evaluations.values());
    if (evalList.length === 0) {
      return {
        totalEvaluations: 0,
        averageConfidence: 0.5,
        empiricalSuccessRate: 0.5,
        meanBrierScore: 0.25,
        calibrationBias: 'WELL_CALIBRATED',
        lastEvaluatedAt: new Date().toISOString(),
        suggestedDiscountFactor: 1.0,
      };
    }

    const total = evalList.length;
    const sumConf = evalList.reduce((acc, e) => acc + e.predictedConfidence, 0);
    const sumSuccess = evalList.filter((e) => e.actualOutcomeSuccess).length;
    const sumBrier = evalList.reduce((acc, e) => acc + e.brierLoss, 0);

    const averageConfidence = Number((sumConf / total).toFixed(3));
    const empiricalSuccessRate = Number((sumSuccess / total).toFixed(3));
    const meanBrierScore = Number((sumBrier / total).toFixed(4));

    // Calibration bias detection
    // If average confidence is significantly higher than empirical success, agent is OVERCONFIDENT.
    const diff = averageConfidence - empiricalSuccessRate;
    let calibrationBias: ConfidenceCalibrationMetric['calibrationBias'] = 'WELL_CALIBRATED';
    let suggestedDiscountFactor = 1.0;

    if (diff > 0.1) {
      calibrationBias = 'OVERCONFIDENT';
      suggestedDiscountFactor = Number(Math.max(0.65, 1.0 - diff).toFixed(2));
    } else if (diff < -0.1) {
      calibrationBias = 'UNDERCONFIDENT';
      suggestedDiscountFactor = Number(Math.min(1.25, 1.0 + Math.abs(diff)).toFixed(2));
    }

    return {
      totalEvaluations: total,
      averageConfidence,
      empiricalSuccessRate,
      meanBrierScore,
      calibrationBias,
      lastEvaluatedAt: new Date().toISOString(),
      suggestedDiscountFactor,
    };
  }

  /**
   * Safety Boundary Check: Verifies whether an autonomous action is eligible for self-authorization.
   * STRICT SAFETY RULE: High-impact actions or actions requiring human approval CANNOT be self-authorized.
   */
  public verifySelfAuthorizationEligibility(impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'): {
    canSelfAuthorize: boolean;
    reason: string;
  } {
    if (impactLevel === 'HIGH' || impactLevel === 'CRITICAL') {
      return {
        canSelfAuthorize: false,
        reason: `STRICT SAFETY GUARDRAIL: ${impactLevel} impact interventions require explicit human operator authorization. Self-authorization is strictly prohibited.`,
      };
    }

    return {
      canSelfAuthorize: true,
      reason: 'Low/Medium impact operational adjustment approved within bounded autonomous limits.',
    };
  }

  public getAllEvaluations(): DecisionEvaluationRecord[] {
    return Array.from(this.evaluations.values());
  }
}

export const cognitiveSelfEvaluation = CognitiveSelfEvaluation.getInstance();
