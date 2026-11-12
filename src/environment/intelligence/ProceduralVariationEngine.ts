// src/environment/intelligence/ProceduralVariationEngine.ts
import type { ProceduralEnvironmentVariation } from './types';

export class ProceduralVariationEngine {
  private currentVariation: ProceduralEnvironmentVariation;

  constructor(seed = 42) {
    this.currentVariation = this.generateVariation(seed);
  }

  public getVariation(): ProceduralEnvironmentVariation {
    return { ...this.currentVariation };
  }

  public generateVariation(seed: number): ProceduralEnvironmentVariation {
    // Pseudorandom generator using mulberry32
    let s = seed;
    const random = () => {
      let t = (s += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };

    const palettes = [
      { primary: '#0a0026', secondary: '#480066' }, // Deep Void Violet
      { primary: '#001a33', secondary: '#005580' }, // Quantum Cyan Azure
      { primary: '#1a001a', secondary: '#800040' }, // Crimson Nebula
      { primary: '#00261a', secondary: '#006644' }, // Emerald Aurora
    ];

    const chosenPalette = palettes[Math.floor(random() * palettes.length)];
    const starFieldDensity = Math.floor(1000 + random() * 3000);
    const voidAtmosphereFogDensity = Number((0.012 + random() * 0.015).toFixed(4));
    const crystalPedestalRadius = Number((3.0 + random() * 1.5).toFixed(2));
    const rootNotes = [55.0, 65.41, 73.42, 82.41, 98.0]; // A1, C2, D2, E2, G2
    const ambientAudioRootNote = rootNotes[Math.floor(random() * rootNotes.length)];

    this.currentVariation = {
      seed,
      nebulaColorPrimary: chosenPalette.primary,
      nebulaColorSecondary: chosenPalette.secondary,
      starFieldDensity,
      voidAtmosphereFogDensity,
      crystalPedestalRadius,
      ambientAudioRootNote,
    };

    return this.getVariation();
  }
}
