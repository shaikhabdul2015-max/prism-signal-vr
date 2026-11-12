/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 30 Type Definitions: Real-Time Sensor Intelligence & Environmental Awareness Engine.
 * Covers browser sensor discovery, telemetry normalization, environmental classification,
 * multi-source sensor fusion, anomaly detection, environmental predictions,
 * sensor health monitoring, multi-agent sensor intelligence, and privacy management.
 */

import { AgentRole } from './phase17';

// -------------------------------------------------------------
// SENSOR TYPES & CLASSIFICATION
// -------------------------------------------------------------

export type SensorType =
  | 'DEVICE_ORIENTATION'
  | 'DEVICE_MOTION'
  | 'WEBXR_TRACKING'
  | 'XR_CONTROLLER'
  | 'BROWSER_PERFORMANCE'
  | 'APPLICATION_TELEMETRY';

export type SensorHealthState =
  | 'ONLINE'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'PERMISSION_REQUIRED'
  | 'UNSUPPORTED'
  | 'UNKNOWN';

export type EnvironmentalState =
  | 'NORMAL'
  | 'CHANGING'
  | 'UNSTABLE'
  | 'DEGRADED'
  | 'UNKNOWN';

export type AnomalySeverity =
  | 'INFO'
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH'
  | 'CRITICAL';

export type SensorProvenanceTier =
  | 'REAL_DEVICE_TELEMETRY'
  | 'BROWSER_TELEMETRY'
  | 'SIMULATED_TELEMETRY';

// -------------------------------------------------------------
// SENSOR CAPABILITIES & TELEMETRY
// -------------------------------------------------------------

export interface SensorCapabilityRecord {
  sensorType: SensorType;
  isSupported: boolean;
  permissionState: 'granted' | 'denied' | 'prompt' | 'not_required' | 'unsupported';
  hardwareName?: string;
  samplingRateHz?: number;
  lastCheckedTimestamp: number;
}

export interface RawSensorReading {
  sensorType: SensorType;
  timestampMs: number;
  values: Record<string, number | boolean | string | null>;
  confidence: number; // 0.0 - 1.0
  provenance: SensorProvenanceTier;
}

export interface OrientationData {
  alpha: number; // Z axis (0 to 360)
  beta: number;  // X axis (-180 to 180)
  gamma: number; // Y axis (-90 to 90)
  absolute?: boolean;
}

export interface MotionData {
  acceleration: [number, number, number]; // [x, y, z] in m/s^2
  accelerationWithGravity?: [number, number, number];
  rotationRate?: [number, number, number]; // [alpha, beta, gamma] in deg/s
  intervalMs?: number;
}

export interface XRTrackingData {
  headPosition: [number, number, number];
  headRotation: [number, number, number];
  trackedJointsCount: number;
  isTrackingLost: boolean;
}

export interface BrowserPerformanceData {
  fps: number;
  frameDeltaMs: number;
  memoryHeapUsedMB?: number;
}

export interface NormalizedSensorTelemetry {
  timestampMs: number;
  orientation?: OrientationData;
  motion?: MotionData;
  xrTracking?: XRTrackingData;
  performance?: BrowserPerformanceData;
  confidenceScore: number; // 0.0 - 1.0
  isStale: boolean;
  provenance: SensorProvenanceTier;
}

// -------------------------------------------------------------
// ENVIRONMENTAL AWARENESS
// -------------------------------------------------------------

export interface EnvironmentalContext {
  state: EnvironmentalState;
  stateConfidence: number; // 0.0 - 1.0
  dominantDynamics: string;
  accelerationMagnitude: number;
  angularVelocityMagnitude: number;
  boundaryProximityRatio: number; // 0.0 - 1.0 (1.0 = near edge)
  detectedChanges: string[];
  recommendations: string[];
  lastStateChangeTimestamp: number;
  isSimulated: boolean;
}

// -------------------------------------------------------------
// SENSOR FUSION
// -------------------------------------------------------------

export interface SensorConflictRecord {
  sensorA: SensorType;
  sensorB: SensorType;
  parameter: string;
  divergence: number;
  reason: string;
}

export interface SensorFusionSummary {
  timestampMs: number;
  overallConfidence: number;
  contributingSensors: SensorType[];
  fusedMotionVector: [number, number, number];
  fusedOrientationVector: [number, number, number];
  cadenceStability: number; // 0 - 100
  conflictingSignals: SensorConflictRecord[];
  provenance: SensorProvenanceTier;
}

// -------------------------------------------------------------
// ANOMALY DETECTION
// -------------------------------------------------------------

export interface SensorAnomaly {
  id: string;
  timestampMs: number;
  sourceSensor: SensorType;
  observedMeasurement: Record<string, unknown>;
  expectedRange?: {
    min: number;
    max: number;
    unit: string;
  };
  severity: AnomalySeverity;
  confidence: number;
  explanation: string;
  recommendedResponse: string;
  acknowledged: boolean;
}

// -------------------------------------------------------------
// ENVIRONMENTAL PREDICTION
// -------------------------------------------------------------

export interface EnvironmentalPrediction {
  timestampMs: number;
  horizonSeconds: number;
  projectedState: EnvironmentalState;
  trackingStabilityEstimate: number; // 0 - 100
  performanceDegradationRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  uncertaintyBand: number; // 0.0 - 1.0
  warnings: string[];
  basisNotes: string;
  isSimulationEstimate: boolean;
}

// -------------------------------------------------------------
// SENSOR HEALTH & EVENT ORCHESTRATION
// -------------------------------------------------------------

export interface SensorHealthRecord {
  sensorType: SensorType;
  healthState: SensorHealthState;
  lastEventTimestampMs: number;
  freshnessMs: number;
  eventFrequencyHz: number;
  consecutiveInvalidReadings: number;
  isDisconnected: boolean;
  diagnosticNotes: string;
}

export type EnvironmentalEventType =
  | 'STATE_TRANSITION'
  | 'ANOMALY_TRIGGER'
  | 'BOUNDARY_WARNING'
  | 'HEALTH_CHANGE'
  | 'OPERATOR_OVERRIDE';

export interface EnvironmentalEventRecord {
  id: string;
  timestampMs: number;
  eventType: EnvironmentalEventType;
  severity: AnomalySeverity;
  summary: string;
  details: Record<string, unknown>;
  correlatedIncidentId?: string;
  assignedAgent: AgentRole;
  isSuppressedDuplicate?: boolean;
}

// -------------------------------------------------------------
// MULTI-AGENT SENSOR INTELLIGENCE
// -------------------------------------------------------------

export interface AgentSensorAssessment {
  agentRole: AgentRole;
  agentName: string;
  assessmentVerdict: 'NOMINAL' | 'ADVISORY' | 'CRITICAL';
  confidenceScore: number;
  evidenceCount: number;
  keyFindings: string[];
  recommendedDirectives: string[];
  timestamp: string;
}

export interface SensorConsensusReport {
  timestamp: string;
  systemVerdict: 'STABLE' | 'DEGRADED' | 'CRITICAL';
  overallSensorScore: number; // 0 - 100
  disagreementsCount: number;
  consensusDirectives: string[];
  agentAssessments: AgentSensorAssessment[];
}

// -------------------------------------------------------------
// DATA PRIVACY & PERMISSIONS
// -------------------------------------------------------------

export interface SensorPrivacySettings {
  isCollectionEnabled: boolean;
  allowedSensors: Record<SensorType, boolean>;
  dataRetentionSeconds: number;
  anonymizeReadings: boolean;
  telemetryTransmissionAllowed: boolean;
}
