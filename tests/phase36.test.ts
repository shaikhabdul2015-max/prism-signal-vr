/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 36: Unified Superintelligence Command Center & System-Wide Orchestration Test Suite
 * Comprehensive test coverage validating all 11 engines, engine registry, 9-stage mission lifecycle,
 * executive 6-agent council, circuit breakers, component health, security governance,
 * global performance metrics, and structured system readiness assessment.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { UnifiedIntelligenceOrchestrator } from '../src/engines/UnifiedIntelligenceOrchestrator';
import { GlobalIntelligenceStateManager } from '../src/engines/GlobalIntelligenceStateManager';
import { CrossEngineIntegrationEngine } from '../src/engines/CrossEngineIntegrationEngine';
import { SystemWideCoordinationEngine } from '../src/engines/SystemWideCoordinationEngine';
import { UnifiedMissionOrchestrator } from '../src/engines/UnifiedMissionOrchestrator';
import { ExecutiveAgentCouncil } from '../src/engines/ExecutiveAgentCouncil';
import { SystemHealthIntelligenceEngine } from '../src/engines/SystemHealthIntelligenceEngine';
import { UnifiedSecurityGovernanceEngine } from '../src/engines/UnifiedSecurityGovernanceEngine';
import { GlobalPerformanceIntelligence } from '../src/engines/GlobalPerformanceIntelligence';
import { SystemReadinessEngine } from '../src/engines/SystemReadinessEngine';
import { Phase36IntegrationCoordinator } from '../src/engines/Phase36IntegrationCoordinator';

describe('Phase 36: Unified Superintelligence Command Center Subsystem', () => {
  beforeEach(() => {
    UnifiedIntelligenceOrchestrator.resetInstance();
    GlobalIntelligenceStateManager.resetInstance();
    CrossEngineIntegrationEngine.resetInstance();
    SystemWideCoordinationEngine.resetInstance();
    UnifiedMissionOrchestrator.resetInstance();
    ExecutiveAgentCouncil.resetInstance();
    SystemHealthIntelligenceEngine.resetInstance();
    UnifiedSecurityGovernanceEngine.resetInstance();
    GlobalPerformanceIntelligence.resetInstance();
    SystemReadinessEngine.resetInstance();
    Phase36IntegrationCoordinator.resetInstance();
  });

  describe('1. UnifiedIntelligenceOrchestrator', () => {
    it('registers all 9 core domain engines and tracks capabilities', () => {
      const orchestrator = UnifiedIntelligenceOrchestrator.getInstance();
      const engines = orchestrator.getAllEngines();
      assert.ok(engines.length >= 9);

      const strategic = orchestrator.getEngine('eng-p27-strategic');
      assert.ok(strategic);
      assert.equal(strategic.domain, 'CORE_ORCHESTRATION');

      const webxr = orchestrator.getEngine('eng-p29-webxr-reality');
      assert.ok(webxr);
      assert.equal(webxr.domain, 'WEBXR_SPATIAL');

      const knowledge = orchestrator.getEngine('eng-p35-universal-knowledge');
      assert.ok(knowledge);
      assert.equal(knowledge.domain, 'UNIVERSAL_KNOWLEDGE');
    });

    it('discovers healthy engines matching required capability', () => {
      const orchestrator = UnifiedIntelligenceOrchestrator.getInstance();
      const matching = orchestrator.discoverEnginesWithCapability('HOLT_LINEAR_SMOOTHING');
      assert.ok(matching.length > 0);
      assert.equal(matching[0].engineId, 'eng-p33-predictive-decision');
    });

    it('dispatches cross-engine tasks with correlation IDs and logs orchestration history', () => {
      const orchestrator = UnifiedIntelligenceOrchestrator.getInstance();
      const task = orchestrator.dispatchTask({
        initiatingEngineId: 'eng-p28-mission-exec',
        targetEngineId: 'eng-p35-universal-knowledge',
        taskType: 'KNOWLEDGE_RETRIEVAL',
        payload: { query: 'crystal beacon resonance' },
      });

      assert.ok(task.taskId);
      assert.ok(task.correlationId);
      assert.equal(task.status, 'COMPLETED');

      const history = orchestrator.getOrchestrationHistory();
      assert.ok(history.length >= 1);
      assert.equal(history[0].taskId, task.taskId);
    });
  });

  describe('2. GlobalIntelligenceStateManager', () => {
    it('provides single source of truth for application intelligence state', () => {
      const stateManager = GlobalIntelligenceStateManager.getInstance();
      const state = stateManager.getState();

      assert.ok(state.registeredEngines.length >= 9);
      assert.ok(state.activeMissions.length >= 2);
      assert.ok(state.executiveReport.consensusAgreementPercent >= 80);
      assert.ok(state.systemHealth);
      assert.ok(state.securityGovernance.zeroTrustEnforced);
      assert.equal(state.persistenceMode, 'LOCAL_DEVELOPMENT');
    });

    it('manages persistence mode transitions truthfully', () => {
      const stateManager = GlobalIntelligenceStateManager.getInstance();
      stateManager.setPersistenceMode('OFFLINE_FALLBACK');
      assert.equal(stateManager.getPersistenceMode(), 'OFFLINE_FALLBACK');
      assert.equal(stateManager.getState().persistenceMode, 'OFFLINE_FALLBACK');
    });
  });

  describe('3. CrossEngineIntegrationEngine & Circuit Breakers', () => {
    it('executes cross-engine operations through circuit breaker protection', () => {
      const crossEngine = CrossEngineIntegrationEngine.getInstance();
      const task = crossEngine.executeCrossEngineOperation(
        'eng-p27-strategic',
        'eng-p30-sensor-intel',
        'CADENCE_VERIFY',
        { targetFps: 60 }
      );

      assert.ok(task.taskId);
      assert.equal(task.status, 'COMPLETED');

      const breaker = crossEngine.getCircuitBreaker('eng-p30-sensor-intel');
      assert.equal(breaker.state, 'CLOSED');
      assert.equal(breaker.consecutiveFailures, 0);
    });

    it('trips circuit breaker to OPEN when consecutive failures exceed threshold', () => {
      const crossEngine = CrossEngineIntegrationEngine.getInstance();
      const ghostEngine = 'eng-ghost-failing-404';

      // 3 consecutive failures
      crossEngine.executeCrossEngineOperation('eng-test', ghostEngine, 'CALL_1', {});
      crossEngine.executeCrossEngineOperation('eng-test', ghostEngine, 'CALL_2', {});
      crossEngine.executeCrossEngineOperation('eng-test', ghostEngine, 'CALL_3', {});

      const breaker = crossEngine.getCircuitBreaker(ghostEngine);
      assert.equal(breaker.state, 'OPEN');

      // Subsequent call is blocked by circuit breaker
      const blockedTask = crossEngine.executeCrossEngineOperation('eng-test', ghostEngine, 'CALL_4', {});
      assert.equal(blockedTask.status, 'CIRCUIT_BROKEN');
      assert.ok(blockedTask.errorReason?.includes('Circuit breaker OPEN'));
    });
  });

  describe('4. UnifiedMissionOrchestrator 9-Stage Lifecycle', () => {
    it('manages the 9-stage mission lifecycle with progress monotonicity', () => {
      const orchestrator = UnifiedMissionOrchestrator.getInstance();
      const mission = orchestrator.createMission({
        title: 'Phase 36 Alignment Mission',
        objective: 'Test complete 9-stage lifecycle progression',
        priority: 'HIGH',
      });

      assert.equal(mission.stage, 'MISSION_CREATED');
      assert.equal(mission.progressPercent, 10);

      // Advance through stages
      orchestrator.advanceMissionStage(mission.missionId, 'OBJECTIVES_VALIDATED');
      assert.equal(orchestrator.getMission(mission.missionId)?.stage, 'OBJECTIVES_VALIDATED');
      assert.equal(orchestrator.getMission(mission.missionId)?.progressPercent, 25);

      orchestrator.advanceMissionStage(mission.missionId, 'RESOURCES_EVALUATED');
      orchestrator.advanceMissionStage(mission.missionId, 'AGENTS_ASSIGNED');

      // Operator approval required for EXECUTION_APPROVED
      const unapprovedRes = orchestrator.advanceMissionStage(mission.missionId, 'EXECUTION_APPROVED');
      assert.equal(unapprovedRes.success, false);
      assert.ok(unapprovedRes.error?.includes('Human operator approval is required'));

      // Approve with operatorId
      const approvedRes = orchestrator.advanceMissionStage(mission.missionId, 'EXECUTION_APPROVED', 'OPERATOR-TEST-CHIEF');
      assert.equal(approvedRes.success, true);
      assert.equal(orchestrator.getMission(mission.missionId)?.approvedBy, 'OPERATOR-TEST-CHIEF');

      orchestrator.advanceMissionStage(mission.missionId, 'TASKS_ORCHESTRATED');
      orchestrator.advanceMissionStage(mission.missionId, 'EVIDENCE_COLLECTED');
      orchestrator.advanceMissionStage(mission.missionId, 'RESULTS_VALIDATED');
      orchestrator.advanceMissionStage(mission.missionId, 'MISSION_COMPLETED');

      assert.equal(orchestrator.getMission(mission.missionId)?.stage, 'MISSION_COMPLETED');
      assert.equal(orchestrator.getMission(mission.missionId)?.progressPercent, 100);
    });
  });

  describe('5. ExecutiveAgentCouncil', () => {
    it('compiles observations from all 6 specialist agents with consensus agreement %', () => {
      const council = ExecutiveAgentCouncil.getInstance();
      const report = council.compileCouncilReport();

      assert.ok(report.reportId);
      assert.equal(report.agentObservations.length, 6);

      const roles = report.agentObservations.map((o) => o.agentRole);
      assert.ok(roles.includes('OperationsAgent'));
      assert.ok(roles.includes('TestAgent'));
      assert.ok(roles.includes('TrackingAgent'));
      assert.ok(roles.includes('PerformanceAgent'));
      assert.ok(roles.includes('IncidentAgent'));
      assert.ok(roles.includes('ChiefIntelligenceAgent'));

      assert.ok(report.consensusAgreementPercent >= 80);
      assert.ok(report.unifiedDirective.length > 0);
      assert.equal(report.approvedByCouncil, true);
    });
  });

  describe('6. SystemHealthIntelligenceEngine', () => {
    it('truthfully aggregates component health classifications', () => {
      const healthEngine = SystemHealthIntelligenceEngine.getInstance();
      const report = healthEngine.evaluateSystemHealth();

      assert.ok(report.components.length >= 12);
      assert.ok(['HEALTHY', 'DEGRADED', 'UNAVAILABLE', 'UNKNOWN'].includes(report.overallHealth));
      assert.ok(report.healthyCount > 0);

      const apiServer = report.components.find((c) => c.componentId === 'comp-api-server');
      assert.ok(apiServer);
      assert.equal(apiServer.health, 'HEALTHY');
    });
  });

  describe('7. UnifiedSecurityGovernanceEngine', () => {
    it('enforces Zero-Trust, RBAC clearance, and prompt injection defense', () => {
      const secEngine = UnifiedSecurityGovernanceEngine.getInstance();
      const sec = secEngine.evaluateSecurityGovernance();

      assert.equal(sec.zeroTrustEnforced, true);
      assert.equal(sec.tokenVerificationStatus, 'VALID');
      assert.equal(sec.promptInjectionDefenseActive, true);
      assert.equal(sec.knowledgeClassificationEnforced, true);
    });
  });

  describe('8. GlobalPerformanceIntelligence', () => {
    it('tracks runtime performance metrics without fabricating memory', () => {
      const perf = GlobalPerformanceIntelligence.getInstance();
      const report = perf.evaluateGlobalPerformance();

      assert.ok(typeof report.averageApiLatencyMs === 'number');
      assert.ok(typeof report.renderCadenceFps === 'number');
      assert.ok(typeof report.cacheEfficiencyPercent === 'number');

      if (report.isRealMemorySupported) {
        assert.ok(typeof report.realMemoryHeapMb === 'number');
      } else {
        assert.equal(report.realMemoryHeapMb, null);
      }
    });
  });

  describe('9. SystemReadinessEngine', () => {
    it('assesses system readiness with verified capabilities and known limitations', () => {
      const readinessEngine = SystemReadinessEngine.getInstance();
      const report = readinessEngine.assessReadiness();

      assert.equal(report.readinessVerdict, 'READY_WITH_LIMITATIONS');
      assert.ok(report.readinessScorePercent >= 90);
      assert.ok(report.verifiedCapabilities.length >= 10);
      assert.ok(report.knownLimitations.length >= 2);
      assert.ok(report.recommendedActions.length >= 1);
    });
  });

  describe('10. Phase36IntegrationCoordinator', () => {
    it('unifies all engines into complete superintelligence state and broadcasts events', () => {
      const coordinator = Phase36IntegrationCoordinator.getInstance();
      const state = coordinator.getState();

      assert.ok(state.registeredEngines.length >= 9);
      assert.ok(state.activeMissions.length >= 2);
      assert.ok(state.executiveReport);
      assert.ok(state.systemHealth);
      assert.ok(state.securityGovernance);
      assert.ok(state.performanceMetrics);
      assert.ok(state.readinessReport);
      assert.ok(state.spatialStatus);
      assert.equal(state.persistenceMode, 'LOCAL_DEVELOPMENT');

      const cycle = coordinator.runFullCoordinationCycle();
      assert.equal(cycle.coordinationStatus, 'SYNCHRONIZED');
      assert.equal(cycle.readinessVerdict, 'READY_WITH_LIMITATIONS');
    });
  });
});
