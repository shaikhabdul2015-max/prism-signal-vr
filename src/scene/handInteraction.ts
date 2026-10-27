import * as THREE from 'three';
import {
  CrystalId,
  HandTrackingStatus,
  DiagnosticsSessionState,
  HandJointDiagnostics,
  LightingConditionRecord,
} from '../types/game';

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

export interface HandManagerOptions {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  cameraRig: THREE.Group;
  raycastTargets: THREE.Object3D[];
  consoleRaycastTarget: THREE.Object3D;
  onSelectCrystal: (id: CrystalId) => void;
  onRotateCrystal: (id: CrystalId, deltaAngle: number) => void;
  onToggleBeamSource?: () => void;
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
  pinchDistance: number;
  pinchMidpoint: THREE.Vector3;
  lastPinchPos: THREE.Vector3;
  smoothedDeltaX: number;
  pinchScale: number;
  grabbedCrystalId: CrystalId | null;
  grabbedObjectRef: THREE.Object3D | null;
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

// Phase 7: Refined ergonomic pinch hysteresis thresholds
const PINCH_START_THRESHOLD = 0.024; // 2.4 cm to engage pinch (snappy & deliberate)
const PINCH_END_THRESHOLD = 0.040;   // 4.0 cm to release pinch (prevents accidental drop)

export function createHandTracker(options: HandManagerOptions): HandTracker {
  const {
    renderer,
    scene,
    cameraRig,
    raycastTargets,
    consoleRaycastTarget,
    onSelectCrystal,
    onRotateCrystal,
    onToggleBeamSource,
    onStatusChange,
  } = options;

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
    new THREE.Vector3(0, 0, -3.2),
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
      pinchDistance: 1.0,
      pinchMidpoint: new THREE.Vector3(),
      lastPinchPos: new THREE.Vector3(),
      smoothedDeltaX: 0,
      pinchScale: 1.0,
      grabbedCrystalId: null,
      grabbedObjectRef: null,
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
        updateOverallStatus();
      }
    });

    handSpace.addEventListener('disconnected', () => {
      safeReleaseHand(handData);
      handData.isTracking = false;
      handData.visualGroup.visible = false;
      updateOverallStatus();
    });

    // Native WebXR pinch event listeners fallback when supported
    handSpace.addEventListener('pinchstart', () => {
      if (!handInteractionEnabled) return;
      handlePinchStart(handData);
    });

    handSpace.addEventListener('pinchend', () => {
      handlePinchEnd(handData);
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
    }
    hand.isPinching = false;
    hand.pinchScale = 1.0;
    hand.smoothedDeltaX = 0;
    hand.pinchIndicator.visible = false;
    hand.pointingRay.visible = false;
    hand.tetherLine.visible = false;
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

  function handlePinchStart(hand: HandData) {
    if (!hand.isTracking || !handInteractionEnabled) return;

    // Check what the hand is pointing at or near
    const indexTip = (hand.handSpace as any).joints?.['index-finger-tip'];
    const thumbTip = (hand.handSpace as any).joints?.['thumb-tip'];
    const wrist = (hand.handSpace as any).joints?.['wrist'];

    if (!indexTip || !thumbTip) return;

    _vecA.setFromMatrixPosition(indexTip.matrixWorld);
    _vecB.setFromMatrixPosition(thumbTip.matrixWorld);
    _pinchMid.copy(_vecA).add(_vecB).multiplyScalar(0.5);

    // Compute forward pointing direction from wrist through index
    if (wrist) {
      _vecC.setFromMatrixPosition(wrist.matrixWorld);
      _rayDir.copy(_vecA).sub(_vecC).normalize();
    } else {
      _rayDir.set(0, 0, -1).applyQuaternion(hand.handSpace.quaternion);
    }

    _raycaster.set(_pinchMid, _rayDir);

    // 1. Check Console Light Source
    const consoleHits = _raycaster.intersectObject(consoleRaycastTarget, true);
    if (consoleHits.length > 0 && consoleHits[0].distance < 6.5) {
      triggerHaptic(hand, 0.5, 30);
      onToggleBeamSource?.();
      return;
    }

    // 2. Check Crystals via Raycast or Direct Seated Reach (< 1.5m)
    let closestCrystalId: CrystalId | null = null;
    let closestObj: THREE.Object3D | null = null;
    let minDistance = 999;

    // Proximity check for direct physical grab
    for (const target of raycastTargets) {
      target.getWorldPosition(_crystalPos);
      const dist = _pinchMid.distanceTo(_crystalPos);
      if (dist < 1.4 && dist < minDistance) {
        minDistance = dist;
        closestCrystalId = target.userData.crystalId as CrystalId;
        closestObj = target;
      }
    }

    // If not in direct touch reach, check raycast line of sight
    if (!closestCrystalId) {
      const crystalHits = _raycaster.intersectObjects(raycastTargets, true);
      if (crystalHits.length > 0 && crystalHits[0].distance < 7.0) {
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
      hand.grabbedCrystalId = closestCrystalId;
      hand.grabbedObjectRef = closestObj;
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
        h.availableJointsCount = 0;
        h.missingJoints = [...JOINT_NAMES];
        h.invalidJoints = [];
        h.wristPos = null;
        h.indexTipPos = null;
        h.thumbTipPos = null;
        if (h.visualGroup.visible) h.visualGroup.visible = false;
        if (h.grabbedCrystalId) safeReleaseHand(h);
      }
      return;
    }

    let currentlyActiveHands = 0;

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

      // Detect tracking loss or missing critical joints
      const hasCoreJoints =
        wrist &&
        indexTip &&
        thumbTip &&
        wrist.matrixWorld.elements[0] !== 0 &&
        !isNaN(wrist.matrixWorld.elements[0]);

      if (!hasCoreJoints) {
        if (hand.isTracking) {
          hand.interruptionCount++;
          hand.lastInterruptionTimestamp = now;
          hand.isTracking = false;
        }
        hand.visualGroup.visible = false;
        if (hand.grabbedCrystalId) {
          safeReleaseHand(hand);
        }
        continue;
      }

      // Tracking resumed or currently active
      if (!hand.isTracking) {
        if (hand.lastInterruptionTimestamp !== null) {
          hand.totalInterruptionDurationMs += now - hand.lastInterruptionTimestamp;
        }
        hand.lastRecoveryTimestamp = now;
        hand.isTracking = true;
        // Phase 10: Prevent crystals from jumping when tracking resumes
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
          // Zero-scale invalid / missing joints to prevent rendering stale or phantom spheres
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
      hand.pinchMidpoint.copy(_vecA).add(_vecB).multiplyScalar(0.5);

      // Ergonomic pinch state machine with hysteresis
      if (!hand.isPinching && pinchDist < PINCH_START_THRESHOLD) {
        hand.isPinching = true;
        handlePinchStart(hand);
      } else if (hand.isPinching && pinchDist > PINCH_END_THRESHOLD) {
        hand.isPinching = false;
        handlePinchEnd(hand);
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
        } else {
          ringMat.color.setHex(0xf59e0b); // Pinching in void (amber)
          ringMat.opacity = 0.65;
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
        hand.pointingRay.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), _rayDir);
      }

      // 6. Natural Jitter-Filtered Rotation of Grabbed Crystal via Hand Movement
      if (hand.isPinching && hand.grabbedCrystalId && handInteractionEnabled) {
        const rawDeltaX = hand.pinchMidpoint.x - hand.lastPinchPos.x;

        // Low-pass exponential smoothing filter to eliminate optical tracking noise
        hand.smoothedDeltaX = hand.smoothedDeltaX * 0.35 + rawDeltaX * 0.65;

        // Dead-zone check against microscopic arm sway
        if (Math.abs(hand.smoothedDeltaX) > 0.0012) {
          const rotationAngleDelta = hand.smoothedDeltaX * 4.0;
          onRotateCrystal(hand.grabbedCrystalId, rotationAngleDelta);
        }
        hand.lastPinchPos.copy(hand.pinchMidpoint);
      }
    }

    if (currentlyActiveHands !== activeHandsCount) {
      activeHandsCount = currentlyActiveHands;
      updateOverallStatus();
    }
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

