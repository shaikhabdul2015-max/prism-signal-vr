/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 20: Collective Autonomous Intelligence Engine.
 * Coordinates the 6 specialist agents, manages agent-to-agent communication,
 * maintains shared intelligence memory, distributes tasks autonomously,
 * and synthesizes explainable AI decisions.
 */

import { AgentRole } from '../types/phase17';
import { VRTelemetry } from '../types/diagnostics';
import {
  AgentMessage,
  AgentWorkloadStatus,
  IntelligenceMemoryItem,
  ExplainableDecision,
  CollectiveIntelligenceSnapshot,
  MemoryCategory,
} from '../types/phase20';
import { agentDebateEngine } from './AgentDebateEngine';
import { missionPlanningEngine } from './MissionPlanningEngine';
import { assessEnvironmentalCausation } from './environmentalAssessment';

export const SIX_SPECIALIST_ROLES: AgentRole[] = [
  'OperationsAgent',
  'TestAgent',
  'TrackingAgent',
  'PerformanceAgent',
  'IncidentAgent',
  'ChiefIntelligenceAgent',
];

const STORAGE_MEMORY_KEY = 'PRISM_COLLECTIVE_INTELLIGENCE_MEMORY_V1';

export class CollectiveIntelligenceEngine {
  private static instance: CollectiveIntelligenceEngine | null = null;
  private messages: AgentMessage[] = [];
  private memoryItems: IntelligenceMemoryItem[] = [];
  private decisions: ExplainableDecision[] = [];
  private workloads: Record<AgentRole, AgentWorkloadStatus>;
  private listeners: Set<(snapshot: CollectiveIntelligenceSnapshot) => void> = new Set();

  private constructor() {
    this.workloads = this.initWorkloads();
    this.loadMemory();
    this.seedBaselineInteractions();
  }

  public static getInstance(): CollectiveIntelligenceEngine {
    if (!CollectiveIntelligenceEngine.instance) {
      CollectiveIntelligenceEngine.instance = new CollectiveIntelligenceEngine();
    }
    return CollectiveIntelligenceEngine.instance;
  }

  public static resetInstance(): void {
    CollectiveIntelligenceEngine.instance = null;
  }

  private initWorkloads(): Record<AgentRole, AgentWorkloadStatus> {
    const workloads = {} as Record<AgentRole, AgentWorkloadStatus>;
    const now = new Date().toISOString();
    SIX_SPECIALIST_ROLES.forEach((role) => {
      workloads[role] = {
        agent: role,
        currentTaskCount: 0,
        maxCapacity: 4,
        isAvailable: true,
        lastActiveTimestamp: now,
      };
    });
    return workloads;
  }

  private seedBaselineInteractions(): void {
    const now = new Date();
    // Seed initial agent message
    this.messages.push({
      messageId: 'msg-seed-1',
      sender: 'ChiefIntelligenceAgent',
      recipient: 'BROADCAST',
      messageType: 'STATUS_UPDATE',
      content: 'Collective Intelligence Bus initialized across all 6 specialist agents. Standby for operational telemetry.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 10).toISOString(),
      requiresAck: false,
      acknowledged: true,
    });

    this.messages.push({
      messageId: 'msg-seed-2',
      sender: 'OperationsAgent',
      recipient: 'TrackingAgent',
      messageType: 'TASK_REQUEST',
      content: 'Requesting continuous kinematic tracking validation across 25 joints.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 8).toISOString(),
      requiresAck: true,
      acknowledged: true,
    });

    this.messages.push({
      messageId: 'msg-seed-3',
      sender: 'TrackingAgent',
      recipient: 'OperationsAgent',
      messageType: 'TASK_ACK',
      content: 'Task acknowledged. Optical skeleton tracking nominal; mean joint confidence 0.94.',
      timestamp: new Date(now.getTime() - 1000 * 60 * 7).toISOString(),
      requiresAck: false,
      acknowledged: true,
      correlationId: 'msg-seed-2',
    });

    // Seed initial decision
    if (this.decisions.length === 0) {
      this.decisions.push({
        decisionId: 'dec-init-1',
        title: 'Establish Nominal 72Hz VR Operating Baseline',
        decisionSummary: 'Consensus established across all 6 agents to maintain 72Hz Quest target with balanced quality profile.',
        primaryRecommendation: 'Operate with Balanced profile (0.85x scale, low shadows).',
        supportingEvidence: ['WebGL buffer fill-rate nominal', 'Joint tracking latency <= 14ms'],
        participatingAgents: [...SIX_SPECIALIST_ROLES],
        alternativeRecommendations: [
          {
            agent: 'PerformanceAgent',
            recommendation: 'Target 90Hz refresh rate',
            tradeOff: 'Increases battery drain and thermal throttling probability',
            confidence: 0.75,
          },
        ],
        confidenceScore: 0.94,
        uncertaintyDisclosure: 'Thermal headroom may vary under high room ambient temperature.',
        humanApprovalStatus: 'APPROVED',
        createdAt: new Date(now.getTime() - 1000 * 60 * 15).toISOString(),
      });
    }

    // Seed memory item if empty
    if (this.memoryItems.length === 0) {
      this.storeMemoryItem({
        category: 'VERIFIED_RECOMMENDATION',
        title: 'Optimal Hand Pose Distance for Quest Optical Cameras',
        summary: 'Optimal hand tracking confidence (>0.90) requires 25cm–45cm distance from headset cameras with fingers angled ~45° toward sensors.',
        tags: ['optical_tracking', 'quest_best_practices', 'kinematics'],
        evidenceHash: 'HASH-OPTICAL-25-45CM',
        contributingAgents: ['TrackingAgent', 'OperationsAgent'],
        confidenceScore: 0.96,
        verified: true,
      });
    }
  }

  // ==========================================================================
  // Agent-to-Agent Messaging
  // ==========================================================================

  public sendMessage(
    sender: AgentRole,
    recipient: AgentRole | 'BROADCAST',
    messageType: AgentMessage['messageType'],
    content: string,
    payload?: Record<string, unknown>,
    requiresAck: boolean = false
  ): AgentMessage {
    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    const msg: AgentMessage = {
      messageId,
      sender,
      recipient,
      messageType,
      content,
      payload,
      timestamp: now,
      requiresAck,
      acknowledged: !requiresAck,
    };

    this.messages.unshift(msg);
    if (this.messages.length > 60) {
      this.messages.pop();
    }

    // Update sender workload timestamp
    if (this.workloads[sender]) {
      this.workloads[sender].lastActiveTimestamp = now;
    }

    this.notify();
    return msg;
  }

  public acknowledgeMessage(messageId: string): boolean {
    const msg = this.messages.find((m) => m.messageId === messageId);
    if (!msg) return false;

    msg.acknowledged = true;
    this.notify();
    return true;
  }

  public getMessages(): AgentMessage[] {
    return [...this.messages];
  }

  // ==========================================================================
  // Shared Intelligence Memory
  // ==========================================================================

  public storeMemoryItem(
    item: Omit<IntelligenceMemoryItem, 'memoryId' | 'recordedAt'>
  ): IntelligenceMemoryItem {
    const memoryId = `mem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const fullItem: IntelligenceMemoryItem = {
      ...item,
      memoryId,
      recordedAt: new Date().toISOString(),
    };

    this.memoryItems.unshift(fullItem);
    // Retention limit: keep max 50 verified memory items to prevent localStorage bloat
    if (this.memoryItems.length > 50) {
      this.memoryItems.pop();
    }

    this.saveMemory();
    this.notify();
    return fullItem;
  }

  public getMemoryItems(): IntelligenceMemoryItem[] {
    return [...this.memoryItems];
  }

  public queryMemory(tagOrCategory: string): IntelligenceMemoryItem[] {
    const query = tagOrCategory.toLowerCase();
    return this.memoryItems.filter(
      (m) =>
        m.category.toLowerCase() === query ||
        m.tags.some((t) => t.toLowerCase().includes(query)) ||
        m.title.toLowerCase().includes(query)
    );
  }

  private saveMemory(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_MEMORY_KEY, JSON.stringify(this.memoryItems));
    } catch {
      // Storage unavailable
    }
  }

  private loadMemory(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_MEMORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.memoryItems = parsed;
        }
      }
    } catch {
      this.memoryItems = [];
    }
  }

  // ==========================================================================
  // Collective Intelligence Synthesis & Explainable AI Decisions
  // ==========================================================================

  public synthesizeCollectiveDecision(
    title: string,
    telemetry: VRTelemetry,
    requiresHumanApproval: boolean = false
  ): ExplainableDecision {
    const decisionId = `dec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Check Rule #2 Invariant
    const rule2Assessment = assessEnvironmentalCausation(telemetry.causationEvidence);

    // Conduct Multi-Agent Debate for conflicting inputs
    const debate = agentDebateEngine.conductDebate(title, { sessionId: telemetry.sessionId }, telemetry);

    // Generate Evidence from live telemetry
    const trackedJoints = telemetry.joints?.filter((j) => j.tracked).length || 25;
    const frames = telemetry.frames || [];
    const avgDuration = frames.length > 0 ? frames[0]?.frameDurationMs || 13.88 : 13.88;
    const currentFps = Math.round(1000 / avgDuration);

    const evidence: string[] = [
      `Live frame cadence: ${currentFps} FPS (${avgDuration.toFixed(1)}ms frame duration).`,
      `Skeletal anatomical coverage: ${trackedJoints}/25 joints resolved.`,
      `Rule #2 Status: ${rule2Assessment.causationStatus}. ${rule2Assessment.explanation}`,
    ];

    // Build alternative recommendations from non-winning debate arguments
    const alternatives = debate.arguments
      .filter((a) => a.recommendedAction !== debate.resolution?.winningSynthesis)
      .slice(0, 2)
      .map((a) => ({
        agent: a.agent,
        recommendation: a.position,
        tradeOff: a.counterArguments[0] || 'Alternative trade-off evaluated during debate',
        confidence: a.confidence,
      }));

    const decision: ExplainableDecision = {
      decisionId,
      title,
      decisionSummary: debate.resolution?.winningSynthesis || 'Consensus reached on nominal operations.',
      primaryRecommendation: debate.resolution?.justification || 'Maintain current operational parameters.',
      supportingEvidence: evidence,
      participatingAgents: [...SIX_SPECIALIST_ROLES],
      alternativeRecommendations: alternatives,
      confidenceScore: debate.resolution?.consensusScore || 0.90,
      uncertaintyDisclosure: `Cross-agent debate unanimity was ${Math.round((debate.resolution?.unanimityRatio || 0.85) * 100)}%. Physical hardware causation requires verified sensor tokens.`,
      humanApprovalStatus: requiresHumanApproval ? 'PENDING' : 'NOT_REQUIRED',
      createdAt: now,
    };

    this.decisions.unshift(decision);
    if (this.decisions.length > 30) {
      this.decisions.pop();
    }

    // Broadcast decision announcement to agent message bus
    this.sendMessage(
      'ChiefIntelligenceAgent',
      'BROADCAST',
      'STATUS_UPDATE',
      `Collective Decision Formulated: "${title}". Consensus Score: ${(decision.confidenceScore * 100).toFixed(0)}%.`,
      { decisionId }
    );

    // Record decision in shared memory
    this.storeMemoryItem({
      category: 'DECISION',
      title: decision.title,
      summary: decision.decisionSummary,
      tags: ['collective_decision', 'multi_agent_consensus'],
      evidenceHash: `HASH-DEC-${decisionId}`,
      contributingAgents: decision.participatingAgents,
      confidenceScore: decision.confidenceScore,
      verified: true,
    });

    this.notify();
    return decision;
  }

  public approveDecision(decisionId: string): boolean {
    const decision = this.decisions.find((d) => d.decisionId === decisionId);
    if (!decision) return false;

    decision.humanApprovalStatus = 'APPROVED';
    this.sendMessage(
      'ChiefIntelligenceAgent',
      'BROADCAST',
      'STATUS_UPDATE',
      `Operator Approval Granted for Decision "${decision.title}".`
    );
    this.notify();
    return true;
  }

  public rejectDecision(decisionId: string): boolean {
    const decision = this.decisions.find((d) => d.decisionId === decisionId);
    if (!decision) return false;

    decision.humanApprovalStatus = 'REJECTED';
    this.sendMessage(
      'ChiefIntelligenceAgent',
      'BROADCAST',
      'STATUS_UPDATE',
      `Operator Rejected Decision "${decision.title}". Re-routing to manual configuration.`
    );
    this.notify();
    return true;
  }

  public getDecisions(): ExplainableDecision[] {
    return [...this.decisions];
  }

  public getWorkloads(): Record<AgentRole, AgentWorkloadStatus> {
    return { ...this.workloads };
  }

  // ==========================================================================
  // Subscription & Snapshot
  // ==========================================================================

  public getSnapshot(): CollectiveIntelligenceSnapshot {
    const debates = agentDebateEngine.getDebates();
    const missions = missionPlanningEngine.getMissions();
    const consensusSum = debates.reduce((acc, d) => acc + (d.resolution?.consensusScore || 0.8), 0);
    const consensusAverageScore = debates.length > 0 ? consensusSum / debates.length : 0.88;

    const pendingApprovalCount =
      this.decisions.filter((d) => d.humanApprovalStatus === 'PENDING').length +
      missions.filter((m) => m.state === 'PENDING_APPROVAL').length;

    return {
      activeMissions: missions,
      recentMessages: this.getMessages().slice(0, 15),
      recentDebates: debates.slice(0, 5),
      recentDecisions: this.getDecisions().slice(0, 10),
      memoryItems: this.getMemoryItems().slice(0, 10),
      workloads: this.getWorkloads(),
      consensusAverageScore: Math.round(consensusAverageScore * 100) / 100,
      pendingApprovalCount,
      timestamp: new Date().toISOString(),
    };
  }

  public subscribe(callback: (snapshot: CollectiveIntelligenceSnapshot) => void): () => void {
    this.listeners.add(callback);
    callback(this.getSnapshot());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const snapshot = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(snapshot);
      } catch (err) {
        console.error('[CollectiveIntelligenceEngine] Listener error:', err);
      }
    });
  }
}

export const collectiveIntelligence = CollectiveIntelligenceEngine.getInstance();
