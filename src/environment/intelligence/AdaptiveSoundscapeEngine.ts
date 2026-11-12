// src/environment/intelligence/AdaptiveSoundscapeEngine.ts
import type { SoundscapeState } from './types';

export class AdaptiveSoundscapeEngine {
  private state: SoundscapeState;
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  private droneOsc: OscillatorNode | null = null;

  constructor() {
    this.state = {
      isMuted: false,
      masterVolume: 0.7,
      droneFrequencyHz: 55.0, // A1
      filterCutoffHz: 350.0,
      resonanceIntensity: 0.3,
      activeHarmonicsCount: 1,
    };
  }

  public getState(): SoundscapeState {
    return { ...this.state };
  }

  public initializeAudioContext(): boolean {
    if (typeof window === 'undefined') return false;
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return false;

    try {
      this.audioCtx = new AudioContextClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.state.isMuted ? 0 : this.state.masterVolume, this.audioCtx.currentTime);

      this.filterNode = this.audioCtx.createBiquadFilter();
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.setValueAtTime(this.state.filterCutoffHz, this.audioCtx.currentTime);
      this.filterNode.Q.setValueAtTime(2.0, this.audioCtx.currentTime);

      this.droneOsc = this.audioCtx.createOscillator();
      this.droneOsc.type = 'sawtooth';
      this.droneOsc.frequency.setValueAtTime(this.state.droneFrequencyHz, this.audioCtx.currentTime);

      this.droneOsc.connect(this.filterNode);
      this.filterNode.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);
      this.droneOsc.start();
      return true;
    } catch {
      return false;
    }
  }

  public modulateForGameState(coherencePercent: number, frustrationIndex: number): SoundscapeState {
    // As coherence builds: open up filter cutoff and increase harmonic presence
    const cutoff = 250 + (coherencePercent / 100) * 1200;
    // As frustration rises: lower resonance to create a more soothing, softer drone
    const resonance = frustrationIndex > 0.6 ? 0.15 : 0.4 + (coherencePercent / 100) * 0.4;
    const harmonics = Math.min(4, 1 + Math.floor(coherencePercent / 25));

    this.state.filterCutoffHz = Number(cutoff.toFixed(1));
    this.state.resonanceIntensity = Number(resonance.toFixed(2));
    this.state.activeHarmonicsCount = harmonics;

    if (this.filterNode && this.audioCtx) {
      this.filterNode.frequency.setTargetAtTime(cutoff, this.audioCtx.currentTime, 0.2);
      this.filterNode.Q.setTargetAtTime(resonance * 5, this.audioCtx.currentTime, 0.2);
    }

    return this.getState();
  }

  public setVolume(volume: number): void {
    this.state.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.masterGain && this.audioCtx) {
      const vol = this.state.isMuted ? 0 : this.state.masterVolume;
      this.masterGain.gain.setTargetAtTime(vol, this.audioCtx.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this.state.isMuted = !this.state.isMuted;
    this.setVolume(this.state.masterVolume);
    return this.state.isMuted;
  }

  public dispose(): void {
    if (this.droneOsc) {
      try {
        this.droneOsc.stop();
        this.droneOsc.disconnect();
      } catch {
        // Ignored
      }
      this.droneOsc = null;
    }
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
      this.audioCtx = null;
    }
  }
}
