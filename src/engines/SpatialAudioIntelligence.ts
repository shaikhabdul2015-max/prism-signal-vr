/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Spatial Audio Intelligence Engine (Phase 29)
 * Manages 3D positional audio sources, distance-based attenuation,
 * and procedural harmonic synthesis for WebXR realities.
 * 
 * STRICT COMPLIANCE:
 * - Uses browser Web Audio API with safe suspended state initialization
 * - Never autoplays audio without an explicit user interaction gesture
 * - Provides graceful mathematical fallback when Web Audio is restricted or unavailable
 */

import {
  SpatialAudioSource,
  Vector3Tuple,
  EnvironmentPresetId,
} from '../types/phase29';

export class SpatialAudioIntelligence {
  private static instance: SpatialAudioIntelligence | null = null;
  private audioContext: AudioContext | null = null;
  private _isAudioUnlocked = false;
  private listenerPosition: Vector3Tuple = [0, 1.6, 0];
  private sources: Map<string, SpatialAudioSource> = new Map();

  public constructor() {
    this.registerChamberAudioSources();
  }

  public static getInstance(): SpatialAudioIntelligence {
    if (!SpatialAudioIntelligence.instance) {
      SpatialAudioIntelligence.instance = new SpatialAudioIntelligence();
    }
    return SpatialAudioIntelligence.instance;
  }

  public static resetInstance(): void {
    SpatialAudioIntelligence.instance = null;
  }

  private registerChamberAudioSources(): void {
    const defaultSources: SpatialAudioSource[] = [
      {
        id: 'ruby-emitter',
        name: 'Ruby Crystal Resonator (440Hz)',
        position: [3.64, 1.25, -2.1],
        refDistance: 1.0,
        maxDistance: 12.0,
        rolloffFactor: 1.5,
        volume: 1.0,
        isPlaying: true,
        isSynthesized: true,
      },
      {
        id: 'audio-ruby-harmonic',
        name: 'Ruby Crystal Resonator (440Hz)',
        position: [3.64, 1.25, -2.1],
        refDistance: 1.0,
        maxDistance: 12.0,
        rolloffFactor: 1.5,
        volume: 1.0,
        isPlaying: true,
        isSynthesized: true,
      },
      {
        id: 'azure-array',
        name: 'Azure Harmonic Array (659Hz)',
        position: [0, 1.25, 4.2],
        refDistance: 1.0,
        maxDistance: 12.0,
        rolloffFactor: 1.5,
        volume: 0.8,
        isPlaying: true,
        isSynthesized: true,
      },
      {
        id: 'emerald-core',
        name: 'Emerald Core Station (523Hz)',
        position: [-3.64, 1.25, -2.1],
        refDistance: 1.0,
        maxDistance: 12.0,
        rolloffFactor: 1.5,
        volume: 0.8,
        isPlaying: true,
        isSynthesized: true,
      },
    ];

    defaultSources.forEach((src) => this.sources.set(src.id, src));
  }

  /**
   * Safe user gesture unlock for browser Web Audio
   */
  public async unlockAudio(): Promise<boolean> {
    try {
      if (typeof window === 'undefined') return false;

      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return false;

      if (!this.audioContext) {
        this.audioContext = new AudioContextClass();
      }

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this._isAudioUnlocked = this.audioContext.state === 'running';
      return this._isAudioUnlocked;
    } catch {
      this._isAudioUnlocked = false;
      return false;
    }
  }

  /**
   * Updates listener (HMD head) position in 3D world space
   */
  public updateListenerPosition(position: Vector3Tuple): void {
    this.listenerPosition = [...position];

    if (this.audioContext && this.audioContext.listener) {
      const listener = this.audioContext.listener;
      if (listener.positionX) {
        listener.positionX.setValueAtTime(position[0], this.audioContext.currentTime);
        listener.positionY.setValueAtTime(position[1], this.audioContext.currentTime);
        listener.positionZ.setValueAtTime(position[2], this.audioContext.currentTime);
      } else {
        listener.setPosition(position[0], position[1], position[2]);
      }
    }
  }

  /**
   * Calculates distance-attenuated perceived volume for a spatial audio source
   */
  public calculateAttenuatedVolume(sourceId: string): number {
    const src = this.sources.get(sourceId);
    if (!src) return 0;

    const dx = this.listenerPosition[0] - src.position[0];
    const dy = this.listenerPosition[1] - src.position[1];
    const dz = this.listenerPosition[2] - src.position[2];
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (distance <= src.refDistance) {
      return src.volume;
    }

    if (distance >= src.maxDistance) {
      return 0.02; // Ambient minimum
    }

    // Inverse distance attenuation model
    const attenuation =
      src.refDistance /
      (src.refDistance + src.rolloffFactor * (distance - src.refDistance));

    return Number(Math.max(0.02, Math.min(1.0, src.volume * attenuation)).toFixed(3));
  }

  /**
   * Synthesizes an audible harmonic ping when spatial alignment occurs
   */
  public playHarmonicAlignmentPulse(frequencyHz: number = 523.25): void {
    if (!this._isAudioUnlocked || !this.audioContext || this.audioContext.state !== 'running') {
      return; // Graceful silent fallback
    }

    try {
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(frequencyHz, this.audioContext.currentTime);

      gain.gain.setValueAtTime(0.2, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.6);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.65);
    } catch {
      // Audio fallback
    }
  }

  public getAllSources(): SpatialAudioSource[] {
    return Array.from(this.sources.values());
  }

  public getSource(sourceId: string): SpatialAudioSource | undefined {
    return this.sources.get(sourceId);
  }

  public calculatePerceivedVolume(sourceId: string, listenerPos?: Vector3Tuple): number {
    if (listenerPos) {
      this.updateListenerPosition(listenerPos);
    }
    return this.calculateAttenuatedVolume(sourceId);
  }

  public isUnlocked(): boolean {
    return this._isAudioUnlocked;
  }

  public isAudioUnlocked(): boolean {
    return this.isUnlocked();
  }
}

export const spatialAudioIntelligence = SpatialAudioIntelligence.getInstance();
