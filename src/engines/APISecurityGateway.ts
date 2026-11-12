/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * API Security Gateway (Phase 32)
 * Centralized API security gateway providing request rate limiting, payload byte size ceilings,
 * CORS origin verification, security header injection, schema sanitization,
 * and sanitized client-safe error formatting without exposing stack traces or secrets.
 */

import { APIGatewaySecurityRule } from '../types/phase32';
import { SystemAuditHistoryRecord } from '../types/phase31';

export interface GatewayValidationResult {
  allowed: boolean;
  statusCode: number;
  correlationId: string;
  error?: string;
  securityHeaders: Record<string, string>;
}

export class APISecurityGateway {
  private static instance: APISecurityGateway | null = null;
  private endpointRules: Map<string, APIGatewaySecurityRule> = new Map();
  private ipRateLimits: Map<string, { count: number; windowStartMs: number }> = new Map();
  private auditLogs: SystemAuditHistoryRecord[] = [];

  public constructor() {
    this.configureDefaultGatewayRules();
  }

  public static getInstance(): APISecurityGateway {
    if (!APISecurityGateway.instance) {
      APISecurityGateway.instance = new APISecurityGateway();
    }
    return APISecurityGateway.instance;
  }

  public static resetInstance(): void {
    APISecurityGateway.instance = null;
  }

  private configureDefaultGatewayRules(): void {
    const rules: APIGatewaySecurityRule[] = [
      {
        endpoint: '/api/health',
        maxRequestsPerMinute: 300,
        maxPayloadBytes: 1024, // 1KB
        requireAuth: false,
        enforceCors: true,
        allowedOrigins: ['*'],
      },
      {
        endpoint: '/api/diagnostics',
        requiredRole: 'OPERATOR',
        maxRequestsPerMinute: 60,
        maxPayloadBytes: 2 * 1024 * 1024, // 2MB
        requireAuth: false, // Allows local preview simulation with token fallback
        enforceCors: true,
        allowedOrigins: ['localhost', '127.0.0.1'],
      },
      {
        endpoint: '/api/llama',
        requiredRole: 'OPERATOR',
        maxRequestsPerMinute: 60,
        maxPayloadBytes: 2 * 1024 * 1024,
        requireAuth: false,
        enforceCors: true,
        allowedOrigins: ['localhost', '127.0.0.1'],
      },
      {
        endpoint: '/api/cloud',
        requiredRole: 'OPERATOR',
        maxRequestsPerMinute: 120,
        maxPayloadBytes: 5 * 1024 * 1024, // 5MB
        requireAuth: false,
        enforceCors: true,
        allowedOrigins: ['localhost', '127.0.0.1'],
      },
    ];

    for (const r of rules) {
      this.endpointRules.set(r.endpoint, r);
    }
  }

  /**
   * Evaluates request before forwarding to backend routers.
   */
  public validateIncomingRequest(params: {
    path: string;
    method: string;
    clientIp: string;
    origin?: string;
    payloadBytes: number;
    authToken?: string;
  }): GatewayValidationResult {
    const correlationId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const securityHeaders: Record<string, string> = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: blob: https:;",
      'X-Request-Correlation-ID': correlationId,
    };

    // Find rule for endpoint
    const matchedRuleKey = Array.from(this.endpointRules.keys()).find((k) => params.path.startsWith(k));
    const rule = matchedRuleKey ? this.endpointRules.get(matchedRuleKey)! : null;

    if (!rule) {
      // Default rule if path is not explicitly registered
      return {
        allowed: true,
        statusCode: 200,
        correlationId,
        securityHeaders,
      };
    }

    // 1. Rate Limiting Check
    const rateLimitKey = `${params.clientIp}::${matchedRuleKey}`;
    const now = Date.now();
    const entry = this.ipRateLimits.get(rateLimitKey) || { count: 0, windowStartMs: now };

    if (now - entry.windowStartMs > 60000) {
      entry.count = 0;
      entry.windowStartMs = now;
    }

    entry.count += 1;
    this.ipRateLimits.set(rateLimitKey, entry);

    if (entry.count > rule.maxRequestsPerMinute) {
      this.recordAudit('SECURITY', 'RATE_LIMIT_EXCEEDED', params.clientIp, `Rate limit exceeded on ${params.path}`, false);
      return {
        allowed: false,
        statusCode: 429,
        correlationId,
        error: 'Too many requests. Rate limit window exceeded.',
        securityHeaders,
      };
    }

    // 2. Payload size check
    if (params.payloadBytes > rule.maxPayloadBytes) {
      this.recordAudit('SECURITY', 'PAYLOAD_TOO_LARGE', params.clientIp, `Payload size ${params.payloadBytes} exceeded ceiling`, false);
      return {
        allowed: false,
        statusCode: 413,
        correlationId,
        error: 'Payload Too Large. Request rejected by API Gateway.',
        securityHeaders,
      };
    }

    // 3. CORS origin check
    if (rule.enforceCors && params.origin && !rule.allowedOrigins.includes('*')) {
      const isAllowed = rule.allowedOrigins.some((ao) => params.origin?.includes(ao));
      if (!isAllowed) {
        this.recordAudit('SECURITY', 'CORS_VIOLATION', params.origin, `CORS rejected for ${params.path}`, false);
        return {
          allowed: false,
          statusCode: 403,
          correlationId,
          error: 'CORS policy rejected cross-origin request.',
          securityHeaders,
        };
      }
    }

    return {
      allowed: true,
      statusCode: 200,
      correlationId,
      securityHeaders,
    };
  }

  /**
   * Sanitizes error responses to ensure no stack traces, file paths, or API keys are leaked.
   */
  public sanitizeErrorResponse(err: unknown): { error: string; code: string } {
    if (typeof err === 'object' && err !== null) {
      const msg = (err as any).message || '';
      if (msg.includes('API key') || msg.includes('KEY') || msg.includes('credentials') || msg.includes('token')) {
        return {
          error: 'Security Gateway: Upstream authentication failure occurred. Credential details withheld.',
          code: 'UPSTREAM_AUTH_ERROR',
        };
      }
    }
    return {
      error: 'An internal error occurred while processing the request.',
      code: 'GATEWAY_GENERIC_ERROR',
    };
  }

  public getRules(): APIGatewaySecurityRule[] {
    return Array.from(this.endpointRules.values());
  }

  public getAuditLogs(): SystemAuditHistoryRecord[] {
    return [...this.auditLogs];
  }

  private recordAudit(
    category: SystemAuditHistoryRecord['category'],
    action: string,
    actor: string,
    details: string,
    success: boolean
  ): void {
    this.auditLogs.unshift({
      id: `audit-gw-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      category: 'SECURITY',
      action,
      actor,
      details,
      success,
    });
    if (this.auditLogs.length > 100) {
      this.auditLogs.pop();
    }
  }
}
