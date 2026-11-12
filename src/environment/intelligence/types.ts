// src/environment/intelligence/types.ts
/**
 * Types for Stage 6 Intelligent Environment Generation
 */

export type CelestialEventType =
  | 'SOLAR_FLARE'
  | 'COSMIC_ANOMALY'
  | 'GRAVITATIONAL_PULSE'
  | 'VOID_TEAR'
  | 'AURORA_BOREALIS';

export interface CelestialEvent {
  id: string;
  type: CelestialEventType;
  startTime: number;
  durationMs: number;
  intensity: number; // 0.0 to 1.0
  colorHex: string;
  particleVelocityMultiplier: number;
  soundscapeModulation: {
    baseFrequencyHz: number;
    resonanceQ: number;
  };
}

export interface ProceduralEnvironmentVariation {
  seed: number;
  nebulaColorPrimary: string;
  nebulaColorSecondary: string;
  starFieldDensity: number; // 500 to 5000 particles
  voidAtmosphereFogDensity: number;
  crystalPedestalRadius: number; // 2.5m to 4.5m
  ambientAudioRootNote: number; // e.g., 55Hz (A1) or 65.4Hz (C2)
}

export interface SoundscapeState {
  isMuted: boolean;
  masterVolume: number; // 0.0 to 1.0
  droneFrequencyHz: number;
  filterCutoffHz: number;
  resonanceIntensity: number; // 0.0 to 1.0
  activeHarmonicsCount: number;
}
