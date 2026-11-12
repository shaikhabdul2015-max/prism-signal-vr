/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 33 Test Suite: Predictive Intelligence, Cognitive Analytics & Decision Optimization Engine
 * Comprehensive verification of:
 * 1. PredictiveIntelligenceEngine (Historical telemetry ingestion, Holt linear forecasting, confidence intervals)
 * 2. CognitiveAnalyticsEngine (Multi-dimensional correlations, context reasoning, operational recommendations)
 * 3. TemporalPatternAnalysisEngine (Trend slope, volatility index, CUSUM change points, temporal anomalies)
 * 4. ScenarioForecastingEngine (Best / Expected / Worst divergent futures, assumption transparency, statistical probabilities)
 * 5. DecisionOptimizationEngine (Trade-off matrices, composite scoring, explainable justification, human approval gate)
 * 6. PredictiveRiskAssessmentEngine (Cadence stall, tracking loss, security risk integration, early-warning triggers)
 * 7. ConfidenceScoringEngine (Calibration against sample size, variance, physical sensor grounding)
 * 8. AdaptiveLearningEngine (Outcome correlation, MAE/MAPE error metrics, model versioning, degradation alerts)
 * 9. IntelligenceExplainabilityEngine (Factor contribution percentage, assumptions, provenance statements)
 * 10. PredictiveIntelligenceOrchestrator (Six-agent analytical consensus, event bus dispatch, persistence modes)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { PredictiveIntelligenceEngine } from '../src/engines/PredictiveIntelligenceEngine';
import { CognitiveAnalyticsEngine } from '../src/engines/CognitiveAnalyticsEngine';
import { TemporalPatternAnalysisEngine } from '../src/engines/TemporalPatternAnalysisEngine';
import { ScenarioForecastingEngine } from '../src/engines/ScenarioForecastingEngine';
import { DecisionOptimizationEngine } from '../src/engines/DecisionOptimizationEngine';
import { PredictiveRiskAssessmentEngine } from '../src/engines/PredictiveRiskAssessmentEngine';
import { ConfidenceScoringEngine } from '../src/engines/ConfidenceScoringEngine';
import { AdaptiveLearningEngine } from '../src/engines/AdaptiveLearningEngine';
import { IntelligenceExplainabilityEngine } from '../src/engines/IntelligenceExplainabilityEngine';
import { PredictiveIntelligenceOrchestrator } from '../src/engines/PredictiveIntelligenceOrchestrator';

describe('Phase 33: Predictive Intelligence & Decision Optimization Engine', () => {
  beforeEach(() => {
    PredictiveIntelligenceEngine.resetInstance();
    CognitiveAnalyticsEngine.resetInstance();
    TemporalPatternAnalysisEngine.resetInstance();
    ScenarioForecastingEngine.resetInstance();
    DecisionOptimizationEngine.resetInstance();
    PredictiveRiskAssessmentEngine.resetInstance();
    ConfidenceScoringEngine.resetInstance();
    AdaptiveLearningEngine.resetInstance();
    IntelligenceExplainabilityEngine.resetInstance();
    PredictiveIntelligenceOrchestrator.resetInstance();
  });

  describe('1. PredictiveIntelligenceEngine', () => {
    it('ingests telemetry, tracks historical buffer, and generates Holt linear trend forecasts', () => {
      const engine = PredictiveIntelligenceEngine.getInstance();
      
      const dummyTelemetry: any = {
        sessionId: 'test-session-01',
        frames: [{ frameDurationMs: 13.88 }], // ~72 FPS
        joints: Array.from({ length: 25 }, (_, i) => ({ jointName: `joint-${i}`, tracked: true })),
        latencySamples: [{ latencyMs: 14.1 }],
      };

      engine.ingestTelemetry(dummyTelemetry, true);
      const forecasts = engine.getAllForecasts();

      assert.ok(forecasts.length >= 3);
      const fpsSeries = forecasts.find((f) => f.metricKey === 'cadence_fps');
      assert.ok(fpsSeries);
      assert.ok(fpsSeries.forecast.length === 15);
      assert.ok(fpsSeries.lowerConfidenceBound.length === 15);
      assert.ok(fpsSeries.upperConfidenceBound.length === 15);
      assert.equal(fpsSeries.forecast[0].provenance, 'MODEL_GENERATED_PREDICTION');
    });

    it('enforces transparent provenance tiers across observed vs calculated vs predicted data', () => {
      const engine = PredictiveIntelligenceEngine.getInstance();

      const physicalTelemetry: any = {
        frames: [{ frameDurationMs: 13.88 }],
        joints: [{ jointName: 'wrist', tracked: true }],
      };

      // Ingest with physical hardware active
      engine.ingestTelemetry(physicalTelemetry, true);
      const history = engine.getHistory('cadence_fps');
      const latest = history[history.length - 1];
      assert.equal(latest.provenance, 'OBSERVED_DATA');

      // Ingest with simulation/preview mode
      engine.ingestTelemetry(physicalTelemetry, false);
      const historySim = engine.getHistory('cadence_fps');
      const latestSim = historySim[historySim.length - 1];
      assert.equal(latestSim.provenance, 'CALCULATED_INDICATOR');
    });
  });

  describe('2. CognitiveAnalyticsEngine', () => {
    it('analyzes multi-dimensional correlations between cadence and display latency', () => {
      const cognitive = CognitiveAnalyticsEngine.getInstance();
      const telemetry: any = {
        frames: [{ frameDurationMs: 14.0 }],
        joints: Array.from({ length: 25 }, (_, i) => ({ jointName: `joint-${i}`, tracked: true })),
        latencySamples: [{ latencyMs: 13.5 }],
      };

      const result = cognitive.analyzeTelemetryContext(telemetry, true);

      assert.ok(result.analysisId.startsWith('cog-'));
      assert.ok(result.crossCorrelations.length >= 2);
      assert.ok(result.identifiedPatterns.length > 0);
      assert.ok(result.operationalRecommendations.length > 0);
      assert.ok(result.contextSummary.includes('71 FPS') || result.contextSummary.includes('72 FPS'));
    });
  });

  describe('3. TemporalPatternAnalysisEngine', () => {
    it('detects trends, computes volatility index, and identifies change-points and anomalies', () => {
      const temporal = TemporalPatternAnalysisEngine.getInstance();

      // Create a series with a clear jump at index 10
      const now = Date.now();
      const series = Array.from({ length: 20 }, (_, i) => ({
        timestamp: new Date(now - (20 - i) * 1000).toISOString(),
        value: i < 10 ? 72 : 55, // Abrupt drop
        provenance: 'OBSERVED_DATA' as const,
      }));

      const pattern = temporal.analyzePattern('cadence_fps', series);

      assert.ok(pattern.trend === 'DECLINING' || pattern.trend === 'VOLATILE');
      assert.ok(pattern.changePoints.length > 0);
      assert.ok(pattern.volatilityIndex > 0);
      assert.equal(pattern.dataCompletenessPercent, 67); // 20 / 30 * 100
    });

    it('safely handles sparse or empty time series without throwing errors', () => {
      const temporal = TemporalPatternAnalysisEngine.getInstance();
      const pattern = temporal.analyzePattern('sparse_metric', []);

      assert.equal(pattern.trend, 'STABLE');
      assert.equal(pattern.trendSlope, 0);
      assert.equal(pattern.dataCompletenessPercent, 0);
    });
  });

  describe('4. ScenarioForecastingEngine', () => {
    it('generates divergent Best, Expected, and Worst case futures with explicit assumptions', () => {
      const scenEngine = ScenarioForecastingEngine.getInstance();
      const scenarios = scenEngine.generateScenarios([], 30);

      assert.equal(scenarios.length, 3);
      const types = scenarios.map((s) => s.type);
      assert.ok(types.includes('BEST_CASE'));
      assert.ok(types.includes('EXPECTED_CASE'));
      assert.ok(types.includes('WORST_CASE'));

      const best = scenarios.find((s) => s.type === 'BEST_CASE')!;
      assert.ok(best.assumptions.length > 0);
      assert.ok(best.limitingFactors.length > 0);
      assert.ok(best.potentialImpacts.length > 0);
      assert.equal(best.horizonSeconds, 30);
    });
  });

  describe('5. DecisionOptimizationEngine', () => {
    it('evaluates decision options, calculates composite score, and provides clear justification', () => {
      const decisionEngine = DecisionOptimizationEngine.getInstance();

      const rec = decisionEngine.evaluateDecision({
        topic: 'Optimize WebXR Audio Buffer Latency',
        options: [
          {
            optionId: 'opt-low-latency',
            title: 'Option 1: Aggressive Buffer Reduction',
            description: 'Reduce audio ring buffer to 128 frames for instant spatial acoustics.',
            targetSubsystem: 'SpatialAudio',
            operationalImpact: 'LOW',
            projectedBenefits: ['Sub-10ms spatial sound reaction'],
            projectedRisks: ['Possible crackling on older mobile chips'],
            tradeOffs: ['Trades memory headroom for latency'],
            costBenefitRatio: 2.5,
            compositeScore: 91.2,
            requiresHumanApproval: false,
          },
          {
            optionId: 'opt-standard-buffer',
            title: 'Option 2: Conservative Buffer',
            description: 'Maintain 512 frames buffer.',
            targetSubsystem: 'SpatialAudio',
            operationalImpact: 'LOW',
            projectedBenefits: ['Guaranteed audio continuity'],
            projectedRisks: ['Slight 25ms acoustic delay'],
            tradeOffs: ['Zero acoustic crackle'],
            costBenefitRatio: 1.2,
            compositeScore: 75.0,
            requiresHumanApproval: false,
          },
        ],
      });

      assert.ok(rec.recommendationId.startsWith('rec-'));
      assert.equal(rec.recommendedOptionId, 'opt-low-latency');
      assert.ok(rec.justification.includes('Option 1'));
      assert.equal(rec.approvalState, 'NOT_REQUIRED');
    });

    it('requires human operator approval for high-impact operational decisions', () => {
      const decisionEngine = DecisionOptimizationEngine.getInstance();

      const rec = decisionEngine.evaluateDecision({
        topic: 'Emergency Chamber Shutdown',
        options: [
          {
            optionId: 'opt-emergency-abort',
            title: 'Emergency Abort',
            description: 'Halt all laser emitters and reset chamber crystals.',
            targetSubsystem: 'ChamberCore',
            operationalImpact: 'HIGH',
            projectedBenefits: ['Prevents hardware overload'],
            projectedRisks: ['Abrupt session termination'],
            tradeOffs: ['Total session interruption'],
            costBenefitRatio: 3.0,
            compositeScore: 95.0,
            requiresHumanApproval: true,
          },
        ],
      });

      assert.equal(rec.approvalState, 'PENDING_APPROVAL');

      // Operator authorizes
      const approved = decisionEngine.submitHumanDecision(rec.recommendationId, true, 'Lead Director');
      assert.equal(approved, true);

      const refreshed = decisionEngine.getRecommendation(rec.recommendationId);
      assert.equal(refreshed?.approvalState, 'APPROVED');
      assert.equal(refreshed?.approvedBy, 'Lead Director');
    });
  });

  describe('6. PredictiveRiskAssessmentEngine', () => {
    it('assesses operational risks and triggers early warnings when metrics degrade', () => {
      const riskEngine = PredictiveRiskAssessmentEngine.getInstance();

      // Nominal conditions
      const nominal = riskEngine.evaluatePredictiveRisks({
        currentFps: 72,
        trackedJoints: 25,
        latencyMs: 13.5,
      });
      const nominalCadence = nominal.find((r) => r.category === 'CADENCE_STALL');
      assert.equal(nominalCadence?.earlyWarningTriggered, false);
      assert.equal(nominalCadence?.severity, 'LOW');

      // Degraded conditions
      const degraded = riskEngine.evaluatePredictiveRisks({
        currentFps: 48, // Below 55 FPS ceiling
        trackedJoints: 14, // Severe occlusion
        latencyMs: 24.5,
      });

      const degradedCadence = degraded.find((r) => r.category === 'CADENCE_STALL');
      assert.equal(degradedCadence?.earlyWarningTriggered, true);
      assert.equal(degradedCadence?.severity, 'HIGH');
      assert.equal(degradedCadence?.trend, 'RISING');

      const degradedTracking = degraded.find((r) => r.category === 'TRACKING_LOSS');
      assert.equal(degradedTracking?.earlyWarningTriggered, true);
    });
  });

  describe('7. ConfidenceScoringEngine', () => {
    it('calibrates raw confidence against historical sample count and telemetry variance', () => {
      const scorer = ConfidenceScoringEngine.getInstance();

      // Robust physical dataset
      const robust = scorer.calibrateConfidence({
        rawConfidence: 95,
        sampleCount: 40,
        varianceIndex: 12,
        isPhysicalHardware: true,
      });
      assert.ok(robust.calibratedScore >= 90);
      assert.equal(robust.qualityRating, 'HIGH');

      // Sparse simulated dataset with high volatility
      const sparse = scorer.calibrateConfidence({
        rawConfidence: 95,
        sampleCount: 4,
        varianceIndex: 55,
        isPhysicalHardware: false,
      });
      assert.ok(sparse.calibratedScore < 70);
      assert.equal(sparse.qualityRating, 'SPARSE');
    });
  });

  describe('8. AdaptiveLearningEngine', () => {
    it('tracks prediction error metrics and flags degradation when MAPE threshold is breached', () => {
      const adapt = AdaptiveLearningEngine.getInstance();

      // Accurate prediction
      const rec1 = adapt.recordOutcome({
        predictionId: 'test-p-01',
        metricKey: 'cadence_fps',
        predictedValue: 71.0,
        actualObservedValue: 71.2,
      });
      assert.equal(rec1.degradationAlert, false);
      assert.ok(rec1.errorPercentage! < 2.0);

      // Severely inaccurate prediction (breaches 15% threshold)
      const rec2 = adapt.recordOutcome({
        predictionId: 'test-p-02',
        metricKey: 'cadence_fps',
        predictedValue: 72.0,
        actualObservedValue: 50.0, // 44% error
      });
      assert.equal(rec2.degradationAlert, true);
      assert.ok(rec2.errorPercentage! > 15.0);

      const stats = adapt.getAccuracyStatistics();
      assert.ok(stats.totalEvaluations >= 2);
      assert.ok(stats.meanAbsoluteError > 0);
    });
  });

  describe('9. IntelligenceExplainabilityEngine', () => {
    it('generates transparent explainability dossiers with contributing factor breakdowns', () => {
      const expl = IntelligenceExplainabilityEngine.getInstance();
      const dossier = expl.explainForecast({
        metricKey: 'cadence_fps',
        sampleCount: 35,
        varianceIndex: 15,
        isPhysicalHardware: true,
      });

      assert.ok(dossier.predictionId.startsWith('exp-'));
      assert.equal(dossier.calculationMethod, 'EXPONENTIAL_SMOOTHING');
      assert.ok(dossier.contributingFactors.length > 0);
      assert.ok(dossier.keyAssumptions.length > 0);
      assert.ok(dossier.provenanceStatement.includes('physical WebXR'));
    });
  });

  describe('10. PredictiveIntelligenceOrchestrator', () => {
    it('coordinates the full live predictive cycle and synthesizes 6-agent analytical consensus', () => {
      const orchestrator = PredictiveIntelligenceOrchestrator.getInstance();

      const telemetry: any = {
        frames: [{ frameDurationMs: 13.88 }],
        joints: Array.from({ length: 25 }, (_, i) => ({ jointName: `j-${i}`, tracked: true })),
        latencySamples: [{ latencyMs: 14.0 }],
      };

      const state = orchestrator.processLiveCycle(telemetry, true);

      assert.ok(state.forecasts.length >= 3);
      assert.ok(state.temporalPatterns.length >= 3);
      assert.ok(state.scenarios.length === 3);
      assert.ok(state.activeRecommendations.length > 0);
      assert.ok(state.riskIndicators.length >= 4);

      // Verify Six Agents in consensus
      assert.ok(state.agentConsensus);
      assert.equal(state.agentConsensus?.agentContributions.length, 6);
      const roles = state.agentConsensus?.agentContributions.map((c) => c.agentRole);
      assert.ok(roles?.includes('OperationsAgent'));
      assert.ok(roles?.includes('TestAgent'));
      assert.ok(roles?.includes('TrackingAgent'));
      assert.ok(roles?.includes('PerformanceAgent'));
      assert.ok(roles?.includes('IncidentAgent'));
      assert.ok(roles?.includes('ChiefIntelligenceAgent'));

      assert.equal(state.agentConsensus?.overallHealthForecast, 'OPTIMAL');
    });
  });
});
