/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 22: Advanced Autonomous Mission Intelligence Engine.
 * Analyzes mission objectives, generates decomposed tasks with dependency resolution,
 * evaluates feasibility, forecasts multi-dimensional risks, coordinates all six specialist agents,
 * dynamically adapts to environmental perturbations, and synchronizes with the Digital Twin.
 */

import { VRTelemetry } from '../types/diagnostics';
import { AgentRole } from '../types/phase17';
import {
  MissionPriority,
  MissionState,
} from '../types/phase20';
import {
  AutonomousMission,
  AutonomousMissionTask,
  MissionObjectiveType,
  MissionFeasibilityAssessment,
  MissionRiskAssessment,
  DynamicAdaptationRecord,
} from '../types/phase22';
import { digitalTwinEngine } from './DigitalTwinEngine';

export class AutonomousMissionIntelligence {
  private static instance: AutonomousMissionIntelligence | null = null;
  private missions: Map<string, AutonomousMission> = new Map();
  private listeners: Set<(missions: AutonomousMission[]) => void> = new Set();

  private constructor() {
    this.seedBaselineMissions();
  }

  public static getInstance(): AutonomousMissionIntelligence {
    if (!AutonomousMissionIntelligence.instance) {
      AutonomousMissionIntelligence.instance = new AutonomousMissionIntelligence();
    }
    return AutonomousMissionIntelligence.instance;
  }

  public static resetInstance(): void {
    AutonomousMissionIntelligence.instance = null;
  }

  public getMissions(): AutonomousMission[] {
    return Array.from(this.missions.values());
  }

  public getMission(missionId: string): AutonomousMission | undefined {
    return this.missions.get(missionId);
  }

  public subscribe(callback: (missions: AutonomousMission[]) => void): () => void {
    this.listeners.add(callback);
    callback(this.getMissions());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const list = this.getMissions();
    this.listeners.forEach((cb) => {
      try {
        cb(list);
      } catch (err) {
        console.error('[AutonomousMissionIntelligence] Listener error:', err);
      }
    });
  }

  /**
   * Evaluates mission feasibility based on current telemetry and system constraints.
   */
  public evaluateFeasibility(
    objectiveType: MissionObjectiveType,
    telemetry?: VRTelemetry
  ): MissionFeasibilityAssessment {
    const frames = telemetry?.frames || [];
    const joints = telemetry?.joints || [];
    const currentFps = frames[0]?.frameDurationMs ? Math.round(1000 / frames[0].frameDurationMs) : 72;
    const trackedCount = joints.length > 0 ? joints.filter((j) => j.tracked).length : 25;

    const bottlenecks: string[] = [];
    const prerequisites: string[] = ['WebXR Session Active', 'Sensor Stream Validated'];

    let score = 95;
    if (currentFps < 60) {
      score -= 20;
      bottlenecks.push(`Display frame cadence degraded (~${currentFps} FPS)`);
    }
    if (trackedCount < 20) {
      score -= 25;
      bottlenecks.push(`Optical joint occlusion detected (${trackedCount}/25 tracked)`);
    }

    const durationMap: Record<MissionObjectiveType, number> = {
      STABILITY_SWEEP: 4500,
      RESONANCE_ALIGNMENT: 6000,
      THERMAL_CADENCE_RECOVERY: 3500,
      OPTICAL_TRACKING_CALIBRATION: 5000,
      CLOUD_RESILIENCE_AUDIT: 4000,
      DIGITAL_TWIN_PREDICTIVE_STRESS: 7500,
    };

    const agentsMap: Record<MissionObjectiveType, AgentRole[]> = {
      STABILITY_SWEEP: ['OperationsAgent', 'TrackingAgent', 'PerformanceAgent'],
      RESONANCE_ALIGNMENT: ['TrackingAgent', 'OperationsAgent', 'ChiefIntelligenceAgent'],
      THERMAL_CADENCE_RECOVERY: ['PerformanceAgent', 'IncidentAgent', 'ChiefIntelligenceAgent'],
      OPTICAL_TRACKING_CALIBRATION: ['TrackingAgent', 'TestAgent', 'OperationsAgent'],
      CLOUD_RESILIENCE_AUDIT: ['OperationsAgent', 'TestAgent', 'IncidentAgent'],
      DIGITAL_TWIN_PREDICTIVE_STRESS: [
        'OperationsAgent',
        'TestAgent',
        'TrackingAgent',
        'PerformanceAgent',
        'IncidentAgent',
        'ChiefIntelligenceAgent',
      ],
    };

    return {
      score: Math.max(10, Math.min(100, score)),
      isFeasible: score >= 45,
      estimatedDurationMs: durationMap[objectiveType] || 5000,
      computeBudgetUnits: Math.round((durationMap[objectiveType] || 5000) / 100),
      requiredAgents: agentsMap[objectiveType] || ['OperationsAgent', 'ChiefIntelligenceAgent'],
      bottlenecks,
      prerequisites,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Forecasts predictive mission risk across telemetry dimensions.
   * STRICT INVARIANT: Predictions are probabilistic forecasts, never guaranteed outcomes.
   */
  public evaluateRisk(
    objectiveType: MissionObjectiveType,
    telemetry?: VRTelemetry
  ): MissionRiskAssessment {
    const frames = telemetry?.frames || [];
    const joints = telemetry?.joints || [];
    const currentFps = frames[0]?.frameDurationMs ? Math.round(1000 / frames[0].frameDurationMs) : 72;
    const trackedCount = joints.length > 0 ? joints.filter((j) => j.tracked).length : 25;
    const latencyMs = telemetry?.latencySamples?.[0]?.latencyMs || 14;

    let failureProbability = 10;
    if (currentFps < 50) failureProbability += 35;
    else if (currentFps < 65) failureProbability += 15;

    if (trackedCount < 15) failureProbability += 40;
    else if (trackedCount < 22) failureProbability += 15;

    if (latencyMs > 50) failureProbability += 20;

    failureProbability = Math.max(5, Math.min(95, failureProbability));

    const trackingRisk = trackedCount < 15 ? 'HIGH' : trackedCount < 22 ? 'MEDIUM' : 'LOW';
    const environmentalRisk =
      telemetry?.lightingPreset === 'backlit_glare' ? 'HIGH' : telemetry?.lightingPreset === 'low_light' ? 'MEDIUM' : 'LOW';
    const resourceRisk = currentFps < 55 ? 'HIGH' : 'LOW';

    return {
      overallRiskScore: failureProbability,
      failureProbabilityPercent: failureProbability,
      resourceRisk,
      trackingStabilityRisk: trackingRisk,
      environmentalRisk,
      performanceDegradationForecast:
        currentFps < 60
          ? `Thermal throttling likely within 120s if fragment load persists.`
          : `Nominal performance envelope projected over next operational cycle.`,
      uncertaintyDisclosure:
        'NOTICE: Risk assessments are empirical probabilistic estimates based on sampled telemetry and do not represent deterministic guarantees.',
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Generates a fully decomposed autonomous mission with dependent task graphs.
   */
  public generateMission(
    objectiveType: MissionObjectiveType,
    title: string,
    description: string,
    priority: MissionPriority = 'HIGH',
    telemetry?: VRTelemetry
  ): AutonomousMission {
    const missionId = `msn-auto-${Date.now().toString(36)}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    const feasibility = this.evaluateFeasibility(objectiveType, telemetry);
    const riskAssessment = this.evaluateRisk(objectiveType, telemetry);

    // Synchronize with active digital twin snapshot
    const twinSnap = digitalTwinEngine.getSnapshot();

    const tasks = this.decomposeTasks(missionId, objectiveType);

    const requiresApproval = tasks.some((t) => t.isHighImpact);

    const mission: AutonomousMission = {
      missionId,
      title,
      objectiveType,
      description,
      priority,
      state: requiresApproval ? 'PENDING_APPROVAL' : 'PLANNING',
      tasks,
      feasibility,
      riskAssessment,
      decisions: [],
      adaptations: [],
      twinSnapshotRef: {
        snapshotId: twinSnap.snapshotId,
        checksum: twinSnap.checksum,
        version: twinSnap.version,
      },
      progressPercent: 0,
      requiresHumanApproval: requiresApproval,
      humanApprovalGranted: !requiresApproval,
      healthScore: Math.round(feasibility.score * 0.6 + (100 - riskAssessment.overallRiskScore) * 0.4),
      createdAt: now,
      lastUpdated: now,
    };

    this.missions.set(missionId, mission);
    this.notify();
    return mission;
  }

  /**
   * Decomposes mission objectives into sequential and parallel tasks with dependencies.
   */
  private decomposeTasks(missionId: string, objectiveType: MissionObjectiveType): AutonomousMissionTask[] {
    const timestamp = Date.now();

    switch (objectiveType) {
      case 'RESONANCE_ALIGNMENT':
        return [
          {
            taskId: `tsk-${timestamp}-1`,
            title: 'Audit Crystal Beam Transmission Vector',
            description: 'Evaluate light propagation between Ruby, Azure, and Emerald nodes.',
            assignedAgent: 'TrackingAgent',
            dependencies: [],
            status: 'READY',
            estimatedDurationMs: 1200,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            taskId: `tsk-${timestamp}-2`,
            title: 'Verify Kinematic Orientation & Resonance Angles',
            description: 'Sample rotation offsets against harmonic target angles [2.1 rad, 4.19 rad, 0.0 rad].',
            assignedAgent: 'OperationsAgent',
            dependencies: [`tsk-${timestamp}-1`],
            status: 'PENDING',
            estimatedDurationMs: 1400,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            taskId: `tsk-${timestamp}-3`,
            title: 'Harmonic Pulse Injection (High Impact)',
            description: 'Inject micro-adjustment impulse to lock crystal resonance into target spire receiver.',
            assignedAgent: 'ChiefIntelligenceAgent',
            dependencies: [`tsk-${timestamp}-2`],
            status: 'PENDING',
            estimatedDurationMs: 2200,
            isHighImpact: true,
            operatorApproved: false,
            retryCount: 0,
            maxRetries: 2,
          },
        ];

      case 'THERMAL_CADENCE_RECOVERY':
        return [
          {
            taskId: `tsk-${timestamp}-1`,
            title: 'Sample GPU Frame Time Variance & Drop Index',
            description: 'Profile last 120 frame intervals to measure instantaneous render jitter.',
            assignedAgent: 'PerformanceAgent',
            dependencies: [],
            status: 'READY',
            estimatedDurationMs: 1000,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            taskId: `tsk-${timestamp}-2`,
            title: 'Throttle Non-Essential Particle Shaders',
            description: 'Reduce peripheral particle budget to alleviate mobile GPU thermal pressure.',
            assignedAgent: 'IncidentAgent',
            dependencies: [`tsk-${timestamp}-1`],
            status: 'PENDING',
            estimatedDurationMs: 1200,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            taskId: `tsk-${timestamp}-3`,
            title: 'Dynamic Foveated Rendering Clamp (High Impact)',
            description: 'Clamp MSAA from 4x to 2x and lock foveation to High tier.',
            assignedAgent: 'PerformanceAgent',
            dependencies: [`tsk-${timestamp}-2`],
            status: 'PENDING',
            estimatedDurationMs: 1500,
            isHighImpact: true,
            operatorApproved: false,
            retryCount: 0,
            maxRetries: 2,
          },
        ];

      case 'DIGITAL_TWIN_PREDICTIVE_STRESS':
        return [
          {
            taskId: `tsk-${timestamp}-1`,
            title: 'Synthesize Multi-Horizon Simulation State',
            description: 'Run virtual scenario perturbing ambient lux and optical occlusion.',
            assignedAgent: 'OperationsAgent',
            dependencies: [],
            status: 'READY',
            estimatedDurationMs: 1800,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
            isolatedFromHardware: true,
          },
          {
            taskId: `tsk-${timestamp}-2`,
            title: 'Verify Zero Contamination of Live Hardware Sensors',
            description: 'Audit telemetry timestamps and provenance tags to verify complete sandbox isolation.',
            assignedAgent: 'TestAgent',
            dependencies: [`tsk-${timestamp}-1`],
            status: 'PENDING',
            estimatedDurationMs: 1200,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            taskId: `tsk-${timestamp}-3`,
            title: 'Collective 6-Agent Synthesis Verification',
            description: 'Poll all six specialist roles for predictive consensus on future state horizons.',
            assignedAgent: 'ChiefIntelligenceAgent',
            dependencies: [`tsk-${timestamp}-2`],
            status: 'PENDING',
            estimatedDurationMs: 2000,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
        ];

      default: // STABILITY_SWEEP and standard operational missions
        return [
          {
            taskId: `tsk-${timestamp}-1`,
            title: '25-Joint Kinematic Mesh Telemetry Audit',
            description: 'Verify tracking confidence of both hand skeletons and distal phalanges.',
            assignedAgent: 'TrackingAgent',
            dependencies: [],
            status: 'READY',
            estimatedDurationMs: 1200,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            taskId: `tsk-${timestamp}-2`,
            title: 'Cadence & Frame Interval Evaluation',
            description: 'Verify 72Hz display interval compliance and detect micro-stutters.',
            assignedAgent: 'PerformanceAgent',
            dependencies: [`tsk-${timestamp}-1`],
            status: 'PENDING',
            estimatedDurationMs: 1400,
            isHighImpact: false,
            operatorApproved: true,
            retryCount: 0,
            maxRetries: 3,
          },
          {
            taskId: `tsk-${timestamp}-3`,
            title: 'System Reconfiguration & Calibration Gate (High Impact)',
            description: 'Reset optical Kalman filter anchors and persist calibration baseline.',
            assignedAgent: 'OperationsAgent',
            dependencies: [`tsk-${timestamp}-2`],
            status: 'PENDING',
            estimatedDurationMs: 1600,
            isHighImpact: true,
            operatorApproved: false,
            retryCount: 0,
            maxRetries: 2,
          },
        ];
    }
  }

  /**
   * Continuously monitors telemetry for perturbations and dynamically adapts the mission.
   */
  public adaptMission(missionId: string, telemetry: VRTelemetry): DynamicAdaptationRecord | null {
    const mission = this.missions.get(missionId);
    if (!mission || mission.state === 'COMPLETED' || mission.state === 'ABORTED') {
      return null;
    }

    const frames = telemetry.frames || [];
    const joints = telemetry.joints || [];
    const currentFps = frames[0]?.frameDurationMs ? Math.round(1000 / frames[0].frameDurationMs) : 72;
    const trackedCount = joints.length > 0 ? joints.filter((j) => j.tracked).length : 25;

    let trigger: DynamicAdaptationRecord['trigger'] | null = null;
    let triggerDetail = '';
    const actionsTaken: string[] = [];
    const tasksInjected: string[] = [];
    const tasksReprioritized: string[] = [];

    // Environmental / optical perturbation
    if (telemetry.lightingPreset === 'backlit_glare' && trackedCount < 18) {
      trigger = 'ENVIRONMENTAL_SHIFT';
      triggerDetail = `Direct backlit glare causing optical dropout (${trackedCount}/25 joints).`;
      actionsTaken.push('Injected dead-reckoning inertial fallback task.');

      const injectedTask: AutonomousMissionTask = {
        taskId: `tsk-adapt-inertial-${Date.now()}`,
        title: 'Switch to Inertial Dead-Reckoning Filter',
        description: 'Compensate for severe optical glare by boosting IMU sensor weighting in Kalman filter.',
        assignedAgent: 'TrackingAgent',
        dependencies: [],
        status: 'READY',
        estimatedDurationMs: 1000,
        isHighImpact: false,
        operatorApproved: true,
        retryCount: 0,
        maxRetries: 3,
      };

      mission.tasks.unshift(injectedTask);
      tasksInjected.push(injectedTask.taskId);
    }
    // Severe cadence drop
    else if (currentFps < 50) {
      trigger = 'CADENCE_DEGRADATION';
      triggerDetail = `Severe frame rate collapse to ${currentFps} FPS (< 50 FPS threshold).`;
      actionsTaken.push('Reprioritized thermal stabilization tasks to immediate execution.');

      mission.priority = 'CRITICAL';
      tasksReprioritized.push(mission.tasks[0]?.taskId || 'primary');
    }

    if (!trigger) return null;

    const record: DynamicAdaptationRecord = {
      adaptationId: `adapt-${Date.now().toString(36)}`,
      missionId,
      timestamp: new Date().toISOString(),
      trigger,
      triggerDetail,
      actionsTaken,
      tasksInjected,
      tasksReprioritized,
      confidenceScore: 0.94,
    };

    mission.adaptations.push(record);
    mission.lastUpdated = new Date().toISOString();
    this.notify();
    return record;
  }

  /**
   * Seeds default missions representing realistic operations.
   */
  private seedBaselineMissions(): void {
    const defaultMission: AutonomousMission = {
      missionId: 'msn-baseline-stability-sweep',
      title: 'Autonomous System Integrity & Telemetry Sweep',
      objectiveType: 'STABILITY_SWEEP',
      description: 'Continuous validation of 25-joint skeleton, frame cadence, and cloud buffer status.',
      priority: 'HIGH',
      state: 'COMPLETED',
      tasks: [
        {
          taskId: 'tsk-seed-1',
          title: 'Audit 25-Joint Skeletal Mesh & Confidence',
          description: 'Poll WebXR hand tracking input source for joint confidence and root stability.',
          assignedAgent: 'TrackingAgent',
          dependencies: [],
          status: 'COMPLETED',
          estimatedDurationMs: 1200,
          actualDurationMs: 1100,
          isHighImpact: false,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 3,
          resultSummary: '25/25 joints active with nominal palm orientation.',
        },
        {
          taskId: 'tsk-seed-2',
          title: 'Sample Frame Cadence & Latency Variance',
          description: 'Measure 120 frames at target 72Hz display interval; compute p95 variance.',
          assignedAgent: 'PerformanceAgent',
          dependencies: ['tsk-seed-1'],
          status: 'COMPLETED',
          estimatedDurationMs: 1400,
          actualDurationMs: 1350,
          isHighImpact: false,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 3,
          resultSummary: 'Cadence stable at 72.0 FPS; latency variance 1.1ms.',
        },
        {
          taskId: 'tsk-seed-3',
          title: 'Verify Cloud Offline Queue Integrity (High Impact)',
          description: 'Inspect local storage persistence buffer and test idempotent retry.',
          assignedAgent: 'OperationsAgent',
          dependencies: ['tsk-seed-2'],
          status: 'COMPLETED',
          estimatedDurationMs: 1000,
          actualDurationMs: 920,
          isHighImpact: true,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 2,
          resultSummary: 'Offline queue verified with tamper-evident audit proof.',
        },
      ],
      feasibility: {
        score: 98,
        isFeasible: true,
        estimatedDurationMs: 3600,
        computeBudgetUnits: 36,
        requiredAgents: ['TrackingAgent', 'PerformanceAgent', 'OperationsAgent'],
        bottlenecks: [],
        prerequisites: ['WebXR Session Active', 'Sensor Stream Validated'],
        evaluatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      riskAssessment: {
        overallRiskScore: 12,
        failureProbabilityPercent: 12,
        resourceRisk: 'LOW',
        trackingStabilityRisk: 'LOW',
        environmentalRisk: 'LOW',
        performanceDegradationForecast: 'Nominal operational envelope verified.',
        uncertaintyDisclosure: 'NOTICE: Empirical estimate based on sampled telemetry.',
        evaluatedAt: new Date(Date.now() - 3600000).toISOString(),
      },
      decisions: [],
      adaptations: [],
      twinSnapshotRef: {
        snapshotId: 'twin-snap-1',
        checksum: 'TWIN-INITIAL',
        version: 1,
      },
      progressPercent: 100,
      requiresHumanApproval: true,
      humanApprovalGranted: true,
      healthScore: 96,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      startedAt: new Date(Date.now() - 3500000).toISOString(),
      completedAt: new Date(Date.now() - 3400000).toISOString(),
      lastUpdated: new Date(Date.now() - 3400000).toISOString(),
    };

    this.missions.set(defaultMission.missionId, defaultMission);
  }
}

export const autonomousMissionIntelligence = AutonomousMissionIntelligence.getInstance();
