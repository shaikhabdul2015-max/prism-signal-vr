/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 21 Test Suite: AI-Powered Digital Twin Platform & Scenario Simulation Lab.
 * Validates real-time VR environment mirroring, state versioning, checksum integrity,
 * configurable environmental simulations, strict hardware isolation, multi-horizon
 * predictive modeling, and collective 6-agent evaluations.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { DigitalTwinEngine } from '../src/utils/DigitalTwinEngine';
import {
  EnvironmentSimulationEngine,
  DEFAULT_SIMULATION_SCENARIOS,
} from '../src/utils/EnvironmentSimulationEngine';
import { VRTelemetry } from '../src/types/diagnostics';
import { CrystalData, PuzzleProgressState } from '../src/types/game';
import { AgentRole } from '../src/types/phase17';

describe('Phase 21: Digital Twin Core & VR Object Mirroring', () => {
  beforeEach(() => {
    DigitalTwinEngine.resetInstance();
  });

  it('initializes DigitalTwinEngine with complete chamber objects and deterministic checksum', () => {
    const engine = DigitalTwinEngine.getInstance();
    const snapshot = engine.getSnapshot();

    assert.ok(snapshot);
    assert.strictEqual(snapshot.version, 1);
    assert.ok(snapshot.checksum.startsWith('TWIN-'));
    assert.strictEqual(snapshot.syncIntegrity.synchronized, true);

    // Verify all 5 optical nodes are present
    const objects = snapshot.objects;
    assert.ok(objects['ruby']);
    assert.ok(objects['azure']);
    assert.ok(objects['emerald']);
    assert.ok(objects['console_emitter']);
    assert.ok(objects['target_receiver']);

    assert.strictEqual(objects['ruby'].nodeType, 'core_crystal');
    assert.strictEqual(objects['azure'].nodeType, 'reflector_array');
    assert.strictEqual(objects['emerald'].nodeType, 'focus_prism');
    assert.strictEqual(objects['console_emitter'].nodeType, 'beam_emitter');
    assert.strictEqual(objects['target_receiver'].nodeType, 'target_receiver');
  });

  it('synchronizes digital twin state with telemetry and crystal rotations', () => {
    const engine = DigitalTwinEngine.getInstance();

    const mockTelemetry: VRTelemetry = {
      sessionId: 'test-twin-sync',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: true,
        confidence: 0.95,
      })),
      frames: [
        {
          timestampMs: 1000,
          frameDurationMs: 13.88,
          dropped: false,
        },
      ],
      trackingEvents: [],
      latencySamples: [],
      lightingPreset: 'bright_studio',
      thresholds: {},
      executedCategories: [],
      autoSavedAt: new Date().toISOString(),
    };

    const mockCrystals: CrystalData[] = [
      {
        id: 'ruby',
        name: 'Ruby Harmonic Core',
        designation: 'PRISM-A',
        frequency: 440,
        hexColor: '#ef4444',
        colorNumber: 0xff0000,
        lightIntensity: 1,
        defaultPosition: [3.64, 1.25, -2.1],
        currentPosition: [3.64, 1.25, -2.1],
        rotationY: Math.PI / 2, // 90 degrees
        rotationX: 0,
        targetRotationY: 2.1,
        isAligned: true,
        pedestalSlot: 0,
        resonancePercent: 85,
        isReceivingLight: true,
        isReflectingToTarget: true,
      },
    ];

    const mockProgress: PuzzleProgressState = {
      isBeamSourceActive: true,
      activeSegmentCount: 1,
      totalSegments: 4,
      isRubyPowered: true,
      isAzurePowered: false,
      isEmeraldPowered: false,
      isTargetReceiverHit: false,
      overallProgressPercent: 45,
      beamChainStatus: {
        consoleToRuby: true,
        rubyToAzure: false,
        azureToEmerald: false,
        emeraldToTarget: false,
      },
    };

    const updated = engine.synchronizeState(mockTelemetry, mockCrystals, mockProgress);

    assert.strictEqual(updated.version, 2);
    assert.strictEqual(updated.objects['ruby'].rotationYDeg, 90);
    assert.strictEqual(updated.objects['ruby'].isAligned, true);
    assert.strictEqual(updated.objects['ruby'].resonancePercent, 85);
    assert.strictEqual(updated.cadence.currentFps, 72);
    assert.strictEqual(updated.tracking.trackedJoints, 25);
    assert.strictEqual(updated.tracking.stability, 'Optimal');
    assert.strictEqual(updated.environment.lightBeamCoherence, 45);
  });

  it('maintains bounded snapshot history without memory leaks', () => {
    const engine = DigitalTwinEngine.getInstance();

    const mockTelemetry: VRTelemetry = {
      sessionId: 'test-mem-leak',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: [],
      frames: [],
      trackingEvents: [],
      latencySamples: [],
      lightingPreset: 'bright_studio',
      thresholds: {},
      executedCategories: [],
    };

    for (let i = 0; i < 65; i++) {
      engine.synchronizeState(mockTelemetry);
    }

    const history = engine.getSnapshotHistory();
    assert.ok(history.length <= 50, `History length ${history.length} should be clamped to 50`);
    assert.strictEqual(history[0].version, 66);
  });
});

describe('Phase 21: Scenario Simulation Lab & Strict Hardware Isolation', () => {
  beforeEach(() => {
    EnvironmentSimulationEngine.resetInstance();
  });

  it('exposes predefined stress scenarios covering lighting, cadence, occlusion, and network', () => {
    const simEngine = EnvironmentSimulationEngine.getInstance();
    const scenarios = simEngine.getAvailableScenarios();

    assert.ok(scenarios.length >= 4);
    const categories = scenarios.map((s) => s.category);
    assert.ok(categories.includes('environmental_lighting'));
    assert.ok(categories.includes('frame_cadence'));
    assert.ok(categories.includes('network_partition'));
    assert.ok(categories.includes('kinematic_drift'));
  });

  it('executes simulation session and strictly marks output as isolated from hardware', () => {
    const simEngine = EnvironmentSimulationEngine.getInstance();

    const baselineTelemetry: VRTelemetry = {
      sessionId: 'hardware-baseline',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: true,
        confidence: 0.95,
      })),
      frames: [{ timestampMs: 1000, frameDurationMs: 13.88, dropped: false }],
      trackingEvents: [],
      latencySamples: [],
      lightingPreset: 'bright_studio',
      thresholds: {},
      executedCategories: [],
    };

    const session = simEngine.startSimulation('scen-gpu-cadence-saturation', baselineTelemetry);

    assert.ok(session);
    assert.strictEqual(session.status, 'RUNNING');
    assert.strictEqual(session.scenarioId, 'scen-gpu-cadence-saturation');

    // CRITICAL MANDATORY INVARIANT: Strict Hardware Isolation
    assert.strictEqual(session.isolatedFromHardware, true);

    // Verify variance computation
    assert.ok(session.variance.fpsDelta < 0, 'Simulation should reflect reduced cadence');
    assert.ok(session.simulatedMetrics.fps <= 45);

    // Pause and Resume operations
    const paused = simEngine.pauseSimulation();
    assert.strictEqual(paused?.status, 'PAUSED');

    const resumed = simEngine.resumeSimulation();
    assert.strictEqual(resumed?.status, 'RUNNING');

    // Reset operation
    simEngine.resetSimulation();
    assert.strictEqual(simEngine.getActiveSession(), null);
  });

  it('generates 1s, 5s, and 15s predictive future estimates with labeled confidence scores', () => {
    const simEngine = EnvironmentSimulationEngine.getInstance();

    const estimates = simEngine.generatePredictiveEstimates(42, 600, 14, 'HIGH');

    assert.strictEqual(estimates.length, 3);
    const [h1, h5, h15] = estimates;

    assert.strictEqual(h1.horizonSeconds, 1);
    assert.strictEqual(h5.horizonSeconds, 5);
    assert.strictEqual(h15.horizonSeconds, 15);

    // Verify confidence scores are bounded and strictly labeled
    assert.ok(h1.confidenceScore >= 0.85 && h1.confidenceScore <= 1.0);
    assert.ok(h5.confidenceScore >= 0.75 && h5.confidenceScore <= 1.0);
    assert.ok(h15.confidenceScore >= 0.60 && h15.confidenceScore <= 1.0);

    // Dropout risk should scale with horizon
    assert.ok(h15.trackingDropoutRiskPercent >= h1.trackingDropoutRiskPercent);
  });

  it('synthesizes multi-agent evaluations from all six specialist roles', () => {
    const simEngine = EnvironmentSimulationEngine.getInstance();
    const scenario = DEFAULT_SIMULATION_SCENARIOS[0];

    const evaluations = simEngine.runAgentEvaluations(
      { fps: 70, latencyMs: 25, trackedJoints: 12, stabilityScore: 60 },
      scenario
    );

    const requiredRoles: AgentRole[] = [
      'OperationsAgent',
      'TestAgent',
      'TrackingAgent',
      'PerformanceAgent',
      'IncidentAgent',
      'ChiefIntelligenceAgent',
    ];

    requiredRoles.forEach((role) => {
      const evalData = evaluations[role];
      assert.ok(evalData, `Evaluation for ${role} must exist`);
      assert.ok(evalData.verdict.length > 0);
      assert.ok(evalData.confidence >= 0.8);
      assert.ok(evalData.recommendations.length > 0);
    });

    // Tracking specialist should flag optical tracking compromised when trackedJoints = 12
    assert.strictEqual(evaluations.TrackingAgent.verdict, 'OPTICAL TRACKING COMPROMISED');
  });
});
