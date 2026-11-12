// src/spatial/types.ts
/**
 * Stage 7: Advanced Spatial Intelligence & Reality Awareness Type Definitions
 */

export type Vec3 = [number, number, number];
export type Quat4 = [number, number, number, number];

export type SpatialCoordinateSpace = 'world' | 'local' | 'local-floor' | 'viewer' | 'bounded-floor';

export type SpatialPermissionScope =
  | 'camera_recognition'
  | 'room_scanning'
  | 'spatial_anchors'
  | 'hand_tracking';

export type PermissionGrantStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export interface SpatialPermissionRecord {
  scope: SpatialPermissionScope;
  status: PermissionGrantStatus;
  hardwareSupported: boolean;
  updatedAt: number;
  reason: string;
}

export interface SpatialRelationship {
  id: string;
  sourceId: string;
  targetId: string;
  relationType:
    | 'illuminates'
    | 'reflects_to'
    | 'receives_from'
    | 'adjacent_to'
    | 'obstructs'
    | 'anchored_on';
  distanceMeters: number;
  bearingRadians: number;
  strength: number; // 0.0 to 1.0
}

export interface SceneGraphConsistencyReport {
  isConsistent: boolean;
  nodeCount: number;
  orphanNodeIds: string[];
  cyclicNodeIds: string[];
  invalidTransformNodeIds: string[];
  outOfBoundsNodeIds: string[];
  checkedAt: number;
}

export interface SpatialAnchorDescriptor {
  id: string;
  label: string;
  position: Vec3;
  orientation: Quat4;
  space: SpatialCoordinateSpace;
  isNativeXRAnchor: boolean;
  createdAt: number;
}

export interface ObjectMetadataEntry {
  id: string;
  name: string;
  category: 'crystal' | 'emitter' | 'receiver' | 'pedestal' | 'console' | 'hazard' | 'marker';
  position: Vec3;
  rotationY: number;
  boundingRadiusMeters: number;
  isInteractable: boolean;
  isCurrentlyLocked?: boolean;
  requiresPriorNodeId?: string;
  semanticTags: string[];
  stateSummary: string;
}

export interface ObjectInteractionEligibility {
  objectId: string;
  isEligible: boolean;
  eligibilityScore: number; // 0.0 to 1.0
  distanceMeters: number;
  isWithinReach: boolean;
  isObstructed: boolean;
  blockingReasons: string[];
  suggestedAction: string;
}

export interface SemanticSceneDescription {
  timestamp: number;
  activeObjectCount: number;
  interactableCount: number;
  nearestObjectId: string | null;
  nearestDistanceMeters: number | null;
  activeRelationshipsCount: number;
  summaryText: string;
  keyObservations: string[];
}

export interface PlayerSpatialSample {
  timestamp: number;
  headPosition: Vec3;
  gazeDirection: Vec3;
  activeHandPosition?: Vec3;
  interactedObjectId?: string;
  actionType?: 'move' | 'gaze' | 'grab' | 'rotate' | 'release' | 'activate';
}

export interface PredictedInteraction {
  objectId: string;
  probability: number; // 0.0 to 1.0 (strictly probabilistic)
  estimatedTimeToInteractMs: number;
  rationale: string;
  isProbabilistic: true;
  canOverrideUserControl: false;
}

export interface NavigationAnticipation {
  recommendedFocusTargetId: string | null;
  targetPosition: Vec3 | null;
  relativeBearingRadians: number;
  recommendedDirection: 'front' | 'left' | 'right' | 'behind';
  confidence: number;
  isAdvisoryOnly: true;
}

export interface MovementAnomalyAlert {
  detected: boolean;
  anomalyType: 'none' | 'erratic_oscillation' | 'boundary_approach' | 'velocity_spike' | 'stagnation';
  severity: 'info' | 'low' | 'medium';
  velocityMetersPerSec: number;
  message: string;
  timestamp: number;
}

export type SpatialEventType =
  | 'BOUNDARY_PROXIMITY'
  | 'BEAM_OCCLUSION_RISK'
  | 'CONVERGENCE_IMMINENT'
  | 'PLAYER_HESITATION_IN_SPACE'
  | 'ANOMALOUS_MOVEMENT'
  | 'WORLD_COHERENCE_SHIFT';

export interface SpatialWorldEvent {
  id: string;
  type: SpatialEventType;
  severity: 'info' | 'warning' | 'critical';
  affectedEntityIds: string[];
  description: string;
  recommendedAdjustment: Record<string, unknown>;
  timestamp: number;
}

export interface WorldAwarenessSnapshot {
  timestamp: number;
  sceneConsistent: boolean;
  coherencePercent: number;
  activeSpatialEvents: SpatialWorldEvent[];
  semanticSummary: SemanticSceneDescription;
  topPredictedInteraction: PredictedInteraction | null;
  navigationAnticipation: NavigationAnticipation;
  directorTension: number;
  environmentMood: {
    ambientIntensity: number;
    fogDensity: number;
    particleSpeed: number;
  };
}

export interface SpatialVisualizationFrame {
  timestamp: number;
  guidanceOverlays: Array<{
    id: string;
    targetObjectId: string;
    position: Vec3;
    radiusMeters: number;
    colorHex: string;
    opacity: number;
    kind: 'alignment_arc' | 'proximity_ring' | 'boundary_halo';
  }>;
  navigationIndicators: Array<{
    id: string;
    fromPosition: Vec3;
    toPosition: Vec3;
    directionVec: Vec3;
    colorHex: string;
    pulseIntensity: number;
  }>;
  predictiveMarkers: Array<{
    objectId: string;
    position: Vec3;
    probability: number;
    ringScale: number;
    colorHex: string;
  }>;
  relationshipArcs: Array<{
    fromId: string;
    toId: string;
    fromPos: Vec3;
    toPos: Vec3;
    relationType: SpatialRelationship['relationType'];
    colorHex: string;
    opacity: number;
  }>;
  adaptiveHudTransform: {
    position: Vec3;
    lookAtPlayer: boolean;
    distanceMeters: number;
    elevationMeters: number;
    occludesCenterViewport: false;
  };
}

export interface WebXRCapabilityMatrix {
  timestamp: number;
  isWebXRAvailable: boolean;
  immersiveVR: boolean;
  immersiveAR: boolean;
  inlineSession: boolean;
  handTracking: boolean;
  hitTest: boolean;
  anchors: boolean;
  meshDetection: boolean;
  supportedReferenceSpaces: SpatialCoordinateSpace[];
  activeInputFallback: 'webxr_native' | 'desktop_mouse_keyboard' | 'mobile_touch';
  physicalHardwareCertified: false; // Must never claim certification without physical device verification
  detectionNotes: string[];
}

export interface SpatialPerformanceMetrics {
  pooledAllocationsReused: number;
  pooledAllocationsCreated: number;
  currentUpdateHz: number;
  lastSpatialTickMs: number;
  averageSpatialTickMs: number;
  dirtyRecomputesSkipped: number;
  activeTrackedNodes: number;
}
