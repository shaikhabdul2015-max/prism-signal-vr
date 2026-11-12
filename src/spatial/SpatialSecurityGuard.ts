// src/spatial/SpatialSecurityGuard.ts
import type {
  PermissionGrantStatus,
  SpatialPermissionRecord,
  SpatialPermissionScope,
  Vec3,
} from './types';

export interface SanitizedSpatialTelemetry {
  anonymousSessionId: string;
  relativeZone: 'center' | 'inner_ring' | 'outer_ring' | 'perimeter';
  quantizedDistanceMeters: number;
  activeNodeCount: number;
  timestampBucketMs: number;
  containsRawBiometrics: false;
  containsCameraFrames: false;
}

/**
 * Enforces fail-closed permission boundaries for physical room scanning,
 * camera-based object recognition, spatial anchors, and hand tracking,
 * while sanitizing spatial telemetry to preserve player privacy.
 */
export class SpatialSecurityGuard {
  private permissions: Map<SpatialPermissionScope, SpatialPermissionRecord> = new Map();
  private auditTrail: Array<{
    timestamp: number;
    scope: SpatialPermissionScope;
    action: string;
    allowed: boolean;
    reason: string;
  }> = [];

  constructor() {
    const now = Date.now();
    // Fail-closed defaults: never assume room scanning or camera access is granted
    this.permissions.set('camera_recognition', {
      scope: 'camera_recognition',
      status: 'denied',
      hardwareSupported: false,
      updatedAt: now,
      reason: 'Camera-based recognition disabled by default until explicit user consent and hardware validation.',
    });
    this.permissions.set('room_scanning', {
      scope: 'room_scanning',
      status: 'denied',
      hardwareSupported: false,
      updatedAt: now,
      reason: 'Physical room-mesh scanning disabled by default without compatible XR hardware and user permission.',
    });
    this.permissions.set('spatial_anchors', {
      scope: 'spatial_anchors',
      status: 'prompt',
      hardwareSupported: false,
      updatedAt: now,
      reason: 'Virtual spatial anchors permitted in memory; native XR anchors require hardware support and consent.',
    });
    this.permissions.set('hand_tracking', {
      scope: 'hand_tracking',
      status: 'prompt',
      hardwareSupported: false,
      updatedAt: now,
      reason: 'WebXR hand tracking requires active immersive session and user permission.',
    });
  }

  public setPermission(
    scope: SpatialPermissionScope,
    status: PermissionGrantStatus,
    hardwareSupported: boolean,
    reason?: string
  ): SpatialPermissionRecord {
    // Enforce strict hardware boundary: cannot grant hardware-dependent scan/camera if hardware is unsupported
    const effectiveStatus: PermissionGrantStatus =
      status === 'granted' && !hardwareSupported && (scope === 'camera_recognition' || scope === 'room_scanning')
        ? 'unavailable'
        : status;

    const record: SpatialPermissionRecord = {
      scope,
      status: effectiveStatus,
      hardwareSupported,
      updatedAt: Date.now(),
      reason:
        reason ||
        (effectiveStatus === 'granted'
          ? `Permission explicitly granted with hardware support.`
          : `Permission set to ${effectiveStatus} (hardwareSupported=${hardwareSupported}).`),
    };

    this.permissions.set(scope, record);
    this.recordAudit(scope, `SET_PERMISSION:${status}`, effectiveStatus === 'granted', record.reason);
    return { ...record };
  }

  public isAllowed(scope: SpatialPermissionScope): boolean {
    const rec = this.permissions.get(scope);
    if (!rec) return false;
    if (scope === 'camera_recognition' || scope === 'room_scanning') {
      return rec.status === 'granted' && rec.hardwareSupported;
    }
    return rec.status === 'granted';
  }

  public checkAccess(scope: SpatialPermissionScope, operationName: string): {
    allowed: boolean;
    status: PermissionGrantStatus;
    reason: string;
  } {
    const rec = this.permissions.get(scope);
    if (!rec) {
      this.recordAudit(scope, operationName, false, 'Unknown spatial permission scope');
      return { allowed: false, status: 'unavailable', reason: 'Unknown spatial permission scope' };
    }

    const allowed = this.isAllowed(scope);
    const reason = allowed
      ? `Access granted for ${operationName}`
      : `Access denied for ${operationName}: status=${rec.status}, hardwareSupported=${rec.hardwareSupported}`;

    this.recordAudit(scope, operationName, allowed, reason);
    return { allowed, status: rec.status, reason };
  }

  public getPermission(scope: SpatialPermissionScope): SpatialPermissionRecord | undefined {
    const rec = this.permissions.get(scope);
    return rec ? { ...rec } : undefined;
  }

  public getAllPermissions(): SpatialPermissionRecord[] {
    return Array.from(this.permissions.values()).map((r) => ({ ...r }));
  }

  /**
   * Privacy-preserving telemetry sanitization:
   * Quantizes coordinates into coarse radial zones and buckets timestamps
   * so raw high-precision biometric/movement fingerprints are never stored.
   */
  public sanitizeSpatialTelemetry(
    anonymousSessionId: string,
    headPosition: Vec3,
    activeNodeCount: number,
    timestamp = Date.now()
  ): SanitizedSpatialTelemetry {
    const radialDist = Math.sqrt(headPosition[0] * headPosition[0] + headPosition[2] * headPosition[2]);

    let relativeZone: SanitizedSpatialTelemetry['relativeZone'] = 'center';
    if (radialDist > 5.5) relativeZone = 'perimeter';
    else if (radialDist > 3.2) relativeZone = 'outer_ring';
    else if (radialDist > 1.2) relativeZone = 'inner_ring';

    // Quantize distance to 0.5m steps and timestamp to 5s buckets
    const quantizedDistanceMeters = Math.round(radialDist * 2) / 2;
    const timestampBucketMs = Math.floor(timestamp / 5000) * 5000;

    return {
      anonymousSessionId: anonymousSessionId.startsWith('anon-')
        ? anonymousSessionId
        : `anon-${anonymousSessionId.slice(0, 8)}`,
      relativeZone,
      quantizedDistanceMeters,
      activeNodeCount,
      timestampBucketMs,
      containsRawBiometrics: false,
      containsCameraFrames: false,
    };
  }

  public getAuditTrail() {
    return [...this.auditTrail];
  }

  private recordAudit(scope: SpatialPermissionScope, action: string, allowed: boolean, reason: string): void {
    this.auditTrail.push({
      timestamp: Date.now(),
      scope,
      action,
      allowed,
      reason,
    });
    if (this.auditTrail.length > 100) {
      this.auditTrail.shift();
    }
  }
}
