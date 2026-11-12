/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Real-Time Sensor Intelligence Engine (Phase 30)
 * Responsible for:
 * - Browser sensor capability discovery (Orientation, Motion, WebXR, Performance)
 * - Sensor initialization with explicit user-granted permissions
 * - Event normalization and timestamp synchronization
 * - Missing data and staleness detection
 * - Sensor lifecycle management (listener registration and cleanup)
 * - Strict provenance tiering (REAL_DEVICE_TELEMETRY, BROWSER_TELEMETRY, SIMULATED_TELEMETRY)
 */

import {
  SensorType,
  SensorCapabilityRecord,
  RawSensorReading,
  NormalizedSensorTelemetry,
  OrientationData,
  MotionData,
  XRTrackingData,
  BrowserPerformanceData,
  SensorProvenanceTier,
  SensorPrivacySettings,
} from '../types/phase30';
import { VRTelemetry } from '../types/diagnostics';
import { xrSessionManager } from './XRSessionManager';

export class RealTimeSensorIntelligenceEngine {
  private static instance: RealTimeSensorIntelligenceEngine | null = null;
  private capabilities: Map<SensorType, SensorCapabilityRecord> = new Map();
  private latestReadings: Map<SensorType, RawSensorReading> = new Map();
  private isCollecting = false;
  private privacySettings: SensorPrivacySettings;
  private orientationListener: ((e: DeviceOrientationEvent) => void) | null = null;
  private motionListener: ((e: DeviceMotionEvent) => void) | null = null;
  private subscribers: Set<(telemetry: NormalizedSensorTelemetry) => void> = new Set();
  private lastNormalizedTelemetry: NormalizedSensorTelemetry | null = null;
  private lastFrameTimestamp = 0;
  private currentCalculatedFps = 72;

  public constructor() {
    this.privacySettings = {
      isCollectionEnabled: true,
      allowedSensors: {
        DEVICE_ORIENTATION: true,
        DEVICE_MOTION: true,
        WEBXR_TRACKING: true,
        XR_CONTROLLER: true,
        BROWSER_PERFORMANCE: true,
        APPLICATION_TELEMETRY: true,
      },
      dataRetentionSeconds: 300,
      anonymizeReadings: false,
      telemetryTransmissionAllowed: false,
    };

    this.discoverCapabilities();
  }

  public static getInstance(): RealTimeSensorIntelligenceEngine {
    if (!RealTimeSensorIntelligenceEngine.instance) {
      RealTimeSensorIntelligenceEngine.instance = new RealTimeSensorIntelligenceEngine();
    }
    return RealTimeSensorIntelligenceEngine.instance;
  }

  public static resetInstance(): void {
    if (RealTimeSensorIntelligenceEngine.instance) {
      RealTimeSensorIntelligenceEngine.instance.stopCollection();
    }
    RealTimeSensorIntelligenceEngine.instance = null;
  }

  /**
   * Discovers supported sensor APIs in the current browser/runtime environment
   */
  public discoverCapabilities(): SensorCapabilityRecord[] {
    const hasWindow = typeof window !== 'undefined';

    // 1. Device Orientation
    const hasOrientation = hasWindow && 'DeviceOrientationEvent' in window;
    const reqPermOrientation = hasOrientation && typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function';
    this.capabilities.set('DEVICE_ORIENTATION', {
      sensorType: 'DEVICE_ORIENTATION',
      isSupported: Boolean(hasOrientation),
      permissionState: reqPermOrientation ? 'prompt' : hasOrientation ? 'granted' : 'unsupported',
      hardwareName: hasOrientation ? 'Device Orientation API (IMU / Gyroscope)' : undefined,
      samplingRateHz: 60,
      lastCheckedTimestamp: Date.now(),
    });

    // 2. Device Motion
    const hasMotion = hasWindow && 'DeviceMotionEvent' in window;
    const reqPermMotion = hasMotion && typeof (window as any).DeviceMotionEvent?.requestPermission === 'function';
    this.capabilities.set('DEVICE_MOTION', {
      sensorType: 'DEVICE_MOTION',
      isSupported: Boolean(hasMotion),
      permissionState: reqPermMotion ? 'prompt' : hasMotion ? 'granted' : 'unsupported',
      hardwareName: hasMotion ? 'Device Accelerometer & Gyroscope API' : undefined,
      samplingRateHz: 60,
      lastCheckedTimestamp: Date.now(),
    });

    // 3. WebXR Tracking
    const xrCaps = xrSessionManager.getCapabilities();
    this.capabilities.set('WEBXR_TRACKING', {
      sensorType: 'WEBXR_TRACKING',
      isSupported: xrCaps.isWebXRAvailable,
      permissionState: xrCaps.isWebXRAvailable ? (xrCaps.sessionState === 'ACTIVE' ? 'granted' : 'prompt') : 'unsupported',
      hardwareName: xrCaps.detectedHeadsetBrand || (xrCaps.isWebXRAvailable ? 'WebXR Device API' : undefined),
      samplingRateHz: xrCaps.maxRefreshRateHz || 72,
      lastCheckedTimestamp: Date.now(),
    });

    // 4. XR Controller Input
    this.capabilities.set('XR_CONTROLLER', {
      sensorType: 'XR_CONTROLLER',
      isSupported: xrCaps.isWebXRAvailable && xrCaps.availableControllersCount > 0,
      permissionState: xrCaps.sessionState === 'ACTIVE' ? 'granted' : 'prompt',
      hardwareName: 'WebXR 6-DoF Spatial Controllers',
      samplingRateHz: xrCaps.maxRefreshRateHz || 72,
      lastCheckedTimestamp: Date.now(),
    });

    // 5. Browser Performance Telemetry
    const hasPerf = typeof performance !== 'undefined';
    this.capabilities.set('BROWSER_PERFORMANCE', {
      sensorType: 'BROWSER_PERFORMANCE',
      isSupported: hasPerf,
      permissionState: 'not_required',
      hardwareName: 'W3C High-Resolution Performance API',
      samplingRateHz: 60,
      lastCheckedTimestamp: Date.now(),
    });

    // 6. Application Telemetry
    this.capabilities.set('APPLICATION_TELEMETRY', {
      sensorType: 'APPLICATION_TELEMETRY',
      isSupported: true,
      permissionState: 'not_required',
      hardwareName: 'PRISM SIGNAL Diagnostic Pipeline',
      samplingRateHz: 60,
      lastCheckedTimestamp: Date.now(),
    });

    return Array.from(this.capabilities.values());
  }

  public getCapability(sensorType: SensorType): SensorCapabilityRecord | undefined {
    return this.capabilities.get(sensorType);
  }

  public getAllCapabilities(): SensorCapabilityRecord[] {
    return Array.from(this.capabilities.values());
  }

  /**
   * Explicitly requests sensor permissions where required (e.g., iOS Safari)
   */
  public async requestSensorPermission(sensorType: SensorType): Promise<boolean> {
    if (typeof window === 'undefined') return false;

    if (sensorType === 'DEVICE_ORIENTATION' && typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function') {
      try {
        const response = await (window as any).DeviceOrientationEvent.requestPermission();
        const granted = response === 'granted';
        const cap = this.capabilities.get('DEVICE_ORIENTATION');
        if (cap) {
          cap.permissionState = granted ? 'granted' : 'denied';
          this.capabilities.set('DEVICE_ORIENTATION', cap);
        }
        return granted;
      } catch {
        return false;
      }
    }

    if (sensorType === 'DEVICE_MOTION' && typeof (window as any).DeviceMotionEvent?.requestPermission === 'function') {
      try {
        const response = await (window as any).DeviceMotionEvent.requestPermission();
        const granted = response === 'granted';
        const cap = this.capabilities.get('DEVICE_MOTION');
        if (cap) {
          cap.permissionState = granted ? 'granted' : 'denied';
          this.capabilities.set('DEVICE_MOTION', cap);
        }
        return granted;
      } catch {
        return false;
      }
    }

    // Default: not required or supported
    return this.capabilities.get(sensorType)?.isSupported ?? false;
  }

  /**
   * Starts real-time collection of supported sensors
   */
  public startCollection(): boolean {
    if (this.isCollecting) return true;
    if (!this.privacySettings.isCollectionEnabled) return false;

    this.isCollecting = true;

    if (typeof window !== 'undefined') {
      // 1. Orientation Listener
      if (this.privacySettings.allowedSensors.DEVICE_ORIENTATION && 'DeviceOrientationEvent' in window) {
        this.orientationListener = (event: DeviceOrientationEvent) => {
          this.handleOrientationEvent(event);
        };
        try {
          window.addEventListener('deviceorientation', this.orientationListener, { passive: true });
        } catch {
          // Fallback if passive not supported
          window.addEventListener('deviceorientation', this.orientationListener);
        }
      }

      // 2. Motion Listener
      if (this.privacySettings.allowedSensors.DEVICE_MOTION && 'DeviceMotionEvent' in window) {
        this.motionListener = (event: DeviceMotionEvent) => {
          this.handleMotionEvent(event);
        };
        try {
          window.addEventListener('devicemotion', this.motionListener, { passive: true });
        } catch {
          window.addEventListener('devicemotion', this.motionListener);
        }
      }
    }

    return true;
  }

  /**
   * Stops real-time collection and unbinds browser event listeners
   */
  public stopCollection(): void {
    this.isCollecting = false;

    if (typeof window !== 'undefined') {
      if (this.orientationListener) {
        window.removeEventListener('deviceorientation', this.orientationListener);
        this.orientationListener = null;
      }
      if (this.motionListener) {
        window.removeEventListener('devicemotion', this.motionListener);
        this.motionListener = null;
      }
    }
  }

  public isRunning(): boolean {
    return this.isCollecting;
  }

  public handleOrientationEvent(event: DeviceOrientationEvent): void {
    if (event.alpha === null && event.beta === null && event.gamma === null) return;

    const alpha = event.alpha ?? 0;
    const beta = event.beta ?? 0;
    const gamma = event.gamma ?? 0;

    // Data validation
    if (isNaN(alpha) || isNaN(beta) || isNaN(gamma)) return;

    this.latestReadings.set('DEVICE_ORIENTATION', {
      sensorType: 'DEVICE_ORIENTATION',
      timestampMs: Date.now(),
      values: {
        alpha,
        beta,
        gamma,
        absolute: Boolean(event.absolute),
      },
      confidence: 0.95,
      provenance: 'REAL_DEVICE_TELEMETRY',
    });

    this.triggerNormalizedUpdate();
  }

  public handleMotionEvent(event: DeviceMotionEvent): void {
    const acc = event.acceleration;
    const accG = event.accelerationIncludingGravity;
    const rot = event.rotationRate;

    if (!acc && !accG && !rot) return;

    const ax = acc?.x ?? 0;
    const ay = acc?.y ?? 0;
    const az = acc?.z ?? 0;

    if (isNaN(ax) || isNaN(ay) || isNaN(az)) return;

    this.latestReadings.set('DEVICE_MOTION', {
      sensorType: 'DEVICE_MOTION',
      timestampMs: Date.now(),
      values: {
        ax,
        ay,
        az,
        intervalMs: event.interval ?? 16.6,
      },
      confidence: 0.92,
      provenance: 'REAL_DEVICE_TELEMETRY',
    });

    this.triggerNormalizedUpdate();
  }

  /**
   * Ingests application / WebXR diagnostic telemetry
   */
  public ingestTelemetry(telemetry: VRTelemetry, isPhysicalVRActive: boolean = false): NormalizedSensorTelemetry {
    const now = Date.now();
    let currentFps = 72;
    let currentDelta = 13.88;

    if (telemetry.frames.length > 0) {
      const avgDuration =
        telemetry.frames.reduce((a, f) => a + (f.frameDurationMs ?? 0), 0) / telemetry.frames.length;
      currentFps = avgDuration > 0 ? 1000 / avgDuration : 72;
      currentDelta = avgDuration;
    }

    const trackedJoints = (telemetry.joints || []).filter((j) => j.tracked).length;
    const trackingLost = trackedJoints < (telemetry.expectedJointCount || 25) * 0.4;

    const provenance: SensorProvenanceTier = isPhysicalVRActive
      ? 'REAL_DEVICE_TELEMETRY'
      : telemetry.sessionId.includes('simulation')
      ? 'SIMULATED_TELEMETRY'
      : 'BROWSER_TELEMETRY';

    this.latestReadings.set('APPLICATION_TELEMETRY', {
      sensorType: 'APPLICATION_TELEMETRY',
      timestampMs: now,
      values: {
        fps: Math.round(currentFps),
        frameDeltaMs: Number(currentDelta.toFixed(2)),
        trackedJoints,
        trackingLost,
      },
      confidence: 0.98,
      provenance,
    });

    return this.normalizeLatestTelemetry(provenance);
  }

  /**
   * Normalizes available sensor readings into a unified model
   */
  public normalizeLatestTelemetry(
    defaultProvenance: SensorProvenanceTier = 'BROWSER_TELEMETRY'
  ): NormalizedSensorTelemetry {
    const now = Date.now();
    const orientationReading = this.latestReadings.get('DEVICE_ORIENTATION');
    const motionReading = this.latestReadings.get('DEVICE_MOTION');
    const appReading = this.latestReadings.get('APPLICATION_TELEMETRY');

    let orientation: OrientationData | undefined = undefined;
    if (orientationReading && now - orientationReading.timestampMs < 3000) {
      orientation = {
        alpha: Number(orientationReading.values.alpha ?? 0),
        beta: Number(orientationReading.values.beta ?? 0),
        gamma: Number(orientationReading.values.gamma ?? 0),
        absolute: Boolean(orientationReading.values.absolute),
      };
    }

    let motion: MotionData | undefined = undefined;
    if (motionReading && now - motionReading.timestampMs < 3000) {
      motion = {
        acceleration: [
          Number(motionReading.values.ax ?? 0),
          Number(motionReading.values.ay ?? 0),
          Number(motionReading.values.az ?? 0),
        ],
        intervalMs: Number(motionReading.values.intervalMs ?? 16.6),
      };
    }

    let performanceData: BrowserPerformanceData | undefined = undefined;
    let xrTracking: XRTrackingData | undefined = undefined;

    if (appReading) {
      performanceData = {
        fps: Number(appReading.values.fps ?? 72),
        frameDeltaMs: Number(appReading.values.frameDeltaMs ?? 13.88),
      };
      xrTracking = {
        headPosition: [0, 1.6, 0],
        headRotation: orientation ? [orientation.beta, orientation.gamma, orientation.alpha] : [0, 0, 0],
        trackedJointsCount: Number(appReading.values.trackedJoints ?? 25),
        isTrackingLost: Boolean(appReading.values.trackingLost),
      };
    } else {
      performanceData = {
        fps: this.currentCalculatedFps,
        frameDeltaMs: 1000 / this.currentCalculatedFps,
      };
    }

    let provenance = defaultProvenance;
    if (orientationReading?.provenance === 'REAL_DEVICE_TELEMETRY' || motionReading?.provenance === 'REAL_DEVICE_TELEMETRY') {
      provenance = 'REAL_DEVICE_TELEMETRY';
    }

    // Determine confidence score based on available and fresh sensors
    let confidence = 0.5;
    if (orientation) confidence += 0.2;
    if (motion) confidence += 0.15;
    if (performanceData) confidence += 0.15;

    const normalized: NormalizedSensorTelemetry = {
      timestampMs: now,
      orientation,
      motion,
      xrTracking,
      performance: performanceData,
      confidenceScore: Math.min(1.0, Number(confidence.toFixed(2))),
      isStale: !orientationReading && !motionReading && !appReading,
      provenance,
    };

    this.lastNormalizedTelemetry = normalized;
    return normalized;
  }

  private triggerNormalizedUpdate(): void {
    const normalized = this.normalizeLatestTelemetry();
    this.subscribers.forEach((cb) => {
      try {
        cb(normalized);
      } catch (err) {
        console.error('[RealTimeSensorIntelligenceEngine] Subscriber callback error:', err);
      }
    });
  }

  public getLatestTelemetry(): NormalizedSensorTelemetry {
    return this.lastNormalizedTelemetry || this.normalizeLatestTelemetry();
  }

  public getRawReading(sensorType: SensorType): RawSensorReading | undefined {
    return this.latestReadings.get(sensorType);
  }

  public getAllRawReadings(): RawSensorReading[] {
    return Array.from(this.latestReadings.values());
  }

  public subscribe(callback: (telemetry: NormalizedSensorTelemetry) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getLatestTelemetry());
    return () => this.subscribers.delete(callback);
  }

  public getPrivacySettings(): SensorPrivacySettings {
    return { ...this.privacySettings };
  }

  public updatePrivacySettings(updates: Partial<SensorPrivacySettings>): SensorPrivacySettings {
    this.privacySettings = {
      ...this.privacySettings,
      ...updates,
      allowedSensors: {
        ...this.privacySettings.allowedSensors,
        ...(updates.allowedSensors || {}),
      },
    };

    if (!this.privacySettings.isCollectionEnabled) {
      this.stopCollection();
    }

    return this.getPrivacySettings();
  }
}

export const realTimeSensorIntelligenceEngine = RealTimeSensorIntelligenceEngine.getInstance();
