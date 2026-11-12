import { VRTelemetry } from '../types/diagnostics';
import {
  PredictiveDiagnosticsReport,
  PredictiveAnomalyAlert,
  PredictiveFailureRisk,
} from '../types/phase15';

export const PREDICTIVE_DISCLAIMER =
  'PREDICTIVE DIAGNOSTICS DISCLAIMER: These indicators are statistical and heuristic forecasts of potential degradation based on telemetry trends. They do not constitute confirmed physical hardware failures or verified hardware faults.';

/**
 * AI Predictive Failure Detection Engine
 * Inspects real-time and historical telemetry to forecast tracking instability,
 * joint degradation, frame pacing anomalies, and recovery lag.
 */
export function analyzePredictiveFailures(
  telemetry: VRTelemetry,
  historicalTelemetry: VRTelemetry[] = []
): PredictiveDiagnosticsReport {
  const alerts: PredictiveAnomalyAlert[] = [];
  const now = new Date().toISOString();

  // 1. Joint Confidence Degradation Analysis
  const joints = telemetry.joints || [];
  const trackedJoints = joints.filter((j) => j.tracked);
  const confidences = trackedJoints
    .map((j) => j.confidence)
    .filter((c): c is number => typeof c === 'number' && !isNaN(c));

  const avgConfidence = confidences.length > 0
    ? confidences.reduce((sum, c) => sum + c, 0) / confidences.length
    : 0;

  const lowConfidenceCount = confidences.filter((c) => c < 0.75).length;

  if (lowConfidenceCount > 4) {
    alerts.push({
      id: `pred-conf-${Date.now()}-1`,
      category: 'confidence_degradation',
      riskLevel: lowConfidenceCount > 8 ? 'high' : 'moderate',
      title: 'Imminent Optical Tracking Dropout Risk',
      description: `${lowConfidenceCount} active joints exhibit degraded optical confidence (< 0.75). Pose estimation accuracy is deteriorating.`,
      predictedImpact: 'Hand skeleton may disconnect or lose distal finger tips within 1.5–3.0 seconds if occlusion continues.',
      confidenceScore: Math.min(0.92, 0.5 + lowConfidenceCount * 0.05),
      isPrediction: true,
      evidenceData: {
        averageConfidence: Math.round(avgConfidence * 100) / 100,
        lowConfidenceCount,
        totalTrackedJoints: trackedJoints.length,
      },
      suggestedRemediation: 'Rotate hand into direct optical line-of-sight of tracking cameras and uncurl fingers.',
      timestamp: now,
    });
  }

  // 2. Tracking Instability & Loss History
  const trackingEvents = telemetry.trackingEvents || [];
  const interruptions = trackingEvents.filter((e) => !e.tracking).length;
  const recentInterruptionsInHistory = historicalTelemetry.reduce((acc, h) => {
    return acc + (h.trackingEvents?.filter((e) => !e.tracking).length || 0);
  }, 0);

  const totalObservedLosses = interruptions + recentInterruptionsInHistory;

  if (totalObservedLosses >= 3) {
    alerts.push({
      id: `pred-instability-${Date.now()}-2`,
      category: 'tracking_instability',
      riskLevel: totalObservedLosses > 6 ? 'critical' : 'high',
      title: 'Elevated Tracking Dropout Frequency',
      description: `Observed ${totalObservedLosses} optical tracking loss events across current and recent telemetry frames.`,
      predictedImpact: 'Player hand interactions (crystal grasping, raycasting) will experience recurring positional snap-back.',
      confidenceScore: Math.min(0.95, 0.6 + totalObservedLosses * 0.04),
      isPrediction: true,
      evidenceData: {
        currentSessionLosses: interruptions,
        historicalLosses: recentInterruptionsInHistory,
        totalLosses: totalObservedLosses,
      },
      suggestedRemediation: 'Check for physical hand-crossing boundaries; maintain separate optical interaction paths for left and right hands.',
      timestamp: now,
    });
  }

  // 3. Frame Timing Anomalies & Cadence Pacing
  const frames = telemetry.frames || [];
  const frameDurations = frames
    .map((f) => f.frameDurationMs)
    .filter((d): d is number => typeof d === 'number' && !isNaN(d) && d > 0);

  let frameVariance = 0;
  if (frameDurations.length > 1) {
    const mean = frameDurations.reduce((a, b) => a + b, 0) / frameDurations.length;
    const squaredDiffs = frameDurations.map((d) => Math.pow(d - mean, 2));
    frameVariance = squaredDiffs.reduce((a, b) => a + b, 0) / squaredDiffs.length;
  }

  const droppedFramesCount = frames.filter((f) => f.dropped).length;

  if (droppedFramesCount > 0 || frameVariance > 18.0) {
    alerts.push({
      id: `pred-frame-${Date.now()}-3`,
      category: 'frame_timing_anomaly',
      riskLevel: droppedFramesCount > 3 || frameVariance > 40.0 ? 'high' : 'moderate',
      title: 'Render Loop Pacing Jitter Forecast',
      description: `Frame duration variance is ${frameVariance.toFixed(1)}ms² with ${droppedFramesCount} dropped frames detected.`,
      predictedImpact: 'Micro-stutter in hand visual representations, leading to perceived input lag during fast hand gestures.',
      confidenceScore: Math.min(0.88, 0.55 + frameVariance * 0.01),
      isPrediction: true,
      evidenceData: {
        frameVarianceMs2: Math.round(frameVariance * 10) / 10,
        droppedFramesCount,
        sampleCount: frameDurations.length,
      },
      suggestedRemediation: 'Throttle background canvas post-processing or optimize dynamic reflection passes in Three.js scene.',
      timestamp: now,
    });
  }

  // 4. Latency Spikes
  const latencySamples = telemetry.latencySamples || [];
  const latencies = latencySamples
    .map((s) => s.latencyMs)
    .filter((l): l is number => typeof l === 'number' && !isNaN(l) && l > 0);

  const maxLatency = latencies.length > 0 ? Math.max(...latencies) : 0;
  const avgLatency = latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;

  if (maxLatency > 28.0) {
    alerts.push({
      id: `pred-lat-${Date.now()}-4`,
      category: 'latency_spike',
      riskLevel: maxLatency > 40.0 ? 'critical' : 'moderate',
      title: 'Immersive Comfort Latency Spike Risk',
      description: `Peak frame delta reached ${maxLatency.toFixed(1)}ms (average: ${avgLatency.toFixed(1)}ms). Exceeds nominal VR comfort pacing.`,
      predictedImpact: 'Increased risk of visual disorientation or vestibulo-ocular mismatch during rapid head movements.',
      confidenceScore: 0.85,
      isPrediction: true,
      evidenceData: {
        maxLatencyMs: Math.round(maxLatency * 10) / 10,
        avgLatencyMs: Math.round(avgLatency * 10) / 10,
        thresholdMs: 28.0,
      },
      suggestedRemediation: 'Decouple hand joint sample loop from heavy CPU-bound raycasting calculations.',
      timestamp: now,
    });
  }

  // 5. Recovery Lag & Hysteresis Pattern
  const recoveryTimeThresholdMs = telemetry.thresholds?.maxRecoveryTimeMs ?? 100;
  const recoveryLagEstimate = totalObservedLosses > 0 ? Math.min(250, totalObservedLosses * 25) : 15;

  if (recoveryLagEstimate > recoveryTimeThresholdMs) {
    alerts.push({
      id: `pred-recov-${Date.now()}-5`,
      category: 'recovery_lag',
      riskLevel: 'moderate',
      title: 'Extended Tracking Re-acquisition Lag',
      description: `Projected joint recovery lag (${recoveryLagEstimate}ms) exceeds the target limit (${recoveryTimeThresholdMs}ms).`,
      predictedImpact: 'Hands take longer than expected to reappear after momentary optical occlusion.',
      confidenceScore: 0.78,
      isPrediction: true,
      evidenceData: {
        projectedRecoveryLagMs: recoveryLagEstimate,
        thresholdMs: recoveryTimeThresholdMs,
      },
      suggestedRemediation: 'Ensure jump-prevention smoothing filter uses adaptive exponential decay upon re-acquisition.',
      timestamp: now,
    });
  }

  // Overall Health Score (0 - 100)
  let healthScore = 100;
  alerts.forEach((alert) => {
    if (alert.riskLevel === 'critical') healthScore -= 30;
    else if (alert.riskLevel === 'high') healthScore -= 20;
    else if (alert.riskLevel === 'moderate') healthScore -= 10;
    else if (alert.riskLevel === 'low') healthScore -= 5;
  });
  healthScore = Math.max(10, Math.min(100, healthScore));

  let overallRisk: PredictiveFailureRisk = 'nominal';
  if (healthScore < 45 || alerts.some((a) => a.riskLevel === 'critical')) {
    overallRisk = 'critical';
  } else if (healthScore < 65 || alerts.some((a) => a.riskLevel === 'high')) {
    overallRisk = 'high';
  } else if (healthScore < 85 || alerts.length > 0) {
    overallRisk = 'moderate';
  } else if (healthScore < 95) {
    overallRisk = 'low';
  }

  return {
    overallRisk,
    healthScore,
    alerts,
    disclaimer: PREDICTIVE_DISCLAIMER,
    generatedAt: now,
    telemetryMetrics: {
      instabilityIndex: totalObservedLosses * 12.5,
      averageConfidence: Math.round(avgConfidence * 100) / 100,
      frameTimingVariance: Math.round(frameVariance * 10) / 10,
      latencyJitterMs: Math.round(Math.max(0, maxLatency - avgLatency) * 10) / 10,
      predictedRecoveryLagMs: recoveryLagEstimate,
    },
  };
}
