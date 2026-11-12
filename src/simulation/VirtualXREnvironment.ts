/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Development-Only Virtual WebXR Hardware Simulation Environment
 * Emulates a complete dual-hand 25-joint WebXR rig (`XRHand`, `XRJointSpace` matrices,
 * wrist/palm orientation, pinch aperture, grab flexion, pointing ray, native pinch events,
 * session lifecycle, and configurable tracking/coordinate fault injection) when physical
 * Meta Quest / WebXR hardware is unavailable.
 *
 * STRICT SEPARATION GUARANTEE:
 * - Never patches or overrides `navigator.xr` globally in production.
 * - Exposes isolated simulated XRJointSpace / XRHand maps consumed only by dev simulation
 *   harnesses and automated test suites.
 */

import * as THREE from 'three';
import type { SpatialCoordinateSpace } from '../spatial/types';

export const VIRTUAL_XR_JOINT_NAMES = [
  'wrist',
  'thumb-metacarpal',
  'thumb-phalanx-proximal',
  'thumb-phalanx-distal',
  'thumb-tip',
  'index-finger-metacarpal',
  'index-finger-phalanx-proximal',
  'index-finger-phalanx-intermediate',
  'index-finger-phalanx-distal',
  'index-finger-tip',
  'middle-finger-metacarpal',
  'middle-finger-phalanx-proximal',
  'middle-finger-phalanx-intermediate',
  'middle-finger-phalanx-distal',
  'middle-finger-tip',
  'ring-finger-metacarpal',
  'ring-finger-phalanx-proximal',
  'ring-finger-phalanx-intermediate',
  'ring-finger-phalanx-distal',
  'ring-finger-tip',
  'pinky-finger-metacarpal',
  'pinky-finger-phalanx-proximal',
  'pinky-finger-phalanx-intermediate',
  'pinky-finger-phalanx-distal',
  'pinky-finger-tip',
] as const;

export type VirtualHandJointName = (typeof VIRTUAL_XR_JOINT_NAMES)[number];
export type VirtualHandSide = 'left' | 'right';
export type VirtualFaultType =
  | 'none'
  | 'tracking_loss'
  | 'partial_occlusion'
  | 'nan_joint'
  | 'infinity_joint'
  | 'zero_origin'
  | 'out_of_bounds'
  | 'teleport_spike';

export interface VirtualJointSpace {
  jointName: VirtualHandJointName;
  radius: number;
  matrixWorld: THREE.Matrix4;
  position: [number, number, number];
}

export interface VirtualHandConfig {
  side: VirtualHandSide;
  tracked: boolean;
  confidence: number; // [0..1]
  wristPosition: [number, number, number];
  wristRotationEuler: [number, number, number]; // radians [pitch, yaw, roll]
  pinchApertureMeters: number; // distance between thumb-tip & index-finger-tip
  grabStrength: number; // [0..1] 0=open palm, 1=closed fist
  pointing: boolean;
  palmFacingHead: boolean;
  nativePinchActive: boolean;
  fault: VirtualFaultType;
  missingJoints: VirtualHandJointName[];
}

export interface VirtualHandFrameOutput {
  side: VirtualHandSide;
  tracked: boolean;
  confidence: number;
  fault: VirtualFaultType;
  joints: Record<string, VirtualJointSpace | undefined>;
  validJointsCount: number;
  wristPosition: [number, number, number] | null;
  indexTipPosition: [number, number, number] | null;
  thumbTipPosition: [number, number, number] | null;
  pinchDistanceMeters: number;
  grabStrength: number;
  pointingRayOrigin: [number, number, number] | null;
  pointingRayDirection: [number, number, number] | null;
  palmUpScore: number;
  nativePinchActive: boolean;
}

export interface VirtualXREnvironmentSnapshot {
  isDevSimulationOnly: true;
  sessionActive: boolean;
  sessionInterrupted: boolean;
  referenceSpaceType: SpatialCoordinateSpace;
  headPosition: [number, number, number];
  headYawRadians: number;
  simulatedClockMs: number;
  leftHand: VirtualHandFrameOutput;
  rightHand: VirtualHandFrameOutput;
}

function createDefaultHandConfig(side: VirtualHandSide): VirtualHandConfig {
  const xOffset = side === 'left' ? -0.22 : 0.22;
  return {
    side,
    tracked: true,
    confidence: 0.96,
    wristPosition: [xOffset, 1.12, 4.78],
    wristRotationEuler: [0, 0, 0],
    pinchApertureMeters: 0.072,
    grabStrength: 0.1,
    pointing: true,
    palmFacingHead: false,
    nativePinchActive: false,
    fault: 'none',
    missingJoints: [],
  };
}

/**
 * Isolated development-only Virtual WebXR Environment.
 * Simulates two 25-joint hands, head HMD pose, reference spaces, session state,
 * and deterministic failure injection without touching global `navigator.xr`.
 */
export class VirtualXREnvironment {
  public readonly isDevelopmentSimulationOnly = true as const;

  private sessionActive = true;
  private sessionInterrupted = false;
  private referenceSpaceType: SpatialCoordinateSpace = 'local-floor';
  private headPosition: [number, number, number] = [0, 1.25, 5.2];
  private headYawRadians = 0;
  private clockMs = 1000;

  private hands: Record<VirtualHandSide, VirtualHandConfig> = {
    left: createDefaultHandConfig('left'),
    right: createDefaultHandConfig('right'),
  };

  private interruptionTimers: Record<VirtualHandSide, { untilMs: number | null }> = {
    left: { untilMs: null },
    right: { untilMs: null },
  };

  constructor(initialClockMs = 1000) {
    this.clockMs = initialClockMs;
  }

  public getClockMs(): number {
    return this.clockMs;
  }

  public advanceClock(dtMs: number): number {
    const safeDt = Number.isFinite(dtMs) && dtMs > 0 ? dtMs : 16.6;
    this.clockMs += safeDt;

    for (const side of ['left', 'right'] as const) {
      const until = this.interruptionTimers[side].untilMs;
      if (until !== null && this.clockMs >= until) {
        this.interruptionTimers[side].untilMs = null;
        this.hands[side].tracked = true;
        if (this.hands[side].fault === 'tracking_loss') {
          this.hands[side].fault = 'none';
        }
        this.hands[side].confidence = Math.max(this.hands[side].confidence, 0.92);
      }
    }

    return this.clockMs;
  }

  public reset(clockMs = 1000): void {
    this.sessionActive = true;
    this.sessionInterrupted = false;
    this.referenceSpaceType = 'local-floor';
    this.headPosition = [0, 1.25, 5.2];
    this.headYawRadians = 0;
    this.clockMs = clockMs;
    this.hands = {
      left: createDefaultHandConfig('left'),
      right: createDefaultHandConfig('right'),
    };
    this.interruptionTimers = {
      left: { untilMs: null },
      right: { untilMs: null },
    };
  }

  public setSessionActive(active: boolean): void {
    this.sessionActive = active;
    if (active) {
      this.sessionInterrupted = false;
    }
  }

  public interruptSession(): void {
    this.sessionActive = false;
    this.sessionInterrupted = true;
  }

  public setReferenceSpace(space: SpatialCoordinateSpace): void {
    this.referenceSpaceType = space;
  }

  public setHeadPose(position: [number, number, number], yawRadians: number): void {
    this.headPosition = [...position] as [number, number, number];
    this.headYawRadians = yawRadians;
  }

  public setHandState(side: VirtualHandSide, patch: Partial<VirtualHandConfig>): void {
    const current = this.hands[side];
    this.hands[side] = {
      ...current,
      ...patch,
      wristPosition: patch.wristPosition
        ? ([...patch.wristPosition] as [number, number, number])
        : current.wristPosition,
      wristRotationEuler: patch.wristRotationEuler
        ? ([...patch.wristRotationEuler] as [number, number, number])
        : current.wristRotationEuler,
      missingJoints: patch.missingJoints ? [...patch.missingJoints] : current.missingJoints,
    };
  }

  public getHandConfig(side: VirtualHandSide): VirtualHandConfig {
    return {
      ...this.hands[side],
      wristPosition: [...this.hands[side].wristPosition] as [number, number, number],
      wristRotationEuler: [...this.hands[side].wristRotationEuler] as [number, number, number],
      missingJoints: [...this.hands[side].missingJoints],
    };
  }

  /**
   * Moves the hand relative to current position and camera yaw if desired.
   */
  public moveHandBy(side: VirtualHandSide, delta: [number, number, number]): void {
    const cur = this.hands[side].wristPosition;
    this.hands[side].wristPosition = [
      cur[0] + delta[0],
      cur[1] + delta[1],
      cur[2] + delta[2],
    ];
  }

  public setPinch(side: VirtualHandSide, active: boolean, customApertureMeters?: number): void {
    this.hands[side].pinchApertureMeters =
      customApertureMeters !== undefined ? customApertureMeters : active ? 0.015 : 0.072;
    this.hands[side].nativePinchActive = active;
  }

  public setGrab(side: VirtualHandSide, strength: number): void {
    const clamped = Math.max(0, Math.min(1, strength));
    this.hands[side].grabStrength = clamped;
    this.hands[side].pointing = clamped < 0.45;
  }

  public setPalmFacingHead(side: VirtualHandSide, facing: boolean): void {
    this.hands[side].palmFacingHead = facing;
  }

  public injectFault(side: VirtualHandSide, fault: VirtualFaultType, durationMs?: number): void {
    this.hands[side].fault = fault;
    if (fault === 'tracking_loss') {
      this.hands[side].tracked = false;
      this.hands[side].confidence = 0;
      if (durationMs && durationMs > 0) {
        this.interruptionTimers[side].untilMs = this.clockMs + durationMs;
      }
    } else if (fault === 'partial_occlusion') {
      this.hands[side].tracked = true;
      this.hands[side].confidence = 0.42;
      this.hands[side].missingJoints = [
        'ring-finger-tip',
        'pinky-finger-tip',
        'middle-finger-tip',
      ];
    } else if (fault === 'none') {
      this.hands[side].tracked = true;
      this.hands[side].confidence = 0.96;
      this.hands[side].missingJoints = [];
      this.interruptionTimers[side].untilMs = null;
    }
  }

  /**
   * Builds anatomically consistent 25 XRJointSpace transforms for one virtual hand.
   */
  public buildHandFrame(side: VirtualHandSide): VirtualHandFrameOutput {
    const cfg = this.hands[side];
    const joints: Record<string, VirtualJointSpace | undefined> = {};

    if (!this.sessionActive || !cfg.tracked || cfg.fault === 'tracking_loss') {
      return {
        side,
        tracked: false,
        confidence: 0,
        fault: cfg.fault,
        joints,
        validJointsCount: 0,
        wristPosition: null,
        indexTipPosition: null,
        thumbTipPosition: null,
        pinchDistanceMeters: Number.NaN,
        grabStrength: cfg.grabStrength,
        pointingRayOrigin: null,
        pointingRayDirection: null,
        palmUpScore: 0,
        nativePinchActive: false,
      };
    }

    const baseWrist = new THREE.Vector3(...cfg.wristPosition);
    if (cfg.fault === 'teleport_spike') {
      baseWrist.add(new THREE.Vector3(2.8, 0.9, -1.6));
    }

    // Build hand orientation quaternion aligned with camera yaw + wrist rotation + palm orientation.
    // Unrotated metacarpal cross-product normal points +Y; rolling PI flips palm downward at rest,
    // while palmFacingHead tilts +Y normal toward +Z (toward HMD head) so palmUpScore > 0.65.
    const basePitch = cfg.palmFacingHead ? 0.85 : 0.0;
    const baseRoll = cfg.palmFacingHead ? 0.0 : Math.PI;

    const handEuler = new THREE.Euler(
      cfg.wristRotationEuler[0] + basePitch,
      this.headYawRadians + cfg.wristRotationEuler[1],
      cfg.wristRotationEuler[2] + baseRoll,
      'YXZ'
    );
    const handQuat = new THREE.Quaternion().setFromEuler(handEuler);

    // Local skeletal joint offsets in wrist space (fingers extending toward -Z)
    // Sign flips laterally for left vs right anatomy: thumb is medial (+X on left hand, -X on right hand when dorsal side up)
    const mirror = side === 'left' ? 1 : -1;
    const flex = cfg.grabStrength;
    const pinchT = Math.max(0, Math.min(1, 1 - (cfg.pinchApertureMeters - 0.012) / 0.07));
    const indexCurl = cfg.pointing ? pinchT * 0.25 : flex * 0.65;
    const otherCurl = flex * 0.85;

    // Exact target distance between index-tip and thumb-tip controlled deterministically by pinchApertureMeters
    const indexTipLocal = new THREE.Vector3(0.018 * mirror, -0.015 - indexCurl * 0.04, -0.145 + pinchT * 0.02);
    const pinchDir = new THREE.Vector3(-0.35 * mirror, -0.82, 0.45).normalize();
    const thumbTipLocal = indexTipLocal.clone().addScaledVector(pinchDir, Math.max(0.008, cfg.pinchApertureMeters));

    const localOffsets: Record<VirtualHandJointName, { pos: THREE.Vector3; radius: number }> = {
      wrist: { pos: new THREE.Vector3(0, 0, 0), radius: 0.022 },

      'thumb-metacarpal': { pos: new THREE.Vector3(0.024 * mirror, -0.01, -0.028), radius: 0.014 },
      'thumb-phalanx-proximal': {
        pos: thumbTipLocal.clone().lerp(new THREE.Vector3(0.028 * mirror, -0.014, -0.048), 0.62),
        radius: 0.011,
      },
      'thumb-phalanx-distal': {
        pos: thumbTipLocal.clone().lerp(new THREE.Vector3(0.028 * mirror, -0.014, -0.048), 0.3),
        radius: 0.009,
      },
      'thumb-tip': { pos: thumbTipLocal, radius: 0.007 },

      'index-finger-metacarpal': { pos: new THREE.Vector3(0.024 * mirror, 0.004, -0.068), radius: 0.012 },
      'index-finger-phalanx-proximal': {
        pos: new THREE.Vector3(0.022 * mirror, -0.002 - indexCurl * 0.01, -0.095),
        radius: 0.01,
      },
      'index-finger-phalanx-intermediate': {
        pos: new THREE.Vector3(0.02 * mirror, -0.008 - indexCurl * 0.02, -0.12),
        radius: 0.0085,
      },
      'index-finger-phalanx-distal': {
        pos: indexTipLocal.clone().lerp(new THREE.Vector3(0.02 * mirror, -0.008 - indexCurl * 0.02, -0.12), 0.45),
        radius: 0.0075,
      },
      'index-finger-tip': { pos: indexTipLocal, radius: 0.0065 },

      'middle-finger-metacarpal': { pos: new THREE.Vector3(0.004 * mirror, 0.005, -0.072), radius: 0.012 },
      'middle-finger-phalanx-proximal': {
        pos: new THREE.Vector3(0.004 * mirror, -0.003 - otherCurl * 0.02, -0.104),
        radius: 0.01,
      },
      'middle-finger-phalanx-intermediate': {
        pos: new THREE.Vector3(0.004 * mirror, -0.012 - otherCurl * 0.04, -0.132 + otherCurl * 0.03),
        radius: 0.0085,
      },
      'middle-finger-phalanx-distal': {
        pos: new THREE.Vector3(0.004 * mirror, -0.02 - otherCurl * 0.055, -0.148 + otherCurl * 0.05),
        radius: 0.0075,
      },
      'middle-finger-tip': {
        pos: new THREE.Vector3(0.004 * mirror, -0.026 - otherCurl * 0.06, -0.16 + otherCurl * 0.065),
        radius: 0.0065,
      },

      'ring-finger-metacarpal': { pos: new THREE.Vector3(-0.014 * mirror, 0.003, -0.069), radius: 0.011 },
      'ring-finger-phalanx-proximal': {
        pos: new THREE.Vector3(-0.015 * mirror, -0.005 - otherCurl * 0.02, -0.098),
        radius: 0.0095,
      },
      'ring-finger-phalanx-intermediate': {
        pos: new THREE.Vector3(-0.015 * mirror, -0.015 - otherCurl * 0.04, -0.124 + otherCurl * 0.03),
        radius: 0.008,
      },
      'ring-finger-phalanx-distal': {
        pos: new THREE.Vector3(-0.015 * mirror, -0.024 - otherCurl * 0.055, -0.14 + otherCurl * 0.05),
        radius: 0.007,
      },
      'ring-finger-tip': {
        pos: new THREE.Vector3(-0.015 * mirror, -0.03 - otherCurl * 0.06, -0.152 + otherCurl * 0.065),
        radius: 0.006,
      },

      'pinky-finger-metacarpal': { pos: new THREE.Vector3(-0.03 * mirror, -0.001, -0.063), radius: 0.01 },
      'pinky-finger-phalanx-proximal': {
        pos: new THREE.Vector3(-0.032 * mirror, -0.009 - otherCurl * 0.02, -0.088),
        radius: 0.0085,
      },
      'pinky-finger-phalanx-intermediate': {
        pos: new THREE.Vector3(-0.032 * mirror, -0.018 - otherCurl * 0.04, -0.109 + otherCurl * 0.03),
        radius: 0.0075,
      },
      'pinky-finger-phalanx-distal': {
        pos: new THREE.Vector3(-0.032 * mirror, -0.026 - otherCurl * 0.05, -0.123 + otherCurl * 0.045),
        radius: 0.0065,
      },
      'pinky-finger-tip': {
        pos: new THREE.Vector3(-0.032 * mirror, -0.032 - otherCurl * 0.055, -0.133 + otherCurl * 0.055),
        radius: 0.0055,
      },
    };

    const missingSet = new Set(cfg.missingJoints);
    const unitScale = new THREE.Vector3(1, 1, 1);
    let validJointsCount = 0;

    for (const jointName of VIRTUAL_XR_JOINT_NAMES) {
      if (missingSet.has(jointName)) {
        joints[jointName] = undefined;
        continue;
      }

      const spec = localOffsets[jointName];
      const worldPos = spec.pos.clone().applyQuaternion(handQuat).add(baseWrist);

      // Apply requested fault corruption if targeting critical joints
      const m = new THREE.Matrix4().compose(worldPos, handQuat, unitScale);
      if (cfg.fault === 'nan_joint' && (jointName === 'wrist' || jointName === 'index-finger-tip')) {
        m.elements[0] = Number.NaN;
        m.elements[12] = Number.NaN;
        m.elements[13] = Number.NaN;
        m.elements[14] = Number.NaN;
      } else if (cfg.fault === 'infinity_joint' && jointName === 'thumb-tip') {
        m.elements[12] = Number.POSITIVE_INFINITY;
      } else if (cfg.fault === 'zero_origin') {
        m.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      } else if (cfg.fault === 'out_of_bounds' && (jointName === 'wrist' || jointName === 'index-finger-tip')) {
        m.elements[12] = 48.5;
        m.elements[13] = -24.0;
        m.elements[14] = 92.0;
      }

      const posTuple: [number, number, number] = [m.elements[12], m.elements[13], m.elements[14]];
      const isMatrixValid = m.elements[0] !== 0 && Number.isFinite(m.elements[0]) && posTuple.every(Number.isFinite);
      if (isMatrixValid) {
        validJointsCount++;
      }

      joints[jointName] = {
        jointName,
        radius: spec.radius,
        matrixWorld: m,
        position: posTuple,
      };
    }

    const wristJoint = joints['wrist'];
    const indexTipJoint = joints['index-finger-tip'];
    const indexDistalJoint = joints['index-finger-phalanx-distal'];
    const thumbTipJoint = joints['thumb-tip'];
    const indexMetaJoint = joints['index-finger-metacarpal'];
    const pinkyMetaJoint = joints['pinky-finger-metacarpal'];

    let pointingRayOrigin: [number, number, number] | null = null;
    let pointingRayDirection: [number, number, number] | null = null;
    if (indexTipJoint && indexDistalJoint) {
      const tipV = new THREE.Vector3(...indexTipJoint.position);
      const distV = new THREE.Vector3(...indexDistalJoint.position);
      const dir = tipV.clone().sub(distV);
      if (dir.lengthSq() > 1e-8 && Number.isFinite(tipV.x)) {
        dir.normalize();
        pointingRayOrigin = [...indexTipJoint.position];
        pointingRayDirection = [dir.x, dir.y, dir.z];
      }
    }

    let palmUpScore = 0;
    if (wristJoint && indexMetaJoint && pinkyMetaJoint) {
      const wPos = new THREE.Vector3(...wristJoint.position);
      const iPos = new THREE.Vector3(...indexMetaJoint.position);
      const pPos = new THREE.Vector3(...pinkyMetaJoint.position);
      const v1 = iPos.sub(wPos);
      const v2 = pPos.sub(wPos);
      const normal = new THREE.Vector3();
      if (side === 'left') {
        normal.crossVectors(v1, v2);
      } else {
        normal.crossVectors(v2, v1);
      }
      if (normal.lengthSq() > 1e-8 && Number.isFinite(wPos.x)) {
        normal.normalize();
        const toHead = new THREE.Vector3(...this.headPosition).sub(wPos);
        if (toHead.lengthSq() > 1e-8) {
          toHead.normalize();
          palmUpScore = Math.round(normal.dot(toHead) * 1000) / 1000;
        }
      }
    }

    let measuredPinchDist = Number.NaN;
    if (indexTipJoint && thumbTipJoint) {
      const idx = indexTipJoint.position;
      const thm = thumbTipJoint.position;
      if (idx.every(Number.isFinite) && thm.every(Number.isFinite)) {
        measuredPinchDist =
          Math.round(Math.hypot(idx[0] - thm[0], idx[1] - thm[1], idx[2] - thm[2]) * 10000) / 10000;
      }
    }

    return {
      side,
      tracked: cfg.tracked,
      confidence: cfg.fault === 'none' ? cfg.confidence : Math.min(cfg.confidence, 0.25),
      fault: cfg.fault,
      joints,
      validJointsCount,
      wristPosition: wristJoint ? wristJoint.position : null,
      indexTipPosition: indexTipJoint ? indexTipJoint.position : null,
      thumbTipPosition: thumbTipJoint ? thumbTipJoint.position : null,
      pinchDistanceMeters: measuredPinchDist,
      grabStrength: cfg.grabStrength,
      pointingRayOrigin,
      pointingRayDirection,
      palmUpScore,
      nativePinchActive: cfg.nativePinchActive,
    };
  }

  public getSnapshot(): VirtualXREnvironmentSnapshot {
    return {
      isDevSimulationOnly: true,
      sessionActive: this.sessionActive,
      sessionInterrupted: this.sessionInterrupted,
      referenceSpaceType: this.referenceSpaceType,
      headPosition: [...this.headPosition] as [number, number, number],
      headYawRadians: this.headYawRadians,
      simulatedClockMs: Math.round(this.clockMs * 10) / 10,
      leftHand: this.buildHandFrame('left'),
      rightHand: this.buildHandFrame('right'),
    };
  }
}
