# GLOBAL GESTURE DEBOUNCING & BUBBLING AUDIT

**Project:** PRISM SIGNAL: BEYOND THE VOID  
**Modules:** `src/scene/gestureDebouncer.ts`, `src/scene/handInteraction.ts`, `src/scene/vrSpatialUI.ts`, `src/scene/sceneManager.ts`

---

## 1. Problem Addressed

Before centralization, UI pokes (`lastPokeTimeMs`), wrist/chamber UI pinches (`lastTriggerTimeMs`), console emitter beam toggles, air-swipe snap turns (`swipeTurnCooldownUntil`), native WebXR `pinchstart`/`pinchend` events, and continuous distance hysteresis ran independent timers—creating risk of event bubbling or double execution on rapid/noisy frames.

## 2. Centralized Architecture (`GlobalGestureDebouncer`)

A single `GlobalGestureDebouncer` instance is constructed in `initScene` (`src/scene/sceneManager.ts`) and shared across `createVRSpatialUI`, `createHandTracker`, and `vrAdapter.onSelectRay`:

| Category | Default Cooldown | Guarded Interactions |
| --- | --- | --- |
| `ui_poke` | `380 ms` | Direct opposite-hand index fingertip pokes on 3D wrist menu buttons |
| `ui_pinch` | `240 ms` | Raycast/direct pinches on general 3D UI panels |
| `wrist_menu` | `360 ms` | Wrist holobadge orb poke/pinch toggle & menu toggle actions |
| `glyph_select` | `280 ms` | Phase 3 Alien Cipher glyph selection, slot removal, clear, and submit |
| `crystal_select` | `220 ms` | Direct grab/ray crystal selection (`handInteraction.ts` & `vrAdapter.onSelectRay`) |
| `beam_toggle` | `350 ms` | Holographic console emitter beam on/off toggle |
| `system_action` | `480 ms` | `START_MISSION`, `PAUSE_MISSION`, `RESUME_MISSION`, `RESET_PUZZLE`, `EXIT_VR` |
| `snap_turn` | `480 ms` | Seated/standing air-swipe snap turns & wrist turn buttons |
| `smooth_turn` | `0 ms` | Continuous smooth-turn yaw updates (bypasses discrete cooldowns) |
| `calibration_step` | `420 ms` | Calibration confirmation, skip, cancel, posture/turn/handedness toggles |

## 3. Channel State Machine & Event Token Deduplication

1. **Channel Lifecycle:** Tracks `idle | pending | engaged | cooldown` per `${hand}:${category}`. Channels reset cleanly back to `idle` on finger release (`pinchend` / distance hysteresis release -> `debouncer.releaseChannel(...)`) or after cooldown expiration (`debouncer.updateCooldowns()`).
2. **Duplicate Event Token Blocking:** Interaction handlers generate deterministic per-gesture event tokens (`${handName}:pinch:${epoch}`). Any duplicate emission or multi-listener bubbling sharing an active `eventToken` within `120ms` is rejected (`reason: 'duplicate_event'`).
3. **Native `pinchstart`/`pinchend` + Distance Hysteresis Reconciliation (`resolvePinchTransition`):**
   - `pinchstart` does not double-fire when subsequent `distance_update` frames report distance `< pinchStartThreshold`.
   - `pinchend` inside the calibrated hysteresis band `[pinchStartThreshold, pinchEndThreshold]` preserves grab stability until fingers separate past `pinchEndThreshold` (or immediately on emulated runtimes lacking valid joint matrices).
4. **Telemetry Counters:** `getMetrics()` tracks `totalRequests`, `executedCount`, `blockedCooldownCount`, `blockedDuplicateCount`, and `blockedEngagedCount` without storing PII.

## 4. Audit Verification

Verified via automated test suite (`tests/HandsFirstArchitectureValidation.test.ts` & `tests/HandTrackingCompleteExperience.test.ts`):
- Identical `eventToken` emissions within `120ms` are blocked cleanly (`reason: 'duplicate_event'`).
- Rapid consecutive triggers inside category/target cooldowns are rejected (`reason: 'cooldown'`).
- Legitimate repeated clicks execute properly once cooldown expires and channel returns to `idle`.
- `smooth_turn` (`0ms`) remains fluid across continuous XR frames.
