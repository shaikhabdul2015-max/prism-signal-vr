/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strategic Scenario Analyzer (Phase 27)
 * Evaluates multi-tier predictive scenarios across 4 operational profiles:
 * - BEST_CASE: Peak throughput, optimal sensor conditions, nominal power.
 * - EXPECTED: Realistic trajectory extrapolated from current telemetry trends.
 * - WORST_CASE: Cascading occlusion, thermal throttling, elevated latency, incident escalation.
 * - ALTERNATIVE_PATH: Constrained fallback safe-mode preserving stability over fidelity.
 * 
 * CRITICAL RULE: All scenario evaluations, digital twin extrapolations, and synthetic
 * counterfactuals MUST be explicitly labeled with `isSimulatedData: true`.
 */

import {
  StrategicScenario,
  ScenarioAnalysisReport,
} from '../types/phase27';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';

export class StrategicScenarioAnalyzer {
  private static instance: StrategicScenarioAnalyzer | null = null;
  private latestReport: ScenarioAnalysisReport | null = null;

  private constructor() {}

  public static getInstance(): StrategicScenarioAnalyzer {
    if (!StrategicScenarioAnalyzer.instance) {
      StrategicScenarioAnalyzer.instance = new StrategicScenarioAnalyzer();
    }
    return StrategicScenarioAnalyzer.instance;
  }

  public static resetInstance(): void {
    StrategicScenarioAnalyzer.instance = null;
  }

  /**
   * Evaluates comprehensive multi-horizon scenarios based on active telemetry and incidents.
   * All projected values are clearly labeled with `isSimulatedData: true`.
   */
  public evaluateScenarios(
    objectiveId: string = 'obj-imm-telemetry',
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[]
  ): ScenarioAnalysisReport {
    // Current telemetry baseline
    let currentFps = 72;
    let currentLatency = 13.5;
    let droppedFrameRatio = 0.02;

    if (telemetry && telemetry.frames.length > 0) {
      const avg =
        telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / telemetry.frames.length;
      currentFps = avg > 0 ? 1000 / avg : 72;
      const droppedCount = telemetry.frames.filter((f) => f.dropped).length;
      droppedFrameRatio = droppedCount / telemetry.frames.length;
    }

    if (telemetry && telemetry.latencySamples.length > 0) {
      currentLatency =
        telemetry.latencySamples.reduce((a, s) => a + s.latencyMs, 0) /
        telemetry.latencySamples.length;
    }

    const openIncidents = (activeIncidents || []).filter(
      (i) => i.state !== 'RESOLVED' && i.state !== 'CLOSED'
    );
    const incidentPressure = openIncidents.length;

    // 1. BEST CASE SCENARIO (Simulated)
    const bestCase: StrategicScenario = {
      id: `scen-best-${Date.now()}`,
      type: 'BEST_CASE',
      name: 'Optimal Throughput & Thermal Symmetry',
      description: 'Ideal optical tracking conditions, minimal thermal resistance, and sub-12ms render loop.',
      probability: Math.max(15, Math.min(45, 40 - incidentPressure * 8)),
      projectedCadenceFps: 90.0,
      projectedLatencyMs: Math.max(9.0, currentLatency * 0.75),
      projectedIncidentLikelihood: 3.5,
      resourceEfficiencyScore: 94.0,
      cascadingRisks: ['Thermal spike if peak 90Hz held > 45 minutes'],
      isSimulatedData: true,
      counterfactualParameters: {
        clockMultiplier: 1.15,
        opticalConfidenceFloor: 0.98,
        thermalHeadroomDegC: 18.0,
      },
      recommendation: 'Engage full 25-joint 90Hz predictive tracking for precision spatial manipulation.',
      estimatedSurvivalProbability: 98.0,
    };

    // 2. EXPECTED CASE SCENARIO (Simulated)
    const expectedCase: StrategicScenario = {
      id: `scen-expected-${Date.now()}`,
      type: 'EXPECTED',
      name: 'Nominal Operational Continuum',
      description: 'Expected operational path matching current real-time telemetry and typical environmental jitter.',
      probability: Math.max(45, Math.min(75, 60 - incidentPressure * 4)),
      projectedCadenceFps: Math.round(currentFps),
      projectedLatencyMs: Number(currentLatency.toFixed(1)),
      projectedIncidentLikelihood: Math.min(40, 10 + incidentPressure * 10),
      resourceEfficiencyScore: 84.0,
      cascadingRisks: incidentPressure > 0 ? ['Elevated queue delay', 'Potential joint occlusion'] : ['Minor frame latency ripple'],
      isSimulatedData: true,
      counterfactualParameters: {
        clockMultiplier: 1.0,
        opticalConfidenceFloor: 0.90,
        thermalHeadroomDegC: 12.0,
      },
      recommendation: 'Sustain balanced 72Hz cadence with active Rule #2 inconclusive verification.',
      estimatedSurvivalProbability: 91.0,
    };

    // 3. WORST CASE SCENARIO (Simulated)
    const worstCase: StrategicScenario = {
      id: `scen-worst-${Date.now()}`,
      type: 'WORST_CASE',
      name: 'Cascading Thermal & Sensor Degradation',
      description: 'Severe multi-joint occlusion, thermal throttle down to 45Hz, and unmitigated incident propagation.',
      probability: Math.min(40, Math.max(10, 12 + incidentPressure * 12 + (droppedFrameRatio > 0.05 ? 10 : 0))),
      projectedCadenceFps: Math.min(50, Math.max(30, currentFps * 0.65)),
      projectedLatencyMs: Math.max(28.0, currentLatency * 1.8),
      projectedIncidentLikelihood: Math.min(85, 45 + incidentPressure * 15),
      resourceEfficiencyScore: 42.0,
      cascadingRisks: [
        'Complete spatial disorientation risk for operator',
        'Loss of 25-joint skeleton locking',
        'Deadlock in multi-agent consensus queue',
      ],
      isSimulatedData: true,
      counterfactualParameters: {
        clockMultiplier: 0.70,
        opticalConfidenceFloor: 0.60,
        thermalHeadroomDegC: 2.0,
      },
      recommendation: 'Trigger automated fallback safe-mode and isolate non-essential analytics workers.',
      estimatedSurvivalProbability: 64.0,
    };

    // 4. ALTERNATIVE PATH SCENARIO (Simulated)
    const alternativePath: StrategicScenario = {
      id: `scen-alt-${Date.now()}`,
      type: 'ALTERNATIVE_PATH',
      name: 'Conservation Core Safe-Mode Fallback',
      description: 'Capped 60Hz update cadence with synthetic joint interpolation, slashing power draw by 35%.',
      probability: 30.0,
      projectedCadenceFps: 60.0,
      projectedLatencyMs: 16.5,
      projectedIncidentLikelihood: 12.0,
      resourceEfficiencyScore: 91.0,
      cascadingRisks: ['Slightly reduced forward kinematics fidelity on fast limb gestures'],
      isSimulatedData: true,
      counterfactualParameters: {
        clockMultiplier: 0.85,
        opticalConfidenceFloor: 0.88,
        thermalHeadroomDegC: 15.0,
      },
      recommendation: 'Adopt if incident pressure persists > 5 minutes or ambient thermal load exceeds threshold.',
      estimatedSurvivalProbability: 95.0,
    };

    const scenarios = [bestCase, expectedCase, worstCase, alternativePath];

    // Determine recommended scenario
    let recommendedId = expectedCase.id;
    if (incidentPressure >= 2 || currentFps < 50) {
      recommendedId = alternativePath.id;
    } else if (incidentPressure === 0 && currentFps >= 75 && currentLatency <= 12) {
      recommendedId = bestCase.id;
    }

    // Divergence index: difference between best and worst projections
    const divergenceIndex = Math.min(
      100,
      Math.round(
        Math.abs(bestCase.projectedCadenceFps - worstCase.projectedCadenceFps) +
          Math.abs(worstCase.projectedLatencyMs - bestCase.projectedLatencyMs) * 1.5
      )
    );

    const report: ScenarioAnalysisReport = {
      id: `report-scen-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      evaluatedObjectiveId: objectiveId,
      scenarios,
      recommendedScenarioId: recommendedId,
      divergenceIndex,
      sensitivityAnalysis: {
        latencySensitivity: currentLatency > 18 ? 'HIGH' : currentLatency > 14 ? 'MODERATE' : 'LOW',
        thermalPressureImpact: currentFps < 60 ? 'Thermal throttling imminent' : 'Nominal dissipation margin (>10°C)',
        framerateResilience: droppedFrameRatio < 0.03 ? 'Robust cadence hold' : 'Vulnerable to buffer underrun',
      },
      isSimulatedData: true,
    };

    this.latestReport = report;
    return report;
  }

  public getLatestReport(): ScenarioAnalysisReport | null {
    return this.latestReport;
  }
}

export const strategicScenarioAnalyzer = StrategicScenarioAnalyzer.getInstance();
