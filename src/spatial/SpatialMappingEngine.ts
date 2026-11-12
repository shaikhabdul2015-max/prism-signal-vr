// src/spatial/SpatialMappingEngine.ts
import * as THREE from 'three';
import {
  AdvancedSpatialIntelligenceEngine,
} from '../engines/AdvancedSpatialIntelligenceEngine';
import type { SpatialObjectNode, SpatialTransform } from '../types/phase29';
import type {
  SceneGraphConsistencyReport,
  SpatialAnchorDescriptor,
  SpatialCoordinateSpace,
  SpatialRelationship,
  Vec3,
} from './types';
import { SpatialSecurityGuard } from './SpatialSecurityGuard';
import { SpatialPerformanceOptimizer } from './SpatialPerformanceOptimizer';

// Pre-allocated math helpers to minimize GC pressure
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _matWorld = new THREE.Matrix4();
const _matInv = new THREE.Matrix4();

export class SpatialMappingEngine {
  private readonly baseSpatialEngine: AdvancedSpatialIntelligenceEngine;
  private readonly securityGuard: SpatialSecurityGuard;
  private readonly optimizer: SpatialPerformanceOptimizer;
  private anchors: Map<string, SpatialAnchorDescriptor> = new Map();
  private floorOriginOffset: Vec3 = [0, 0, 0];
  private seatedEyeHeightMeters = 1.25;

  constructor(
    baseSpatialEngine?: AdvancedSpatialIntelligenceEngine,
    securityGuard?: SpatialSecurityGuard,
    optimizer?: SpatialPerformanceOptimizer
  ) {
    // Isolate per instance if injected, or create fresh engine reusing baseline chamber layout
    this.baseSpatialEngine = baseSpatialEngine || new AdvancedSpatialIntelligenceEngine();
    this.securityGuard = securityGuard || new SpatialSecurityGuard();
    this.optimizer = optimizer || new SpatialPerformanceOptimizer();
    this.optimizer.setActiveTrackedNodes(this.baseSpatialEngine.getAllObjects().length);
  }

  public registerSpatialNode(node: SpatialObjectNode): void {
    this.baseSpatialEngine.registerObject(node);
    this.optimizer.setActiveTrackedNodes(this.baseSpatialEngine.getAllObjects().length);
    this.optimizer.markDirty();
  }

  public updateNodeTransform(objectId: string, update: Partial<SpatialTransform>): SpatialObjectNode | null {
    const res = this.baseSpatialEngine.updateLocalTransform(objectId, update);
    this.optimizer.markDirty();
    return res;
  }

  public getAllNodes(): SpatialObjectNode[] {
    return this.baseSpatialEngine.getAllObjects();
  }

  public getNode(id: string): SpatialObjectNode | undefined {
    return this.baseSpatialEngine.getObject(id);
  }

  /**
   * Transforms a 3D point between supported spatial coordinate spaces
   * ('world', 'local-floor', 'viewer', 'local').
   */
  public transformCoordinates(
    point: Vec3,
    fromSpace: SpatialCoordinateSpace,
    toSpace: SpatialCoordinateSpace,
    viewerOrigin: Vec3 = [0, this.seatedEyeHeightMeters, 0]
  ): Vec3 {
    if (fromSpace === toSpace) {
      return [point[0], point[1], point[2]];
    }

    // Step 1: Convert fromSpace -> world
    _vecA.set(point[0], point[1], point[2]);
    if (fromSpace === 'local-floor' || fromSpace === 'bounded-floor') {
      _vecA.x += this.floorOriginOffset[0];
      _vecA.y += this.floorOriginOffset[1];
      _vecA.z += this.floorOriginOffset[2];
    } else if (fromSpace === 'viewer') {
      _vecA.x += viewerOrigin[0];
      _vecA.y += viewerOrigin[1];
      _vecA.z += viewerOrigin[2];
    }

    // Step 2: Convert world -> toSpace
    if (toSpace === 'local-floor' || toSpace === 'bounded-floor') {
      _vecA.x -= this.floorOriginOffset[0];
      _vecA.y -= this.floorOriginOffset[1];
      _vecA.z -= this.floorOriginOffset[2];
    } else if (toSpace === 'viewer') {
      _vecA.x -= viewerOrigin[0];
      _vecA.y -= viewerOrigin[1];
      _vecA.z -= viewerOrigin[2];
    }

    return [
      Number(_vecA.x.toFixed(4)),
      Number(_vecA.y.toFixed(4)),
      Number(_vecA.z.toFixed(4)),
    ];
  }

  /**
   * Transforms a world-space point into a node's local coordinate space.
   */
  public worldToNodeLocal(worldPoint: Vec3, targetNodeId: string): Vec3 | null {
    const node = this.baseSpatialEngine.getObject(targetNodeId);
    if (!node) return null;

    _matWorld.copy(this.baseSpatialEngine.transformToMatrix4(node.worldTransform));
    _matInv.copy(_matWorld).invert();
    _vecB.set(worldPoint[0], worldPoint[1], worldPoint[2]).applyMatrix4(_matInv);

    return [
      Number(_vecB.x.toFixed(4)),
      Number(_vecB.y.toFixed(4)),
      Number(_vecB.z.toFixed(4)),
    ];
  }

  /**
   * Computes Euclidean distance and horizontal XZ bearing angle in radians.
   */
  public computeDistanceAndBearing(fromPoint: Vec3, toPoint: Vec3): {
    distanceMeters: number;
    bearingRadians: number;
    elevationDeltaMeters: number;
  } {
    const dx = toPoint[0] - fromPoint[0];
    const dy = toPoint[1] - fromPoint[1];
    const dz = toPoint[2] - fromPoint[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    const bearing = Math.atan2(dx, -dz); // 0 rad = looking down -Z axis

    return {
      distanceMeters: Number(distance.toFixed(4)),
      bearingRadians: Number(bearing.toFixed(4)),
      elevationDeltaMeters: Number(dy.toFixed(4)),
    };
  }

  /**
   * Detects proximity to the PRISM chamber perimeter boundaries.
   */
  public checkBoundaryProximity(point: Vec3): {
    isWithinBounds: boolean;
    nearestWallDistanceMeters: number;
    approachingBoundary: boolean;
  } {
    const bounds = this.baseSpatialEngine.getChamberBoundary();
    const isWithin = bounds.isWithinBounds(point);

    const distX = Math.min(Math.abs(point[0] - bounds.min[0]), Math.abs(bounds.max[0] - point[0]));
    const distY = Math.min(Math.abs(point[1] - bounds.min[1]), Math.abs(bounds.max[1] - point[1]));
    const distZ = Math.min(Math.abs(point[2] - bounds.min[2]), Math.abs(bounds.max[2] - point[2]));
    const nearest = isWithin ? Math.min(distX, distY, distZ) : 0;

    return {
      isWithinBounds: isWithin,
      nearestWallDistanceMeters: Number(nearest.toFixed(3)),
      approachingBoundary: !isWithin || nearest < 1.0,
    };
  }

  /**
   * Validates scene graph integrity: orphan parents, cycles, invalid floats (NaN/Inf),
   * and chamber boundary violations.
   */
  public validateSceneGraphConsistency(): SceneGraphConsistencyReport {
    const nodes = this.baseSpatialEngine.getAllObjects();
    const nodeMap = new Map(nodes.map((n) => [n.id, n]));

    const orphanNodeIds: string[] = [];
    const cyclicNodeIds: string[] = [];
    const invalidTransformNodeIds: string[] = [];
    const outOfBoundsNodeIds: string[] = [];

    for (const node of nodes) {
      // Check finite coordinates
      const coords = [
        ...node.worldTransform.position,
        ...node.worldTransform.rotation,
        ...node.worldTransform.scale,
      ];
      if (!coords.every((c) => Number.isFinite(c))) {
        invalidTransformNodeIds.push(node.id);
      }

      // Check bounds
      if (!this.baseSpatialEngine.isWithinChamberBounds(node.worldTransform.position)) {
        outOfBoundsNodeIds.push(node.id);
      }

      // Check orphan parentId
      if (node.parentId && !nodeMap.has(node.parentId)) {
        orphanNodeIds.push(node.id);
      }

      // Check cycle in parent chain
      const visited = new Set<string>([node.id]);
      let currParent = node.parentId;
      while (currParent) {
        if (visited.has(currParent)) {
          cyclicNodeIds.push(node.id);
          break;
        }
        visited.add(currParent);
        currParent = nodeMap.get(currParent)?.parentId;
      }
    }

    const isConsistent =
      orphanNodeIds.length === 0 &&
      cyclicNodeIds.length === 0 &&
      invalidTransformNodeIds.length === 0 &&
      outOfBoundsNodeIds.length === 0;

    return {
      isConsistent,
      nodeCount: nodes.length,
      orphanNodeIds,
      cyclicNodeIds,
      invalidTransformNodeIds,
      outOfBoundsNodeIds,
      checkedAt: Date.now(),
    };
  }

  /**
   * Analyzes spatial adjacency relationships across mapped chamber objects.
   */
  public analyzeSpatialRelationships(maxAdjacencyRadius = 6.5): SpatialRelationship[] {
    const nodes = this.baseSpatialEngine.getAllObjects();
    const relationships: SpatialRelationship[] = [];

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const metrics = this.computeDistanceAndBearing(
          a.worldTransform.position,
          b.worldTransform.position
        );

        if (metrics.distanceMeters <= maxAdjacencyRadius) {
          relationships.push({
            id: `rel-adj-${a.id}-${b.id}`,
            sourceId: a.id,
            targetId: b.id,
            relationType: 'adjacent_to',
            distanceMeters: metrics.distanceMeters,
            bearingRadians: metrics.bearingRadians,
            strength: Number(Math.max(0.1, 1 - metrics.distanceMeters / maxAdjacencyRadius).toFixed(3)),
          });
        }
      }
    }

    return relationships;
  }

  /**
   * Creates a spatial anchor (virtual memory anchor always supported; native XR anchor strictly permission-checked).
   */
  public createSpatialAnchor(
    label: string,
    position: Vec3,
    space: SpatialCoordinateSpace = 'local-floor',
    requestNativeXR = false
  ): { anchor: SpatialAnchorDescriptor; nativeGranted: boolean; note: string } {
    let nativeGranted = false;
    let note = 'Virtual session-local anchor registered.';

    if (requestNativeXR) {
      const check = this.securityGuard.checkAccess('spatial_anchors', 'createNativeXRAnchor');
      nativeGranted = check.allowed;
      note = check.allowed
        ? 'Native WebXR persistent spatial anchor permitted.'
        : `Native WebXR anchor denied (${check.reason}); created virtual memory anchor fallback.`;
    }

    const anchor: SpatialAnchorDescriptor = {
      id: `anchor-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label,
      position: [...position],
      orientation: [0, 0, 0, 1],
      space,
      isNativeXRAnchor: nativeGranted,
      createdAt: Date.now(),
    };

    this.anchors.set(anchor.id, anchor);
    return { anchor, nativeGranted, note };
  }

  /**
   * Attempts physical room-mesh scanning ONLY when WebXR hardware and user permission exist.
   */
  public requestRoomScanStatus(): {
    available: boolean;
    permitted: boolean;
    reason: string;
  } {
    const check = this.securityGuard.checkAccess('room_scanning', 'requestRoomMeshScan');
    return {
      available: check.status !== 'unavailable',
      permitted: check.allowed,
      reason: check.reason,
    };
  }

  public getAnchors(): SpatialAnchorDescriptor[] {
    return Array.from(this.anchors.values());
  }

  public getSecurityGuard(): SpatialSecurityGuard {
    return this.securityGuard;
  }

  public getOptimizer(): SpatialPerformanceOptimizer {
    return this.optimizer;
  }
}
