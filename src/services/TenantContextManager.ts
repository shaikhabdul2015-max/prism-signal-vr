/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Tenant Context Manager (Stage 3).
 * Manages active tenant selection, user-to-tenant memberships,
 * role-based access control (RBAC), and tenant boundary validation.
 * Invariant: Never trusts client-supplied tenantId without validation.
 */

import {
  TenantRecord,
  TenantMembership,
  TenantRole,
  TenantPermissionSet,
} from '../types/multiTenantSync';
import { DistributedEventBus } from '../engines/DistributedEventBus';

export class TenantContextManager {
  private static instance: TenantContextManager | null = null;
  private tenants: Map<string, TenantRecord> = new Map();
  private memberships: Map<string, TenantMembership[]> = new Map(); // userId -> memberships
  private activeTenantId: string | null = null;
  private currentUserId: string = 'usr-simulated-admin-01';
  private listeners: Set<(activeTenant: TenantRecord | null) => void> = new Set();

  private constructor() {
    this.seedDefaultTenants();
  }

  public static getInstance(): TenantContextManager {
    if (!TenantContextManager.instance) {
      TenantContextManager.instance = new TenantContextManager();
    }
    return TenantContextManager.instance;
  }

  public static resetInstance(): void {
    TenantContextManager.instance = null;
  }

  private seedDefaultTenants(): void {
    const now = new Date().toISOString();

    const alphaTenant: TenantRecord = {
      tenantId: 'tenant-alpha-001',
      name: 'Alpha Systems Engineering',
      slug: 'alpha-systems',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'usr-simulated-admin-01',
      settings: {
        maxUsers: 50,
        allowOfflineQueue: true,
        autoSyncIntervalMs: 5000,
        conflictPolicy: 'HIGHER_VERSION_WINS',
        dataRetentionDays: 90,
      },
    };

    const betaTenant: TenantRecord = {
      tenantId: 'tenant-beta-002',
      name: 'Beta Aerospace Research',
      slug: 'beta-aerospace',
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: 'usr-simulated-admin-01',
      settings: {
        maxUsers: 25,
        allowOfflineQueue: true,
        autoSyncIntervalMs: 10000,
        conflictPolicy: 'SERVER_AUTHORITATIVE',
        dataRetentionDays: 180,
      },
    };

    this.tenants.set(alphaTenant.tenantId, alphaTenant);
    this.tenants.set(betaTenant.tenantId, betaTenant);

    // Initial admin memberships
    this.memberships.set('usr-simulated-admin-01', [
      {
        membershipId: 'mem-admin-alpha',
        tenantId: 'tenant-alpha-001',
        userId: 'usr-simulated-admin-01',
        role: 'SUPER_ADMIN',
        joinedAt: now,
        status: 'ACTIVE',
        assignedBy: 'system',
      },
      {
        membershipId: 'mem-admin-beta',
        tenantId: 'tenant-beta-002',
        userId: 'usr-simulated-admin-01',
        role: 'TENANT_ADMIN',
        joinedAt: now,
        status: 'ACTIVE',
        assignedBy: 'system',
      },
    ]);

    this.activeTenantId = alphaTenant.tenantId;
  }

  /**
   * Validates tenant identifier format.
   * Format: 3 to 64 alphanumeric characters, hyphens, or underscores.
   */
  public isValidTenantId(tenantId: string): boolean {
    if (!tenantId || typeof tenantId !== 'string') return false;
    if (tenantId.length < 3 || tenantId.length > 64) return false;
    return /^[a-zA-Z0-9_\-]+$/.test(tenantId);
  }

  public getActiveTenant(): TenantRecord | null {
    if (!this.activeTenantId) return null;
    return this.tenants.get(this.activeTenantId) || null;
  }

  public getActiveTenantId(): string | null {
    return this.activeTenantId;
  }

  public setCurrentUserId(userId: string): void {
    this.currentUserId = userId;
  }

  public getCurrentUserId(): string {
    return this.currentUserId;
  }

  /**
   * Switches the active tenant if the current user has verified membership.
   */
  public switchActiveTenant(tenantId: string): { success: boolean; error?: string } {
    if (!this.isValidTenantId(tenantId)) {
      return { success: false, error: `Invalid tenant ID format: "${tenantId}"` };
    }

    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return { success: false, error: `Tenant "${tenantId}" not found.` };
    }

    if (tenant.status !== 'ACTIVE') {
      return { success: false, error: `Tenant "${tenantId}" is currently ${tenant.status}. Access denied.` };
    }

    const userMemberships = this.memberships.get(this.currentUserId) || [];
    const membership = userMemberships.find((m) => m.tenantId === tenantId && m.status === 'ACTIVE');

    if (!membership) {
      return {
        success: false,
        error: `User "${this.currentUserId}" does not have active membership in tenant "${tenantId}". Cross-tenant access blocked.`,
      };
    }

    const previousTenantId = this.activeTenantId;
    this.activeTenantId = tenantId;

    try {
      DistributedEventBus.getInstance().publish({
        eventType: 'TENANT_SWITCHED',
        source: 'TenantContextManager',
        priority: 'MEDIUM',
        payload: {
          previousTenantId,
          newTenantId: tenantId,
          userId: this.currentUserId,
          role: membership.role,
        },
        suppressionFingerprint: `tenant-switch-${Date.now()}`,
      });
    } catch {
      // Event bus fallback
    }

    this.notifyListeners();
    return { success: true };
  }

  /**
   * Retrieves permissions for the current user within a specific or active tenant.
   */
  public getPermissions(tenantId?: string): TenantPermissionSet {
    const targetTenantId = tenantId || this.activeTenantId;
    if (!targetTenantId) {
      return this.getZeroPermissions();
    }

    const userMemberships = this.memberships.get(this.currentUserId) || [];
    const membership = userMemberships.find((m) => m.tenantId === targetTenantId && m.status === 'ACTIVE');

    if (!membership) {
      return this.getZeroPermissions();
    }

    return this.resolveRolePermissions(membership.role);
  }

  public resolveRolePermissions(role: TenantRole): TenantPermissionSet {
    switch (role) {
      case 'SUPER_ADMIN':
        return {
          canReadData: true,
          canWriteData: true,
          canDeleteData: true,
          canManageUsers: true,
          canManageTenant: true,
          canResolveConflicts: true,
          canConfigureReplication: true,
        };
      case 'TENANT_ADMIN':
        return {
          canReadData: true,
          canWriteData: true,
          canDeleteData: true,
          canManageUsers: true,
          canManageTenant: false,
          canResolveConflicts: true,
          canConfigureReplication: true,
        };
      case 'EDITOR':
        return {
          canReadData: true,
          canWriteData: true,
          canDeleteData: false,
          canManageUsers: false,
          canManageTenant: false,
          canResolveConflicts: true,
          canConfigureReplication: false,
        };
      case 'VIEWER':
      default:
        return {
          canReadData: true,
          canWriteData: false,
          canDeleteData: false,
          canManageUsers: false,
          canManageTenant: false,
          canResolveConflicts: false,
          canConfigureReplication: false,
        };
    }
  }

  private getZeroPermissions(): TenantPermissionSet {
    return {
      canReadData: false,
      canWriteData: false,
      canDeleteData: false,
      canManageUsers: false,
      canManageTenant: false,
      canResolveConflicts: false,
      canConfigureReplication: false,
    };
  }

  /**
   * Registers a new tenant and assigns creator as SUPER_ADMIN.
   */
  public registerTenant(
    params: Omit<TenantRecord, 'createdAt' | 'updatedAt' | 'createdBy' | 'status'>
  ): { success: boolean; tenant?: TenantRecord; error?: string } {
    if (!this.isValidTenantId(params.tenantId)) {
      return { success: false, error: `Invalid tenantId: "${params.tenantId}"` };
    }

    if (this.tenants.has(params.tenantId)) {
      return { success: false, error: `Tenant "${params.tenantId}" already exists.` };
    }

    const now = new Date().toISOString();
    const newTenant: TenantRecord = {
      ...params,
      status: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
      createdBy: this.currentUserId,
    };

    this.tenants.set(newTenant.tenantId, newTenant);

    // Add membership for creator
    const creatorMemberships = this.memberships.get(this.currentUserId) || [];
    creatorMemberships.push({
      membershipId: `mem-${this.currentUserId}-${newTenant.tenantId}`,
      tenantId: newTenant.tenantId,
      userId: this.currentUserId,
      role: 'SUPER_ADMIN',
      joinedAt: now,
      status: 'ACTIVE',
      assignedBy: 'system',
    });
    this.memberships.set(this.currentUserId, creatorMemberships);

    return { success: true, tenant: newTenant };
  }

  /**
   * Adds or updates user membership in a tenant.
   */
  public assignMembership(
    tenantId: string,
    userId: string,
    role: TenantRole
  ): { success: boolean; error?: string } {
    const callerPerms = this.getPermissions(tenantId);
    if (!callerPerms.canManageUsers) {
      return {
        success: false,
        error: 'Forbidden: Insufficient permissions to assign tenant membership.',
      };
    }

    const tenant = this.tenants.get(tenantId);
    if (!tenant) {
      return { success: false, error: `Tenant "${tenantId}" not found.` };
    }

    const userList = this.memberships.get(userId) || [];
    const existingIndex = userList.findIndex((m) => m.tenantId === tenantId);

    const now = new Date().toISOString();
    if (existingIndex >= 0) {
      userList[existingIndex].role = role;
      userList[existingIndex].status = 'ACTIVE';
      userList[existingIndex].lastActiveAt = now;
    } else {
      userList.push({
        membershipId: `mem-${userId}-${tenantId}`,
        tenantId,
        userId,
        role,
        joinedAt: now,
        status: 'ACTIVE',
        assignedBy: this.currentUserId,
        lastActiveAt: now,
      });
    }

    this.memberships.set(userId, userList);
    return { success: true };
  }

  public getUserTenants(userId?: string): TenantRecord[] {
    const targetUserId = userId || this.currentUserId;
    const userMemberships = this.memberships.get(targetUserId) || [];
    const activeTenantIds = userMemberships
      .filter((m) => m.status === 'ACTIVE')
      .map((m) => m.tenantId);

    return Array.from(this.tenants.values()).filter((t) => activeTenantIds.includes(t.tenantId));
  }

  public subscribe(listener: (activeTenant: TenantRecord | null) => void): () => void {
    this.listeners.add(listener);
    listener(this.getActiveTenant());
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    const active = this.getActiveTenant();
    this.listeners.forEach((l) => {
      try {
        l(active);
      } catch {
        // Safe listener notification
      }
    });
  }
}

export const tenantContextManager = TenantContextManager.getInstance();
