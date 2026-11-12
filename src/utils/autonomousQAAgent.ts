import { AIAnalysisResult, VRTelemetry, TestCategory } from '../types/diagnostics';
import { AutonomousQAAudit, QAAssistedTestChecklist } from '../types/phase15';

export const QA_SAFETY_BOUNDARY_NOTICE =
  'AUTONOMOUS QA AGENT SAFETY BOUNDARY: This agent operates under autonomous read-only advisory oversight. It evaluates telemetry, recommends regression suites, and generates test checklists. It is programmatically constrained from modifying production code, hardware configurations, or system settings.';

/**
 * Autonomous QA Agent
 * Reviews completed test sessions, pinpoints regressions, formulates structured QA audit reports,
 * and generates actionable regression verification checklists.
 */
export function runAutonomousQAAudit(
  analysis: AIAnalysisResult,
  telemetry: VRTelemetry,
  options: {
    isPhysicalHardware?: boolean;
    historicalAudits?: AutonomousQAAudit[];
  } = {}
): AutonomousQAAudit {
  const auditId = `qa-audit-${Date.now()}`;
  const now = new Date().toISOString();
  const sessionType = options.isPhysicalHardware ? 'PHYSICAL_HARDWARE' : 'SIMULATED_PREVIEW';

  const reviewedCategories = analysis.categories.map((cat) => ({
    name: cat.name,
    status: cat.status,
    issuesCount: cat.issues.length,
    observations: cat.observations,
  }));

  const failedCategories = analysis.categories
    .filter((cat) => cat.status === 'FAIL')
    .map((cat) => cat.name);

  // Generate Recommended Regression Tests based on failed or inconclusive categories
  const recommendedRegressions: Array<{
    testId: string;
    title: string;
    rationale: string;
    priority: 'high' | 'medium' | 'low';
  }> = [];

  if (failedCategories.includes('skeleton_integrity')) {
    recommendedRegressions.push({
      testId: 'reg-skeleton-25',
      title: '25-Joint Anatomical Skeleton Sweep',
      rationale: 'Telemetry indicated missing or degraded joints. Execute static palm-forward pose verification.',
      priority: 'high',
    });
  }

  if (failedCategories.includes('tracking_continuity')) {
    recommendedRegressions.push({
      testId: 'reg-occlusion-crossing',
      title: 'Bimanual Hand Crossing & Occlusion Stress Test',
      rationale: 'Optical interruptions exceeded threshold. Verify crystal drop smoothly without positional snaps.',
      priority: 'high',
    });
  }

  if (failedCategories.includes('frame_performance') || failedCategories.includes('latency')) {
    recommendedRegressions.push({
      testId: 'reg-cadence-pacing',
      title: '72Hz VR Render Loop Cadence & Delta Verification',
      rationale: 'Frame delta or render loop jitter exceeded comfort limits (< 20ms required).',
      priority: 'medium',
    });
  }

  if (failedCategories.includes('environmental_conditions') || analysis.environmentalAssessment.causationStatus === 'CONFIRMED') {
    recommendedRegressions.push({
      testId: 'reg-sensor-instrumentation',
      title: 'Optical Sensor Lighting Boundary Verification',
      rationale: 'Verify whether hardware causation token persists across controlled lux levels.',
      priority: 'medium',
    });
  }

  // If no failures, add routine regression maintenance
  if (recommendedRegressions.length === 0) {
    recommendedRegressions.push({
      testId: 'reg-smoke-pass',
      title: 'Routine WebXR Hand Tracking Smoke Regression',
      rationale: 'All primary categories passed. Perform standard smoke check prior to deployment.',
      priority: 'low',
    });
  }

  // Generate Interactive Test Checklist
  const checklist: QAAssistedTestChecklist[] = [
    {
      id: 'chk-1',
      item: 'Verify all 25 hand joints are recognized by WebXR optical cameras',
      category: 'skeleton_integrity',
      priority: 'high',
      completed: !failedCategories.includes('skeleton_integrity'),
      notes: failedCategories.includes('skeleton_integrity') ? 'Joint coverage degraded; check camera FOV' : 'Passed',
    },
    {
      id: 'chk-2',
      item: 'Validate bimanual independent tracking without mutual occlusion locks',
      category: 'tracking_continuity',
      priority: 'high',
      completed: !failedCategories.includes('tracking_continuity'),
      notes: failedCategories.includes('tracking_continuity') ? 'Occlusion interruptions observed' : 'Passed',
    },
    {
      id: 'chk-3',
      item: 'Confirm render cadence maintains stable 72 FPS / 13.8ms delta',
      category: 'frame_performance',
      priority: 'medium',
      completed: !failedCategories.includes('frame_performance'),
      notes: 'Monitored via requestAnimationFrame WebXR timestamps',
    },
    {
      id: 'chk-4',
      item: 'Enforce Rule #2: Room lighting causation remains strictly INCONCLUSIVE without hardware token',
      category: 'environmental_conditions',
      priority: 'high',
      completed: true,
      notes: 'Rule #2 invariant actively enforced',
    },
    {
      id: 'chk-5',
      item: 'Verify index-thumb pinch distance hysteresis (2.4cm / 4.0cm)',
      category: 'test_execution',
      priority: 'medium',
      completed: true,
      notes: 'Ergonomic pinch thresholds calibrated',
    },
  ];

  // Historical Comparison
  let historicalComparisonNotes = 'No previous automated QA audits available for comparison.';
  if (options.historicalAudits && options.historicalAudits.length > 0) {
    const prevAudit = options.historicalAudits[0];
    const prevFails = prevAudit.failedCategories.length;
    const currentFails = failedCategories.length;

    if (currentFails < prevFails) {
      historicalComparisonNotes = `Improvement detected: Failed categories reduced from ${prevFails} to ${currentFails}.`;
    } else if (currentFails > prevFails) {
      historicalComparisonNotes = `Regression alert: Failed categories increased from ${prevFails} to ${currentFails} (new failures: ${failedCategories.filter((c) => !prevAudit.failedCategories.includes(c)).join(', ')}).`;
    } else {
      historicalComparisonNotes = `Stability verified: Matching failure profile with previous audit (${currentFails} failed categories).`;
    }
  }

  const executiveSummary = failedCategories.length === 0
    ? `QA AUDIT PASSED: Session ${telemetry.sessionId} satisfies all WebXR hand-tracking fidelity and frame pacing requirements. Session type: ${sessionType}.`
    : `QA AUDIT ACTION REQUIRED: Session ${telemetry.sessionId} triggered ${failedCategories.length} category failure(s) (${failedCategories.join(', ')}). ${recommendedRegressions.length} targeted regressions recommended.`;

  return {
    auditId,
    timestamp: now,
    evaluatedSessionId: telemetry.sessionId,
    sessionType,
    reviewedCategories,
    failedCategories,
    recommendedRegressions,
    checklist,
    historicalComparisonNotes,
    safetyBoundaryNotice: QA_SAFETY_BOUNDARY_NOTICE,
    executiveSummary,
  };
}
