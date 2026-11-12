// src/spatial/WebXRCompatibilityManager.ts
import { XRSessionManager } from '../engines/XRSessionManager';
import type { SpatialCoordinateSpace, WebXRCapabilityMatrix } from './types';

export class WebXRCompatibilityManager {
  private readonly sessionManager: XRSessionManager;
  private lastMatrix: WebXRCapabilityMatrix | null = null;

  constructor(sessionManager?: XRSessionManager) {
    this.sessionManager = sessionManager || XRSessionManager.getInstance();
  }

  /**
   * Probes real browser WebXR capabilities (`immersive-vr`, `immersive-ar`, `inline`,
   * optional features, and reference spaces) and resolves graceful fallbacks.
   * NEVER fabricates physical Meta Quest, Apple Vision Pro, or HTC Vive certifications.
   */
  public async detectCapabilities(): Promise<WebXRCapabilityMatrix> {
    const notes: string[] = [];
    const xr = typeof navigator !== 'undefined' ? (navigator as any).xr : undefined;
    const hasTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0));

    if (!xr || typeof xr.isSessionSupported !== 'function') {
      const fallbackMode = hasTouch ? 'mobile_touch' : 'desktop_mouse_keyboard';
      notes.push('navigator.xr API unavailable in current runtime; desktop/touch fallback active.');
      notes.push('Physical WebXR hardware certification requires live headset testing.');

      const matrix: WebXRCapabilityMatrix = {
        timestamp: Date.now(),
        isWebXRAvailable: false,
        immersiveVR: false,
        immersiveAR: false,
        inlineSession: false,
        handTracking: false,
        hitTest: false,
        anchors: false,
        meshDetection: false,
        supportedReferenceSpaces: [],
        activeInputFallback: fallbackMode,
        physicalHardwareCertified: false,
        detectionNotes: notes,
      };
      this.lastMatrix = matrix;
      return matrix;
    }

    const safeCheck = async (mode: string): Promise<boolean> => {
      try {
        return Boolean(await xr.isSessionSupported(mode));
      } catch {
        return false;
      }
    };

    const [immersiveVR, immersiveAR, inlineSession] = await Promise.all([
      safeCheck('immersive-vr'),
      safeCheck('immersive-ar'),
      safeCheck('inline'),
    ]);

    await this.sessionManager.probeBrowserXRSupport();
    const baseCaps = this.sessionManager.getCapabilities();
    const hasXRHandInterface = typeof XRHand !== 'undefined';

    // Optional spatial features (verified strictly during an active session; conservative detection prior to grant)
    const handTracking = Boolean(baseCaps.handTrackingSupported || (immersiveVR && hasXRHandInterface));
    const hitTest = immersiveAR; // Hit-test generally paired with AR if granted
    const anchors = false; // Requires active XRSession grant
    const meshDetection = false; // Requires active XRSession + explicit permission

    const supportedReferenceSpaces: SpatialCoordinateSpace[] = [];
    if (immersiveVR || immersiveAR) {
      supportedReferenceSpaces.push('local-floor', 'bounded-floor', 'local', 'viewer');
    } else if (inlineSession) {
      supportedReferenceSpaces.push('viewer', 'local');
    }

    const activeInputFallback: WebXRCapabilityMatrix['activeInputFallback'] =
      immersiveVR || immersiveAR
        ? 'webxr_native'
        : hasTouch
        ? 'mobile_touch'
        : 'desktop_mouse_keyboard';

    notes.push(
      `WebXR API detected (immersive-vr=${immersiveVR}, immersive-ar=${immersiveAR}, inline=${inlineSession}, XRHand=${hasXRHandInterface}).`
    );
    notes.push('Physical headset certification remains FALSE until executed on real physical VR/AR hardware.');

    const matrix: WebXRCapabilityMatrix = {
      timestamp: Date.now(),
      isWebXRAvailable: true,
      immersiveVR,
      immersiveAR,
      inlineSession,
      handTracking,
      hitTest,
      anchors,
      meshDetection,
      supportedReferenceSpaces,
      activeInputFallback,
      physicalHardwareCertified: false,
      detectionNotes: notes,
    };

    this.lastMatrix = matrix;
    return matrix;
  }

  public getLastDetectedMatrix(): WebXRCapabilityMatrix | null {
    return this.lastMatrix ? { ...this.lastMatrix } : null;
  }

  public getFallbackStrategy(matrix: WebXRCapabilityMatrix): {
    mode: WebXRCapabilityMatrix['activeInputFallback'];
    recommendedReferenceSpace: SpatialCoordinateSpace;
    controlsSummary: string;
  } {
    if (matrix.immersiveVR || matrix.immersiveAR) {
      return {
        mode: 'webxr_native',
        recommendedReferenceSpace: matrix.supportedReferenceSpaces.includes('local-floor')
          ? 'local-floor'
          : 'local',
        controlsSummary: '6DoF tracked controllers + optional XRHandSpace 25-joint pinch tracking.',
      };
    }

    if (matrix.activeInputFallback === 'mobile_touch') {
      return {
        mode: 'mobile_touch',
        recommendedReferenceSpace: 'viewer',
        controlsSummary: 'Single-finger touch drag rotation & tap object selection.',
      };
    }

    return {
      mode: 'desktop_mouse_keyboard',
      recommendedReferenceSpace: 'viewer',
      controlsSummary: 'Mouse OrbitControls + pointer drag rotation + keyboard shortcuts (H, Arrows, Escape).',
    };
  }
}
