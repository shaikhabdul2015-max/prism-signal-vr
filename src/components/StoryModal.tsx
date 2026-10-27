import React, { useState, useEffect } from 'react';
import { Sparkles, Radio, RotateCcw, Eye, X, BookOpen, ChevronRight, ChevronLeft, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { CIVILIZATION_STORY } from '../puzzle/puzzleEngine';
import { sound } from '../audio/soundEngine';

interface StoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestartMission: () => void;
}

export const StoryModal: React.FC<StoryModalProps> = ({ isOpen, onClose, onRestartMission }) => {
  const [activeChapter, setActiveChapter] = useState(0);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentChapter = CIVILIZATION_STORY.chapters[activeChapter];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-none"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="story-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl bg-slate-950 border-2 border-emerald-500/80 rounded-2xl p-5 md:p-7 shadow-2xl shadow-emerald-950/60 text-slate-100 relative overflow-hidden flex flex-col max-h-[92vh]"
      >
        
        {/* Top ambient glow line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-cyan-400 to-emerald-400" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-mono tracking-widest text-emerald-400 uppercase font-bold">
                MISSION COMPLETE // DEEP TRANSMISSION ARCHIVE
              </div>
              <h2 id="story-modal-title" className="text-base md:text-lg font-extrabold font-mono text-white">
                {CIVILIZATION_STORY.title}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline px-2.5 py-1 bg-emerald-950/80 border border-emerald-600/60 rounded-full text-[10px] font-mono text-emerald-300 font-bold">
              ARCHIVE 100% UNLOCKED
            </span>
            <button
              onClick={onClose}
              aria-label="Close Story Archive"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-900 transition-colors active:scale-95 touch-manipulation"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Story Content */}
        <div className="overflow-y-auto pr-1 space-y-4 my-1 flex-1">
          {/* Metadata Card */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 font-mono text-xs space-y-1.5">
            <div className="flex justify-between text-slate-400">
              <span>CIVILIZATION:</span>
              <span className="text-cyan-300 font-bold">{CIVILIZATION_STORY.civilizationName}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>RECORDING EPOCH:</span>
              <span className="text-slate-200">{CIVILIZATION_STORY.epoch}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>ORIGIN COORDINATES:</span>
              <span className="text-purple-300 font-bold">{CIVILIZATION_STORY.originCoordinates}</span>
            </div>
          </div>

          {/* Civilization Briefing Summary */}
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-sans italic border-l-2 border-cyan-500 pl-3 py-1 bg-cyan-950/20 rounded-r">
            "{CIVILIZATION_STORY.summary}"
          </p>

          {/* Interactive Chapter Reader */}
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-cyan-300">
                {currentChapter.heading}
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                CHAPTER {activeChapter + 1} OF {CIVILIZATION_STORY.chapters.length}
              </span>
            </div>

            <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans whitespace-pre-line">
              {currentChapter.body}
            </p>

            {/* Chapter Stepper Buttons */}
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
              <button
                disabled={activeChapter === 0}
                onClick={() => {
                  setActiveChapter((c) => Math.max(0, c - 1));
                  sound.playUIClick();
                }}
                className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${
                  activeChapter === 0
                    ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>PREV ENTRY</span>
              </button>

              <div className="flex items-center gap-1.5">
                {CIVILIZATION_STORY.chapters.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveChapter(i);
                      sound.playUIClick();
                    }}
                    className={`h-2 rounded-full transition-all ${
                      i === activeChapter ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700 hover:bg-slate-600'
                    }`}
                  />
                ))}
              </div>

              <button
                disabled={activeChapter === CIVILIZATION_STORY.chapters.length - 1}
                onClick={() => {
                  setActiveChapter((c) => Math.min(CIVILIZATION_STORY.chapters.length - 1, c + 1));
                  sound.playUIClick();
                }}
                className={`flex items-center gap-1 text-xs font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${
                  activeChapter === CIVILIZATION_STORY.chapters.length - 1
                    ? 'border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 bg-slate-900 text-slate-300 hover:text-white'
                }`}
              >
                <span>NEXT ENTRY</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mission Success Badges */}
          <div className="grid grid-cols-3 gap-2 text-center font-mono text-[10px] pt-1">
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="font-bold text-slate-200">PHASE 1</span>
              <span className="text-slate-400">CHAMBER ALIGNED</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="font-bold text-slate-200">PHASE 2</span>
              <span className="text-slate-400">BEAM TARGETED</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-1" />
              <span className="font-bold text-slate-200">PHASE 3</span>
              <span className="text-slate-400">CIPHER DECODED</span>
            </div>
          </div>
        </div>

        {/* Footer Actions with min 44px touch targets */}
        <div className="pt-3 mt-2 border-t border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            onClick={() => sound.playSignalDecodedFanfare()}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-xl text-xs font-mono text-emerald-300 transition-colors active:scale-95 touch-manipulation"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>PLAY AUDIO LOG</span>
          </button>

          <button
            onClick={onClose}
            className="min-h-[44px] flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/25 transition-all active:scale-95 touch-manipulation"
          >
            <Eye className="w-4 h-4" />
            <span>CONTINUE OBSERVATION</span>
          </button>

          <button
            onClick={onRestartMission}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-red-500/70 text-slate-300 hover:text-red-300 font-mono text-xs rounded-xl transition-colors active:scale-95 touch-manipulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>RESTART</span>
          </button>
        </div>

      </div>
    </div>
  );
};
