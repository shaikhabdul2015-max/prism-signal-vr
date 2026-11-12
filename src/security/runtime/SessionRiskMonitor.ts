/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Session Risk Monitor
 * Continuously validates session state, IP jitter, user agent fidelity, and token expiration.
 */

import { ResponseExecutor } from '../response/ResponseExecutor';

export interface ActiveSessionRecord {
  sessionId: string;
  userId: string;
  sourceIp: string;
  userAgent: string;
  createdAt: number;
  lastActiveAt: number;
  riskScore: number;
}

export class SessionRiskMonitor {
  private static instance: SessionRiskMonitor | null = null;
  private sessions: Map<string, ActiveSessionRecord> = new Map();
  private maxIdleTimeMs = 1800000; // 30 minutes
  private maxSessionAgeMs = 86400000; // 24 hours

  private constructor() {}

  public static getInstance(): SessionRiskMonitor {
    if (!SessionRiskMonitor.instance) {
      SessionRiskMonitor.instance = new SessionRiskMonitor();
    }
    return SessionRiskMonitor.instance;
  }

  public static resetInstance(): void {
    if (SessionRiskMonitor.instance) {
      SessionRiskMonitor.instance.sessions.clear();
    }
    SessionRiskMonitor.instance = null;
  }

  public registerSession(
    sessionId: string,
    userId: string,
    sourceIp: string,
    userAgent: string
  ): ActiveSessionRecord {
    const record: ActiveSessionRecord = {
      sessionId,
      userId,
      sourceIp,
      userAgent,
      createdAt: Date.now(),
      lastActiveAt: Date.now(),
      riskScore: 0,
    };
    this.sessions.set(sessionId, record);
    return record;
  }

  /**
   * Validates active session integrity on every request.
   */
  public validateSession(
    sessionId: string,
    currentIp: string,
    currentUserAgent: string
  ): {
    valid: boolean;
    reason?: string;
    anomalyType?: 'IP_MUTATION' | 'UA_MUTATION' | 'SESSION_EXPIRED' | 'SESSION_REVOKED' | 'STEP_UP_REQUIRED';
    requiresStepUp?: boolean;
  } {
    // 1. Check if session was explicitly revoked by response executor
    if (ResponseExecutor.isSessionRevoked(sessionId)) {
      return { valid: false, reason: 'Session has been revoked by security policy', anomalyType: 'SESSION_REVOKED' };
    }

    // 2. Check if step-up authentication is currently required
    if (ResponseExecutor.isStepUpRequired(sessionId)) {
      return { valid: false, reason: 'Step-up authentication required', requiresStepUp: true, anomalyType: 'STEP_UP_REQUIRED' };
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return { valid: false, reason: 'Session not found in active session store' };
    }

    const now = Date.now();

    // 3. Expiration checks
    if (now - session.lastActiveAt > this.maxIdleTimeMs) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'Session idle timeout expired', anomalyType: 'SESSION_EXPIRED' };
    }

    if (now - session.createdAt > this.maxSessionAgeMs) {
      this.sessions.delete(sessionId);
      return { valid: false, reason: 'Session maximum lifetime exceeded', anomalyType: 'SESSION_EXPIRED' };
    }

    // 4. IP Mutation detection (Session Hijacking Indicator)
    if (session.sourceIp !== currentIp) {
      session.riskScore += 40;
      return {
        valid: false,
        reason: `Session IP address changed from ${session.sourceIp} to ${currentIp}`,
        anomalyType: 'IP_MUTATION',
      };
    }

    // 5. User-Agent Mutation detection
    if (session.userAgent !== currentUserAgent) {
      session.riskScore += 50;
      return {
        valid: false,
        reason: 'Session User-Agent fingerprint mutated mid-session',
        anomalyType: 'UA_MUTATION',
      };
    }

    // Update activity
    session.lastActiveAt = now;
    return { valid: true };
  }

  public getSession(sessionId: string): ActiveSessionRecord | undefined {
    return this.sessions.get(sessionId);
  }

  public terminateSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}
