# HARDWARE VALIDATION PENDING CHECKLIST

**Project:** PRISM SIGNAL: BEYOND THE VOID  
**Date:** 2026-11-11  
**Physical Device Verification Status:** **`NOT_TESTED`**  

---

## 1. Strict Honesty Statement

Although the hands-first WebXR architecture and development-only Virtual WebXR hardware simulation suite (`src/simulation/*`) passed **529/529 automated unit & integration tests across 191 suites**, software emulation does **not** certify physical optical headset behavior. Physical validation on real VR hardware remains explicitly **`NOT_TESTED`**.

---

## 2. Required On-Device Physical Hardware Verification Queue

The following checks require an engineer wearing physical WebXR hardware (e.g., Meta Quest 2 / Quest 3 / Quest Pro / Pico 4 via Meta Quest Browser or Chromium WebXR):

1. **Optical Hand-Tracking Lighting Tolerance:**
   - Validate 25-joint tracking continuity and false-release rate in bright studio light, dim ambient lighting, and strong backlit glare conditions using `HandDiagnosticsModal` (`[D]`).
2. **Real `XRHand` Pinch & Hysteresis Ergonomics:**
   - Verify personalized `GestureCalibrationManager` reach & pinch thresholds (`pinchStartThreshold`, `pinchEndThreshold`) feel natural across left-handed and right-handed testers with real skeletal tracking jitter.
3. **Seated vs Standing Boundary & Reference Spaces:**
   - Verify real Guardian / boundary transitions (`local-floor`, `bounded-floor`, fallback to `local`) and seated recenter behavior inside an active headset session.
4. **HMD Refresh Rate & Thermal/Frame Pacing:**
   - Confirm 72 Hz / 90 Hz steady WebGL stereo render pacing with zero compositor reprojection spikes during beam-lock particle bursts and 3D `CanvasTexture` redraws.
5. **Browser Permission & Session Interruptions:**
   - Validate Meta Quest Browser WebXR `hand-tracking` permission prompts, headset sleep/wake (`visibilitychange`), and physical OS menu interruption/re-entry.
