/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 36 Integration Coordinator
 * Master coordinator uniting all 10 Phase 36 engines:
 * UnifiedIntelligenceOrchestrator, SystemWideCoordinationEngine, GlobalIntelligenceStateManager,
 * CrossEngineIntegrationEngine, UnifiedMissionOrchestrator, ExecutiveAgentCouncil,
 * SystemHealthIntelligenceEngine, UnifiedSecurityGovernanceEngine, GlobalPerformanceIntelligence,
 * and SystemReadinessEngine.
 */

import {
  UnifiedSuperintelligenceState,
  PersistenceTierMode,
} from '../types/phase36';
import { UnifiedIntelligenceOrchestrator } from './UnifiedIntelligenceOrchestrator';
import { SystemWideCoordinationEngine } from './SystemWideCoordinationEngine';
import { GlobalIntelligenceStateManager } from './GlobalIntelligenceStateManager';
import { CrossEngineIntegrationEngine } from './CrossEngineIntegrationEngine';
import { UnifiedMissionOrchestrator } from './UnifiedMissionOrchestrator';
import { ExecutiveAgentCouncil } from './ExecutiveAgentCouncil';
import { SystemHealthIntelligenceEngine } from './SystemHealthIntelligenceEngine';
import { UnifiedSecurityGovernanceEngine } from './UnifiedSecurityGovernanceEngine';
import { GlobalPerformanceIntelligence } from './GlobalPerformanceIntelligence';
import { SystemReadinessEngine } from './SystemReadinessEngine';
import { DistributedEventBus } from './DistributedEventBus';
import type { AgentOrchestrator } from '../ai/orchestration/AgentOrchestrator';
import type { DynamicDifficultyEngine } from '../ai/adaptive/DynamicDifficultyEngine';
import type { ContextualInteractionSystem } from '../webxr/intelligence/ContextualInteractionSystem';
import type { SpatialMappingEngine } from '../spatial/SpatialMappingEngine';
import type { SpatialObjectIntelligence } from '../spatial/SpatialObjectIntelligence';
import type { SpatialSecurityGuard } from '../spatial/SpatialSecurityGuard';
import type { RealTimeWorldAwareness } from '../spatial/RealTimeWorldAwareness';

export interface Stage67RuntimeConnection {
  agentOrchestrator?: AgentOrchestrator;
  spatialMapping?: SpatialMappingEngine;
  spatialObjectIntelligence?: SpatialObjectIntelligence;
  spatialSecurityGuard?: SpatialSecurityGuard;
  worldAwareness?: RealTimeWorldAwareness;
  dynamicDifficulty?: DynamicDifficultyEngine;
  contextualInteraction?: ContextualInteractionSystem;
  isVRSessionActive?: () => boolean;
  getActiveControllersCount?: () => number;
}

export interface Stage67RuntimeStatus {
  connected: boolean;
  hasAgentOrchestrator: boolean;
  hasSpatialMapping: boolean;
  hasSpatialObjectIntelligence: boolean;
  hasSpatialSecurityGuard: boolean;
  hasWorldAwareness: boolean;
  hasDynamicDifficulty: boolean;
  hasContextualInteraction: boolean;
  humanControlActive: boolean;
  humanInputEpoch: number;
  sceneGraphConsistent: boolean | null;
  roomScanPermitted: boolean;
  cameraRecognitionPermitted: boolean;
  totalOrchestrationCycles: number;
}

export class Phase36IntegrationCoordinator {
  private static instance: Phase36IntegrationCoordinator | null = null;
  private listeners: Set<(state: UnifiedSuperintelligenceState) => void> = new Set();
  private stage67Runtime: Stage67RuntimeConnection | null = null;

  public constructor() {}

  public static getInstance(): Phase36IntegrationCoordinator {
    if (!Phase36IntegrationCoordinator.instance) {
      Phase36IntegrationCoordinator.instance = new Phase36IntegrationCoordinator();
    }
    return Phase36IntegrationCoordinator.instance;
  }

  public static resetInstance(): void {
    if (Phase36IntegrationCoordinator.instance) {
      Phase36IntegrationCoordinator.instance.listeners.clear();
      Phase36IntegrationCoordinator.instance.stage67Runtime = null;
    }
    Phase36IntegrationCoordinator.instance = null;
  }

  /**
   * Binds existing Stage 6 & Stage 7 runtime modules to the Phase 36 coordinator
   * without creating duplicate orchestrators or singleton conflicts.
   */
  public connectStage67Runtime(connection: Stage67RuntimeConnection): void {
    this.stage67Runtime = { ...connection };

    const orchestrator = UnifiedIntelligenceOrchestrator.getInstance();
    const now = new Date().toISOString();

    if (connection.agentOrchestrator && !orchestrator.getEngine('eng-stage6-adaptive-ai')) {
      orchestrator.registerEngine({
        engineId: 'eng-stage6-adaptive-ai',
        name: 'Stage 6 Multi-Agent & Adaptive AI Orchestrator',
        domain: 'CORE_ORCHESTRATION',
        version: 'v6.0.0',
        health: 'HEALTHY',
        capabilities: [
          'MULTI_AGENT_ORCHESTRATION',
          'DYNAMIC_DIFFICULTY',
          'HUMAN_CONTROL_PRIORITY',
        ],
        dependencyEngineIds: ['eng-p31-distributed-mesh'],
        latencyMs: 6,
        lastHeartbeat: now,
      });
    }

    if (connection.spatialMapping && !orchestrator.getEngine('eng-stage7-spatial-intel')) {
      orchestrator.registerEngine({
        engineId: 'eng-stage7-spatial-intel',
        name: 'Stage 7 Spatial Mapping & Reality Awareness Engine',
        domain: 'WEBXR_SPATIAL',
        version: 'v7.0.0',
        health: 'HEALTHY',
        capabilities: [
          'SPATIAL_MAPPING',
          'SEMANTIC_SCENE_GRAPH',
          'SPATIAL_SECURITY_GUARD',
        ],
        dependencyEngineIds: ['eng-p29-webxr-reality', 'eng-p32-zero-trust'],
        latencyMs: 4,
        lastHeartbeat: now,
      });
    }

    this.broadcastEvent('STAGE67_RUNTIME_CONNECTED', {
      hasAgentOrchestrator: Boolean(connection.agentOrchestrator),
      hasSpatialMapping: Boolean(connection.spatialMapping),
      hasSpatialSecurityGuard: Boolean(connection.spatialSecurityGuard),
    });
    this.notifyChange();
  }

  public disconnectStage67Runtime(): void {
    this.stage67Runtime = null;
    this.notifyChange();
  }

  public getStage67RuntimeStatus(): Stage67RuntimeStatus {
    const rt = this.stage67Runtime;
    if (!rt) {
      return {
        connected: false,
        hasAgentOrchestrator: false,
        hasSpatialMapping: false,
        hasSpatialObjectIntelligence: false,
        hasSpatialSecurityGuard: false,
        hasWorldAwareness: false,
        hasDynamicDifficulty: false,
        hasContextualInteraction: false,
        humanControlActive: false,
        humanInputEpoch: 0,
        sceneGraphConsistent: null,
        roomScanPermitted: false,
        cameraRecognitionPermitted: false,
        totalOrchestrationCycles: 0,
      };
    }

    const guard = rt.spatialSecurityGuard;
    const stats = rt.agentOrchestrator?.getResourceStats();
    const consistency = rt.spatialMapping?.validateSceneGraphConsistency();

    return {
      connected: true,
      hasAgentOrchestrator: Boolean(rt.agentOrchestrator),
      hasSpatialMapping: Boolean(rt.spatialMapping),
      hasSpatialObjectIntelligence: Boolean(rt.spatialObjectIntelligence),
      hasSpatialSecurityGuard: Boolean(guard),
      hasWorldAwareness: Boolean(rt.worldAwareness),
      hasDynamicDifficulty: Boolean(rt.dynamicDifficulty),
      hasContextualInteraction: Boolean(rt.contextualInteraction),
      humanControlActive: rt.agentOrchestrator?.isHumanControlActive() ?? false,
      humanInputEpoch: rt.agentOrchestrator?.getHumanInputEpoch() ?? 0,
      sceneGraphConsistent: consistency ? consistency.isConsistent : null,
      roomScanPermitted: guard ? guard.isAllowed('room_scanning') : false,
      cameraRecognitionPermitted: guard ? guard.isAllowed('camera_recognition') : false,
      totalOrchestrationCycles: stats?.totalCyclesExecuted ?? 0,
    };
  }

  /**
   * Compiles the comprehensive Unified Superintelligence State.
   */
  public getState(): UnifiedSuperintelligenceState {
    const orchestrator = UnifiedIntelligenceOrchestrator.getInstance();
    const missionOrchestrator = UnifiedMissionOrchestrator.getInstance();
    const council = ExecutiveAgentCouncil.getInstance();
    const healthEngine = SystemHealthIntelligenceEngine.getInstance();
    const securityEngine = UnifiedSecurityGovernanceEngine.getInstance();
    const performanceEngine = GlobalPerformanceIntelligence.getInstance();
    const readinessEngine = SystemReadinessEngine.getInstance();
    const stateManager = GlobalIntelligenceStateManager.getInstance();

    const now = new Date().toISOString();
    const rt = this.stage67Runtime;
    const guard = rt?.spatialSecurityGuard;
    const physicalSessionActive = rt?.isVRSessionActive ? rt.isVRSessionActive() : false;
    const activeControllersCount = rt?.getActiveControllersCount ? rt.getActiveControllersCount() : 0;
    const sensorPermissionsGranted = guard
      ? guard.isAllowed('room_scanning') ||
        guard.isAllowed('camera_recognition') ||
        guard.isAllowed('hand_tracking') ||
        guard.isAllowed('spatial_anchors')
      : false;

    return {
      registeredEngines: orchestrator.getAllEngines(),
      activeMissions: missionOrchestrator.getAllMissions(),
      executiveReport: council.getLatestReport(),
      systemHealth: healthEngine.getLatestHealthReport(),
      securityGovernance: securityEngine.getSecurityState(),
      performanceMetrics: performanceEngine.getLatestPerformance(),
      readinessReport: readinessEngine.getLatestReadinessReport(),
      spatialStatus: {
        webxrSupported: typeof navigator !== 'undefined' && 'xr' in navigator,
        physicalSessionActive,
        activeControllersCount,
        trackingStability: physicalSessionActive ? 'OPTIMAL' : 'SIMULATED',
        sensorPermissionsGranted,
      },
      persistenceMode: stateManager.getPersistenceMode(),
      recentOrchestrationTasks: orchestrator.getOrchestrationHistory().slice(0, 10),
      lastUpdated: now,
    };
  }

  /**
   * Sets the active persistence mode across the system.
   */
  public setPersistenceMode(mode: PersistenceTierMode): void {
    GlobalIntelligenceStateManager.getInstance().setPersistenceMode(mode);
    this.broadcastEvent('GLOBAL_STATE_UPDATED', { persistenceMode: mode });
    this.notifyChange();
  }

  /**
   * Triggers a system-wide coordination and readiness pass.
   */
  public runFullCoordinationCycle(): {
    timestamp: string;
    coordinationStatus: string;
    readinessVerdict: string;
  } {
    const coord = SystemWideCoordinationEngine.getInstance().executeCoordinationCycle();
    const councilReport = ExecutiveAgentCouncil.getInstance().compileCouncilReport();
    const readiness = SystemReadinessEngine.getInstance().assessReadiness();
    SystemHealthIntelligenceEngine.getInstance().evaluateSystemHealth();

    this.broadcastEvent('SYSTEM_WIDE_ORCHESTRATION_STARTED', {
      coordinationStatus: coord.coordinationStatus,
      readiness: readiness.readinessVerdict,
      agreement: councilReport.consensusAgreementPercent,
    });

    this.notifyChange();

    return {
      timestamp: coord.timestamp,
      coordinationStatus: coord.coordinationStatus,
      readinessVerdict: readiness.readinessVerdict,
    };
  }

  public broadcastEvent(eventType: string, payload: Record<string, any>): void {
    try {
      DistributedEventBus.getInstance().publish({
        eventType,
        source: 'Phase36IntegrationCoordinator',
        priority: 'MEDIUM',
        payload,
        suppressionFingerprint: `${eventType}-${Date.now()}`,
      });
    } catch {
      // Event bus fallback
    }
  }

  public subscribe(listener: (state: UnifiedSuperintelligenceState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public notifyChange(): void {
    const st = this.getState();
    this.listeners.forEach((fn) => fn(st));
  }
}
