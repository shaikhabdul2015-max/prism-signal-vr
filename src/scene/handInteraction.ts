import * as THREE from 'three';
import {
  CrystalId,
  HandTrackingStatus,
  DiagnosticsSessionState,
  HandJointDiagnostics,
  LightingConditionRecord,
} from '../types/game';
import type { WristAnchorSample } from './vrSpatialUI';
import { GlobalGestureDebouncer } from './gestureDebouncer';
import type { TurnMode } from './xrAccessibility';

// Pre-allocated math helpers to guarantee ZERO GC allocations in render loop
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _pinchMid = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _raycaster = new THREE.Raycaster();
const _crystalPos = new THREE.Vector3();
const _dummyMatrix = new THREE.Matrix4();
const _zeroMatrix = new THREE.Matrix4().set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
const _linePosAttr = new Float32Array(6);
const _worldUp = new THREE.Vector3(0, 1, 0);
const _camForward = new THREE.Vector3(0, 0, -1);
const _camRight = new THREE.Vector3(1, 0, 0);
const _camPos = new THREE.Vector3();
const _deltaVec = new THREE.Vector3();
const _palmV1 = new THREE.Vector3();
const _palmV2 = new THREE.Vector3();
const _palmNormal = new THREE.Vector3();
const _toHead = new THREE.Vector3();
const _forwardNegZ = new THREE.Vector3(0, 0, -1);
const _wristPosOut = new THREE.Vector3();
const _oppTipPosOut = new THREE.Vector3();

// Phase 7 & Controller-Free Gesture Baseline Thresholds
export const PINCH_START_THRESHOLD = 0.024; // 2.4 cm to engage pinch
export const PINCH_END_THRESHOLD = 0.040;   // 4.0 cm to release pinch
export const AIR_SWIPE_SNAP_TURN_THRESHOLD = 0.14; // 14 cm lateral swipe in empty space triggers snap turn
export const AIR_SWIPE_COOLDOWN_MS = 520;
export const SNAP_TURN_ANGLE_RAD = Math.PI / 4; // 45 deg comfortable seated snap-turn

export type HandRecoveryState =
  | 'untracked'
  | 'tracking'
  | 'occluded_grace'
  | 'lost'
  | 'recovering';

export interface HandRecoveryConfig {
  lossGracePeriodMs: number;
  prolongedLossThresholdMs: number;
  recoveryStabilizationFrames: number;
  maxSingleFrameJumpMeters: number;
  maxChamberExtentMeters: number;
}

export const DEFAULT_RECOVERY_CONFIG: HandRecoveryConfig = {
  lossGracePeriodMs: 180,
  prolongedLossThresholdMs: 500,
  recoveryStabilizationFrames: 3,
  maxSingleFrameJumpMeters: 0.48,
  maxChamberExtentMeters: 15.0,
};

export interface HandRecoverySnapshot {
  hand: 'left' | 'right';
  state: HandRecoveryState;
  lostSinceMs: number | null;
  stabilizationFramesRemaining: number;
  freezeRotationActive: boolean;
  preservedCrystalId: CrystalId | null;
  preservedRotationY: number | null;
  lastValidWristPos: [number, number, number] | null;
  recoveryCount: number;
}

export interface HandInteractionTuning {
  pinchStartThreshold: number;
  pinchEndThreshold: number;
  directReachRadiusMeters: number;
  rotationSensitivity: number;
  airSwipeThresholdMeters: number;
  wristMenuHand: 'left' | 'right';
  turnMode: TurnMode;
  smoothTurnRateRadPerSec: number;
}

export interface PinchStateMachineSnapshot {
  isPinching: boolean;
  nativePinchActive: boolean;
  hasValidPinchJoints: boolean;
  pinchDistance: number;
}

/**
 * Validates tracked 3D coordinates against NaN/Infinity, zero-degenerate origin,
 * stale out-of-bounds positions, and unphysical single-frame tracking teleportation spikes.
 */
export function validateHandCoordinates(
  wristPos: [number, number, number] | null,
  indexPos: [number, number, number] | null,
  thumbPos: [number, number, number] | null,
  prevWristPos: [number, number, number] | null = null,
  dtMs = 16.6,
  config: HandRecoveryConfig = DEFAULT_RECOVERY_CONFIG,
  allowReanchorJump = false
): { valid: boolean; reason: string } {
  const triples = [wristPos, indexPos, thumbPos];
  for (const pt of triples) {
    if (!pt || pt.length !== 3 || !pt.every(Number.isFinite)) {
      return { valid: false, reason: 'non_finite_joint' };
    }
    if (Math.hypot(pt[0], pt[1], pt[2]) > config.maxChamberExtentMeters) {
      return { valid: false, reason: 'out_of_bounds_joint' };
    }
  }

  if (wristPos && indexPos && wristPos[0] === 0 && wristPos[1] === 0 && wristPos[2] === 0 && indexPos[0] === 0 && indexPos[1] === 0 && indexPos[2] === 0) {
    return { valid: false, reason: 'zero_degenerate_joints' };
  }

  if (!allowReanchorJump && prevWristPos && wristPos && dtMs < 80) {
    const jump = Math.hypot(
      wristPos[0] - prevWristPos[0],
      wristPos[1] - prevWristPos[1],
      wristPos[2] - prevWristPos[2]
    );
    if (jump > config.maxSingleFrameJumpMeters) {
      return { valid: false, reason: 'tracking_jump_spike' };
    }
  }

  return { valid: true, reason: 'ok' };
}

/**
 * Pure per-hand lost tracking & smooth recovery state transition.
 * Freezes crystal rotation immediately during brief micro-occlusions (`occluded_grace`)
 * and stabilizes multi-frame reacquisition without snapping crystal angles.
 */
export function evaluateHandRecoveryTransition(
  snapshot: HandRecoverySnapshot,
  isFrameValid: boolean,
  nowMs: number,
  config: HandRecoveryConfig = DEFAULT_RECOVERY_CONFIG
): {
  nextSnapshot: HandRecoverySnapshot;
  shouldFreezeRotation: boolean;
  shouldPreserveAndRelease: boolean;
  shouldResetPinchDelta: boolean;
} {
  if (!isFrameValid) {
    if (snapshot.state === 'tracking' || snapshot.state === 'recovering') {
      return {
        nextSnapshot: {
          ...snapshot,
          state: 'occluded_grace',
          lostSinceMs: nowMs,
          freezeRotationActive: true,
        },
        shouldFreezeRotation: true,
        shouldPreserveAndRelease: false,
        shouldResetPinchDelta: false,
      };
    }

    if (snapshot.state === 'occluded_grace') {
      const elapsedLost = nowMs - (snapshot.lostSinceMs ?? nowMs);
      if (elapsedLost >= config.lossGracePeriodMs) {
        return {
          nextSnapshot: {
            ...snapshot,
            state: 'lost',
            freezeRotationActive: false,
            stabilizationFramesRemaining: config.recoveryStabilizationFrames,
          },
          shouldFreezeRotation: true,
          shouldPreserveAndRelease: true,
          shouldResetPinchDelta: true,
        };
      }
      return {
        nextSnapshot: { ...snapshot, freezeRotationActive: true },
        shouldFreezeRotation: true,
        shouldPreserveAndRelease: false,
        shouldResetPinchDelta: false,
      };
    }

    return {
      nextSnapshot: snapshot,
      shouldFreezeRotation: true,
      shouldPreserveAndRelease: false,
      shouldResetPinchDelta: false,
    };
  }

  // Frame is valid
  if (snapshot.state === 'occluded_grace' || snapshot.state === 'lost' || snapshot.state === 'untracked') {
    const framesNeeded =
      snapshot.state === 'untracked' ? 1 : config.recoveryStabilizationFrames;
    if (framesNeeded <= 1) {
      return {
        nextSnapshot: {
          ...snapshot,
          state: 'tracking',
          lostSinceMs: null,
          stabilizationFramesRemaining: 0,
          freezeRotationActive: false,
          recoveryCount: snapshot.state === 'untracked' ? snapshot.recoveryCount : snapshot.recoveryCount + 1,
        },
        shouldFreezeRotation: false,
        shouldPreserveAndRelease: false,
        shouldResetPinchDelta: true,
      };
    }
    return {
      nextSnapshot: {
        ...snapshot,
        state: 'recovering',
        lostSinceMs: null,
        stabilizationFramesRemaining: framesNeeded - 1,
        freezeRotationActive: true,
      },
      shouldFreezeRotation: true,
      shouldPreserveAndRelease: false,
      shouldResetPinchDelta: true,
    };
  }

  if (snapshot.state === 'recovering') {
    const remaining = snapshot.stabilizationFramesRemaining - 1;
    if (remaining <= 0) {
      return {
        nextSnapshot: {
          ...snapshot,
          state: 'tracking',
          stabilizationFramesRemaining: 0,
          freezeRotationActive: false,
          recoveryCount: snapshot.recoveryCount + 1,
        },
        shouldFreezeRotation: false,
        shouldPreserveAndRelease: false,
        shouldResetPinchDelta: true,
      };
    }
    return {
      nextSnapshot: {
        ...snapshot,
        stabilizationFramesRemaining: remaining,
        freezeRotationActive: true,
      },
      shouldFreezeRotation: true,
      shouldPreserveAndRelease: false,
      shouldResetPinchDelta: true,
    };
  }

  return {
    nextSnapshot: { ...snapshot, freezeRotationActive: false },
    shouldFreezeRotation: false,
    shouldPreserveAndRelease: false,
    shouldResetPinchDelta: false,
  };
}

/**
 * Computes lateral displacement along the horizontal camera right vector,
 * eliminating world-axis inversion when turning in seated/standing VR.
 */
export function computeViewRelativeLateralDelta(
  deltaPos: THREE.Vector3,
  cameraWorldDirection: THREE.Vector3,
  outRight: THREE.Vector3 = new THREE.Vector3()
): number {
  const fx = cameraWorldDirection.x;
  const fz = cameraWorldDirection.z;
  const lenSq = fx * fx + fz * fz;
  if (lenSq < 1e-6) {
    outRight.set(1, 0, 0);
  } else {
    const invLen = 1 / Math.sqrt(lenSq);
    outRight.set(-fz * invLen, 0, fx * invLen);
  }
  return deltaPos.x * outRight.x + deltaPos.z * outRight.z;
}

/**
 * Unified conflict-free state transition reconciling native WebXR `pinchstart`/`pinchend`
 * events with per-frame Euclidean finger-tip distance hysteresis (configurable or default).
 */
export function resolvePinchTransition(
  state: PinchStateMachineSnapshot,
  event:
    | { type: 'pinchstart' }
    | { type: 'pinchend' }
    | { type: 'distance_update'; pinchDistance: number },
  startThreshold = PINCH_START_THRESHOLD,
  endThreshold = PINCH_END_THRESHOLD
): {
  isPinching: boolean;
  nativePinchActive: boolean;
  action: 'start' | 'release' | 'none';
} {
  if (event.type === 'pinchstart') {
    if (!state.isPinching) {
      return { isPinching: true, nativePinchActive: true, action: 'start' };
    }
    return { isPinching: true, nativePinchActive: true, action: 'none' };
  }

  if (event.type === 'pinchend') {
    if (!state.isPinching) {
      return { isPinching: false, nativePinchActive: false, action: 'none' };
    }
    if (!state.hasValidPinchJoints || state.pinchDistance > endThreshold) {
      return { isPinching: false, nativePinchActive: false, action: 'release' };
    }
    // Keep engaged inside the hysteresis window until physical distance exceeds endThreshold
    return { isPinching: true, nativePinchActive: false, action: 'none' };
  }

  const dist = event.pinchDistance;
  if (!state.isPinching && dist < startThreshold) {
    return {
      isPinching: true,
      nativePinchActive: state.nativePinchActive,
      action: 'start',
    };
  }
  if (state.isPinching && dist > endThreshold) {
    return {
      isPinching: false,
      nativePinchActive: false,
      action: 'release',
    };
  }

  return {
    isPinching: state.isPinching,
    nativePinchActive: state.nativePinchActive,
    action: 'none',
  };
}

export interface HandManagerOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.Camera;
  cameraRig: THREE.Group;
  raycastTargets: THREE.Object3D[];
  consoleRaycastTarget: THREE.Object3D;
  uiRaycastTargets?: THREE.Object3D[];
  debouncer?: GlobalGestureDebouncer;
  recoveryConfig?: Partial<HandRecoveryConfig>;
  onSelectCrystal: (id: CrystalId) => void;
  onRotateCrystal: (id: CrystalId, deltaAngle: number) => void;
  onToggleBeamSource?: () => void;
  onUIHover?: (target: THREE.Object3D | null) => void;
  onUIPinch?: (
    target: THREE.Object3D,
    handName: 'left' | 'right',
    eventToken: string
  ) => boolean;
  onSnapTurn?: (deltaYawRadians: number) => void;
  onSmoothTurn?: (deltaYawRadians: number) => void;
  onFrameHandSamples?: (samples: {
    headPos: [number, number, number];
    left: { isTracking: boolean; wristPos: [number, number, number] | null; pinchDistanceMeters: number; isPinching: boolean };
    right: { isTracking: boolean; wristPos: [number, number, number] | null; pinchDistanceMeters: number; isPinching: boolean };
  }) => void;
  onStatusChange?: (status: HandTrackingStatus, activeCount: number) => void;
}

export interface HandTracker {
  update: (delta: number) => void;
  getTrackingStatus: () => HandTrackingStatus;
  getActiveHandsCount: () => number;
  getGrabbedCrystalId: () => CrystalId | null;
  releaseGrabbedCrystal: () => void;
  setHandInteractionEnabled: (enabled: boolean) => void;
  isHandInteractionEnabled: () => boolean;
  setInteractionTuning: (tuning: Partial<HandInteractionTuning>) => void;
  getInteractionTuning: () => HandInteractionTuning;
  getRecoveryStates: () => Record<'left' | 'right', HandRecoverySnapshot>;
  getWristAnchorSample: (camera: THREE.Camera) => WristAnchorSample;
  getDiagnosticsState: () => DiagnosticsSessionState;
  startDiagnosticsTest: () => void;
  stopDiagnosticsTest: () => void;
  resetDiagnosticsResults: () => void;
  setLightingChecklist: (checklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord>) => void;
  setTesterNotes: (notes: string) => void;
  dispose: () => void;
}

interface HandData {
  handSpace: THREE.XRHandSpace;
  controller: THREE.XRTargetRaySpace;
  handIndex: number;
  handName: 'left' | 'right';
  visualGroup: THREE.Group;
  jointSpheres: THREE.InstancedMesh;
  pinchIndicator: THREE.Mesh;
  pointingRay: THREE.Line;
  tetherLine: THREE.Line;
  isTracking: boolean;
  isPinching: boolean;
  nativePinchActive: boolean;
  hasValidPinchJoints: boolean;
  pinchDistance: number;
  pinchMidpoint: THREE.Vector3;
  lastPinchPos: THREE.Vector3;
  pinchAnchorPos: THREE.Vector3;
  hasTriggeredAirSwipeTurn: boolean;
  swipeTurnCooldownUntil: number;
  pinchConsumedByUI: boolean;
  smoothedDeltaX: number;
  pinchScale: number;
  grabbedCrystalId: CrystalId | null;
  grabbedObjectRef: THREE.Object3D | null;
  recovery: HandRecoverySnapshot;
  // Phase 10 Diagnostics Telemetry
  availableJointsCount: number;
  missingJoints: string[];
  invalidJoints: string[];
  interruptionCount: number;
  totalInterruptionDurationMs: number;
  lastInterruptionTimestamp: number | null;
  lastRecoveryTimestamp: number | null;
  lastSampleTimestamp: number;
  sampleIntervalMs: number;
  avgSampleIntervalMs: number;
  minSampleIntervalMs: number;
  maxSampleIntervalMs: number;
  sampleIntervalHistory: number[];
  wristPos: [number, number, number] | null;
  indexTipPos: [number, number, number] | null;
  thumbTipPos: [number, number, number] | null;
}

const JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal', 'thumb-phalanx-proximal', 'thumb-phalanx-distal', 'thumb-tip',
  'index-finger-metacarpal', 'index-finger-phalanx-proximal', 'index-finger-phalanx-intermediate', 'index-finger-phalanx-distal', 'index-finger-tip',
  'middle-finger-metacarpal', 'middle-finger-phalanx-proximal', 'middle-finger-phalanx-intermediate', 'middle-finger-phalanx-distal', 'middle-finger-tip',
  'ring-finger-metacarpal', 'ring-finger-phalanx-proximal', 'ring-finger-phalanx-intermediate', 'ring-finger-phalanx-distal', 'ring-finger-tip',
  'pinky-finger-metacarpal', 'pinky-finger-phalanx-proximal', 'pinky-finger-phalanx-intermediate', 'pinky-finger-phalanx-distal', 'pinky-finger-tip',
];

export function createHandTracker(options: HandManagerOptions): HandTracker {
  const {
    renderer,
    scene,
    camera,
    cameraRig,
    raycastTargets,
    consoleRaycastTarget,
    uiRaycastTargets = [],
    debouncer = new GlobalGestureDebouncer(),
    recoveryConfig: recoveryOverrides,
    onSelectCrystal,
    onRotateCrystal,
    onToggleBeamSource,
    onUIHover,
    onUIPinch,
    onSnapTurn,
    onSmoothTurn,
    onFrameHandSamples,
    onStatusChange,
  } = options;

  const recoveryConfig: HandRecoveryConfig = {
    ...DEFAULT_RECOVERY_CONFIG,
    ...recoveryOverrides,
  };

  let tuning: HandInteractionTuning = {
    pinchStartThreshold: PINCH_START_THRESHOLD,
    pinchEndThreshold: PINCH_END_THRESHOLD,
    directReachRadiusMeters: 1.4,
    rotationSensitivity: 4.0,
    airSwipeThresholdMeters: AIR_SWIPE_SNAP_TURN_THRESHOLD,
    wristMenuHand: 'left',
    turnMode: 'snap',
    smoothTurnRateRadPerSec: 1.65,
  };

  let handInteractionEnabled = true;
  let currentStatus: HandTrackingStatus = 'unavailable';
  let activeHandsCount = 0;

  // Shared procedural materials
  const jointGeo = new THREE.SphereGeometry(0.007, 8, 8);
  const jointMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.7,
    wireframe: false,
  });

  const pinchRingGeo = new THREE.TorusGeometry(0.018, 0.003, 8, 20);
  const pinchRingMat = new THREE.MeshBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.9,
  });

  const pointingRayGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(0, 0, -6.5),
  ]);
  const pointingRayMat = new THREE.LineBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.45,
  });

  // Holographic energetic tether connecting pinch point to grabbed crystal
  const tetherGeo = new THREE.BufferGeometry();
  tetherGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(_linePosAttr), 3));
  const tetherMat = new THREE.LineBasicMaterial({
    color: 0x34d399,
    transparent: true,
    opacity: 0.75,
    blending: THREE.AdditiveBlending,
  });

  const hands: HandData[] = [];

  for (let i = 0; i < 2; i++) {
    const handSpace = renderer.xr.getHand(i);
    const controller = renderer.xr.getController(i);
    const handName: 'left' | 'right' = i === 0 ? 'left' : 'right';

    // Visual indicators container
    const visualGroup = new THREE.Group();
    visualGroup.name = `hand_visuals_${handName}`;
    visualGroup.visible = false;
    scene.add(visualGroup);

    // Subtle 25 joint spheres mesh
    const jointSpheres = new THREE.InstancedMesh(jointGeo, jointMat, 25);
    jointSpheres.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    visualGroup.add(jointSpheres);

    // Glowing pinch reticle
    const pinchIndicator = new THREE.Mesh(pinchRingGeo, pinchRingMat.clone());
    pinchIndicator.visible = false;
    visualGroup.add(pinchIndicator);

    // Subtle forward pointing ray
    const pointingRay = new THREE.Line(pointingRayGeo, pointingRayMat);
    pointingRay.visible = false;
    visualGroup.add(pointingRay);

    // Energetic tether
    const tetherLine = new THREE.Line(tetherGeo.clone(), tetherMat.clone());
    tetherLine.visible = false;
    visualGroup.add(tetherLine);

    const handData: HandData = {
      handSpace,
      controller,
      handIndex: i,
      handName,
      visualGroup,
      jointSpheres,
      pinchIndicator,
      pointingRay,
      tetherLine,
      isTracking: false,
      isPinching: false,
      nativePinchActive: false,
      hasValidPinchJoints: false,
      pinchDistance: 1.0,
      pinchMidpoint: new THREE.Vector3(),
      lastPinchPos: new THREE.Vector3(),
      pinchAnchorPos: new THREE.Vector3(),
      hasTriggeredAirSwipeTurn: false,
      swipeTurnCooldownUntil: 0,
      pinchConsumedByUI: false,
      smoothedDeltaX: 0,
      pinchScale: 1.0,
      grabbedCrystalId: null,
      grabbedObjectRef: null,
      recovery: {
        hand: handName,
        state: 'untracked',
        lostSinceMs: null,
        stabilizationFramesRemaining: 0,
        freezeRotationActive: false,
        preservedCrystalId: null,
        preservedRotationY: null,
        lastValidWristPos: null,
        recoveryCount: 0,
      },
      // Phase 10 Diagnostics Telemetry
      availableJointsCount: 0,
      missingJoints: [...JOINT_NAMES],
      invalidJoints: [],
      interruptionCount: 0,
      totalInterruptionDurationMs: 0,
      lastInterruptionTimestamp: null,
      lastRecoveryTimestamp: null,
      lastSampleTimestamp: 0,
      sampleIntervalMs: 0,
      avgSampleIntervalMs: 0,
      minSampleIntervalMs: 999,
      maxSampleIntervalMs: 0,
      sampleIntervalHistory: [],
      wristPos: null,
      indexTipPos: null,
      thumbTipPos: null,
    };

    // Listen to WebXR Hand events
    handSpace.addEventListener('connected', (event: any) => {
      const inputSource = event.data;
      if (inputSource && inputSource.hand) {
        handData.isTracking = true;
        handData.recovery.state = 'tracking';
        updateOverallStatus();
      }
    });

    handSpace.addEventListener('disconnected', () => {
      safeReleaseHand(handData);
      handData.isTracking = false;
      handData.hasValidPinchJoints = false;
      handData.recovery.state = 'lost';
      handData.visualGroup.visible = false;
      updateOverallStatus();
    });

    // Native WebXR pinch event listeners synchronized with calibrated hysteresis & global debouncer
    handSpace.addEventListener('pinchstart', () => {
      if (!handInteractionEnabled || handData.recovery.freezeRotationActive) return;
      const next = resolvePinchTransition(
        handData,
        { type: 'pinchstart' },
        tuning.pinchStartThreshold,
        tuning.pinchEndThreshold
      );
      handData.isPinching = next.isPinching;
      handData.nativePinchActive = next.nativePinchActive;
      if (next.action === 'start') {
        handlePinchStart(handData, 'pinchstart');
      }
    });

    handSpace.addEventListener('pinchend', () => {
      const next = resolvePinchTransition(
        handData,
        { type: 'pinchend' },
        tuning.pinchStartThreshold,
        tuning.pinchEndThreshold
      );
      handData.nativePinchActive = next.nativePinchActive;
      if (next.action === 'release') {
        safeReleaseHand(handData);
      }
    });

    cameraRig.add(handSpace);
    hands.push(handData);
  }

  // Safe haptic feedback pulse when supported
  function triggerHaptic(hand: HandData, intensity = 0.3, durationMs = 20) {
    try {
      const source = (hand.handSpace as any)?.inputSource || (hand.controller as any)?.inputSource;
      const gamepad = source?.gamepad || (hand.controller as any)?.gamepad;
      if (gamepad?.hapticActuators && gamepad.hapticActuators[0]) {
        gamepad.hapticActuators[0].pulse(intensity, durationMs);
      }
    } catch {
      // Non-fatal if device doesn't support haptic actuators
    }
  }

  function safeReleaseHand(hand: HandData) {
    if (hand.grabbedCrystalId) {
      triggerHaptic(hand, 0.2, 15);
      hand.grabbedCrystalId = null;
      hand.grabbedObjectRef = null;
      debouncer.releaseChannel(hand.handName, 'crystal_select');
    }
    hand.isPinching = false;
    hand.nativePinchActive = false;
    hand.pinchConsumedByUI = false;
    hand.hasTriggeredAirSwipeTurn = false;
    hand.pinchScale = 1.0;
    hand.smoothedDeltaX = 0;
    hand.pinchIndicator.visible = false;
    hand.pointingRay.visible = false;
    hand.tetherLine.visible = false;
    debouncer.releaseChannel(hand.handName, 'ui_pinch');
  }

  function updateOverallStatus() {
    const trackingCount = hands.filter((h) => h.isTracking).length;
    activeHandsCount = trackingCount;

    let newStatus: HandTrackingStatus = 'unavailable';
    if (renderer.xr.isPresenting) {
      if (trackingCount > 0) {
        newStatus = 'active';
      } else {
        newStatus = 'lost';
      }
    } else {
      newStatus = 'supported';
    }

    if (newStatus !== currentStatus) {
      currentStatus = newStatus;
      onStatusChange?.(currentStatus, activeHandsCount);
    }
  }

  function handlePinchStart(hand: HandData, sourceTrigger: 'pinchstart' | 'distance_update' = 'distance_update') {
    if (!hand.isTracking || !handInteractionEnabled || hand.recovery.freezeRotationActive) return;

    const indexTip = (hand.handSpace as any).joints?.['index-finger-tip'];
    const thumbTip = (hand.handSpace as any).joints?.['thumb-tip'];
    const indexDistal = (hand.handSpace as any).joints?.['index-finger-phalanx-distal'];
    const wrist = (hand.handSpace as any).joints?.['wrist'];

    if (!indexTip || !thumbTip) return;

    _vecA.setFromMatrixPosition(indexTip.matrixWorld);
    _vecB.setFromMatrixPosition(thumbTip.matrixWorld);
    _pinchMid.copy(_vecA).add(_vecB).multiplyScalar(0.5);

    hand.pinchMidpoint.copy(_pinchMid);
    hand.lastPinchPos.copy(_pinchMid);
    hand.pinchAnchorPos.copy(_pinchMid);
    hand.hasTriggeredAirSwipeTurn = false;
    hand.pinchConsumedByUI = false;

    const nowMs = performance.now();
    const frameBucket = Math.floor(nowMs / 40);
    const eventToken = `pinch:${hand.handName}:${frameBucket}`;

    // Compute forward pointing direction from indexDistal/wrist through indexTip
    if (indexDistal && indexDistal.matrixWorld && indexDistal.matrixWorld.elements[0] !== 0) {
      _vecC.setFromMatrixPosition(indexDistal.matrixWorld);
      _rayDir.copy(_vecA).sub(_vecC).normalize();
    } else if (wrist) {
      _vecC.setFromMatrixPosition(wrist.matrixWorld);
      _rayDir.copy(_vecA).sub(_vecC).normalize();
    } else {
      _rayDir.set(0, 0, -1).applyQuaternion(hand.handSpace.quaternion);
    }

    _raycaster.set(_pinchMid, _rayDir);

    // 1. Highest priority: Interactive 3D Wrist Menu & Chamber Phase / Calibration UI Panels
    if (uiRaycastTargets.length > 0 && onUIPinch) {
      const uiHits = _raycaster.intersectObjects(uiRaycastTargets, true);
      if (uiHits.length > 0 && uiHits[0].distance < 12.0) {
        let hitObj: THREE.Object3D | null = uiHits[0].object;
        while (hitObj && !hitObj.userData?.isVRUIButton) {
          hitObj = hitObj.parent;
        }
        if (hitObj?.userData?.isVRUIButton && !hitObj.userData.disabled) {
          const consumed = onUIPinch(hitObj, hand.handName, `${eventToken}:ui:${sourceTrigger}`);
          if (consumed) {
            hand.pinchConsumedByUI = true;
            hand.pinchScale = 1.35;
            triggerHaptic(hand, 0.45, 25);
            return;
          }
        }
      }
    }

    // 2. Check Console Light Source (globally debounced)
    const consoleHits = _raycaster.intersectObject(consoleRaycastTarget, true);
    if (consoleHits.length > 0 && consoleHits[0].distance < 12.0) {
      const beamCheck = debouncer.tryExecute({
        category: 'beam_toggle',
        targetId: 'console-emitter',
        hand: hand.handName,
        nowMs,
        eventToken: `${eventToken}:beam`,
      });
      if (beamCheck.allowed) {
        hand.pinchConsumedByUI = true;
        triggerHaptic(hand, 0.5, 30);
        onToggleBeamSource?.();
      }
      return;
    }

    // 3. Check Crystals via Calibrated Direct Reach (< directReachRadiusMeters) or Expanded Raycast (< 14.0m)
    let closestCrystalId: CrystalId | null = null;
    let closestObj: THREE.Object3D | null = null;
    let minDistance = 999;

    for (const target of raycastTargets) {
      target.getWorldPosition(_crystalPos);
      const dist = _pinchMid.distanceTo(_crystalPos);
      if (dist < tuning.directReachRadiusMeters && dist < minDistance) {
        minDistance = dist;
        closestCrystalId = target.userData.crystalId as CrystalId;
        closestObj = target;
      }
    }

    if (!closestCrystalId) {
      const crystalHits = _raycaster.intersectObjects(raycastTargets, true);
      if (crystalHits.length > 0 && crystalHits[0].distance < 14.0) {
        let obj: THREE.Object3D | null = crystalHits[0].object;
        while (obj && !obj.userData?.crystalId) {
          obj = obj.parent;
        }
        if (obj?.userData?.crystalId) {
          closestCrystalId = obj.userData.crystalId as CrystalId;
          closestObj = obj;
        }
      }
    }

    if (closestCrystalId && closestObj) {
      const selCheck = debouncer.tryExecute({
        category: 'crystal_select',
        targetId: closestCrystalId,
        hand: hand.handName,
        nowMs,
        eventToken: `${eventToken}:crystal:${closestCrystalId}`,
      });
      if (!selCheck.allowed) return;

      hand.grabbedCrystalId = closestCrystalId;
      hand.grabbedObjectRef = closestObj;
      hand.recovery.preservedCrystalId = closestCrystalId;
      hand.lastPinchPos.copy(_pinchMid);
      hand.smoothedDeltaX = 0;
      hand.pinchScale = 1.4; // Initial lock expand pulse
      triggerHaptic(hand, 0.4, 25);
      onSelectCrystal(closestCrystalId);
    }
  }

  // Phase 10 Diagnostics Session State
  let isTestActive = false;
  let testStartTime: number | null = null;
  let testDurationMs = 0;
  let lastFrameTime = performance.now();
  let frameDeltaMs = 16.6;
  let avgFrameDeltaMs = 16.6;
  let minFrameDeltaMs = 999;
  let maxFrameDeltaMs = 0;
  const rollingFrameDeltas: number[] = [];

  let lightingChecklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord> = {
    bright: { condition: 'bright', tested: false, rating: 'untested', notes: '' },
    dim: { condition: 'dim', tested: false, rating: 'untested', notes: '' },
    uneven: { condition: 'uneven', tested: false, rating: 'untested', notes: '' },
  };
  let testerNotes = '';

  function handlePinchEnd(hand: HandData) {
    safeReleaseHand(hand);
  }

  // Per-frame joint calculation, pinch gesture measurement & natural rotation
  function update(delta: number) {
    const now = performance.now();

    // 1. Measure frame timing (JavaScript WebGL render loop delta)
    if (lastFrameTime > 0) {
      const currentDelta = now - lastFrameTime;
      if (currentDelta > 1 && currentDelta < 500) {
        frameDeltaMs = currentDelta;
        if (currentDelta < minFrameDeltaMs) minFrameDeltaMs = currentDelta;
        if (currentDelta > maxFrameDeltaMs) maxFrameDeltaMs = currentDelta;
        rollingFrameDeltas.push(currentDelta);
        if (rollingFrameDeltas.length > 60) rollingFrameDeltas.shift();
        const sum = rollingFrameDeltas.reduce((a, b) => a + b, 0);
        avgFrameDeltaMs = sum / rollingFrameDeltas.length;
      }
    }
    lastFrameTime = now;

    if (isTestActive && testStartTime !== null) {
      testDurationMs = now - testStartTime;
    }

    if (!renderer.xr.isPresenting) {
      for (const h of hands) {
        if (h.isTracking) {
          if (isTestActive) {
            h.interruptionCount++;
            h.lastInterruptionTimestamp = now;
          }
          h.isTracking = false;
        }
        h.hasValidPinchJoints = false;
        h.availableJointsCount = 0;
        h.missingJoints = [...JOINT_NAMES];
        h.invalidJoints = [];
        h.wristPos = null;
        h.indexTipPos = null;
        h.thumbTipPos = null;
        if (h.visualGroup.visible) h.visualGroup.visible = false;
        if (h.isPinching || h.grabbedCrystalId) safeReleaseHand(h);
      }
      return;
    }

    // Read current HMD camera forward once per frame for view-relative controls
    camera.getWorldDirection(_camForward);

    let currentlyActiveHands = 0;
    let activeUIHoverTarget: THREE.Object3D | null = null;

    for (const hand of hands) {
      const xrJoints = (hand.handSpace as any).joints;

      // Joint Validation: Check all 25 standard WebXR joints
      const missing: string[] = [];
      const invalid: string[] = [];
      let validJointCount = 0;

      if (!xrJoints) {
        missing.push(...JOINT_NAMES);
      } else {
        for (const name of JOINT_NAMES) {
          const jointObj = xrJoints[name];
          if (!jointObj) {
            missing.push(name);
          } else if (
            !jointObj.matrixWorld ||
            jointObj.matrixWorld.elements[0] === 0 ||
            isNaN(jointObj.matrixWorld.elements[0])
          ) {
            invalid.push(name);
          } else {
            validJointCount++;
          }
        }
      }

      hand.availableJointsCount = validJointCount;
      hand.missingJoints = missing;
      hand.invalidJoints = invalid;

      const wrist = xrJoints ? xrJoints['wrist'] : null;
      const indexTip = xrJoints ? xrJoints['index-finger-tip'] : null;
      const indexDistal = xrJoints ? xrJoints['index-finger-phalanx-distal'] : null;
      const thumbTip = xrJoints ? xrJoints['thumb-tip'] : null;

      // Extract real world coordinates if available
      if (wrist && wrist.matrixWorld && wrist.matrixWorld.elements[0] !== 0) {
        hand.wristPos = [
          Math.round(wrist.matrixWorld.elements[12] * 1000) / 1000,
          Math.round(wrist.matrixWorld.elements[13] * 1000) / 1000,
          Math.round(wrist.matrixWorld.elements[14] * 1000) / 1000,
        ];
      } else {
        hand.wristPos = null;
      }

      if (indexTip && indexTip.matrixWorld && indexTip.matrixWorld.elements[0] !== 0) {
        hand.indexTipPos = [
          Math.round(indexTip.matrixWorld.elements[12] * 1000) / 1000,
          Math.round(indexTip.matrixWorld.elements[13] * 1000) / 1000,
          Math.round(indexTip.matrixWorld.elements[14] * 1000) / 1000,
        ];
      } else {
        hand.indexTipPos = null;
      }

      if (thumbTip && thumbTip.matrixWorld && thumbTip.matrixWorld.elements[0] !== 0) {
        hand.thumbTipPos = [
          Math.round(thumbTip.matrixWorld.elements[12] * 1000) / 1000,
          Math.round(thumbTip.matrixWorld.elements[13] * 1000) / 1000,
          Math.round(thumbTip.matrixWorld.elements[14] * 1000) / 1000,
        ];
      } else {
        hand.thumbTipPos = null;
      }

      // Independent per-hand coordinate validation + lost tracking recovery state machine
      const allowReanchorJump = hand.recovery.state !== 'tracking';
      const coordCheck = validateHandCoordinates(
        hand.wristPos,
        hand.indexTipPos,
        hand.thumbTipPos,
        hand.recovery.lastValidWristPos,
        delta * 1000,
        recoveryConfig,
        allowReanchorJump
      );

      const hasCoreJoints = Boolean(
        wrist &&
          indexTip &&
          thumbTip &&
          wrist.matrixWorld.elements[0] !== 0 &&
          !isNaN(wrist.matrixWorld.elements[0]) &&
          coordCheck.valid
      );

      const recoveryStep = evaluateHandRecoveryTransition(
        hand.recovery,
        hasCoreJoints,
        now,
        recoveryConfig
      );
      hand.recovery = recoveryStep.nextSnapshot;

      if (!hasCoreJoints) {
        hand.hasValidPinchJoints = false;
        hand.smoothedDeltaX = 0;

        if (recoveryStep.shouldPreserveAndRelease) {
          if (hand.isTracking) {
            hand.interruptionCount++;
            hand.lastInterruptionTimestamp = now;
            hand.isTracking = false;
          }
          hand.visualGroup.visible = false;
          if (hand.isPinching || hand.grabbedCrystalId) {
            safeReleaseHand(hand);
          }
        } else {
          // Micro-occlusion grace window: freeze active crystal rotation in place & hide noisy tether
          hand.tetherLine.visible = false;
        }
        continue;
      }

      if (hand.wristPos) {
        hand.recovery.lastValidWristPos = hand.wristPos;
      }

      // Tracking resumed or currently active
      if (!hand.isTracking) {
        if (hand.lastInterruptionTimestamp !== null) {
          hand.totalInterruptionDurationMs += now - hand.lastInterruptionTimestamp;
        }
        hand.lastRecoveryTimestamp = now;
        hand.isTracking = true;
        hand.smoothedDeltaX = 0;
      }

      // Measure hand-joint update interval
      if (hand.lastSampleTimestamp > 0) {
        const sampleDelta = now - hand.lastSampleTimestamp;
        if (sampleDelta > 1 && sampleDelta < 500) {
          hand.sampleIntervalMs = sampleDelta;
          if (sampleDelta < hand.minSampleIntervalMs) hand.minSampleIntervalMs = sampleDelta;
          if (sampleDelta > hand.maxSampleIntervalMs) hand.maxSampleIntervalMs = sampleDelta;
          hand.sampleIntervalHistory.push(sampleDelta);
          if (hand.sampleIntervalHistory.length > 30) hand.sampleIntervalHistory.shift();
          const sum = hand.sampleIntervalHistory.reduce((a, b) => a + b, 0);
          hand.avgSampleIntervalMs = sum / hand.sampleIntervalHistory.length;
        }
      }
      hand.lastSampleTimestamp = now;

      currentlyActiveHands++;
      hand.visualGroup.visible = true;

      // 1. Update 25 joint spheres visual positions (only render genuine valid joints)
      let jointIndex = 0;
      for (const name of JOINT_NAMES) {
        const jointObj = xrJoints[name];
        if (
          jointObj &&
          jointObj.matrixWorld &&
          jointObj.matrixWorld.elements[0] !== 0 &&
          !isNaN(jointObj.matrixWorld.elements[0])
        ) {
          _dummyMatrix.copy(jointObj.matrixWorld);
          const isFingertip = name.endsWith('-tip');
          _dummyMatrix.scale(
            _vecA.set(isFingertip ? 1.25 : 0.85, isFingertip ? 1.25 : 0.85, isFingertip ? 1.25 : 0.85)
          );
          hand.jointSpheres.setMatrixAt(jointIndex, _dummyMatrix);
        } else {
          hand.jointSpheres.setMatrixAt(jointIndex, _zeroMatrix);
        }
        jointIndex++;
      }
      hand.jointSpheres.instanceMatrix.needsUpdate = true;

      // 2. Measure Euclidean Pinch Distance between Index Tip & Thumb Tip
      _vecA.setFromMatrixPosition(indexTip.matrixWorld);
      _vecB.setFromMatrixPosition(thumbTip.matrixWorld);
      const pinchDist = _vecA.distanceTo(_vecB);
      hand.pinchDistance = pinchDist;
      hand.hasValidPinchJoints = true;
      hand.pinchMidpoint.copy(_vecA).add(_vecB).multiplyScalar(0.5);

      if (recoveryStep.shouldResetPinchDelta) {
        // Sync baseline pinch positions immediately on recovery stabilization to guarantee zero jump
        hand.lastPinchPos.copy(hand.pinchMidpoint);
        hand.pinchAnchorPos.copy(hand.pinchMidpoint);
        hand.smoothedDeltaX = 0;
      }

      // Unified conflict-free pinch state machine with calibrated hysteresis
      const nextPinchState = resolvePinchTransition(
        hand,
        {
          type: 'distance_update',
          pinchDistance: pinchDist,
        },
        tuning.pinchStartThreshold,
        tuning.pinchEndThreshold
      );
      hand.isPinching = nextPinchState.isPinching;
      hand.nativePinchActive = nextPinchState.nativePinchActive;
      if (nextPinchState.action === 'start' && !recoveryStep.shouldFreezeRotation) {
        handlePinchStart(hand, 'distance_update');
      } else if (nextPinchState.action === 'release') {
        safeReleaseHand(hand);
      }

      // 3. Update Visual Pinch Indicator & Animated Ring
      if (hand.isPinching) {
        hand.pinchIndicator.visible = true;
        hand.pinchIndicator.position.copy(hand.pinchMidpoint);
        hand.pinchIndicator.rotation.y += delta * 4.5;
        hand.pinchScale = THREE.MathUtils.damp(hand.pinchScale, 1.0, 10, delta);
        hand.pinchIndicator.scale.setScalar(hand.pinchScale);

        const ringMat = hand.pinchIndicator.material as THREE.MeshBasicMaterial;
        if (hand.grabbedCrystalId) {
          ringMat.color.setHex(0x10b981); // Locked emerald
          ringMat.opacity = 0.95;
        } else if (hand.pinchConsumedByUI) {
          ringMat.color.setHex(0x38bdf8); // UI cyan click
          ringMat.opacity = 0.95;
        } else {
          ringMat.color.setHex(0xf59e0b); // Empty-space / turn gesture amber
          ringMat.opacity = 0.72;
        }
        hand.pointingRay.visible = false;

        // 4. Update Holographic Tether Line to Grabbed Crystal
        if (hand.grabbedCrystalId && hand.grabbedObjectRef) {
          hand.grabbedObjectRef.getWorldPosition(_crystalPos);
          hand.tetherLine.visible = true;
          const posAttr = hand.tetherLine.geometry.attributes.position as THREE.BufferAttribute;
          posAttr.setXYZ(0, hand.pinchMidpoint.x, hand.pinchMidpoint.y, hand.pinchMidpoint.z);
          posAttr.setXYZ(1, _crystalPos.x, _crystalPos.y, _crystalPos.z);
          posAttr.needsUpdate = true;
        } else {
          hand.tetherLine.visible = false;
        }
      } else {
        hand.pinchIndicator.visible = false;
        hand.tetherLine.visible = false;

        // 5. Update Subtle Pointing Ray from Index Finger
        if (indexDistal && indexDistal.matrixWorld && indexDistal.matrixWorld.elements[0] !== 0) {
          _vecC.setFromMatrixPosition(indexDistal.matrixWorld);
          _rayDir.copy(_vecA).sub(_vecC).normalize();
        } else {
          _vecC.setFromMatrixPosition(wrist.matrixWorld);
          _rayDir.copy(_vecA).sub(_vecC).normalize();
        }

        hand.pointingRay.visible = true;
        hand.pointingRay.position.copy(_vecA);
        hand.pointingRay.quaternion.setFromUnitVectors(_forwardNegZ, _rayDir);

        // Hover raycast against 3D Wrist & Chamber UI panels
        if (uiRaycastTargets.length > 0 && !activeUIHoverTarget) {
          _raycaster.set(_vecA, _rayDir);
          const uiHoverHits = _raycaster.intersectObjects(uiRaycastTargets, true);
          if (uiHoverHits.length > 0 && uiHoverHits[0].distance < 12.0) {
            let obj: THREE.Object3D | null = uiHoverHits[0].object;
            while (obj && !obj.userData?.isVRUIButton) obj = obj.parent;
            if (obj?.userData?.isVRUIButton && !obj.userData.disabled) {
              activeUIHoverTarget = obj;
            }
          }
        }
      }

      // 6. Camera-Relative Jitter-Filtered Rotation of Grabbed Crystal (frozen when recovering)
      if (
        hand.isPinching &&
        hand.grabbedCrystalId &&
        handInteractionEnabled &&
        !recoveryStep.shouldFreezeRotation
      ) {
        _deltaVec.copy(hand.pinchMidpoint).sub(hand.lastPinchPos);
        const rawDeltaX = computeViewRelativeLateralDelta(_deltaVec, _camForward, _camRight);

        // Low-pass exponential smoothing filter to eliminate optical tracking noise
        hand.smoothedDeltaX = hand.smoothedDeltaX * 0.35 + rawDeltaX * 0.65;

        // Dead-zone check against microscopic arm sway
        if (Math.abs(hand.smoothedDeltaX) > 0.0012) {
          const rotationAngleDelta = hand.smoothedDeltaX * tuning.rotationSensitivity;
          onRotateCrystal(hand.grabbedCrystalId, rotationAngleDelta);
        }
        hand.lastPinchPos.copy(hand.pinchMidpoint);
      } else if (
        hand.isPinching &&
        !hand.grabbedCrystalId &&
        !hand.pinchConsumedByUI &&
        handInteractionEnabled &&
        !recoveryStep.shouldFreezeRotation
      ) {
        // 7. Seated & Standing Turn Gestures (Snap-Turn swipe OR continuous Smooth-Turn)
        _deltaVec.copy(hand.pinchMidpoint).sub(hand.pinchAnchorPos);
        const swipeLateral = computeViewRelativeLateralDelta(_deltaVec, _camForward, _camRight);

        if (tuning.turnMode === 'smooth') {
          if (Math.abs(swipeLateral) > 0.04 && onSmoothTurn) {
            const normalized = Math.max(-1, Math.min(1, (swipeLateral - Math.sign(swipeLateral) * 0.04) / 0.14));
            const deltaYaw = -normalized * tuning.smoothTurnRateRadPerSec * delta;
            onSmoothTurn(deltaYaw);
          }
        } else if (
          !hand.hasTriggeredAirSwipeTurn &&
          onSnapTurn &&
          Math.abs(swipeLateral) > tuning.airSwipeThresholdMeters
        ) {
          const snapCheck = debouncer.tryExecute({
            category: 'snap_turn',
            targetId: swipeLateral > 0 ? 'air_swipe_right' : 'air_swipe_left',
            hand: hand.handName,
            nowMs: now,
          });
          if (snapCheck.allowed) {
            const deltaYaw = swipeLateral > 0 ? -SNAP_TURN_ANGLE_RAD : SNAP_TURN_ANGLE_RAD;
            onSnapTurn(deltaYaw);
            hand.hasTriggeredAirSwipeTurn = true;
            hand.pinchAnchorPos.copy(hand.pinchMidpoint);
            triggerHaptic(hand, 0.35, 25);
          }
        }
      }
    }

    onUIHover?.(activeUIHoverTarget);

    if (onFrameHandSamples) {
      camera.getWorldPosition(_camPos);
      onFrameHandSamples({
        headPos: [_camPos.x, _camPos.y, _camPos.z],
        left: {
          isTracking: hands[0].isTracking,
          wristPos: hands[0].wristPos,
          pinchDistanceMeters: hands[0].pinchDistance,
          isPinching: hands[0].isPinching,
        },
        right: {
          isTracking: hands[1].isTracking,
          wristPos: hands[1].wristPos,
          pinchDistanceMeters: hands[1].pinchDistance,
          isPinching: hands[1].isPinching,
        },
      });
    }

    if (currentlyActiveHands !== activeHandsCount) {
      activeHandsCount = currentlyActiveHands;
      updateOverallStatus();
    }
  }

  function getWristAnchorSample(targetCamera: THREE.Camera): WristAnchorSample {
    // Support left-handed and right-handed users: prefer calibrated non-dominant wristMenuHand
    const preferredIdx = tuning.wristMenuHand === 'right' ? 1 : 0;
    const secondaryIdx = preferredIdx === 1 ? 0 : 1;
    const menuHand = hands[preferredIdx].isTracking
      ? hands[preferredIdx]
      : hands[secondaryIdx].isTracking
      ? hands[secondaryIdx]
      : null;
    const otherHand = menuHand === hands[0] ? hands[1] : hands[0];

    const emptySample: WristAnchorSample = {
      visible: false,
      wristWorldPos: _wristPosOut.set(0, 0, 0),
      palmUpScore: 0,
      oppositeIndexTipPos: null,
      handSide: menuHand?.handName,
    };

    if (!menuHand) return emptySample;

    const joints = (menuHand.handSpace as any).joints;
    const wrist = joints?.['wrist'];
    if (!wrist || !wrist.matrixWorld || wrist.matrixWorld.elements[0] === 0) {
      return emptySample;
    }

    _wristPosOut.setFromMatrixPosition(wrist.matrixWorld);
    targetCamera.getWorldPosition(_camPos);
    _toHead.subVectors(_camPos, _wristPosOut).normalize();

    let palmUpScore = 0;
    const indexMeta = joints?.['index-finger-metacarpal'];
    const pinkyMeta = joints?.['pinky-finger-metacarpal'];

    if (
      indexMeta?.matrixWorld?.elements[0] &&
      pinkyMeta?.matrixWorld?.elements[0]
    ) {
      _vecB.setFromMatrixPosition(indexMeta.matrixWorld);
      _vecC.setFromMatrixPosition(pinkyMeta.matrixWorld);
      _palmV1.subVectors(_vecB, _wristPosOut);
      _palmV2.subVectors(_vecC, _wristPosOut);
      if (menuHand.handName === 'left') {
        _palmNormal.crossVectors(_palmV1, _palmV2);
      } else {
        _palmNormal.crossVectors(_palmV2, _palmV1);
      }
      if (_palmNormal.lengthSq() > 1e-8) {
        _palmNormal.normalize();
        palmUpScore = _palmNormal.dot(_toHead);
      }
    }

    let oppositeIndexTipPos: THREE.Vector3 | null = null;
    if (otherHand?.isTracking) {
      const oppTip = (otherHand.handSpace as any).joints?.['index-finger-tip'];
      if (oppTip?.matrixWorld?.elements[0]) {
        oppositeIndexTipPos = _oppTipPosOut.setFromMatrixPosition(oppTip.matrixWorld);
      }
    }

    return {
      visible: true,
      wristWorldPos: _wristPosOut,
      palmUpScore,
      oppositeIndexTipPos,
      handSide: menuHand.handName,
    };
  }

  function getHandDiagnostics(hand: HandData): HandJointDiagnostics {
    const trackingState =
      hand.availableJointsCount === 0
        ? 'untracked'
        : hand.availableJointsCount < 25
        ? 'partial'
        : 'full';

    return {
      hand: hand.handName,
      isTracking: hand.isTracking,
      trackingState,
      availableJointsCount: hand.availableJointsCount,
      totalJointsExpected: 25,
      missingJoints: [...hand.missingJoints],
      invalidJoints: [...hand.invalidJoints],
      wristPosition: hand.wristPos,
      indexTipPosition: hand.indexTipPos,
      thumbTipPosition: hand.thumbTipPos,
      pinchDistanceMeters: hand.isTracking ? Math.round(hand.pinchDistance * 1000) / 1000 : null,
      isPinching: hand.isPinching,
      heldCrystalId: hand.grabbedCrystalId,
      interruptionCount: hand.interruptionCount,
      totalInterruptionDurationMs: Math.round(hand.totalInterruptionDurationMs),
      lastInterruptionTimestamp: hand.lastInterruptionTimestamp,
      lastRecoveryTimestamp: hand.lastRecoveryTimestamp,
      sampleIntervalMs: Math.round(hand.sampleIntervalMs * 10) / 10,
      avgSampleIntervalMs: Math.round(hand.avgSampleIntervalMs * 10) / 10,
      minSampleIntervalMs: hand.minSampleIntervalMs === 999 ? 0 : Math.round(hand.minSampleIntervalMs * 10) / 10,
      maxSampleIntervalMs: Math.round(hand.maxSampleIntervalMs * 10) / 10,
      rollingIntervals: [...hand.sampleIntervalHistory],
    };
  }

  function getDiagnosticsState(): DiagnosticsSessionState {
    const fps = frameDeltaMs > 0 ? Math.round(1000 / frameDeltaMs) : 60;
    return {
      isActive: isTestActive,
      startTime: testStartTime,
      durationMs: isTestActive && testStartTime !== null ? performance.now() - testStartTime : testDurationMs,
      frameDeltaMs: Math.round(frameDeltaMs * 10) / 10,
      avgFrameDeltaMs: Math.round(avgFrameDeltaMs * 10) / 10,
      minFrameDeltaMs: minFrameDeltaMs === 999 ? 0 : Math.round(minFrameDeltaMs * 10) / 10,
      maxFrameDeltaMs: Math.round(maxFrameDeltaMs * 10) / 10,
      fps,
      leftHand: getHandDiagnostics(hands[0]),
      rightHand: getHandDiagnostics(hands[1]),
      lightingChecklist: { ...lightingChecklist },
      testerNotes,
    };
  }

  function startDiagnosticsTest() {
    isTestActive = true;
    testStartTime = performance.now();
    lastFrameTime = performance.now();
  }

  function stopDiagnosticsTest() {
    if (isTestActive && testStartTime !== null) {
      testDurationMs = performance.now() - testStartTime;
    }
    isTestActive = false;
  }

  function resetDiagnosticsResults() {
    testStartTime = isTestActive ? performance.now() : null;
    testDurationMs = 0;
    minFrameDeltaMs = 999;
    maxFrameDeltaMs = 0;
    rollingFrameDeltas.length = 0;
    for (const hand of hands) {
      hand.interruptionCount = 0;
      hand.totalInterruptionDurationMs = 0;
      hand.lastInterruptionTimestamp = null;
      hand.lastRecoveryTimestamp = null;
      hand.minSampleIntervalMs = 999;
      hand.maxSampleIntervalMs = 0;
      hand.sampleIntervalHistory.length = 0;
    }
  }

  function dispose() {
    for (const hand of hands) {
      safeReleaseHand(hand);
      hand.visualGroup.removeFromParent();
      hand.tetherLine.geometry.dispose();
      (hand.tetherLine.material as THREE.Material).dispose();
      (hand.pinchIndicator.material as THREE.Material).dispose();
    }
    jointGeo.dispose();
    jointMat.dispose();
    pinchRingGeo.dispose();
    pinchRingMat.dispose();
    pointingRayGeo.dispose();
    pointingRayMat.dispose();
    tetherGeo.dispose();
    tetherMat.dispose();
  }

  return {
    update,
    getTrackingStatus() {
      return currentStatus;
    },
    getActiveHandsCount() {
      return activeHandsCount;
    },
    getGrabbedCrystalId() {
      const activeGrab = hands.find((h) => h.grabbedCrystalId);
      return activeGrab ? activeGrab.grabbedCrystalId : null;
    },
    releaseGrabbedCrystal() {
      for (const h of hands) safeReleaseHand(h);
    },
    setHandInteractionEnabled(enabled: boolean) {
      handInteractionEnabled = enabled;
      if (!enabled) {
        for (const h of hands) safeReleaseHand(h);
      }
    },
    isHandInteractionEnabled() {
      return handInteractionEnabled;
    },
    setInteractionTuning(next: Partial<HandInteractionTuning>) {
      tuning = { ...tuning, ...next };
    },
    getInteractionTuning() {
      return { ...tuning };
    },
    getRecoveryStates() {
      return {
        left: { ...hands[0].recovery },
        right: { ...hands[1].recovery },
      };
    },
    getWristAnchorSample,
    getDiagnosticsState,
    startDiagnosticsTest,
    stopDiagnosticsTest,
    resetDiagnosticsResults,
    setLightingChecklist(checklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord>) {
      lightingChecklist = checklist;
    },
    setTesterNotes(notes: string) {
      testerNotes = notes;
    },
    dispose,
  };
}

