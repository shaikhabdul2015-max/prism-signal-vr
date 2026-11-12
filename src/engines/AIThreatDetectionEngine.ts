/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * AI Threat Detection Engine (Phase 32)
 * Deterministic defensive threat detector monitoring authentication anomalies,
 * repeated authorization violations, abnormal agent communication patterns,
 * prompt injection signals, and configuration tampering.
 * Correlates threat events into IncidentManager and triggers defense levels.
 */

import {
  AIThreatEvent,
  SecuritySeverity,
  ResponseLevel,
} from '../types/phase32';
import { DistributedEventBus } from './DistributedEventBus';

export class AIThreatDetectionEngine {
  private static instance: AIThreatDetectionEngine | null = null;
  private threatHistory: AIThreatEvent[] = [];
  private authFailureCounts: Map<string, { count: number; firstFailureMs: number }> = new Map();
  private listeners: Set<(threats: AIThreatEvent[]) => void> = new Set();

  public constructor() {
    this.seedBaselineThreatHistory();
  }

  public static getInstance(): AIThreatDetectionEngine {
    if (!AIThreatDetectionEngine.instance) {
      AIThreatDetectionEngine.instance = new AIThreatDetectionEngine();
    }
    return AIThreatDetectionEngine.instance;
  }

  public static resetInstance(): void {
    AIThreatDetectionEngine.instance = null;
  }

  private seedBaselineThreatHistory(): void {
    const seeds: AIThreatEvent[] = [
      {
        eventId: 'threat-seed-01',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        category: 'AUTHENTICATION_ANOMALY',
        affectedComponent: 'FirebaseAuthService',
        evidence: { attempts: 1, method: 'Popup' },
        severity: 'INFO',
        confidence: 90,
        explanation: 'Nominal enterprise user authentication state verified.',
        recommendedDefensiveResponse: 'Maintain standard telemetry surveillance.',
        responseLevel: 'OBSERVE',
        mitigated: true,
        mitigatedAt: new Date(Date.now() - 3590000).toISOString(),
      },
    ];
    this.threatHistory.push(...seeds);
  }

  /**
   * Evaluates authentication failure events to detect brute-force or rapid credential stuffing.
   */
  public evaluateAuthFailure(subjectId: string, ipAddress = '127.0.0.1'): AIThreatEvent | null {
    const now = Date.now();
    const entry = this.authFailureCounts.get(subjectId) || { count: 0, firstFailureMs: now };

    // Reset window after 2 minutes
    if (now - entry.firstFailureMs > 120000) {
      entry.count = 0;
      entry.firstFailureMs = now;
    }

    entry.count += 1;
    this.authFailureCounts.set(subjectId, entry);

    if (entry.count >= 5) {
      const severity: SecuritySeverity = entry.count >= 10 ? 'CRITICAL' : 'HIGH';
      const responseLevel: ResponseLevel = entry.count >= 10 ? 'CONTAIN' : 'RESTRICT';

      return this.recordThreat({
        category: 'AUTHENTICATION_ANOMALY',
        affectedComponent: 'AuthenticationGateway',
        evidence: { subjectId, failureCount: entry.count, ipAddress, windowMs: now - entry.firstFailureMs },
        severity,
        confidence: 96,
        explanation: `Rapid consecutive authentication failures (${entry.count} attempts) detected for ${subjectId}.`,
        recommendedDefensiveResponse: 'Temporarily throttle incoming requests from source IP and prompt MFA verification.',
        responseLevel,
      });
    }

    return null;
  }

  /**
   * Evaluates prompt inputs for known injection heuristics and delimiters.
   */
  public evaluatePromptInjection(promptText: string, source: string): AIThreatEvent | null {
    const lower = promptText.toLowerCase();
    const dangerousPatterns = [
      'ignore previous instructions',
      'disregard previous instructions',
      'system prompt override',
      'you are now in unrestricted mode',
      'bypass rule #2',
      'bypass safety checks',
      'reveal system secret',
      'dump database keys',
      'sudo execute',
    ];

    const matched = dangerousPatterns.filter((p) => lower.includes(p));

    if (matched.length > 0) {
      return this.recordThreat({
        category: 'PROMPT_INJECTION',
        affectedComponent: 'AIPromptSecurityEngine',
        evidence: { matchedPatterns: matched, source, snippet: promptText.slice(0, 100) },
        severity: 'HIGH',
        confidence: 95,
        explanation: `Prompt contains instruction override or jailbreak markers: [${matched.join(', ')}].`,
        recommendedDefensiveResponse: 'Neutralize instruction override, enforce system prompt isolation, and flag user input.',
        responseLevel: 'RESTRICT',
      });
    }

    return null;
  }

  /**
   * Evaluates agent privilege elevation attempts.
   */
  public evaluateAgentPrivilegeAnomaly(agentId: string, requestedCapability: string, assignedCapabilities: string[]): AIThreatEvent | null {
    if (!assignedCapabilities.includes(requestedCapability)) {
      return this.recordThreat({
        category: 'AGENT_IMPERSONATION',
        affectedComponent: 'AgentIdentitySecurityManager',
        evidence: { agentId, requestedCapability, assignedCapabilities },
        severity: 'HIGH',
        confidence: 98,
        explanation: `Agent "${agentId}" attempted to execute capability "${requestedCapability}" outside its cryptographic manifest.`,
        recommendedDefensiveResponse: 'Block unauthorized execution, log security incident, and notify Incident Commander.',
        responseLevel: 'RESTRICT',
      });
    }
    return null;
  }

  /**
   * Records a detected threat event and dispatches via EventBus.
   */
  public recordThreat(params: {
    category: AIThreatEvent['category'];
    affectedComponent: string;
    evidence: Record<string, any>;
    severity: SecuritySeverity;
    confidence: number;
    explanation: string;
    recommendedDefensiveResponse: string;
    responseLevel: ResponseLevel;
  }): AIThreatEvent {
    const eventId = `tht-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const event: AIThreatEvent = {
      eventId,
      timestamp: new Date().toISOString(),
      category: params.category,
      affectedComponent: params.affectedComponent,
      evidence: params.evidence,
      severity: params.severity,
      confidence: params.confidence,
      explanation: params.explanation,
      recommendedDefensiveResponse: params.recommendedDefensiveResponse,
      responseLevel: params.responseLevel,
      mitigated: false,
    };

    this.threatHistory.unshift(event);
    if (this.threatHistory.length > 100) {
      this.threatHistory.pop();
    }

    DistributedEventBus.getInstance().publish({
      eventType: 'SECURITY_THREAT_DETECTED',
      source: 'AIThreatDetectionEngine',
      priority: params.severity === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
      payload: event,
      suppressionFingerprint: `threat-${params.category}-${params.affectedComponent}`,
      correlateIncidentOnCritical: params.severity === 'CRITICAL',
    });

    this.notifyListeners();
    return event;
  }

  public markThreatMitigated(eventId: string): boolean {
    const threat = this.threatHistory.find((t) => t.eventId === eventId);
    if (!threat) return false;

    threat.mitigated = true;
    threat.mitigatedAt = new Date().toISOString();
    this.notifyListeners();
    return true;
  }

  public getAllThreats(): AIThreatEvent[] {
    return [...this.threatHistory];
  }

  public subscribe(listener: (threats: AIThreatEvent[]) => void): () => void {
    this.listeners.add(listener);
    listener(this.getAllThreats());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const list = this.getAllThreats();
    this.listeners.forEach((l) => l(list));
  }
}
