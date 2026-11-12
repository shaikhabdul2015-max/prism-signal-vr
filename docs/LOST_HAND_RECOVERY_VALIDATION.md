# LOST HAND TRACKING RECOVERY VALIDATION

**Project:** PRISM SIGNAL: BEYOND THE VOID  
**Modules:** `src/scene/handInteraction.ts` (`validateHandCoordinates`, `evaluateHandRecoveryTransition`, `createHandTracker`), `src/scene/sceneManager.ts`  
**Physical XR Hardware Status:** `NOT_TESTED` (automated state-machine and coordinate validation suites passed; live headset optical occlusion testing pending physical hardware).

---

## 1. Per-Hand Independent Recovery Architecture

Left (`hands[0]`) and right (`hands[1]`) WebXR `XRHand` streams maintain completely independent `HandRecoverySnapshot` state machines inside `handInteraction.ts`:

- **States:** `'untracked' | 'tracking' | 'occluded_grace' | 'lost' | 'recovering'`
- **Default Timings & Bounds (`DEFAULT_RECOVERY_CONFIG`):**
  - `lossGracePeriodMs`: `180 ms` (bridges brief optical micro-occlusions without dropping crystal control)
  - `prolongedLossThresholdMs`: `500 ms`
  - `recoveryStabilizationFrames`: `3` consecutive clean frames on reacquisition
  - `maxSingleFrameJumpMeters`: `0.48 m`
  - `maxChamberExtentMeters`: `15.0 m`

## 2. Coordinate Integrity & Spike Rejection (`validateHandCoordinates`)

Every frame before applying pinch/grab deltas, `handInteraction.ts` rejects:
1. **Non-finite Coordinates:** `NaN` or `Infinity` in `wrist`, `index-finger-tip`, or `thumb-tip` (`reason: 'non_finite_joint'`).
2. **Degenerate Zero Matrices:** All-zero uninitialized origin coordinates (`reason: 'degenerate_zero_joint'`).
3. **Out-of-Bounds / Stale Projections:** Coordinates beyond the `15.0 m` chamber boundary (`reason: 'out_of_bounds_joint'`).
4. **Unphysical Tracking Spikes:** Single-frame positional jumps exceeding `0.48 m` during normal continuous tracking (`reason: 'tracking_spike_rejected'`), while permitting valid re-anchoring (`allowReanchorJump = true`) when transitioning back from `untracked | occluded_grace | lost`.

## 3. Crystal Preservation & Snap-Free Reacquisition

- **During Brief Occlusion (`occluded_grace`, `< 180 ms`):**
  - Rotation updates are immediately frozen (`shouldFreezeRotation = true`).
  - The held crystal ID (`preservedCrystalId`) and its last valid orientation (`preservedRotationY`) remain intact.
- **On Prolonged Tracking Loss (`lost`, `>= 180 ms`):**
  - Cleanly releases the active pinch hold (`shouldPreserveAndRelease = true`) without throwing errors, terminating the WebXR session, or resetting crystal rotation back to zero.
- **During Multi-Frame Reacquisition (`recovering`, 3 frames):**
  - Resets `smoothedDeltaX = 0`, `lastPinchPos`, and `pinchAnchorPos` to the newly stabilized pinch midpoint (`shouldResetPinchDelta = true`).
  - Suppresses crystal rotation during stabilization frames (`shouldFreezeRotation = true`) so re-entering tracking FOV never induces a sudden angle jump or phantom snap-turn.
  - Increments `recoveryCount` cleanly once stabilized back to `'tracking'`.
