// src/environment/intelligence/EnvironmentEventEngine.ts
import type { CelestialEvent, CelestialEventType } from './types';

export class EnvironmentEventEngine {
  private activeEvents: CelestialEvent[] = [];
  private eventHistory: CelestialEvent[] = [];
  private readonly maxHistory = 20;

  public triggerEvent(
    type: CelestialEventType,
    durationMs = 12000,
    intensity = 0.85
  ): CelestialEvent {
    const eventPresets: Record<CelestialEventType, { color: string; particleMult: number; freq: number; q: number }> = {
      SOLAR_FLARE: { color: '#ff7722', particleMult: 2.2, freq: 88, q: 3.5 },
      COSMIC_ANOMALY: { color: '#9933ff', particleMult: 1.8, freq: 110, q: 4.0 },
      GRAVITATIONAL_PULSE: { color: '#00ddff', particleMult: 1.5, freq: 55, q: 2.5 },
      VOID_TEAR: { color: '#ff0055', particleMult: 2.8, freq: 44, q: 6.0 },
      AURORA_BOREALIS: { color: '#33ffaa', particleMult: 1.2, freq: 147, q: 1.8 },
    };

    const preset = eventPresets[type];
    const event: CelestialEvent = {
      id: `event-${type.toLowerCase()}-${Date.now()}`,
      type,
      startTime: Date.now(),
      durationMs,
      intensity,
      colorHex: preset.color,
      particleVelocityMultiplier: preset.particleMult,
      soundscapeModulation: {
        baseFrequencyHz: preset.freq,
        resonanceQ: preset.q,
      },
    };

    this.activeEvents.push(event);
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    return event;
  }

  public updateActiveEvents(currentTime = Date.now()): void {
    this.activeEvents = this.activeEvents.filter(
      (e) => currentTime - e.startTime < e.durationMs
    );
  }

  public getActiveEvents(currentTime = Date.now()): CelestialEvent[] {
    this.updateActiveEvents(currentTime);
    return [...this.activeEvents];
  }

  public getCurrentAtmosphereModulation(currentTime = Date.now()) {
    this.updateActiveEvents(currentTime);

    if (this.activeEvents.length === 0) {
      return {
        particleMultiplier: 1.0,
        lightTintHex: '#ffffff',
        activeEventCount: 0,
        highestIntensity: 0.0,
      };
    }

    let highestIntensity = 0.0;
    let particleMultiplier = 1.0;
    let dominantColor = '#ffffff';

    for (const evt of this.activeEvents) {
      const elapsed = currentTime - evt.startTime;
      const progress = elapsed / evt.durationMs;
      // Bell-curve intensity envelope: sin(progress * PI)
      const currentIntensity = evt.intensity * Math.sin(progress * Math.PI);

      if (currentIntensity > highestIntensity) {
        highestIntensity = currentIntensity;
        dominantColor = evt.colorHex;
        particleMultiplier = evt.particleVelocityMultiplier;
      }
    }

    return {
      particleMultiplier,
      lightTintHex: dominantColor,
      activeEventCount: this.activeEvents.length,
      highestIntensity: Number(highestIntensity.toFixed(3)),
    };
  }

  public clearAll(): void {
    this.activeEvents = [];
  }
}
