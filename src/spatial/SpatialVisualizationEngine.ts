// src/spatial/SpatialVisualizationEngine.ts
import type {
  PredictedInteraction,
  SpatialRelationship,
  SpatialVisualizationFrame,
  Vec3,
  WorldAwarenessSnapshot,
} from './types';
import { SpatialPerformanceOptimizer } from './SpatialPerformanceOptimizer';
import type { ObjectMetadataEntry } from './types';

export class SpatialVisualizationEngine {
  private readonly optimizer: SpatialPerformanceOptimizer;

  constructor(optimizer?: SpatialPerformanceOptimizer) {
    this.optimizer = optimizer || new SpatialPerformanceOptimizer();
  }

  /**
   * Computes a full visualization descriptor frame including guidance overlays,
   * 3D navigation indicators, predictive markers, relationship arcs, and adaptive HUD transform.
   * Uses pooled vectors and guarantees center-viewport non-occlusion.
   */
  public buildVisualizationFrame(params: {
    playerPosition: Vec3;
    playerForward: Vec3;
    objects: ObjectMetadataEntry[];
    relationships: SpatialRelationship[];
    predictions: PredictedInteraction[];
    awareness: WorldAwarenessSnapshot;
  }): SpatialVisualizationFrame {
    const now = Date.now();
    const objectMap = new Map(params.objects.map((o) => [o.id, o]));

    // 1. Guidance Overlays (boundary halos + crystal alignment rings)
    const guidanceOverlays: SpatialVisualizationFrame['guidanceOverlays'] = [];
    for (const obj of params.objects) {
      if (!obj.isInteractable) continue;
      guidanceOverlays.push({
        id: `overlay-${obj.id}`,
        targetObjectId: obj.id,
        position: [...obj.position],
        radiusMeters: obj.boundingRadiusMeters + 0.15,
        colorHex: obj.id === 'ruby' ? '#ef4444' : obj.id === 'azure' ? '#06b6d4' : obj.id === 'emerald' ? '#10b981' : '#38bdf8',
        opacity: 0.45,
        kind: obj.category === 'crystal' ? 'alignment_arc' : 'proximity_ring',
      });
    }

    if (params.awareness.activeSpatialEvents.some((e) => e.type === 'BOUNDARY_PROXIMITY')) {
      guidanceOverlays.push({
        id: 'overlay-chamber-boundary',
        targetObjectId: 'playerCameraRig',
        position: [0, 0.05, 0],
        radiusMeters: 7.5,
        colorHex: '#f59e0b',
        opacity: 0.7,
        kind: 'boundary_halo',
      });
    }

    // 2. 3D Navigation Indicators (using pooled vectors for normalized direction)
    const navigationIndicators: SpatialVisualizationFrame['navigationIndicators'] = [];
    const navTargetPos = params.awareness.navigationAnticipation.targetPosition;
    if (navTargetPos && params.awareness.navigationAnticipation.recommendedFocusTargetId) {
      const dirVec = this.optimizer.vectorPool.acquire();
      const dx = navTargetPos[0] - params.playerPosition[0];
      const dy = navTargetPos[1] - params.playerPosition[1];
      const dz = navTargetPos[2] - params.playerPosition[2];
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;

      dirVec[0] = Number((dx / len).toFixed(3));
      dirVec[1] = Number((dy / len).toFixed(3));
      dirVec[2] = Number((dz / len).toFixed(3));

      navigationIndicators.push({
        id: `nav-${params.awareness.navigationAnticipation.recommendedFocusTargetId}`,
        fromPosition: [...params.playerPosition],
        toPosition: [...navTargetPos],
        directionVec: [dirVec[0], dirVec[1], dirVec[2]],
        colorHex: '#38bdf8',
        pulseIntensity: 0.65,
      });

      this.optimizer.vectorPool.release(dirVec);
    }

    // 3. Predictive Interaction Markers (probabilistic highlights)
    const predictiveMarkers: SpatialVisualizationFrame['predictiveMarkers'] = [];
    for (const pred of params.predictions.slice(0, 2)) {
      const obj = objectMap.get(pred.objectId);
      if (!obj) continue;
      predictiveMarkers.push({
        objectId: pred.objectId,
        position: [...obj.position],
        probability: pred.probability,
        ringScale: Number((1.0 + pred.probability * 0.4).toFixed(2)),
        colorHex: '#a855f7',
      });
    }

    // 4. Spatial Relationship Visualization Arcs
    const relationshipArcs: SpatialVisualizationFrame['relationshipArcs'] = [];
    for (const rel of params.relationships) {
      const src = objectMap.get(rel.sourceId);
      const dst = objectMap.get(rel.targetId);
      if (!src || !dst) continue;

      const colorHex =
        rel.relationType === 'obstructs'
          ? '#ef4444'
          : rel.relationType === 'illuminates' || rel.relationType === 'reflects_to'
          ? '#38bdf8'
          : '#64748b';

      relationshipArcs.push({
        fromId: rel.sourceId,
        toId: rel.targetId,
        fromPos: [...src.position],
        toPos: [...dst.position],
        relationType: rel.relationType,
        colorHex,
        opacity: Number((rel.strength * 0.7).toFixed(2)),
      });
    }

    // 5. Adaptive HUD Positioning (always tucked below eye-line so center 3D viewport is 100% unobstructed)
    const fLen = Math.sqrt(
      params.playerForward[0] * params.playerForward[0] +
      params.playerForward[2] * params.playerForward[2]
    ) || 1.0;
    const fx = params.playerForward[0] / fLen;
    const fz = params.playerForward[2] / fLen;

    const hudDist = 1.85;
    const hudElevation = Math.max(0.55, params.playerPosition[1] - 0.55); // Lower ergonomic bottom dock arc

    return {
      timestamp: now,
      guidanceOverlays,
      navigationIndicators,
      predictiveMarkers,
      relationshipArcs,
      adaptiveHudTransform: {
        position: [
          Number((params.playerPosition[0] + fx * hudDist).toFixed(3)),
          Number(hudElevation.toFixed(3)),
          Number((params.playerPosition[2] + fz * hudDist).toFixed(3)),
        ],
        lookAtPlayer: true,
        distanceMeters: hudDist,
        elevationMeters: Number(hudElevation.toFixed(3)),
        occludesCenterViewport: false,
      },
    };
  }
}
