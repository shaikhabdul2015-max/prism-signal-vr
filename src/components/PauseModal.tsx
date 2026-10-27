import React from 'react';
import { Play, RotateCcw, Volume2, VolumeX, Shield, Radio } from 'lucide-react';
import { MissionState, CrystalData } from '../types/game';

interface PauseModalProps {
  isOpen: boolean;
  state: MissionState;
  crystals: CrystalData[];
  onResume: () => void;
  onRestart: () => void;
  onToggleAudio: () => void;
  onChangeVolume: (vol: number) => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  state,
  crystals,
  onResume,
  onRestart,
  onToggleAudio,
  onChangeVolume,
}) => {
  if (!isOpen) return null;

  const alignedCount = crystals.filter((c) => c.resonancePercent >= 95).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onResume}
      role="dialog"
      aria-modal="true"
      aria-label="Pause Menu"
    >
      <div
        className="w-full max-w-md bg-slate-950 border border-slate-700 rounded-xl p-6 shadow-2xl text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-5 pb-3 border-b border-slate-800">
          <Shield className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold font-mono tracking-wider text-slate-100 uppercase">
            MISSION SUSPENDED // SYSTEM PAUSE
          </h2>
        </div>

        {/* Telemetry Summary */}
        <div className="space-y-3 mb-6 bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 font-mono text-xs">
          <div className="flex justify-between items-center text-slate-300">
            <span>BEACON CARRIER COHERENCE:</span>
            <span className="font-bold text-cyan-300">{state.totalCoherence}%</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>PRISMS HARMONIZED:</span>
            <span className="font-bold text-emerald-400">{alignedCount} / 3 LOCKED</span>
          </div>
          <div className="flex justify-between items-center text-slate-300">
            <span>ENVIRONMENT SECTOR:</span>
            <span className="text-slate-400">ABYSSAL VOID // SECTOR 9</span>
          </div>
        </div>

        {/* Audio Controls */}
        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1.5">
              {state.audioMuted ? (
                <VolumeX className="w-4 h-4 text-slate-500" />
              ) : (
                <Volume2 className="w-4 h-4 text-cyan-400" />
              )}
              SYNTHESIZER VOLUME
            </span>
            <span>{Math.round(state.audioVolume * 100)}%</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={state.audioVolume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
            />
            <button
              onClick={onToggleAudio}
              className="px-3 min-h-[36px] text-xs font-mono bg-slate-900 border border-slate-700 hover:border-slate-500 rounded-lg text-slate-300 active:scale-95 touch-manipulation"
            >
              {state.audioMuted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>
        </div>

        {/* Actions with min 44px touch targets */}
        <div className="flex flex-col gap-2.5 pt-3 border-t border-slate-800">
          <button
            onClick={onResume}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-bold rounded-xl transition-all text-sm active:scale-95 touch-manipulation"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>RESUME MISSION</span>
          </button>

          <button
            onClick={onRestart}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-red-500/60 text-slate-300 hover:text-red-300 font-mono text-xs rounded-xl transition-all active:scale-95 touch-manipulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART CALIBRATION (RESET)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
