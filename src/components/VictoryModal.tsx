import React, { useEffect } from 'react';
import { Sparkles, Radio, RotateCcw, X } from 'lucide-react';
import { sound } from '../audio/soundEngine';

interface VictoryModalProps {
  isOpen: boolean;
  onContinue: () => void;
  onRestart: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({ isOpen, onContinue, onRestart }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onContinue]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none"
      onClick={onContinue}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="victory-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-950 border-2 border-emerald-500/80 rounded-2xl p-6 md:p-8 shadow-2xl shadow-emerald-950/60 text-center relative overflow-hidden text-slate-100"
      >
        {/* Close Button */}
        <button
          onClick={onContinue}
          aria-label="Close Victory Dialog"
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-900 transition-colors active:scale-95 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/70 border border-emerald-600/70 text-[10px] sm:text-[11px] font-mono text-emerald-300 uppercase tracking-widest mb-3 sm:mb-4">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>PHASE 2 COMPLETE // CIRCUIT LOCKED</span>
        </div>

        <h2 id="victory-modal-title" className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono tracking-tight text-white mb-1.5 sm:mb-2">
          TARGET RECEIVER ACTIVATED
        </h2>
        <div className="text-[11px] sm:text-xs font-mono tracking-widest text-emerald-400 mb-4 sm:mb-5 uppercase">
          LIGHT-BEAM REACHED TARGET THROUGH CRYSTAL ALIGNMENT
        </div>

        {/* Decoded Telemetry Card */}
        <div className="bg-slate-900/80 border border-slate-700 rounded-xl p-3.5 sm:p-4 mb-5 sm:mb-6 text-left font-mono text-xs space-y-2">
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">BEAM CHAIN:</span>
            <span className="text-emerald-300 font-bold truncate ml-2">100% COMPLETE (ALL 3 PRISMS)</span>
          </div>
          <div className="flex justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">HARMONY:</span>
            <span className="text-cyan-300 font-bold">A-MAJOR TRIAD (440+554+659 Hz)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-400">BEACON DECODER:</span>
            <span className="text-purple-300 font-bold ml-2">CIRCUIT LOCKED. CIPHER UNLOCKED.</span>
          </div>
        </div>

        {/* Audio Fanfare Replay Button */}
        <div className="mb-5 sm:mb-6 flex justify-center">
          <button
            onClick={() => sound.playSignalDecodedFanfare()}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-emerald-600/70 rounded-xl text-xs font-mono text-emerald-300 hover:text-emerald-100 transition-colors active:scale-95 touch-manipulation"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>PLAY DECODED HARMONIC AUDIO</span>
          </button>
        </div>

        {/* Action Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3">
          <button
            onClick={onContinue}
            className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs rounded-xl transition-all shadow-lg shadow-emerald-500/25 active:scale-95 touch-manipulation"
          >
            <Sparkles className="w-4 h-4" />
            <span>PROCEED TO ALIEN CIPHER DECODER</span>
          </button>

          <button
            onClick={onRestart}
            className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-xs rounded-xl transition-colors active:scale-95 touch-manipulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>
        </div>
      </div>
    </div>
  );
};
