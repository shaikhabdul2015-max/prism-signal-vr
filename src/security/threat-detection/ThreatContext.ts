/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Threat Context Factory
 */

import { ThreatContext } from './ThreatEvent';

export class ThreatContextManager {
  public static sanitizeContext(ctx: Partial<ThreatContext>): ThreatContext {
    const sourceIp = ctx.sourceIp && ctx.sourceIp.trim() !== '' ? ctx.sourceIp : '127.0.0.1';
    
    // Ensure sensitive headers/tokens are never logged in context
    const cleanMetadata: Record<string, unknown> = {};
    if (ctx.metadata) {
      for (const [key, value] of Object.entries(ctx.metadata)) {
        const lowerKey = key.toLowerCase();
        if (
          lowerKey.includes('authorization') ||
          lowerKey.includes('token') ||
          lowerKey.includes('password') ||
          lowerKey.includes('secret') ||
          lowerKey.includes('key') ||
          lowerKey.includes('credential')
        ) {
          cleanMetadata[key] = '[REDACTED]';
        } else {
          cleanMetadata[key] = value;
        }
      }
    }

    return {
      sourceIp,
      userAgent: ctx.userAgent ? ctx.userAgent.substring(0, 256) : undefined,
      userId: ctx.userId ? String(ctx.userId) : undefined,
      sessionId: ctx.sessionId ? String(ctx.sessionId) : undefined,
      tenantId: ctx.tenantId ? String(ctx.tenantId) : undefined,
      traceId: ctx.traceId || `w3c-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      endpoint: ctx.endpoint ? ctx.endpoint.substring(0, 256) : undefined,
      httpMethod: ctx.httpMethod ? ctx.httpMethod.toUpperCase() : undefined,
      requestRatePerMinute: typeof ctx.requestRatePerMinute === 'number' ? ctx.requestRatePerMinute : 0,
      priorViolationsCount: typeof ctx.priorViolationsCount === 'number' ? ctx.priorViolationsCount : 0,
      metadata: cleanMetadata,
    };
  }
}
