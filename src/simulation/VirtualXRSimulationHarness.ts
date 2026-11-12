/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Development-Only Virtual WebXR Simulation Harness & Deterministic Scenario Runner
 * Wires the isolated VirtualXREnvironment directly into PRISM SIGNAL's real pure-logic
 * WebXR interaction, calibration, debouncing, spatial accessibility, VR Spatial UI,
 * and light-beam puzzle engines without mocking or altering production runtime paths.
 */

import * as THREE from 'three';
import {
  computeViewRelativeLateralDelta,
  DEFAULT_RECOVERY_CONFIG,
  evaluateHandRecoveryTransition,
  HandRecoverySnapshot,
  PinchStateMachineSnapshot,
  resolvePinchTransition,
  validateHandCoordinates,
} from '../scene/handInteraction';
import {
  categorizeVRUIActionType,
  GlobalGestureDebouncer,
  GestureDebouncerMetrics,
} from '../scene/gestureDebouncer';
import {
  AccessibilityLayoutManager,
  AccessibilityStateSnapshot,
  CalibrationStateSnapshot,
  GestureCalibrationManager,
  PostureMode,
  TurnMode,
} from '../scene/xrAccessibility';
import {
  buildChamberPhaseButtons,
  buildWristMenuButtons,
  VRUIAction,
  VRUISyncState,
} from '../scene/vrSpatialUI';
import {
  DEFAULT_CRYSTALS,
  simulateLightBeamPuzzle,
  TARGET_DECODING_SEQUENCE,
} from '../puzzle/puzzleEngine';
import type { CrystalData, CrystalId, GamePhase } from '../types/game';
import type { SpatialCoordinateSpace } from '../spatial/types';
import {
  VirtualFaultType,
  VirtualHandFrameOutput,
  VirtualHandSide,
  VirtualXREnvironment,
} from './VirtualXREnvironment';

export interface SimulatedHandRuntimeState {
  side: VirtualHandSide;
  frame: VirtualHandFrameOutput;
  recovery: HandRecoverySnapshot;
  pinchState: PinchStateMachineSnapshot;
  grabbedCrystalId: CrystalId | null;
  lastPinchMidpoint: [number, number, number] | null;
  pinchAnchorMidpoint: [number, number, number] | null;
  hasTriggeredAirSwipeTurn: boolean;
  rejectedInvalidFrames: number;
  lastRejectReason: string | null;
}

export interface SimulationEventLogEntry {
  id: number;
  timestampMs: number;
  source: string;
  action: string;
  allowed: boolean;
  detail: string;
}

export interface VirtualXRDashboardState {
  isDevSimulationOnly: true;
  sessionActive: boolean;
  sessionInterrupted: boolean;
  simulatedClockMs: number;
  gamePhase: GamePhase;
  wristMenuOpen: boolean;
  isBeamSourceActive: boolean;
  totalCoherence: number;
  isTargetReceiverHit: boolean;
  selectedCrystalId: CrystalId | null;
  headPosition: [number, number, number];
  headYawRadians: number;
  leftHand: SimulatedHandRuntimeState;
  rightHand: SimulatedHandRuntimeState;
  calibration: CalibrationStateSnapshot;
  accessibility: AccessibilityStateSnapshot;
  debouncerMetrics: GestureDebouncerMetrics;
  crystals: Array<{
    id: CrystalId;
    name: string;
    rotationY: number;
    resonancePercent: number;
    isAligned: boolean;
    position: [number, number, number];
  }>;
  controllerDependencyCount: 0;
  eventLog: SimulationEventLogEntry[];
}

export interface SimulationScenarioResult {
  id: string;
  category: 'gesture' | 'spatial' | 'failure_injection';
  name: string;
  passed: boolean;
  durationMs: number;
  summary: string;
  metrics: Record<string, string | number | boolean>;
}

function createInitialRecovery(side: VirtualHandSide): HandRecoverySnapshot {
  return {
    hand: side,
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

export class VirtualXRSimulationHarness {
  public readonly env: VirtualXREnvironment;
  public readonly debouncer: GlobalGestureDebouncer;
  public readonly calibrationManager: GestureCalibrationManager;
  public readonly accessibilityManager: AccessibilityLayoutManager;

  private crystals: CrystalData[];
  private selectedCrystalId: CrystalId | null = 'ruby';
  private isBeamSourceActive = true;
  private totalCoherence = 0;
  private isTargetReceiverHit = false;
  private gamePhase: GamePhase = 'playing';
  private wristMenuOpen = false;
  private eventSeq = 1;
  private eventLog: SimulationEventLogEntry[] = [];

  private handStates: Record<
    VirtualHandSide,
    {
      recovery: HandRecoverySnapshot;
      pinch: PinchStateMachineSnapshot;
      grabbedCrystalId: CrystalId | null;
      lastPinchMidpoint: [number, number, number] | null;
      pinchAnchorMidpoint: [number, number, number] | null;
      hasTriggeredAirSwipeTurn: boolean;
      rejectedInvalidFrames: number;
      lastRejectReason: string | null;
    }
  >;

  constructor(initialClockMs = 1000) {
    this.env = new VirtualXREnvironment(initialClockMs);
    this.debouncer = new GlobalGestureDebouncer();
    this.calibrationManager = new GestureCalibrationManager();
    this.accessibilityManager = new AccessibilityLayoutManager();

    this.crystals = DEFAULT_CRYSTALS.map((c) => ({ ...c, currentPosition: [...c.currentPosition] as [number, number, number] }));
    const initialSim = simulateLightBeamPuzzle(this.crystals, this.isBeamSourceActive);
    this.crystals = initialSim.updatedCrystals;
    this.totalCoherence = initialSim.totalCoherence;
    this.isTargetReceiverHit = initialSim.progress.isTargetReceiverHit;

    this.handStates = {
      left: {
        recovery: createInitialRecovery('left'),
        pinch: { isPinching: false, nativePinchActive: false, hasValidPinchJoints: false, pinchDistance: 0.08 },
        grabbedCrystalId: null,
        lastPinchMidpoint: null,
        pinchAnchorMidpoint: null,
        hasTriggeredAirSwipeTurn: false,
        rejectedInvalidFrames: 0,
        lastRejectReason: null,
      },
      right: {
        recovery: createInitialRecovery('right'),
        pinch: { isPinching: false, nativePinchActive: false, hasValidPinchJoints: false, pinchDistance: 0.08 },
        grabbedCrystalId: null,
        lastPinchMidpoint: null,
        pinchAnchorMidpoint: null,
        hasTriggeredAirSwipeTurn: false,
        rejectedInvalidFrames: 0,
        lastRejectReason: null,
      },
    };
  }

  public resetAll(): void {
    this.env.reset(1000);
    this.debouncer.reset();
    this.crystals = DEFAULT_CRYSTALS.map((c) => ({ ...c, currentPosition: [...c.currentPosition] as [number, number, number] }));
    this.isBeamSourceActive = true;
    const sim = simulateLightBeamPuzzle(this.crystals, true);
    this.crystals = sim.updatedCrystals;
    this.totalCoherence = sim.totalCoherence;
    this.isTargetReceiverHit = sim.progress.isTargetReceiverHit;
    this.gamePhase = 'playing';
    this.wristMenuOpen = false;
    this.selectedCrystalId = 'ruby';
    this.eventLog = [];

    for (const side of ['left', 'right'] as const) {
      this.handStates[side] = {
        recovery: createInitialRecovery(side),
        pinch: { isPinching: false, nativePinchActive: false, hasValidPinchJoints: false, pinchDistance: 0.08 },
        grabbedCrystalId: null,
        lastPinchMidpoint: null,
        pinchAnchorMidpoint: null,
        hasTriggeredAirSwipeTurn: false,
        rejectedInvalidFrames: 0,
        lastRejectReason: null,
      };
    }

    // Reinitialize fresh managers
    Object.assign(this.calibrationManager, new GestureCalibrationManager());
    Object.assign(this.accessibilityManager, new AccessibilityLayoutManager());
    this.syncLayoutToCrystals();
  }

  private pushLog(source: string, action: string, allowed: boolean, detail: string): void {
    this.eventLog.unshift({
      id: this.eventSeq++,
      timestampMs: Math.round(this.env.getClockMs()),
      source,
      action,
      allowed,
      detail,
    });
    if (this.eventLog.length > 24) {
      this.eventLog.length = 24;
    }
  }

  private syncLayoutToCrystals(): void {
    const layout = this.accessibilityManager.computeLayout();
    this.crystals = this.crystals.map((c) => ({
      ...c,
      currentPosition: [c.currentPosition[0], layout.crystalElevationY, c.currentPosition[2]],
    }));
  }

  private recomputePuzzle(): void {
    const sim = simulateLightBeamPuzzle(this.crystals, this.isBeamSourceActive);
    this.crystals = sim.updatedCrystals;
    this.totalCoherence = sim.totalCoherence;
    this.isTargetReceiverHit = sim.progress.isTargetReceiverHit;
  }

  public startCalibration(): void {
    this.calibrationManager.beginCalibration({
      xrSupported: true,
      handTrackingGranted: true,
      leftHandTracked: this.env.getHandConfig('left').tracked,
      rightHandTracked: this.env.getHandConfig('right').tracked,
      activeReferenceSpace: this.env.getSnapshot().referenceSpaceType,
      hasFloorLevel:
        this.env.getSnapshot().referenceSpaceType === 'local-floor' ||
        this.env.getSnapshot().referenceSpaceType === 'bounded-floor',
    });
    this.pushLog('calibration', 'START_CALIBRATION', true, 'Started XRHand calibration workflow');
  }

  public setPostureMode(mode: PostureMode): void {
    this.accessibilityManager.setPostureMode(mode);
    const snap = this.env.getSnapshot();
    const y = mode === 'standing' ? 1.68 : 1.25;
    this.env.setHeadPose([snap.headPosition[0], y, snap.headPosition[2]], snap.headYawRadians);
    this.accessibilityManager.updateReferenceSpace(snap.referenceSpaceType, y);
    this.syncLayoutToCrystals();
    this.pushLog('accessibility', `POSTURE_${mode.toUpperCase()}`, true, `Eye height set to ${y.toFixed(2)}m`);
  }

  public setTurnMode(mode: TurnMode): void {
    this.accessibilityManager.setTurnMode(mode);
    this.pushLog('accessibility', `TURN_MODE_${mode.toUpperCase()}`, true, `Active turn mode: ${mode}`);
  }

  public setReferenceSpace(space: SpatialCoordinateSpace): void {
    this.env.setReferenceSpace(space);
    const head = this.env.getSnapshot().headPosition;
    this.accessibilityManager.updateReferenceSpace(space, head[1]);
    this.syncLayoutToCrystals();
    this.pushLog('xr_space', `REF_SPACE_${space.toUpperCase()}`, true, `Switched reference space to ${space}`);
  }

  public rotateHeadYaw(deltaRad: number): void {
    const snap = this.env.getSnapshot();
    this.env.setHeadPose(snap.headPosition, snap.headYawRadians + deltaRad);
  }

  public grabCrystalWithHand(side: VirtualHandSide, crystalId: CrystalId, eventToken?: string): boolean {
    const hs = this.handStates[side];
    const now = this.env.getClockMs();
    const check = this.debouncer.tryExecute({
      category: 'crystal_select',
      targetId: crystalId,
      hand: side,
      nowMs: now,
      eventToken,
    });
    if (!check.allowed) {
      this.pushLog(side, `GRAB_${crystalId.toUpperCase()}`, false, `Blocked: ${check.reason}`);
      return false;
    }

    const frame = this.env.buildHandFrame(side);
    if (!frame.tracked || !frame.indexTipPosition || !frame.thumbTipPosition) {
      this.pushLog(side, `GRAB_${crystalId.toUpperCase()}`, false, 'Hand not tracked');
      return false;
    }

    const mid: [number, number, number] = [
      (frame.indexTipPosition[0] + frame.thumbTipPosition[0]) * 0.5,
      (frame.indexTipPosition[1] + frame.thumbTipPosition[1]) * 0.5,
      (frame.indexTipPosition[2] + frame.thumbTipPosition[2]) * 0.5,
    ];
    this.env.setPinch(side, true, 0.014);
    hs.pinch = {
      isPinching: true,
      nativePinchActive: true,
      hasValidPinchJoints: true,
      pinchDistance: 0.014,
    };
    hs.grabbedCrystalId = crystalId;
    hs.recovery.preservedCrystalId = crystalId;
    hs.recovery.preservedRotationY =
      this.crystals.find((c) => c.id === crystalId)?.rotationY ?? null;
    hs.lastPinchMidpoint = mid;
    hs.pinchAnchorMidpoint = mid;
    this.selectedCrystalId = crystalId;
    this.pushLog(side, `GRAB_${crystalId.toUpperCase()}`, true, `Locked crystal ${crystalId}`);
    return true;
  }

  public releaseHandPinch(side: VirtualHandSide, eventToken?: string): boolean {
    const hs = this.handStates[side];
    this.env.setPinch(side, false, 0.075);
    const next = resolvePinchTransition(
      hs.pinch,
      { type: 'pinchend' },
      this.calibrationManager.getProfile().pinchStartThreshold,
      this.calibrationManager.getProfile().pinchEndThreshold
    );
    hs.pinch = {
      ...hs.pinch,
      isPinching: next.isPinching,
      nativePinchActive: next.nativePinchActive,
    };

    if (next.action === 'release' || !hs.pinch.isPinching) {
      const releasedId = hs.grabbedCrystalId;
      hs.grabbedCrystalId = null;
      hs.lastPinchMidpoint = null;
      hs.pinchAnchorMidpoint = null;
      hs.hasTriggeredAirSwipeTurn = false;
      this.debouncer.releaseChannel(side, 'crystal_select');
      if (releasedId) {
        this.pushLog(side, `RELEASE_${releasedId.toUpperCase()}`, true, `Released cleanly (${eventToken || 'manual'})`);
      }
      return true;
    }
    return false;
  }

  public executeVRUIAction(
    action: VRUIAction,
    sourceHand: VirtualHandSide | 'system' = 'system',
    eventToken?: string
  ): boolean {
    const now = this.env.getClockMs();
    const category = categorizeVRUIActionType(action.type);
    const check = this.debouncer.tryExecute({
      category,
      targetId: action.type,
      hand: sourceHand,
      nowMs: now,
      eventToken,
    });
    if (!check.allowed) {
      this.pushLog(sourceHand, action.type, false, `Blocked (${check.reason}, ${check.remainingCooldownMs}ms)`);
      return false;
    }

    switch (action.type) {
      case 'TOGGLE_WRIST_MENU':
        this.wristMenuOpen = !this.wristMenuOpen;
        break;
      case 'SNAP_TURN':
      case 'SMOOTH_TURN':
        this.rotateHeadYaw(action.deltaYawRadians);
        break;
      case 'TOGGLE_TURN_MODE':
        this.accessibilityManager.toggleTurnMode();
        break;
      case 'TOGGLE_POSTURE':
        this.setPostureMode(
          this.accessibilityManager.getState().postureMode === 'seated' ? 'standing' : 'seated'
        );
        break;
      case 'TOGGLE_DOMINANT_HAND': {
        const cur = this.calibrationManager.getProfile().dominantHand;
        this.calibrationManager.setDominantHand(cur === 'left' ? 'right' : 'left');
        break;
      }
      case 'START_CALIBRATION':
        this.startCalibration();
        break;
      case 'COMPLETE_CALIBRATION':
        this.calibrationManager.completeCalibration(now);
        this.accessibilityManager.syncCalibrationReach(
          this.calibrationManager.getProfile().comfortableReachMeters
        );
        this.syncLayoutToCrystals();
        break;
      case 'SKIP_CALIBRATION':
        this.calibrationManager.skipCalibration();
        break;
      case 'CANCEL_CALIBRATION':
        this.calibrationManager.cancelCalibration();
        break;
      case 'START_MISSION':
      case 'RESUME_MISSION':
        this.gamePhase = 'playing';
        break;
      case 'PAUSE_MISSION':
        this.gamePhase = 'paused';
        break;
      case 'TOGGLE_BEAM':
        this.isBeamSourceActive = !this.isBeamSourceActive;
        this.recomputePuzzle();
        break;
      case 'RESET_PUZZLE':
        this.crystals = DEFAULT_CRYSTALS.map((c) => ({
          ...c,
          rotationY: (c.targetRotationY + 2.1) % (Math.PI * 2),
          currentPosition: [c.currentPosition[0], this.accessibilityManager.computeLayout().crystalElevationY, c.currentPosition[2]],
        }));
        this.isBeamSourceActive = true;
        this.gamePhase = 'playing';
        this.recomputePuzzle();
        break;
      case 'OPEN_DECODER':
        this.gamePhase = 'decoding';
        break;
      case 'CLOSE_DECODER':
      case 'CLOSE_STORY':
        this.gamePhase = 'playing';
        break;
      case 'OPEN_STORY':
        this.gamePhase = 'story';
        break;
      case 'EXIT_VR':
        this.interruptSession();
        break;
      default:
        break;
    }

    this.pushLog(sourceHand, action.type, true, 'Executed via controller-free XR UI pipeline');
    return true;
  }

  public triggerSessionInterruption(): void {
    this.env.interruptSession();
    this.interruptSession();
  }

  private interruptSession(): void {
    if (this.calibrationManager.getState().status === 'in_progress') {
      this.calibrationManager.handleTrackingInterruption('XR session ended before calibration completed');
    }
    for (const side of ['left', 'right'] as const) {
      const hs = this.handStates[side];
      if (hs.grabbedCrystalId) {
        const curRot = this.crystals.find((c) => c.id === hs.grabbedCrystalId)?.rotationY ?? null;
        hs.recovery.preservedCrystalId = hs.grabbedCrystalId;
        hs.recovery.preservedRotationY = curRot;
      }
      hs.grabbedCrystalId = null;
      hs.pinch.isPinching = false;
      hs.pinch.nativePinchActive = false;
      hs.lastPinchMidpoint = null;
      hs.pinchAnchorMidpoint = null;
    }
    this.pushLog('xr_session', 'SESSION_INTERRUPTED', true, 'Cleaned up active grabs & preserved crystal angles');
  }

  /**
   * Advances the virtual XR environment by `dtMs` milliseconds and executes the exact
   * validation, recovery, pinch hysteresis, camera-relative crystal rotation, turn gesture,
   * and calibration logic used in production.
   */
  public stepFrame(
    dtMs = 16.6,
    nativeEvent?: { side: VirtualHandSide; type: 'pinchstart' | 'pinchend'; eventToken?: string }
  ): VirtualXRDashboardState {
    const now = this.env.advanceClock(dtMs);
    this.debouncer.updateCooldowns(now);
    const snap = this.env.getSnapshot();

    if (!snap.sessionActive) {
      return this.getDashboardState();
    }

    const profile = this.calibrationManager.getProfile();
    const layout = this.accessibilityManager.computeLayout();
    const startThresh = profile.pinchStartThreshold;
    const endThresh = profile.pinchEndThreshold;

    const camForward = new THREE.Vector3(
      -Math.sin(snap.headYawRadians),
      0,
      -Math.cos(snap.headYawRadians)
    ).normalize();
    const camRight = new THREE.Vector3();

    const frameBySide: Record<VirtualHandSide, VirtualHandFrameOutput> = {
      left: snap.leftHand,
      right: snap.rightHand,
    };

    // Process both hands independently so one hand tracking failure never blocks the other hand
    for (const side of ['left', 'right'] as const) {
      const frame = frameBySide[side];
      const hs = this.handStates[side];

      const allowReanchor = hs.recovery.state !== 'tracking';
      const coordCheck = validateHandCoordinates(
        frame.wristPosition,
        frame.indexTipPosition,
        frame.thumbTipPosition,
        hs.recovery.lastValidWristPos,
        dtMs,
        DEFAULT_RECOVERY_CONFIG,
        allowReanchor
      );

      const hasCoreValid = frame.tracked && coordCheck.valid;
      if (!coordCheck.valid) {
        hs.rejectedInvalidFrames++;
        hs.lastRejectReason = coordCheck.reason;
      }

      const recoveryStep = evaluateHandRecoveryTransition(
        hs.recovery,
        hasCoreValid,
        now,
        DEFAULT_RECOVERY_CONFIG
      );
      hs.recovery = recoveryStep.nextSnapshot;

      if (!hasCoreValid) {
        hs.pinch.hasValidPinchJoints = false;
        if (recoveryStep.shouldPreserveAndRelease && (hs.pinch.isPinching || hs.grabbedCrystalId)) {
          if (hs.grabbedCrystalId) {
            hs.recovery.preservedCrystalId = hs.grabbedCrystalId;
            hs.recovery.preservedRotationY =
              this.crystals.find((c) => c.id === hs.grabbedCrystalId)?.rotationY ?? null;
          }
          hs.pinch.isPinching = false;
          hs.pinch.nativePinchActive = false;
          hs.grabbedCrystalId = null;
          hs.lastPinchMidpoint = null;
          hs.pinchAnchorMidpoint = null;
          this.pushLog(side, 'LOST_HAND_SAFE_RELEASE', true, `Preserved angle (${hs.lastRejectReason || 'tracking_loss'})`);
        }
        continue;
      }

      if (frame.wristPosition) {
        hs.recovery.lastValidWristPos = frame.wristPosition;
      }

      const mid: [number, number, number] = [
        (frame.indexTipPosition![0] + frame.thumbTipPosition![0]) * 0.5,
        (frame.indexTipPosition![1] + frame.thumbTipPosition![1]) * 0.5,
        (frame.indexTipPosition![2] + frame.thumbTipPosition![2]) * 0.5,
      ];

      hs.pinch.hasValidPinchJoints = true;
      hs.pinch.pinchDistance = frame.pinchDistanceMeters;

      if (recoveryStep.shouldResetPinchDelta) {
        hs.lastPinchMidpoint = mid;
        hs.pinchAnchorMidpoint = mid;
      }

      // Process optional native XR pinchstart / pinchend event first
      if (nativeEvent && nativeEvent.side === side) {
        const resNative = resolvePinchTransition(
          hs.pinch,
          { type: nativeEvent.type },
          startThresh,
          endThresh
        );
        hs.pinch.isPinching = resNative.isPinching;
        hs.pinch.nativePinchActive = resNative.nativePinchActive;
        if (resNative.action === 'start') {
          hs.lastPinchMidpoint = mid;
          hs.pinchAnchorMidpoint = mid;
        } else if (resNative.action === 'release') {
          hs.grabbedCrystalId = null;
          hs.lastPinchMidpoint = null;
          hs.pinchAnchorMidpoint = null;
          hs.hasTriggeredAirSwipeTurn = false;
        }
      }

      // Reconcile per-frame distance hysteresis update
      const resDist = resolvePinchTransition(
        hs.pinch,
        { type: 'distance_update', pinchDistance: frame.pinchDistanceMeters },
        startThresh,
        endThresh
      );
      hs.pinch.isPinching = resDist.isPinching;
      hs.pinch.nativePinchActive = resDist.nativePinchActive;

      if (resDist.action === 'start' && !recoveryStep.shouldFreezeRotation) {
        hs.lastPinchMidpoint = mid;
        hs.pinchAnchorMidpoint = mid;
        // Auto-grab nearest crystal if within reach
        let bestId: CrystalId | null = null;
        let bestDist = Infinity;
        for (const c of this.crystals) {
          const d = Math.hypot(
            mid[0] - c.currentPosition[0],
            mid[1] - c.currentPosition[1],
            mid[2] - c.currentPosition[2]
          );
          if (d <= layout.directReachRadiusMeters && d < bestDist) {
            bestDist = d;
            bestId = c.id;
          }
        }
        if (bestId) {
          const check = this.debouncer.tryExecute({
            category: 'crystal_select',
            targetId: bestId,
            hand: side,
            nowMs: now,
            eventToken: nativeEvent?.eventToken,
          });
          if (check.allowed) {
            hs.grabbedCrystalId = bestId;
            this.selectedCrystalId = bestId;
            hs.recovery.preservedCrystalId = bestId;
            hs.recovery.preservedRotationY =
              this.crystals.find((c) => c.id === bestId)?.rotationY ?? null;
          }
        }
      } else if (resDist.action === 'release') {
        hs.grabbedCrystalId = null;
        hs.lastPinchMidpoint = null;
        hs.pinchAnchorMidpoint = null;
        hs.hasTriggeredAirSwipeTurn = false;
        this.debouncer.releaseChannel(side, 'crystal_select');
      }

      // Apply camera-relative crystal rotation or empty-space turn only when not frozen/recovering
      if (hs.pinch.isPinching && !recoveryStep.shouldFreezeRotation) {
        if (hs.grabbedCrystalId && hs.lastPinchMidpoint) {
          const deltaVec = new THREE.Vector3(
            mid[0] - hs.lastPinchMidpoint[0],
            mid[1] - hs.lastPinchMidpoint[1],
            mid[2] - hs.lastPinchMidpoint[2]
          );
          const lateral = computeViewRelativeLateralDelta(deltaVec, camForward, camRight);
          if (Math.abs(lateral) > 0.0012) {
            const deltaAngle = lateral * profile.rotationSensitivity;
            this.crystals = this.crystals.map((c) =>
              c.id === hs.grabbedCrystalId ? { ...c, rotationY: c.rotationY + deltaAngle } : c
            );
            this.recomputePuzzle();
          }
          hs.lastPinchMidpoint = mid;
        } else if (!hs.grabbedCrystalId && hs.pinchAnchorMidpoint) {
          const anchorDelta = new THREE.Vector3(
            mid[0] - hs.pinchAnchorMidpoint[0],
            mid[1] - hs.pinchAnchorMidpoint[1],
            mid[2] - hs.pinchAnchorMidpoint[2]
          );
          const swipeLat = computeViewRelativeLateralDelta(anchorDelta, camForward, camRight);
          if (layout.turnMode === 'smooth') {
            if (Math.abs(swipeLat) > 0.04) {
              const norm = Math.max(
                -1,
                Math.min(1, (swipeLat - Math.sign(swipeLat) * 0.04) / 0.14)
              );
              const dyaw = -norm * layout.smoothTurnRateRadPerSec * (dtMs / 1000);
              this.rotateHeadYaw(dyaw);
            }
          } else if (
            !hs.hasTriggeredAirSwipeTurn &&
            Math.abs(swipeLat) > profile.airSwipeThresholdMeters
          ) {
            const turnCheck = this.debouncer.tryExecute({
              category: 'snap_turn',
              targetId: swipeLat > 0 ? 'air_swipe_right' : 'air_swipe_left',
              hand: side,
              nowMs: now,
            });
            if (turnCheck.allowed) {
              this.rotateHeadYaw(swipeLat > 0 ? -layout.snapTurnAngleRad : layout.snapTurnAngleRad);
              hs.hasTriggeredAirSwipeTurn = true;
              hs.pinchAnchorMidpoint = mid;
              this.pushLog(
                side,
                swipeLat > 0 ? 'AIR_SNAP_RIGHT' : 'AIR_SNAP_LEFT',
                true,
                'Rotated camera rig 45°'
              );
            }
          }
        }
      }
    }

    // Palm-up auto-reveal check on configured wristMenuHand
    const menuSide = profile.wristMenuHand;
    const menuFrame = frameBySide[menuSide];
    if (menuFrame.tracked && menuFrame.palmUpScore > 0.62 && !this.wristMenuOpen) {
      this.wristMenuOpen = true;
      this.pushLog(menuSide, 'PALM_UP_MENU_OPEN', true, `palmUpScore=${menuFrame.palmUpScore.toFixed(2)}`);
    }

    // Feed active calibration sampler with validated coordinates only
    if (this.calibrationManager.getState().status === 'in_progress') {
      const prevCalStatus = this.calibrationManager.getState().status;
      this.calibrationManager.sampleFrame({
        headPosition: snap.headPosition,
        leftHand: {
          isTracking: frameBySide.left.tracked && this.handStates.left.recovery.state === 'tracking',
          wristPos: frameBySide.left.wristPosition,
          pinchDistanceMeters: frameBySide.left.pinchDistanceMeters,
          isPinching: this.handStates.left.pinch.isPinching,
        },
        rightHand: {
          isTracking: frameBySide.right.tracked && this.handStates.right.recovery.state === 'tracking',
          wristPos: frameBySide.right.wristPosition,
          pinchDistanceMeters: frameBySide.right.pinchDistanceMeters,
          isPinching: this.handStates.right.pinch.isPinching,
        },
        nowMs: now,
      });
      const calAfter = this.calibrationManager.getState();
      if (prevCalStatus === 'in_progress' && calAfter.status === 'completed') {
        this.accessibilityManager.syncCalibrationReach(calAfter.profile.comfortableReachMeters);
        this.syncLayoutToCrystals();
        this.pushLog('calibration', 'CALIBRATION_COMPLETED', true, `reach=${calAfter.profile.comfortableReachMeters}m`);
      } else if (prevCalStatus === 'in_progress' && calAfter.status === 'interrupted_fallback') {
        this.pushLog('calibration', 'CALIBRATION_INTERRUPTED', false, calAfter.interruptedReason || 'Interrupted');
      }
    }

    return this.getDashboardState();
  }

  public getVRUISyncState(): VRUISyncState {
    const snap = this.env.getSnapshot();
    const activeHandsCount = (snap.leftHand.tracked ? 1 : 0) + (snap.rightHand.tracked ? 1 : 0);
    return {
      phase: this.gamePhase,
      totalCoherence: this.totalCoherence,
      isBeamSourceActive: this.isBeamSourceActive,
      decodingState: {
        isUnlocked: this.isTargetReceiverHit,
        selectedSequence: [],
        targetSequence: TARGET_DECODING_SEQUENCE,
        isSolved: false,
        attempts: 0,
        lastFeedback: { status: 'idle', message: '', correctCount: 0 },
        cluesScannerOpen: false,
      },
      storyChapterIndex: 0,
      selectedCrystalId: this.selectedCrystalId,
      handTrackingStatus: activeHandsCount > 0 ? 'active' : 'supported',
      activeHandsCount,
      calibrationState: this.calibrationManager.getState(),
      accessibilityState: this.accessibilityManager.getState(),
    };
  }

  public getDashboardState(): VirtualXRDashboardState {
    const snap = this.env.getSnapshot();
    return {
      isDevSimulationOnly: true,
      sessionActive: snap.sessionActive,
      sessionInterrupted: snap.sessionInterrupted,
      simulatedClockMs: snap.simulatedClockMs,
      gamePhase: this.gamePhase,
      wristMenuOpen: this.wristMenuOpen,
      isBeamSourceActive: this.isBeamSourceActive,
      totalCoherence: this.totalCoherence,
      isTargetReceiverHit: this.isTargetReceiverHit,
      selectedCrystalId: this.selectedCrystalId,
      headPosition: snap.headPosition,
      headYawRadians: snap.headYawRadians,
      leftHand: {
        side: 'left',
        frame: snap.leftHand,
        recovery: { ...this.handStates.left.recovery },
        pinchState: { ...this.handStates.left.pinch },
        grabbedCrystalId: this.handStates.left.grabbedCrystalId,
        lastPinchMidpoint: this.handStates.left.lastPinchMidpoint,
        pinchAnchorMidpoint: this.handStates.left.pinchAnchorMidpoint,
        hasTriggeredAirSwipeTurn: this.handStates.left.hasTriggeredAirSwipeTurn,
        rejectedInvalidFrames: this.handStates.left.rejectedInvalidFrames,
        lastRejectReason: this.handStates.left.lastRejectReason,
      },
      rightHand: {
        side: 'right',
        frame: snap.rightHand,
        recovery: { ...this.handStates.right.recovery },
        pinchState: { ...this.handStates.right.pinch },
        grabbedCrystalId: this.handStates.right.grabbedCrystalId,
        lastPinchMidpoint: this.handStates.right.lastPinchMidpoint,
        pinchAnchorMidpoint: this.handStates.right.pinchAnchorMidpoint,
        hasTriggeredAirSwipeTurn: this.handStates.right.hasTriggeredAirSwipeTurn,
        rejectedInvalidFrames: this.handStates.right.rejectedInvalidFrames,
        lastRejectReason: this.handStates.right.lastRejectReason,
      },
      calibration: this.calibrationManager.getState(),
      accessibility: this.accessibilityManager.getState(),
      debouncerMetrics: this.debouncer.getMetrics(),
      crystals: this.crystals.map((c) => ({
        id: c.id,
        name: c.name,
        rotationY: Math.round(c.rotationY * 10000) / 10000,
        resonancePercent: c.resonancePercent,
        isAligned: c.isAligned,
        position: [...c.currentPosition] as [number, number, number],
      })),
      controllerDependencyCount: 0,
      eventLog: [...this.eventLog],
    };
  }
}

/**
 * Runs the complete deterministic suite of Virtual WebXR hardware simulation scenarios
 * across Sections 2 (Gesture), 3 (Spatial), and 4 (Failure Injection).
 */
export function runAllVirtualXRScenarios(): SimulationScenarioResult[] {
  const results: SimulationScenarioResult[] = [];

  const runTimed = (
    id: string,
    category: SimulationScenarioResult['category'],
    name: string,
    fn: () => { passed: boolean; summary: string; metrics: Record<string, string | number | boolean> }
  ) => {
    const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const out = fn();
    const dt = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
    results.push({
      id,
      category,
      name,
      passed: out.passed,
      durationMs: Math.round(dt * 100) / 100,
      summary: out.summary,
      metrics: out.metrics,
    });
  };

  // Scenario 1: Right-handed & Left-handed Gesture Calibration
  runTimed('cal_dual_handed', 'gesture', 'Gesture Calibration (Left & Right Handed)', () => {
    const h = new VirtualXRSimulationHarness();
    h.startCalibration();
    h.env.setHeadPose([0, 1.3, 5.0], 0);
    h.env.setHandState('right', { wristPosition: [0.22, 1.15, 4.35], pinchApertureMeters: 0.08 });
    for (let i = 0; i < 9; i++) h.stepFrame(16.6);
    h.env.setPinch('right', true, 0.015);
    for (let i = 0; i < 4; i++) h.stepFrame(16.6);
    const rightProfile = h.calibrationManager.getProfile();

    const hLeft = new VirtualXRSimulationHarness();
    hLeft.startCalibration();
    hLeft.env.setHeadPose([0, 1.65, 5.0], 0);
    hLeft.env.setHandState('right', { tracked: false });
    hLeft.env.setHandState('left', { tracked: true, wristPosition: [-0.25, 1.48, 4.55], pinchApertureMeters: 0.082 });
    for (let i = 0; i < 9; i++) hLeft.stepFrame(16.6);
    hLeft.env.setPinch('left', true, 0.016);
    for (let i = 0; i < 4; i++) hLeft.stepFrame(16.6);
    const leftProfile = hLeft.calibrationManager.getProfile();

    const passed =
      rightProfile.isCalibrated &&
      rightProfile.dominantHand === 'right' &&
      rightProfile.wristMenuHand === 'left' &&
      leftProfile.isCalibrated &&
      leftProfile.dominantHand === 'left' &&
      leftProfile.wristMenuHand === 'right';

    return {
      passed,
      summary: `Right reach=${rightProfile.comfortableReachMeters}m, Left reach=${leftProfile.comfortableReachMeters}m`,
      metrics: {
        rightDom: rightProfile.dominantHand,
        leftDom: leftProfile.dominantHand,
        rightPinchThresh: rightProfile.pinchStartThreshold,
        leftWristMenu: leftProfile.wristMenuHand,
      },
    };
  });

  // Scenario 2: Gesture Debouncing & Rapid Burst Blocking
  runTimed('gesture_debouncing', 'gesture', 'Gesture Debouncer & Cooldown Burst Guard', () => {
    const h = new VirtualXRSimulationHarness();
    let executed = 0;
    for (let i = 0; i < 20; i++) {
      if (h.executeVRUIAction({ type: 'TOGGLE_WRIST_MENU' }, 'right', 'burst-tok')) {
        executed++;
      }
      h.env.advanceClock(10);
    }
    h.env.advanceClock(450);
    const afterCooldown = h.executeVRUIAction({ type: 'TOGGLE_WRIST_MENU' }, 'right', 'post-cooldown');
    const metrics = h.debouncer.getMetrics();
    const passed = executed === 1 && afterCooldown && metrics.blockedDuplicateCount + metrics.blockedCooldownCount >= 19;

    return {
      passed,
      summary: `Executed ${executed}/20 during 200ms burst; allowed post-cooldown=${afterCooldown}`,
      metrics: {
        burstExecuted: executed,
        blockedCooldown: metrics.blockedCooldownCount,
        blockedDuplicate: metrics.blockedDuplicateCount,
        postCooldownAllowed: afterCooldown,
      },
    };
  });

  // Scenario 3: PinchStart / PinchEnd Reconciliation with Distance Hysteresis
  runTimed('pinch_hysteresis', 'gesture', 'PinchStart / PinchEnd & Distance Hysteresis', () => {
    const h = new VirtualXRSimulationHarness();
    h.env.setHandState('right', { wristPosition: [3.64, 1.2, -1.9], pinchApertureMeters: 0.02 });
    h.stepFrame(16.6, { side: 'right', type: 'pinchstart', eventToken: 'evt-p1' });
    const started = h.getDashboardState().rightHand.pinchState.isPinching;

    // Move to 0.030m (inside hysteresis [0.024..0.040]) + emit native pinchend
    h.env.setHandState('right', { pinchApertureMeters: 0.03 });
    h.stepFrame(16.6, { side: 'right', type: 'pinchend' });
    const heldInHysteresis = h.getDashboardState().rightHand.pinchState.isPinching;

    // Open past 0.046m -> must release
    h.env.setHandState('right', { pinchApertureMeters: 0.046 });
    h.stepFrame(16.6);
    const releasedCleanly = !h.getDashboardState().rightHand.pinchState.isPinching;

    const passed = started && heldInHysteresis && releasedCleanly;
    return {
      passed,
      summary: `Started=${started}, Held at 3.0cm=${heldInHysteresis}, Released at 4.6cm=${releasedCleanly}`,
      metrics: { started, heldInHysteresis, releasedCleanly },
    };
  });

  // Scenario 4: Camera-Relative Crystal Rotation (Front/Side/Rear & All 4 Yaws)
  runTimed('camera_relative_crystals', 'spatial', 'Front, Side & Rear Crystal Camera-Relative Rotation', () => {
    const yaws = [0, Math.PI / 2, Math.PI, -Math.PI / 2];
    let allPositive = true;
    for (const yaw of yaws) {
      const h = new VirtualXRSimulationHarness();
      h.env.setHeadPose([0, 1.25, 0], yaw);
      h.env.setHandState('right', { wristPosition: [3.64, 1.25, -2.0], pinchApertureMeters: 0.015 });
      h.stepFrame(16.6);
      h.grabCrystalWithHand('right', 'ruby', `grab-${yaw}`);
      const angleBefore = h.getDashboardState().crystals.find((c) => c.id === 'ruby')!.rotationY;
      // Rightward displacement in camera-local space
      const rightX = Math.cos(yaw) * 0.12;
      const rightZ = -Math.sin(yaw) * 0.12;
      h.env.moveHandBy('right', [rightX, 0, rightZ]);
      h.stepFrame(16.6);
      const angleAfter = h.getDashboardState().crystals.find((c) => c.id === 'ruby')!.rotationY;
      if (angleAfter <= angleBefore) allPositive = false;
    }

    // Also confirm Ruby (side right), Azure (front/rear), and Emerald (side left) are all selectable & rotatable
    const crystalIds: CrystalId[] = ['ruby', 'azure', 'emerald'];
    let allChanged = true;
    for (const cid of crystalIds) {
      const hCrystal = new VirtualXRSimulationHarness();
      const pos = DEFAULT_CRYSTALS.find((c) => c.id === cid)!.defaultPosition;
      hCrystal.env.setHandState('right', { wristPosition: [pos[0], pos[1], pos[2] + 0.15], pinchApertureMeters: 0.015 });
      hCrystal.stepFrame(16.6);
      hCrystal.grabCrystalWithHand('right', cid, `multi-${cid}`);
      const b = hCrystal.getDashboardState().crystals.find((c) => c.id === cid)!.rotationY;
      hCrystal.env.moveHandBy('right', [0.1, 0, 0]);
      hCrystal.stepFrame(16.6);
      const a = hCrystal.getDashboardState().crystals.find((c) => c.id === cid)!.rotationY;
      if (a === b) allChanged = false;
    }

    return {
      passed: allPositive && allChanged,
      summary: `Consistent positive view-relative sign across 4 HMD yaws=${allPositive}; 3/3 crystals rotatable=${allChanged}`,
      metrics: { yawsTested: 4, allPositive, allCrystalsRotatable: allChanged },
    };
  });

  // Scenario 5: Snap-Turn & Smooth-Turn Gestures
  runTimed('snap_smooth_turn', 'spatial', 'Seated Snap-Turn & Smooth-Turn Gestures', () => {
    const h = new VirtualXRSimulationHarness();
    h.setTurnMode('snap');
    h.env.setHandState('right', { wristPosition: [0.1, 1.3, 6.4], pinchApertureMeters: 0.014 });
    h.stepFrame(16.6);
    h.env.moveHandBy('right', [0.22, 0, 0]);
    h.stepFrame(16.6);
    const snapYaw = h.getDashboardState().headYawRadians;
    h.releaseHandPinch('right');

    h.setTurnMode('smooth');
    h.env.setHandState('right', { wristPosition: [0.1, 1.3, 6.4], pinchApertureMeters: 0.014 });
    h.stepFrame(16.6);
    h.env.moveHandBy('right', [-0.15, 0, 0]);
    h.stepFrame(100);
    const smoothYaw = h.getDashboardState().headYawRadians;

    const passed = Math.abs(snapYaw + Math.PI / 4) < 0.01 && smoothYaw > snapYaw;
    return {
      passed,
      summary: `Snap yaw=${((snapYaw * 180) / Math.PI).toFixed(1)}°, Smooth recovered yaw=${((smoothYaw * 180) / Math.PI).toFixed(1)}°`,
      metrics: { snapYawDeg: Math.round((snapYaw * 180) / Math.PI), smoothYawDeg: Math.round((smoothYaw * 180) / Math.PI) },
    };
  });

  // Scenario 6: Wrist Menu Palm-Up Auto-Reveal & Zero-Controller Loop
  runTimed('wrist_menu_hands_only', 'gesture', 'Wrist Menu Palm-Up & Controller-Free Mission Flow', () => {
    const h = new VirtualXRSimulationHarness();
    h.env.setPalmFacingHead('left', true);
    h.stepFrame(16.6);
    const menuAutoOpened = h.getDashboardState().wristMenuOpen;
    const palmScore = h.getDashboardState().leftHand.frame.palmUpScore;

    const pauseOk = h.executeVRUIAction({ type: 'PAUSE_MISSION' }, 'right');
    h.env.advanceClock(550);
    const resumeOk = h.executeVRUIAction({ type: 'RESUME_MISSION' }, 'right');
    h.env.advanceClock(550);
    const beamOk = h.executeVRUIAction({ type: 'TOGGLE_BEAM' }, 'right');

    const wristButtons = buildWristMenuButtons(h.getVRUISyncState());
    const phaseButtons = buildChamberPhaseButtons({ ...h.getVRUISyncState(), phase: 'decoding' });

    const passed = menuAutoOpened && palmScore > 0.62 && pauseOk && resumeOk && beamOk && wristButtons.length >= 16 && phaseButtons.length >= 10;
    return {
      passed,
      summary: `PalmScore=${palmScore.toFixed(2)}, WristMenu=${menuAutoOpened}, Buttons=${wristButtons.length}+${phaseButtons.length}`,
      metrics: { palmScore, menuAutoOpened, wristButtons: wristButtons.length, cipherButtons: phaseButtons.length },
    };
  });

  // Scenario 7: Seated vs Standing Posture & Varying Arm Reaches
  runTimed('seated_standing_postures', 'spatial', 'Seated vs Standing Heights & Arm Reach Adaptation', () => {
    const h = new VirtualXRSimulationHarness();
    h.setPostureMode('seated');
    h.accessibilityManager.syncCalibrationReach(0.42);
    const seatedLayout = h.accessibilityManager.computeLayout();

    h.setPostureMode('standing');
    h.accessibilityManager.syncCalibrationReach(0.82);
    const standingLayout = h.accessibilityManager.computeLayout();

    const passed =
      standingLayout.crystalElevationY > seatedLayout.crystalElevationY &&
      standingLayout.directReachRadiusMeters > seatedLayout.directReachRadiusMeters &&
      standingLayout.chamberPanelY > seatedLayout.chamberPanelY;

    return {
      passed,
      summary: `Seated Y=${seatedLayout.crystalElevationY}m -> Standing Y=${standingLayout.crystalElevationY}m`,
      metrics: {
        seatedCrystalY: seatedLayout.crystalElevationY,
        standingCrystalY: standingLayout.crystalElevationY,
        seatedReachRadius: seatedLayout.directReachRadiusMeters,
        standingReachRadius: standingLayout.directReachRadiusMeters,
      },
    };
  });

  // Scenario 8: Lost-Hand Recovery, Micro-Occlusion & Multi-Frame Reacquisition
  runTimed('lost_hand_recovery', 'failure_injection', 'Lost-Hand Micro-Occlusion Freeze & Clean Reacquisition', () => {
    const h = new VirtualXRSimulationHarness();
    h.env.setHandState('right', { wristPosition: [3.64, 1.25, -2.0], pinchApertureMeters: 0.015 });
    h.stepFrame(16.6);
    h.grabCrystalWithHand('right', 'ruby');
    const preAngle = h.getDashboardState().crystals.find((c) => c.id === 'ruby')!.rotationY;

    // 60ms micro-occlusion -> frozen rotation, no drift
    h.env.injectFault('right', 'tracking_loss', 280);
    h.stepFrame(60);
    const graceState = h.getDashboardState().rightHand.recovery.state;
    const graceAngle = h.getDashboardState().crystals.find((c) => c.id === 'ruby')!.rotationY;

    // Exceed 180ms grace -> safe lost release
    h.stepFrame(190);
    const lostState = h.getDashboardState().rightHand.recovery.state;

    // Reacquire after timer expires -> stabilizing then tracking, still zero snap
    h.env.moveHandBy('right', [0.35, 0, 0]);
    h.stepFrame(50);
    const recoveringState = h.getDashboardState().rightHand.recovery.state;
    h.stepFrame(16.6);
    h.stepFrame(16.6);
    const trackingAgain = h.getDashboardState().rightHand.recovery.state;
    const postRecoveryAngle = h.getDashboardState().crystals.find((c) => c.id === 'ruby')!.rotationY;

    const passed =
      graceState === 'occluded_grace' &&
      lostState === 'lost' &&
      (recoveringState === 'recovering' || recoveringState === 'tracking') &&
      trackingAgain === 'tracking' &&
      graceAngle === preAngle &&
      postRecoveryAngle === preAngle;

    return {
      passed,
      summary: `Grace=${graceState}, Lost=${lostState}, Recovered=${trackingAgain}, Angle drift=0 rad`,
      metrics: {
        graceState,
        lostState,
        finalState: trackingAgain,
        recoveryCount: h.getDashboardState().rightHand.recovery.recoveryCount,
        anglePreserved: postRecoveryAngle === preAngle,
      },
    };
  });

  // Scenario 9: Fault Injection - Invalid Coordinates (NaN, Infinity, Zero, Out-of-Bounds, Teleport Spike)
  runTimed('fault_invalid_joints', 'failure_injection', 'NaN, Infinity, Zero-Origin & Teleport Spike Rejection', () => {
    const h = new VirtualXRSimulationHarness();
    h.env.setHandState('right', { wristPosition: [3.64, 1.25, -2.0], pinchApertureMeters: 0.015 });
    h.stepFrame(16.6);
    h.grabCrystalWithHand('right', 'ruby');
    const preAngle = h.getDashboardState().crystals.find((c) => c.id === 'ruby')!.rotationY;

    const faults: VirtualFaultType[] = ['teleport_spike', 'nan_joint', 'infinity_joint', 'zero_origin', 'out_of_bounds'];
    for (const f of faults) {
      h.env.injectFault('right', f);
      h.stepFrame(16.6);
    }

    const state = h.getDashboardState();
    const angleAfter = state.crystals.find((c) => c.id === 'ruby')!.rotationY;
    const passed =
      Number.isFinite(angleAfter) &&
      angleAfter === preAngle &&
      state.rightHand.rejectedInvalidFrames >= faults.length;

    return {
      passed,
      summary: `Rejected ${state.rightHand.rejectedInvalidFrames} corrupted frames; crystal angle intact (${angleAfter.toFixed(3)} rad)`,
      metrics: {
        faultsInjected: faults.length,
        rejectedFrames: state.rightHand.rejectedInvalidFrames,
        angleCorrupted: !Number.isFinite(angleAfter),
      },
    };
  });

  // Scenario 10: Calibration >2.5s Interruption, Simultaneous Hands & Unexpected Session End
  runTimed('fault_session_and_simultaneous', 'failure_injection', 'Calibration Interruption (>2.5s), Dual-Hand Concurrency & Session Drop', () => {
    // 10a. >2.5s calibration interruption
    const hCal = new VirtualXRSimulationHarness();
    hCal.startCalibration();
    hCal.env.injectFault('left', 'tracking_loss');
    hCal.env.injectFault('right', 'tracking_loss');
    hCal.stepFrame(50);
    hCal.stepFrame(2600);
    const calInterrupted = hCal.calibrationManager.getState().status === 'interrupted_fallback';

    // 10b. Simultaneous Left & Right Hand interactions + unexpected XR session drop
    const hSim = new VirtualXRSimulationHarness();
    hSim.env.setHandState('left', { wristPosition: [-3.64, 1.25, -2.0], pinchApertureMeters: 0.075 });
    hSim.env.setHandState('right', { wristPosition: [3.64, 1.25, -2.0], pinchApertureMeters: 0.075 });
    hSim.stepFrame(16.6);
    const leftGrab = hSim.grabCrystalWithHand('left', 'emerald', 'dual-l');
    hSim.env.advanceClock(250);
    const rightGrab = hSim.grabCrystalWithHand('right', 'ruby', 'dual-r');
    const bothHolding =
      hSim.getDashboardState().leftHand.grabbedCrystalId === 'emerald' &&
      hSim.getDashboardState().rightHand.grabbedCrystalId === 'ruby';

    hSim.triggerSessionInterruption();
    const afterSessionDrop = hSim.getDashboardState();
    const cleanDrop =
      !afterSessionDrop.sessionActive &&
      afterSessionDrop.sessionInterrupted &&
      afterSessionDrop.leftHand.grabbedCrystalId === null &&
      afterSessionDrop.rightHand.grabbedCrystalId === null;

    const passed = calInterrupted && leftGrab && rightGrab && bothHolding && cleanDrop;
    return {
      passed,
      summary: `CalInterrupted=${calInterrupted}, DualGrabs=${bothHolding}, CleanSessionDrop=${cleanDrop}`,
      metrics: { calInterrupted, dualHold: bothHolding, cleanDrop },
    };
  });

  return results;
}
