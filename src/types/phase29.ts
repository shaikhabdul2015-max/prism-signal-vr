/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 29 Type Definitions: Advanced WebXR Reality Engine.
 * Covers Spatial Intelligence, Immersive Environment Simulation,
 * Advanced VR Interaction & Raycasting, Real-Time Spatial Physics,
 * Adaptive Reality Management, Spatial Audio Intelligence,
 * XR Session & Device Management, and Multi-Tier Spatial Telemetry.
 */

// -------------------------------------------------------------
// MODULE 1: SPATIAL INTELLIGENCE & COORDINATES
// -------------------------------------------------------------

export type Vector3Tuple = [number, number, number];
export type QuaternionTuple = [number, number, number, number];

export interface SpatialTransform {
  position: Vector3Tuple;
  rotation: Vector3Tuple; // Euler angles in radians [x, y, z]
  quaternion?: QuaternionTuple;
  scale: Vector3Tuple;
}

export type SpatialNodeType =
  | 'CRYSTAL_CORE'
  | 'REFLECTOR_ARRAY'
  | 'SENSOR_RIG'
  | 'INTERACTION_PANEL'
  | 'AVATAR_JOINT'
  | 'BOUNDARY_ANCHOR'
  | 'LIGHT_SOURCE';

export interface SpatialObjectNode {
  id: string;
  name: string;
  type: SpatialNodeType;
  localTransform: SpatialTransform;
  worldTransform: SpatialTransform;
  parentId?: string;
  childrenIds: string[];
  boundingRadius: number;
  isInteractable: boolean;
  metadata?: Record<string, unknown>;
}

export interface SpatialBoundary {
  min: Vector3Tuple;
  max: Vector3Tuple;
  isWithinBounds: (point: Vector3Tuple) => boolean;
}

// -------------------------------------------------------------
// MODULE 2: IMMERSIVE ENVIRONMENTS
// -------------------------------------------------------------

export type EnvironmentPresetId =
  | 'DEEP_SPACE'
  | 'QUANTUM_LABORATORY'
  | 'NEURAL_INTELLIGENCE_CHAMBER'
  | 'DIGITAL_TWIN_ENVIRONMENT'
  | 'MISSION_SIMULATION_ARENA';

export interface EnvironmentAtmosphere {
  fogColorHex: string;
  fogDensity: number;
  ambientLightHex: string;
  ambientIntensity: number;
  primaryLightHex: string;
  primaryLightIntensity: number;
  primaryLightPosition: Vector3Tuple;
  particleDensity: number;
  backgroundGradient: [string, string];
}

export interface ImmersiveEnvironmentConfig {
  presetId: EnvironmentPresetId;
  name: string;
  description: string;
  atmosphere: EnvironmentAtmosphere;
  floorGridVisible: boolean;
  gridColorHex: string;
  bloomIntensity: number;
  ambientAudioPreset: string;
  targetCadenceFps: number;
}

// -------------------------------------------------------------
// MODULE 3: VR INTERACTION & RAYCASTING
// -------------------------------------------------------------

export type InputMode = 'XR_CONTROLLER' | 'XR_HAND' | 'MOUSE_POINTER' | 'TOUCH_SCREEN' | 'KEYBOARD_FALLBACK';

export interface RaycastHitResult {
  hitObjectId: string;
  distance: number;
  point: Vector3Tuple;
  normal: Vector3Tuple;
}

export interface InteractionState {
  inputMode: InputMode;
  hoveredObjectId: string | null;
  grabbedObjectId: string | null;
  pointerRayOrigin: Vector3Tuple;
  pointerRayDirection: Vector3Tuple;
  triggerPressed: boolean;
  gripPressed: boolean;
  lastInteractionTimestamp: number;
}

// -------------------------------------------------------------
// MODULE 4: SPATIAL PHYSICS & COLLISIONS
// -------------------------------------------------------------

export type ColliderShape = 'SPHERE' | 'BOX' | 'CAPSULE';

export interface PhysicsCollider {
  objectId: string;
  shape: ColliderShape;
  radius?: number;
  dimensions?: Vector3Tuple; // width, height, depth
  centerOffset: Vector3Tuple;
  massKg: number;
  isStatic: boolean;
  restitution: number; // 0.0 - 1.0 (bounciness)
  velocity: Vector3Tuple;
  angularVelocity: Vector3Tuple;
}

export interface CollisionEvent {
  id: string;
  colliderAId: string;
  colliderBId: string;
  contactPoint: Vector3Tuple;
  penetrationDepth: number;
  relativeVelocity: number;
  timestampMs: number;
}

// -------------------------------------------------------------
// MODULE 5: ADAPTIVE REALITY ENGINE
// -------------------------------------------------------------

export type VisualQualityLevel = 'ULTRA' | 'HIGH' | 'BALANCED' | 'CONSERVATIVE_60HZ' | 'FAILSAFE_LOW';

export interface AdaptiveRealityPolicy {
  activePreset: EnvironmentPresetId;
  qualityLevel: VisualQualityLevel;
  dynamicShadowsEnabled: boolean;
  particleDensityScale: number; // 0.0 to 1.0
  foveatedRenderingScale: number;
  renderScale: number; // 0.5 to 1.2
  adaptiveReason: string;
  requiresOperatorApproval: boolean;
  lastAdaptedAt: string;
}

// -------------------------------------------------------------
// MODULE 6: SPATIAL AUDIO INTELLIGENCE
// -------------------------------------------------------------

export interface SpatialAudioSource {
  id: string;
  name: string;
  position: Vector3Tuple;
  refDistance: number;
  maxDistance: number;
  rolloffFactor: number;
  volume: number; // 0.0 - 1.0
  isPlaying: boolean;
  isSynthesized: boolean;
}

// -------------------------------------------------------------
// MODULE 7: XR SESSION & DEVICE MANAGEMENT
// -------------------------------------------------------------

export type XRSessionSupportStatus =
  | 'SUPPORTED_IMMERSIVE_VR'
  | 'SUPPORTED_INLINE'
  | 'UNSUPPORTED'
  | 'CHECKING'
  | 'ERROR';

export interface XRDeviceCapabilities {
  isWebXRAvailable: boolean;
  immersiveVRSupported: boolean;
  handTrackingSupported: boolean;
  hasXRHandGlobal?: boolean;
  supportedReferenceSpaces?: ('local-floor' | 'bounded-floor' | 'local' | 'viewer')[];
  maxRefreshRateHz: number;
  availableControllersCount: number;
  sessionState: 'IDLE' | 'REQUESTING' | 'ACTIVE' | 'TERMINATING' | 'UNSUPPORTED';
  activeReferenceSpaceType: 'local-floor' | 'bounded-floor' | 'local' | 'viewer' | 'none';
  detectedHeadsetBrand?: string;
  errorMessage?: string;
}

// -------------------------------------------------------------
// MODULE 8: SPATIAL TELEMETRY
// -------------------------------------------------------------

export type TelemetryProvenanceTier =
  | 'REAL_DEVICE_TELEMETRY'
  | 'BROWSER_TELEMETRY'
  | 'SIMULATED_TELEMETRY';

export interface SpatialTelemetryMetric {
  timestampMs: number;
  fps: number;
  frameDeltaMs: number;
  drawCalls: number;
  trianglesCount: number;
  geometriesCount: number;
  texturesCount: number;
  activeCollidersCount: number;
  spatialObjectsCount: number;
  interactionLatencyMs: number;
  provenance: TelemetryProvenanceTier;
}

export interface SpatialTelemetrySnapshot {
  currentMetrics: SpatialTelemetryMetric;
  history: SpatialTelemetryMetric[];
  droppedFramesRatio: number;
  cadenceStabilityScore: number; // 0 - 100
  overallPerformanceHealth: 'OPTIMAL' | 'DEGRADED' | 'CRITICAL';
}
