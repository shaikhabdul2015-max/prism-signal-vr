/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Predictive Risk Assessment Engine (Phase 33)
 * Synthesizes forward-looking operational and cybersecurity risk forecasts by combining
 * real-time telemetry indicators with Phase 32 Zero-Trust and AI threat detection events.
 * Emits early-warning signals before potential system degradation occurs.
 */

import {
  PredictiveRiskIndicator,
  RiskSeverity,
  TrendDirection,
} from '../types/phase33';
import { ZeroTrustSecurityEngine } from './ZeroTrustSecurityEngine';
import { AIThreatDetectionEngine } from './AIThreatDetectionEngine';
import { DistributedEventBus } from './DistributedEventBus';

export class PredictiveRiskAssessmentEngine {
  private static instance: PredictiveRiskAssessmentEngine | null = null;
  private riskIndicators: Map<string, PredictiveRiskIndicator> = new Map();
  private listeners: Set<(risks: PredictiveRiskIndicator[]) => void> = new Set();

  public constructor() {
    this.seedDefaultRisks();
  }

  public static getInstance(): PredictiveRiskAssessmentEngine {
    if (!PredictiveRiskAssessmentEngine.instance) {
      PredictiveRiskAssessmentEngine.instance = new PredictiveRiskAssessmentEngine();
    }
    return PredictiveRiskAssessmentEngine.instance;
  }

  public static resetInstance(): void {
    PredictiveRiskAssessmentEngine.instance = null;
  }

  private seedDefaultRisks(): void {
    const seeds: PredictiveRiskIndicator[] = [
      {
        riskId: 'risk-cadence-01',
        category: 'CADENCE_STALL',
        severity: 'LOW',
        currentRiskScore: 12,
        projectedRiskScore30s: 15,
        projectedRiskScore60s: 18,
        trend: 'STABLE',
        earlyWarningTriggered: false,
        warningThreshold: 60,
        triggerFactors: ['Nominal 72 FPS rendering cadence with zero dropped frames'],
        mitigationSteps: ['Monitor Three.js shader compilation time', 'Maintain adaptive mesh LODs'],
        assessedAt: new Date().toISOString(),
      },
      {
        riskId: 'risk-tracking-02',
        category: 'TRACKING_LOSS',
        severity: 'LOW',
        currentRiskScore: 10,
        projectedRiskScore30s: 12,
        projectedRiskScore60s: 14,
        trend: 'STABLE',
        earlyWarningTriggered: false,
        warningThreshold: 55,
        triggerFactors: ['Bimanual hand skeleton verified with 25 intact joints'],
        mitigationSteps: ['Position hands in center camera FOV', 'Maintain static palm orientation during alignment'],
        assessedAt: new Date().toISOString(),
      },
      {
        riskId: 'risk-security-03',
        category: 'SECURITY_BREACH',
        severity: 'INFO',
        currentRiskScore: 5,
        projectedRiskScore30s: 5,
        projectedRiskScore60s: 5,
        trend: 'STABLE',
        earlyWarningTriggered: false,
        warningThreshold: 50,
        triggerFactors: ['Zero-Trust default-deny verified across all active requests'],
        mitigationSteps: ['Periodic session token rotation', 'Continuous agent capability verification'],
        assessedAt: new Date().toISOString(),
      },
      {
        riskId: 'risk-resonance-04',
        category: 'RESONANCE_DESTABILIZATION',
        severity: 'LOW',
        currentRiskScore: 15,
        projectedRiskScore30s: 20,
        projectedRiskScore60s: 22,
        trend: 'STABLE',
        earlyWarningTriggered: false,
        warningThreshold: 65,
        triggerFactors: ['Crystal harmonics aligned within 98.4% phase accuracy'],
        mitigationSteps: ['Rotate Ruby Core crystal along primary Y-axis to damp harmonic jitter'],
        assessedAt: new Date().toISOString(),
      },
    ];

    for (const r of seeds) {
      this.riskIndicators.set(r.riskId, r);
    }
  }

  /**
   * Assesses forward-looking risk by inspecting Phase 32 security states and telemetry forecasts.
   */
  public evaluatePredictiveRisks(params?: {
    currentFps?: number;
    trackedJoints?: number;
    latencyMs?: number;
  }): PredictiveRiskIndicator[] {
    const nowStr = new Date().toISOString();
    const fps = params?.currentFps ?? 72;
    const joints = params?.trackedJoints ?? 25;
    const latency = params?.latencyMs ?? 13.8;

    // Check Phase 32 Threat Detection & Zero-Trust
    const threatEngine = AIThreatDetectionEngine.getInstance();
    const threats = threatEngine.getAllThreats();
    const activeThreats = threats.filter((t) => !t.mitigated);

    // 1. Evaluate Cadence Risk
    const cadenceRisk = this.riskIndicators.get('risk-cadence-01')!;
    if (fps < 55) {
      cadenceRisk.currentRiskScore = 75;
      cadenceRisk.projectedRiskScore30s = 85;
      cadenceRisk.severity = 'HIGH';
      cadenceRisk.trend = 'RISING';
      cadenceRisk.earlyWarningTriggered = true;
      cadenceRisk.triggerFactors = [`Frame rate dropped to ${fps} FPS (<55 target)`];
      cadenceRisk.mitigationSteps = ['Throttle particle density', 'Disable dynamic crystal reflections'];
    } else {
      cadenceRisk.currentRiskScore = Math.max(5, Math.round((72 - fps) * 2 + 10));
      cadenceRisk.projectedRiskScore30s = cadenceRisk.currentRiskScore + 3;
      cadenceRisk.severity = cadenceRisk.currentRiskScore > 40 ? 'MEDIUM' : 'LOW';
      cadenceRisk.trend = 'STABLE';
      cadenceRisk.earlyWarningTriggered = false;
    }
    cadenceRisk.assessedAt = nowStr;

    // 2. Evaluate Tracking Risk
    const trackingRisk = this.riskIndicators.get('risk-tracking-02')!;
    if (joints < 18) {
      trackingRisk.currentRiskScore = 80;
      trackingRisk.projectedRiskScore30s = 90;
      trackingRisk.severity = 'HIGH';
      trackingRisk.trend = 'RISING';
      trackingRisk.earlyWarningTriggered = true;
      trackingRisk.triggerFactors = [`Joint tracking count degraded to ${joints}/25 joints`];
    } else {
      trackingRisk.currentRiskScore = Math.max(5, (25 - joints) * 5 + 8);
      trackingRisk.projectedRiskScore30s = trackingRisk.currentRiskScore + 2;
      trackingRisk.severity = trackingRisk.currentRiskScore > 40 ? 'MEDIUM' : 'LOW';
      trackingRisk.trend = 'STABLE';
      trackingRisk.earlyWarningTriggered = false;
    }
    trackingRisk.assessedAt = nowStr;

    // 3. Evaluate Security Risk (Integrates with Phase 32)
    const securityRisk = this.riskIndicators.get('risk-security-03')!;
    if (activeThreats.length > 0) {
      securityRisk.currentRiskScore = 70;
      securityRisk.projectedRiskScore30s = 75;
      securityRisk.severity = 'HIGH';
      securityRisk.trend = 'RISING';
      securityRisk.earlyWarningTriggered = true;
      securityRisk.triggerFactors = activeThreats.map((t) => t.explanation);
    } else {
      securityRisk.currentRiskScore = 8;
      securityRisk.projectedRiskScore30s = 8;
      securityRisk.severity = 'LOW';
      securityRisk.trend = 'STABLE';
      securityRisk.earlyWarningTriggered = false;
    }
    securityRisk.assessedAt = nowStr;

    const list = Array.from(this.riskIndicators.values());

    // Dispatch warning if any early warning triggered
    const triggered = list.filter((r) => r.earlyWarningTriggered);
    if (triggered.length > 0) {
      DistributedEventBus.getInstance().publish({
        eventType: 'RISK_TREND_DETECTED',
        source: 'PredictiveRiskAssessmentEngine',
        priority: 'HIGH',
        payload: { triggeredRisks: triggered.map((t) => t.category) },
        suppressionFingerprint: `risk-trend-${Date.now().toString().slice(0, -3)}`,
      });
    }

    this.notifyListeners();
    return list;
  }

  public getAllRisks(): PredictiveRiskIndicator[] {
    return Array.from(this.riskIndicators.values());
  }

  public subscribe(listener: (risks: PredictiveRiskIndicator[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllRisks());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllRisks();
    this.listeners.forEach((l) => l(list));
  }
}
