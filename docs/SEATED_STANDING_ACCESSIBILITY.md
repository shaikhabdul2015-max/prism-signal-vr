# SEATED AND STANDING ACCESSIBILITY AUDIT

**Project:** PRISM SIGNAL: BEYOND THE VOID  
**Modules:** `src/scene/xrAccessibility.ts` (`AccessibilityLayoutManager`), `src/scene/crystals.ts`, `src/scene/vrSpatialUI.ts`, `src/scene/handInteraction.ts`, `src/scene/sceneManager.ts`  
**Physical XR Hardware Status:** `NOT_TESTED` (layout math, reference space adaptation, and 3D UI switching verified via automated tests; physical seated/standing headset validation pending).

---

## 1. Adaptive Posture & Reference Space Handling

`AccessibilityLayoutManager` inspects the granted WebXR reference space (`'local-floor'`, `'bounded-floor'`, or `'local'`) and dynamically adapts chamber geometry and spatial UI placement:

| Parameter | Seated Mode (`postureMode: 'seated'`) | Standing Mode (`postureMode: 'standing'`) | Clamped Range |
| --- | --- | --- | --- |
| Reference Eye Height (`local` fallback) | `1.25 m` | `1.65 m` | `[0.90 m, 2.05 m]` |
| Measured HMD Adaptation (`local-floor` / `bounded-floor`) | Live Y tracked (`<= 1.30 m` auto-seated) | Live Y tracked (`>= 1.48 m` auto-standing) | `[0.70 m, 2.20 m]` |
| Crystal Pedestal Elevation (`CrystalsManager.setPedestalElevation`) | `~1.17 m` (at `1.25 m` eye) | `~1.43 m–1.50 m` (at `1.65 m–1.72 m` eye) | `[1.00 m, 1.58 m]` |
| Rig Spawn Offset Z (`seatedRigSpawnPos`) | `5.20 m` | `4.85 m` | Behind Azure pedestal |
| Direct Grab Radius (`directReachRadiusMeters`) | Scaled from `comfortableReachMeters * 2.35` | Scaled from `comfortableReachMeters * 2.35` | `[1.15 m, 1.90 m]` |
| Chamber UI Distance & Height | `~1.82 m` distance, `minY 1.18 m` | `~1.82 m` distance, `minY 1.35 m` | `[1.55 m, 2.15 m]` |
| Wrist Menu Offset | `0.27 m` Y, mirrored to opposite hand | `0.25 m` Y, mirrored to opposite hand | Ergonomic near-head pull |

In `src/scene/sceneManager.ts` `tick()`, XR HMD Y-height shifts `> 0.14 m` (debounced at `>= 500 ms` intervals) dynamically re-evaluate `AccessibilityLayoutManager.updateReferenceSpace(...)` and smoothly damp crystal pedestal heights via `CrystalsManager.setPedestalElevation(...)` without triggering per-frame React re-renders.

## 2. Turning & Orientation Accessibility

Seated and limited-mobility players can orient freely around all three pedestals (Ruby, Azure, Emerald, Console, Void Receiver) using either:
- **Snap-Turn Mode (`turnMode: 'snap'`):** `45 deg` (`Math.PI / 4`) debounced air-swipe turn in empty space, or Wrist Menu `TURN -45` / `TURN +45` buttons.
- **Smooth-Turn Mode (`turnMode: 'smooth'`):** Continuous frame-rate-independent yaw turn (`1.65 rad/s`) via pinch-and-hold lateral displacement beyond a `4 cm` dead-zone, plus Wrist Menu `TURN -22` / `TURN +22` precision step buttons.
- **One-Tap Vantage Focus:** Wrist Menu `CENTER`, `RUBY`, `AZURE`, `EMERALD`, and `CONSOLE` buttons smoothly damp the XR cameraRig directly toward any chamber node.
- **In-VR Controls:** Posture (`SEATED` / `STANDING`), Turn (`SNAP` / `SMOOTH`), Dominant Hand (`LEFT DOM` / `RIGHT DOM`), and `CALIBRATE` are all accessible directly inside the 3D Wrist Menu and Chamber Calibration panel.
