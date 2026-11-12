/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23: System Intelligence Monitor.
 * Provides real-time aggregation of physical and simulated telemetry,
 * browser memory metrics (where supported), database synchronization states,
 * and multi-agent availability.
 * 
 * STRICT COMPLIANCE RULE:
 * If a metric is unavailable (e.g. memory API not supported in standard browser contexts),
 * display "Unavailable" instead of inventing a fake value.
 */

import { VRTelemetry } from '../types/diagnostics';
import { AgentRole } from '../types/phase17';
import { SystemIntelligenceReport } from '../types/phase23';
import { dbService } from '../services/firebaseDbService';
import { autonomousOperationsManager } from './AutonomousOperationsManager';

export class SystemIntelligenceMonitor {
  private static instance: SystemIntelligenceMonitor | null = null;
  private listeners: Set<(report: SystemIntelligenceReport) => void> = new Set();

  private constructor() {}

  public static getInstance(): SystemIntelligenceMonitor {
    if (!SystemIntelligenceMonitor.instance) {
      SystemIntelligenceMonitor.instance = new SystemIntelligenceMonitor();
    }
    return SystemIntelligenceMonitor.instance;
  }

  public static resetInstance(): void {
    SystemIntelligenceMonitor.instance = null;
  }

  public subscribe(callback: (report: SystemIntelligenceReport) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Generates a comprehensive real-time system intelligence report.
   */
  public generateReport(
    telemetry?: VRTelemetry,
    activeIncidentsCount: number = 0
  ): SystemIntelligenceReport {
    // 1. Frame Cadence & Frame Delta
    const frames = telemetry?.frames || [];
    const firstFrame = frames[0];
    const frameDeltaMs: number | 'Unavailable' =
      firstFrame?.frameDurationMs !== undefined && firstFrame?.frameDurationMs !== null
        ? Math.round(firstFrame.frameDurationMs * 10) / 10
        : 'Unavailable';

    const cadenceFps: number | 'Unavailable' =
      typeof frameDeltaMs === 'number' && frameDeltaMs > 0
        ? Math.round(1000 / frameDeltaMs)
        : 'Unavailable';

    // 2. 25-Joint Kinematic Tracking
    const joints = telemetry?.joints || [];
    const trackedJoints: number | 'Unavailable' =
      joints.length > 0 ? joints.filter((j) => j.tracked).length : 'Unavailable';
    const expectedJoints = telemetry?.expectedJointCount || 25;

    // 3. Network Latency
    const latencySample = telemetry?.latencySamples?.[0];
    const latencyMs: number | 'Unavailable' =
      latencySample?.latencyMs !== undefined ? Math.round(latencySample.latencyMs) : 'Unavailable';

    // 4. Browser Memory Usage (Chrome/Blink performance.memory API)
    let memoryUsageMb: number | 'Unavailable' = 'Unavailable';
    if (typeof window !== 'undefined' && 'performance' in window) {
      const perf = window.performance as unknown as {
        memory?: { usedJSHeapSize: number };
      };
      if (perf.memory && typeof perf.memory.usedJSHeapSize === 'number') {
        memoryUsageMb = Math.round(perf.memory.usedJSHeapSize / (1024 * 1024));
      }
    }

    // 5. Cloud Synchronization State & Database Mode
    const infraReport = dbService.getInfrastructureReport();
    const activeDbMode = infraReport.activeMode;
    const isConnected = infraReport.activeMode === 'CLOUD_FIRESTORE' && infraReport.firestoreAvailable;
    const pendingWrites = infraReport.pendingSyncCount;

    // 6. Agent Availability & Workloads
    const agentTasks = autonomousOperationsManager.getAgentTasks();
    const roles: AgentRole[] = [
      'OperationsAgent',
      'TestAgent',
      'TrackingAgent',
      'PerformanceAgent',
      'IncidentAgent',
      'ChiefIntelligenceAgent',
    ];

    const agentAvailability: Record<AgentRole, { status: 'AVAILABLE' | 'BUSY' | 'OFFLINE'; activeTaskCount: number }> =
      {} as any;

    roles.forEach((r) => {
      const count = agentTasks.filter((t) => t.agent === r && t.status !== 'COMPLETED').length;
      agentAvailability[r] = {
        status: count > 2 ? 'BUSY' : 'AVAILABLE',
        activeTaskCount: count,
      };
    });

    // 7. Overall Health Calculation
    let healthScore = 100;
    if (typeof cadenceFps === 'number' && cadenceFps < 60) healthScore -= 20;
    if (typeof trackedJoints === 'number' && trackedJoints < 20) healthScore -= 25;
    if (typeof latencyMs === 'number' && latencyMs > 80) healthScore -= 15;
    if (activeIncidentsCount > 0) healthScore -= activeIncidentsCount * 8;
    if (activeDbMode === 'OFFLINE_FALLBACK') healthScore -= 10;
    healthScore = Math.max(10, Math.min(100, healthScore));

    const operationalVerdict =
      healthScore >= 80
        ? 'ALL_SYSTEMS_NOMINAL'
        : healthScore >= 50
        ? 'DEGRADED_PERFORMANCE'
        : 'CRITICAL_INTERVENTION_REQUIRED';

    const report: SystemIntelligenceReport = {
      overallHealthScore: healthScore,
      operationalVerdict,
      timestamp: new Date().toISOString(),
      telemetry: {
        cadenceFps,
        frameDeltaMs,
        trackedJoints,
        expectedJoints,
        latencyMs,
        trackingState: typeof trackedJoints === 'number' && trackedJoints >= 20 ? 'OPTIMAL' : 'DEGRADED',
      },
      memoryUsageMb,
      activeIncidentsCount,
      cloudSync: {
        mode: activeDbMode,
        connected: isConnected,
        pendingQueueLength: pendingWrites,
        statusLabel:
          activeDbMode === 'CLOUD_FIRESTORE'
            ? 'Cloud Firestore Connected'
            : activeDbMode === 'LOCAL_DEVELOPMENT'
            ? 'Local Development (Mock DB)'
            : 'Degraded Cloud (Offline Fallback)',
      },
      agentAvailability,
    };

    return report;
  }
}

export const systemIntelligenceMonitor = SystemIntelligenceMonitor.getInstance();
