/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 7: Advanced Spatial Intelligence & Reality Awareness Test Suite
 * Verifies all 12 mandatory automated validation areas:
 * 1. Coordinate transformation
 * 2. Spatial relationship calculations
 * 3. Object interaction eligibility
 * 4. Scene graph consistency
 * 5. Predictive engine accuracy & non-override invariant
 * 6. Spatial agent communication & human control priority
 * 7. Real-time event processing
 * 8. WebXR capability detection & hardware honesty
 * 9. Desktop & touch fallbacks
 * 10. Performance regression & object pooling
 * 11. Permission enforcement (camera & room scan gating)
 * 12. Spatial data privacy & telemetry sanitization
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  SpatialMappingEngine,
  SpatialObjectIntelligence,
  PredictiveSpatialEngine,
  RealTimeWorldAwareness,
  SpatialVisualizationEngine,
  WebXRCompatibilityManager,
  SpatialPerformanceOptimizer,
  SpatialSecurityGuard,
} from '../src/spatial';
import {
  AgentOrchestrator,
  SpatialIntelligenceAgent,
  FallbackInputController,
} from '../src/ai';

describe('Stage 7: Advanced Spatial Intelligence & Reality Awareness Subsystem', () => {
  let securityGuard: SpatialSecurityGuard;
  let optimizer: SpatialPerformanceOptimizer;
  let mappingEngine: SpatialMappingEngine;
  let objectIntelligence: SpatialObjectIntelligence;
  let predictiveEngine: PredictiveSpatialEngine;
  let worldAwareness: RealTimeWorldAwareness;
  let visualizationEngine: SpatialVisualizationEngine;
  let compatManager: WebXRCompatibilityManager;

  beforeEach(() => {
    securityGuard = new SpatialSecurityGuard();
    optimizer = new SpatialPerformanceOptimizer(16);
    mappingEngine = new SpatialMappingEngine(undefined, securityGuard, optimizer);
    objectIntelligence = new SpatialObjectIntelligence(securityGuard);
    predictiveEngine = new PredictiveSpatialEngine();
    worldAwareness = new RealTimeWorldAwareness(mappingEngine, objectIntelligence, predictiveEngine);
    visualizationEngine = new SpatialVisualizationEngine(optimizer);
    compatManager = new WebXRCompatibilityManager();
  });

  describe('1. Coordinate Transformation & Distance/Bearing Calculations', () => {
    it('transforms coordinates accurately between world, local-floor, and viewer spaces', () => {
      const worldPt: [number, number, number] = [3.64, 1.25, -2.1];
      const viewerOrigin: [number, number, number] = [0, 1.25, 4.0];

      const inViewer = mappingEngine.transformCoordinates(worldPt, 'world', 'viewer', viewerOrigin);
      assert.equal(inViewer[0], 3.64);
      assert.equal(inViewer[1], 0);
      assert.equal(inViewer[2], -6.1);

      const roundTrip = mappingEngine.transformCoordinates(inViewer, 'viewer', 'world', viewerOrigin);
      assert.deepEqual(roundTrip, worldPt);
    });

    it('transforms world coordinates into local node coordinate frame', () => {
      const localPt = mappingEngine.worldToNodeLocal([3.64, 2.25, -2.1], 'ruby-core');
      assert.ok(localPt);
      assert.ok(Math.abs(localPt[1] - 1.0) < 0.01, 'Vertical offset should equal 1.0m in node local space');
    });

    it('computes accurate Euclidean distance and bearing radians', () => {
      const res = mappingEngine.computeDistanceAndBearing([0, 1.25, 0], [0, 1.25, -4.0]);
      assert.equal(res.distanceMeters, 4.0);
      assert.equal(res.bearingRadians, 0);
      assert.equal(res.elevationDeltaMeters, 0);
    });
  });

  describe('2. Spatial Relationship Calculations', () => {
    it('analyzes adjacency relationships within PRISM chamber bounds', () => {
      const adj = mappingEngine.analyzeSpatialRelationships(8.0);
      assert.ok(adj.length >= 3, 'Should identify adjacency across chamber baseline nodes');
      assert.ok(adj.every((r) => r.relationType === 'adjacent_to' && r.strength > 0));
    });

    it('constructs semantic optical chain relationships (Console -> Ruby -> Azure -> Emerald -> Receiver)', () => {
      const rels = objectIntelligence.rebuildSemanticRelationships();
      const consoleToRuby = rels.find((r) => r.sourceId === 'console-emitter' && r.targetId === 'ruby');
      const emeraldToReceiver = rels.find((r) => r.sourceId === 'emerald' && r.targetId === 'target-receiver');

      assert.ok(consoleToRuby && consoleToRuby.relationType === 'illuminates');
      assert.ok(emeraldToReceiver && emeraldToReceiver.relationType === 'reflects_to');
    });
  });

  describe('3. Object Interaction Eligibility', () => {
    it('validates eligible interactable nodes within reach and blocks distant/locked/obstructed nodes', () => {
      const rubyEligible = objectIntelligence.evaluateEligibility('ruby', [3.0, 1.25, -2.0]);
      assert.ok(rubyEligible);
      assert.equal(rubyEligible.isEligible, true);
      assert.equal(rubyEligible.isWithinReach, true);

      // Far outside reach (>6.5m)
      const tooFar = objectIntelligence.evaluateEligibility('ruby', [-10.0, 1.25, 10.0]);
      assert.ok(tooFar);
      assert.equal(tooFar.isEligible, false);
      assert.equal(tooFar.isWithinReach, false);

      // Add hazard obstructing Ruby
      objectIntelligence.registerObject({
        id: 'void-barrier',
        name: 'Gravitational Anomaly',
        category: 'hazard',
        position: [3.64, 1.25, -1.8],
        rotationY: 0,
        boundingRadiusMeters: 0.5,
        isInteractable: false,
        semanticTags: ['hazard'],
        stateSummary: 'Obstructing beam',
      });
      objectIntelligence.rebuildSemanticRelationships();

      const obstructed = objectIntelligence.evaluateEligibility('ruby', [3.0, 1.25, -2.0]);
      assert.ok(obstructed);
      assert.equal(obstructed.isObstructed, true);
      assert.equal(obstructed.isEligible, false);
    });
  });

  describe('4. Scene Graph Consistency Validation', () => {
    it('validates healthy chamber scene graph as consistent', () => {
      const report = mappingEngine.validateSceneGraphConsistency();
      assert.equal(report.isConsistent, true);
      assert.equal(report.orphanNodeIds.length, 0);
      assert.equal(report.cyclicNodeIds.length, 0);
      assert.equal(report.outOfBoundsNodeIds.length, 0);
    });

    it('detects orphan parent references, hierarchy cycles, and out-of-bounds nodes', () => {
      mappingEngine.registerSpatialNode({
        id: 'orphan-node',
        name: 'Orphan Node',
        type: 'INTERACTION_PANEL',
        parentId: 'missing-parent',
        childrenIds: [],
        localTransform: { position: [25, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        worldTransform: { position: [25, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        boundingRadius: 0.3,
        isInteractable: true,
      });

      // Introduce 2-node cycle
      mappingEngine.registerSpatialNode({
        id: 'cycle-a',
        name: 'Cycle A',
        type: 'BOUNDARY_ANCHOR',
        parentId: 'cycle-b',
        childrenIds: ['cycle-b'],
        localTransform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        worldTransform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        boundingRadius: 0.2,
        isInteractable: false,
      });
      mappingEngine.registerSpatialNode({
        id: 'cycle-b',
        name: 'Cycle B',
        type: 'BOUNDARY_ANCHOR',
        parentId: 'cycle-a',
        childrenIds: ['cycle-a'],
        localTransform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        worldTransform: { position: [0, 1, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
        boundingRadius: 0.2,
        isInteractable: false,
      });

      const report = mappingEngine.validateSceneGraphConsistency();
      assert.equal(report.isConsistent, false);
      assert.ok(report.orphanNodeIds.includes('orphan-node'));
      assert.ok(report.outOfBoundsNodeIds.includes('orphan-node'));
      assert.ok(report.cyclicNodeIds.includes('cycle-a'));
    });
  });

  describe('5. Predictive Spatial Engine Accuracy & Non-Override Invariant', () => {
    it('predicts likely next interaction using Markov sequence priors and gaze alignment', () => {
      predictiveEngine.recordSample({
        timestamp: Date.now() - 2000,
        headPosition: [0, 1.4, 2.0],
        gazeDirection: [0, 0, -1],
        interactedObjectId: 'ruby',
        actionType: 'rotate',
      });

      const predictions = predictiveEngine.predictNextInteractions(
        objectIntelligence.getAllObjects(),
        [0, 1.4, 2.0],
        [0, 0, 1] // looking toward Azure at [0, 1.25, 4.2]
      );

      assert.ok(predictions.length > 0);
      assert.equal(predictions[0].objectId, 'azure', 'Should predict Azure after Ruby + gaze toward +Z');
      assert.equal(predictions[0].isProbabilistic, true);
      assert.equal(predictions[0].canOverrideUserControl, false);
    });

    it('detects movement velocity spikes and chamber boundary approaches', () => {
      const t0 = Date.now();
      predictiveEngine.recordSample({
        timestamp: t0,
        headPosition: [0, 1.4, 0],
        gazeDirection: [0, 0, -1],
      });
      predictiveEngine.recordSample({
        timestamp: t0 + 100, // 100ms later, moved 2m -> 20 m/s
        headPosition: [2.0, 1.4, 0],
        gazeDirection: [0, 0, -1],
      });

      const spikeAlert = predictiveEngine.detectMovementAnomalies();
      assert.equal(spikeAlert.detected, true);
      assert.equal(spikeAlert.anomalyType, 'velocity_spike');
    });
  });

  describe('6. Spatial AI Agent Communication & Human Control Priority', () => {
    it('integrates 6th SpatialIntelligenceAgent into AgentOrchestrator and yields to active human input', async () => {
      const orchestrator = new AgentOrchestrator();
      const cycle = orchestrator.executeCycle({
        gamePhase: 'playing',
        coherencePercent: 60,
        activeSegmentCount: 2,
        timeInPhaseMs: 30000,
        playerFrustration: 0.2,
        playerBoredom: 0.1,
        playerSkillRating: 1300,
        lastPlayerAction: 'manual_grab_ruby',
        spatialContext: {
          playerPosition: [0, 1.4, 2.0],
          playerGazeDirection: [0, 0, -1],
          isHumanInputActive: true,
        },
      });

      const spatialEval = cycle.agentEvaluations.SPATIAL_INTELLIGENCE;
      assert.ok(spatialEval, '6th SpatialIntelligenceAgent must participate in orchestration cycle');
      assert.equal(spatialEval.suggestedAction?.type, 'YIELD_TO_HUMAN_CONTROL');
      assert.equal(spatialEval.metrics.humanControlPriorityEnforced, true);

      // Test timeout-protected evaluation
      const spatialAgent = new SpatialIntelligenceAgent(worldAwareness, { timeoutMs: 300 });
      const asyncEval = await spatialAgent.evaluateWithTimeout({
        gamePhase: 'playing',
        coherencePercent: 75,
        activeSegmentCount: 3,
        timeInPhaseMs: 40000,
        playerFrustration: 0.1,
        playerBoredom: 0.1,
        playerSkillRating: 1400,
        lastPlayerAction: 'rotate_emerald',
      });
      assert.equal(asyncEval.agentRole, 'SPATIAL_INTELLIGENCE');
    });
  });

  describe('7. Real-Time World Awareness & Visualization Framing', () => {
    it('detects spatial boundary proximity & convergence events and generates non-occluding HUD transforms', () => {
      const snapshot = worldAwareness.evaluateWorldState({
        playerPosition: [7.6, 1.4, 0], // Near x=8.0 wall
        playerGazeDirection: [1, 0, 0],
        gameSnapshot: {
          gamePhase: 'playing',
          coherencePercent: 90,
          activeSegmentCount: 3,
          timeInPhaseMs: 45000,
          playerFrustration: 0.1,
          playerBoredom: 0.1,
          playerSkillRating: 1500,
          lastPlayerAction: 'align_emerald',
        },
      });

      assert.ok(snapshot.activeSpatialEvents.some((e) => e.type === 'BOUNDARY_PROXIMITY'));
      assert.ok(snapshot.activeSpatialEvents.some((e) => e.type === 'CONVERGENCE_IMMINENT'));

      const frame = visualizationEngine.buildVisualizationFrame({
        playerPosition: [7.6, 1.4, 0],
        playerForward: [1, 0, 0],
        objects: objectIntelligence.getAllObjects(),
        relationships: objectIntelligence.getRelationships(),
        predictions: predictiveEngine.predictNextInteractions(
          objectIntelligence.getAllObjects(),
          [7.6, 1.4, 0],
          [1, 0, 0]
        ),
        awareness: snapshot,
      });

      assert.equal(frame.adaptiveHudTransform.occludesCenterViewport, false);
      assert.ok(frame.guidanceOverlays.some((g) => g.kind === 'boundary_halo'));
      assert.ok(frame.relationshipArcs.length > 0);
    });
  });

  describe('8 & 9. WebXR Capability Detection, Hardware Honesty & Desktop/Touch Fallback', () => {
    it('gracefully handles missing navigator.xr and falls back to desktop/touch without false hardware claims', async () => {
      const matrix = await compatManager.detectCapabilities();
      assert.equal(matrix.physicalHardwareCertified, false, 'Must NEVER claim physical headset certification without device test');
      assert.ok(['webxr_native', 'desktop_mouse_keyboard', 'mobile_touch'].includes(matrix.activeInputFallback));

      const strategy = compatManager.getFallbackStrategy(matrix);
      assert.ok(strategy.controlsSummary.length > 0);

      // Verify FallbackInputController desktop & touch parity
      const fallback = new FallbackInputController();
      fallback.onTouchStart(120, 200, 'ruby');
      const touchDelta = fallback.onTouchMove(150, 200);
      assert.ok(touchDelta > 0);
      assert.equal(fallback.getState().activePointerType, 'touch');
    });
  });

  describe('10. Performance Optimization & Object Pooling', () => {
    it('reuses pooled Vector3 instances, skips clean dirty ticks, and adapts Hz under heavy frame load', () => {
      const v1 = optimizer.vectorPool.acquire(1, 2, 3);
      optimizer.vectorPool.release(v1);
      const v2 = optimizer.vectorPool.acquire(4, 5, 6);

      assert.strictEqual(v1, v2, 'Vector3Pool must reuse released tuple instance');
      const metricsAfterPool = optimizer.getMetrics();
      assert.ok(metricsAfterPool.pooledAllocationsReused >= 2);

      // Simulate heavy GPU frame (>22ms) -> scales update Hz down to 20Hz
      optimizer.recordFrameBudget(25.0, 1.2, Date.now());
      assert.equal(optimizer.getMetrics().currentUpdateHz, 20);

      // Immediately checking frame without dirty flag should skip recompute
      const shouldRun = optimizer.shouldProcessFrame(Date.now() + 2, true);
      assert.equal(shouldRun, false);
      assert.ok(optimizer.getMetrics().dirtyRecomputesSkipped >= 1);
    });
  });

  describe('11 & 12. Permission Enforcement & Spatial Data Privacy', () => {
    it('denies camera recognition & room scanning by default and blocks unauthorized grants without hardware support', () => {
      const cameraBlocked = objectIntelligence.attemptCameraObjectRecognition();
      assert.equal(cameraBlocked.executed, false);
      assert.equal(cameraBlocked.permissionStatus, 'denied');

      const scanBlocked = mappingEngine.requestRoomScanStatus();
      assert.equal(scanBlocked.permitted, false);

      // Attempt to grant camera permission when hardwareSupported=false -> downgraded to 'unavailable'
      const record = securityGuard.setPermission('camera_recognition', 'granted', false);
      assert.equal(record.status, 'unavailable');
      assert.equal(securityGuard.isAllowed('camera_recognition'), false);
    });

    it('sanitizes spatial telemetry by quantizing positions, bucketing timestamps, and excluding raw biometrics', () => {
      const sanitized = securityGuard.sanitizeSpatialTelemetry(
        'session-user-99182',
        [3.64291, 1.2512, -2.1049],
        5,
        1700000003123
      );

      assert.ok(sanitized.anonymousSessionId.startsWith('anon-'));
      assert.equal(sanitized.containsRawBiometrics, false);
      assert.equal(sanitized.containsCameraFrames, false);
      assert.equal(sanitized.timestampBucketMs % 5000, 0);
      assert.equal(sanitized.relativeZone, 'outer_ring');
    });
  });
});
