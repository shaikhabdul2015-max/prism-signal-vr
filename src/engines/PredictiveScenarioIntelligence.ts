/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 25: Predictive Scenario Intelligence.
 * Projects 3-tier multi-horizon system trajectories (Best-Case, Expected, Worst-Case)
 * by integrating empirical physical telemetry and Digital Twin simulations.
 * 
 * CRITICAL SAFETY NOTICE:
 * All scenario projections are strictly labelled as simulated data (`isSimulatedData: true`)
 * and are clearly distinguished from physical hardware measurements.
 */

import { VRTelemetry } from '../types/diagnostics';
import {
  ScenarioComparisonReport,
  ScenarioProjection,
} from '../types/phase25';
import { digitalTwinEngine } from '../utils/DigitalTwinEngine';

export class PredictiveScenarioIntelligence {
  private static instance: PredictiveScenarioIntelligence | null = null;
  private pastReports: ScenarioComparisonReport[] = [];

  private constructor() {}

  public static getInstance(): PredictiveScenarioIntelligence {
    if (!PredictiveScenarioIntelligence.instance) {
      PredictiveScenarioIntelligence.instance = new PredictiveScenarioIntelligence();
    }
    return PredictiveScenarioIntelligence.instance;
  }

  public static resetInstance(): void {
    PredictiveScenarioIntelligence.instance = null;
  }

  /**
   * Generate 3-tier predictive scenario trajectories based on current telemetry and digital twin state
   */
  public generateScenarioProjections(telemetry: VRTelemetry): ScenarioComparisonReport {
    const nowIso = new Date().toISOString();

    // Baseline telemetry (Physical or current operational)
    const currentFrameMs = telemetry.frames?.[0]?.frameDurationMs || 13.88;
    const currentFps = Math.max(30, Math.min(120, Math.round(1000 / currentFrameMs)));
    const currentLatency = telemetry.latencySamples?.[0]?.latencyMs || currentFrameMs;

    // Digital twin simulation snapshot
    let twinChecksum = 'twin-default-checksum';
    let simLightingLux = 450;
    try {
      const snap = digitalTwinEngine.getSnapshot();
      if (snap) {
        twinChecksum = snap.checksum || 'twin-active-checksum';
        if (snap.environment) {
          simLightingLux = snap.environment.ambientLux ?? 450;
        }
      }
    } catch {
      // Safe fallback
    }

    // 1. Best-Case Scenario
    const bestCase: ScenarioProjection = {
      type: 'BEST_CASE',
      probability: 0.3,
      projectedFps: Math.min(90, Math.round(currentFps * 1.15)),
      projectedLatencyMs: Number(Math.max(9.0, currentLatency * 0.82).toFixed(1)),
      projectedIncidentProbability: 0.04,
      projectedJointDriftMm: 1.2,
      description: 'Optimal hardware thermal conditions and nominal ambient lux maintain smooth render cadence.',
      keyAssumptions: [
        'DRS dynamically scales viewport to sustain 72+ FPS',
        `Ambient lighting maintains stable lux (${simLightingLux} lux)`,
        'No concurrent background test stress spikes',
      ],
      mitigationStrategies: ['Maintain current active governor and DRS calibration'],
      isSimulatedData: true,
    };

    // 2. Expected Scenario
    const expected: ScenarioProjection = {
      type: 'EXPECTED',
      probability: 0.55,
      projectedFps: currentFps,
      projectedLatencyMs: Number(currentLatency.toFixed(1)),
      projectedIncidentProbability: 0.12,
      projectedJointDriftMm: 2.8,
      description: 'System continues along current empirical baseline trajectory with minor standard deviation drift.',
      keyAssumptions: [
        'Continuous 72Hz display refresh',
        'Standard skeletal tracking occlusion rate (~2% per minute)',
      ],
      mitigationStrategies: [
        'Apply Kalman filter smoothing for minor joint jitter',
        'Monitor GPU memory headroom',
      ],
      isSimulatedData: true,
    };

    // 3. Worst-Case Scenario
    const worstCase: ScenarioProjection = {
      type: 'WORST_CASE',
      probability: 0.15,
      projectedFps: Math.max(36, Math.round(currentFps * 0.65)),
      projectedLatencyMs: Number((currentLatency * 1.65).toFixed(1)),
      projectedIncidentProbability: 0.48,
      projectedJointDriftMm: 8.5,
      description: 'Thermal throttling compounded by sudden ambient darkness or camera occlusion drops cadence below 45 FPS.',
      keyAssumptions: [
        'Severe frame drops triggering user disorientation in headset',
        'Skeletal joint tracking lock drops below 18/25 joints',
      ],
      mitigationStrategies: [
        'Pre-arm DRS 50% fallback step',
        'Pre-cache synthetic skeleton poses for graceful interpolation',
        'Enforce Rule #2: mark hardware metrics INCONCLUSIVE if dropped packets occur',
      ],
      isSimulatedData: true,
    };

    // Volatility Index: relative spread between best and worst case FPS and latency
    const fpsSpread = (bestCase.projectedFps - worstCase.projectedFps) / expected.projectedFps;
    const latencySpread = (worstCase.projectedLatencyMs - bestCase.projectedLatencyMs) / expected.projectedLatencyMs;
    const volatilityIndex = Number(Math.min(1.0, Math.max(0.0, (fpsSpread + latencySpread) / 3.0)).toFixed(3));

    let recommendedAction = 'Nominal status: keep current operational setpoints.';
    if (volatilityIndex > 0.4) {
      recommendedAction = 'Elevated volatility: pre-arm DRS step-down and request operator verification.';
    }

    const report: ScenarioComparisonReport = {
      timestamp: nowIso,
      projections: {
        bestCase,
        expected,
        worstCase,
      },
      volatilityIndex,
      recommendedAction,
      activeDigitalTwinChecksum: twinChecksum,
    };

    this.pastReports.unshift(report);
    if (this.pastReports.length > 20) {
      this.pastReports.pop();
    }

    return report;
  }

  public getLatestReport(): ScenarioComparisonReport | null {
    return this.pastReports[0] || null;
  }

  public getAllReports(): ScenarioComparisonReport[] {
    return [...this.pastReports];
  }
}

export const predictiveScenarioIntelligence = PredictiveScenarioIntelligence.getInstance();
