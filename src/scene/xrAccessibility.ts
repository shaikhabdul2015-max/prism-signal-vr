/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * WebXR Advanced Gesture Calibration & Seated/Standing Accessibility Architecture
 * 1. GestureCalibrationManager: session-ephemeral personalized reach, pinch threshold, and
 *    left/right handedness calibration (stores zero biometric / personal joint logs).
 * 2. AccessibilityLayoutManager: adapts crystal heights, chamber UI placement, wrist offsets,
 *    seated/standing posture modes, XR reference space handling, and snap/smooth turn controls.
 */

import type { SpatialCoordinateSpace } from '../spatial/types';

export type DominantHandPreference = 'left' | 'right' | 'ambidextrous';
export type PostureMode = 'seated' | 'standing';
export type TurnMode = 'snap' | 'smooth';
export type CalibrationStatus =
  | 'idle'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'interrupted_fallback';
export type CalibrationStep = 'capability_check' | 'comfort_reach' | 'pinch_confirm' | 'done';

export interface XRHandCapabilityInfo {
  xrSupported: boolean;
  handTrackingGranted: boolean;
  leftHandTracked: boolean;
  rightHandTracked: boolean;
  activeReferenceSpace: SpatialCoordinateSpace;
  hasFloorLevel: boolean;
}

export interface CalibrationProfile {
  isCalibrated: boolean;
  dominantHand: DominantHandPreference;
  wristMenuHand: 'left' | 'right';
  comfortableReachMeters: number;
  pinchStartThreshold: number;
  pinchEndThreshold: number;
  rotationSensitivity: number;
  airSwipeThresholdMeters: number;
  calibratedAtMs: number | null;
}

export interface CalibrationStateSnapshot {
  status: CalibrationStatus;
  step: CalibrationStep;
  progressPercent: number;
  capabilities: XRHandCapabilityInfo;
  profile: CalibrationProfile;
  interruptedReason: string | null;
  lastReachSampleMeters: number | null;
  lastPinchSampleMeters: number | null;
}

export interface CalibrationSampleInput {
  headPosition: [number, number, number];
  leftHand?: {
    isTracking: boolean;
    wristPos: [number, number, number] | null;
    pinchDistanceMeters: number;
    isPinching: boolean;
  };
  rightHand?: {
    isTracking: boolean;
    wristPos: [number, number, number] | null;
    pinchDistanceMeters: number;
    isPinching: boolean;
  };
  nowMs?: number;
}

export interface AdaptiveLayoutTargets {
  postureMode: PostureMode;
  turnMode: TurnMode;
  referenceSpaceType: SpatialCoordinateSpace;
  hasFloorLevel: boolean;
  effectiveEyeHeightMeters: number;
  crystalElevationY: number;
  consoleElevationY: number;
  directReachRadiusMeters: number;
  chamberPanelDistanceMeters: number;
  chamberPanelY: number;
  wristMenuOffsetY: number;
  wristMenuPullTowardHeadMeters: number;
  seatedRigSpawnPos: [number, number, number];
  snapTurnAngleRad: number;
  smoothTurnRateRadPerSec: number;
}

export interface AccessibilityStateSnapshot {
  postureMode: PostureMode;
  turnMode: TurnMode;
  referenceSpaceType: SpatialCoordinateSpace;
  hasFloorLevel: boolean;
  measuredEyeHeightMeters: number;
  layout: AdaptiveLayoutTargets;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function medianOfSorted(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) * 0.5 : sorted[mid];
}

export const DEFAULT_CALIBRATION_PROFILE: CalibrationProfile = {
  isCalibrated: false,
  dominantHand: 'right',
  wristMenuHand: 'left',
  comfortableReachMeters: 0.58,
  pinchStartThreshold: 0.024,
  pinchEndThreshold: 0.04,
  rotationSensitivity: 4.0,
  airSwipeThresholdMeters: 0.14,
  calibratedAtMs: null,
};

/**
 * Session-scoped hand gesture calibration manager.
 * Intentionally stores ONLY scalar interaction tuning thresholds (never raw joint recordings).
 */
export class GestureCalibrationManager {
  private status: CalibrationStatus = 'idle';
  private step: CalibrationStep = 'capability_check';
  private capabilities: XRHandCapabilityInfo = {
    xrSupported: false,
    handTrackingGranted: false,
    leftHandTracked: false,
    rightHandTracked: false,
    activeReferenceSpace: 'local-floor',
    hasFloorLevel: true,
  };
  private profile: CalibrationProfile = { ...DEFAULT_CALIBRATION_PROFILE };

  // Ephemeral working buffers (cleared automatically on completion/cancel/reset)
  private reachSamples: number[] = [];
  private relaxedPinchSamples: number[] = [];
  private engagedPinchSamples: number[] = [];
  private lastReachSampleMeters: number | null = null;
  private lastPinchSampleMeters: number | null = null;
  private interruptedReason: string | null = null;
  private trackingLostSinceMs: number | null = null;
  private readonly targetReachSamples = 8;

  public detectCapabilitiesFromSession(
    xrSupported: boolean,
    session?: XRSession | null,
    activeReferenceSpace: SpatialCoordinateSpace = 'local-floor'
  ): XRHandCapabilityInfo {
    let handTrackingGranted = false;
    let leftTracked = false;
    let rightTracked = false;

    if (session) {
      const enabledFeatures = (session as any).enabledFeatures as Set<string> | string[] | undefined;
      if (enabledFeatures) {
        handTrackingGranted = Array.from(enabledFeatures).includes('hand-tracking');
      }
      if (session.inputSources) {
        for (const source of session.inputSources) {
          if (source.hand) {
            handTrackingGranted = true;
            if (source.handedness === 'left') leftTracked = true;
            if (source.handedness === 'right') rightTracked = true;
          }
        }
      }
    }

    this.capabilities = {
      xrSupported,
      handTrackingGranted,
      leftHandTracked: leftTracked,
      rightHandTracked: rightTracked,
      activeReferenceSpace,
      hasFloorLevel:
        activeReferenceSpace === 'local-floor' || activeReferenceSpace === 'bounded-floor',
    };
    return { ...this.capabilities };
  }

  public beginCalibration(capabilities?: Partial<XRHandCapabilityInfo>): void {
    if (capabilities) {
      this.capabilities = { ...this.capabilities, ...capabilities };
    }
    this.reachSamples = [];
    this.relaxedPinchSamples = [];
    this.engagedPinchSamples = [];
    this.lastReachSampleMeters = null;
    this.lastPinchSampleMeters = null;
    this.interruptedReason = null;
    this.trackingLostSinceMs = null;
    this.status = 'in_progress';
    this.step = 'comfort_reach';
  }

  public setDominantHand(hand: DominantHandPreference): void {
    this.profile.dominantHand = hand;
    // Wrist menu lives on opposite hand for one-handed pointing ergonomics
    this.profile.wristMenuHand = hand === 'left' ? 'right' : 'left';
  }

  public sampleFrame(input: CalibrationSampleInput): void {
    if (this.status !== 'in_progress') return;
    const now = input.nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());

    const activeHands: Array<{
      side: 'left' | 'right';
      wristPos: [number, number, number];
      pinchDist: number;
      isPinching: boolean;
    }> = [];

    if (
      input.leftHand?.isTracking &&
      input.leftHand.wristPos &&
      input.leftHand.wristPos.every(Number.isFinite)
    ) {
      activeHands.push({
        side: 'left',
        wristPos: input.leftHand.wristPos,
        pinchDist: input.leftHand.pinchDistanceMeters,
        isPinching: input.leftHand.isPinching,
      });
    }

    if (
      input.rightHand?.isTracking &&
      input.rightHand.wristPos &&
      input.rightHand.wristPos.every(Number.isFinite)
    ) {
      activeHands.push({
        side: 'right',
        wristPos: input.rightHand.wristPos,
        pinchDist: input.rightHand.pinchDistanceMeters,
        isPinching: input.rightHand.isPinching,
      });
    }

    this.capabilities.leftHandTracked = Boolean(input.leftHand?.isTracking);
    this.capabilities.rightHandTracked = Boolean(input.rightHand?.isTracking);
    if (activeHands.length > 0) {
      this.capabilities.handTrackingGranted = true;
    }

    if (activeHands.length === 0) {
      if (this.trackingLostSinceMs === null) {
        this.trackingLostSinceMs = now;
      } else if (now - this.trackingLostSinceMs > 2500) {
        this.handleTrackingInterruption('Hand tracking unavailable for >2.5s during calibration');
      }
      return;
    }
    this.trackingLostSinceMs = null;

    // During comfort_reach, select the actively extended hand (furthest reach) so left- and right-handed users are both measured accurately prior to pinch confirmation
    const chosen =
      this.step === 'comfort_reach'
        ? activeHands.reduce((best, curr) => {
            const bestD = Math.hypot(
              best.wristPos[0] - input.headPosition[0],
              best.wristPos[1] - (input.headPosition[1] - 0.18),
              best.wristPos[2] - input.headPosition[2]
            );
            const currD = Math.hypot(
              curr.wristPos[0] - input.headPosition[0],
              curr.wristPos[1] - (input.headPosition[1] - 0.18),
              curr.wristPos[2] - input.headPosition[2]
            );
            return currD > bestD ? curr : best;
          }, activeHands[0])
        : activeHands.find((h) => h.side === this.profile.dominantHand) || activeHands[0];

    const dx = chosen.wristPos[0] - input.headPosition[0];
    const dy = chosen.wristPos[1] - (input.headPosition[1] - 0.18);
    const dz = chosen.wristPos[2] - input.headPosition[2];
    const reachDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (Number.isFinite(reachDist) && reachDist > 0.15 && reachDist < 1.3) {
      this.lastReachSampleMeters = Math.round(reachDist * 1000) / 1000;
      if (this.step === 'comfort_reach') {
        this.reachSamples.push(reachDist);
        if (Number.isFinite(chosen.pinchDist) && chosen.pinchDist > 0.03) {
          this.relaxedPinchSamples.push(chosen.pinchDist);
        }
        if (this.reachSamples.length >= this.targetReachSamples) {
          this.step = 'pinch_confirm';
        }
      }
    }

    if (this.step === 'pinch_confirm') {
      // Detect intentional pinch on either hand to calibrate dominant side + pinch threshold
      const pinchingHand = activeHands.find(
        (h) => h.isPinching || (Number.isFinite(h.pinchDist) && h.pinchDist < 0.032)
      );
      if (pinchingHand) {
        this.lastPinchSampleMeters = Math.round(pinchingHand.pinchDist * 1000) / 1000;
        this.engagedPinchSamples.push(pinchingHand.pinchDist);
        this.setDominantHand(pinchingHand.side);

        if (this.engagedPinchSamples.length >= 3) {
          this.completeCalibration(now);
        }
      } else if (Number.isFinite(chosen.pinchDist) && chosen.pinchDist < 0.15) {
        this.lastPinchSampleMeters = Math.round(chosen.pinchDist * 1000) / 1000;
        this.relaxedPinchSamples.push(chosen.pinchDist);
      }
    }
  }

  public completeCalibration(nowMs?: number): CalibrationProfile {
    const now = nowMs ?? Date.now();
    const reach =
      this.reachSamples.length > 0
        ? clamp(medianOfSorted(this.reachSamples), 0.35, 0.95)
        : this.profile.comfortableReachMeters;

    const engaged =
      this.engagedPinchSamples.length > 0
        ? clamp(medianOfSorted(this.engagedPinchSamples), 0.012, 0.028)
        : 0.018;
    const relaxed =
      this.relaxedPinchSamples.length > 0
        ? clamp(medianOfSorted(this.relaxedPinchSamples), 0.045, 0.12)
        : 0.075;

    // Personalized threshold positioned smoothly between closed pinch and relaxed aperture
    const startThreshold = clamp(engaged + (relaxed - engaged) * 0.22, 0.02, 0.033);
    const endThreshold = clamp(Math.max(startThreshold + 0.014, engaged + (relaxed - engaged) * 0.45), 0.034, 0.055);
    const reachScale = clamp(reach / 0.58, 0.72, 1.35);

    this.profile = {
      isCalibrated: true,
      dominantHand: this.profile.dominantHand,
      wristMenuHand: this.profile.dominantHand === 'left' ? 'right' : 'left',
      comfortableReachMeters: Math.round(reach * 1000) / 1000,
      pinchStartThreshold: Math.round(startThreshold * 10000) / 10000,
      pinchEndThreshold: Math.round(endThreshold * 10000) / 10000,
      rotationSensitivity: Math.round(clamp(4.0 / reachScale, 2.8, 5.5) * 100) / 100,
      airSwipeThresholdMeters: Math.round(clamp(0.14 * reachScale, 0.09, 0.22) * 1000) / 1000,
      calibratedAtMs: now,
    };

    // Purge raw sample arrays immediately to avoid holding biometric measurements
    this.clearEphemeralSamples();
    this.status = 'completed';
    this.step = 'done';
    this.interruptedReason = null;
    return this.getProfile();
  }

  public skipCalibration(): CalibrationProfile {
    this.clearEphemeralSamples();
    this.status = 'completed';
    this.step = 'done';
    this.interruptedReason = null;
    this.profile.isCalibrated = true;
    this.profile.calibratedAtMs = Date.now();
    return this.getProfile();
  }

  public cancelCalibration(): void {
    this.clearEphemeralSamples();
    this.status = 'cancelled';
    this.interruptedReason = null;
  }

  public handleTrackingInterruption(reason = 'Hand tracking interrupted during calibration'): void {
    if (this.status !== 'in_progress') return;
    this.clearEphemeralSamples();
    this.status = 'interrupted_fallback';
    this.interruptedReason = reason;
  }

  public recalibrate(): void {
    this.beginCalibration();
  }

  public getProgressPercent(): number {
    if (this.status === 'completed') return 100;
    if (this.status !== 'in_progress') return 0;
    if (this.step === 'capability_check') return 10;
    if (this.step === 'comfort_reach') {
      const ratio = clamp(this.reachSamples.length / this.targetReachSamples, 0, 1);
      return Math.round(15 + ratio * 55);
    }
    if (this.step === 'pinch_confirm') {
      const ratio = clamp(this.engagedPinchSamples.length / 3, 0, 1);
      return Math.round(70 + ratio * 30);
    }
    return 100;
  }

  public getProfile(): CalibrationProfile {
    return { ...this.profile };
  }

  public getState(): CalibrationStateSnapshot {
    return {
      status: this.status,
      step: this.step,
      progressPercent: this.getProgressPercent(),
      capabilities: { ...this.capabilities },
      profile: { ...this.profile },
      interruptedReason: this.interruptedReason,
      lastReachSampleMeters: this.lastReachSampleMeters,
      lastPinchSampleMeters: this.lastPinchSampleMeters,
    };
  }

  /**
   * Privacy sanitizer confirming zero raw joint positions or skeletal biometrics exist in exported state.
   */
  public exportPrivacySafeConfig(): Omit<CalibrationProfile, 'calibratedAtMs'> {
    const p = this.getProfile();
    return {
      isCalibrated: p.isCalibrated,
      dominantHand: p.dominantHand,
      wristMenuHand: p.wristMenuHand,
      comfortableReachMeters: p.comfortableReachMeters,
      pinchStartThreshold: p.pinchStartThreshold,
      pinchEndThreshold: p.pinchEndThreshold,
      rotationSensitivity: p.rotationSensitivity,
      airSwipeThresholdMeters: p.airSwipeThresholdMeters,
    };
  }

  private clearEphemeralSamples(): void {
    this.reachSamples = [];
    this.relaxedPinchSamples = [];
    this.engagedPinchSamples = [];
    this.trackingLostSinceMs = null;
  }
}

/**
 * Adaptive spatial accessibility manager for seated & standing XR postures,
 * eye-height normalization, reference space floor awareness, and snap/smooth turn controls.
 */
export class AccessibilityLayoutManager {
  private postureMode: PostureMode = 'seated';
  private turnMode: TurnMode = 'snap';
  private referenceSpaceType: SpatialCoordinateSpace = 'local-floor';
  private hasFloorLevel = true;
  private measuredEyeHeightMeters = 1.25;
  private comfortableReachMeters = 0.58;

  public setPostureMode(mode: PostureMode): void {
    this.postureMode = mode;
    if (!this.hasFloorLevel) {
      this.measuredEyeHeightMeters = mode === 'standing' ? 1.65 : 1.25;
    }
  }

  public togglePostureMode(): PostureMode {
    const next: PostureMode = this.postureMode === 'seated' ? 'standing' : 'seated';
    this.setPostureMode(next);
    return next;
  }

  public setTurnMode(mode: TurnMode): void {
    this.turnMode = mode;
  }

  public toggleTurnMode(): TurnMode {
    const next: TurnMode = this.turnMode === 'snap' ? 'smooth' : 'snap';
    this.turnMode = next;
    return next;
  }

  public updateReferenceSpace(
    spaceType: SpatialCoordinateSpace,
    measuredHmdY?: number
  ): void {
    this.referenceSpaceType = spaceType;
    this.hasFloorLevel = spaceType === 'local-floor' || spaceType === 'bounded-floor';

    if (
      this.hasFloorLevel &&
      measuredHmdY !== undefined &&
      Number.isFinite(measuredHmdY) &&
      measuredHmdY > 0.7 &&
      measuredHmdY < 2.2
    ) {
      this.measuredEyeHeightMeters = Math.round(measuredHmdY * 1000) / 1000;
      // Gently classify posture if user physically stood up above 1.48m or sat down below 1.32m
      if (measuredHmdY >= 1.48 && this.postureMode === 'seated') {
        this.postureMode = 'standing';
      } else if (measuredHmdY <= 1.3 && this.postureMode === 'standing') {
        this.postureMode = 'seated';
      }
    } else if (!this.hasFloorLevel) {
      this.measuredEyeHeightMeters = this.postureMode === 'standing' ? 1.65 : 1.25;
    }
  }

  public syncCalibrationReach(comfortableReachMeters: number): void {
    if (Number.isFinite(comfortableReachMeters)) {
      this.comfortableReachMeters = clamp(comfortableReachMeters, 0.35, 0.95);
    }
  }

  public computeLayout(): AdaptiveLayoutTargets {
    const effectiveEye = clamp(this.measuredEyeHeightMeters, 0.9, 2.05);
    const postureOffset = this.postureMode === 'standing' ? 0.22 : 0.08;
    const crystalElevationY =
      Math.round(clamp(effectiveEye - postureOffset, 1.0, 1.58) * 1000) / 1000;
    const consoleElevationY = Math.round((crystalElevationY + 0.16) * 1000) / 1000;

    const directReachRadiusMeters =
      Math.round(clamp(this.comfortableReachMeters * 2.35, 1.15, 1.9) * 1000) / 1000;
    const chamberPanelDistanceMeters =
      Math.round(clamp(1.38 + this.comfortableReachMeters * 0.75, 1.55, 2.15) * 1000) / 1000;
    const chamberPanelY =
      Math.round(clamp(effectiveEye - 0.04, 1.1, 1.92) * 1000) / 1000;

    const wristMenuOffsetY = this.postureMode === 'standing' ? 0.25 : 0.27;
    const wristMenuPullTowardHeadMeters = clamp(0.06 + (0.6 - this.comfortableReachMeters) * 0.08, 0.05, 0.12);

    const rigZ = this.postureMode === 'standing' ? 4.85 : 5.2;

    return {
      postureMode: this.postureMode,
      turnMode: this.turnMode,
      referenceSpaceType: this.referenceSpaceType,
      hasFloorLevel: this.hasFloorLevel,
      effectiveEyeHeightMeters: effectiveEye,
      crystalElevationY,
      consoleElevationY,
      directReachRadiusMeters,
      chamberPanelDistanceMeters,
      chamberPanelY,
      wristMenuOffsetY,
      wristMenuPullTowardHeadMeters,
      seatedRigSpawnPos: [0, 0, rigZ],
      snapTurnAngleRad: Math.PI / 4,
      smoothTurnRateRadPerSec: 1.65,
    };
  }

  public getState(): AccessibilityStateSnapshot {
    return {
      postureMode: this.postureMode,
      turnMode: this.turnMode,
      referenceSpaceType: this.referenceSpaceType,
      hasFloorLevel: this.hasFloorLevel,
      measuredEyeHeightMeters: this.measuredEyeHeightMeters,
      layout: this.computeLayout(),
    };
  }
}
