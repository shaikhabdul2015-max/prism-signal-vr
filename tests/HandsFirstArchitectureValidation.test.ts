/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Comprehensive Validation Suite: Hands-First WebXR Architecture
 * Covers:
 * 1. Advanced Gesture Calibration (reach, pinch thresholds, left/right dominant hand, privacy, skip/cancel/interruption, mid-game recalibration)
 * 2. Global Gesture Debouncing (per-category/target cooldowns, eventToken bubbling protection, smooth_turn pass-through, VRSpatialUI wiring)
 * 3. Lost Hand Tracking Recovery (NaN/zero/bounds/spike validation, grace freeze, safe release, multi-frame reacquisition without crystal jump)
 * 4. Seated & Standing Accessibility (floor-level vs local reference space, eye-height elevation adaptation, snap vs smooth turn, left/right wrist menu)
 * 5. Zero Controller Dependency (100% playable loop through 3D spatial menus without controllers or keyboard)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  GlobalGestureDebouncer,
  DEFAULT_GESTURE_COOLDOWNS_MS,
  categorizeVRUIActionType,
} from '../src/scene/gestureDebouncer';
import {
  GestureCalibrationManager,
  AccessibilityLayoutManager,
  DEFAULT_CALIBRATION_PROFILE,
} from '../src/scene/xrAccessibility';
import {
  validateHandCoordinates,
  evaluateHandRecoveryTransition,
  resolvePinchTransition,
  DEFAULT_RECOVERY_CONFIG,
  HandRecoverySnapshot,
} from '../src/scene/handInteraction';
import {
  buildWristMenuButtons,
  buildChamberPhaseButtons,
  createVRSpatialUI,
  VRUISyncState,
} from '../src/scene/vrSpatialUI';
import { createCrystals } from '../src/scene/crystals';
import { DEFAULT_CRYSTALS, TARGET_DECODING_SEQUENCE } from '../src/puzzle/puzzleEngine';

function makeSyncState(overrides: Partial<VRUISyncState> = {}): VRUISyncState {
  return {
    phase: 'playing',
    totalCoherence: 42,
    isBeamSourceActive: true,
    decodingState: {
      isUnlocked: false,
      selectedSequence: [],
      targetSequence: [...TARGET_DECODING_SEQUENCE],
      isSolved: false,
      attempts: 0,
      lastFeedback: { status: 'idle', message: '', correctCount: 0 },
      cluesScannerOpen: false,
    },
    storyChapterIndex: 0,
    selectedCrystalId: 'ruby',
    handTrackingStatus: 'active',
    activeHandsCount: 2,
    ...overrides,
  };
}

function makeRecoverySnapshot(hand: 'left' | 'right' = 'right'): HandRecoverySnapshot {
  return {
    hand,
    state: 'untracked',
    lostSinceMs: null,
    stabilizationFramesRemaining: 0,
    freezeRotationActive: false,
    preservedCrystalId: null,
    preservedRotationY: null,
    lastValidWristPos: null,
    recoveryCount: 0,
  };
}

describe('1. Advanced Gesture Calibration (XRHand Capabilities, Reach, Pinch, Left/Right, Privacy)', () => {
  it('detects XRHand capabilities from session enabledFeatures & inputSources and calibrates personalized right/left profiles', () => {
    const cal = new GestureCalibrationManager();
    const mockSession = {
      enabledFeatures: ['local-floor', 'hand-tracking'],
      inputSources: [
        { handedness: 'left', hand: {} },
        { handedness: 'right', hand: {} },
      ],
    } as unknown as XRSession;

    const caps = cal.detectCapabilitiesFromSession(true, mockSession, 'local-floor');
    assert.equal(caps.xrSupported, true);
    assert.equal(caps.handTrackingGranted, true);
    assert.equal(caps.leftHandTracked, true);
    assert.equal(caps.rightHandTracked, true);
    assert.equal(caps.hasFloorLevel, true);

    cal.beginCalibration(caps);
    assert.equal(cal.getState().status, 'in_progress');
    assert.equal(cal.getState().step, 'comfort_reach');

    // Feed 8 comfort reach samples for left-handed user reaching ~0.68m
    for (let i = 0; i < 8; i++) {
      cal.sampleFrame({
        headPosition: [0, 1.25, 0],
        leftHand: {
          isTracking: true,
          wristPos: [-0.25, 1.07, -0.63], // ~0.678m reach
          pinchDistanceMeters: 0.085,
          isPinching: false,
        },
        rightHand: {
          isTracking: true,
          wristPos: [0.22, 0.95, -0.4],
          pinchDistanceMeters: 0.09,
          isPinching: false,
        },
        nowMs: 1000 + i * 20,
      });
    }

    assert.equal(cal.getState().step, 'pinch_confirm');
    assert.ok(cal.getState().progressPercent >= 70);

    // Confirm with 3 intentional pinches on LEFT hand -> automatically assigns left dominant & mirrors wristMenuHand to right
    for (let i = 0; i < 3; i++) {
      cal.sampleFrame({
        headPosition: [0, 1.25, 0],
        leftHand: {
          isTracking: true,
          wristPos: [-0.25, 1.07, -0.63],
          pinchDistanceMeters: 0.016,
          isPinching: true,
        },
        rightHand: {
          isTracking: true,
          wristPos: [0.22, 0.95, -0.4],
          pinchDistanceMeters: 0.085,
          isPinching: false,
        },
        nowMs: 1200 + i * 30,
      });
    }

    const done = cal.getState();
    assert.equal(done.status, 'completed');
    assert.equal(done.step, 'done');
    assert.equal(done.progressPercent, 100);
    assert.equal(done.profile.isCalibrated, true);
    assert.equal(done.profile.dominantHand, 'left');
    assert.equal(done.profile.wristMenuHand, 'right');
    assert.ok(done.profile.comfortableReachMeters > 0.62 && done.profile.comfortableReachMeters < 0.75);
    assert.ok(done.profile.pinchStartThreshold >= 0.02 && done.profile.pinchStartThreshold <= 0.033);
    assert.ok(done.profile.pinchEndThreshold > done.profile.pinchStartThreshold + 0.01);

    // Privacy hygiene: exported config contains only scalar configuration thresholds (no arrays, joint names, or timestamps)
    const privacySafe = cal.exportPrivacySafeConfig();
    assert.equal('calibratedAtMs' in privacySafe, false);
    assert.equal(typeof privacySafe.pinchStartThreshold, 'number');
    assert.equal(Object.keys(privacySafe).some((k) => /joint|biometric|raw|vector|history/i.test(k)), false);
  });

  it('handles calibration skip, cancel, >2.5s tracking interruption fallback, and mid-game recalibration safely', () => {
    const cal = new GestureCalibrationManager();
    cal.beginCalibration({ xrSupported: true, handTrackingGranted: true });

    // Interruption after 2.6s with no tracked hands
    cal.sampleFrame({
      headPosition: [0, 1.25, 0],
      leftHand: { isTracking: false, wristPos: null, pinchDistanceMeters: 1, isPinching: false },
      rightHand: { isTracking: false, wristPos: null, pinchDistanceMeters: 1, isPinching: false },
      nowMs: 1000,
    });
    cal.sampleFrame({
      headPosition: [0, 1.25, 0],
      leftHand: { isTracking: false, wristPos: null, pinchDistanceMeters: 1, isPinching: false },
      rightHand: { isTracking: false, wristPos: null, pinchDistanceMeters: 1, isPinching: false },
      nowMs: 3700,
    });

    const interrupted = cal.getState();
    assert.equal(interrupted.status, 'interrupted_fallback');
    assert.ok(interrupted.interruptedReason?.includes('2.5s'));
    assert.equal(interrupted.profile.pinchStartThreshold, DEFAULT_CALIBRATION_PROFILE.pinchStartThreshold);

    // Mid-game recalibration & explicit skip
    cal.recalibrate();
    assert.equal(cal.getState().status, 'in_progress');
    const skippedProfile = cal.skipCalibration();
    assert.equal(cal.getState().status, 'completed');
    assert.equal(skippedProfile.isCalibrated, true);

    // Explicit cancellation reverts cleanly without trapping UI
    cal.recalibrate();
    cal.cancelCalibration();
    assert.equal(cal.getState().status, 'cancelled');
  });
});

describe('2. Global Gesture Debouncing & Bubbling Protection', () => {
  it('enforces per-category/target cooldowns, blocks duplicate eventTokens, and allows legitimate repeats after cooldown', () => {
    const debouncer = new GlobalGestureDebouncer();

    // First click allowed
    const first = debouncer.tryExecute({
      category: 'wrist_menu',
      targetId: 'wrist-toggle',
      hand: 'right',
      eventToken: 'right:pinch:42',
      nowMs: 1000,
    });
    assert.equal(first.allowed, true);

    // Same eventToken bubbling within 120ms is blocked as duplicate_event
    const bubble = debouncer.tryExecute({
      category: 'ui_pinch',
      targetId: 'wrist-toggle',
      hand: 'right',
      eventToken: 'right:pinch:42',
      nowMs: 1015,
    });
    assert.equal(bubble.allowed, false);
    assert.equal(bubble.reason, 'duplicate_event');

    // Rapid second tap inside cooldown is rejected
    const rapidTap = debouncer.tryExecute({
      category: 'wrist_menu',
      targetId: 'wrist-toggle',
      hand: 'left',
      eventToken: 'left:pinch:43',
      nowMs: 1180,
    });
    assert.equal(rapidTap.allowed, false);
    assert.equal(rapidTap.reason, 'cooldown');
    assert.ok(rapidTap.remainingCooldownMs > 0);

    // After cooldown expires and channel releases, legitimate repeat executes cleanly
    debouncer.releaseChannel('right', 'wrist_menu');
    const afterCooldown = debouncer.tryExecute({
      category: 'wrist_menu',
      targetId: 'wrist-toggle',
      hand: 'right',
      eventToken: 'right:pinch:44',
      nowMs: 1000 + DEFAULT_GESTURE_COOLDOWNS_MS.wrist_menu + 10,
    });
    assert.equal(afterCooldown.allowed, true);

    // Continuous smooth_turn (cooldown === 0) passes smoothly frame-by-frame
    const smooth1 = debouncer.tryExecute({ category: 'smooth_turn', targetId: 'rig', hand: 'right', nowMs: 1500 });
    const smooth2 = debouncer.tryExecute({ category: 'smooth_turn', targetId: 'rig', hand: 'right', nowMs: 1511 });
    assert.equal(smooth1.allowed, true);
    assert.equal(smooth2.allowed, true);

    const metrics = debouncer.getMetrics();
    assert.equal(metrics.executedCount, 4);
    assert.equal(metrics.blockedDuplicateCount, 1);
    assert.equal(metrics.blockedCooldownCount, 1);
  });

  it('wires GlobalGestureDebouncer directly into createVRSpatialUI.triggerActionFromTarget', () => {
    const scene = new THREE.Scene();
    const mockRenderer = { capabilities: { getMaxAnisotropy: () => 4 } } as unknown as THREE.WebGLRenderer;
    const debouncer = new GlobalGestureDebouncer();
    const ui = createVRSpatialUI(scene, mockRenderer, debouncer);

    const fakeButton = new THREE.Object3D();
    fakeButton.userData = {
      isVRUIButton: true,
      buttonId: 'cipher-clear',
      vrAction: { type: 'DECODE_CLEAR' },
      disabled: false,
    };

    assert.equal(categorizeVRUIActionType('DECODE_CLEAR'), 'glyph_select');

    const a1 = ui.triggerActionFromTarget(fakeButton, 'right', 'ev-1');
    const a2 = ui.triggerActionFromTarget(fakeButton, 'right', 'ev-1'); // Same bubbling token blocked immediately
    const a3 = ui.triggerActionFromTarget(fakeButton, 'right', 'ev-2'); // Same 0ms timestamp cooldown blocked
    assert.deepEqual(a1, { type: 'DECODE_CLEAR' });
    assert.equal(a2, null);
    assert.equal(a3, null);

    ui.dispose();
  });
});

describe('3. Lost Hand Tracking Recovery & Coordinate Validation', () => {
  it('rejects non-finite, zero-origin, out-of-bounds, and single-frame teleportation spike coordinates', () => {
    assert.equal(
      validateHandCoordinates([NaN, 1, 0], [0, 1, 0], [0, 1, 0]).valid,
      false
    );
    assert.equal(
      validateHandCoordinates([0, 0, 0], [0, 0, 0], [0.02, 0.02, 0]).valid,
      false
    );
    assert.equal(
      validateHandCoordinates([22, 1, 0], [22, 1, 0], [22, 1, 0]).valid,
      false
    );
    // Physical teleport jump > 0.48m within a single frame is rejected unless re-anchoring
    assert.equal(
      validateHandCoordinates([0.9, 1.2, -0.3], [0.9, 1.2, -0.35], [0.92, 1.2, -0.35], [0, 1.2, -0.3], 16.6).valid,
      false
    );
    // Same position succeeds when allowReanchorJump=true (recovery re-anchor)
    assert.equal(
      validateHandCoordinates([0.9, 1.2, -0.3], [0.9, 1.2, -0.35], [0.92, 1.2, -0.35], [0, 1.2, -0.3], 16.6, DEFAULT_RECOVERY_CONFIG, true).valid,
      true
    );
  });

  it('freezes crystal rotation during micro-occlusion, safely releases after grace window preserving transform, and stabilizes on reacquisition without snap', () => {
    let rightSnap: HandRecoverySnapshot = {
      ...makeRecoverySnapshot('right'),
      preservedCrystalId: 'ruby',
      preservedRotationY: 2.15,
    };
    let leftSnap = makeRecoverySnapshot('left');

    // Acquire tracking on both left & right independently
    const tLeft = evaluateHandRecoveryTransition(leftSnap, true, 1000);
    leftSnap = tLeft.nextSnapshot;
    const t0 = evaluateHandRecoveryTransition(rightSnap, true, 1000);
    rightSnap = t0.nextSnapshot;
    assert.equal(rightSnap.state, 'tracking');
    assert.equal(leftSnap.state, 'tracking');
    assert.equal(t0.shouldFreezeRotation, false);
    assert.equal(t0.shouldPreserveAndRelease, false);

    // Brief occlusion on RIGHT hand at 1050ms (<180ms grace) freezes rotation while LEFT continues tracking
    const tOcc = evaluateHandRecoveryTransition(rightSnap, false, 1050);
    rightSnap = tOcc.nextSnapshot;
    const tLeftOk = evaluateHandRecoveryTransition(leftSnap, true, 1050);
    leftSnap = tLeftOk.nextSnapshot;
    assert.equal(rightSnap.state, 'occluded_grace');
    assert.equal(leftSnap.state, 'tracking');
    assert.equal(tOcc.shouldFreezeRotation, true);
    assert.equal(tOcc.shouldPreserveAndRelease, false);
    assert.equal(rightSnap.preservedCrystalId, 'ruby');
    assert.equal(rightSnap.preservedRotationY, 2.15);

    // Prolonged loss on RIGHT at 1300ms (>=180ms grace) triggers safe release preserving transform
    const tLost = evaluateHandRecoveryTransition(rightSnap, false, 1300);
    rightSnap = tLost.nextSnapshot;
    assert.equal(rightSnap.state, 'lost');
    assert.equal(tLost.shouldPreserveAndRelease, true);
    assert.equal(rightSnap.preservedRotationY, 2.15);

    // Reacquisition: 3 stabilization frames reset anchors cleanly so crystal does not jump on first frame
    const r1 = evaluateHandRecoveryTransition(rightSnap, true, 1450);
    rightSnap = r1.nextSnapshot;
    assert.equal(rightSnap.state, 'recovering');
    assert.equal(r1.shouldResetPinchDelta, true);
    assert.equal(r1.shouldFreezeRotation, true);

    rightSnap = evaluateHandRecoveryTransition(rightSnap, true, 1466).nextSnapshot;
    const rDone = evaluateHandRecoveryTransition(rightSnap, true, 1482);
    rightSnap = rDone.nextSnapshot;

    assert.equal(rightSnap.state, 'tracking');
    assert.equal(rDone.shouldFreezeRotation, false);
    assert.equal(rightSnap.recoveryCount, 1);
  });

  it('reconciles pinchstart/pinchend and hysteresis cleanly with personalized calibrated thresholds', () => {
    const customStart = 0.031;
    const customEnd = 0.049;

    const engage = resolvePinchTransition(
      { isPinching: false, nativePinchActive: false, hasValidPinchJoints: true, pinchDistance: 0.029 },
      { type: 'distance_update', pinchDistance: 0.029 },
      customStart,
      customEnd
    );
    assert.equal(engage.isPinching, true);
    assert.equal(engage.action, 'start');

    // Remains engaged inside custom hysteresis band [0.031, 0.049] even if pinchend fires early
    const holdBand = resolvePinchTransition(
      { isPinching: true, nativePinchActive: true, hasValidPinchJoints: true, pinchDistance: 0.042 },
      { type: 'pinchend' },
      customStart,
      customEnd
    );
    assert.equal(holdBand.isPinching, true);
    assert.equal(holdBand.action, 'none');

    // Releases once finger gap exceeds customEnd (0.049)
    const release = resolvePinchTransition(
      { isPinching: true, nativePinchActive: false, hasValidPinchJoints: true, pinchDistance: 0.052 },
      { type: 'distance_update', pinchDistance: 0.052 },
      customStart,
      customEnd
    );
    assert.equal(release.isPinching, false);
    assert.equal(release.action, 'release');
  });
});

describe('4. Seated & Standing Accessibility + 3D Crystal/UI Adaptation', () => {
  it('adapts crystal height, panel distance, and rig spawn across seated/standing modes & floor-level/local spaces', () => {
    const acc = new AccessibilityLayoutManager();
    const seatedLayout = acc.computeLayout();
    assert.equal(seatedLayout.postureMode, 'seated');
    assert.equal(seatedLayout.turnMode, 'snap');
    assert.ok(seatedLayout.crystalElevationY < 1.3);

    // Detect physical standing height (1.72m) in local-floor space -> adapts posture and elevations upward
    acc.updateReferenceSpace('local-floor', 1.72);
    const standingState = acc.getState();
    assert.equal(standingState.postureMode, 'standing');
    assert.ok(standingState.layout.crystalElevationY >= 1.45);
    assert.ok(standingState.layout.chamberPanelY > seatedLayout.chamberPanelY);

    // Fallback to 'local' space (no floor level) uses posture default cleanly without NaN
    acc.setPostureMode('seated');
    acc.updateReferenceSpace('local');
    const localState = acc.getState();
    assert.equal(localState.hasFloorLevel, false);
    assert.equal(localState.measuredEyeHeightMeters, 1.25);

    // Toggle snap <-> smooth turn mode
    assert.equal(acc.toggleTurnMode(), 'smooth');
    assert.equal(acc.computeLayout().turnMode, 'smooth');
    assert.ok(acc.computeLayout().smoothTurnRateRadPerSec > 1.0);

    // CrystalsManager pedestal elevation adapts smoothly within safe [0.95, 1.65] range
    const scene = new THREE.Scene();
    const crystals = createCrystals(scene, DEFAULT_CRYSTALS, true);
    crystals.setPedestalElevation(standingState.layout.crystalElevationY);
    for (const inst of crystals.instances.values()) {
      assert.equal(inst.targetPosition.y, standingState.layout.crystalElevationY);
    }
    crystals.dispose();
  });
});

describe('5. Zero Controller Dependency & Calibration Spatial UI Completeness', () => {
  it('exposes calibration controls, accessibility toggles, smooth/snap turn, and full mission controls via 3D Spatial UI', () => {
    const cal = new GestureCalibrationManager();
    const acc = new AccessibilityLayoutManager();
    cal.beginCalibration({ xrSupported: true, handTrackingGranted: true });
    acc.setTurnMode('smooth');

    // Mid-game calibration renders full 3D calibration controls cleanly even during playing phase
    const calButtons = buildChamberPhaseButtons(
      makeSyncState({
        phase: 'playing',
        calibrationState: cal.getState(),
        accessibilityState: acc.getState(),
      })
    );
    const calActionTypes = calButtons.map((b) => b.action.type);
    assert.ok(calActionTypes.includes('TOGGLE_DOMINANT_HAND'));
    assert.ok(calActionTypes.includes('TOGGLE_POSTURE'));
    assert.ok(calActionTypes.includes('TOGGLE_TURN_MODE'));
    assert.ok(calActionTypes.includes('COMPLETE_CALIBRATION'));
    assert.ok(calActionTypes.includes('SKIP_CALIBRATION'));
    assert.ok(calActionTypes.includes('CANCEL_CALIBRATION'));

    // Wrist menu exposes turn steps in smooth mode, accessibility toggles, calibration trigger, puzzle actions, and Exit VR
    const wristButtons = buildWristMenuButtons(
      makeSyncState({
        phase: 'playing',
        calibrationState: cal.getState(),
        accessibilityState: acc.getState(),
      })
    );
    const wristActionTypes = wristButtons.map((b) => b.action.type);
    assert.ok(wristActionTypes.includes('SMOOTH_TURN'));
    assert.ok(wristActionTypes.includes('TOGGLE_POSTURE'));
    assert.ok(wristActionTypes.includes('TOGGLE_TURN_MODE'));
    assert.ok(wristActionTypes.includes('TOGGLE_DOMINANT_HAND'));
    assert.ok(wristActionTypes.includes('START_CALIBRATION'));
    assert.ok(wristActionTypes.includes('PAUSE_MISSION'));
    assert.ok(wristActionTypes.includes('RESET_PUZZLE'));
    assert.ok(wristActionTypes.includes('TOGGLE_BEAM'));
    assert.ok(wristActionTypes.includes('EXIT_VR'));
  });
});
