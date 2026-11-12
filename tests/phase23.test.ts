/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23 Test Suite: Advanced Autonomous Command & Control System.
 * Tests Unified Command Center module registration, health aggregation,
 * Human-in-the-loop approval gates, timeout expirations,
 * Autonomous Operations Manager bounded limits, 6-agent coordination,
 * Predictive Mission Control risk vectors, System Intelligence Monitor fallbacks,
 * and hash-chained command audit trails.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { UnifiedCommandCenter } from '../src/engines/UnifiedCommandCenter';
import { HumanApprovalManager } from '../src/engines/HumanApprovalManager';
import { AutonomousOperationsManager } from '../src/engines/AutonomousOperationsManager';
import { PredictiveMissionControl } from '../src/engines/PredictiveMissionControl';
import { SystemIntelligenceMonitor } from '../src/engines/SystemIntelligenceMonitor';
import { CommandAuditService } from '../src/services/CommandAuditService';
import { VRTelemetry } from '../src/types/diagnostics';
import { RegisteredModule } from '../src/types/phase23';

describe('Phase 23: Unified Command Center & Module Registry', () => {
  beforeEach(() => {
    UnifiedCommandCenter.resetInstance();
  });

  it('initializes with default core modules and aggregates unified operational status', () => {
    const ucc = UnifiedCommandCenter.getInstance();
    const modules = ucc.getRegisteredModules();

    assert.ok(modules.length >= 7, 'Default 7 modules from Phases 1-22 should be registered');
    const categories = modules.map((m) => m.category);
    assert.ok(categories.includes('CORE_TELEMETRY'));
    assert.ok(categories.includes('AI_INTELLIGENCE'));
    assert.ok(categories.includes('DIGITAL_TWIN'));
    assert.ok(categories.includes('MISSION_PLANNING'));
    assert.ok(categories.includes('SECURITY_RBAC'));
    assert.ok(categories.includes('CLOUD_INFRASTRUCTURE'));

    const status = ucc.getUnifiedOperationalStatus();
    assert.strictEqual(status.overallStatus, 'OPTIMAL');
    assert.strictEqual(status.healthyCount, modules.length);
  });

  it('updates module health and dynamically detects degraded or critical operational states', () => {
    const ucc = UnifiedCommandCenter.getInstance();

    ucc.updateModuleHealth('mod-core-telemetry', 'DEGRADED', 45.2, { cadenceFps: 42 });
    let status = ucc.getUnifiedOperationalStatus();
    assert.strictEqual(status.overallStatus, 'DEGRADED');
    assert.strictEqual(status.degradedCount, 1);

    ucc.updateModuleHealth('mod-cloud-infra', 'CRITICAL', 1800);
    status = ucc.getUnifiedOperationalStatus();
    assert.strictEqual(status.overallStatus, 'CRITICAL');
    assert.strictEqual(status.criticalCount, 1);
  });

  it('registers custom modules and dispatches commands with execution history tracking', () => {
    const ucc = UnifiedCommandCenter.getInstance();

    const customModule: RegisteredModule = {
      moduleId: 'mod-custom-spatial',
      name: 'Custom Spatial Mesh Processor',
      category: 'DIGITAL_TWIN',
      version: '1.0.0',
      status: 'HEALTHY',
      lastHeartbeat: new Date().toISOString(),
      latencyMs: 1.5,
      activeWorkloads: 0,
      capabilities: ['point_cloud_mesh'],
    };

    ucc.registerModule(customModule);
    assert.ok(ucc.getModule('mod-custom-spatial'));

    const cmd = ucc.dispatchCommand({
      commandName: 'Rebuild Spatial Mesh Anchors',
      targetModuleId: 'mod-custom-spatial',
      initiator: 'OperationsAgent',
      parameters: { voxelResolution: 0.05 },
      impactLevel: 'LOW',
      requiresApproval: false,
    });

    assert.strictEqual(cmd.status, 'SUCCESS');
    assert.strictEqual(cmd.targetModuleId, 'mod-custom-spatial');

    const history = ucc.getCommandHistory();
    assert.ok(history.some((c) => c.commandId === cmd.commandId));
  });
});

describe('Phase 23: Human-in-the-Loop Approval Manager', () => {
  beforeEach(() => {
    HumanApprovalManager.resetInstance();
  });

  it('gates high-impact commands through approval requests with operator authorize and reject', () => {
    const ham = HumanApprovalManager.getInstance();

    const req = ham.createApprovalRequest({
      commandId: 'cmd-test-gate-01',
      commandName: 'Dynamic Shader Governor Throttling',
      actionSummary: 'Downclock GPU fragment pipeline to avert thermal shutdown.',
      initiator: 'PerformanceAgent',
      targetModule: 'mod-core-telemetry',
      impactLevel: 'HIGH',
      justification: 'Thermal throttling warning threshold exceeded.',
      riskAssessmentSummary: 'Cadence temporarily clamped to 60Hz.',
    });

    assert.ok(req.approvalId.startsWith('appr-'));
    assert.strictEqual(req.status, 'PENDING');
    assert.strictEqual(ham.isCommandAuthorized(req.commandId), false);

    // Operator approves the command
    const approved = ham.approveRequest(req.approvalId, 'OPERATOR_QA_LEAD', 'Authorized under SOP-402');
    assert.strictEqual(approved, true);
    assert.strictEqual(req.status, 'APPROVED');
    assert.strictEqual(ham.isCommandAuthorized(req.commandId), true);
  });

  it('expires pending approval requests when timeout window elapses', () => {
    const ham = HumanApprovalManager.getInstance();

    // Create a request with 1ms timeout
    const req = ham.createApprovalRequest({
      commandId: 'cmd-test-timeout',
      commandName: 'Emergency Optical Buffer Reset',
      actionSummary: 'Reset optical buffer.',
      initiator: 'TrackingAgent',
      targetModule: 'mod-core-telemetry',
      impactLevel: 'HIGH',
      justification: 'Timeout testing.',
      riskAssessmentSummary: 'Test timeout.',
      timeoutMs: -100, // already expired
    });

    // Query pending requests triggers timeout check
    const pending = ham.getPendingRequests();
    assert.ok(!pending.some((r) => r.approvalId === req.approvalId));
    assert.strictEqual(req.status, 'EXPIRED');
    assert.strictEqual(ham.isCommandAuthorized(req.commandId), false);
  });
});

describe('Phase 23: Autonomous Operations Manager & 6-Agent Coordination', () => {
  beforeEach(() => {
    AutonomousOperationsManager.resetInstance();
    HumanApprovalManager.resetInstance();
  });

  it('detects operational bottlenecks and auto-executes low-impact actions while gating high-impact actions', () => {
    const aom = AutonomousOperationsManager.getInstance();

    const mockTelemetry: VRTelemetry = {
      sessionId: 'test-bottlenecks',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: i < 14, // severe occlusion
        confidence: 0.6,
      })),
      frames: [{ timestampMs: 1000, frameDurationMs: 25.0, dropped: true }], // 40 FPS
      trackingEvents: [],
      latencySamples: [{ timestampMs: 1000, latencyMs: 65 }], // network spike
      lightingPreset: 'backlit_glare',
      thresholds: {},
      executedCategories: [],
    };

    const { bottlenecks, recommendedActions } = aom.analyzeBottlenecks(mockTelemetry);
    assert.ok(bottlenecks.length >= 2);
    assert.ok(recommendedActions.length >= 2);

    // High impact operation should be gated to approval queue
    const highImpact = recommendedActions.find((a) => a.impact === 'HIGH');
    assert.ok(highImpact);
    const highRes = aom.executeOperation(highImpact);
    assert.strictEqual(highRes.executed, false);
    assert.strictEqual(highRes.requiresApproval, true);

    // Low impact operation executes autonomously
    const lowImpact = recommendedActions.find((a) => a.impact === 'LOW');
    assert.ok(lowImpact);
    const lowRes = aom.executeOperation(lowImpact);
    assert.strictEqual(lowRes.executed, true);
    assert.strictEqual(lowRes.requiresApproval, false);
  });

  it('enforces bounded consecutive autonomous actions to prevent runaway automated execution', () => {
    const aom = AutonomousOperationsManager.getInstance();
    aom.setConfig({ maxConsecutiveAutonomousActions: 2 });

    const safeAction = {
      title: 'Routine Sensor Calibration',
      targetModule: 'mod-core-telemetry',
      agent: 'OperationsAgent' as const,
      impact: 'LOW' as const,
      actionSummary: 'Calibrate sensor noise.',
    };

    const res1 = aom.executeOperation(safeAction);
    assert.strictEqual(res1.executed, true);

    const res2 = aom.executeOperation(safeAction);
    assert.strictEqual(res2.executed, true);

    // 3rd action exceeds limit of 2
    const res3 = aom.executeOperation(safeAction);
    assert.strictEqual(res3.executed, false);
    assert.ok(res3.reason?.includes('Reached limit'));

    // Resetting counter allows execution to resume
    aom.resetActionCounter();
    const res4 = aom.executeOperation(safeAction);
    assert.strictEqual(res4.executed, true);
  });

  it('resolves conflicting directives among specialist agents with logged consensus', () => {
    const aom = AutonomousOperationsManager.getInstance();

    const conflict = aom.resolveConflict(
      ['PerformanceAgent', 'TrackingAgent'],
      ['Reduce polling frequency to 30Hz for thermal relief', 'Increase optical polling to 90Hz for precision'],
      'PRIORITY_OVERRIDE'
    );

    assert.ok(conflict);
    assert.strictEqual(conflict.isResolved, true);
    assert.ok(conflict.winningDirective?.length);
    assert.ok(aom.getConflicts().some((c) => c.conflictId === conflict.conflictId));
  });
});

describe('Phase 23: Predictive Mission Control & Sensor Intelligence Monitor', () => {
  beforeEach(() => {
    PredictiveMissionControl.resetInstance();
    SystemIntelligenceMonitor.resetInstance();
  });

  it('clearly distinguishes measured physical data from simulated predictive models', () => {
    const pmc = PredictiveMissionControl.getInstance();

    const mockTelemetry: VRTelemetry = {
      sessionId: 'test-risk-vectors',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: Array.from({ length: 25 }, (_, i) => ({
        jointId: `joint_${i}`,
        tracked: true,
        confidence: 0.95,
      })),
      frames: [{ timestampMs: 1000, frameDurationMs: 13.88, dropped: false }],
      trackingEvents: [],
      latencySamples: [{ timestampMs: 1000, latencyMs: 14 }],
      lightingPreset: 'bright_studio',
      thresholds: {},
      executedCategories: [],
    };

    const assessment = pmc.evaluateMissionRisk('mission_risk_01', mockTelemetry);

    assert.ok(assessment);
    assert.strictEqual(assessment.riskVectors.length, 5);

    // Verify hardware sensors and cadence are marked measured
    const hardwareVector = assessment.riskVectors.find((v) => v.dimension === 'HARDWARE_SENSORS');
    assert.strictEqual(hardwareVector?.isMeasuredData, true);

    const cadenceVector = assessment.riskVectors.find((v) => v.dimension === 'FRAME_CADENCE');
    assert.strictEqual(cadenceVector?.isMeasuredData, true);

    // Verify thermal headroom and optical environment are marked simulated/predictive
    const thermalVector = assessment.riskVectors.find((v) => v.dimension === 'THERMAL_HEADROOM');
    assert.strictEqual(thermalVector?.isMeasuredData, false);

    // Verify uncertainty disclaimer is present
    assert.ok(assessment.uncertaintyDisclaimer.includes('DISCLAIMER'));
    assert.ok(assessment.uncertaintyDisclaimer.includes('probabilistic'));
  });

  it('displays Unavailable when hardware metrics are missing instead of inventing values', () => {
    const sim = SystemIntelligenceMonitor.getInstance();

    // Telemetry with completely empty frames and joints
    const emptyTelemetry: VRTelemetry = {
      sessionId: 'empty-tel',
      startedAt: new Date().toISOString(),
      expectedJointCount: 25,
      joints: [],
      frames: [],
      trackingEvents: [],
      latencySamples: [],
      lightingPreset: null,
      thresholds: {},
      executedCategories: [],
    };

    const report = sim.generateReport(emptyTelemetry);

    assert.strictEqual(report.telemetry.cadenceFps, 'Unavailable');
    assert.strictEqual(report.telemetry.frameDeltaMs, 'Unavailable');
    assert.strictEqual(report.telemetry.trackedJoints, 'Unavailable');
    assert.strictEqual(report.telemetry.latencyMs, 'Unavailable');
    assert.ok(report.cloudSync.mode.length > 0);
  });
});

describe('Phase 23: Hash-Chained Audit Trail & Security Verification', () => {
  beforeEach(() => {
    CommandAuditService.resetInstance();
  });

  it('maintains a continuous cryptographic hash chain linking sequential audit entries', () => {
    const cas = CommandAuditService.getInstance();

    const e1 = cas.recordEntry({
      eventType: 'COMMAND_DISPATCHED',
      actor: 'OPERATOR',
      details: 'Audit test event 1',
      impactLevel: 'LOW',
    });

    const e2 = cas.recordEntry({
      eventType: 'APPROVAL_GRANTED',
      actor: 'OPERATOR',
      details: 'Audit test event 2',
      impactLevel: 'HIGH',
    });

    assert.strictEqual(e2.previousHash, e1.currentHash);
    assert.strictEqual(e2.sequenceNumber, e1.sequenceNumber + 1);

    // Verification check should pass
    const verification = cas.verifyChainIntegrity();
    assert.strictEqual(verification.isValid, true);

    // Strictly does not claim immutable storage is configured
    assert.strictEqual(e1.immutableStorageVerified, false);
    assert.strictEqual(e2.immutableStorageVerified, false);
  });
});
