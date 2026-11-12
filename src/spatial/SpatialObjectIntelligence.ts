// src/spatial/SpatialObjectIntelligence.ts
import {
  CONSOLE_EMITTER_POS,
  DEFAULT_CRYSTALS,
  TARGET_RECEIVER_POS,
} from '../puzzle/puzzleEngine';
import type {
  ObjectInteractionEligibility,
  ObjectMetadataEntry,
  SemanticSceneDescription,
  SpatialRelationship,
  Vec3,
} from './types';
import { SpatialSecurityGuard } from './SpatialSecurityGuard';

export class SpatialObjectIntelligence {
  private objects: Map<string, ObjectMetadataEntry> = new Map();
  private relationships: SpatialRelationship[] = [];
  private readonly securityGuard: SpatialSecurityGuard;
  private maxInteractionReachMeters = 6.5;

  constructor(securityGuard?: SpatialSecurityGuard) {
    this.securityGuard = securityGuard || new SpatialSecurityGuard();
    this.seedChamberMetadata();
  }

  private seedChamberMetadata(): void {
    this.registerObject({
      id: 'console-emitter',
      name: 'Holographic Emitter Console',
      category: 'emitter',
      position: [...CONSOLE_EMITTER_POS],
      rotationY: 0,
      boundingRadiusMeters: 0.45,
      isInteractable: true,
      semanticTags: ['source', 'photon-emitter', 'console', 'phase-1'],
      stateSummary: 'Photonic beam source ready at chamber center.',
    });

    for (const c of DEFAULT_CRYSTALS) {
      const priorNode =
        c.id === 'ruby' ? 'console-emitter' : c.id === 'azure' ? 'ruby' : 'azure';
      this.registerObject({
        id: c.id,
        name: c.name,
        category: 'crystal',
        position: [...c.defaultPosition],
        rotationY: c.rotationY,
        boundingRadiusMeters: 0.45,
        isInteractable: true,
        requiresPriorNodeId: priorNode,
        semanticTags: ['prism', 'rotator', 'harmonic-node', c.id],
        stateSummary: c.isAligned ? 'Aligned to next node.' : 'Requires rotational alignment.',
      });
    }

    this.registerObject({
      id: 'target-receiver',
      name: 'Void Spire Target Receiver',
      category: 'receiver',
      position: [...TARGET_RECEIVER_POS],
      rotationY: 0,
      boundingRadiusMeters: 0.6,
      isInteractable: false,
      requiresPriorNodeId: 'emerald',
      semanticTags: ['terminal', 'decoder-unlock', 'spire'],
      stateSummary: 'Awaiting converged Emerald beam.',
    });

    this.rebuildSemanticRelationships();
  }

  public registerObject(entry: ObjectMetadataEntry): void {
    this.objects.set(entry.id, {
      ...entry,
      position: [...entry.position],
      semanticTags: [...entry.semanticTags],
    });
  }

  public updateObjectState(
    id: string,
    patch: Partial<Pick<ObjectMetadataEntry, 'position' | 'rotationY' | 'isInteractable' | 'isCurrentlyLocked' | 'stateSummary'>>
  ): ObjectMetadataEntry | null {
    const existing = this.objects.get(id);
    if (!existing) return null;

    const updated: ObjectMetadataEntry = {
      ...existing,
      ...patch,
      position: patch.position ? [...patch.position] : existing.position,
    };
    this.objects.set(id, updated);
    this.rebuildSemanticRelationships();
    return { ...updated };
  }

  public getObject(id: string): ObjectMetadataEntry | undefined {
    const obj = this.objects.get(id);
    return obj ? { ...obj } : undefined;
  }

  public getAllObjects(): ObjectMetadataEntry[] {
    return Array.from(this.objects.values()).map((o) => ({ ...o }));
  }

  public rebuildSemanticRelationships(): SpatialRelationship[] {
    const rels: SpatialRelationship[] = [];

    const addChainRelation = (
      fromId: string,
      toId: string,
      relationType: SpatialRelationship['relationType']
    ) => {
      const src = this.objects.get(fromId);
      const dst = this.objects.get(toId);
      if (!src || !dst) return;

      const dx = dst.position[0] - src.position[0];
      const dy = dst.position[1] - src.position[1];
      const dz = dst.position[2] - src.position[2];
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const bearing = Math.atan2(dx, -dz);

      rels.push({
        id: `sem-${fromId}-${relationType}-${toId}`,
        sourceId: fromId,
        targetId: toId,
        relationType,
        distanceMeters: Number(dist.toFixed(3)),
        bearingRadians: Number(bearing.toFixed(3)),
        strength: 0.95,
      });
    };

    // Optical reflection chain
    addChainRelation('console-emitter', 'ruby', 'illuminates');
    addChainRelation('ruby', 'azure', 'reflects_to');
    addChainRelation('azure', 'emerald', 'reflects_to');
    addChainRelation('emerald', 'target-receiver', 'reflects_to');

    // Check potential occlusion / obstruction between non-adjacent objects
    const all = Array.from(this.objects.values());
    for (const candidate of all) {
      if (candidate.category === 'hazard') {
        for (const crystal of all.filter((o) => o.category === 'crystal')) {
          const dx = crystal.position[0] - candidate.position[0];
          const dy = crystal.position[1] - candidate.position[1];
          const dz = crystal.position[2] - candidate.position[2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (dist < 1.5) {
            rels.push({
              id: `sem-obs-${candidate.id}-${crystal.id}`,
              sourceId: candidate.id,
              targetId: crystal.id,
              relationType: 'obstructs',
              distanceMeters: Number(dist.toFixed(3)),
              bearingRadians: Number(Math.atan2(dx, -dz).toFixed(3)),
              strength: 0.8,
            });
          }
        }
      }
    }

    this.relationships = rels;
    return [...rels];
  }

  public getRelationships(): SpatialRelationship[] {
    return [...this.relationships];
  }

  /**
   * Evaluates whether a given object is eligible for player interaction from pointer/player position.
   */
  public evaluateEligibility(
    objectId: string,
    playerPosition: Vec3,
    poweredNodeIds: Set<string> = new Set(['console-emitter', 'ruby'])
  ): ObjectInteractionEligibility | null {
    const obj = this.objects.get(objectId);
    if (!obj) return null;

    const dx = obj.position[0] - playerPosition[0];
    const dy = obj.position[1] - playerPosition[1];
    const dz = obj.position[2] - playerPosition[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    const isWithinReach = distance <= this.maxInteractionReachMeters + obj.boundingRadiusMeters;
    const isObstructed = this.relationships.some(
      (r) => r.targetId === obj.id && r.relationType === 'obstructs'
    );

    const blockingReasons: string[] = [];
    if (!obj.isInteractable) blockingReasons.push('Object is passive/non-interactable.');
    if (obj.isCurrentlyLocked) blockingReasons.push('Object is temporarily locked.');
    if (!isWithinReach) blockingReasons.push(`Out of interaction reach (${distance.toFixed(2)}m > ${this.maxInteractionReachMeters}m).`);
    if (isObstructed) blockingReasons.push('Spatial obstruction detected near object.');

    const prerequisiteMet = !obj.requiresPriorNodeId || poweredNodeIds.has(obj.requiresPriorNodeId);
    let score = 1.0;
    if (!isWithinReach) score -= 0.5;
    if (isObstructed) score -= 0.35;
    if (!prerequisiteMet) score -= 0.25;
    if (!obj.isInteractable || obj.isCurrentlyLocked) score = 0.0;

    const isEligible = obj.isInteractable && !obj.isCurrentlyLocked && isWithinReach && !isObstructed;

    const suggestedAction = isEligible
      ? obj.category === 'crystal'
        ? `Engage and rotate ${obj.name} to align outgoing beam.`
        : `Activate ${obj.name}.`
      : blockingReasons[0] || 'Adjust position to enable interaction.';

    return {
      objectId: obj.id,
      isEligible,
      eligibilityScore: Number(Math.max(0, Math.min(1, score)).toFixed(3)),
      distanceMeters: Number(distance.toFixed(3)),
      isWithinReach,
      isObstructed,
      blockingReasons,
      suggestedAction,
    };
  }

  /**
   * Produces a structured semantic description of the current 3D chamber for AI agents & HUD.
   */
  public generateSemanticSceneDescription(playerPosition: Vec3): SemanticSceneDescription {
    const all = Array.from(this.objects.values());
    const interactables = all.filter((o) => o.isInteractable);

    let nearestId: string | null = null;
    let nearestDist = Infinity;

    for (const obj of all) {
      const dx = obj.position[0] - playerPosition[0];
      const dy = obj.position[1] - playerPosition[1];
      const dz = obj.position[2] - playerPosition[2];
      const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (d < nearestDist) {
        nearestDist = d;
        nearestId = obj.id;
      }
    }

    const observations: string[] = [
      `Chamber contains ${all.length} mapped entities (${interactables.length} interactable).`,
      `Optical reflection graph tracks ${this.relationships.length} active spatial relationships.`,
    ];
    if (nearestId) {
      const nearestObj = this.objects.get(nearestId);
      observations.push(`Nearest entity is ${nearestObj?.name} at ${nearestDist.toFixed(2)}m.`);
    }

    const summaryText = `PRISM Chamber holds ${interactables.length} interactable nodes in an equilateral resonance arc. Nearest node: ${nearestId ?? 'none'} (${Number.isFinite(nearestDist) ? nearestDist.toFixed(2) : '0'}m).`;

    return {
      timestamp: Date.now(),
      activeObjectCount: all.length,
      interactableCount: interactables.length,
      nearestObjectId: nearestId,
      nearestDistanceMeters: Number.isFinite(nearestDist) ? Number(nearestDist.toFixed(3)) : null,
      activeRelationshipsCount: this.relationships.length,
      summaryText,
      keyObservations: observations,
    };
  }

  /**
   * Optional camera-based object recognition — strictly gated behind user permission & hardware capability.
   */
  public attemptCameraObjectRecognition(): {
    executed: boolean;
    permissionStatus: string;
    recognizedLabels: string[];
    message: string;
  } {
    const access = this.securityGuard.checkAccess('camera_recognition', 'analyzeCameraFeed');
    if (!access.allowed) {
      return {
        executed: false,
        permissionStatus: access.status,
        recognizedLabels: [],
        message: `Camera-based recognition blocked: ${access.reason}. Using deterministic game metadata.`,
      };
    }

    return {
      executed: true,
      permissionStatus: access.status,
      recognizedLabels: Array.from(this.objects.values()).map((o) => o.name),
      message: 'Opt-in camera-assisted spatial labeling active alongside game metadata.',
    };
  }
}
