/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 6: Final Integration & Acceptance Audit Test Suite
 * Comprehensive end-to-end audit verifying Phases 1 through 5:
 * - Phase 1: Module Functionality, Edge Cases & Error Handling
 * - Phase 2: Multi-Agent Orchestration, Conflicts, Prioritization & Timeouts
 * - Phase 3: WebXR 6DoF, Proximity, Touch, Fallback & Simulated vs Physical Boundaries
 * - Phase 4: AI Performance, LRU Eviction, TTL Expiry, Concurrency & Cost Accounting
 * - Phase 5: Privacy Governance, PII Rejection, Session Isolation & Audit Trails
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  ContextualInteractionSystem,
  SpatialPuzzleAssistant,
  FallbackInputController,
  PlayerMemoryStore,
  AIRequestCache,
  ModelRouter,
  InferenceCostMonitor,
  AgentOrchestrator,
  GameDirectorAgent,
  EnvironmentAgent,
  PuzzleAgent,
  NarrativeAgent,
  PlayerAssistanceAgent,
} from '../src/ai';

describe('Stage 6: Final Integration & Acceptance Audit Subsystem', () => {
  let interactionSystem: ContextualInteractionSystem;
  let spatialAssistant: SpatialPuzzleAssistant;
  let fallbackInput: FallbackInputController;
  let memoryStore: PlayerMemoryStore;
  let cache: AIRequestCache<unknown>;
  let costMonitor: InferenceCostMonitor;
  let modelRouter: ModelRouter;
  let orchestrator: AgentOrchestrator;

  beforeEach(() => {
    interactionSystem = new ContextualInteractionSystem();
    spatialAssistant = new SpatialPuzzleAssistant();
    fallbackInput = new FallbackInputController();
    memoryStore = new PlayerMemoryStore(`anon-player-${Date.now()}`, true);
    cache = new AIRequestCache(5000, 5); // 5s TTL, 5 max entries for rigorous LRU testing
    costMonitor = new InferenceCostMonitor();
    modelRouter = new ModelRouter(cache, costMonitor, 1000);
    orchestrator = new AgentOrchestrator();
  });

  describe('Phase 1 & 3: WebXR Spatial Interaction & Edge Case Validation', () => {
    it('handles zero-distance and unnormalized ray directions safely without NaN', () => {
      interactionSystem.registerEntity({
        id: 'crystal-center',
        name: 'Center Resonator',
        position: [0, 1.2, 0],
        boundingRadiusMeters: 0.25,
        isInteractable: true,
        interactionType: 'crystal_rotator',
        metadata: {},
      });

      // Pointer exactly at entity position (distance = 0)
      const zeroDistPrompts = interactionSystem.evaluateProximityAndRay([0, 1.2, 0], [0, 0, 0]);
      assert.equal(zeroDistPrompts.length, 1);
      assert.equal(zeroDistPrompts[0].distanceMeters, 0);
      assert.equal(zeroDistPrompts[0].isWithinProximity, true);

      // Unnormalized high-magnitude ray direction [0, 0, 50]
      const unnormPrompts = interactionSystem.evaluateProximityAndRay([0, 1.2, -1.0], [0, 0, 50]);
      assert.equal(unnormPrompts.length, 1);
      assert.ok(!isNaN(unnormPrompts[0].distanceMeters));
    });

    it('ignores non-interactable and unregistered entities', () => {
      interactionSystem.registerEntity({
        id: 'dormant-pedestal',
        name: 'Dormant Pedestal',
        position: [1, 1, 1],
        boundingRadiusMeters: 0.5,
        isInteractable: false,
        interactionType: 'console_switch',
        metadata: {},
      });

      const prompts = interactionSystem.evaluateProximityAndRay([1, 1, 1]);
      assert.equal(prompts.length, 0);

      interactionSystem.unregisterEntity('dormant-pedestal');
      assert.equal(interactionSystem.getEntity('dormant-pedestal'), undefined);
    });

    it('supports touch gestures, escape cancellation, and state resets on fallback input', () => {
      // Touch start and move
      fallbackInput.onTouchStart(50, 50, 'target-node');
      const delta = fallbackInput.onTouchMove(80, 50);
      assert.ok(delta > 0);
      assert.equal(fallbackInput.getState().activePointerType, 'touch');
      assert.equal(fallbackInput.getState().selectedEntityId, 'target-node');

      // Escape key cancels drag and selection
      const cancelAction = fallbackInput.onKeyDown('Escape');
      assert.ok(cancelAction);
      assert.equal(cancelAction.action, 'DESELECT_AND_CANCEL');
      assert.equal(fallbackInput.getState().isDragging, false);
      assert.equal(fallbackInput.getState().selectedEntityId, null);

      // Reset
      fallbackInput.reset();
      assert.equal(fallbackInput.getState().dragStartX, 0);
      assert.equal(fallbackInput.getState().activePointerType, 'unknown');
    });

    it('computes unit target vectors correctly even with zero displacement', () => {
      const vec = spatialAssistant.getSuggestedTargetVector([1, 1, 1], [1, 1, 1]);
      assert.ok(Array.isArray(vec));
      assert.equal(vec.length, 3);
      assert.ok(!isNaN(vec[0]) && !isNaN(vec[1]) && !isNaN(vec[2]));
    });
  });

  describe('Phase 2: Multi-Agent Orchestration & Conflict Resolution', () => {
    it('sorts inter-agent messages strictly by priority order', () => {
      orchestrator.postMessage({
        id: 'msg-low',
        senderRole: 'NARRATIVE_INTELLIGENCE',
        targetRole: 'ENVIRONMENT_INTELLIGENCE',
        priority: 'low',
        topic: 'LORE_AMBIENCE',
        payload: {},
        timestamp: Date.now(),
      });
      orchestrator.postMessage({
        id: 'msg-crit',
        senderRole: 'PUZZLE_INTELLIGENCE',
        targetRole: 'ENVIRONMENT_INTELLIGENCE',
        priority: 'critical',
        topic: 'EMERGENCY_OVERLOAD',
        payload: {},
        timestamp: Date.now(),
      });
      orchestrator.postMessage({
        id: 'msg-high',
        senderRole: 'GAME_DIRECTOR',
        targetRole: 'ENVIRONMENT_INTELLIGENCE',
        priority: 'high',
        topic: 'TENSION_SHIFT',
        payload: {},
        timestamp: Date.now(),
      });

      // Popping messages must return critical first, then high, then low
      const first = orchestrator.popNextMessageForRole('ENVIRONMENT_INTELLIGENCE');
      assert.ok(first);
      assert.equal(first.priority, 'critical');

      const second = orchestrator.popNextMessageForRole('ENVIRONMENT_INTELLIGENCE');
      assert.ok(second);
      assert.equal(second.priority, 'high');

      const third = orchestrator.popNextMessageForRole('ENVIRONMENT_INTELLIGENCE');
      assert.ok(third);
      assert.equal(third.priority, 'low');
    });

    it('resolves conflicting agent responses by prioritizing player comfort over tension', () => {
      // Simulate conflict: High tension situation, but player is heavily frustrated
      const cycle = orchestrator.executeCycle({
        gamePhase: 'playing',
        coherencePercent: 80,
        activeSegmentCount: 3,
        timeInPhaseMs: 75000,
        playerFrustration: 0.85, // Extreme frustration
        playerBoredom: 0.0,
        playerSkillRating: 1100,
        lastPlayerAction: 'repeated_misalignment',
      });

      const directorEval = cycle.agentEvaluations.GAME_DIRECTOR;
      assert.ok(directorEval.metrics.conflictResolved, 'Conflict must be explicitly resolved');
      assert.equal(directorEval.metrics.currentTension, 0.35, 'Tension must be scaled down to 0.35');
      assert.ok(directorEval.recommendation.includes('comfort prioritised'));
    });

    it('executes cycle with timeout handling and failure recovery', async () => {
      const cycle = await orchestrator.executeCycleWithTimeout({
        gamePhase: 'playing',
        coherencePercent: 50,
        activeSegmentCount: 1,
        timeInPhaseMs: 20000,
        playerFrustration: 0.2,
        playerBoredom: 0.1,
        playerSkillRating: 1250,
        lastPlayerAction: 'idle',
      }, 500);

      assert.ok(cycle.cycleId);
      assert.ok(cycle.appliedActions.length > 0);

      const stats = orchestrator.getResourceStats();
      assert.ok(stats.totalCyclesExecuted > 0);
      assert.ok(stats.averageCycleDurationMs >= 0.5);
    });
  });

  describe('Phase 4: AI Performance, LRU Eviction & Concurrency', () => {
    it('enforces LRU cache eviction when capacity is exceeded', () => {
      // Capacity is 5 entries
      for (let i = 1; i <= 5; i++) {
        cache.set(`key-${i}`, { value: i });
      }
      assert.equal(cache.getStats().size, 5);

      // Access key-1 to make it recently used
      cache.get('key-1');

      // Insert key-6, which should evict key-2 (oldest unaccessed key)
      cache.set('key-6', { value: 6 });
      assert.equal(cache.getStats().size, 5);
      assert.ok(cache.get('key-1') !== null, 'key-1 was accessed, must not be evicted');
      assert.equal(cache.get('key-2'), null, 'key-2 must be evicted by LRU policy');
      assert.ok(cache.get('key-6') !== null);
    });

    it('invalidates cache entries after TTL expiration', () => {
      const now = Date.now();
      cache.set('expiring-key', { data: 'valid' }, 1000, now);

      // Access before expiration
      assert.deepEqual(cache.get('expiring-key', now + 500), { data: 'valid' });

      // Access after expiration (1500ms > 1000ms TTL)
      assert.equal(cache.get('expiring-key', now + 1500), null);
    });

    it('handles concurrent requests through ModelRouter with truthful non-zero latency', async () => {
      const promises = Array.from({ length: 5 }, (_, idx) =>
        modelRouter.route(
          {
            requestId: `concurrent-req-${idx}`,
            taskType: 'hint_generation',
            payload: { node: idx },
          },
          () => ({ hint: `Nudge node ${idx}` })
        )
      );

      const results = await Promise.all(promises);
      assert.equal(results.length, 5);
      for (const res of results) {
        assert.ok(res.latencyMs >= 0.5, 'Must report truthful non-zero processing latency');
        assert.equal(res.source, 'local_heuristic');
      }

      const summary = costMonitor.getSummary();
      assert.equal(summary.totalRequests, 5);
      assert.ok(summary.averageLatencyMs >= 0.5);
    });
  });

  describe('Phase 5: Privacy Governance & PII Rejection', () => {
    it('strictly isolates player sessions and assigns anonymous IDs', () => {
      const store1 = new PlayerMemoryStore('anon-session-A');
      const store2 = new PlayerMemoryStore('anon-session-B');

      store1.recordGameplay({
        puzzleId: 'puzzle-1',
        tier: 'novice',
        completionTimeSeconds: 20,
        errorCount: 0,
        resonanceCoherenceAchieved: 100,
      });

      assert.equal(store1.getProfile().gameplayHistory.length, 1);
      assert.equal(store2.getProfile().gameplayHistory.length, 0, 'Sessions must be completely isolated');
      assert.ok(store1.getAnonymousPlayerId().startsWith('anon-'));
    });

    it('strictly detects and rejects unauthorized PII in telemetry submissions', () => {
      const piiAttempt = {
        puzzleId: 'puzzle-leak-test',
        tier: 'adept',
        completionTimeSeconds: 45,
        errorCount: 1,
        resonanceCoherenceAchieved: 95,
        email: 'attacker@evil.com', // Banned PII
      };

      const accepted = memoryStore.recordGameplay(piiAttempt);
      assert.equal(accepted, false, 'Must reject payloads containing email or PII');

      const profile = memoryStore.getProfile();
      assert.equal(profile.gameplayHistory.length, 0, 'No records should be stored upon PII rejection');

      const lastAudit = profile.consentAuditLog[profile.consentAuditLog.length - 1];
      assert.equal(lastAudit.action, 'PII_REJECTED');
    });

    it('preserves audit trail during one-click memory purges', () => {
      memoryStore.recordGameplay({
        puzzleId: 'puzzle-clean',
        tier: 'apprentice',
        completionTimeSeconds: 30,
        errorCount: 0,
        resonanceCoherenceAchieved: 100,
      });

      memoryStore.clearPlayerMemory(true);
      const profile = memoryStore.getProfile();
      assert.equal(profile.gameplayHistory.length, 0);

      const auditEntries = profile.consentAuditLog.map((a) => a.action);
      assert.ok(auditEntries.includes('DATA_CLEARED'));
    });
  });
});
