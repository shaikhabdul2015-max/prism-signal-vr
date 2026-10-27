export type CrystalId = 'ruby' | 'emerald' | 'azure';

export interface CrystalData {
  id: CrystalId;
  name: string;
  designation: string;
  frequency: number; // Hz base audio frequency
  hexColor: string;
  colorNumber: number;
  lightIntensity: number;
  defaultPosition: [number, number, number];
  currentPosition: [number, number, number];
  rotationY: number; // current angle in radians
  rotationX: number;
  targetRotationY: number; // required alignment angle to reflect to next node
  resonancePercent: number; // 0 to 100%
  isAligned: boolean;
  pedestalSlot: number; // 0, 1, 2
  isReceivingLight: boolean; // whether an incoming beam is currently striking this crystal
  isReflectingToTarget: boolean; // whether this crystal's reflected beam hits the next node
}

export interface BeamSegment {
  from: [number, number, number];
  to: [number, number, number];
  color: number;
  intensity: number;
  hitsTarget: boolean;
  targetId: string | null; // 'ruby' | 'azure' | 'emerald' | 'target_receiver' | 'void'
}

export interface PuzzleProgressState {
  isBeamSourceActive: boolean;
  activeSegmentCount: number; // 0 to 4
  totalSegments: number; // 4 (Console->Ruby, Ruby->Azure, Azure->Emerald, Emerald->Target)
  isRubyPowered: boolean;
  isAzurePowered: boolean;
  isEmeraldPowered: boolean;
  isTargetReceiverHit: boolean;
  overallProgressPercent: number; // 0 to 100%
  beamChainStatus: {
    consoleToRuby: boolean;
    rubyToAzure: boolean;
    azureToEmerald: boolean;
    emeraldToTarget: boolean;
  };
}

export interface AlienSymbol {
  id: string;
  name: string;
  glyph: string;
  meaning: string;
  color: string;
  chamberClueLocation: string;
  clueStep: number; // 1, 2, 3, 4 for the correct sequence, or 0 for distractors
}

export interface DecodingState {
  isUnlocked: boolean; // Unlocks when Phase 2 target receiver is reached
  selectedSequence: string[]; // Symbol IDs selected by player
  targetSequence: string[]; // ['origin', 'bridge', 'prism', 'horizon']
  isSolved: boolean;
  attempts: number;
  lastFeedback: {
    status: 'idle' | 'success' | 'partial' | 'error';
    message: string;
    correctCount: number;
  };
  cluesScannerOpen: boolean;
}

export interface CivilizationStory {
  title: string;
  civilizationName: string;
  epoch: string;
  originCoordinates: string;
  summary: string;
  chapters: {
    heading: string;
    body: string;
  }[];
}

export type GamePhase = 'intro' | 'playing' | 'decoding' | 'paused' | 'solved' | 'story';

export interface MissionState {
  phase: GamePhase;
  started: boolean;
  totalCoherence: number; // 0 to 100%
  puzzleProgress: PuzzleProgressState;
  decodingState: DecodingState;
  selectedCrystalId: CrystalId | null;
  tutorialOpen: boolean;
  tutorialStep: number;
  pauseOpen: boolean;
  audioMuted: boolean;
  audioVolume: number;
  cinematicMode: boolean; // collapsed HUD for zen viewing
  seatedMode: boolean; // VR seated player reference
  transmissionDecoded: boolean;
}

export type VRSupportStatus = 'checking' | 'supported' | 'unsupported' | 'active' | 'error';
export type HandTrackingStatus = 'unavailable' | 'supported' | 'active' | 'lost';

export interface HandInteractionState {
  status: HandTrackingStatus;
  activeHandsCount: number;
  isLeftPinching: boolean;
  isRightPinching: boolean;
  grabbedCrystalId: CrystalId | null;
  hoveredTargetId: string | null;
}

/**
 * VR & XR Input Abstraction Architecture (Phase 5 & 6 WebXR Specification)
 * Completely decouples gameplay logic from DOM events (mouse/touch),
 * providing explicit integration points for WebXR headsets and controller-free hand input:
 *
 * 1. Raycaster Pointer Hook:
 *    - OpenXR / WebXR Aim Ray (`targetRayMode === 'tracked-pointer'`) maps to
 *      `onSelectRay(rayOrigin, rayDirection)`.
 *
 * 2. Thumbstick / Haptic Rotator:
 *    - Controller Primary 2D Axis (thumbstick X) maps directly to
 *      `onRotateObject(crystalId, deltaAngle)`.
 *
 * 3. Seated Reference Space:
 *    - Calibrated to `'local-floor'` space with eye-level at ~1.25m - 1.4m.
 *    - Eliminates room-scale locomotion requirements for 100% seated comfort.
 *
 * 4. Phase 6 Controller-Free Hand Input:
 *    - WebXR Hand Tracking API (`XRHandSpace`, joints, pinch detection, natural rotation)
 *    - Visual subtle holographic indicators for joints and pinch reticles
 *    - Safe release on tracking loss, session end, or finger release
 */
export interface HandJointDiagnostics {
  hand: 'left' | 'right';
  isTracking: boolean;
  trackingState: 'untracked' | 'partial' | 'full';
  availableJointsCount: number;
  totalJointsExpected: number;
  missingJoints: string[];
  invalidJoints: string[];
  wristPosition: [number, number, number] | null;
  indexTipPosition: [number, number, number] | null;
  thumbTipPosition: [number, number, number] | null;
  pinchDistanceMeters: number | null;
  isPinching: boolean;
  heldCrystalId: CrystalId | null;
  interruptionCount: number;
  totalInterruptionDurationMs: number;
  lastInterruptionTimestamp: number | null;
  lastRecoveryTimestamp: number | null;
  sampleIntervalMs: number;
  avgSampleIntervalMs: number;
  minSampleIntervalMs: number;
  maxSampleIntervalMs: number;
  rollingIntervals: number[];
}

export interface LightingConditionRecord {
  condition: 'bright' | 'dim' | 'uneven';
  tested: boolean;
  rating: 'untested' | 'stable' | 'intermittent' | 'degraded' | 'unusable';
  notes: string;
}

export interface DiagnosticsSessionState {
  isActive: boolean;
  startTime: number | null;
  durationMs: number;
  frameDeltaMs: number;
  avgFrameDeltaMs: number;
  minFrameDeltaMs: number;
  maxFrameDeltaMs: number;
  fps: number;
  leftHand: HandJointDiagnostics;
  rightHand: HandJointDiagnostics;
  lightingChecklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord>;
  testerNotes: string;
}

export interface VRInteractionAdapter {
  isVRAvailable: boolean;
  isSessionActive: boolean;
  seatedEyeHeight: number; // default 1.25m
  vrSupportStatus?: VRSupportStatus;
  handTrackingStatus?: HandTrackingStatus;
  activeHandsCount?: number;
  errorMessage?: string;
  onSelectRay?(origin: [number, number, number], direction: [number, number, number]): void;
  onRotateObject?(crystalId: CrystalId, deltaAngle: number): void;
  onTranslateObject?(crystalId: CrystalId, deltaPos: [number, number, number]): void;
  onTriggerHaptic?(intensity: number, durationMs: number): void;
  onHandTrackingChange?(status: HandTrackingStatus, activeHandsCount: number): void;
  onHandPinch?(hand: 'left' | 'right', origin: [number, number, number], direction: [number, number, number]): void;
  onHandGrabCrystal?(hand: 'left' | 'right', crystalId: CrystalId): void;
  onHandReleaseCrystal?(hand: 'left' | 'right', crystalId: CrystalId): void;
  onHandPoseUpdate?(hand: 'left' | 'right', joints: Record<string, [number, number, number]>): void;
}

// Phase 12: Physical WebXR VR Test Management
export type VRTestStatus = 'not_run' | 'pass' | 'fail' | 'inconclusive';

export type VRTestCaseId =
  | 'timing'
  | 'left_right_tracking'
  | 'both_hands_baseline'
  | 'crossing_occlusion'
  | 'loss_and_recovery'
  | 'lighting_conditions';

export interface VRTestMeasurement {
  key: string;
  label: string;
  value: string | number;
  unit?: string;
  source: 'webxr_telemetry' | 'manual_tester_input' | 'browser_environment';
}

export interface PhysicalVRTestCase {
  id: VRTestCaseId;
  title: string;
  category: string;
  description: string;
  verificationCriteria: string[];
  status: VRTestStatus;
  startedAt: string | null;
  completedAt: string | null;
  measurements: VRTestMeasurement[];
  notes: string;
}

export interface VRDeviceEnvironmentInfo {
  userAgent: string;
  platform: string;
  detectedHeadset: string;
  webxrSupported: boolean;
  handTrackingSupported: boolean;
  screenResolution: string;
  timestamp: string;
}

export interface PhysicalVRTestSuiteSummary {
  total: number;
  completed: number;
  pending: number;
  passed: number;
  failed: number;
  inconclusive: number;
  completionPercentage: number;
  passRatePercentage: number;
}
