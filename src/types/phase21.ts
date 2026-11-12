/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 21: Digital Twin Platform, Real-Time Environment Mirroring,
 * Scenario Simulation Lab, Predictive Modeling & Synchronized Intelligence Types.
 */

import { VRTelemetry, LightingPreset } from './diagnostics';
import { AgentRole } from './phase17';

// ============================================================================
// 1. Digital Twin Core & VR Object Mirroring
// ============================================================================

export interface VRObjectDigitalTwin {
  id: string;
  name: string;
  nodeType: 'core_crystal' | 'reflector_array' | 'focus_prism' | 'beam_emitter' | 'target_receiver';
  position: [number, number, number];
  rotationYRad: number;
  rotationYDeg: number;
  targetRotationYRad: number;
  isAligned: boolean;
  resonancePercent: number; // 0 to 100
  isReceivingLight: boolean;
  isReflectingToTarget: boolean;
  colorHex: string;
  frequencyHz: number;
  healthScore: number; // 0 to 100
  lastUpdated: string;
}

export interface EnvironmentalDigitalTwinState {
  preset: LightingPreset | 'solar_flare' | 'eclipse_shadow' | 'ambient_dusk';
  ambientLux: number; // e.g. 50 to 1500
  glareFactor: number; // 0.0 to 1.0
  visibilityFactor: number; // 0.0 to 1.0
  fogDensity: number; // 0.0 to 0.1
  lightBeamCoherence: number; // 0 to 100
  isTargetHit: boolean;
}

export interface DigitalTwinSnapshot {
  snapshotId: string;
  version: number;
  timestamp: string;
  checksum: string;
  provenance: 'Physical Hardware' | 'Simulation';
  objects: Record<string, VRObjectDigitalTwin>;
  environment: EnvironmentalDigitalTwinState;
  tracking: {
    activeHands: number;
    trackedJoints: number;
    expectedJoints: number;
    meanConfidence: number;
    stability: 'Optimal' | 'Degraded' | 'Occluded' | 'Lost';
  };
  cadence: {
    currentFps: number;
    targetFps: number;
    frameDeltaMs: number;
    droppedFramesLastSec: number;
  };
  systemHealthScore: number; // 0 to 100
  syncIntegrity: {
    synchronized: boolean;
    driftMs: number;
    lastSyncTime: string;
  };
}

// ============================================================================
// 2. Scenario Simulation Lab & Predictive Modeling
// ============================================================================

export type SimulationCategory =
  | 'environmental_lighting'
  | 'tracking_occlusion'
  | 'frame_cadence'
  | 'network_partition'
  | 'kinematic_drift';

export interface SimulationScenarioConfig {
  scenarioId: string;
  name: string;
  description: string;
  category: SimulationCategory;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  durationSeconds: number;
  parameters: {
    lightingPreset: LightingPreset | 'solar_flare';
    glareIntensity: number; // 0 to 1.0
    simulatedFrameDropRate: number; // 0.0 to 0.5
    simulatedJointOcclusionCount: number; // 0 to 25
    networkLatencySpikeMs: number; // 0 to 2000
    targetCadenceFps: number;
  };
}

export interface PredictiveFutureEstimate {
  horizonSeconds: 1 | 5 | 15;
  predictedFps: number;
  predictedJointConfidence: number;
  trackingDropoutRiskPercent: number; // 0 to 100
  incidentProbabilityPercent: number; // 0 to 100
  confidenceScore: number; // 0.0 to 1.0
  predictedAnomalies: string[];
}

export interface SimulationSessionReport {
  sessionId: string;
  scenarioId: string;
  scenarioName: string;
  status: 'IDLE' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'ABORTED';
  startedAt: string;
  completedAt?: string;
  elapsedSeconds: number;
  baselineMetrics: {
    fps: number;
    latencyMs: number;
    trackedJoints: number;
    stabilityScore: number;
  };
  simulatedMetrics: {
    fps: number;
    latencyMs: number;
    trackedJoints: number;
    stabilityScore: number;
  };
  variance: {
    fpsDelta: number;
    latencyDeltaMs: number;
    jointsLost: number;
    stabilityShift: number;
  };
  predictions: PredictiveFutureEstimate[];
  agentEvaluations: Record<AgentRole, {
    verdict: string;
    confidence: number;
    recommendations: string[];
  }>;
  isolatedFromHardware: true;
}

// ============================================================================
// 3. Digital Twin Control Center Snapshot
// ============================================================================

export interface DigitalTwinControlCenterSnapshot {
  liveTwin: DigitalTwinSnapshot;
  activeSession: SimulationSessionReport | null;
  historicalSnapshots: DigitalTwinSnapshot[];
  availableScenarios: SimulationScenarioConfig[];
  syncStatus: 'SYNCHRONIZED' | 'SIMULATING' | 'DRIFTING' | 'DISCONNECTED';
  timestamp: string;
}
