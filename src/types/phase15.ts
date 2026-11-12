import { VRTelemetry, AIAnalysisResult, LightingPreset, TestCategory, TestStatus } from './diagnostics';

// ============================================================================
// Phase 15: Module 1 - AI Predictive Failure Detection Types
// ============================================================================

export type PredictiveFailureRisk = 'nominal' | 'low' | 'moderate' | 'high' | 'critical';

export type PredictiveFailureCategory =
  | 'tracking_instability'
  | 'confidence_degradation'
  | 'frame_timing_anomaly'
  | 'latency_spike'
  | 'occlusion_risk'
  | 'recovery_lag';

export interface PredictiveAnomalyAlert {
  id: string;
  category: PredictiveFailureCategory;
  riskLevel: PredictiveFailureRisk;
  title: string;
  description: string;
  predictedImpact: string;
  confidenceScore: number; // 0.0 to 1.0
  isPrediction: true; // Strictly distinguished from confirmed hardware failure
  evidenceData: Record<string, number | string | boolean>;
  suggestedRemediation: string;
  timestamp: string;
}

export interface PredictiveDiagnosticsReport {
  overallRisk: PredictiveFailureRisk;
  healthScore: number; // 0 to 100
  alerts: PredictiveAnomalyAlert[];
  disclaimer: string;
  generatedAt: string;
  telemetryMetrics: {
    instabilityIndex: number;
    averageConfidence: number;
    frameTimingVariance: number;
    latencyJitterMs: number;
    predictedRecoveryLagMs: number;
  };
}

// ============================================================================
// Phase 15: Module 2 - VR Digital Twin Types
// ============================================================================

export type JointTrackingState = 'tracked' | 'degraded' | 'occluded' | 'untracked' | 'lost';

export interface DigitalTwinJoint {
  jointId: string;
  name: string;
  hand: 'left' | 'right';
  position: [number, number, number];
  tracked: boolean;
  confidence: number; // 0.0 to 1.0
  state: JointTrackingState;
  sampleIntervalMs: number;
  isTip?: boolean;
  parentJointId?: string;
}

export interface DigitalTwinSkeleton {
  hand: 'left' | 'right';
  trackingState: 'active' | 'degraded' | 'untracked';
  joints: DigitalTwinJoint[];
  activeJointCount: number;
  expectedJointCount: 25;
  averageConfidence: number;
  isPinching: boolean;
  pinchDistanceMeters: number | null;
  recoveryState: {
    isRecovering: boolean;
    lastRecoveryTimestamp: number | null;
    jitterSmoothingActive: boolean;
  };
}

// ============================================================================
// Phase 15: Module 3 - Intelligent Session Replay Types
// ============================================================================

export type ReplayEventType =
  | 'tracking_loss'
  | 'recovery'
  | 'frame_drop'
  | 'latency_spike'
  | 'joint_drop'
  | 'pinch_gesture'
  | 'lighting_change';

export interface ReplayEvent {
  id: string;
  timestampMs: number;
  type: ReplayEventType;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  data: Record<string, number | string | boolean | null>;
}

export interface RecordedSession {
  id: string;
  title: string;
  startedAt: string;
  durationMs: number;
  isPhysicalHardware: boolean; // DATA INTEGRITY: Distinguish physical from simulated/2D sessions
  deviceInfo: {
    detectedHeadset: string;
    platform: string;
    webxrSupported: boolean;
  };
  lightingPreset: LightingPreset | null;
  events: ReplayEvent[];
  telemetrySnapshots: VRTelemetry[];
  summary: {
    avgFps: number;
    maxLatencyMs: number;
    totalTrackingLossEvents: number;
    jointCoveragePercent: number;
    overallStatus: TestStatus;
  };
}

export interface SessionComparisonResult {
  sessionAId: string;
  sessionBId: string;
  sessionATitle: string;
  sessionBTitle: string;
  fpsDelta: number;
  latencyDeltaMs: number;
  trackingLossDelta: number;
  jointCoverageDelta: number;
  summaryVerdict: string;
  keyDifferences: string[];
}

// ============================================================================
// Phase 15: Module 4 - AI Root Cause Intelligence Types
// ============================================================================

export interface RootCauseHypothesis {
  id: string;
  category: 'optical_occlusion' | 'runtime_scheduling' | 'buffer_underrun' | 'hardware_bandwidth' | 'environmental_inconclusive';
  hypothesis: string;
  confidenceScore: number; // 0 to 100%
  primaryEvidence: string[];
  counterEvidence: string[];
  recommendedAction: string;
  rule2Notice: string; // Reinforces that room lighting is not automatically blamed
}

export interface RootCauseAnalysisReport {
  timestamp: string;
  primaryHypothesis: RootCauseHypothesis | null;
  secondaryHypotheses: RootCauseHypothesis[];
  diagnosticConfidence: number;
  rule2Assessment: {
    status: 'INCONCLUSIVE' | 'CONFIRMED';
    explanation: string;
    hardwareTokenVerified: boolean;
  };
  correctiveActions: string[];
}

// ============================================================================
// Phase 15: Module 5 - Autonomous QA Agent Types
// ============================================================================

export interface QAAssistedTestChecklist {
  id: string;
  item: string;
  category: TestCategory;
  priority: 'high' | 'medium' | 'low';
  completed: boolean;
  notes: string;
}

export interface AutonomousQAAudit {
  auditId: string;
  timestamp: string;
  evaluatedSessionId: string;
  sessionType: 'PHYSICAL_HARDWARE' | 'SIMULATED_PREVIEW';
  reviewedCategories: Array<{
    name: TestCategory;
    status: TestStatus;
    issuesCount: number;
    observations: string[];
  }>;
  failedCategories: TestCategory[];
  recommendedRegressions: Array<{
    testId: string;
    title: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  checklist: QAAssistedTestChecklist[];
  historicalComparisonNotes: string;
  safetyBoundaryNotice: string;
  executiveSummary: string;
}

// ============================================================================
// Standard 25-Joint Names & Anatomy Mapping (WebXR Specification)
// ============================================================================

export const WEBXR_STANDARD_25_JOINTS = [
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

export type WebXRHandJointName = typeof WEBXR_STANDARD_25_JOINTS[number];
