import { DiagnosticsSessionState, PhysicalVRTestCase, VRDeviceEnvironmentInfo } from './game';

// ============================================================================
// Standard WebXR QA Telemetry & Diagnostics Types
// ============================================================================

export type LightingPreset =
  | "bright_studio"
  | "low_light"
  | "backlit_glare";

export type TestStatus =
  | "PASS"
  | "FAIL"
  | "INCONCLUSIVE"
  | "NOT_RUN";

export type EnvironmentalCausationStatus =
  | "CONFIRMED"
  | "INCONCLUSIVE";

export type TestCategory =
  | "skeleton_integrity"
  | "tracking_continuity"
  | "frame_performance"
  | "latency"
  | "environmental_conditions"
  | "test_execution";

export interface JointTelemetry {
  jointId: string;
  tracked: boolean;
  confidence?: number | null;
}

export interface FrameTelemetry {
  timestampMs: number;
  frameDurationMs?: number | null;
  dropped?: boolean;
}

export interface TrackingTelemetry {
  timestampMs: number;
  tracking: boolean;
}

export interface LatencyTelemetry {
  timestampMs: number;
  latencyMs: number;
}

export interface TestThresholds {
  minTrackedJoints?: number;
  maxLatencyMs?: number;
  maxFrameDurationMs?: number;
  maxRecoveryTimeMs?: number;
}

export interface VRCausationEvidence {
  tokenPresent: boolean;

  /**
   * This field must be assigned by trusted application code
   * after validating the hardware/instrumentation response.
   */
  validated: boolean;

  /**
   * True only when the validated token explicitly establishes
   * the relevant environmental causal relationship.
   */
  establishesEnvironmentalCausation: boolean;
}

export interface VRTelemetry {
  sessionId: string;
  startedAt: string;
  completedAt?: string | null;

  expectedJointCount: number;
  joints: JointTelemetry[];

  frames: FrameTelemetry[];
  trackingEvents: TrackingTelemetry[];
  latencySamples: LatencyTelemetry[];

  lightingPreset: LightingPreset | null;

  causationEvidence?: VRCausationEvidence | null;

  thresholds: TestThresholds;

  executedCategories: TestCategory[];

  autoSavedAt?: string | null;
}

export interface DiagnosticCategoryResult {
  name: TestCategory;
  status: TestStatus;
  observations: string[];
  issues: string[];
  recommendations: string[];
}

export interface EnvironmentalAssessment {
  selectedPreset: LightingPreset | null;
  causationStatus: EnvironmentalCausationStatus;
  causationEvidence: string | null;
  explanation: string;
}

export interface AIAnalysisResult {
  schemaVersion: "1.0";

  overallStatus:
    | "PASS"
    | "FAIL"
    | "INCONCLUSIVE";

  summary: string;

  categories: DiagnosticCategoryResult[];

  metrics: {
    expectedJointCount: number | null;
    observedJointCount: number | null;
    frameCount: number | null;
    measuredLatencyMs: number | null;
    trackingLossEvents: number | null;
    recoveryTimeMs: number | null;
  };

  environmentalAssessment: EnvironmentalAssessment;

  dataQuality: {
    complete: boolean;
    missingFields: string[];
    warnings: string[];
  };

  recommendations: string[];
}

// Backward-compatibility aliases
export type QACategoryName = TestCategory;
export type QAStatus = TestStatus;
export type QACategoryResult = DiagnosticCategoryResult;
export type QAEnvironmentalAssessment = EnvironmentalAssessment;
export type QAReport = AIAnalysisResult;

// ============================================================================
// UI & Request Types
// ============================================================================

export interface DiagnosticsAIRequest {
  telemetry: {
    fps: number;
    frameDeltaMs: number;
    avgFrameDeltaMs: number;
    minFrameDeltaMs: number;
    maxFrameDeltaMs: number;
    leftHand: {
      trackingState: string;
      availableJointsCount: number;
      totalJointsExpected: number;
      missingJoints: string[];
      avgSampleIntervalMs: number;
      interruptionCount: number;
      isPinching: boolean;
      pinchDistanceMeters: number | null;
    };
    rightHand: {
      trackingState: string;
      availableJointsCount: number;
      totalJointsExpected: number;
      missingJoints: string[];
      avgSampleIntervalMs: number;
      interruptionCount: number;
      isPinching: boolean;
      pinchDistanceMeters: number | null;
    };
    lighting: Record<'bright' | 'dim' | 'uneven', { tested: boolean; rating: string; notes: string }>;
    hardwareCausationToken?: string | null;
  };
  vrTelemetry?: VRTelemetry;
  deviceInfo: VRDeviceEnvironmentInfo;
  isVRActive: boolean;
  testerNotes?: string;
  testCases?: Array<{
    id: string;
    title: string;
    status: string;
    notes?: string;
    measurements?: Array<{ key: string; label: string; value: string | number; unit?: string }>;
  }>;
}

export type HealthSeverity = 'optimal' | 'stable' | 'degraded' | 'critical' | 'inconclusive';

export interface DiagnosticsAnomaly {
  type: 'timing' | 'skeleton' | 'occlusion' | 'lighting' | 'environmental';
  severity: 'low' | 'medium' | 'high' | 'info';
  title: string;
  detail: string;
  recommendation: string;
}

export interface DiagnosticsTestInsight {
  testId: string;
  statusAssessment: string;
  suggestedNextStep: string;
}

export interface DiagnosticsAIResponse {
  timestamp: string;
  overallHealth: HealthSeverity;
  summary: string;
  anomalies: DiagnosticsAnomaly[];
  recommendations: string[];
  testInsights: DiagnosticsTestInsight[];
  modelUsed: string;
  latencyBoundaryNotice: string;
  qaReport?: AIAnalysisResult;
}

export interface DiagnosticsAIState {
  isAnalyzing: boolean;
  analysisResult: DiagnosticsAIResponse | null;
  error: string | null;
}
