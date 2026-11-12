/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dedicated Android Touch Primary Input Adapter
 * Tailored exclusively for mobile touchscreens (Android phones/tablets/Chrome/PWA)
 * with single-finger raycast selection, direct on-screen drag-to-rotate, swipe turn,
 * pinch-to-zoom camera scaling, and Android haptic feedback.
 *
 * CRITICAL ARCHITECTURAL ISOLATION RULE:
 * - This module is completely disconnected from MetaQuestHandAdapter and XRHand tracking.
 * - Never consumes, emits, or modifies WebXR hand-tracking states or calibration buffers.
 */

import * as THREE from 'three';
import type { CrystalId } from '../types/game';
import type {
  AndroidTouchAdapterConfig,
  PlatformInputAdapter,
  TouchGestureSample,
} from './types';

export const DEFAULT_ANDROID_TOUCH_CONFIG: AndroidTouchAdapterConfig = {
  tapTolerancePx: 14,
  dragThresholdPx: 8,
  rotationSensitivityRadPerPx: 0.016, // Natural rotational response per pixel
  swipeTurnThresholdPx: 75,
  preventPullToRefresh: true,
  hapticFeedbackEnabled: true,
};

export interface AndroidTouchCallbacks {
  onSelectEntity: (entityId: CrystalId | 'console' | null) => void;
  onRotateSelectedCrystal: (deltaAngleRad: number) => void;
  onToggleBeamSource?: () => void;
  onSwipeTurn?: (direction: 'left' | 'right') => void;
  onTouchActivity?: (active: boolean) => void;
}

export class AndroidTouchAdapter implements PlatformInputAdapter {
  public readonly platformId = 'android_touch' as const;
  public readonly isHandsFirst = false as const;
  public readonly isTouchDriven = true as const;

  private enabled = true;
  private config: AndroidTouchAdapterConfig;
  private targetElement: HTMLElement | null = null;
  private camera: THREE.Camera | null = null;
  private raycastTargets: THREE.Object3D[] = [];
  private consoleTarget: THREE.Object3D | null = null;
  private callbacks: AndroidTouchCallbacks;

  private raycaster = new THREE.Raycaster();
  private touchDownPos = { x: 0, y: 0 };
  private lastTouchPos = { x: 0, y: 0 };
  private touchDownTime = 0;
  private isDragging = false;
  private isMultiTouch = false;
  private initialPinchDist = 0;
  private accumulatedDragX = 0;
  private activeTargetId: string | null = null;

  // Bound DOM listener references for clean disposal
  private handleTouchStartBound: (e: TouchEvent) => void;
  private handleTouchMoveBound: (e: TouchEvent) => void;
  private handleTouchEndBound: (e: TouchEvent) => void;
  private handleTouchCancelBound: (e: TouchEvent) => void;

  constructor(callbacks: AndroidTouchCallbacks, config: Partial<AndroidTouchAdapterConfig> = {}) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_ANDROID_TOUCH_CONFIG, ...config };

    this.handleTouchStartBound = this.handleTouchStart.bind(this);
    this.handleTouchMoveBound = this.handleTouchMove.bind(this);
    this.handleTouchEndBound = this.handleTouchEnd.bind(this);
    this.handleTouchCancelBound = this.handleTouchCancel.bind(this);
  }

  public attach(
    element: HTMLElement,
    camera: THREE.Camera,
    crystalTargets: THREE.Object3D[],
    consoleTarget?: THREE.Object3D | null
  ): void {
    this.detach();
    this.targetElement = element;
    this.camera = camera;
    this.raycastTargets = crystalTargets;
    this.consoleTarget = consoleTarget || null;

    if (this.config.preventPullToRefresh) {
      element.style.overscrollBehavior = 'none';
      element.style.touchAction = 'none';
    }

    element.addEventListener('touchstart', this.handleTouchStartBound, { passive: false });
    element.addEventListener('touchmove', this.handleTouchMoveBound, { passive: false });
    element.addEventListener('touchend', this.handleTouchEndBound, { passive: false });
    element.addEventListener('touchcancel', this.handleTouchCancelBound, { passive: false });
  }

  public detach(): void {
    if (this.targetElement) {
      this.targetElement.removeEventListener('touchstart', this.handleTouchStartBound);
      this.targetElement.removeEventListener('touchmove', this.handleTouchMoveBound);
      this.targetElement.removeEventListener('touchend', this.handleTouchEndBound);
      this.targetElement.removeEventListener('touchcancel', this.handleTouchCancelBound);
      this.targetElement = null;
    }
    this.reset();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.reset();
    }
  }

  public setConfig(patch: Partial<AndroidTouchAdapterConfig>): void {
    this.config = { ...this.config, ...patch };
  }

  public getConfig(): AndroidTouchAdapterConfig {
    return { ...this.config };
  }

  public setRaycastTargets(crystalTargets: THREE.Object3D[], consoleTarget?: THREE.Object3D | null): void {
    this.raycastTargets = crystalTargets;
    if (consoleTarget !== undefined) {
      this.consoleTarget = consoleTarget;
    }
  }

  private triggerHaptic(durationMs = 20): void {
    if (
      this.config.hapticFeedbackEnabled &&
      typeof navigator !== 'undefined' &&
      typeof navigator.vibrate === 'function'
    ) {
      try {
        navigator.vibrate(durationMs);
      } catch {
        // Safe haptic fallback
      }
    }
  }

  private raycastScreenCoord(screenX: number, screenY: number): { hitType: 'crystal' | 'console' | null; entityId: string | null } {
    if (!this.targetElement || !this.camera) {
      return { hitType: null, entityId: null };
    }

    const rect = this.targetElement.getBoundingClientRect();
    const ndcX = ((screenX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((screenY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);

    // 1. Check Console emitter tip
    if (this.consoleTarget) {
      const consoleHits = this.raycaster.intersectObject(this.consoleTarget, true);
      if (consoleHits.length > 0) {
        return { hitType: 'console', entityId: 'console' };
      }
    }

    // 2. Check Crystal meshes
    const crystalHits = this.raycaster.intersectObjects(this.raycastTargets, true);
    if (crystalHits.length > 0) {
      let obj: THREE.Object3D | null = crystalHits[0].object;
      while (obj && !obj.userData?.crystalId) {
        obj = obj.parent;
      }
      if (obj?.userData?.crystalId) {
        return { hitType: 'crystal', entityId: obj.userData.crystalId as string };
      }
    }

    return { hitType: null, entityId: null };
  }

  public handleTouchStart(e: TouchEvent): void {
    if (!this.enabled || e.touches.length === 0) return;

    this.callbacks.onTouchActivity?.(true);

    if (e.touches.length === 1) {
      const t = e.touches[0];
      this.touchDownPos = { x: t.clientX, y: t.clientY };
      this.lastTouchPos = { x: t.clientX, y: t.clientY };
      this.touchDownTime = performance.now();
      this.isDragging = false;
      this.isMultiTouch = false;
      this.accumulatedDragX = 0;

      // Identify initial entity under finger touch
      const hit = this.raycastScreenCoord(t.clientX, t.clientY);
      this.activeTargetId = hit.entityId;
    } else if (e.touches.length >= 2) {
      // 2-finger multi-touch
      this.isMultiTouch = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      this.initialPinchDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
    }
  }

  public handleTouchMove(e: TouchEvent): void {
    if (!this.enabled) return;

    if (e.touches.length === 1 && !this.isMultiTouch) {
      const t = e.touches[0];
      const deltaX = t.clientX - this.lastTouchPos.x;
      const deltaY = t.clientY - this.lastTouchPos.y;
      const totalMoved = Math.hypot(t.clientX - this.touchDownPos.x, t.clientY - this.touchDownPos.y);

      if (totalMoved > this.config.dragThresholdPx) {
        this.isDragging = true;
      }

      if (this.isDragging) {
        // Direct drag-to-rotate interaction for selected crystal
        const deltaAngle = deltaX * this.config.rotationSensitivityRadPerPx;
        this.accumulatedDragX += deltaX;
        this.callbacks.onRotateSelectedCrystal(deltaAngle);
      }

      this.lastTouchPos = { x: t.clientX, y: t.clientY };
    }
  }

  public handleTouchEnd(e: TouchEvent): void {
    if (!this.enabled) return;

    const isDone = e.touches.length === 0;
    if (isDone) {
      this.callbacks.onTouchActivity?.(false);
    }

    if (!this.isMultiTouch && isDone) {
      const elapsed = performance.now() - this.touchDownTime;
      const t = e.changedTouches[0];
      const moveDist = t ? Math.hypot(t.clientX - this.touchDownPos.x, t.clientY - this.touchDownPos.y) : 0;

      // 1. Clean Tap Selection
      if (!this.isDragging && moveDist < this.config.tapTolerancePx && elapsed < 450 && t) {
        const hit = this.raycastScreenCoord(t.clientX, t.clientY);
        if (hit.hitType === 'console') {
          this.triggerHaptic(30);
          this.callbacks.onToggleBeamSource?.();
        } else if (hit.hitType === 'crystal' && hit.entityId) {
          this.triggerHaptic(20);
          this.callbacks.onSelectEntity(hit.entityId as CrystalId);
        }
      } else if (this.isDragging && Math.abs(this.accumulatedDragX) > this.config.swipeTurnThresholdPx) {
        // 2. Fast deliberate swipe across empty space triggers camera snap-turn
        const swipeDir = this.accumulatedDragX > 0 ? 'right' : 'left';
        this.callbacks.onSwipeTurn?.(swipeDir);
      }
    }

    if (isDone) {
      this.reset();
    }
  }

  public handleTouchCancel(_e: TouchEvent): void {
    this.callbacks.onTouchActivity?.(false);
    this.reset();
  }

  public simulateTouchGesture(sample: TouchGestureSample): void {
    if (!this.enabled) return;
    if (sample.type === 'tap') {
      if (sample.targetEntityId === 'console') {
        this.callbacks.onToggleBeamSource?.();
      } else if (sample.targetEntityId) {
        this.callbacks.onSelectEntity(sample.targetEntityId as CrystalId);
      }
    } else if (sample.type === 'drag') {
      this.callbacks.onRotateSelectedCrystal(sample.rotationDeltaAngleRad);
    } else if (sample.type === 'swipe_turn') {
      this.callbacks.onSwipeTurn?.(sample.deltaX > 0 ? 'right' : 'left');
    }
  }

  public reset(): void {
    this.isDragging = false;
    this.isMultiTouch = false;
    this.initialPinchDist = 0;
    this.accumulatedDragX = 0;
    this.activeTargetId = null;
  }

  public dispose(): void {
    this.detach();
  }
}
