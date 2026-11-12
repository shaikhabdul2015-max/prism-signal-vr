/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 20: Intelligent Mission Planning & Execution Engine.
 * Decomposes complex VR operations into dependent task workflows,
 * assigns specialist agents, and gates high-impact actions through human approval.
 */

import { AgentRole } from '../types/phase17';
import {
  VRIntelligenceMission,
  MissionTask,
  MissionPriority,
  MissionState,
} from '../types/phase20';

export class MissionPlanningEngine {
  private static instance: MissionPlanningEngine | null = null;
  private missions: Map<string, VRIntelligenceMission> = new Map();
  private listeners: Set<(missions: VRIntelligenceMission[]) => void> = new Set();

  private constructor() {
    this.seedDefaultMissions();
  }

  public static getInstance(): MissionPlanningEngine {
    if (!MissionPlanningEngine.instance) {
      MissionPlanningEngine.instance = new MissionPlanningEngine();
    }
    return MissionPlanningEngine.instance;
  }

  public static resetInstance(): void {
    MissionPlanningEngine.instance = null;
  }

  private seedDefaultMissions(): void {
    const mission1: VRIntelligenceMission = {
      missionId: 'msn-quest-stability-sweep',
      title: 'Meta Quest Hardware & WebXR Stability Sweep',
      objective: 'Execute end-to-end regression validation across 25-joint skeleton, frame cadence, and cloud synchronization.',
      priority: 'HIGH',
      state: 'COMPLETED',
      createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      startedAt: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      completedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      progressPercent: 100,
      requiresHumanApproval: false,
      humanApprovalGranted: true,
      impactScore: 40,
      tasks: [
        {
          taskId: 'tsk-swp-1',
          title: 'Verify 25-Joint Skeletal Mesh & Distal Phalanges',
          description: 'Poll WebXR hand tracking input source for joint confidence and root stability.',
          assignedAgent: 'TrackingAgent',
          dependencies: [],
          status: 'COMPLETED',
          estimatedDurationMs: 1200,
          actualDurationMs: 980,
          isHighImpact: false,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 3,
          resultSummary: '25/25 joints active with nominal palm orientation.',
        },
        {
          taskId: 'tsk-swp-2',
          title: 'Measure Frame Cadence & Frame Time Variance',
          description: 'Sample 120 frames at target 72Hz display interval; compute p95 variance.',
          assignedAgent: 'PerformanceAgent',
          dependencies: ['tsk-swp-1'],
          status: 'COMPLETED',
          estimatedDurationMs: 1600,
          actualDurationMs: 1540,
          isHighImpact: false,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 3,
          resultSummary: 'Mean 71.9 FPS; jitter variance 1.2ms (nominal).',
        },
        {
          taskId: 'tsk-swp-3',
          title: 'Verify Cloud Offline Queue Integrity',
          description: 'Inspect local storage persistence buffer and test idempotent retry.',
          assignedAgent: 'OperationsAgent',
          dependencies: ['tsk-swp-2'],
          status: 'COMPLETED',
          estimatedDurationMs: 800,
          actualDurationMs: 620,
          isHighImpact: false,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 3,
          resultSummary: 'Offline queue verified with tamper-evident audit proof.',
        },
      ],
    };

    const mission2: VRIntelligenceMission = {
      missionId: 'msn-auto-recovery-recalibration',
      title: 'Autonomous System Recalibration & Buffer Flush',
      objective: 'Remediate detected micro-jitter by recalibrating tracking filters and purging stale telemetry memory buffers.',
      priority: 'CRITICAL',
      state: 'PENDING_APPROVAL',
      createdAt: new Date().toISOString(),
      progressPercent: 33,
      requiresHumanApproval: true,
      humanApprovalGranted: false,
      impactScore: 78,
      tasks: [
        {
          taskId: 'tsk-rec-1',
          title: 'Kinematic Low-Pass Filter Reset',
          description: 'Reset joint position exponential moving average coefficients.',
          assignedAgent: 'TrackingAgent',
          dependencies: [],
          status: 'COMPLETED',
          estimatedDurationMs: 500,
          actualDurationMs: 420,
          isHighImpact: false,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 3,
          resultSummary: 'Smoothing factors re-anchored to nominal defaults.',
        },
        {
          taskId: 'tsk-rec-2',
          title: 'Purge In-Memory Telemetry Buffers (High Impact)',
          description: 'Flushes non-critical frame history to release memory heap allocation.',
          assignedAgent: 'IncidentAgent',
          dependencies: ['tsk-rec-1'],
          status: 'PENDING',
          estimatedDurationMs: 1500,
          isHighImpact: true,
          operatorApproved: false,
          retryCount: 0,
          maxRetries: 2,
        },
        {
          taskId: 'tsk-rec-3',
          title: 'Execute Verification Sweep',
          description: 'Verify system responsiveness after memory purge.',
          assignedAgent: 'TestAgent',
          dependencies: ['tsk-rec-2'],
          status: 'PENDING',
          estimatedDurationMs: 1000,
          isHighImpact: false,
          operatorApproved: true,
          retryCount: 0,
          maxRetries: 3,
        },
      ],
    };

    this.missions.set(mission1.missionId, mission1);
    this.missions.set(mission2.missionId, mission2);
  }

  public getMissions(): VRIntelligenceMission[] {
    return Array.from(this.missions.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  public subscribe(callback: (missions: VRIntelligenceMission[]) => void): () => void {
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
        console.error('[MissionPlanningEngine] Listener error:', err);
      }
    });
  }

  /**
   * Plans a new mission from an operational objective.
   */
  public planMission(
    title: string,
    objective: string,
    priority: MissionPriority = 'HIGH'
  ): VRIntelligenceMission {
    const missionId = `msn-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const tasks: MissionTask[] = [
      {
        taskId: `tsk-plan-${Date.now()}-1`,
        title: 'Initial Telemetry & Pre-Condition Inspection',
        description: 'Verify device presence, optical joints, and baseline cadence.',
        assignedAgent: 'OperationsAgent',
        dependencies: [],
        status: 'READY',
        estimatedDurationMs: 600,
        isHighImpact: false,
        operatorApproved: true,
        retryCount: 0,
        maxRetries: 3,
      },
      {
        taskId: `tsk-plan-${Date.now()}-2`,
        title: 'Specialized Diagnostic Assessment',
        description: 'Analyze tracking continuity and render latency across pipelines.',
        assignedAgent: 'PerformanceAgent',
        dependencies: [`tsk-plan-${Date.now()}-1`],
        status: 'PENDING',
        estimatedDurationMs: 1200,
        isHighImpact: false,
        operatorApproved: true,
        retryCount: 0,
        maxRetries: 3,
      },
      {
        taskId: `tsk-plan-${Date.now()}-3`,
        title: 'Remediation Routine Execution (High Impact)',
        description: 'Applies self-healing adaptations and system reconfiguration.',
        assignedAgent: 'ChiefIntelligenceAgent',
        dependencies: [`tsk-plan-${Date.now()}-2`],
        status: 'PENDING',
        estimatedDurationMs: 2000,
        isHighImpact: true,
        operatorApproved: false,
        retryCount: 0,
        maxRetries: 2,
      },
    ];

    const mission: VRIntelligenceMission = {
      missionId,
      title,
      objective,
      priority,
      state: 'PENDING_APPROVAL',
      tasks,
      createdAt: now,
      progressPercent: 0,
      requiresHumanApproval: true,
      humanApprovalGranted: false,
      impactScore: 65,
    };

    this.missions.set(missionId, mission);
    this.notify();
    return mission;
  }

  /**
   * Operator grants approval for high-impact task or mission.
   */
  public approveTask(missionId: string, taskId: string): boolean {
    const mission = this.missions.get(missionId);
    if (!mission) return false;

    const task = mission.tasks.find((t) => t.taskId === taskId);
    if (!task) return false;

    task.operatorApproved = true;
    if (task.status === 'PENDING') {
      // Check if dependencies are completed
      const depsComplete = task.dependencies.every((depId) => {
        const dep = mission.tasks.find((t) => t.taskId === depId);
        return dep && dep.status === 'COMPLETED';
      });
      if (depsComplete) {
        task.status = 'READY';
      }
    }

    // Check if mission still has unapproved high-impact tasks
    const remainingUnapproved = mission.tasks.some((t) => t.isHighImpact && !t.operatorApproved);
    if (!remainingUnapproved) {
      mission.humanApprovalGranted = true;
      if (mission.state === 'PENDING_APPROVAL') {
        mission.state = 'IN_PROGRESS';
      }
    }

    this.notify();
    return true;
  }

  /**
   * Executes or completes a task within a mission.
   */
  public updateTaskProgress(
    missionId: string,
    taskId: string,
    status: MissionTask['status'],
    summary?: string
  ): void {
    const mission = this.missions.get(missionId);
    if (!mission) return;

    const task = mission.tasks.find((t) => t.taskId === taskId);
    if (!task) return;

    task.status = status;
    if (summary) task.resultSummary = summary;
    if (status === 'COMPLETED') {
      task.completedAt = new Date().toISOString();
      // Unlock subsequent dependent tasks
      mission.tasks.forEach((other) => {
        if (other.dependencies.includes(taskId) && other.status === 'PENDING') {
          const allDepsDone = other.dependencies.every((dId) => {
            const dTask = mission.tasks.find((t) => t.taskId === dId);
            return dTask && dTask.status === 'COMPLETED';
          });
          if (allDepsDone && (!other.isHighImpact || other.operatorApproved)) {
            other.status = 'READY';
          }
        }
      });
    }

    // Update overall progress percentage
    const completedCount = mission.tasks.filter((t) => t.status === 'COMPLETED').length;
    mission.progressPercent = Math.round((completedCount / mission.tasks.length) * 100);

    if (mission.progressPercent === 100) {
      mission.state = 'COMPLETED';
      mission.completedAt = new Date().toISOString();
    }

    this.notify();
  }
}

export const missionPlanningEngine = MissionPlanningEngine.getInstance();
