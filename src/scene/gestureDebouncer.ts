/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Centralized Global Gesture Debouncer & Cooldown Controller
 * Prevents duplicate execution, event bubbling across pinchstart/distance-hysteresis/UI pokes,
 * and enforces configurable per-category cooldowns while allowing legitimate repeated gestures.
 */

export type GestureCategory =
  | 'ui_poke'
  | 'ui_pinch'
  | 'wrist_menu'
  | 'glyph_select'
  | 'crystal_select'
  | 'beam_toggle'
  | 'system_action'
  | 'snap_turn'
  | 'smooth_turn'
  | 'calibration_step';

export type GestureChannelState = 'idle' | 'pending' | 'engaged' | 'cooldown';

export interface GestureExecutionRequest {
  category: GestureCategory;
  targetId: string;
  hand?: 'left' | 'right' | 'controller' | 'system';
  nowMs?: number;
  /** Optional shared event token (e.g. from native pinchstart or single interaction frame) to block bubbling */
  eventToken?: string;
}

export interface GestureExecutionResult {
  allowed: boolean;
  reason: 'ok' | 'cooldown' | 'duplicate_event' | 'already_engaged';
  remainingCooldownMs: number;
}

export interface GestureDebouncerMetrics {
  totalRequests: number;
  executedCount: number;
  blockedCooldownCount: number;
  blockedDuplicateCount: number;
  blockedEngagedCount: number;
}

export const DEFAULT_GESTURE_COOLDOWNS_MS: Record<GestureCategory, number> = {
  ui_poke: 380,
  ui_pinch: 240,
  wrist_menu: 360,
  glyph_select: 280,
  crystal_select: 220,
  beam_toggle: 350,
  system_action: 480,
  snap_turn: 480,
  smooth_turn: 0,
  calibration_step: 420,
};

/**
 * Classifies a VRUIAction type string into the appropriate global debounce category.
 */
export function categorizeVRUIActionType(actionType: string): GestureCategory {
  if (actionType === 'TOGGLE_WRIST_MENU') return 'wrist_menu';
  if (actionType === 'SNAP_TURN') return 'snap_turn';
  if (actionType === 'SMOOTH_TURN') return 'smooth_turn';
  if (actionType === 'TOGGLE_BEAM') return 'beam_toggle';
  if (
    actionType === 'DECODE_SELECT_SYMBOL' ||
    actionType === 'DECODE_REMOVE_SLOT' ||
    actionType === 'DECODE_CLEAR' ||
    actionType === 'DECODE_SUBMIT'
  ) {
    return 'glyph_select';
  }
  if (
    actionType === 'START_MISSION' ||
    actionType === 'PAUSE_MISSION' ||
    actionType === 'RESUME_MISSION' ||
    actionType === 'RESET_PUZZLE' ||
    actionType === 'EXIT_VR'
  ) {
    return 'system_action';
  }
  if (
    actionType === 'START_CALIBRATION' ||
    actionType === 'COMPLETE_CALIBRATION' ||
    actionType === 'SKIP_CALIBRATION' ||
    actionType === 'CANCEL_CALIBRATION' ||
    actionType === 'TOGGLE_DOMINANT_HAND' ||
    actionType === 'TOGGLE_POSTURE' ||
    actionType === 'TOGGLE_TURN_MODE'
  ) {
    return 'calibration_step';
  }
  return 'ui_pinch';
}

export class GlobalGestureDebouncer {
  private cooldownsMs: Record<GestureCategory, number>;
  private lastCategoryExecutionMs: Map<GestureCategory, number> = new Map();
  private lastTargetExecutionMs: Map<string, number> = new Map();
  private channelStates: Map<string, GestureChannelState> = new Map();
  private recentEventTokens: Map<string, number> = new Map();
  private metrics: GestureDebouncerMetrics = {
    totalRequests: 0,
    executedCount: 0,
    blockedCooldownCount: 0,
    blockedDuplicateCount: 0,
    blockedEngagedCount: 0,
  };

  constructor(customCooldowns: Partial<Record<GestureCategory, number>> = {}) {
    this.cooldownsMs = {
      ...DEFAULT_GESTURE_COOLDOWNS_MS,
      ...customCooldowns,
    };
  }

  public setCooldown(category: GestureCategory, cooldownMs: number): void {
    if (Number.isFinite(cooldownMs) && cooldownMs >= 0) {
      this.cooldownsMs[category] = cooldownMs;
    }
  }

  public getCooldown(category: GestureCategory): number {
    return this.cooldownsMs[category];
  }

  public getChannelState(channelKey: string): GestureChannelState {
    return this.channelStates.get(channelKey) || 'idle';
  }

  public transitionChannelState(channelKey: string, nextState: GestureChannelState): void {
    this.channelStates.set(channelKey, nextState);
  }

  /**
   * Attempts to execute a discrete gesture action through global cooldown + bubbling protection.
   * Smooth/continuous actions with `cooldownMs === 0` bypass cooldown timers cleanly.
   */
  public tryExecute(request: GestureExecutionRequest): GestureExecutionResult {
    const now = request.nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    this.metrics.totalRequests++;

    // 1. Check explicit event token deduplication (stops multi-listener bubbling)
    if (request.eventToken) {
      const tokenAge = now - (this.recentEventTokens.get(request.eventToken) ?? -Infinity);
      if (tokenAge < 120) {
        this.metrics.blockedDuplicateCount++;
        return { allowed: false, reason: 'duplicate_event', remainingCooldownMs: Math.max(0, 120 - tokenAge) };
      }
    }

    const cooldownMs = this.cooldownsMs[request.category] ?? 240;
    const channelKey = `${request.hand || 'system'}:${request.category}`;
    const targetKey = `${request.category}:${request.targetId}`;

    // 2. Check active channel state guard if discrete channel is already engaged on same burst
    if (cooldownMs > 0 && this.channelStates.get(channelKey) === 'engaged') {
      const lastExec = this.lastCategoryExecutionMs.get(request.category) ?? -Infinity;
      if (now - lastExec < Math.min(80, cooldownMs)) {
        this.metrics.blockedEngagedCount++;
        return {
          allowed: false,
          reason: 'already_engaged',
          remainingCooldownMs: Math.max(0, cooldownMs - (now - lastExec)),
        };
      }
    }

    // 3. Enforce per-category & per-target cooldowns
    if (cooldownMs > 0) {
      const lastCat = this.lastCategoryExecutionMs.get(request.category) ?? -Infinity;
      const catElapsed = now - lastCat;
      if (catElapsed < cooldownMs) {
        this.metrics.blockedCooldownCount++;
        this.channelStates.set(channelKey, 'cooldown');
        return {
          allowed: false,
          reason: 'cooldown',
          remainingCooldownMs: Math.ceil(cooldownMs - catElapsed),
        };
      }

      const lastTarget = this.lastTargetExecutionMs.get(targetKey) ?? -Infinity;
      const targetElapsed = now - lastTarget;
      if (targetElapsed < cooldownMs) {
        this.metrics.blockedCooldownCount++;
        this.channelStates.set(channelKey, 'cooldown');
        return {
          allowed: false,
          reason: 'cooldown',
          remainingCooldownMs: Math.ceil(cooldownMs - targetElapsed),
        };
      }
    }

    // 4. Record execution & update states
    this.lastCategoryExecutionMs.set(request.category, now);
    this.lastTargetExecutionMs.set(targetKey, now);
    if (cooldownMs > 0) {
      this.channelStates.set(channelKey, 'engaged');
    }

    if (request.eventToken) {
      this.recentEventTokens.set(request.eventToken, now);
      if (this.recentEventTokens.size > 64) {
        // Prune expired tokens deterministically
        for (const [token, ts] of this.recentEventTokens.entries()) {
          if (now - ts > 500) {
            this.recentEventTokens.delete(token);
          }
        }
      }
    }

    this.metrics.executedCount++;
    return { allowed: true, reason: 'ok', remainingCooldownMs: 0 };
  }

  /**
   * Releases an engaged gesture channel back to idle (e.g. on finger open / pinchend / cooldown tick).
   */
  public releaseChannel(hand: 'left' | 'right' | 'controller' | 'system', category: GestureCategory): void {
    const channelKey = `${hand}:${category}`;
    this.channelStates.set(channelKey, 'idle');
  }

  public updateCooldowns(nowMs?: number): void {
    const now = nowMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
    for (const [channelKey, state] of this.channelStates.entries()) {
      if (state === 'cooldown' || state === 'engaged') {
        const [, categoryRaw] = channelKey.split(':');
        const category = categoryRaw as GestureCategory;
        const cooldownMs = this.cooldownsMs[category] ?? 240;
        const last = this.lastCategoryExecutionMs.get(category) ?? -Infinity;
        if (now - last >= cooldownMs && state === 'cooldown') {
          this.channelStates.set(channelKey, 'idle');
        }
      }
    }
  }

  public getMetrics(): GestureDebouncerMetrics {
    return { ...this.metrics };
  }

  public reset(): void {
    this.lastCategoryExecutionMs.clear();
    this.lastTargetExecutionMs.clear();
    this.channelStates.clear();
    this.recentEventTokens.clear();
    this.metrics = {
      totalRequests: 0,
      executedCount: 0,
      blockedCooldownCount: 0,
      blockedDuplicateCount: 0,
      blockedEngagedCount: 0,
    };
  }
}
