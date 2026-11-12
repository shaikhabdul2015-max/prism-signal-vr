/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 21: Digital Twin Engine.
 * Manages VR chamber state representation, real-time object mirroring
 * (Ruby Core, Azure Array, Emerald Core, Beam, Target), state versioning,
 * historical snapshots, and synchronization integrity validation.
 */

import { VRTelemetry } from '../types/diagnostics';
import { CrystalData, PuzzleProgressState } from '../types/game';
import {
  VRObjectDigitalTwin,
  EnvironmentalDigitalTwinState,
  DigitalTwinSnapshot,
} from '../types/phase21';
import { dbService } from '../services/firebaseDbService';

export class DigitalTwinEngine {
  private static instance: DigitalTwinEngine | null = null;
  private currentVersion = 1;
  private currentSnapshot: DigitalTwinSnapshot;
  private snapshotHistory: DigitalTwinSnapshot[] = [];
  private listeners: Set<(snapshot: DigitalTwinSnapshot) => void> = new Set();

  private constructor() {
    this.currentSnapshot = this.buildInitialSnapshot();
    this.snapshotHistory.push(this.currentSnapshot);
  }

  public static getInstance(): DigitalTwinEngine {
    if (!DigitalTwinEngine.instance) {
      DigitalTwinEngine.instance = new DigitalTwinEngine();
    }
    return DigitalTwinEngine.instance;
  }

  public static resetInstance(): void {
    DigitalTwinEngine.instance = null;
  }

  private buildInitialSnapshot(): DigitalTwinSnapshot {
    const now = new Date().toISOString();
    const objects: Record<string, VRObjectDigitalTwin> = {
      ruby: {
        id: 'ruby',
        name: 'Ruby Harmonic Core',
        nodeType: 'core_crystal',
        position: [3.64, 1.25, -2.1],
        rotationYRad: 0.85,
        rotationYDeg: Math.round((0.85 * 180) / Math.PI),
        targetRotationYRad: 2.1,
        isAligned: false,
        resonancePercent: 20,
        isReceivingLight: true,
        isReflectingToTarget: false,
        colorHex: '#ef4444',
        frequencyHz: 440.0,
        healthScore: 98,
        lastUpdated: now,
      },
      azure: {
        id: 'azure',
        name: 'Azure Resonance Array',
        nodeType: 'reflector_array',
        position: [0, 1.25, 4.2],
        rotationYRad: 1.15,
        rotationYDeg: Math.round((1.15 * 180) / Math.PI),
        targetRotationYRad: 4.19,
        isAligned: false,
        resonancePercent: 15,
        isReceivingLight: false,
        isReflectingToTarget: false,
        colorHex: '#06b6d4',
        frequencyHz: 659.25,
        healthScore: 96,
        lastUpdated: now,
      },
      emerald: {
        id: 'emerald',
        name: 'Emerald Viridian Prismatic',
        nodeType: 'focus_prism',
        position: [-3.64, 1.25, -2.1],
        rotationYRad: 2.45,
        rotationYDeg: Math.round((2.45 * 180) / Math.PI),
        targetRotationYRad: 0.0,
        isAligned: false,
        resonancePercent: 10,
        isReceivingLight: false,
        isReflectingToTarget: false,
        colorHex: '#10b981',
        frequencyHz: 554.37,
        healthScore: 97,
        lastUpdated: now,
      },
      console_emitter: {
        id: 'console_emitter',
        name: 'Harmonic Beam Emitter',
        nodeType: 'beam_emitter',
        position: [0, 1.45, 0],
        rotationYRad: 0,
        rotationYDeg: 0,
        targetRotationYRad: 0,
        isAligned: true,
        resonancePercent: 100,
        isReceivingLight: false,
        isReflectingToTarget: true,
        colorHex: '#a855f7',
        frequencyHz: 528.0,
        healthScore: 100,
        lastUpdated: now,
      },
      target_receiver: {
        id: 'target_receiver',
        name: 'Target Perimeter Spire Receiver',
        nodeType: 'target_receiver',
        position: [0, 1.6, -5.8],
        rotationYRad: 0,
        rotationYDeg: 0,
        targetRotationYRad: 0,
        isAligned: false,
        resonancePercent: 0,
        isReceivingLight: false,
        isReflectingToTarget: false,
        colorHex: '#ec4899',
        frequencyHz: 852.0,
        healthScore: 100,
        lastUpdated: now,
      },
    };

    const environment: EnvironmentalDigitalTwinState = {
      preset: 'bright_studio',
      ambientLux: 450,
      glareFactor: 0.05,
      visibilityFactor: 0.98,
      fogDensity: 0.015,
      lightBeamCoherence: 20,
      isTargetHit: false,
    };

    const checksum = this.calculateChecksum(1, now, objects);

    return {
      snapshotId: `twin-snap-1`,
      version: 1,
      timestamp: now,
      checksum,
      provenance: 'Simulation',
      objects,
      environment,
      tracking: {
        activeHands: 2,
        trackedJoints: 25,
        expectedJoints: 25,
        meanConfidence: 0.95,
        stability: 'Optimal',
      },
      cadence: {
        currentFps: 72,
        targetFps: 72,
        frameDeltaMs: 13.88,
        droppedFramesLastSec: 0,
      },
      systemHealthScore: 98,
      syncIntegrity: {
        synchronized: true,
        driftMs: 0,
        lastSyncTime: now,
      },
    };
  }

  private calculateChecksum(version: number, timestamp: string, objects: Record<string, VRObjectDigitalTwin>): string {
    const raw = `${version}:${timestamp}:${Object.keys(objects).sort().join(',')}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (hash << 5) - hash + raw.charCodeAt(i);
      hash |= 0;
    }
    return `TWIN-${Math.abs(hash).toString(16).padStart(8, '0')}`;
  }

  public getSnapshot(): DigitalTwinSnapshot {
    return { ...this.currentSnapshot };
  }

  public getSnapshotHistory(): DigitalTwinSnapshot[] {
    return [...this.snapshotHistory];
  }

  public subscribe(callback: (snapshot: DigitalTwinSnapshot) => void): () => void {
    this.listeners.add(callback);
    callback(this.getSnapshot());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const snap = this.getSnapshot();
    this.listeners.forEach((cb) => {
      try {
        cb(snap);
      } catch (err) {
        console.error('[DigitalTwinEngine] Listener error:', err);
      }
    });
  }

  /**
   * Synchronizes digital twin state with live VR puzzle crystals and telemetry.
   */
  public synchronizeState(
    telemetry: VRTelemetry,
    crystals?: CrystalData[],
    puzzleProgress?: PuzzleProgressState,
    isPhysicalHardware: boolean = false
  ): DigitalTwinSnapshot {
    this.currentVersion += 1;
    const now = new Date().toISOString();
    const updatedObjects = { ...this.currentSnapshot.objects };

    // Update Crystal Node states if provided
    if (crystals && Array.isArray(crystals)) {
      crystals.forEach((c) => {
        if (updatedObjects[c.id]) {
          const deg = Math.round((c.rotationY * 180) / Math.PI);
          updatedObjects[c.id] = {
            ...updatedObjects[c.id],
            rotationYRad: c.rotationY,
            rotationYDeg: deg < 0 ? deg + 360 : deg,
            isAligned: c.isAligned,
            resonancePercent: c.resonancePercent,
            isReceivingLight: c.isReceivingLight,
            isReflectingToTarget: c.isReflectingToTarget,
            lastUpdated: now,
          };
        }
      });
    }

    // Update Target Spire receiver if progress given
    if (puzzleProgress && updatedObjects.target_receiver) {
      updatedObjects.target_receiver = {
        ...updatedObjects.target_receiver,
        isReceivingLight: puzzleProgress.isTargetReceiverHit,
        resonancePercent: puzzleProgress.isTargetReceiverHit ? 100 : 0,
        lastUpdated: now,
      };
    }

    // Telemetry Cadence Extraction
    const frames = telemetry.frames || [];
    const frameDelta = frames[0]?.frameDurationMs || 13.88;
    const currentFps = Math.round(1000 / frameDelta);
    const droppedCount = frames.filter((f) => f.dropped).length;

    // Joint tracking extraction
    const joints = telemetry.joints || [];
    const trackedJoints = joints.filter((j) => j.tracked);
    const meanConfidence =
      trackedJoints.length > 0
        ? trackedJoints.reduce((sum, j) => sum + (j.confidence || 0), 0) / trackedJoints.length
        : 0;

    let stability: 'Optimal' | 'Degraded' | 'Occluded' | 'Lost' = 'Optimal';
    if (trackedJoints.length === 0) stability = 'Lost';
    else if (trackedJoints.length < 18) stability = 'Occluded';
    else if (meanConfidence < 0.75) stability = 'Degraded';

    // Synchronize Environment
    const envPreset = telemetry.lightingPreset || 'bright_studio';
    const lux = envPreset === 'bright_studio' ? 500 : envPreset === 'low_light' ? 80 : 1200;
    const glare = envPreset === 'backlit_glare' ? 0.85 : 0.05;

    // Drift calculation
    const telTime = telemetry.autoSavedAt ? new Date(telemetry.autoSavedAt).getTime() : Date.now();
    const driftMs = Math.abs(Date.now() - telTime);

    // Overall Health Score
    let healthScore = 100;
    if (droppedCount > 0) healthScore -= droppedCount * 8;
    if (trackedJoints.length < 25) healthScore -= (25 - trackedJoints.length) * 3;
    if (meanConfidence < 0.8) healthScore -= 15;
    healthScore = Math.max(10, Math.min(100, Math.round(healthScore)));

    const checksum = this.calculateChecksum(this.currentVersion, now, updatedObjects);

    const snapshot: DigitalTwinSnapshot = {
      snapshotId: `twin-snap-${this.currentVersion}`,
      version: this.currentVersion,
      timestamp: now,
      checksum,
      provenance: isPhysicalHardware ? 'Physical Hardware' : 'Simulation',
      objects: updatedObjects,
      environment: {
        preset: envPreset,
        ambientLux: lux,
        glareFactor: glare,
        visibilityFactor: Math.max(0.1, 1.0 - glare * 0.4),
        fogDensity: 0.015,
        lightBeamCoherence: puzzleProgress?.overallProgressPercent || 25,
        isTargetHit: puzzleProgress?.isTargetReceiverHit || false,
      },
      tracking: {
        activeHands: trackedJoints.length > 0 ? 2 : 0,
        trackedJoints: trackedJoints.length,
        expectedJoints: telemetry.expectedJointCount || 25,
        meanConfidence: Math.round(meanConfidence * 100) / 100,
        stability,
      },
      cadence: {
        currentFps,
        targetFps: 72,
        frameDeltaMs: Math.round(frameDelta * 100) / 100,
        droppedFramesLastSec: droppedCount,
      },
      systemHealthScore: healthScore,
      syncIntegrity: {
        synchronized: driftMs < 2000,
        driftMs,
        lastSyncTime: now,
      },
    };

    this.currentSnapshot = snapshot;
    this.snapshotHistory.unshift(snapshot);
    if (this.snapshotHistory.length > 50) {
      this.snapshotHistory.pop();
    }

    this.notify();

    // Persist snapshot to db service asynchronously
    dbService.saveTelemetry(telemetry).catch(() => {});

    return snapshot;
  }
}

export const digitalTwinEngine = DigitalTwinEngine.getInstance();
