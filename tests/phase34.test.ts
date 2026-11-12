/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 34: Autonomous Intelligence Evolution & Self-Optimization Engine Test Suite
 * Exhaustively validates all 10 engines, 9 lifecycle stages, multi-horizon AI evaluation,
 * Zero-Trust security invariance, automated rollback triggers, and 6-agent consensus.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { SystemPerformanceIntelligence } from '../src/engines/SystemPerformanceIntelligence';
import { SelfOptimizationEngine } from '../src/engines/SelfOptimizationEngine';
import { AIModelEvaluationEngine } from '../src/engines/AIModelEvaluationEngine';
import { AdaptiveResourceManagementEngine } from '../src/engines/AdaptiveResourceManagementEngine';
import { OptimizationRecommendationEngine } from '../src/engines/OptimizationRecommendationEngine';
import { OptimizationValidationEngine } from '../src/engines/OptimizationValidationEngine';
import { OptimizationRollbackEngine } from '../src/engines/OptimizationRollbackEngine';
import { ContinuousLearningOrchestrator } from '../src/engines/ContinuousLearningOrchestrator';
import { AutonomousIntelligenceEvolutionEngine } from '../src/engines/AutonomousIntelligenceEvolutionEngine';
import { IntelligenceEvolutionCoordinator } from '../src/engines/IntelligenceEvolutionCoordinator';
import { OptimizationRecommendation } from '../src/types/phase34';

describe('Phase 34: Autonomous Intelligence Evolution & Self-Optimization Subsystem', () => {
  beforeEach(() => {
    SystemPerformanceIntelligence.resetInstance();
    SelfOptimizationEngine.resetInstance();
    AIModelEvaluationEngine.resetInstance();
    AdaptiveResourceManagementEngine.resetInstance();
    OptimizationRecommendationEngine.resetInstance();
    OptimizationValidationEngine.resetInstance();
    OptimizationRollbackEngine.resetInstance();
    ContinuousLearningOrchestrator.resetInstance();
    AutonomousIntelligenceEvolutionEngine.resetInstance();
    IntelligenceEvolutionCoordinator.resetInstance();
  });

  describe('1. SystemPerformanceIntelligence Engine', () => {
    it('captures performance snapshot without fabricating CPU or memory', () => {
      const engine = SystemPerformanceIntelligence.getInstance();
      const snapshot = engine.captureSnapshot();

      assert.ok(snapshot.timestamp);
      assert.ok(typeof snapshot.apiResponseLatencyMs === 'number');
      assert.ok(typeof snapshot.renderCadenceFps === 'number');
      assert.ok(typeof snapshot.cacheHitRatioPercent === 'number');
      assert.equal(snapshot.activeAgentsCount, 6);

      // Memory strictly checks real browser availability
      if (snapshot.isMemoryMeasured) {
        assert.ok(typeof snapshot.measuredMemoryMb === 'number');
      } else {
        assert.equal(snapshot.measuredMemoryMb, null);
      }
    });

    it('identifies bottlenecks when metrics exceed operational thresholds', () => {
      const engine = SystemPerformanceIntelligence.getInstance();
      const stressedSnapshot = engine.captureSnapshot({
        apiResponseLatencyMs: 450, // > 300
        renderCadenceFps: 35, // < 45
        queueDepth: 18, // > 10
      });

      assert.ok(stressedSnapshot.activeBottlenecks.length >= 3);
      assert.ok(stressedSnapshot.activeBottlenecks.some((b) => b.includes('API_LATENCY_ELEVATED')));
      assert.ok(stressedSnapshot.activeBottlenecks.some((b) => b.includes('RENDER_CADENCE_DEGRADED')));
      assert.ok(stressedSnapshot.activeBottlenecks.some((b) => b.includes('TASK_QUEUE_BACKLOG')));
    });

    it('records metric samples in sliding window history', () => {
      const engine = SystemPerformanceIntelligence.getInstance();
      engine.captureSnapshot();
      const history = engine.getHistory();
      assert.ok(history.length >= 3);
      assert.equal(history[0].type, 'MEASURED_METRIC');
    });
  });

  describe('2. SelfOptimizationEngine', () => {
    it('initializes controlled runtime configuration across 8 domains', () => {
      const engine = SelfOptimizationEngine.getInstance();
      const config = engine.getCurrentConfig();

      assert.ok(config.version.startsWith('v34.'));
      assert.equal(config.parameters['aiRouting.primaryProvider'], 'GEMINI_SERVER_PROXY');
      assert.equal(config.parameters['taskScheduling.maxConcurrency'], 8);
      assert.equal(config.parameters['caching.cacheTtlSeconds'], 180);
      assert.equal(config.parameters['rendering.dynamicResolutionThresholdFps'], 45);
    });

    it('applies validated configuration changes and increments patch version', () => {
      const engine = SelfOptimizationEngine.getInstance();
      const initialVersion = engine.getCurrentConfig().version;

      const result = engine.applyValidatedChange('caching.cacheTtlSeconds', 300, 'Test TTL increase');
      assert.equal(result.success, true);
      assert.notEqual(result.newVersion, initialVersion);
      assert.equal(engine.getParameterValue('caching.cacheTtlSeconds'), 300);

      const history = engine.getConfigHistory();
      assert.equal(history.length, 1);
      assert.equal(history[0].key, 'caching.cacheTtlSeconds');
      assert.equal(history[0].oldValue, 180);
      assert.equal(history[0].newValue, 300);
    });

    it('rolls back parameter change and records audit entry', () => {
      const engine = SelfOptimizationEngine.getInstance();
      engine.applyValidatedChange('taskScheduling.maxConcurrency', 12);
      assert.equal(engine.getParameterValue('taskScheduling.maxConcurrency'), 12);

      const rollbackResult = engine.rollbackChange('taskScheduling.maxConcurrency', 8, 'Performance test revert');
      assert.equal(rollbackResult.success, true);
      assert.equal(engine.getParameterValue('taskScheduling.maxConcurrency'), 8);

      const history = engine.getConfigHistory();
      assert.equal(history.length, 2);
      assert.equal(history[1].newValue, 8);
    });
  });

  describe('3. AIModelEvaluationEngine & Horizon Validation', () => {
    it('evaluates models and detects Holt-Linear degradation under short 15s window', () => {
      const engine = AIModelEvaluationEngine.getInstance();
      const evals = engine.getAllEvaluations();
      assert.ok(evals.length >= 4);

      const holt15 = evals.find((e) => e.modelId === 'holt-linear-15s');
      assert.ok(holt15);
      assert.equal(holt15.evaluatedHorizon, 'SHORT_15S');
      assert.equal(holt15.degradationDetected, true);
      assert.ok(holt15.recommendedAction?.includes('30s') || holt15.recommendedAction?.includes('CUSUM'));

      const holt30 = evals.find((e) => e.modelId === 'holt-linear-30s');
      assert.ok(holt30);
      assert.equal(holt30.evaluatedHorizon, 'MEDIUM_30S');
      assert.equal(holt30.degradationDetected, false);
    });

    it('evaluates custom time series data across horizons and computes MAE/MAPE', () => {
      const engine = AIModelEvaluationEngine.getInstance();
      const actuals = [100, 102, 105, 107, 110];
      const preds = [98, 101, 104, 108, 109];

      const report = engine.evaluateAlgorithmHorizon('custom-test-algo', 'MEDIUM_30S', actuals, preds);
      assert.equal(report.modelId, 'custom-test-algo');
      assert.equal(report.evaluatedHorizon, 'MEDIUM_30S');
      assert.ok(report.meanAbsoluteError > 0);
      assert.ok(report.meanAbsolutePercentageError < 5.0);
      assert.equal(report.degradationDetected, false);
    });
  });

  describe('4. AdaptiveResourceManagementEngine', () => {
    it('proposes bounded resource adjustments when load bottlenecks are detected', () => {
      const engine = AdaptiveResourceManagementEngine.getInstance();
      const selfOpt = SelfOptimizationEngine.getInstance();

      const stressedSnapshot = SystemPerformanceIntelligence.getInstance().captureSnapshot({
        renderCadenceFps: 40,
        renderFrameDropPercent: 6.0,
      });

      const proposals = engine.evaluateResourceNeeds(stressedSnapshot, selfOpt.getCurrentConfig().parameters);
      assert.ok(proposals.length > 0);

      const renderProp = proposals.find((p) => p.targetDomain === 'RENDER_RESOLUTION');
      assert.ok(renderProp);
      assert.ok(renderProp.recommendedValue >= renderProp.safetyBounds.min);
      assert.ok(renderProp.recommendedValue <= renderProp.safetyBounds.max);
    });
  });

  describe('5. OptimizationRecommendationEngine', () => {
    it('provides evidence-based recommendations with risk profile and rollback metric', () => {
      const engine = OptimizationRecommendationEngine.getInstance();
      const recs = engine.getAllRecommendations();
      assert.ok(recs.length >= 3);

      const rec = recs[0];
      assert.ok(rec.recommendationId);
      assert.ok(rec.supportingEvidence.length > 0);
      assert.ok(rec.expectedBenefit);
      assert.ok(rec.potentialRisks.length > 0);
      assert.ok(rec.rollbackThresholdMetric);
      assert.ok(typeof rec.rollbackThresholdValue === 'number');
    });

    it('generates dynamic recommendations from proposals', () => {
      const engine = OptimizationRecommendationEngine.getInstance();
      const snapshot = SystemPerformanceIntelligence.getInstance().getLatestSnapshot();
      const dynamicRecs = engine.generateFromProposals(
        [
          {
            targetDomain: 'CACHE_HORIZON',
            configKey: 'caching.cacheTtlSeconds',
            currentValue: 180,
            recommendedValue: 240,
            rationale: 'Telemetry query cache optimization',
            safetyBounds: { min: 30, max: 600 },
          },
        ],
        [],
        snapshot
      );

      assert.equal(dynamicRecs.length, 1);
      assert.equal(dynamicRecs[0].domain, 'CACHING_POLICIES');
      assert.equal(dynamicRecs[0].targetConfigKey, 'caching.cacheTtlSeconds');
      assert.equal(dynamicRecs[0].proposedValue, 240);
    });
  });

  describe('6. OptimizationValidationEngine & Zero-Trust Safety Invariance', () => {
    it('passes validation for safe, bounded recommendations', () => {
      const valEngine = OptimizationValidationEngine.getInstance();
      const safeRec: OptimizationRecommendation = {
        recommendationId: 'rec-test-safe',
        domain: 'CACHING_POLICIES',
        title: 'Safe Cache TTL Increase',
        problemDescription: 'Slightly low cache hit ratio',
        supportingEvidence: ['Evidence A'],
        expectedBenefit: 'Higher hit ratio',
        potentialRisks: ['Minor heap consumption'],
        resourceRequirements: '<1MB',
        confidenceScore: 90,
        priority: 'MEDIUM',
        targetConfigKey: 'caching.cacheTtlSeconds',
        currentValue: 180,
        proposedValue: 240,
        validationCriteria: ['Bounded between 30 and 600'],
        rollbackThresholdMetric: 'cacheHitRatioPercent',
        rollbackThresholdValue: 80,
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      };

      const report = valEngine.validateRecommendation(safeRec);
      assert.equal(report.overallValidationPassed, true);
      assert.equal(report.securityCompliant, true);
      assert.equal(report.resourceConstraintsSatisfied, true);
      assert.equal(report.schemaValid, true);
    });

    it('CRITICAL ZERO-TRUST INVARIANT: Rejects recommendations that target security or auth parameters', () => {
      const valEngine = OptimizationValidationEngine.getInstance();
      const maliciousSecurityRec: OptimizationRecommendation = {
        recommendationId: 'rec-test-security-breach',
        domain: 'RETRY_TIMEOUT_POLICIES',
        title: 'Tamper With Security Auth Token Bypass',
        problemDescription: 'Attempt to weaken auth token verification for speed',
        supportingEvidence: ['Speed boost claim'],
        expectedBenefit: 'Saves 2ms',
        potentialRisks: ['Critical vulnerability'],
        resourceRequirements: 'None',
        confidenceScore: 50,
        priority: 'CRITICAL',
        targetConfigKey: 'security.authTokenBypassAllowed', // Tampering with security
        currentValue: false,
        proposedValue: true,
        validationCriteria: ['Criteria'],
        rollbackThresholdMetric: 'apiSuccessRatePercent',
        rollbackThresholdValue: 90,
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      };

      const report = valEngine.validateRecommendation(maliciousSecurityRec);
      assert.equal(report.securityCompliant, false);
      assert.equal(report.overallValidationPassed, false);
      assert.ok(report.checks.some((c) => c.checkId === 'CHK-SEC-02' && !c.passed));
    });

    it('rejects proposed parameters that violate safe envelope bounds', () => {
      const valEngine = OptimizationValidationEngine.getInstance();
      const outOfBoundsRec: OptimizationRecommendation = {
        recommendationId: 'rec-test-bounds',
        domain: 'TASK_SCHEDULING',
        title: 'Dangerous Concurrency Ceiling',
        problemDescription: 'Excessive concurrency',
        supportingEvidence: ['Evidence'],
        expectedBenefit: 'Maximum throughput',
        potentialRisks: ['Browser thread lockup'],
        resourceRequirements: 'High',
        confidenceScore: 60,
        priority: 'HIGH',
        targetConfigKey: 'taskScheduling.maxConcurrency',
        currentValue: 8,
        proposedValue: 64, // Bounds are [2, 16]
        validationCriteria: ['Bounded'],
        rollbackThresholdMetric: 'renderCadenceFps',
        rollbackThresholdValue: 45,
        status: 'PROPOSED',
        createdAt: new Date().toISOString(),
      };

      const report = valEngine.validateRecommendation(outOfBoundsRec);
      assert.equal(report.resourceConstraintsSatisfied, false);
      assert.equal(report.overallValidationPassed, false);
    });
  });

  describe('7. OptimizationRollbackEngine', () => {
    it('detects performance degradation > 10% and triggers automatic rollback', () => {
      const rollbackEngine = OptimizationRollbackEngine.getInstance();
      const selfOpt = SelfOptimizationEngine.getInstance();

      selfOpt.applyValidatedChange('taskScheduling.maxConcurrency', 14);

      const rec: OptimizationRecommendation = {
        recommendationId: 'rec-test-rollback',
        domain: 'TASK_SCHEDULING',
        title: 'Scale Concurrency',
        problemDescription: 'Scaling test',
        supportingEvidence: ['Ev'],
        expectedBenefit: 'Speed',
        potentialRisks: ['Contention'],
        resourceRequirements: 'Low',
        confidenceScore: 85,
        priority: 'HIGH',
        targetConfigKey: 'taskScheduling.maxConcurrency',
        currentValue: 8,
        proposedValue: 14,
        validationCriteria: ['Valid'],
        rollbackThresholdMetric: 'apiResponseLatencyMs',
        rollbackThresholdValue: 250,
        status: 'APPLIED',
        createdAt: new Date().toISOString(),
      };

      const baselineSnapshot = SystemPerformanceIntelligence.getInstance().captureSnapshot({
        apiResponseLatencyMs: 150,
      });

      // Simulated degraded measurement: 280ms (> 250 threshold and > 10% above 150)
      const degradedSnapshot = SystemPerformanceIntelligence.getInstance().captureSnapshot({
        apiResponseLatencyMs: 280,
      });

      const outcome = rollbackEngine.evaluatePostMeasurement(rec, baselineSnapshot, degradedSnapshot);
      assert.equal(outcome.regressionDetected, true);
      assert.ok(outcome.rollbackRecord);
      assert.equal(outcome.rollbackRecord.triggeredBy, 'AUTOMATIC_REGRESSION_DETECTION');
      assert.equal(selfOpt.getParameterValue('taskScheduling.maxConcurrency'), 8); // Restored
    });

    it('executes operator manual override rollback', () => {
      const rollbackEngine = OptimizationRollbackEngine.getInstance();
      const selfOpt = SelfOptimizationEngine.getInstance();

      selfOpt.applyValidatedChange('caching.cacheTtlSeconds', 300);

      const rec: OptimizationRecommendation = {
        recommendationId: 'rec-manual-test',
        domain: 'CACHING_POLICIES',
        title: 'Cache TTL',
        problemDescription: 'Desc',
        supportingEvidence: ['Ev'],
        expectedBenefit: 'Ben',
        potentialRisks: ['Risk'],
        resourceRequirements: 'None',
        confidenceScore: 90,
        priority: 'MEDIUM',
        targetConfigKey: 'caching.cacheTtlSeconds',
        currentValue: 180,
        proposedValue: 300,
        validationCriteria: ['Crit'],
        rollbackThresholdMetric: 'cacheHitRatioPercent',
        rollbackThresholdValue: 80,
        status: 'APPLIED',
        createdAt: new Date().toISOString(),
      };

      const record = rollbackEngine.executeRollback(
        rec,
        'OPERATOR_MANUAL_OVERRIDE',
        'Manual operator emergency revert',
        75,
        88.5
      );

      assert.equal(record.triggeredBy, 'OPERATOR_MANUAL_OVERRIDE');
      assert.equal(record.rollbackSuccessful, true);
      assert.equal(selfOpt.getParameterValue('caching.cacheTtlSeconds'), 180);
    });
  });

  describe('8. ContinuousLearningOrchestrator', () => {
    it('aggregates outcomes and maintains accurate learning progress and success rate', () => {
      const engine = ContinuousLearningOrchestrator.getInstance();
      const progressBefore = engine.getLearningProgress();

      engine.recordOptimizationOutcome('rec-01', 'CACHING_POLICIES', 'caching.cacheTtlSeconds', true, 'Stable');
      const progressAfter = engine.getLearningProgress();

      assert.equal(progressAfter.learningIteration, progressBefore.learningIteration + 1);
      assert.equal(progressAfter.successfulOptimizationsCount, progressBefore.successfulOptimizationsCount + 1);
      assert.ok(progressAfter.optimizationSuccessRatePercent > 0);
    });
  });

  describe('9. AutonomousIntelligenceEvolutionEngine Full Lifecycle', () => {
    it('runs observation cycle through OBSERVE -> ANALYZE -> IDENTIFY -> RECOMMEND', () => {
      const engine = AutonomousIntelligenceEvolutionEngine.getInstance();
      const result = engine.runObservationCycle();

      assert.equal(result.stage, 'RECOMMEND');
      assert.ok(result.snapshot);
      assert.ok(result.recommendationsCount >= 3);
    });

    it('transitions through VALIDATE, REQUEST_APPROVAL, APPLY, MEASURE, and SUCCESS', () => {
      const engine = AutonomousIntelligenceEvolutionEngine.getInstance();
      const recEngine = OptimizationRecommendationEngine.getInstance();
      const allRecs = recEngine.getAllRecommendations();
      const targetRec = allRecs[0];

      // 1. Validate
      const valReport = engine.validateRecommendation(targetRec.recommendationId);
      assert.equal(valReport.overallValidationPassed, true);
      assert.equal(engine.getCurrentStage(), 'REQUEST_APPROVAL');

      // 2. Apply with operator approval
      const applyResult = engine.applyApprovedOptimization(targetRec.recommendationId, 'OPERATOR-TEST-CHIEF');
      assert.equal(applyResult.success, true);
      assert.equal(engine.getCurrentStage(), 'MEASURE');

      // 3. Confirm stability in measure
      const measureResult = engine.evaluateMeasurementOutcome(targetRec.recommendationId);
      assert.equal(measureResult.outcome, 'SUCCESS');
      assert.equal(engine.getCurrentStage(), 'OBSERVE'); // Returned to baseline observation
    });
  });

  describe('10. IntelligenceEvolutionCoordinator & 6-Agent Consensus', () => {
    it('synthesizes consensus across all 6 specialist AI agents', () => {
      const coordinator = IntelligenceEvolutionCoordinator.getInstance();
      const consensus = coordinator.evaluateAgentConsensus();

      assert.ok(consensus.consensusId);
      assert.equal(consensus.agentContributions.length, 6);

      const roles = consensus.agentContributions.map((c) => c.agentRole);
      assert.ok(roles.includes('OperationsAgent'));
      assert.ok(roles.includes('TestAgent'));
      assert.ok(roles.includes('TrackingAgent'));
      assert.ok(roles.includes('PerformanceAgent'));
      assert.ok(roles.includes('IncidentAgent'));
      assert.ok(roles.includes('ChiefIntelligenceAgent'));

      assert.ok(consensus.consensusAgreementPercent >= 80);
      assert.ok(consensus.strategicDirective.length > 0);
    });

    it('produces complete dashboard state and dispatches distributed events', () => {
      const coordinator = IntelligenceEvolutionCoordinator.getInstance();
      const state = coordinator.getState();

      assert.ok(state.currentStage);
      assert.ok(state.systemPerformance);
      assert.ok(state.modelEvaluations.length > 0);
      assert.ok(state.recommendations.length > 0);
      assert.ok(state.learningProgress);
      assert.ok(state.activeConfiguration);
      assert.equal(state.persistenceMode, 'LOCAL_DEVELOPMENT');

      // Test broadcasting event
      coordinator.broadcastEvolutionEvent('OPTIMIZATION_CYCLE_EVALUATED', { cycle: 'TEST_01' });
    });
  });
});
