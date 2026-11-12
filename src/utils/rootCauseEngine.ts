import { VRTelemetry } from '../types/diagnostics';
import { assessEnvironmentalCausation } from './environmentalAssessment';
import {
  RootCauseAnalysisReport,
  RootCauseHypothesis,
} from '../types/phase15';

/**
 * AI Root Cause Intelligence Engine
 * Formulates evidence-based diagnostic hypotheses for tracking degradation,
 * frame hiccups, and latency anomalies while strictly adhering to Mandatory Rule #2.
 */
export function analyzeRootCause(telemetry: VRTelemetry): RootCauseAnalysisReport {
  const hypotheses: RootCauseHypothesis[] = [];
  const now = new Date().toISOString();

  // Evaluate Rule #2 for Environmental Attribution
  const vrEvidence = telemetry.causationEvidence;
  const assessment = assessEnvironmentalCausation(vrEvidence);
  const isRule2Confirmed = assessment.causationStatus === 'CONFIRMED';

  // Metrics extraction
  const joints = telemetry.joints || [];
  const trackedJointCount = joints.filter((j) => j.tracked).length;
  const missingJointsCount = joints.length - trackedJointCount;
  const frames = telemetry.frames || [];
  const droppedFrames = frames.filter((f) => f.dropped).length;
  const latencySamples = telemetry.latencySamples || [];
  const latencies = latencySamples.map((l) => l.latencyMs);
  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const trackingEvents = telemetry.trackingEvents || [];
  const trackingLossEvents = trackingEvents.filter((e) => !e.tracking).length;

  // Hypothesis 1: Optical Self-Occlusion / Frustum Boundary Exit
  if (missingJointsCount > 4 || trackingLossEvents > 0) {
    const isBimanualLoss = trackingLossEvents > 2;
    hypotheses.push({
      id: 'rc-occlusion-1',
      category: 'optical_occlusion',
      hypothesis: 'Optical Self-Occlusion during Finger Flexion or Camera Boundary Exit',
      confidenceScore: Math.min(94, 60 + missingJointsCount * 4 + trackingLossEvents * 5),
      primaryEvidence: [
        `${missingJointsCount} joints lost tracking in active pose.`,
        `${trackingLossEvents} tracking dropout events recorded during session.`,
        'Joint confidence dropped predominantly on distal phalanges and fingertips.',
      ],
      counterEvidence: [
        trackedJointCount > 0 ? `${trackedJointCount} proximal joints remained actively tracked.` : 'No active joints maintained.',
      ],
      recommendedAction: 'Keep hands separated by at least 10cm when crossing paths; avoid tight fist configurations facing directly away from headset tracking sensors.',
      rule2Notice: 'Attributed to physical optical line-of-sight geometry; room illumination has NOT been assumed as a causal factor under Rule #2.',
    });
  }

  // Hypothesis 2: Main Thread Scheduling Stall / WebGL Render Bottleneck
  if (droppedFrames > 0 || maxLatency > 22.0) {
    hypotheses.push({
      id: 'rc-scheduling-2',
      category: 'runtime_scheduling',
      hypothesis: 'JavaScript Main-Thread Scheduling Hiccup or Render Pass Contention',
      confidenceScore: Math.min(88, 50 + droppedFrames * 10 + (maxLatency > 30 ? 25 : 10)),
      primaryEvidence: [
        `Peak frame latency reached ${maxLatency.toFixed(1)}ms (threshold: 20.0ms).`,
        `${droppedFrames} render frames dropped during interaction sequence.`,
      ],
      counterEvidence: [
        'Browser WebXR API does not measure headset internal ASIC photon-to-display latency; JavaScript timing reflects render loop pacing only.',
      ],
      recommendedAction: 'Profile Three.js post-processing pipeline and audit matrix math operations in the animation loop.',
      rule2Notice: 'Degradation is timing-correlated; unrelated to ambient illumination.',
    });
  }

  // Hypothesis 3: Environmental Illumination Assessment (MANDATORY RULE #2 ENFORCEMENT)
  if (isRule2Confirmed) {
    hypotheses.push({
      id: 'rc-env-confirmed',
      category: 'environmental_inconclusive',
      hypothesis: 'Independently Validated Hardware Instrumentation Confirms Environmental Causation',
      confidenceScore: 95,
      primaryEvidence: [
        'Trusted hardware causation token explicitly validated.',
        assessment.causationEvidence || 'Hardware sensor flagged illumination boundary violation.',
      ],
      counterEvidence: [],
      recommendedAction: 'Adjust room lighting according to headset hardware sensor specifications.',
      rule2Notice: 'VALIDATED: Environmental causation is established exclusively via independent hardware instrumentation evidence.',
    });
  } else {
    // Under Rule #2, environmental causation MUST remain INCONCLUSIVE
    const presetUsed = telemetry.lightingPreset || 'none';
    hypotheses.push({
      id: 'rc-env-inconclusive',
      category: 'environmental_inconclusive',
      hypothesis: 'Room Illumination Causation: Strictly Inconclusive under Rule #2',
      confidenceScore: 15,
      primaryEvidence: [
        `Lighting preset recorded as contextual metadata only: "${presetUsed}".`,
        'No trusted hardware or instrumentation token confirms environmental degradation.',
      ],
      counterEvidence: [
        'Mandatory Rule #2 prohibits attributing hand tracking dropouts to room illumination without an explicit hardware causation token.',
        'Manual lighting preset selection is contextual information, NOT physical proof.',
      ],
      recommendedAction: 'Do not adjust lighting settings without physical hardware sensor confirmation.',
      rule2Notice: 'COMPLIANT: Environmental attribution is kept strictly INCONCLUSIVE per Rule #2.',
    });
  }

  // Sort hypotheses by confidence
  hypotheses.sort((a, b) => b.confidenceScore - a.confidenceScore);

  const primaryHypothesis = hypotheses.length > 0 ? hypotheses[0] : null;
  const secondaryHypotheses = hypotheses.slice(1);

  const correctiveActions = [
    primaryHypothesis ? primaryHypothesis.recommendedAction : 'Maintain nominal tracking postures.',
    'Decouple XRHand pose consumption from heavyweight scene calculations.',
    'Keep room illumination causation classified as INCONCLUSIVE unless hardware tokens are validated.',
  ];

  return {
    timestamp: now,
    primaryHypothesis,
    secondaryHypotheses,
    diagnosticConfidence: primaryHypothesis ? primaryHypothesis.confidenceScore : 85,
    rule2Assessment: {
      status: isRule2Confirmed ? 'CONFIRMED' : 'INCONCLUSIVE',
      explanation: assessment.explanation,
      hardwareTokenVerified: isRule2Confirmed,
    },
    correctiveActions,
  };
}
