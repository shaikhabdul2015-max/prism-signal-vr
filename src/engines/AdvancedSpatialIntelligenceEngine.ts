/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Advanced Spatial Intelligence Engine (Phase 29)
 * Manages spatial coordinates, hierarchical coordinate transformations (local to world),
 * object proximity metrics, spatial boundaries, and spatial events.
 * Integrates with Three.js matrix hierarchies and PRISM chamber objects (Ruby, Azure, Emerald).
 */

import * as THREE from 'three';
import {
  SpatialObjectNode,
  SpatialTransform,
  SpatialBoundary,
  Vector3Tuple,
} from '../types/phase29';

export class AdvancedSpatialIntelligenceEngine {
  private static instance: AdvancedSpatialIntelligenceEngine | null = null;
  private objects: Map<string, SpatialObjectNode> = new Map();
  private boundary: SpatialBoundary;

  public constructor() {
    // PRISM chamber operational boundary (meters)
    this.boundary = {
      min: [-8.0, 0.0, -8.0],
      max: [8.0, 5.0, 8.0],
      isWithinBounds: (point: Vector3Tuple) => {
        return (
          point[0] >= -8.0 &&
          point[0] <= 8.0 &&
          point[1] >= 0.0 &&
          point[1] <= 5.0 &&
          point[2] >= -8.0 &&
          point[2] <= 8.0
        );
      },
    };

    this.registerChamberBaselineObjects();
  }

  public static getInstance(): AdvancedSpatialIntelligenceEngine {
    if (!AdvancedSpatialIntelligenceEngine.instance) {
      AdvancedSpatialIntelligenceEngine.instance = new AdvancedSpatialIntelligenceEngine();
    }
    return AdvancedSpatialIntelligenceEngine.instance;
  }

  public static resetInstance(): void {
    AdvancedSpatialIntelligenceEngine.instance = null;
  }

  /**
   * Registers baseline PRISM chamber entities: Ruby Core, Azure Array, Emerald Core
   */
  private registerChamberBaselineObjects(): void {
    const baselineObjects: Array<{
      id: string;
      name: string;
      type: SpatialObjectNode['type'];
      position: Vector3Tuple;
      rotation: Vector3Tuple;
      scale: Vector3Tuple;
      radius: number;
    }> = [
      {
        id: 'ruby-core',
        name: 'Ruby Harmonic Core',
        type: 'CRYSTAL_CORE',
        position: [3.64, 1.25, -2.1],
        rotation: [0, 0.85, 0],
        scale: [1, 1, 1],
        radius: 0.45,
      },
      {
        id: 'azure-array',
        name: 'Azure Resonance Array',
        type: 'REFLECTOR_ARRAY',
        position: [0, 1.25, 4.2],
        rotation: [0, 1.15, 0],
        scale: [1, 1, 1],
        radius: 0.55,
      },
      {
        id: 'emerald-core',
        name: 'Emerald Core Station',
        type: 'CRYSTAL_CORE',
        position: [-3.64, 1.25, -2.1],
        rotation: [0, -0.85, 0],
        scale: [1, 1, 1],
        radius: 0.45,
      },
      {
        id: 'central-interaction-rig',
        name: 'Primary Operator HMD Sensor Rig',
        type: 'SENSOR_RIG',
        position: [0, 1.65, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
        radius: 0.35,
      },
    ];

    baselineObjects.forEach((obj) => {
      const transform: SpatialTransform = {
        position: obj.position,
        rotation: obj.rotation,
        scale: obj.scale,
      };

      this.objects.set(obj.id, {
        id: obj.id,
        name: obj.name,
        type: obj.type,
        localTransform: { ...transform },
        worldTransform: { ...transform },
        childrenIds: [],
        boundingRadius: obj.radius,
        isInteractable: true,
      });
    });
  }

  /**
   * Adds or updates a spatial node
   */
  public registerObject(node: SpatialObjectNode): void {
    this.objects.set(node.id, node);
    this.recomputeWorldTransforms();
  }

  /**
   * Updates an object's local transformation and propagates to world hierarchy
   */
  public updateLocalTransform(
    objectId: string,
    transformUpdate: Partial<SpatialTransform>
  ): SpatialObjectNode | null {
    const node = this.objects.get(objectId);
    if (!node) return null;

    node.localTransform = {
      ...node.localTransform,
      ...transformUpdate,
    };

    this.recomputeWorldTransforms();
    return this.objects.get(objectId) || null;
  }

  /**
   * Computes hierarchical world-space transformations using Three.js Matrix4
   */
  public recomputeWorldTransforms(): void {
    for (const node of this.objects.values()) {
      if (!node.parentId) {
        // Root node: worldTransform is localTransform
        node.worldTransform = { ...node.localTransform };
      } else {
        const parent = this.objects.get(node.parentId);
        if (parent) {
          const parentMatrix = this.transformToMatrix4(parent.worldTransform);
          const localMatrix = this.transformToMatrix4(node.localTransform);
          const worldMatrix = new THREE.Matrix4().multiplyMatrices(parentMatrix, localMatrix);

          node.worldTransform = this.matrix4ToTransform(worldMatrix);
        } else {
          node.worldTransform = { ...node.localTransform };
        }
      }
    }
  }

  /**
   * Converts SpatialTransform to THREE.Matrix4
   */
  public transformToMatrix4(transform: SpatialTransform): THREE.Matrix4 {
    const position = new THREE.Vector3(...transform.position);
    const euler = new THREE.Euler(...transform.rotation);
    const scale = new THREE.Vector3(...transform.scale);

    const matrix = new THREE.Matrix4();
    matrix.compose(position, new THREE.Quaternion().setFromEuler(euler), scale);
    return matrix;
  }

  /**
   * Decomposes THREE.Matrix4 into SpatialTransform
   */
  public matrix4ToTransform(matrix: THREE.Matrix4): SpatialTransform {
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();

    matrix.decompose(position, quaternion, scale);
    const euler = new THREE.Euler().setFromQuaternion(quaternion);

    return {
      position: [position.x, position.y, position.z],
      rotation: [euler.x, euler.y, euler.z],
      quaternion: [quaternion.x, quaternion.y, quaternion.z, quaternion.w],
      scale: [scale.x, scale.y, scale.z],
    };
  }

  /**
   * Calculates euclidean distance between two spatial objects in world-space
   */
  public calculateDistance(objectIdA: string, objectIdB: string): number | null {
    const a = this.objects.get(objectIdA);
    const b = this.objects.get(objectIdB);
    if (!a || !b) return null;

    const posA = new THREE.Vector3(...a.worldTransform.position);
    const posB = new THREE.Vector3(...b.worldTransform.position);
    return posA.distanceTo(posB);
  }

  /**
   * Finds all objects within a given radius of a point
   */
  public findObjectsNearPoint(point: Vector3Tuple, radius: number): SpatialObjectNode[] {
    const queryPoint = new THREE.Vector3(...point);
    const results: SpatialObjectNode[] = [];

    for (const node of this.objects.values()) {
      const objPos = new THREE.Vector3(...node.worldTransform.position);
      if (queryPoint.distanceTo(objPos) <= radius + node.boundingRadius) {
        results.push({ ...node });
      }
    }

    return results;
  }

  /**
   * Validates if a coordinate is within active operational chamber bounds
   */
  public isWithinChamberBounds(point: Vector3Tuple): boolean {
    return this.boundary.isWithinBounds(point);
  }

  public getAllObjects(): SpatialObjectNode[] {
    return Array.from(this.objects.values());
  }

  public getObject(objectId: string): SpatialObjectNode | undefined {
    return this.objects.get(objectId);
  }

  public getChamberBoundary(): SpatialBoundary {
    return this.boundary;
  }

  // Ergonomic aliases
  public getAllNodes(): SpatialObjectNode[] {
    return this.getAllObjects();
  }

  public getNode(objectId: string): SpatialObjectNode | undefined {
    return this.getObject(objectId);
  }

  public registerNode(node: SpatialObjectNode): void {
    this.registerObject(node);
  }

  public updateNodeTransform(
    objectId: string,
    transformUpdate: Partial<SpatialTransform>
  ): SpatialObjectNode | null {
    return this.updateLocalTransform(objectId, transformUpdate);
  }

  public isWithinChamber(point: Vector3Tuple): boolean {
    return this.isWithinChamberBounds(point);
  }
}

export const advancedSpatialIntelligenceEngine = AdvancedSpatialIntelligenceEngine.getInstance();
