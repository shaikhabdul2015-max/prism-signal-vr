/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strategic Intelligence Engine (Phase 27 Primary Orchestrator)
 * Unifies all Phase 27 capabilities:
 * - Strategic Objective Decomposition & Formulation
 * - Long-Term Multi-Horizon Mission Planning (Critical Path & SLAs)
 * - Multi-Scenario Predictive Simulation (Strictly labeled isSimulatedData: true)
 * - Quantitative 7-Category Risk Intelligence with Early Warning Thresholds
 * - Multi-Agent Strategic Coordination across 6 Specialist Agents
 * - Strategic Knowledge Association & Outdated Assumption Audits
 * - Multi-Vector Strategy Optimization under Human-in-the-Loop Governance
 * - Multi-Mode Persistence: LOCAL_DEVELOPMENT, CLOUD_FIRESTORE, and OFFLINE_FALLBACK
 * 
 * NOTE: This is an AGI-inspired decision-support system. It does not claim
 * actual Artificial General Intelligence, consciousness, or unrestricted autonomy.
 */

import {
  StrategicIntelligenceState,
  StrategicObjective,
  StrategicPlan,
  StrategicHorizon,
  StrategicPriority,
  PersistenceStorageMode,
} from '../types/phase27';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import { longTermStrategicPlanner } from './LongTermStrategicPlanner';
import { strategicScenarioAnalyzer } from './StrategicScenarioAnalyzer';
import { strategicRiskIntelligence } from './StrategicRiskIntelligence';
import { strategicAgentCoordinator } from './StrategicAgentCoordinator';
import { strategicKnowledgeEngine } from './StrategicKnowledgeEngine';
import { strategicOptimizationEngine } from './StrategicOptimizationEngine';
import { HumanApprovalManager } from './HumanApprovalManager';
import { commandAuditService } from '../services/CommandAuditService';
import { FirebaseDbService } from '../services/firebaseDbService';

const STRATEGIC_STATE_STORAGE_KEY = 'prism_strategic_intelligence_state_p27';

export class StrategicIntelligenceEngine {
  private static instance: StrategicIntelligenceEngine | null = null;
  private listeners: Set<(state: StrategicIntelligenceState) => void> = new Set();
  private lastState: StrategicIntelligenceState | null = null;

  private constructor() {}

  public static getInstance(): StrategicIntelligenceEngine {
    if (!StrategicIntelligenceEngine.instance) {
      StrategicIntelligenceEngine.instance = new StrategicIntelligenceEngine();
    }
    return StrategicIntelligenceEngine.instance;
  }

  public static resetInstance(): void {
    StrategicIntelligenceEngine.instance = null;
  }

  /**
   * Resolves current persistence mode based on Firebase configuration and connectivity
   */
  public getPersistenceMode(): PersistenceStorageMode {
    try {
      const dbService = FirebaseDbService.getInstance();
      const dbMode = dbService.getActiveMode();
      if (dbMode === 'CLOUD_FIRESTORE') return 'CLOUD_FIRESTORE';
      if (dbMode === 'OFFLINE_FALLBACK') return 'OFFLINE_FALLBACK';
      return 'LOCAL_DEVELOPMENT';
    } catch {
      return 'LOCAL_DEVELOPMENT';
    }
  }

  /**
   * Evaluates and aggregates current strategic intelligence state across all sub-engines
   */
  public getStrategicState(
    telemetry?: VRTelemetry,
    activeIncidents?: IncidentRecord[]
  ): StrategicIntelligenceState {
    // 1. Long-Term Plan & Dynamic Revision
    const adaptation = longTermStrategicPlanner.adaptPlanToTelemetry(telemetry, activeIncidents);
    const plan = adaptation.plan;

    // 2. Multi-Tier Scenarios
    const scenarioReport = strategicScenarioAnalyzer.evaluateScenarios(
      plan.objectives[0]?.id || 'obj-imm-telemetry',
      telemetry,
      activeIncidents
    );

    // 3. Quantitative Risk Intelligence
    const riskSummary = strategicRiskIntelligence.evaluateSystemRisks(telemetry, activeIncidents);

    // 4. Multi-Agent Coordination
    const coordination = strategicAgentCoordinator.coordinateStrategicAlignment(
      telemetry,
      activeIncidents
    );

    // 5. Strategic Knowledge & Assumption Auditing
    strategicKnowledgeEngine.auditOperationalAssumptions(telemetry, activeIncidents);
    const knowledgeSummary = strategicKnowledgeEngine.getAssociations();

    // 6. Strategy Optimization & Human Approval Gate
    const optimizationReport = strategicOptimizationEngine.evaluateStrategyTradeoffs(
      telemetry,
      activeIncidents
    );

    const persistenceMode = this.getPersistenceMode();

    const state: StrategicIntelligenceState = {
      latestPlan: plan,
      activeScenarios: scenarioReport.scenarios,
      riskSummary,
      coordination,
      knowledgeSummary,
      optimizationReport,
      persistenceMode,
      lastUpdated: new Date().toISOString(),
    };

    this.lastState = state;
    this.persistState(state);
    this.notifyListeners(state);

    return state;
  }

  /**
   * Decomposes a high-level operational objective into tactical goals, metrics, and milestones
   */
  public decomposeObjective(
    title: string,
    description: string,
    horizon: StrategicHorizon = 'MEDIUM_TERM',
    priority: StrategicPriority = 'HIGH'
  ): StrategicObjective {
    const objectiveId = `obj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

    // Target metrics based on horizon
    let minCadenceFps = 72;
    let maxLatencyMs = 16;
    let minJointConfidence = 0.90;
    let maxIncidentRatePerHour = 1.0;

    if (horizon === 'IMMEDIATE') {
      minCadenceFps = 72;
      maxLatencyMs = 14;
      minJointConfidence = 0.95;
      maxIncidentRatePerHour = 0.2;
    } else if (horizon === 'LONG_TERM') {
      minCadenceFps = 60;
      maxLatencyMs = 25;
      minJointConfidence = 0.85;
      maxIncidentRatePerHour = 1.5;
    }

    const newObjective: StrategicObjective = {
      id: objectiveId,
      title,
      description,
      horizon,
      priority,
      targetMetrics: {
        minCadenceFps,
        maxLatencyMs,
        minJointConfidence,
        maxIncidentRatePerHour,
      },
      constraints: [
        'Enforce Rule #2 inconclusive verification',
        'Human-in-the-loop approval gate on high-impact interventions',
      ],
      dependencies: [],
      status: 'ACTIVE',
      progressPercent: 15,
      feasibilityScore: 88,
      resourceRequirementSummary: 'Allocated 2 dedicated worker threads, continuous telemetry logging',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    longTermStrategicPlanner.upsertObjective(newObjective);

    // Record audit event
    commandAuditService.recordEntry({
      eventType: 'COMMAND_DISPATCHED',
      actor: 'ChiefIntelligenceAgent',
      impactLevel: priority === 'CRITICAL' ? 'CRITICAL' : 'MEDIUM',
      details: JSON.stringify({
        action: 'OBJECTIVE_DECOMPOSED',
        objectiveId,
        title,
        horizon,
        priority,
      }),
    });

    return newObjective;
  }

  /**
   * Executes operator authorization for a pending strategic optimization recommendation
   */
  public approveStrategicRecommendation(
    approvalId: string,
    operatorId: string,
    notes: string = 'Approved from Strategic Intelligence Center'
  ): { success: boolean; message: string } {
    const approvalMgr = HumanApprovalManager.getInstance();
    const approved = approvalMgr.approveRequest(approvalId, operatorId, notes);

    if (approved) {
      commandAuditService.recordEntry({
        eventType: 'APPROVAL_GRANTED',
        actor: 'OPERATOR',
        impactLevel: 'HIGH',
        approvalId,
        details: JSON.stringify({ notes, operatorId, timestamp: new Date().toISOString() }),
      });
      return { success: true, message: `Approval ${approvalId} successfully granted by ${operatorId}.` };
    }

    return { success: false, message: `Failed to approve ${approvalId}: request not found or not in pending state.` };
  }

  /**
   * Persists state to local storage with fallback protection
   */
  private persistState(state: StrategicIntelligenceState): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STRATEGIC_STATE_STORAGE_KEY, JSON.stringify(state));
      }
    } catch {
      // Graceful fallback if storage full or restricted
    }
  }

  /**
   * Restores state from persistence if available
   */
  public loadPersistedState(): StrategicIntelligenceState | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const raw = window.localStorage.getItem(STRATEGIC_STATE_STORAGE_KEY);
        if (raw) {
          return JSON.parse(raw);
        }
      }
    } catch {
      return null;
    }
    return null;
  }

  public subscribe(listener: (state: StrategicIntelligenceState) => void): () => void {
    this.listeners.add(listener);
    if (this.lastState) {
      listener(this.lastState);
    }
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(state: StrategicIntelligenceState): void {
    this.listeners.forEach((l) => {
      try {
        l(state);
      } catch (err) {
        console.error('Error in StrategicIntelligenceEngine subscriber', err);
      }
    });
  }
}

export const strategicIntelligenceEngine = StrategicIntelligenceEngine.getInstance();
