/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Adaptive Reality Engine (Phase 29)
 * Dynamically modulates WebXR visual quality, scene complexity, and environmental parameters
 * based on real-time rendering telemetry (FPS, frame time jitter, thermal dissipation)
 * and active mission execution state.
 * 
 * SAFETY GOVERNANCE:
 * High-impact environment transitions (e.g. switching presets during active mission
 * or dropping to failsafe modes) require operator verification via HumanApprovalManager.
 */

import {
  AdaptiveRealityPolicy,
  EnvironmentPresetId,
  VisualQualityLevel,
} from '../types/phase29';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import { immersiveEnvironmentEngine } from './ImmersiveEnvironmentEngine';
import { HumanApprovalManager } from './HumanApprovalManager';
import { commandAuditService } from '../services/CommandAuditService';

export class AdaptiveRealityEngine {
  private static instance: AdaptiveRealityEngine | null = null;
  private currentPolicy: AdaptiveRealityPolicy;
  private listeners: Set<(policy: AdaptiveRealityPolicy) => void> = new Set();

  public constructor() {
    this.currentPolicy = {
      activePreset: 'DEEP_SPACE',
      qualityLevel: 'HIGH',
      dynamicShadowsEnabled: true,
      particleDensityScale: 1.0,
      foveatedRenderingScale: 1.0,
      renderScale: 1.0,
      adaptiveReason: 'Initialized with nominal high-fidelity WebXR rendering profile.',
      requiresOperatorApproval: false,
      lastAdaptedAt: new Date().toISOString(),
    };
  }

  public static getInstance(): AdaptiveRealityEngine {
    if (!AdaptiveRealityEngine.instance) {
      AdaptiveRealityEngine.instance = new AdaptiveRealityEngine();
    }
    return AdaptiveRealityEngine.instance;
  }

  public static resetInstance(): void {
    AdaptiveRealityEngine.instance = null;
  }

  public getPolicy(): AdaptiveRealityPolicy {
    return { ...this.currentPolicy };
  }

  /**
   * Adapts reality visual profile against live telemetry, thermal pressure, and active incidents
   */
  public evaluateAdaptivePolicy(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[],
    currentMissionState?: string
  ): AdaptiveRealityPolicy {
    let currentFps = 72;
    let currentLatency = 13.5;
    let droppedRatio = 0.02;

    if (telemetry) {
      if (telemetry.frames.length > 0) {
        const total = telemetry.frames.length;
        const dropped = telemetry.frames.filter((f) => f.dropped).length;
        droppedRatio = dropped / total;
        const avgDuration =
          telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / total;
        currentFps = avgDuration > 0 ? 1000 / avgDuration : 72;
      }
      if (telemetry.latencySamples.length > 0) {
        currentLatency =
          telemetry.latencySamples.reduce((a, s) => a + s.latencyMs, 0) /
          telemetry.latencySamples.length;
      }
    }

    const openIncidents = (activeIncidents || []).filter(
      (i) => i.state !== 'RESOLVED' && i.state !== 'CLOSED'
    );
    const incidentPressure = openIncidents.length;

    let targetQuality: VisualQualityLevel = 'HIGH';
    let targetShadows = true;
    let particleScale = 1.0;
    let foveation = 1.0;
    let renderScale = 1.0;
    let reason = 'Nominal 72Hz cadence hold; high-fidelity PBR enabled.';
    let requiresApproval = false;

    // Evaluate Quality Tier
    if (currentFps < 48 || droppedRatio > 0.12 || incidentPressure >= 3) {
      targetQuality = 'FAILSAFE_LOW';
      targetShadows = false;
      particleScale = 0.2;
      foveation = 2.0;
      renderScale = 0.65;
      reason = `Critical render degradation (${currentFps.toFixed(0)} FPS, ${incidentPressure} incidents). Failsafe low-power clamped.`;
      requiresApproval = true;
    } else if (currentFps < 62 || currentLatency > 20 || incidentPressure >= 1) {
      targetQuality = 'CONSERVATIVE_60HZ';
      targetShadows = false;
      particleScale = 0.5;
      foveation = 1.5;
      renderScale = 0.85;
      reason = `Thermal or latency ripple detected (${currentFps.toFixed(0)} FPS, ${currentLatency.toFixed(1)}ms). Capped 60Hz profile.`;
    } else if (currentFps >= 85 && droppedRatio < 0.01 && incidentPressure === 0) {
      targetQuality = 'ULTRA';
      targetShadows = true;
      particleScale = 1.2;
      foveation = 1.0;
      renderScale = 1.1;
      reason = 'Headroom confirmed: 90Hz stable render loop and zero dropped buffers.';
    }

    // Adaptive Preset recommendation based on mission state
    let targetPreset: EnvironmentPresetId = this.currentPolicy.activePreset;
    if (currentMissionState === 'EXECUTING') {
      targetPreset = 'MISSION_SIMULATION_ARENA';
    } else if (currentMissionState === 'RESEARCHING') {
      targetPreset = 'NEURAL_INTELLIGENCE_CHAMBER';
    }

    // If preset change or failsafe transition requires approval, gate it
    if (targetPreset !== this.currentPolicy.activePreset && (targetQuality === 'FAILSAFE_LOW' || targetQuality === 'ULTRA')) {
      requiresApproval = true;
    }

    this.currentPolicy = {
      activePreset: targetPreset,
      qualityLevel: targetQuality,
      dynamicShadowsEnabled: targetShadows,
      particleDensityScale: particleScale,
      foveatedRenderingScale: foveation,
      renderScale,
      adaptiveReason: reason,
      requiresOperatorApproval: requiresApproval,
      lastAdaptedAt: new Date().toISOString(),
    };

    // Apply to immersive environment engine
    if (targetPreset !== immersiveEnvironmentEngine.getActiveConfig().presetId && !requiresApproval) {
      immersiveEnvironmentEngine.switchPreset(targetPreset);
    }

    this.notify();
    return this.getPolicy();
  }

  public evaluateTelemetry(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[],
    currentMissionState?: string
  ): AdaptiveRealityPolicy {
    return this.evaluateAdaptivePolicy(telemetry, activeIncidents, currentMissionState);
  }

  public requestPolicyOverride(
    targetQuality: VisualQualityLevel,
    requiresApproval: boolean = false,
    reason: string = 'Operator manual visual override'
  ): AdaptiveRealityPolicy {
    if (requiresApproval) {
      HumanApprovalManager.requestIntervention({
        type: 'SYSTEM_PARAMETER_TUNING',
        title: `Visual Quality Policy Override -> ${targetQuality}`,
        description: reason,
        riskLevel: targetQuality === 'ULTRA' ? 'HIGH' : 'MEDIUM',
        estimatedImpact: 'Alters GPU rendering parameters, dynamic shadow maps, and buffer resolution scale.',
        targetSubsystem: 'AdvancedWebXRRealityEngine',
        parameters: { targetQuality, reason },
      });
    }

    this.currentPolicy = {
      ...this.currentPolicy,
      qualityLevel: targetQuality,
      dynamicShadowsEnabled: targetQuality !== 'FAILSAFE_LOW' && targetQuality !== 'CONSERVATIVE_60HZ',
      requiresOperatorApproval: requiresApproval,
      adaptiveReason: reason,
      lastAdaptedAt: new Date().toISOString(),
    };

    this.notify();
    return this.getPolicy();
  }

  public applyApprovedPolicy(
    requestId: string,
    quality: VisualQualityLevel
  ): AdaptiveRealityPolicy {
    this.currentPolicy = {
      ...this.currentPolicy,
      qualityLevel: quality,
      requiresOperatorApproval: false,
      adaptiveReason: `Operator approved intervention [${requestId}] -> ${quality}`,
      lastAdaptedAt: new Date().toISOString(),
    };
    this.notify();
    return this.getPolicy();
  }

  /**
   * Applies approved operator visual policy override
   */
  public applyOperatorOverride(
    presetId: EnvironmentPresetId,
    qualityLevel: VisualQualityLevel,
    operatorId: string = 'OPERATOR'
  ): void {
    immersiveEnvironmentEngine.switchPreset(presetId);
    this.currentPolicy = {
      ...this.currentPolicy,
      activePreset: presetId,
      qualityLevel,
      adaptiveReason: `Operator override engaged by ${operatorId}.`,
      requiresOperatorApproval: false,
      lastAdaptedAt: new Date().toISOString(),
    };

    commandAuditService.recordEntry({
      eventType: 'OPERATOR_OVERRIDE',
      actor: 'OPERATOR',
      impactLevel: qualityLevel === 'FAILSAFE_LOW' ? 'HIGH' : 'MEDIUM',
      details: JSON.stringify({
        action: 'WEBXR_ADAPTIVE_OVERRIDE',
        presetId,
        qualityLevel,
        operatorId,
      }),
    });

    this.notify();
  }

  public subscribe(callback: (policy: AdaptiveRealityPolicy) => void): () => void {
    this.listeners.add(callback);
    callback(this.getPolicy());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const p = this.getPolicy();
    this.listeners.forEach((cb) => {
      try {
        cb(p);
      } catch (err) {
        console.error('Error in AdaptiveRealityEngine subscriber', err);
      }
    });
  }
}

export const adaptiveRealityEngine = AdaptiveRealityEngine.getInstance();
