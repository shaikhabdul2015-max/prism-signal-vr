/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Controller-Free WebXR Hand Tracking & Spatial UI Verification Suite
 * Covers:
 * 1. View-relative crystal rotation math (eliminates world-X inversion across all seated turns)
 * 2. Conflict-free native pinchstart/pinchend + distance hysteresis state machine
 * 3. Wrist/Palm Menu interactive buttons (turn, focus, start/pause/reset/exit VR)
 * 4. 3D Chamber Phase panels for Intro, Victory, Phase 3 Alien Cipher, and Story Archive
 * 5. Headless/Node lifecycle safety for createVRSpatialUI
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  computeViewRelativeLateralDelta,
  resolvePinchTransition,
  PINCH_START_THRESHOLD,
  PINCH_END_THRESHOLD,
} from '../src/scene/handInteraction';
import {
  buildWristMenuButtons,
  buildChamberPhaseButtons,
  createVRSpatialUI,
  VRUISyncState,
} from '../src/scene/vrSpatialUI';
import { TARGET_DECODING_SEQUENCE, validateAlienSequence } from '../src/puzzle/puzzleEngine';

function makeBaseUIState(overrides: Partial<VRUISyncState> = {}): VRUISyncState {
  return {
    phase: 'playing',
    totalCoherence: 35,
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

describe('Controller-Free WebXR Hand Tracking & Spatial UI', () => {
  it('1. Computes view-relative lateral deltas consistently across 0°, +90°, 180°, and -90° camera turns', () => {
    const rightVec = new THREE.Vector3();

    // Facing -Z (default): viewer's right is +X
    const d0 = computeViewRelativeLateralDelta(
      new THREE.Vector3(0.25, 0, 0),
      new THREE.Vector3(0, 0, -1),
      rightVec
    );
    assert.ok(Math.abs(d0 - 0.25) < 1e-6);

    // Turned 180° to face +Z (toward rear Azure pedestal): viewer's right is -X
    const d180 = computeViewRelativeLateralDelta(
      new THREE.Vector3(-0.25, 0, 0),
      new THREE.Vector3(0, 0, 1),
      rightVec
    );
    assert.ok(Math.abs(d180 - 0.25) < 1e-6);

    // Turned 90° clockwise to face +X (toward Ruby): viewer's right is +Z
    const d90 = computeViewRelativeLateralDelta(
      new THREE.Vector3(0, 0, 0.25),
      new THREE.Vector3(1, 0, 0),
      rightVec
    );
    assert.ok(Math.abs(d90 - 0.25) < 1e-6);

    // Turned 90° counter-clockwise to face -X (toward Emerald): viewer's right is -Z
    const dNeg90 = computeViewRelativeLateralDelta(
      new THREE.Vector3(0, 0, -0.25),
      new THREE.Vector3(-1, 0, 0),
      rightVec
    );
    assert.ok(Math.abs(dNeg90 - 0.25) < 1e-6);
  });

  it('2. Reconciles native pinchstart/pinchend events with hysteresis thresholds without double-triggering or premature drop', () => {
    // a) Native pinchstart engages pinch; subsequent sub-threshold distance update does NOT double-fire start
    const afterStart = resolvePinchTransition(
      {
        isPinching: false,
        nativePinchActive: false,
        hasValidPinchJoints: true,
        pinchDistance: 0.02,
      },
      { type: 'pinchstart' }
    );
    assert.equal(afterStart.isPinching, true);
    assert.equal(afterStart.nativePinchActive, true);
    assert.equal(afterStart.action, 'start');

    const afterDistanceUpdate = resolvePinchTransition(
      {
        isPinching: afterStart.isPinching,
        nativePinchActive: afterStart.nativePinchActive,
        hasValidPinchJoints: true,
        pinchDistance: PINCH_START_THRESHOLD - 0.004,
      },
      { type: 'distance_update', pinchDistance: PINCH_START_THRESHOLD - 0.004 }
    );
    assert.equal(afterDistanceUpdate.isPinching, true);
    assert.equal(afterDistanceUpdate.action, 'none');

    // b) Native pinchend inside hysteresis zone (<= 0.040m) preserves hold instead of premature drop
    const jitterEnd = resolvePinchTransition(
      {
        isPinching: true,
        nativePinchActive: true,
        hasValidPinchJoints: true,
        pinchDistance: 0.032,
      },
      { type: 'pinchend' }
    );
    assert.equal(jitterEnd.isPinching, true);
    assert.equal(jitterEnd.nativePinchActive, false);
    assert.equal(jitterEnd.action, 'none');

    // c) Opening fingers past PINCH_END_THRESHOLD releases cleanly even if nativePinchActive wasn't cleared yet
    const cleanRelease = resolvePinchTransition(
      {
        isPinching: true,
        nativePinchActive: true,
        hasValidPinchJoints: true,
        pinchDistance: PINCH_END_THRESHOLD + 0.01,
      },
      { type: 'distance_update', pinchDistance: PINCH_END_THRESHOLD + 0.01 }
    );
    assert.equal(cleanRelease.isPinching, false);
    assert.equal(cleanRelease.nativePinchActive, false);
    assert.equal(cleanRelease.action, 'release');

    // d) Emulated runtimes without joint matrices still release on pinchend
    const emulatedRelease = resolvePinchTransition(
      {
        isPinching: true,
        nativePinchActive: true,
        hasValidPinchJoints: false,
        pinchDistance: 1.0,
      },
      { type: 'pinchend' }
    );
    assert.equal(emulatedRelease.isPinching, false);
    assert.equal(emulatedRelease.action, 'release');
  });

  it('3. Wrist/Palm Menu exposes seated turn, pedestal vantage, and full mission controls', () => {
    const playingButtons = buildWristMenuButtons(makeBaseUIState({ phase: 'playing' }));
    const actionTypes = playingButtons.map((b) => b.action.type);

    assert.ok(actionTypes.includes('SNAP_TURN'));
    assert.ok(actionTypes.includes('RESET_RIG_VIEW'));
    assert.ok(actionTypes.includes('FOCUS_NODE'));
    assert.ok(actionTypes.includes('PAUSE_MISSION'));
    assert.ok(actionTypes.includes('TOGGLE_BEAM'));
    assert.ok(actionTypes.includes('RESET_PUZZLE'));
    assert.ok(actionTypes.includes('EXIT_VR'));

    // Cipher/Story buttons unlock once conditions are met
    const cipherBtnLocked = playingButtons.find((b) => b.id === 'wrist-open-decoder');
    assert.equal(cipherBtnLocked?.disabled, true);

    const solvedButtons = buildWristMenuButtons(
      makeBaseUIState({
        phase: 'solved',
        totalCoherence: 100,
        decodingState: {
          ...makeBaseUIState().decodingState,
          isUnlocked: true,
        },
      })
    );
    const cipherBtnUnlocked = solvedButtons.find((b) => b.id === 'wrist-open-decoder');
    assert.equal(cipherBtnUnlocked?.disabled, false);

    const introButtons = buildWristMenuButtons(makeBaseUIState({ phase: 'intro' }));
    const startBtn = introButtons.find((b) => b.id === 'wrist-primary-state');
    assert.deepEqual(startBtn?.action, { type: 'START_MISSION' });

    const pausedButtons = buildWristMenuButtons(makeBaseUIState({ phase: 'paused' }));
    const resumeBtn = pausedButtons.find((b) => b.id === 'wrist-primary-state');
    assert.deepEqual(resumeBtn?.action, { type: 'RESUME_MISSION' });
  });

  it('4. 3D Chamber Phase Panels cover complete Intro -> Victory -> Phase 3 Cipher -> Story completion without controllers', () => {
    // Intro
    const introBtns = buildChamberPhaseButtons(makeBaseUIState({ phase: 'intro' }));
    assert.ok(introBtns.some((b) => b.action.type === 'START_MISSION'));

    // Solved (Victory)
    const solvedBtns = buildChamberPhaseButtons(makeBaseUIState({ phase: 'solved', totalCoherence: 100 }));
    assert.ok(solvedBtns.some((b) => b.action.type === 'OPEN_DECODER'));
    assert.ok(solvedBtns.some((b) => b.action.type === 'PLAY_FANFARE'));

    // Decoding Phase 3: simulate selecting the 4 correct glyph buttons from 3D tiles
    const decodingEmpty = buildChamberPhaseButtons(
      makeBaseUIState({
        phase: 'decoding',
        totalCoherence: 100,
        decodingState: {
          ...makeBaseUIState().decodingState,
          isUnlocked: true,
          selectedSequence: [],
        },
      })
    );
    const submitBefore = decodingEmpty.find((b) => b.id === 'cipher-submit');
    assert.equal(submitBefore?.disabled, true);

    const pickedSequence: string[] = [];
    for (const targetId of TARGET_DECODING_SEQUENCE) {
      const btn = decodingEmpty.find(
        (b) => b.action.type === 'DECODE_SELECT_SYMBOL' && b.action.symbolId === targetId
      );
      assert.ok(btn, `Missing 3D cipher button for ${targetId}`);
      if (btn.action.type === 'DECODE_SELECT_SYMBOL') {
        pickedSequence.push(btn.action.symbolId);
      }
    }

    const validation = validateAlienSequence(pickedSequence);
    assert.equal(validation.isCorrect, true);

    const decodingReady = buildChamberPhaseButtons(
      makeBaseUIState({
        phase: 'decoding',
        totalCoherence: 100,
        decodingState: {
          ...makeBaseUIState().decodingState,
          isUnlocked: true,
          selectedSequence: pickedSequence,
        },
      })
    );
    const submitReady = decodingReady.find((b) => b.id === 'cipher-submit');
    assert.equal(submitReady?.disabled, false);

    // Story archive navigation
    const storyBtnsCh0 = buildChamberPhaseButtons(
      makeBaseUIState({ phase: 'story', storyChapterIndex: 0 })
    );
    assert.equal(storyBtnsCh0.find((b) => b.id === 'story-prev')?.disabled, true);
    assert.equal(storyBtnsCh0.find((b) => b.id === 'story-next')?.disabled, false);

    const storyBtnsCh2 = buildChamberPhaseButtons(
      makeBaseUIState({ phase: 'story', storyChapterIndex: 2 })
    );
    assert.equal(storyBtnsCh2.find((b) => b.id === 'story-prev')?.disabled, false);
    assert.equal(storyBtnsCh2.find((b) => b.id === 'story-next')?.disabled, true);
    assert.ok(storyBtnsCh2.some((b) => b.action.type === 'CLOSE_STORY'));
  });

  it('5. createVRSpatialUI initializes and disposes cleanly without DOM document errors', () => {
    const scene = new THREE.Scene();
    const mockRenderer = { capabilities: { getMaxAnisotropy: () => 4 } } as unknown as THREE.WebGLRenderer;
    const ui = createVRSpatialUI(scene, mockRenderer);

    assert.equal(ui.isWristMenuOpen(), false);
    assert.equal(ui.toggleWristMenu(true), true);
    assert.equal(ui.isWristMenuOpen(), true);

    ui.syncState(makeBaseUIState({ phase: 'decoding' }));
    assert.ok(Array.isArray(ui.raycastTargets));

    ui.dispose();
  });
});
