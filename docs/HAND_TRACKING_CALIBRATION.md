# HAND TRACKING CALIBRATION ARCHITECTURE & VALIDATION

**Project:** PRISM SIGNAL: BEYOND THE VOID  
**Modules:** `src/scene/xrAccessibility.ts` (`GestureCalibrationManager`), `src/scene/vrSpatialUI.ts`, `src/scene/handInteraction.ts`, `src/scene/sceneManager.ts`  
**Physical XR Hardware Status:** `NOT_TESTED` (automated unit/integration simulation passed; live optical headset calibration requires physical WebXR hardware).

---

## 1. Capability Detection & Session Lifecycle

When an `immersive-vr` WebXR session starts (`renderer.xr.addEventListener('sessionstart')` in `src/scene/sceneManager.ts`), `GestureCalibrationManager.detectCapabilitiesFromSession(...)` inspects:
- `session.enabledFeatures` for `'hand-tracking'`
- Active `session.inputSources` containing a non-null `.hand` (`XRHand`) object for `'left'` and `'right'` handedness
- Granted WebXR reference space (`local-floor`, `bounded-floor`, or `local`) and floor-level awareness (`hasFloorLevel`)

Calibration automatically enters `'in_progress'` (`step: 'comfort_reach'`) without blocking scene rendering or locking out the UI.

## 2. Calibration Pipeline

1. **Step 1 — `comfort_reach` (15% → 70% progress):**
   - Collects `8` finite valid hand-to-head reach samples in the physiological `[0.15m, 1.3m]` envelope (originating near `headPosition.y - 0.18m`).
   - Simultaneously captures relaxed finger aperture distance samples (`> 0.03m`) to establish baseline open-hand separation.
2. **Step 2 — `pinch_confirm` (70% → 100% progress):**
   - Prompts the user to pinch index tip and thumb tip `3` times with either hand.
   - Automatically identifies the pinching hand as `dominantHand` (`'left'` or `'right'`) and assigns the wrist/palm UI console to the opposite hand (`wristMenuHand: dominantHand === 'left' ? 'right' : 'left'`).
3. **Personalized Threshold Derivation:**
   - Computes median values across clean samples and derives clamped scalar thresholds:
     - `comfortableReachMeters`: `[0.35m, 0.95m]`
     - `pinchStartThreshold`: `[0.020m, 0.033m]` (22% interpolation from engaged to relaxed aperture)
     - `pinchEndThreshold`: `[0.034m, 0.055m]` (minimum `+0.014m` hysteresis gap above `pinchStartThreshold`)
     - `rotationSensitivity`: scaled inversely with reach scale (`[2.8, 5.5]`)
     - `airSwipeThresholdMeters`: scaled proportionally with reach scale (`[0.09m, 0.22m]`)
   - Pushes derived tuning live to `handTracker.setInteractionTuning(...)`, `AccessibilityLayoutManager.syncCalibrationReach(...)`, `crystals.setPedestalElevation(...)`, and `vrSpatialUI.syncState(...)`.

## 3. Visual Feedback, Left/Right-Handed Support & Mid-Game Recalibration

- **3D Chamber Calibration Overlay (`src/scene/vrSpatialUI.ts`):**
  - Renders whenever `calibrationState.status === 'in_progress' | 'interrupted_fallback'` — including during mid-game recalibration (`phase === 'playing'`).
  - Displays live step instructions, measured reach (`m`), pinch aperture (`cm`), XRHand readiness badge, visual progress bar (`0%–100%`), dominant-hand toggle (`HAND: LEFT / RIGHT`), posture toggle (`SEATED / STANDING`), turn-mode toggle (`SNAP / SMOOTH`), `LOCK PROFILE`, `USE DEFAULTS / SKIP`, and `CANCEL`.
- **Mid-Game Recalibration:**
  - Triggerable at any moment via the wrist/palm menu `CALIBRATE` button (`START_CALIBRATION`) or programmatically via `SceneController.startCalibration()`.

## 4. Interruption, Cancellation & Biometric Privacy Hygiene

- **Tracking Interruption Fallback:** If zero tracked hands are visible for `>2.5s` during calibration, status transitions safely to `'interrupted_fallback'` with safe default thresholds (`DEFAULT_CALIBRATION_PROFILE`) remaining active.
- **Session End / Cancellation:** Cancelling (`CANCEL_CALIBRATION`) or exiting VR closes the calibration overlay cleanly without trapping gameplay.
- **Privacy Guarantee:** Ephemeral sample buffers (`reachSamples`, `relaxedPinchSamples`, `engagedPinchSamples`) are cleared immediately upon completion, skip, cancel, or interruption (`clearEphemeralSamples()`). `exportPrivacySafeConfig()` contains strictly scalar interaction tuning numbers and booleans—zero raw skeletal joint coordinates, bone lengths, or persistent localStorage biometric logs are written.
