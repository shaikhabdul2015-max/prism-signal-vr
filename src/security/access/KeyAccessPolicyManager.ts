/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Key Access Policy Manager (Stage 5.2)
 * Role-Based Access Control (RBAC) and least-privilege policy enforcement
 * for cryptographic key wrapping, unwrapping, rotation, and revocation.
 * 
 * Includes:
 * - Server-side authorization verification.
 * - Sensitive operation rate limiting.
 * - Suspicious key access anomaly detection.
 */

import { EnterpriseObservabilityManager } from '../../engines/EnterpriseObservabilityManager';
import { DistributedEventBus } from '../../engines/DistributedEventBus';

export type KMSRole =
  | 'KMS_ADMIN'
  | 'ENCRYPTION_SERVICE'
  | 'DECRYPTION_SERVICE'
  | 'AUDITOR'
  | 'UNAUTHORIZED_CALLER';

export type KeyOperation =
  | 'WRAP'
  | 'UNWRAP'
  | 'ROTATE'
  | 'REVOKE'
  | 'BACKUP'
  | 'RESTORE'
  | 'AUDIT';

export interface KeyAccessContext {
  actorId: string;
  role: KMSRole;
  keyId: string;
  operation: KeyOperation;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiresMFA?: boolean;
}

export class KeyAccessPolicyManager {
  private static instance: KeyAccessPolicyManager | null = null;
  private permissionsMatrix: Map<KMSRole, Set<KeyOperation>> = new Map();
  private rateLimits: Map<string, { count: number; windowStartMs: number }> = new Map();
  private maxOperationsPerMinute = 200;

  private constructor() {
    this.initializePermissions();
  }

  public static getInstance(): KeyAccessPolicyManager {
    if (!KeyAccessPolicyManager.instance) {
      KeyAccessPolicyManager.instance = new KeyAccessPolicyManager();
    }
    return KeyAccessPolicyManager.instance;
  }

  public static resetInstance(): void {
    KeyAccessPolicyManager.instance = null;
  }

  private initializePermissions(): void {
    this.permissionsMatrix.set(
      'KMS_ADMIN',
      new Set(['WRAP', 'UNWRAP', 'ROTATE', 'REVOKE', 'BACKUP', 'RESTORE', 'AUDIT'])
    );
    this.permissionsMatrix.set(
      'ENCRYPTION_SERVICE',
      new Set(['WRAP'])
    );
    this.permissionsMatrix.set(
      'DECRYPTION_SERVICE',
      new Set(['UNWRAP'])
    );
    this.permissionsMatrix.set(
      'AUDITOR',
      new Set(['AUDIT'])
    );
    this.permissionsMatrix.set(
      'UNAUTHORIZED_CALLER',
      new Set()
    );
  }

  /**
   * Verifies if the actor is authorized to perform the requested key operation.
   */
  public verifyAccess(ctx: KeyAccessContext): AccessCheckResult {
    const allowedOps = this.permissionsMatrix.get(ctx.role);

    // 1. Role permission validation
    if (!allowedOps || !allowedOps.has(ctx.operation)) {
      this.recordSuspiciousAccess(ctx, `Role "${ctx.role}" is not authorized to execute "${ctx.operation}" on key "${ctx.keyId}"`);
      return {
        allowed: false,
        reason: `Forbidden: Role "${ctx.role}" lacks "${ctx.operation}" privilege on KMS keys`,
      };
    }

    // 2. Sensitive operation rate limiting
    const rateLimitKey = `${ctx.actorId}:${ctx.operation}`;
    const now = Date.now();
    const entry = this.rateLimits.get(rateLimitKey) || { count: 0, windowStartMs: now };

    if (now - entry.windowStartMs > 60000) {
      entry.count = 0;
      entry.windowStartMs = now;
    }

    entry.count += 1;
    this.rateLimits.set(rateLimitKey, entry);

    if (entry.count > this.maxOperationsPerMinute) {
      this.recordSuspiciousAccess(ctx, `Rate limit exceeded: ${entry.count} requests in 60s for ${ctx.operation}`);
      return {
        allowed: false,
        reason: `Too Many Requests: KMS rate limit exceeded for operation "${ctx.operation}"`,
      };
    }

    return { allowed: true };
  }

  private recordSuspiciousAccess(ctx: KeyAccessContext, details: string): void {
    const obs = EnterpriseObservabilityManager.getInstance();
    obs.log({
      level: 'SECURITY',
      service: 'KeyAccessPolicyManager',
      message: `Suspicious KMS key access attempt intercepted: ${details}`,
      metadata: {
        actorId: ctx.actorId,
        role: ctx.role,
        keyId: ctx.keyId,
        operation: ctx.operation,
      },
    });

    try {
      const bus = DistributedEventBus.getInstance();
      bus.publish({
        eventType: 'KMS_UNAUTHORIZED_ACCESS_ATTEMPT',
        source: 'KeyAccessPolicyManager',
        priority: 'CRITICAL',
        payload: {
          actorId: ctx.actorId,
          role: ctx.role,
          keyId: ctx.keyId,
          operation: ctx.operation,
          details,
        },
        suppressionFingerprint: `kms-unauth-${ctx.actorId}-${ctx.operation}`,
      });
    } catch {
      // Safe ignore
    }
  }
}

export const keyAccessPolicyManager = KeyAccessPolicyManager.getInstance();
