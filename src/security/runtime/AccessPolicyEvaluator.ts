/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Stage 5.3: Autonomous Threat Mitigation — Access Policy Evaluator
 * Server-side least-privilege RBAC and attribute-based access control (ABAC).
 */

export interface SecurityPrincipal {
  userId: string;
  roles: string[];
  permissions: string[];
  tenantId?: string;
  sessionId?: string;
  isServiceAccount?: boolean;
}

export class AccessPolicyEvaluator {
  private static readonly ROLE_PERMISSIONS: Record<string, string[]> = {
    ADMIN: ['*'],
    SECURITY_OPERATOR: [
      'security:view',
      'security:mitigate',
      'security:approve',
      'audit:view',
      'telemetry:view',
    ],
    KMS_ADMIN: [
      'kms:create',
      'kms:rotate',
      'kms:revoke',
      'kms:backup',
      'kms:restore',
      'kms:view',
    ],
    ENCRYPTION_SERVICE: ['kms:wrap', 'kms:encrypt'],
    DECRYPTION_SERVICE: ['kms:unwrap', 'kms:decrypt'],
    USER: ['state:read', 'state:write', 'session:self'],
    GUEST: ['telemetry:view'],
  };

  /**
   * Evaluates if the principal is authorized to perform the requested permission.
   */
  public static evaluateAccess(
    principal: SecurityPrincipal,
    requiredPermission: string,
    resourceTenantId?: string
  ): { granted: boolean; reason?: string } {
    if (!principal || !principal.roles || principal.roles.length === 0) {
      return { granted: false, reason: 'Unauthenticated or missing principal roles' };
    }

    // 1. Tenant boundary enforcement
    if (resourceTenantId && principal.tenantId && principal.tenantId !== resourceTenantId && !principal.roles.includes('ADMIN')) {
      return { granted: false, reason: 'Cross-tenant access violation' };
    }

    // 2. Direct permission check
    if (principal.permissions && principal.permissions.includes(requiredPermission)) {
      return { granted: true };
    }

    // 3. Role-based permission evaluation
    for (const role of principal.roles) {
      const perms = this.ROLE_PERMISSIONS[role] || [];
      if (perms.includes('*') || perms.includes(requiredPermission)) {
        return { granted: true };
      }
    }

    return {
      granted: false,
      reason: `Principal lacks required permission: "${requiredPermission}"`,
    };
  }
}
