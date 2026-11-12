/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dual-Platform Input Abstraction: Common Contract & Types
 * Enforces strict separation between Android Touch and Meta Quest Hands-First WebXR
 * without cross-coupling or fallback contamination.
 */

export type InputPlatformId = 'android_touch' | 'meta_quest_hands' | 'desktop_mouse';

export interface TouchGestureSample {
  type: 'tap' | 'drag' | 'pinch_zoom' | 'swipe_turn' | 'long_press';
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
  deltaX: number;
  deltaY: number;
  rotationDeltaAngleRad: number;
  targetEntityId: string | null;
  pointerCount: number;
  timestampMs: number;
}

export interface AndroidTouchAdapterConfig {
  tapTolerancePx: number;
  dragThresholdPx: number;
  rotationSensitivityRadPerPx: number;
  swipeTurnThresholdPx: number;
  preventPullToRefresh: boolean;
  hapticFeedbackEnabled: boolean;
}

export interface MetaQuestHandAdapterConfig {
  handTrackingRequired: true;
  preferControllerFree: true;
  biometricsStorageAllowed: false;
}

export interface PlatformInputAdapter {
  readonly platformId: InputPlatformId;
  readonly isHandsFirst: boolean;
  readonly isTouchDriven: boolean;
  isEnabled(): boolean;
  setEnabled(enabled: boolean): void;
  reset(): void;
  dispose(): void;
}
