// src/webxr/intelligence/ContextualInteractionSystem.ts
import type { ContextualPrompt, InteractionInputMode, SpatialEntityTarget } from './types';

export class ContextualInteractionSystem {
  private registeredEntities: Map<string, SpatialEntityTarget> = new Map();
  private inputMode: InteractionInputMode = 'desktop_mouse_touch';
  private proximityThresholdMeters = 0.65;

  public setInputMode(mode: InteractionInputMode): void {
    this.inputMode = mode;
  }

  public getInputMode(): InteractionInputMode {
    return this.inputMode;
  }

  public registerEntity(entity: SpatialEntityTarget): void {
    this.registeredEntities.set(entity.id, entity);
  }

  public unregisterEntity(entityId: string): void {
    this.registeredEntities.delete(entityId);
  }

  public getEntity(entityId: string): SpatialEntityTarget | undefined {
    return this.registeredEntities.get(entityId);
  }

  public getAllEntities(): SpatialEntityTarget[] {
    return Array.from(this.registeredEntities.values());
  }

  public evaluateProximityAndRay(
    pointerOrHandPos: [number, number, number],
    rayDirection?: [number, number, number]
  ): ContextualPrompt[] {
    const prompts: ContextualPrompt[] = [];

    for (const entity of this.registeredEntities.values()) {
      if (!entity.isInteractable) continue;

      // Euclidean distance in 3D
      const dx = entity.position[0] - pointerOrHandPos[0];
      const dy = entity.position[1] - pointerOrHandPos[1];
      const dz = entity.position[2] - pointerOrHandPos[2];
      const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

      const isWithinProximity = distance <= (this.proximityThresholdMeters + entity.boundingRadiusMeters);

      // Ray alignment bonus if rayDirection provided
      let isRayAimed = false;
      if (rayDirection && distance > 0.01) {
        const rayLen = Math.sqrt(
          rayDirection[0] * rayDirection[0] +
          rayDirection[1] * rayDirection[1] +
          rayDirection[2] * rayDirection[2]
        );
        if (rayLen > 0.001) {
          const rx = rayDirection[0] / rayLen;
          const ry = rayDirection[1] / rayLen;
          const rz = rayDirection[2] / rayLen;
          const normDx = dx / distance;
          const normDy = dy / distance;
          const normDz = dz / distance;
          const dot = normDx * rx + normDy * ry + normDz * rz;
          if (dot > 0.85) {
            isRayAimed = true;
          }
        }
      }

      if (isWithinProximity || isRayAimed) {
        let instruction = '';
        if (this.inputMode === 'xr_hand_tracking') {
          instruction = `Pinch with index & thumb to grab and rotate ${entity.name}.`;
        } else if (this.inputMode === 'xr_tracked_pointer') {
          instruction = `Pull trigger to engage beam orientation for ${entity.name}.`;
        } else {
          instruction = `Click and drag to align ${entity.name}.`;
        }

        prompts.push({
          targetId: entity.id,
          title: entity.name,
          actionInstruction: instruction,
          inputMode: this.inputMode,
          distanceMeters: Number(distance.toFixed(2)),
          isWithinProximity,
          priority: isWithinProximity ? 'high' : 'medium',
        });
      }
    }

    return prompts.sort((a, b) => (b.priority === 'high' ? 1 : 0) - (a.priority === 'high' ? 1 : 0));
  }
}
