/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Stage 6 & Stage 7 End-to-End Runtime Integration Test Suite
 * Validates:
 * 1. Main lifecycle wiring between Phase36IntegrationCoordinator, Stage 6 AI, and Stage 7 Spatial Runtime
 * 2. Spatial scene runtime sync (crystal transforms, slot swaps, camera rig, bounds & NaN validation)
 * 3. Human Control Priority race-condition safety (in-flight async cancellation via AbortController + epochs)
 * 4. SpatialSecurityGuard fail-closed enforcement across scene runtime & multi-agent orchestrator
 * 5. Error isolation & clean lifecycle disposal without memory/listener leaks
 * 6. Full backward compatibility with puzzleEngine and Phase 36 contracts
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  DEFAULT_CRYSTALS,
  simulateLightBeamPuzzle,
  validateAlienSequence,
  TARGET_DECODING_SEQUENCE,
} from '../src/puzzle/puzzleEngine';
import {
  AgentOrchestrator,
  DynamicDifficultyEngine,
  ContextualInteractionSystem,
} from '../src/ai';
import {
  SpatialSecurityGuard,
  SpatialMappingEngine,
  SpatialObjectIntelligence,
  RealTimeWorldAwareness,
} from '../src/spatial';
import {
  createSpatialSceneRuntime,
  CRYSTAL_TO_MAPPING_NODE_ID,
} from '../src/scene/sceneManager';
import { Phase36IntegrationCoordinator } from '../src/engines/Phase36IntegrationCoordinator';
import { UnifiedIntelligenceOrchestrator } from '../src/engines/UnifiedIntelligenceOrchestrator';

describe('Stage 6 & Stage 7 End-to-End Runtime Integration', () => {
  beforeEach(() => {
    UnifiedIntelligenceOrchestrator.resetInstance();
    Phase36IntegrationCoordinator.resetInstance();
  });

  it('1. Connects Stage 6 & 7 single-lifecycle instances cleanly to Phase36IntegrationCoordinator without duplicate engines', () => {
    const securityGuard = new SpatialSecurityGuard();
    const spatialMapping = new SpatialMappingEngine(undefined, securityGuard);
    const objectIntelligence = new SpatialObjectIntelligence(securityGuard);
    const worldAwareness = new RealTimeWorldAwareness(spatialMapping, objectIntelligence);
    const dynamicDifficulty = new DynamicDifficultyEngine();
    const contextualInteraction = new ContextualInteractionSystem();
    const agentOrchestrator = new AgentOrchestrator({ worldAwareness, securityGuard });

    const coordinator = Phase36IntegrationCoordinator.getInstance();
    coordinator.connectStage67Runtime({
      agentOrchestrator,
      spatialMapping,
      spatialObjectIntelligence: objectIntelligence,
      spatialSecurityGuard: securityGuard,
      worldAwareness,
      dynamicDifficulty,
      contextualInteraction,
      isVRSessionActive: () => false,
      getActiveControllersCount: () => 0,
    });

    // Calling connect a second time must remain idempotent with zero duplicate engine entries
    coordinator.connectStage67Runtime({
      agentOrchestrator,
      spatialMapping,
      spatialObjectIntelligence: objectIntelligence,
      spatialSecurityGuard: securityGuard,
      worldAwareness,
      dynamicDifficulty,
      contextualInteraction,
    });

    const engines = UnifiedIntelligenceOrchestrator.getInstance().getAllEngines();
    const stage6Matches = engines.filter((e) => e.engineId === 'eng-stage6-adaptive-ai');
    const stage7Matches = engines.filter((e) => e.engineId === 'eng-stage7-spatial-intel');

    assert.equal(stage6Matches.length, 1);
    assert.equal(stage7Matches.length, 1);
    assert.ok(engines.length >= 11);

    const status = coordinator.getStage67RuntimeStatus();
    assert.equal(status.connected, true);
    assert.equal(status.hasAgentOrchestrator, true);
    assert.equal(status.hasSpatialMapping, true);
    assert.equal(status.hasSpatialSecurityGuard, true);
    assert.equal(status.sceneGraphConsistent, true);
    assert.equal(status.roomScanPermitted, false);
    assert.equal(status.cameraRecognitionPermitted, false);

    // Phase 36 state truthfully reflects fail-closed Stage 7 permissions & non-active VR hardware
    const phase36State = coordinator.getState();
    assert.equal(phase36State.spatialStatus.physicalSessionActive, false);
    assert.equal(phase36State.spatialStatus.sensorPermissionsGranted, false);
    assert.equal(phase36State.spatialStatus.trackingStability, 'SIMULATED');

    const cycle = coordinator.runFullCoordinationCycle();
    assert.equal(cycle.coordinationStatus, 'SYNCHRONIZED');
    assert.equal(cycle.readinessVerdict, 'READY_WITH_LIMITATIONS');

    // Clean unmount disconnect
    coordinator.disconnectStage67Runtime();
    assert.equal(coordinator.getStage67RuntimeStatus().connected, false);
  });

  it('2. Synchronizes spatial crystal transforms, slot swaps, and rejects invalid NaN or out-of-bounds updates', () => {
    const securityGuard = new SpatialSecurityGuard();
    const spatialMapping = new SpatialMappingEngine(undefined, securityGuard);
    const objectIntelligence = new SpatialObjectIntelligence(securityGuard);
    const worldAwareness = new RealTimeWorldAwareness(spatialMapping, objectIntelligence);
    const contextualInteraction = new ContextualInteractionSystem();

    const simInit = simulateLightBeamPuzzle(DEFAULT_CRYSTALS, true);
    const runtime = createSpatialSceneRuntime(simInit.updatedCrystals, {
      spatialMapping,
      spatialObjectIntelligence: objectIntelligence,
      spatialSecurityGuard: securityGuard,
      worldAwareness,
      contextualInteraction,
    });

    // Verify crystal nodes synced in both SpatialObjectIntelligence and SpatialMappingEngine
    for (const c of simInit.updatedCrystals) {
      assert.ok(objectIntelligence.getObject(c.id), `Missing ${c.id} in SpatialObjectIntelligence`);
      assert.ok(
        spatialMapping.getNode(CRYSTAL_TO_MAPPING_NODE_ID[c.id]),
        `Missing ${CRYSTAL_TO_MAPPING_NODE_ID[c.id]} in SpatialMappingEngine`
      );
      assert.ok(contextualInteraction.getEntity(c.id), `Missing ${c.id} in ContextualInteractionSystem`);
    }
    assert.ok(spatialMapping.getNode('console-emitter'));
    assert.ok(spatialMapping.getNode('target-receiver'));
    assert.ok(spatialMapping.getNode('playerCameraRig'));

    // Valid transform update
    const okUpdate = runtime.syncCrystalTransform('ruby', [3.64, 1.25, -2.1], 1.25, true);
    assert.equal(okUpdate.accepted, true);
    assert.equal(spatialMapping.getNode('ruby-core')?.worldTransform.rotation[1], 1.25);
    assert.equal(objectIntelligence.getObject('ruby')?.rotationY, 1.25);

    // Slot swap updates spatial positions atomically across both stores
    const swapped = runtime.swapCrystalPositions('ruby', [0, 1.25, 4.2], 'azure', [3.64, 1.25, -2.1]);
    assert.equal(swapped, true);
    assert.deepEqual(objectIntelligence.getObject('ruby')?.position, [0, 1.25, 4.2]);
    assert.deepEqual(spatialMapping.getNode('ruby-core')?.worldTransform.position, [0, 1.25, 4.2]);
    assert.deepEqual(spatialMapping.getNode('azure-array')?.worldTransform.position, [3.64, 1.25, -2.1]);

    // NaN & out-of-bounds updates must be rejected cleanly without corrupting graph
    const nanReject = runtime.syncCrystalTransform('emerald', [Number.NaN, 1.25, -2.1], 0.5);
    assert.equal(nanReject.accepted, false);

    const oobReject = runtime.syncCrystalTransform('emerald', [45.0, 1.25, 0], 0.5);
    assert.equal(oobReject.accepted, false);

    const badCam = runtime.syncPlayerCamera([Number.POSITIVE_INFINITY, 1.5, 2], [0, 0, -1]);
    assert.equal(badCam, false);

    const st = runtime.getState();
    assert.equal(st.rejectedTransformCount, 3);
    assert.equal(st.consistency.isConsistent, true);

    runtime.dispose();
  });

  it('3. Enforces Human Control Priority without race conditions by cancelling pending async agent cycles cleanly', async () => {
    const securityGuard = new SpatialSecurityGuard();
    const spatialMapping = new SpatialMappingEngine(undefined, securityGuard);
    const objectIntelligence = new SpatialObjectIntelligence(securityGuard);
    const worldAwareness = new RealTimeWorldAwareness(spatialMapping, objectIntelligence);
    const orchestrator = new AgentOrchestrator({ worldAwareness, securityGuard });

    const baseSnapshot = {
      gamePhase: 'playing',
      coherencePercent: 45,
      activeSegmentCount: 1,
      timeInPhaseMs: 12000,
      playerFrustration: 0.72, // Normally triggers director + environment adjustment actions
      playerBoredom: 0.1,
      playerSkillRating: 1250,
      lastPlayerAction: 'idle_scan',
      spatialContext: {
        playerPosition: [0, 1.4, 3.2] as [number, number, number],
        playerGazeDirection: [0, 0, -1] as [number, number, number],
        isHumanInputActive: false,
      },
    };

    // Start a slow async orchestration cycle that simulates LLM/network latency
    let asyncWorkAborted = false;
    const inflightPromise = orchestrator.executeCycleWithTimeout(
      baseSnapshot,
      2000,
      'Meta Llama 3.3 / Local Heuristic Hybrid',
      {
        evaluateAsync: (signal) =>
          new Promise((resolve) => {
            signal.addEventListener('abort', () => {
              asyncWorkAborted = true;
            });
            // Would finish later with autonomous directives unless preempted by human input
            setTimeout(() => {
              resolve(orchestrator.executeCycle(baseSnapshot));
            }, 60);
          }),
      }
    );

    // Mid-flight human input starts (e.g. pointer drag / XR controller grab)
    const epoch1 = orchestrator.notifyHumanInputStart('xr_controller');
    assert.equal(epoch1, 1);
    assert.equal(orchestrator.isHumanControlActive(), true);
    assert.equal(asyncWorkAborted, true);

    const preemptedResult = await inflightPromise;
    assert.equal(preemptedResult.aborted, true);
    assert.equal(preemptedResult.humanControlActive, true);
    assert.equal(preemptedResult.humanInputEpoch, 1);
    assert.equal(
      preemptedResult.agentEvaluations.SPATIAL_INTELLIGENCE.suggestedAction?.type,
      'YIELD_TO_HUMAN_CONTROL'
    );
    assert.ok(
      preemptedResult.appliedActions.every((a) => a.action === 'YIELD_TO_HUMAN_CONTROL'),
      'Conflicting autonomous actions must be suspended during active human control'
    );

    // Synchronous cycle while human input remains active also enforces yield and suspends conflicting directives
    const syncWhileHuman = orchestrator.executeCycle(baseSnapshot);
    assert.equal(syncWhileHuman.humanControlActive, true);
    assert.ok((syncWhileHuman.suspendedAutonomousActions ?? 0) >= 2);
    assert.deepEqual(
      syncWhileHuman.appliedActions.map((a) => a.action),
      ['YIELD_TO_HUMAN_CONTROL']
    );

    // End human input -> normal autonomous orchestration safely resumes on next cycle
    orchestrator.notifyHumanInputEnd();
    assert.equal(orchestrator.isHumanControlActive(), false);

    const resumedCycle = orchestrator.executeCycle(baseSnapshot);
    assert.equal(resumedCycle.humanControlActive, false);
    assert.ok(resumedCycle.appliedActions.some((a) => a.targetSystem === 'GAME_PACING'));
    assert.ok(resumedCycle.appliedActions.some((a) => a.targetSystem === 'RENDER_ENVIRONMENT'));
  });

  it('4. Connects pointer/XR human input callbacks through SpatialSceneRuntime & isolates callback errors safely', () => {
    const securityGuard = new SpatialSecurityGuard();
    const spatialMapping = new SpatialMappingEngine(undefined, securityGuard);
    const objectIntelligence = new SpatialObjectIntelligence(securityGuard);
    const worldAwareness = new RealTimeWorldAwareness(spatialMapping, objectIntelligence);
    const orchestrator = new AgentOrchestrator({ worldAwareness, securityGuard });

    const sim = simulateLightBeamPuzzle(DEFAULT_CRYSTALS, true);
    let throwInSnapshotCallback = true;

    const runtime = createSpatialSceneRuntime(sim.updatedCrystals, {
      spatialMapping,
      spatialObjectIntelligence: objectIntelligence,
      spatialSecurityGuard: securityGuard,
      worldAwareness,
      onHumanInputActivity: (active, source) => {
        if (active) orchestrator.notifyHumanInputStart(source);
        else orchestrator.notifyHumanInputEnd();
      },
      onSpatialSnapshot: () => {
        if (throwInSnapshotCallback) {
          throw new Error('Simulated downstream HUD error');
        }
      },
    });

    // Trigger human input across input modalities
    runtime.setHumanInputActive(true, 'pointer');
    assert.equal(orchestrator.isHumanControlActive(), true);
    assert.equal(runtime.getState().activeInputSource, 'pointer');

    // Error inside snapshot listener must be isolated cleanly without interrupting runtime
    const snap = runtime.evaluateTick(
      16.6,
      {
        gamePhase: 'playing',
        coherencePercent: sim.totalCoherence,
        activeSegmentCount: sim.beamSegments.length,
        timeInPhaseMs: 1000,
        playerFrustration: 0.1,
        playerBoredom: 0.1,
        playerSkillRating: 1200,
        lastPlayerAction: 'pointer_drag',
      },
      true
    );
    assert.ok(snap, 'World awareness snapshot should still resolve when listener throws');

    throwInSnapshotCallback = false;
    runtime.setHumanInputActive(false, 'pointer');
    assert.equal(orchestrator.isHumanControlActive(), false);

    // Disposing runtime resets active human input cleanly so controls never stay locked
    runtime.setHumanInputActive(true, 'hand_tracking');
    assert.equal(orchestrator.isHumanControlActive(), true);
    runtime.dispose();
    assert.equal(orchestrator.isHumanControlActive(), false);
  });

  it('5. Enforces SpatialSecurityGuard fail-closed permissions at spatial & agent boundaries', () => {
    const securityGuard = new SpatialSecurityGuard();
    const orchestrator = new AgentOrchestrator({ securityGuard });

    // Hardware unsupported grant attempts must remain blocked
    const camGrant = securityGuard.setPermission('camera_recognition', 'granted', false);
    assert.equal(camGrant.status, 'unavailable');

    const cycle = orchestrator.executeCycle({
      gamePhase: 'playing',
      coherencePercent: 65,
      activeSegmentCount: 2,
      timeInPhaseMs: 8000,
      playerFrustration: 0.15,
      playerBoredom: 0.15,
      playerSkillRating: 1300,
      lastPlayerAction: 'request_env_scan',
      requestedSpatialScopes: ['room_scanning', 'camera_recognition'],
    });

    assert.ok(cycle.securityBlockedActions);
    assert.equal(cycle.securityBlockedActions.length, 2);
    assert.equal(cycle.agentEvaluations.SPATIAL_INTELLIGENCE.metrics.securityBlockedScopeCount, 2);
    assert.ok(orchestrator.getResourceStats().securityBlockedCount >= 2);
  });

  it('6. Preserves Phases 1-6 crystal puzzle physics and symbol decoding while feeding Stage 6 adaptive telemetry', () => {
    // Align all 3 crystals cleanly using puzzleEngine target angles
    const solvedCrystals = DEFAULT_CRYSTALS.map((c) => ({
      ...c,
      rotationY: c.targetRotationY,
    }));
    const sim = simulateLightBeamPuzzle(solvedCrystals, true);
    assert.equal(sim.progress.isTargetReceiverHit, true);
    assert.equal(sim.totalCoherence, 100);

    const decodeRes = validateAlienSequence(TARGET_DECODING_SEQUENCE);
    assert.equal(decodeRes.isCorrect, true);

    const difficulty = new DynamicDifficultyEngine();
    difficulty.getAnalyzer().recordEvent({
      type: 'success',
      timestamp: Date.now(),
      targetId: 'emerald',
      isSuccessful: true,
    });
    const adjusted = difficulty.evaluateAndAdjust();
    assert.ok(adjusted.angularToleranceRadians > 0);
  });
});
