# Human Control Priority & Race-Condition Audit

**Classification:** `VERIFIED` (Unit & async preemption integration tests in `tests/Stage67RuntimeIntegration.test.ts` and `tests/Stage7SpatialIntelligence.test.ts`)

## 1. Control Priority Invariant
Whenever human player input is active across any modality (`pointer`, `orbit`, `xr_controller`, or `hand_tracking`), player authority strictly overrides all autonomous AI decisions (`YIELD_TO_HUMAN_CONTROL`).

## 2. Input Modality Wiring (`src/scene/sceneManager.ts` -> `src/App.tsx`)
All interactive input channels toggle `spatialRuntime.setHumanInputActive(active, source)`, which forwards immediately to `agentOrchestrator.notifyHumanInputStart(source)` / `notifyHumanInputEnd()`:
- **Desktop / Mobile Pointer:** Canvas `mousedown` / `touchstart` -> active `'pointer'`; canvas `mouseup`/`touchend` & window `mouseup`/`touchend`/`touchcancel` -> released cleanly.
- **Orbit Camera Controls:** `controls.addEventListener('start')` -> active `'orbit'`; `'end'` -> released.
- **WebXR Tracked Controllers:** Controller `selectstart` -> active `'xr_controller'`; `selectend` / `disconnected` / `sessionend` -> released.
- **WebXR Hand Tracking:** `onSelectCrystal` / `onRotateCrystal` / `onHandPinch` / `onHandGrabCrystal` -> active `'hand_tracking'`; `onHandReleaseCrystal` / `count === 0` / `sessionend` -> released.
- **Unmount Safety:** `spatialRuntime.dispose()` forces `setHumanInputActive(false, ...)` if disposed mid-drag so control locks can never leak.

## 3. Race-Condition Elimination (Epochs + `AbortController`)
To prevent in-flight asynchronous orchestration cycles from applying stale directives after human manipulation begins:
1. `AgentOrchestrator.notifyHumanInputStart(source)`:
   - Increments monotonic `humanInputEpoch`.
   - Sets `humanInputActive = true`.
   - Calls `.abort('HUMAN_INPUT_PRIORITY:...')` on any active `AbortController`.
   - Enqueues a `critical` broadcast message (`HUMAN_CONTROL_PRIORITY_ACTIVE`).
2. `AgentOrchestrator.executeCycleWithTimeout`:
   - Captures `startEpoch = this.humanInputEpoch` at entry and binds a fresh `AbortController` + `AbortSignal`.
   - Listens for `'abort'` to resolve immediately with a safe `YIELD_TO_HUMAN_CONTROL` cycle (`aborted: true`).
   - Verifies `this.humanInputEpoch === startEpoch && !this.humanInputActive && !controller.signal.aborted` upon async settlement; any stale autonomous completion is discarded and never applied.
3. Conflicting Actions Suspended During Active Human Control:
   - Autonomous `GAME_PACING`, `RENDER_ENVIRONMENT`, `PUZZLE_SYSTEM`, and `SPATIAL_ASSISTANCE` directives are suspended (`appliedActions` restricted strictly to `HUMAN_CONTROL_ARBITER` -> `YIELD_TO_HUMAN_CONTROL`).
   - `SpatialIntelligenceAgent.createCoordinationMessages` suppresses predictive targeting hints while `isHumanInputActive` is true.
4. Safe Restoration:
   - `notifyHumanInputEnd()` clears `humanInputActive` without replaying discarded cycles. Future cycles resume normal multi-agent evaluation cleanly.
