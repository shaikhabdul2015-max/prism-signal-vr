# PRISM SIGNAL: BEYOND THE VOID — WEBXR HARDWARE COMPATIBILITY
## Multi-Modal Capability Probing, Fallbacks & Device Honesty Policy

**Module**: `src/spatial/WebXRCompatibilityManager.ts`  
**Reused Infrastructure**: `XRSessionManager` (`src/engines/XRSessionManager.ts`), `FallbackInputController` (`src/webxr/intelligence/FallbackInputController.ts`)  

---

### 1. Capability Detection Matrix

`WebXRCompatibilityManager.detectCapabilities()` safely probes `navigator.xr.isSessionSupported(...)` without throwing in headless/Node/non-XR environments:
- **Session Modes**: `immersive-vr`, `immersive-ar`, `inline`
- **Spatial Features**: `hand-tracking`, `hit-test`, `anchors`, `mesh-detection`
- **Reference Spaces**: `'local-floor'`, `'bounded-floor'`, `'local'`, `'viewer'`

### 2. Graceful Multi-Tier Fallback Strategy

| Environment Capability | Active Mode | Reference Space | Input Controls |
|---|---|---|---|
| WebXR `immersive-vr` / `immersive-ar` | `webxr_native` | `local-floor` (or `local`) | 6DoF Tracked Controllers + optional 25-joint `XRHandSpace` pinch |
| Touchscreen browser (no XR) | `mobile_touch` | `viewer` | Single-finger touch drag rotation & tap selection |
| Standard Desktop browser (no XR) | `desktop_mouse_keyboard` | `viewer` | Mouse OrbitControls, drag-to-rotate, keyboard (`H`, Arrows, `Escape`) |

### 3. Physical Hardware Honesty Policy

PRISM SIGNAL enforces strict truthfulness regarding headset hardware:
- `physicalHardwareCertified` is explicitly set to `false` by software probing.
- No Meta Quest, Apple Vision Pro, or HTC Vive hardware certification is claimed based on browser feature detection or automated unit tests alone; physical certification requires execution on real physical headset hardware.
