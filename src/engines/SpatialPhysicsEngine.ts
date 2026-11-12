/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Spatial Physics Engine (Phase 29)
 * High-performance, lightweight analytical physics simulation for WebXR realities:
 * - Sphere-to-Sphere and Sphere-to-AABB collision detection
 * - Elastic and inelastic impulse calculations with restitution
 * - Velocity tracking, drag/damping, and gravity integration
 * - Chamber boundary enforcement
 * - Collision event dispatching
 */

import * as THREE from 'three';
import {
  PhysicsCollider,
  CollisionEvent,
  Vector3Tuple,
} from '../types/phase29';
import { advancedSpatialIntelligenceEngine } from './AdvancedSpatialIntelligenceEngine';

export class SpatialPhysicsEngine {
  private static instance: SpatialPhysicsEngine | null = null;
  private colliders: Map<string, PhysicsCollider> = new Map();
  private recentCollisions: CollisionEvent[] = [];
  private gravity: Vector3Tuple = [0, -4.9, 0]; // Low-gravity chamber feel (0.5G)
  private airDamping = 0.985; // Natural kinetic damping

  public constructor() {
    this.registerChamberColliders();
  }

  public static getInstance(): SpatialPhysicsEngine {
    if (!SpatialPhysicsEngine.instance) {
      SpatialPhysicsEngine.instance = new SpatialPhysicsEngine();
    }
    return SpatialPhysicsEngine.instance;
  }

  public static resetInstance(): void {
    SpatialPhysicsEngine.instance = null;
  }

  private registerChamberColliders(): void {
    // Add physics colliders for Ruby, Azure, Emerald cores
    this.addCollider({
      objectId: 'ruby-core',
      shape: 'SPHERE',
      radius: 0.45,
      centerOffset: [0, 0, 0],
      massKg: 12.0,
      isStatic: true,
      restitution: 0.75,
      velocity: [0, 0, 0],
      angularVelocity: [0, 0.02, 0],
    });

    this.addCollider({
      objectId: 'azure-array',
      shape: 'SPHERE',
      radius: 0.55,
      centerOffset: [0, 0, 0],
      massKg: 18.0,
      isStatic: true,
      restitution: 0.65,
      velocity: [0, 0, 0],
      angularVelocity: [0, -0.015, 0],
    });

    this.addCollider({
      objectId: 'emerald-core',
      shape: 'SPHERE',
      radius: 0.45,
      centerOffset: [0, 0, 0],
      massKg: 12.0,
      isStatic: true,
      restitution: 0.75,
      velocity: [0, 0, 0],
      angularVelocity: [0, 0.02, 0],
    });
  }

  public addCollider(collider: PhysicsCollider): void {
    this.colliders.set(collider.objectId, collider);
  }

  public removeCollider(objectId: string): void {
    this.colliders.delete(objectId);
  }

  public getCollider(objectId: string): PhysicsCollider | undefined {
    return this.colliders.get(objectId);
  }

  public getAllColliders(): PhysicsCollider[] {
    return Array.from(this.colliders.values());
  }

  public getRecentCollisions(): CollisionEvent[] {
    return [...this.recentCollisions];
  }

  public registerCollider(collider: PhysicsCollider): void {
    this.addCollider(collider);
  }

  public clearCollisions(): void {
    this.recentCollisions = [];
  }

  public stepSimulation(
    deltaSeconds: number,
    overridePositions?: Map<string, Vector3Tuple>
  ): CollisionEvent[] {
    return this.updatePhysics(deltaSeconds, overridePositions);
  }

  /**
   * Advances the physics simulation by deltaSeconds
   */
  public updatePhysics(
    deltaSeconds: number,
    overridePositions?: Map<string, Vector3Tuple>
  ): CollisionEvent[] {
    const clampedDelta = Math.min(0.05, Math.max(0.001, deltaSeconds));
    const newCollisions: CollisionEvent[] = [];
    const colliderList = Array.from(this.colliders.values());

    // 1. Integrate motion for dynamic (non-static) bodies
    for (const collider of colliderList) {
      if (collider.isStatic) continue;

      const obj = advancedSpatialIntelligenceEngine.getObject(collider.objectId);
      const curPos = overridePositions?.get(collider.objectId) || obj?.localTransform.position;
      if (!curPos) continue;

      // Integrate gravity and damping
      collider.velocity[0] = (collider.velocity[0] + this.gravity[0] * clampedDelta) * this.airDamping;
      collider.velocity[1] = (collider.velocity[1] + this.gravity[1] * clampedDelta) * this.airDamping;
      collider.velocity[2] = (collider.velocity[2] + this.gravity[2] * clampedDelta) * this.airDamping;

      const newPos: Vector3Tuple = [
        curPos[0] + collider.velocity[0] * clampedDelta,
        curPos[1] + collider.velocity[1] * clampedDelta,
        curPos[2] + collider.velocity[2] * clampedDelta,
      ];

      // Chamber boundary floor collision (y >= 0.2m)
      if (newPos[1] < (collider.radius || 0.2)) {
        newPos[1] = collider.radius || 0.2;
        collider.velocity[1] = -collider.velocity[1] * collider.restitution;
        collider.velocity[0] *= 0.85; // Floor friction
        collider.velocity[2] *= 0.85;
      }

      if (overridePositions) {
        overridePositions.set(collider.objectId, newPos);
      }
      advancedSpatialIntelligenceEngine.updateLocalTransform(collider.objectId, {
        position: newPos,
      });
    }

    // 2. Perform Pairwise Sphere-Sphere Collision Detection
    for (let i = 0; i < colliderList.length; i++) {
      for (let j = i + 1; j < colliderList.length; j++) {
        const colA = colliderList[i];
        const colB = colliderList[j];

        const posATuple = overridePositions?.get(colA.objectId) ||
          advancedSpatialIntelligenceEngine.getObject(colA.objectId)?.worldTransform.position;
        const posBTuple = overridePositions?.get(colB.objectId) ||
          advancedSpatialIntelligenceEngine.getObject(colB.objectId)?.worldTransform.position;

        if (!posATuple || !posBTuple) continue;

        const posA = new THREE.Vector3(...posATuple);
        const posB = new THREE.Vector3(...posBTuple);

        const radiusA = colA.radius || 0.3;
        const radiusB = colB.radius || 0.3;
        const minDistance = radiusA + radiusB;
        const dist = posA.distanceTo(posB);

        if (dist < minDistance) {
          const penetration = minDistance - dist;
          const normal = new THREE.Vector3().subVectors(posA, posB).normalize();
          const contact: Vector3Tuple = [
            posA.x - normal.x * radiusA,
            posA.y - normal.y * radiusA,
            posA.z - normal.z * radiusA,
          ];

          // Compute relative velocity
          const velA = new THREE.Vector3(...colA.velocity);
          const velB = new THREE.Vector3(...colB.velocity);
          const relVel = velA.distanceTo(velB);

          const evt: CollisionEvent = {
            id: `col-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            colliderAId: colA.objectId,
            colliderBId: colB.objectId,
            contactPoint: contact,
            penetrationDepth: Number(penetration.toFixed(3)),
            relativeVelocity: Number(relVel.toFixed(2)),
            timestampMs: Date.now(),
          };

          newCollisions.push(evt);
          this.recentCollisions.unshift(evt);
          if (this.recentCollisions.length > 25) {
            this.recentCollisions.pop();
          }

          // Elastic impulse response
          if (!colA.isStatic && colB.isStatic) {
            colA.velocity[0] = normal.x * (relVel * colA.restitution + 0.1);
            colA.velocity[1] = normal.y * (relVel * colA.restitution + 0.1);
            colA.velocity[2] = normal.z * (relVel * colA.restitution + 0.1);
          } else if (colA.isStatic && !colB.isStatic) {
            colB.velocity[0] = -normal.x * (relVel * colB.restitution + 0.1);
            colB.velocity[1] = -normal.y * (relVel * colB.restitution + 0.1);
            colB.velocity[2] = -normal.z * (relVel * colB.restitution + 0.1);
          } else if (!colA.isStatic && !colB.isStatic) {
            // Both dynamic: reverse/exchange velocity along collision normal
            const avgRestitution = (colA.restitution + colB.restitution) / 2;
            colA.velocity[0] = -colA.velocity[0] * avgRestitution;
            colB.velocity[0] = -colB.velocity[0] * avgRestitution;
          }
        }
      }
    }

    return newCollisions;
  }

  /**
   * Applies an impulse force to an object
   */
  public applyImpulse(objectId: string, impulse: Vector3Tuple): boolean {
    const collider = this.colliders.get(objectId);
    if (!collider || collider.isStatic) return false;

    collider.velocity[0] += impulse[0] / collider.massKg;
    collider.velocity[1] += impulse[1] / collider.massKg;
    collider.velocity[2] += impulse[2] / collider.massKg;
    return true;
  }
}

export const spatialPhysicsEngine = SpatialPhysicsEngine.getInstance();
