/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 6: Adaptive AI Intelligence & Immersive Evolution Test Suite
 * Comprehensive automated test suite verifying:
 * 1. PlayerBehaviorAnalyzer (velocity, gaze dwell, frustration & flow index)
 * 2. PlayerSkillEstimator (Elo rating, dexterity, cognitive speed, resilience)
 * 3. DynamicDifficultyEngine (DDA, Csikszentmihalyi flow matching, angular tolerance)
 * 4. AdaptivePuzzleEngine (procedural tiers, level 1-3 tiered hints)
 * 5. Multi-Agent AI Orchestration (5 specialized agents, AgentOrchestrator synthesis)
 * 6. Intelligent Environment Generation (EnvironmentEventEngine, ProceduralVariationEngine, AdaptiveSoundscapeEngine)
 * 7. Advanced WebXR Interaction (ContextualInteractionSystem, SpatialPuzzleAssistant, FallbackInputController)
 * 8. Player Memory & Personalization (PlayerMemoryStore, consent, GDPR deletion, data minimization)
 * 9. AI Performance Optimization (AIRequestCache, InferenceCostMonitor, ModelRouter)
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  PlayerBehaviorAnalyzer,
  PlayerSkillEstimator,
  DynamicDifficultyEngine,
  AdaptivePuzzleEngine,
  GameDirectorAgent,
  EnvironmentAgent,
  PuzzleAgent,
  NarrativeAgent,
  PlayerAssistanceAgent,
  AgentOrchestrator,
  EnvironmentEventEngine,
  ProceduralVariationEngine,
  AdaptiveSoundscapeEngine,
  ContextualInteractionSystem,
  SpatialPuzzleAssistant,
  FallbackInputController,
  PlayerMemoryStore,
  AIRequestCache,
  InferenceCostMonitor,
  ModelRouter,
} from '../src/ai';

describe('Stage 6: Adaptive AI Intelligence & Immersive Evolution Subsystem', () => {
  let analyzer: PlayerBehaviorAnalyzer;
  let estimator: PlayerSkillEstimator;
  let ddaEngine: DynamicDifficultyEngine;
  let puzzleEngine: AdaptivePuzzleEngine;
  let orchestrator: AgentOrchestrator;
  let eventEngine: EnvironmentEventEngine;
  let variationEngine: ProceduralVariationEngine;
  let soundscapeEngine: AdaptiveSoundscapeEngine;
  let interactionSystem: ContextualInteractionSystem;
  let spatialAssistant: SpatialPuzzleAssistant;
  let fallbackInput: FallbackInputController;
  let memoryStore: PlayerMemoryStore;
  let cache: AIRequestCache<unknown>;
  let costMonitor: InferenceCostMonitor;
  let modelRouter: ModelRouter;

  beforeEach(() => {
    analyzer = new PlayerBehaviorAnalyzer();
    estimator = new PlayerSkillEstimator('test-player-1', 1200);
    ddaEngine = new DynamicDifficultyEngine(analyzer, estimator);
    puzzleEngine = new AdaptivePuzzleEngine('apprentice');
    orchestrator = new AgentOrchestrator();
    eventEngine = new EnvironmentEventEngine();
    variationEngine = new ProceduralVariationEngine(101);
    soundscapeEngine = new AdaptiveSoundscapeEngine();
    interactionSystem = new ContextualInteractionSystem();
    spatialAssistant = new SpatialPuzzleAssistant();
    fallbackInput = new FallbackInputController();
    memoryStore = new PlayerMemoryStore('test-anon-player', true);
    cache = new AIRequestCache(60000, 50);
    costMonitor = new InferenceCostMonitor();
    modelRouter = new ModelRouter(cache, costMonitor, 1000);
  });

  describe('1. Adaptive Game Intelligence & Behavior Analysis', () => {
    it('analyzes player interaction velocity and computes flow channel index', () => {
      const now = Date.now();
      analyzer.recordEvent({
        type: 'rotate',
        timestamp: now - 2000,
        rotationDelta: 1.5,
        durationMs: 500,
      });
      analyzer.recordEvent({
        type: 'ray_dwell',
        timestamp: now - 1000,
        durationMs: 400,
      });

      const metrics = analyzer.analyze(now);
      assert.ok(metrics.interactionVelocity > 0);
      assert.ok(metrics.flowChannelIndex >= 0 && metrics.flowChannelIndex <= 1.0);
      assert.equal(metrics.consecutiveErrors, 0);
    });

    it('estimates player Elo rating and updates spatial dexterity upon puzzle completion', () => {
      const initialProfile = estimator.getProfile();
      assert.equal(initialProfile.skillRating, 1200);

      const updated = estimator.recordPuzzleResult({
        puzzleId: 'puzzle-1',
        tier: 'apprentice',
        solved: true,
        timeTakenSeconds: 30,
        expectedTimeSeconds: 60,
        errorCount: 1,
        precisionRadiansDelta: 0.02,
      });

      assert.ok(updated.skillRating > 1200, 'Elo rating should increase after quick solution');
      assert.equal(updated.totalPuzzlesSolved, 1);
      assert.ok(updated.spatialDexterityScore >= 70);
    });

    it('dynamically adapts angular tolerance when player experiences frustration', () => {
      // Simulate consecutive misalignment errors
      const now = Date.now();
      for (let i = 0; i < 4; i++) {
        analyzer.recordEvent({
          type: 'misalignment',
          timestamp: now - 1000 * (4 - i),
          isSuccessful: false,
        });
      }

      const state = ddaEngine.evaluateAndAdjust(now);
      assert.ok(state.adaptiveAssistanceActive, 'Assistance should activate on frustration');
      assert.ok(state.angularToleranceRadians > 0.12, 'Angular tolerance should expand');
      assert.ok(state.adjustmentReason.includes('frustration'));
    });

    it('synthesizes multi-tier progressive hints based on alignment delta', () => {
      const now = Date.now();
      const hint = puzzleEngine.evaluateProgressAndSynthesizeHint(
        {
          crystals: [
            {
              id: 'ruby',
              currentRotationY: 0.0,
              targetRotationY: 0.785, // ~45 deg
              isAligned: false,
            },
          ],
          activeSegmentCount: 0,
          timeSinceLastActionMs: 25000,
          attemptsCount: 3,
        },
        now,
        0 // zero cooldown for test
      );

      assert.ok(hint);
      assert.equal(hint.targetEntityId, 'ruby');
      assert.ok(hint.level >= 2, 'Should provide level 2 or 3 clue after 3 attempts');
      assert.ok(hint.message.includes('RUBY'));
      assert.ok(typeof hint.suggestedAngleDelta === 'number');
    });
  });

  describe('2. Multi-Agent AI Orchestration', () => {
    it('executes 5-agent orchestration cycle and synthesizes global directive', () => {
      const cycle = orchestrator.executeCycle({
        gamePhase: 'playing',
        coherencePercent: 65,
        activeSegmentCount: 2,
        timeInPhaseMs: 40000,
        playerFrustration: 0.3,
        playerBoredom: 0.2,
        playerSkillRating: 1350,
        lastPlayerAction: 'rotate_azure_crystal',
      });

      assert.ok(cycle.cycleId.startsWith('cycle-'));
      assert.ok(cycle.globalTensionLevel >= 0.0 && cycle.globalTensionLevel <= 1.0);
      assert.ok(cycle.agentEvaluations.GAME_DIRECTOR);
      assert.ok(cycle.agentEvaluations.ENVIRONMENT_INTELLIGENCE);
      assert.ok(cycle.agentEvaluations.PUZZLE_INTELLIGENCE);
      assert.ok(cycle.agentEvaluations.NARRATIVE_INTELLIGENCE);
      assert.ok(cycle.agentEvaluations.PLAYER_ASSISTANCE);
      assert.ok(cycle.appliedActions.length > 0);
      assert.ok(cycle.synthesizedDirective.includes('Global tension'));
    });

    it('handles inter-agent message passing and role-based filtering', () => {
      orchestrator.postMessage({
        id: 'msg-1',
        senderRole: 'PUZZLE_INTELLIGENCE',
        targetRole: 'ENVIRONMENT_INTELLIGENCE',
        priority: 'high',
        topic: 'RESONANCE_SPIKE',
        payload: { crystal: 'ruby', resonance: 95 },
        timestamp: Date.now(),
      });

      const envMessages = orchestrator.getMessagesForRole('ENVIRONMENT_INTELLIGENCE');
      assert.equal(envMessages.length, 1);
      assert.equal(envMessages[0].topic, 'RESONANCE_SPIKE');

      const directorMessages = orchestrator.getMessagesForRole('GAME_DIRECTOR');
      assert.equal(directorMessages.length, 0);
    });
  });

  describe('3. Intelligent Environment Generation', () => {
    it('schedules celestial events and calculates time-based intensity decay', () => {
      const event = eventEngine.triggerEvent('SOLAR_FLARE', 10000, 0.9);
      assert.equal(event.type, 'SOLAR_FLARE');
      assert.equal(event.colorHex, '#ff7722');

      const modulation = eventEngine.getCurrentAtmosphereModulation(Date.now() + 5000);
      assert.equal(modulation.activeEventCount, 1);
      assert.ok(modulation.highestIntensity > 0);
      assert.equal(modulation.lightTintHex, '#ff7722');
    });

    it('generates deterministic procedural variations from integer seed', () => {
      const varA = variationEngine.generateVariation(777);
      const varB = variationEngine.generateVariation(777);
      assert.deepEqual(varA, varB, 'Identical seed must produce identical procedural output');

      const varC = variationEngine.generateVariation(999);
      assert.notEqual(varA.seed, varC.seed);
    });

    it('modulates procedural soundscape parameters without external audio assets', () => {
      const state = soundscapeEngine.modulateForGameState(85, 0.2);
      assert.ok(state.filterCutoffHz > 800, 'Cutoff should open up at 85% coherence');
      assert.equal(state.activeHarmonicsCount, 4);

      const muted = soundscapeEngine.toggleMute();
      assert.equal(muted, true);
      assert.equal(soundscapeEngine.getState().isMuted, true);
    });
  });

  describe('4. Advanced WebXR Spatial Interaction', () => {
    it('evaluates 3D entity proximity and formats context-aware instructions per input mode', () => {
      interactionSystem.registerEntity({
        id: 'crystal-ruby',
        name: 'Ruby Resonator',
        position: [0, 1.2, -1.0],
        boundingRadiusMeters: 0.2,
        isInteractable: true,
        interactionType: 'crystal_rotator',
        metadata: { frequencyHz: 635 },
      });

      // Desktop Mode
      interactionSystem.setInputMode('desktop_mouse_touch');
      const desktopPrompts = interactionSystem.evaluateProximityAndRay([0, 1.2, -0.8]);
      assert.equal(desktopPrompts.length, 1);
      assert.ok(desktopPrompts[0].actionInstruction.includes('Click and drag'));

      // Hand Tracking Mode
      interactionSystem.setInputMode('xr_hand_tracking');
      const handPrompts = interactionSystem.evaluateProximityAndRay([0, 1.2, -0.8]);
      assert.equal(handPrompts.length, 1);
      assert.ok(handPrompts[0].actionInstruction.includes('Pinch with index & thumb'));
    });

    it('computes 3D guidance lines and deviation vectors', () => {
      const lines = spatialAssistant.computeGuidanceLines(
        [
          {
            id: 'ruby',
            position: [-1.0, 1.2, -2.0],
            currentRotationY: 0.1,
            targetRotationY: 0.8,
            colorHex: '#ff0044',
            isAligned: false,
          },
          {
            id: 'azure',
            position: [0.0, 1.4, -3.0],
            currentRotationY: 1.2,
            targetRotationY: 1.2,
            colorHex: '#00ddff',
            isAligned: true,
          },
        ],
        [1.0, 1.2, -2.0]
      );

      assert.equal(lines.length, 2);
      assert.equal(lines[0].isAligned, false);
      assert.equal(lines[1].isAligned, true);
      assert.ok(lines[0].opacity < 1.0);
      assert.ok(lines[1].opacity >= 0.9);
    });

    it('handles mouse/touch dragging and keyboard hotkey shortcuts', () => {
      fallbackInput.onPointerDown(100, 100, 'crystal-ruby');
      const deltaAngle = fallbackInput.onPointerMove(140, 100);
      assert.ok(deltaAngle > 0);
      fallbackInput.onPointerUp();
      assert.equal(fallbackInput.getState().isDragging, false);

      const hotkey = fallbackInput.onKeyDown('h');
      assert.ok(hotkey);
      assert.equal(hotkey.action, 'TOGGLE_CINEMATIC_MODE');
    });
  });

  describe('5. Player Memory & Personalization Privacy Protection', () => {
    it('enforces explicit consent gating and stores anonymized gameplay records', () => {
      assert.equal(memoryStore.isConsentGranted(), true);

      const recorded = memoryStore.recordGameplay({
        puzzleId: 'puzzle-alpha',
        tier: 'apprentice',
        completionTimeSeconds: 42,
        errorCount: 2,
        resonanceCoherenceAchieved: 100,
      });
      assert.equal(recorded, true);

      const profile = memoryStore.getProfile();
      assert.equal(profile.gameplayHistory.length, 1);
      assert.ok(!('email' in (profile as any)), 'Zero PII invariant: no email allowed');
      assert.ok(!('name' in (profile as any)), 'Zero PII invariant: no personal names allowed');
    });

    it('supports GDPR-compliant memory wipe and consent revocation', () => {
      memoryStore.recordGameplay({
        puzzleId: 'puzzle-beta',
        tier: 'master',
        completionTimeSeconds: 50,
        errorCount: 0,
        resonanceCoherenceAchieved: 100,
      });

      // Revoke consent
      memoryStore.setConsent(false);
      assert.equal(memoryStore.isConsentGranted(), false);

      // Memory must be automatically purged upon consent revocation
      const profile = memoryStore.getProfile();
      assert.equal(profile.gameplayHistory.length, 0);

      // Subsequent recording attempts must be rejected
      const attempt = memoryStore.recordGameplay({
        puzzleId: 'puzzle-gamma',
        tier: 'novice',
        completionTimeSeconds: 15,
        errorCount: 0,
        resonanceCoherenceAchieved: 100,
      });
      assert.equal(attempt, false);
    });
  });

  describe('6. AI Performance Optimization & Routing', () => {
    it('stores query responses in LRU cache and avoids duplicate execution', () => {
      cache.set('query-1', { result: 'coherent' }, 5000);
      const hit = cache.get('query-1');
      assert.deepEqual(hit, { result: 'coherent' });

      const stats = cache.getStats();
      assert.equal(stats.hits, 1);
      assert.equal(stats.misses, 0);
      assert.equal(stats.hitRatio, 1.0);
    });

    it('routes requests to local heuristics with latency and cost tracking', async () => {
      const res = await modelRouter.route(
        {
          requestId: 'req-test-1',
          taskType: 'hint_generation',
          payload: { crystal: 'emerald' },
        },
        () => ({ hint: 'Align toward center pedestal' })
      );

      assert.equal(res.requestId, 'req-test-1');
      assert.deepEqual(res.data, { hint: 'Align toward center pedestal' });
      assert.equal(res.source, 'local_heuristic');

      const summary = costMonitor.getSummary();
      assert.equal(summary.totalRequests, 1);
      assert.equal(summary.totalEstimatedCostUSD, 0.0);
    });

    it('serves subsequent identical requests directly from cache', async () => {
      await modelRouter.route(
        {
          requestId: 'req-test-2',
          taskType: 'narrative_synthesis',
          payload: { phase: 2 },
        },
        () => ({ narrative: 'Transmission active' })
      );

      const cachedRes = await modelRouter.route(
        {
          requestId: 'req-test-3',
          taskType: 'narrative_synthesis',
          payload: { phase: 2 },
        },
        () => ({ narrative: 'Different content' })
      );

      assert.equal(cachedRes.source, 'cache');
      assert.deepEqual(cachedRes.data, { narrative: 'Transmission active' });
    });
  });
});
