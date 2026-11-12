/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Dual-Platform Input Router
 * Directs incoming runtime inputs to either:
 * - MetaQuestHandAdapter: When presenting in WebXR immersive-vr on Meta Quest
 * - AndroidTouchAdapter: When running on Android mobile/touch browsers in 2D
 *
 * GUARANTEES:
 * - One shared Three.js gameplay and optical puzzle engine.
 * - Two completely separate and independent platform adapters.
 * - Mobile touch logic never overrides or disables WebXR hand-tracking.
 * - Android touch controls are never routed into Meta Quest hand-tracking buffers.
 */

import type { PlatformInputAdapter, InputPlatformId } from './types';
import { AndroidTouchAdapter } from './AndroidTouchAdapter';
import { MetaQuestHandAdapter } from './MetaQuestHandAdapter';

export interface DualPlatformRouterConfig {
  isVRActive: boolean;
  isAndroidTouchDevice: boolean;
}

export class DualPlatformInputRouter {
  private activePlatform: InputPlatformId;
  public readonly touchAdapter: AndroidTouchAdapter;
  public readonly handAdapter: MetaQuestHandAdapter;

  constructor(touchAdapter: AndroidTouchAdapter, handAdapter: MetaQuestHandAdapter, initialVRActive = false) {
    this.touchAdapter = touchAdapter;
    this.handAdapter = handAdapter;

    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));
    this.activePlatform = initialVRActive
      ? 'meta_quest_hands'
      : isTouch
      ? 'android_touch'
      : 'desktop_mouse';

    this.synchronizeRouting(initialVRActive);
  }

  public synchronizeRouting(isVRActive: boolean): InputPlatformId {
    if (isVRActive) {
      this.activePlatform = 'meta_quest_hands';
      // Prioritize 100% hands-first WebXR; touch adapter rests in passive idle
      this.handAdapter.setEnabled(true);
      this.touchAdapter.setEnabled(false);
    } else {
      const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));
      this.activePlatform = isTouch ? 'android_touch' : 'desktop_mouse';
      this.touchAdapter.setEnabled(true);
      // Hand tracking active for next VR entry without interference
      this.handAdapter.setEnabled(true);
    }
    return this.activePlatform;
  }

  public getActivePlatform(): InputPlatformId {
    return this.activePlatform;
  }

  public getActiveAdapter(): PlatformInputAdapter {
    return this.activePlatform === 'meta_quest_hands' ? this.handAdapter : this.touchAdapter;
  }

  public dispose(): void {
    this.touchAdapter.dispose();
    this.handAdapter.dispose();
  }
}

export * from './types';
export * from './AndroidTouchAdapter';
export * from './MetaQuestHandAdapter';
