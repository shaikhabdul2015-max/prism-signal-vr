/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Multi-Tenant Cloud Firestore Replication & Synchronization Types (Stage 3).
 * Defines tenant boundaries, RBAC roles, conflict resolution policies,
 * replication telemetry, and offline synchronization structures.
 */

export type TenantRole = 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'EDITOR' | 'VIEWER';

export type TenantStatus = 'ACTIVE' | 'SUSPENDED' | 'PROVISIONING' | 'ARCHIVED';

export interface TenantRecord {
  tenantId: string;
  name: string;
  slug: string;
  status: TenantStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  settings: {
    maxUsers: number;
    allowOfflineQueue: boolean;
    autoSyncIntervalMs: number;
    conflictPolicy: ConflictPolicy;
    dataRetentionDays: number;
  };
}

export interface TenantMembership {
  membershipId: string;
  tenantId: string;
  userId: string;
  role: TenantRole;
  joinedAt: string;
  status: 'ACTIVE' | 'INVITED' | 'REVOKED';
  assignedBy: string;
  lastActiveAt?: string;
}

export type ConflictPolicy =
  | 'LAST_WRITE_WINS'
  | 'HIGHER_VERSION_WINS'
  | 'SERVER_AUTHORITATIVE'
  | 'CLIENT_AUTHORITATIVE'
  | 'MANUAL_MERGE';

export interface SyncDocumentRecord<T = Record<string, unknown>> {
  docId: string;
  tenantId: string;
  collection: string;
  version: number;
  data: T;
  clientUpdatedAt: string;
  serverUpdatedAt?: string;
  checksum: string;
  isDeleted?: boolean;
  lastModifiedBy: string;
}

export interface ConflictRecord<T = Record<string, unknown>> {
  conflictId: string;
  tenantId: string;
  collection: string;
  docId: string;
  localVersion: number;
  remoteVersion: number;
  localData: T;
  remoteData: T;
  detectedAt: string;
  resolutionPolicy: ConflictPolicy;
  status: 'DETECTED' | 'AUTO_RESOLVED' | 'RESOLVED' | 'REJECTED';
  resolvedAt?: string;
  resolvedData?: T;
  resolutionNotes?: string;
  resolvedBy?: string;
}

export type ReplicationStatus =
  | 'IDLE'
  | 'SYNCING'
  | 'RECONNECTING'
  | 'DEGRADED'
  | 'OFFLINE'
  | 'ERROR';

export interface ReplicationTelemetry {
  status: ReplicationStatus;
  activeTenantId: string | null;
  pendingUploadCount: number;
  pendingDownloadCount: number;
  syncedDocumentsCount: number;
  conflictsCount: number;
  resolvedConflictsCount: number;
  lastSyncTimestamp: string | null;
  averageSyncLatencyMs: number;
  reconnectCount: number;
  isOnline: boolean;
  failedSyncRate: number;
  duplicateSuppressionCount: number;
}

export interface TenantPermissionSet {
  canReadData: boolean;
  canWriteData: boolean;
  canDeleteData: boolean;
  canManageUsers: boolean;
  canManageTenant: boolean;
  canResolveConflicts: boolean;
  canConfigureReplication: boolean;
}
