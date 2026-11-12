/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Virtual WebXR Hardware Simulation & Integration Validation Suite (Section 5 & Section 7)
 */

import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  VIRTUAL_XR_JOINT_NAMES,
  VirtualXREnvironment,
} from '../src/simulation/VirtualXREnvironment';
import {
  runAllVirtualXRScenarios,
  VirtualXRSimulationHarness,
} from '../src/simulation/VirtualXRSimulationHarness';
import { WebXRCompatibilityManager } from '../src/spatial/WebXRCompatibilityManager';
import { XRSessionManager } from '../src/engines/XRSessionManager';

describe('Virtual WebXR Hardware Simulation & Validation Suite', () => {
  const originalNavigator = (globalThis as { navigator?: unknown }).navigator;
  const originalXRHand = (globalThis as { XRHand?: unknown }).XRHand;

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      configurable: true,
      writable: true,
    });
    if (originalXRHand === undefined) {
      delete (globalThis as { XRHand?: unknown }).XRHand;
    } else {
      Object.defineProperty(globalThis, 'XRHand', {
        value: originalXRHand,
        configurable: true,
        writable: true,
      });
    }
    XRSessionManager.resetInstance();
  });

  it('1. generates all 25 realistic XR hand joints per hand cleanly and never mutates global navigator.xr', () => {
    const beforeNav = (globalThis as { navigator?: unknown }).navigator;
    const env = new VirtualXREnvironment();
    const snap = env.getSnapshot();

    assert.equal(snap.isDevSimulationOnly, true);
    assert.equal(snap.leftHand.validJointsCount, 25);
    assert.equal(snap.rightHand.validJointsCount, 25);

    for (const jn of VIRTUAL_XR_JOINT_NAMES) {
      assert.ok(snap.leftHand.joints[jn], `Missing left joint ${jn}`);
      assert.ok(snap.rightHand.joints[jn], `Missing right joint ${jn}`);
      assert.ok(Number.isFinite(snap.leftHand.joints[jn]!.position[0]));
      assert.ok(Number.isFinite(snap.rightHand.joints[jn]!.position[2]));
    }

    assert.equal((globalThis as { navigator?: unknown }).navigator, beforeNav);
  });

  it('2. computes accurate palm-up score when wrist rotates toward head and negative score at rest', () => {
    const env = new VirtualXREnvironment();
    const restLeft = env.buildHandFrame('left');
    const restRight = env.buildHandFrame('right');
    assert.ok(restLeft.palmUpScore < 0, `Expected negative rest left palmUpScore, got ${restLeft.palmUpScore}`);
    assert.ok(restRight.palmUpScore < 0, `Expected negative rest right palmUpScore, got ${restRight.palmUpScore}`);

    env.setPalmFacingHead('left', true);
    env.setPalmFacingHead('right', true);
    const openLeft = env.buildHandFrame('left');
    const openRight = env.buildHandFrame('right');
    assert.ok(openLeft.palmUpScore > 0.62, `Expected left palmUpScore > 0.62, got ${openLeft.palmUpScore}`);
    assert.ok(openRight.palmUpScore > 0.62, `Expected right palmUpScore > 0.62, got ${openRight.palmUpScore}`);
  });

  it('3. executes all deterministic Virtual XR gesture, spatial, and failure-injection scenarios with 100% pass rate', () => {
    const results = runAllVirtualXRScenarios();
    assert.ok(results.length >= 10, `Expected at least 10 scenarios, got ${results.length}`);

    for (const res of results) {
      assert.equal(res.passed, true, `Scenario "${res.id}" (${res.name}) failed: ${res.summary}`);
    }
  });

  it('4. prevents duplicate gesture execution during rapid multi-event bursts and recovers cleanly after cooldown', () => {
    const harness = new VirtualXRSimulationHarness();
    let count = 0;

    for (let i = 0; i < 15; i++) {
      if (harness.executeVRUIAction({ type: 'START_MISSION' }, 'right', 'dup-token-1')) {
        count++;
      }
      harness.env.advanceClock(12);
    }

    assert.equal(count, 1, 'Repeated gesture within burst window must execute exactly once');
    harness.env.advanceClock(520);
    assert.equal(
      harness.executeVRUIAction({ type: 'PAUSE_MISSION' }, 'right', 'distinct-token-2'),
      true
    );
  });

  it('5. guarantees zero transform corruption or NaN leakage under invalid joint coordinate fault injection', () => {
    const harness = new VirtualXRSimulationHarness();
    harness.env.setHandState('right', { wristPosition: [3.64, 1.25, -2.0], pinchApertureMeters: 0.015 });
    harness.stepFrame(16.6);
    harness.grabCrystalWithHand('right', 'ruby', 'grab-ruby-fault');
    const initialRot = harness.getDashboardState().crystals.find((c) => c.id === 'ruby')!.rotationY;

    for (const fault of ['teleport_spike', 'nan_joint', 'infinity_joint', 'zero_origin', 'out_of_bounds'] as const) {
      harness.env.injectFault('right', fault);
      const state = harness.stepFrame(16.6);
      const rubyRot = state.crystals.find((c) => c.id === 'ruby')!.rotationY;
      assert.ok(Number.isFinite(rubyRot), `Crystal rotation must stay finite under fault=${fault}`);
      assert.equal(rubyRot, initialRot, `Crystal rotation must not jump under fault=${fault}`);
    }

    assert.ok(harness.getDashboardState().rightHand.rejectedInvalidFrames >= 5);
  });

  it('6. supports full puzzle alignment and cipher navigation with zero controller dependencies', () => {
    const harness = new VirtualXRSimulationHarness();
    harness.executeVRUIAction({ type: 'START_MISSION' }, 'right', 'start-1');
    const state = harness.getDashboardState();
    assert.equal(state.controllerDependencyCount, 0);
    assert.equal(state.gamePhase, 'playing');

    harness.env.advanceClock(520);
    assert.equal(harness.executeVRUIAction({ type: 'OPEN_DECODER' }, 'left', 'dec-1'), true);
    assert.equal(harness.getDashboardState().gamePhase, 'decoding');

    harness.env.advanceClock(520);
    assert.equal(harness.executeVRUIAction({ type: 'OPEN_STORY' }, 'left', 'story-1'), true);
    assert.equal(harness.getDashboardState().gamePhase, 'story');
  });

  it('7. probes real browser WebXR + XRHand feature flags and falls back across reference spaces while preserving physicalHardwareCertified=false', async () => {
    // Emulate a compliant browser WebXR runtime temporarily inside test scope
    Object.defineProperty(globalThis, 'XRHand', {
      value: class MockXRHandAPI {},
      configurable: true,
      writable: true,
    });

    const requestedSpaces: string[] = [];
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        userAgent: 'TestBrowser/1.0',
        maxTouchPoints: 0,
        xr: {
          isSessionSupported: async (mode: string) => mode === 'immersive-vr' || mode === 'inline',
          requestSession: async () => ({
            enabledFeatures: new Set(['local-floor', 'hand-tracking']),
            addEventListener: () => {},
            requestReferenceSpace: async (space: string) => {
              requestedSpaces.push(space);
              if (space === 'local-floor') {
                throw new Error('local-floor unavailable');
              }
              return { type: space };
            },
            end: async () => {},
          }),
        },
      },
      configurable: true,
      writable: true,
    });

    XRSessionManager.resetInstance();
    const sm = XRSessionManager.getInstance();
    const compat = new WebXRCompatibilityManager(sm);
    const matrix = await compat.detectCapabilities();

    assert.equal(matrix.isWebXRAvailable, true);
    assert.equal(matrix.immersiveVR, true);
    assert.equal(matrix.handTracking, true);
    assert.ok(matrix.supportedReferenceSpaces.includes('local-floor'));
    assert.ok(matrix.supportedReferenceSpaces.includes('bounded-floor'));
    assert.equal(
      matrix.physicalHardwareCertified,
      false,
      'Software probing must never claim physical hardware certification'
    );

    const sessionRes = await sm.requestImmersiveSession();
    assert.equal(sessionRes.success, true);
    assert.ok(requestedSpaces.includes('local-floor'));
    assert.ok(requestedSpaces.includes('bounded-floor'));
    assert.equal(sm.getCapabilities().activeReferenceSpaceType, 'bounded-floor');
  });
});
