/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Immersive Environment Engine (Phase 29)
 * Configures and manages dynamic 3D environments, scene atmospheres,
 * procedural lighting rigs, and smooth atmospheric transitions.
 * 
 * Provides 5 distinct environment presets:
 * 1. DEEP_SPACE: Infinite cosmic void with starfield clusters and high-contrast lighting.
 * 2. QUANTUM_LABORATORY: Clean, precision scientific chamber with holographic floor grid.
 * 3. NEURAL_INTELLIGENCE_CHAMBER: Violet / magenta synaptic field with pulsing core harmonics.
 * 4. DIGITAL_TWIN_ENVIRONMENT: Authoritative emerald / cyan telemetry mirroring physical chamber.
 * 5. MISSION_SIMULATION_ARENA: Tactical amber grid with boundary telemetry and simulation tagging.
 */

import {
  EnvironmentPresetId,
  ImmersiveEnvironmentConfig,
} from '../types/phase29';

export const IMMERSIVE_PRESETS: Record<EnvironmentPresetId, ImmersiveEnvironmentConfig> = {
  DEEP_SPACE: {
    presetId: 'DEEP_SPACE',
    name: 'Cosmic Deep Space Void',
    description: 'High-contrast spatial vacuum with distant starfield radiance and focused crystal illumination.',
    atmosphere: {
      fogColorHex: '#020617',
      fogDensity: 0.012,
      ambientLightHex: '#0f172a',
      ambientIntensity: 0.35,
      primaryLightHex: '#38bdf8',
      primaryLightIntensity: 1.8,
      primaryLightPosition: [5, 8, 5],
      particleDensity: 200,
      backgroundGradient: ['#020617', '#0f172a'],
    },
    floorGridVisible: true,
    gridColorHex: '#1e293b',
    bloomIntensity: 1.2,
    ambientAudioPreset: 'DEEP_SPACE_DRONE',
    targetCadenceFps: 72,
  },

  QUANTUM_LABORATORY: {
    presetId: 'QUANTUM_LABORATORY',
    name: 'Quantum Calibration Laboratory',
    description: 'Precision analytical cleanroom environment with calibrated cyan illumination and holographic reference grid.',
    atmosphere: {
      fogColorHex: '#042f2e',
      fogDensity: 0.008,
      ambientLightHex: '#0d9488',
      ambientIntensity: 0.65,
      primaryLightHex: '#2dd4bf',
      primaryLightIntensity: 2.2,
      primaryLightPosition: [0, 10, 0],
      particleDensity: 80,
      backgroundGradient: ['#042f2e', '#115e59'],
    },
    floorGridVisible: true,
    gridColorHex: '#14b8a6',
    bloomIntensity: 0.85,
    ambientAudioPreset: 'QUANTUM_HUM',
    targetCadenceFps: 72,
  },

  NEURAL_INTELLIGENCE_CHAMBER: {
    presetId: 'NEURAL_INTELLIGENCE_CHAMBER',
    name: 'Neural Intelligence Chamber',
    description: 'Bioluminescent synaptic chamber with deep purple ambient radiance and pulsing cognitive harmonics.',
    atmosphere: {
      fogColorHex: '#2e1065',
      fogDensity: 0.015,
      ambientLightHex: '#581c87',
      ambientIntensity: 0.55,
      primaryLightHex: '#c084fc',
      primaryLightIntensity: 2.0,
      primaryLightPosition: [-4, 7, 3],
      particleDensity: 320,
      backgroundGradient: ['#2e1065', '#3b0764'],
    },
    floorGridVisible: true,
    gridColorHex: '#9333ea',
    bloomIntensity: 1.5,
    ambientAudioPreset: 'NEURAL_RESONANCE',
    targetCadenceFps: 72,
  },

  DIGITAL_TWIN_ENVIRONMENT: {
    presetId: 'DIGITAL_TWIN_ENVIRONMENT',
    name: 'Digital Twin Synchronized Chamber',
    description: 'Authoritative telemetry environment mirroring physical chamber sensors with emerald kinematic axes.',
    atmosphere: {
      fogColorHex: '#022c22',
      fogDensity: 0.010,
      ambientLightHex: '#064e3b',
      ambientIntensity: 0.50,
      primaryLightHex: '#34d399',
      primaryLightIntensity: 1.9,
      primaryLightPosition: [0, 9, 4],
      particleDensity: 120,
      backgroundGradient: ['#022c22', '#065f46'],
    },
    floorGridVisible: true,
    gridColorHex: '#10b981',
    bloomIntensity: 1.0,
    ambientAudioPreset: 'TWIN_HARMONICS',
    targetCadenceFps: 72,
  },

  MISSION_SIMULATION_ARENA: {
    presetId: 'MISSION_SIMULATION_ARENA',
    name: 'Mission Simulation Tactical Arena',
    description: 'Tactical stress-testing simulation arena with amber perimeter boundaries and telemetry overlay.',
    atmosphere: {
      fogColorHex: '#451a03',
      fogDensity: 0.018,
      ambientLightHex: '#78350f',
      ambientIntensity: 0.60,
      primaryLightHex: '#fbbf24',
      primaryLightIntensity: 2.4,
      primaryLightPosition: [4, 6, -4],
      particleDensity: 180,
      backgroundGradient: ['#451a03', '#713f12'],
    },
    floorGridVisible: true,
    gridColorHex: '#f59e0b',
    bloomIntensity: 1.3,
    ambientAudioPreset: 'TACTICAL_ALARM_AMBIENT',
    targetCadenceFps: 72,
  },
};

export class ImmersiveEnvironmentEngine {
  private static instance: ImmersiveEnvironmentEngine | null = null;
  private currentPresetId: EnvironmentPresetId = 'DEEP_SPACE';
  private customConfig: ImmersiveEnvironmentConfig;
  private transitionProgress = 1.0; // 1.0 = fully transitioned
  private listeners: Set<(config: ImmersiveEnvironmentConfig) => void> = new Set();

  public constructor() {
    this.customConfig = { ...IMMERSIVE_PRESETS.DEEP_SPACE };
  }

  public static getInstance(): ImmersiveEnvironmentEngine {
    if (!ImmersiveEnvironmentEngine.instance) {
      ImmersiveEnvironmentEngine.instance = new ImmersiveEnvironmentEngine();
    }
    return ImmersiveEnvironmentEngine.instance;
  }

  public static resetInstance(): void {
    ImmersiveEnvironmentEngine.instance = null;
  }

  public getActiveConfig(): ImmersiveEnvironmentConfig {
    return { ...this.customConfig };
  }

  public getPresetList(): ImmersiveEnvironmentConfig[] {
    return Object.values(IMMERSIVE_PRESETS);
  }

  public getAllPresets(): ImmersiveEnvironmentConfig[] {
    return this.getPresetList();
  }

  public getCurrentEnvironment(): ImmersiveEnvironmentConfig {
    return this.getActiveConfig();
  }

  public setEnvironment(presetId: EnvironmentPresetId): ImmersiveEnvironmentConfig {
    return this.switchPreset(presetId);
  }

  /**
   * Transitions smoothly to a new environment preset
   */
  public switchPreset(presetId: EnvironmentPresetId): ImmersiveEnvironmentConfig {
    const targetPreset = IMMERSIVE_PRESETS[presetId];
    if (!targetPreset) {
      return this.getActiveConfig();
    }

    this.currentPresetId = presetId;
    this.customConfig = { ...targetPreset };
    this.transitionProgress = 1.0;
    this.notify();
    return this.getActiveConfig();
  }

  /**
   * Updates atmospheric parameters adaptively based on thermal pressure or light level
   */
  public updateAtmosphere(updates: Partial<ImmersiveEnvironmentConfig['atmosphere']>): void {
    this.customConfig.atmosphere = {
      ...this.customConfig.atmosphere,
      ...updates,
    };
    this.notify();
  }

  public subscribe(callback: (config: ImmersiveEnvironmentConfig) => void): () => void {
    this.listeners.add(callback);
    callback(this.getActiveConfig());
    return () => this.listeners.delete(callback);
  }

  private notify(): void {
    const cfg = this.getActiveConfig();
    this.listeners.forEach((cb) => {
      try {
        cb(cfg);
      } catch (err) {
        console.error('Error in ImmersiveEnvironmentEngine subscriber', err);
      }
    });
  }
}

export const immersiveEnvironmentEngine = ImmersiveEnvironmentEngine.getInstance();
