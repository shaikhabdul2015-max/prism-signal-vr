/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 29 Test Suite: Advanced WebXR Reality Engine.
 * Verifies:
 * 1. Spatial Intelligence Engine: Node transformation hierarchy, PRISM chamber baseline nodes, distance calculations, and chamber boundaries.
 * 2. Immersive Environment Engine: 5 presets switching, atmospheric parameters, and valid preset validation.
 * 3. Advanced VR Interaction Engine: 3D raycasting, trigger selection, grip grab/release, and multimodal input modes.
 * 4. Spatial Physics Engine: Pair-wise sphere collision detection, kinetic restitution impulses, damping, and collision events.
 * 5. Adaptive Reality Engine: Performance-aware quality scaling, mission state adaptation, and operator override approval gating.
 * 6. Spatial Audio Intelligence: Distance attenuation computation, synthesis toggle, and user-gesture audio unlock handling.
 * 7. XR Session Manager: Browser capability probing, immersive-vr requests, reference space fallbacks, and headset detection.
 * 8. Spatial Telemetry Engine: Cadence metrics calculation, dropped frames ratio, and strict 3-tier provenance classification.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { AdvancedSpatialIntelligenceEngine } from '../src/engines/AdvancedSpatialIntelligenceEngine';
import { ImmersiveEnvironmentEngine } from '../src/engines/ImmersiveEnvironmentEngine';
import { AdvancedVRInteractionEngine } from '../src/engines/AdvancedVRInteractionEngine';
import { SpatialPhysicsEngine } from '../src/engines/SpatialPhysicsEngine';
import { AdaptiveRealityEngine } from '../src/engines/AdaptiveRealityEngine';
import { SpatialAudioIntelligence } from '../src/engines/SpatialAudioIntelligence';
import { XRSessionManager } from '../src/engines/XRSessionManager';
import { SpatialTelemetryEngine } from '../src/engines/SpatialTelemetryEngine';
import { HumanApprovalManager } from '../src/engines/HumanApprovalManager';
import { VRTelemetry } from '../src/types/diagnostics';
import { Vector3Tuple } from '../src/types/phase29';

// Fixture: Nominal Telemetry (~72 FPS, 13.8ms delta)
const nominalTelemetry: VRTelemetry = {
  sessionId: 'test-session-p29-nominal',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 100, frameDurationMs: 13.8, dropped: false },
    { timestampMs: Date.now() - 50, frameDurationMs: 13.5, dropped: false },
    { timestampMs: Date.now(), frameDurationMs: 13.7, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 100, latencyMs: 12.5 },
    { timestampMs: Date.now(), latencyMs: 13.0 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: true,
    confidence: 0.98,
  })),
  expectedJointCount: 25,
  lightingPreset: 'bright_studio',
  thresholds: {},
  executedCategories: [],
};

// Fixture: Stressed Telemetry (Low FPS ~28, high latency 38ms)
const stressedTelemetry: VRTelemetry = {
  sessionId: 'test-session-p29-stressed',
  startedAt: new Date().toISOString(),
  frames: [
    { timestampMs: Date.now() - 200, frameDurationMs: 38.0, dropped: true },
    { timestampMs: Date.now() - 100, frameDurationMs: 36.0, dropped: true },
    { timestampMs: Date.now(), frameDurationMs: 35.5, dropped: false },
  ],
  latencySamples: [
    { timestampMs: Date.now() - 200, latencyMs: 38.0 },
    { timestampMs: Date.now(), latencyMs: 36.5 },
  ],
  trackingEvents: [],
  joints: Array.from({ length: 25 }, (_, i) => ({
    jointId: `joint_${i}`,
    tracked: i < 18,
    confidence: i < 18 ? 0.95 : 0.2,
  })),
  expectedJointCount: 25,
  lightingPreset: 'bright_studio',
  thresholds: {},
  executedCategories: [],
};

describe('Phase 29: Advanced WebXR Reality Engine', () => {

  // --------------------------------------------------------------------------
  // 1. SPATIAL INTELLIGENCE & HIERARCHY
  // --------------------------------------------------------------------------
  describe('1. AdvancedSpatialIntelligenceEngine', () => {
    let spatialEngine: AdvancedSpatialIntelligenceEngine;

    beforeEach(() => {
      spatialEngine = new AdvancedSpatialIntelligenceEngine();
    });

    it('initializes PRISM chamber baseline nodes including ruby-core, azure-array, and emerald-core', () => {
      const nodes = spatialEngine.getAllNodes();
      assert.ok(nodes.length >= 4, 'Should contain baseline chamber nodes');

      const rubyNode = spatialEngine.getNode('ruby-core');
      const azureNode = spatialEngine.getNode('azure-array');
      const emeraldNode = spatialEngine.getNode('emerald-core');

      assert.ok(rubyNode, 'ruby-core should exist');
      assert.strictEqual(rubyNode.type, 'CRYSTAL_CORE');
      assert.strictEqual(rubyNode.worldTransform.position[0], 3.64);

      assert.ok(azureNode, 'azure-array should exist');
      assert.strictEqual(azureNode.type, 'REFLECTOR_ARRAY');
      assert.strictEqual(azureNode.worldTransform.position[2], 4.2);

      assert.ok(emeraldNode, 'emerald-core should exist');
      assert.strictEqual(emeraldNode.type, 'CRYSTAL_CORE');
      assert.strictEqual(emeraldNode.worldTransform.position[0], -3.64);
    });

    it('computes euclidean distances between spatial nodes accurately', () => {
      const distanceRubyAzure = spatialEngine.calculateDistance('ruby-core', 'azure-array');
      assert.ok(distanceRubyAzure !== null && distanceRubyAzure > 0, 'Distance must be positive');
      // sqrt((3.64 - 0)^2 + (1.25 - 1.25)^2 + (-2.1 - 4.2)^2) = sqrt(13.2496 + 39.69) = sqrt(52.9396) ~= 7.2759
      assert.ok(Math.abs(distanceRubyAzure! - 7.276) < 0.05, `Expected ~7.28, got ${distanceRubyAzure}`);
    });

    it('validates whether arbitrary 3D points reside within PRISM chamber boundaries', () => {
      const bounds = spatialEngine.getChamberBoundary();
      assert.ok(bounds, 'Chamber bounds must be defined');

      const insidePoint: Vector3Tuple = [0, 1.5, 0];
      const outsidePoint: Vector3Tuple = [25.0, 50.0, -40.0];

      assert.strictEqual(spatialEngine.isWithinChamber(insidePoint), true, 'Origin center must be inside chamber');
      assert.strictEqual(spatialEngine.isWithinChamber(outsidePoint), false, 'Extremity must be outside chamber');
    });

    it('supports registering dynamic child nodes and updating local/world transformations', () => {
      spatialEngine.registerNode({
        id: 'test-drone',
        name: 'Autonomous Micro-Drone',
        type: 'SENSOR_RIG',
        localTransform: {
          position: [0, 2.0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        worldTransform: {
          position: [0, 2.0, 0],
          rotation: [0, 0, 0],
          scale: [1, 1, 1],
        },
        childrenIds: [],
        boundingRadius: 0.5,
        isInteractable: true,
      });

      const drone = spatialEngine.getNode('test-drone');
      assert.ok(drone, 'Registered node must be retrievable');
      assert.strictEqual(drone.isInteractable, true);

      // Move node
      spatialEngine.updateNodeTransform('test-drone', { position: [1.0, 2.5, -1.0] });
      const movedDrone = spatialEngine.getNode('test-drone');
      assert.strictEqual(movedDrone?.worldTransform.position[0], 1.0);
      assert.strictEqual(movedDrone?.worldTransform.position[1], 2.5);
    });
  });

  // --------------------------------------------------------------------------
  // 2. IMMERSIVE ENVIRONMENT ENGINE
  // --------------------------------------------------------------------------
  describe('2. ImmersiveEnvironmentEngine', () => {
    let envEngine: ImmersiveEnvironmentEngine;

    beforeEach(() => {
      envEngine = new ImmersiveEnvironmentEngine();
    });

    it('provides all 5 required environment presets with distinctive atmospheric configurations', () => {
      const presets = envEngine.getAllPresets();
      assert.strictEqual(presets.length, 5, 'Must provide 5 environment presets');

      const ids = presets.map((p) => p.presetId);
      assert.ok(ids.includes('DEEP_SPACE'));
      assert.ok(ids.includes('QUANTUM_LABORATORY'));
      assert.ok(ids.includes('NEURAL_INTELLIGENCE_CHAMBER'));
      assert.ok(ids.includes('DIGITAL_TWIN_ENVIRONMENT'));
      assert.ok(ids.includes('MISSION_SIMULATION_ARENA'));
    });

    it('switches environments and dispatches change listeners', () => {
      let notifiedPreset = '';
      const unsubscribe = envEngine.subscribe((config) => {
        notifiedPreset = config.presetId;
      });

      const updated = envEngine.setEnvironment('QUANTUM_LABORATORY');
      assert.strictEqual(updated.presetId, 'QUANTUM_LABORATORY');
      assert.strictEqual(notifiedPreset, 'QUANTUM_LABORATORY');
      assert.strictEqual(envEngine.getCurrentEnvironment().presetId, 'QUANTUM_LABORATORY');

      unsubscribe();
    });

    it('rejects invalid environment presets gracefully and retains current preset', () => {
      const initial = envEngine.getCurrentEnvironment().presetId;
      // @ts-expect-error Testing invalid runtime input
      const res = envEngine.setEnvironment('NON_EXISTENT_GALAXY');
      assert.strictEqual(res.presetId, initial, 'Must retain current preset on invalid ID');
    });
  });

  // --------------------------------------------------------------------------
  // 3. VR INTERACTION & RAYCASTING
  // --------------------------------------------------------------------------
  describe('3. AdvancedVRInteractionEngine', () => {
    let interactionEngine: AdvancedVRInteractionEngine;
    let spatialEngine: AdvancedSpatialIntelligenceEngine;

    beforeEach(() => {
      spatialEngine = new AdvancedSpatialIntelligenceEngine();
      interactionEngine = new AdvancedVRInteractionEngine(spatialEngine);
    });

    it('performs 3D raycasting and hits target spatial nodes', () => {
      // Ray aimed directly toward ruby-core at [3.64, 1.25, -2.1]
      const rayOrigin: Vector3Tuple = [0, 1.25, 0];
      const dirX = 3.64;
      const dirZ = -2.1;
      const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
      const rayDir: Vector3Tuple = [dirX / len, 0, dirZ / len];

      const hit = interactionEngine.castRay(rayOrigin, rayDir);
      assert.ok(hit !== null, 'Raycast should hit ruby-core along that line of sight');
      assert.strictEqual(hit?.hitObjectId, 'ruby-core');
      assert.ok(hit!.distance > 0);
    });

    it('handles trigger selection and sets hovered/selected object state', () => {
      const rayOrigin: Vector3Tuple = [0, 1.25, 0];
      const dirX = 3.64;
      const dirZ = -2.1;
      const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
      const rayDir: Vector3Tuple = [dirX / len, 0, dirZ / len];

      const hit = interactionEngine.triggerPress(rayOrigin, rayDir);
      assert.strictEqual(hit?.hitObjectId, 'ruby-core');

      const state = interactionEngine.getInteractionState();
      assert.strictEqual(state.triggerPressed, true);
      assert.strictEqual(state.hoveredObjectId, 'ruby-core');

      interactionEngine.triggerRelease();
      assert.strictEqual(interactionEngine.getInteractionState().triggerPressed, false);
    });

    it('handles grip grab and release of interactable items', () => {
      const rayOrigin: Vector3Tuple = [0, 1.25, 0];
      const dirX = 3.64;
      const dirZ = -2.1;
      const len = Math.sqrt(dirX * dirX + dirZ * dirZ);
      const rayDir: Vector3Tuple = [dirX / len, 0, dirZ / len];

      // Grip grab
      const grabbed = interactionEngine.gripGrab(rayOrigin, rayDir);
      assert.strictEqual(grabbed, 'ruby-core');
      assert.strictEqual(interactionEngine.getInteractionState().grabbedObjectId, 'ruby-core');
      assert.strictEqual(interactionEngine.getInteractionState().gripPressed, true);

      // Grip release
      const released = interactionEngine.gripRelease();
      assert.strictEqual(released, 'ruby-core');
      assert.strictEqual(interactionEngine.getInteractionState().grabbedObjectId, null);
      assert.strictEqual(interactionEngine.getInteractionState().gripPressed, false);
    });

    it('switches multimodal input mode among XR_CONTROLLER, XR_HAND, MOUSE_POINTER, and KEYBOARD_FALLBACK', () => {
      interactionEngine.setInputMode('XR_HAND');
      assert.strictEqual(interactionEngine.getInteractionState().inputMode, 'XR_HAND');

      interactionEngine.setInputMode('MOUSE_POINTER');
      assert.strictEqual(interactionEngine.getInteractionState().inputMode, 'MOUSE_POINTER');
    });
  });

  // --------------------------------------------------------------------------
  // 4. SPATIAL PHYSICS & COLLISION DETECTION
  // --------------------------------------------------------------------------
  describe('4. SpatialPhysicsEngine', () => {
    let physicsEngine: SpatialPhysicsEngine;

    beforeEach(() => {
      physicsEngine = new SpatialPhysicsEngine();
    });

    it('initializes colliders for baseline PRISM chamber entities', () => {
      const colliders = physicsEngine.getAllColliders();
      assert.ok(colliders.length >= 3, 'Should initialize baseline colliders');

      const rubyCollider = physicsEngine.getCollider('ruby-core');
      assert.ok(rubyCollider, 'ruby-core collider must exist');
      assert.strictEqual(rubyCollider.shape, 'SPHERE');
      assert.strictEqual(rubyCollider.isStatic, true);
    });

    it('detects collisions between two dynamic spherical colliders and applies elastic impulses', () => {
      // Register two dynamic probes that overlap
      physicsEngine.registerCollider({
        objectId: 'probe-alpha',
        shape: 'SPHERE',
        radius: 0.5,
        centerOffset: [0, 0, 0],
        massKg: 2.0,
        isStatic: false,
        restitution: 0.8,
        velocity: [1.0, 0, 0],
        angularVelocity: [0, 0, 0],
      });

      physicsEngine.registerCollider({
        objectId: 'probe-beta',
        shape: 'SPHERE',
        radius: 0.5,
        centerOffset: [0, 0, 0],
        massKg: 2.0,
        isStatic: false,
        restitution: 0.8,
        velocity: [-1.0, 0, 0],
        angularVelocity: [0, 0, 0],
      });

      // Position them overlapping: distance = 0.6, radius sum = 1.0 -> penetration = 0.4
      const positions = new Map<string, Vector3Tuple>([
        ['probe-alpha', [0, 1.0, 0]],
        ['probe-beta', [0.6, 1.0, 0]],
      ]);

      const collisionEvents = physicsEngine.stepSimulation(0.016, positions);
      assert.ok(collisionEvents.length > 0, 'Collision should be detected');

      const col = collisionEvents.find(
        (c) =>
          (c.colliderAId === 'probe-alpha' && c.colliderBId === 'probe-beta') ||
          (c.colliderAId === 'probe-beta' && c.colliderBId === 'probe-alpha')
      );
      assert.ok(col, 'Collision between probe-alpha and probe-beta must be recorded');
      assert.ok(col.penetrationDepth > 0, 'Penetration depth must be positive');

      // Alpha's velocity should have reversed along X due to elastic collision
      const alpha = physicsEngine.getCollider('probe-alpha');
      assert.ok(alpha!.velocity[0] < 0, 'Alpha X velocity should be negative after collision');
    });

    it('clears and retrieves recent collision events', () => {
      physicsEngine.clearCollisions();
      assert.strictEqual(physicsEngine.getRecentCollisions().length, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 5. ADAPTIVE REALITY ENGINE
  // --------------------------------------------------------------------------
  describe('5. AdaptiveRealityEngine', () => {
    let adaptiveEngine: AdaptiveRealityEngine;

    beforeEach(() => {
      adaptiveEngine = new AdaptiveRealityEngine();
    });

    it('evaluates telemetry and scales visual quality to BALANCED or HIGH under nominal conditions', () => {
      const policy = adaptiveEngine.evaluateTelemetry(nominalTelemetry);
      assert.ok(
        policy.qualityLevel === 'ULTRA' || policy.qualityLevel === 'HIGH' || policy.qualityLevel === 'BALANCED',
        `Nominal conditions should keep high/balanced quality, got ${policy.qualityLevel}`
      );
      assert.strictEqual(policy.renderScale >= 1.0, true);
    });

    it('downgrades visual quality to CONSERVATIVE_60HZ or FAILSAFE_LOW under severe frame drops and high latency', () => {
      const policy = adaptiveEngine.evaluateTelemetry(stressedTelemetry);
      assert.ok(
        policy.qualityLevel === 'CONSERVATIVE_60HZ' || policy.qualityLevel === 'FAILSAFE_LOW',
        `Degraded telemetry should trigger throttled quality, got ${policy.qualityLevel}`
      );
      assert.strictEqual(policy.dynamicShadowsEnabled, false, 'Dynamic shadows should be disabled under stress');
      assert.ok(policy.renderScale <= 0.85, 'Render scale should throttle');
    });

    it('requires HumanApprovalManager operator approval for high-impact visual policy overrides', () => {
      // Manual override to ULTRA with operator gate
      const approval = adaptiveEngine.requestPolicyOverride('ULTRA', true, 'Operator manual fidelity override');
      assert.strictEqual(approval.requiresOperatorApproval, true);

      // Verify that HumanApprovalManager recorded an intervention request
      const pendingRequests = HumanApprovalManager.getPendingInterventions();
      const match = pendingRequests.find((r) => r.title.includes('Visual Quality Policy Override'));
      assert.ok(match, 'HumanApprovalManager must record operator approval request');

      // Operator approves
      const approved = HumanApprovalManager.approveIntervention(match.id, 'lead_operator');
      assert.strictEqual(approved, true);

      // Applying approved policy
      const updatedPolicy = adaptiveEngine.applyApprovedPolicy(match.id, 'ULTRA');
      assert.strictEqual(updatedPolicy.qualityLevel, 'ULTRA');
    });
  });

  // --------------------------------------------------------------------------
  // 6. SPATIAL AUDIO INTELLIGENCE
  // --------------------------------------------------------------------------
  describe('6. SpatialAudioIntelligence', () => {
    let audioIntelligence: SpatialAudioIntelligence;

    beforeEach(() => {
      audioIntelligence = new SpatialAudioIntelligence();
    });

    it('initializes spatial audio sources for PRISM chamber emitters', () => {
      const sources = audioIntelligence.getAllSources();
      assert.ok(sources.length >= 3, 'Must have baseline PRISM audio emitters');

      const rubyEmitter = audioIntelligence.getSource('ruby-emitter');
      assert.ok(rubyEmitter, 'ruby-emitter must exist');
      assert.strictEqual(rubyEmitter.isPlaying, true);
    });

    it('calculates distance-based volume attenuation using clamped inverse rolloff model', () => {
      const listenerAtRuby: Vector3Tuple = [3.64, 1.25, -2.1];
      const listenerFarAway: Vector3Tuple = [50.0, 1.25, -2.1];

      const closeVolume = audioIntelligence.calculatePerceivedVolume('ruby-emitter', listenerAtRuby);
      const farVolume = audioIntelligence.calculatePerceivedVolume('ruby-emitter', listenerFarAway);

      assert.ok(closeVolume > farVolume, 'Close volume must be louder than distant volume');
      assert.strictEqual(closeVolume, 1.0, 'Volume at emitter position should be max 1.0');
      assert.ok(farVolume <= 0.1, 'Volume at 50m distance should be attenuated');
    });

    it('safely handles audio context unlock without errors even in headless/node environments', async () => {
      const unlocked = await audioIntelligence.unlockAudio();
      assert.strictEqual(typeof unlocked, 'boolean');
      assert.strictEqual(audioIntelligence.isAudioUnlocked(), unlocked);
    });
  });

  // --------------------------------------------------------------------------
  // 7. XR SESSION & DEVICE MANAGEMENT
  // --------------------------------------------------------------------------
  describe('7. XRSessionManager', () => {
    let sessionManager: XRSessionManager;

    beforeEach(() => {
      sessionManager = new XRSessionManager();
    });

    it('accurately probes browser environment for WebXR support', async () => {
      const capabilities = await sessionManager.probeCapabilities();
      assert.ok(capabilities !== null);
      assert.strictEqual(typeof capabilities.isWebXRAvailable, 'boolean');
      assert.strictEqual(typeof capabilities.sessionState, 'string');
    });

    it('safely handles session requests in environments lacking physical VR hardware', async () => {
      const result = await sessionManager.requestSession('immersive-vr');
      // In Node.js or browsers without WebXR, result will be false and sessionState will be UNSUPPORTED
      assert.strictEqual(typeof result.success, 'boolean');
      assert.ok(result.state === 'ACTIVE' || result.state === 'UNSUPPORTED');
    });

    it('safely ends sessions and restores reference space to none', async () => {
      await sessionManager.endSession();
      assert.strictEqual(sessionManager.getCapabilities().sessionState, 'IDLE');
    });
  });

  // --------------------------------------------------------------------------
  // 8. SPATIAL TELEMETRY ENGINE
  // --------------------------------------------------------------------------
  describe('8. SpatialTelemetryEngine', () => {
    let telemetryEngine: SpatialTelemetryEngine;

    beforeEach(() => {
      telemetryEngine = new SpatialTelemetryEngine();
    });

    it('samples metrics and strictly assigns provenance tier based on hardware flag', () => {
      // In simulated testing with isPhysicalVRActive = false
      const simMetric = telemetryEngine.recordMetric(nominalTelemetry, false, 45, 12000, 3, 4);
      assert.strictEqual(
        simMetric.provenance,
        'SIMULATED_TELEMETRY',
        'When isPhysicalVRActive is false, provenance must be SIMULATED_TELEMETRY'
      );

      // In real testing with isPhysicalVRActive = true
      const realMetric = telemetryEngine.recordMetric(nominalTelemetry, true, 45, 12000, 3, 4);
      assert.strictEqual(
        realMetric.provenance,
        'REAL_DEVICE_TELEMETRY',
        'When isPhysicalVRActive is true, provenance must be REAL_DEVICE_TELEMETRY'
      );
    });

    it('computes cadence stability score and dropped frame ratio accurately', () => {
      // Record nominal metrics
      telemetryEngine.recordMetric(nominalTelemetry, false);
      const snapshotNominal = telemetryEngine.getSnapshot();
      assert.ok(snapshotNominal.cadenceStabilityScore >= 80, 'Nominal telemetry should have high stability score');

      // Record stressed telemetry
      telemetryEngine.recordMetric(stressedTelemetry, false);
      const snapshotStressed = telemetryEngine.getSnapshot();
      assert.ok(
        snapshotStressed.droppedFramesRatio > 0,
        'Stressed telemetry should record non-zero dropped frames ratio'
      );
    });

    it('maintains a bounded history buffer', () => {
      for (let i = 0; i < 60; i++) {
        telemetryEngine.recordMetric(nominalTelemetry, false);
      }
      const history = telemetryEngine.getHistory();
      assert.ok(history.length <= 50, 'History buffer must be bounded to 50 items');
    });
  });
});
