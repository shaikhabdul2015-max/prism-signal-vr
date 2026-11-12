// src/webxr/intelligence/types.ts
/**
 * Types for Stage 6 Advanced WebXR Interaction & Spatial Assistance
 */

export type InteractionInputMode = 'xr_tracked_pointer' | 'xr_hand_tracking' | 'desktop_mouse_touch';

export interface SpatialEntityTarget {
  id: string;
  name: string;
  position: [number, number, number];
  boundingRadiusMeters: number;
  isInteractable: boolean;
  interactionType: 'crystal_rotator' | 'symbol_glyph' | 'console_switch' | 'lore_beacon';
  metadata: Record<string, unknown>;
}

export interface ContextualPrompt {
  targetId: string;
  title: string;
  actionInstruction: string;
  inputMode: InteractionInputMode;
  distanceMeters: number;
  isWithinProximity: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface SpatialGuidanceLine {
  crystalId: string;
  startPoint: [number, number, number];
  endPoint: [number, number, number];
  colorHex: string;
  opacity: number;
  deviationAngleRadians: number;
  isAligned: boolean;
}
