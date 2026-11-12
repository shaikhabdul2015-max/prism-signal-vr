// src/webxr/intelligence/SpatialPuzzleAssistant.ts
import type { SpatialGuidanceLine } from './types';

export interface OpticalNodePoint {
  id: string;
  position: [number, number, number];
  currentRotationY: number;
  targetRotationY: number;
  colorHex: string;
  isAligned: boolean;
}

export class SpatialPuzzleAssistant {
  public computeGuidanceLines(
    nodes: OpticalNodePoint[],
    targetReceiverPos: [number, number, number]
  ): SpatialGuidanceLine[] {
    const lines: SpatialGuidanceLine[] = [];

    for (let i = 0; i < nodes.length; i++) {
      const current = nodes[i];
      const nextPos = i < nodes.length - 1 ? nodes[i + 1].position : targetReceiverPos;

      const angleDelta = current.targetRotationY - current.currentRotationY;
      const normalizedDelta = Math.atan2(Math.sin(angleDelta), Math.cos(angleDelta));
      const absDelta = Math.abs(normalizedDelta);

      // Guidance opacity increases when close to alignment or when assistance requested
      const opacity = current.isAligned ? 0.9 : Math.max(0.2, 0.8 - absDelta);

      lines.push({
        crystalId: current.id,
        startPoint: current.position,
        endPoint: nextPos,
        colorHex: current.colorHex,
        opacity: Number(opacity.toFixed(2)),
        deviationAngleRadians: Number(normalizedDelta.toFixed(3)),
        isAligned: current.isAligned,
      });
    }

    return lines;
  }

  public getSuggestedTargetVector(
    fromPos: [number, number, number],
    toPos: [number, number, number]
  ): [number, number, number] {
    const dx = toPos[0] - fromPos[0];
    const dy = toPos[1] - fromPos[1];
    const dz = toPos[2] - fromPos[2];
    const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1.0;
    return [
      Number((dx / len).toFixed(3)),
      Number((dy / len).toFixed(3)),
      Number((dz / len).toFixed(3)),
    ];
  }
}
