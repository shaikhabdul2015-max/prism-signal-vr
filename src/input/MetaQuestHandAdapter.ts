/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated Meta Quest Hands-First Primary Input Adapter
 * Wraps and exposes PRISM SIGNAL's complete, verified controller-free WebXR hand-tracking
 * interaction architecture:
 * 1. 25-joint XRHand skeletal tracking (`handInteraction.ts`)
 * 2. Gesture Calibration (`xrAccessibility.ts`)
 * 3. Global Gesture Debouncing (`gestureDebouncer.ts`)
 * 4. Lost Hand Tracking Recovery with Grace-Freeze (`handInteraction.ts`)
 * 5. Seated and Standing Accessibility Normalization (`xrAccessibility.ts`)
 * 6. Snap-Turn and Smooth-Turn Gestures (`handInteraction.ts`)
 * 7. Camera-Relative Crystal Rotation Math (`computeViewRelativeLateralDelta`)
 * 8. 3D Spatial Wrist/Palm Menu & Chamber Panels (`vrSpatialUI.ts`)
 * 9. Controller-Free VR Navigation & Zero-Controller Enforcement
 *
 * CRITICAL ARCHITECTURAL ISOLATION RULE:
 * - This module is completely disconnected from AndroidTouchAdapter.
 * - Mobile touch events and fallbacks are strictly prohibited from mutating or overriding this adapter.
 */

import * as THREE from 'three';
import {
  createHandTracker,
  HandTracker,
  HandManagerOptions,
} from '../scene/handInteraction';
import {
  GestureCalibrationManager,
  AccessibilityLayoutManager,
  CalibrationStateSnapshot,
  AccessibilityStateSnapshot,
  PostureMode,
  TurnMode,
} from '../scene/xrAccessibility';
import { GlobalGestureDebouncer } from '../scene/gestureDebouncer';
import {
  createVRSpatialUI,
  VRSpatialUIController,
  VRUIAction,
  VRUISyncState,
} from '../scene/vrSpatialUI';
import type { CrystalId, HandTrackingStatus } from '../types/game';
import type { PlatformInputAdapter } from './types';

export interface MetaQuestHandAdapterOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  cameraRig: THREE.Group;
  raycastTargets: THREE.Object3D[];
  consoleRaycastTarget: THREE.Object3D;
  debouncer?: GlobalGestureDebouncer;
  calibrationManager?: GestureCalibrationManager;
  accessibilityManager?: AccessibilityLayoutManager;
  onSelectCrystal: (id: CrystalId) => void;
  onRotateCrystal: (id: CrystalId, deltaAngle: number) => void;
  onToggleBeamSource?: () => void;
  onVRUIAction?: (action: VRUIAction) => void;
  onSnapTurn?: (deltaYawRadians: number) => void;
  onSmoothTurn?: (deltaYawRadians: number) => void;
  onStatusChange?: (status: HandTrackingStatus, activeCount: number) => void;
}

export class MetaQuestHandAdapter implements PlatformInputAdapter {
  public readonly platformId = 'meta_quest_hands' as const;
  public readonly isHandsFirst = true as const;
  public readonly isTouchDriven = false as const;

  private enabled = true;
  public readonly debouncer: GlobalGestureDebouncer;
  public readonly calibrationManager: GestureCalibrationManager;
  public readonly accessibilityManager: AccessibilityLayoutManager;
  public readonly spatialUI: VRSpatialUIController;
  public readonly handTracker: HandTracker;

  private lastSyncState: VRUISyncState | null = null;
  private onVRUIActionCallback?: (action: VRUIAction) => void;
  private onSnapTurnCallback?: (deltaYawRadians: number) => void;
  private onSmoothTurnCallback?: (deltaYawRadians: number) => void;

  constructor(options: MetaQuestHandAdapterOptions) {
    this.debouncer = options.debouncer || new GlobalGestureDebouncer();
    this.calibrationManager = options.calibrationManager || new GestureCalibrationManager();
    this.accessibilityManager = options.accessibilityManager || new AccessibilityLayoutManager();
    this.onVRUIActionCallback = options.onVRUIAction;
    this.onSnapTurnCallback = options.onSnapTurn;
    this.onSmoothTurnCallback = options.onSmoothTurn;

    // Create 3D Spatial Wrist and Chamber UI
    this.spatialUI = createVRSpatialUI(options.scene, options.renderer, this.debouncer);

    // Create 25-joint procedural optical hand tracker
    const handOptions: HandManagerOptions = {
      renderer: options.renderer,
      scene: options.scene,
      camera: options.camera,
      cameraRig: options.cameraRig,
      raycastTargets: options.raycastTargets,
      consoleRaycastTarget: options.consoleRaycastTarget,
      uiRaycastTargets: this.spatialUI.raycastTargets,
      debouncer: this.debouncer,
      onSelectCrystal: options.onSelectCrystal,
      onRotateCrystal: options.onRotateCrystal,
      onToggleBeamSource: options.onToggleBeamSource,
      onUIHover: (target) => {
        this.spatialUI.setHoveredTarget(target);
      },
      onUIPinch: (target, handName, eventToken) => {
        const action = this.spatialUI.triggerActionFromTarget(target, handName, eventToken);
        if (!action) return false;
        this.handleAction(action);
        return true;
      },
      onSnapTurn: (deltaYaw) => {
        this.onSnapTurnCallback?.(deltaYaw);
      },
      onSmoothTurn: (deltaYaw) => {
        this.onSmoothTurnCallback?.(deltaYaw);
      },
      onFrameHandSamples: (samples) => {
        const calBefore = this.calibrationManager.getState();
        if (calBefore.status === 'in_progress') {
          this.calibrationManager.sampleFrame({
            headPosition: samples.headPos,
            leftHand: samples.left,
            rightHand: samples.right,
          });
          const calAfter = this.calibrationManager.getState();
          if (
            calAfter.progressPercent !== calBefore.progressPercent ||
            calAfter.step !== calBefore.step ||
            calAfter.status !== calBefore.status
          ) {
            this.syncTuningAndLayout();
          }
        }
      },
      onStatusChange: options.onStatusChange,
    };

    this.handTracker = createHandTracker(handOptions);
    this.syncTuningAndLayout();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.handTracker.setHandInteractionEnabled(enabled);
  }

  public handleAction(action: VRUIAction): void {
    if (!this.enabled) return;

    if (action.type === 'TOGGLE_WRIST_MENU') {
      this.spatialUI.toggleWristMenu();
      return;
    }
    if (action.type === 'SNAP_TURN') {
      this.onSnapTurnCallback?.(action.deltaYawRadians);
      return;
    }
    if (action.type === 'SMOOTH_TURN') {
      this.onSmoothTurnCallback?.(action.deltaYawRadians);
      return;
    }
    if (action.type === 'TOGGLE_TURN_MODE') {
      this.accessibilityManager.toggleTurnMode();
      this.syncTuningAndLayout();
      return;
    }
    if (action.type === 'TOGGLE_POSTURE') {
      this.accessibilityManager.togglePostureMode();
      this.syncTuningAndLayout();
      return;
    }
    if (action.type === 'TOGGLE_DOMINANT_HAND') {
      const cur = this.calibrationManager.getProfile().dominantHand;
      this.calibrationManager.setDominantHand(cur === 'left' ? 'right' : 'left');
      this.syncTuningAndLayout();
      return;
    }
    if (action.type === 'START_CALIBRATION') {
      this.calibrationManager.recalibrate();
      this.syncTuningAndLayout();
      return;
    }
    if (action.type === 'COMPLETE_CALIBRATION') {
      this.calibrationManager.completeCalibration();
      this.syncTuningAndLayout();
      return;
    }
    if (action.type === 'SKIP_CALIBRATION') {
      this.calibrationManager.skipCalibration();
      this.syncTuningAndLayout();
      return;
    }
    if (action.type === 'CANCEL_CALIBRATION') {
      this.calibrationManager.cancelCalibration();
      this.syncTuningAndLayout();
      return;
    }

    this.onVRUIActionCallback?.(action);
  }

  public syncTuningAndLayout(): { calState: CalibrationStateSnapshot; accState: AccessibilityStateSnapshot } {
    const calState = this.calibrationManager.getState();
    this.accessibilityManager.syncCalibrationReach(calState.profile.comfortableReachMeters);
    const accState = this.accessibilityManager.getState();

    this.handTracker.setInteractionTuning({
      pinchStartThreshold: calState.profile.pinchStartThreshold,
      pinchEndThreshold: calState.profile.pinchEndThreshold,
      directReachRadiusMeters: accState.layout.directReachRadiusMeters,
      rotationSensitivity: calState.profile.rotationSensitivity,
      airSwipeThresholdMeters: calState.profile.airSwipeThresholdMeters,
      wristMenuHand: calState.profile.wristMenuHand,
      turnMode: accState.turnMode,
      smoothTurnRateRadPerSec: accState.layout.smoothTurnRateRadPerSec,
    });

    if (this.lastSyncState) {
      this.spatialUI.syncState({
        ...this.lastSyncState,
        calibrationState: calState,
        accessibilityState: accState,
      });
    }

    return { calState, accState };
  }

  public syncVRUIState(state: VRUISyncState): void {
    this.lastSyncState = state;
    this.spatialUI.syncState({
      ...state,
      calibrationState: this.calibrationManager.getState(),
      accessibilityState: this.accessibilityManager.getState(),
    });
  }

  public update(
    delta: number,
    isPresenting: boolean,
    camera: THREE.Camera,
    cameraRig: THREE.Group
  ): void {
    if (!this.enabled) return;

    // 1. Advance 25-joint optical hand tracker
    this.handTracker.update(delta);

    // 2. Sample wrist anchor pose and update 3D wrist/chamber spatial UI
    const wristSample = this.handTracker.getWristAnchorSample(camera);
    this.spatialUI.update(delta, isPresenting, camera, cameraRig, wristSample, (action) => {
      this.handleAction(action);
    });
  }

  public setPostureMode(mode: PostureMode): AccessibilityStateSnapshot {
    this.accessibilityManager.setPostureMode(mode);
    return this.syncTuningAndLayout().accState;
  }

  public setTurnMode(mode: TurnMode): AccessibilityStateSnapshot {
    this.accessibilityManager.setTurnMode(mode);
    return this.syncTuningAndLayout().accState;
  }

  public reset(): void {
    this.handTracker.releaseGrabbedCrystal();
    if (this.calibrationManager.getState().status === 'in_progress') {
      this.calibrationManager.cancelCalibration();
    }
    this.debouncer.reset();
  }

  public dispose(): void {
    this.reset();
    this.handTracker.dispose();
    this.spatialUI.dispose();
  }
}
