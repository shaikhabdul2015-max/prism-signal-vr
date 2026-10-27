import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Compass, Target, Zap, BookOpen } from 'lucide-react';

interface TutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TutorialModal: React.FC<TutorialModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

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

  const steps = [
    {
      title: 'CONSOLE LIGHT SOURCE & PRIMARY BEAM',
      icon: <Zap className="w-6 h-6 text-red-400" />,
      content:
        'The central holographic console emits an energetic collimated light beam directed towards the primary deflector: the Ruby Crystal. You can toggle the console light source at any time via the BEAM button or by clicking the emitter tip in 3D.',
      tip: 'The light beam begins at the central console emitter and strikes the Ruby Core facet first.',
    },
    {
      title: 'ROTATE CRYSTALS TO REDIRECT REFLECTIONS',
      icon: <Compass className="w-6 h-6 text-cyan-400" />,
      content:
        'Click or tap any crystal in 3D or select it from the bottom matrix. Rotate the crystal using the HUD slider, stepper buttons, or touch controls. When properly angled, the crystal refracts and reflects the light beam toward the next node: Ruby ➔ Azure ➔ Emerald.',
      tip: 'Watch the reflected beam path in real-time. If misaligned, the beam sweeps into deep space so you can see where to aim.',
    },
    {
      title: 'ILLUMINATE THE TARGET RECEIVER',
      icon: <Target className="w-6 h-6 text-emerald-400" />,
      content:
        'On the north perimeter of the chamber sits the ancient Target Receiver. Rotate the final Emerald prism until its reflected beam hits the target receiver dish. Once the complete 4-segment circuit is established, the target receiver powers up and fires the beacon to space!',
      tip: 'Use the "RECEIVER" or "FOCUS" camera buttons to inspect alignment angles closely. Click RESET anytime to restart the puzzle.',
    },
    {
      title: 'ALIEN CIPHER DECODER & HISTORICAL ARCHIVE',
      icon: <BookOpen className="w-6 h-6 text-purple-400" />,
      content:
        'When the target receiver locks, the alien transmission unlocks the Holographic Decoder. Inspect the chamber pedestals to read sequential cipher runes (I through IV), arrange the 4 alien glyph tiles in the exact transmission sequence, and transmit to unlock the complete Aethelgard civilization historical archive.',
      tip: 'Follow the optical beam pathway: Node-Alpha (Ruby) ➔ Node-Beta (Azure) ➔ Node-Gamma (Emerald) ➔ Target Spire.',
    },
  ];

  const current = steps[step];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="tutorial-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-slate-950 border border-cyan-800 rounded-xl p-5 md:p-6 shadow-2xl shadow-cyan-950/60 text-slate-200 relative"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Briefing Dialog"
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-100 rounded-lg hover:bg-slate-900 transition-colors active:scale-95 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4 pr-10 sm:pr-0">
          <div className="p-2.5 bg-slate-900 border border-slate-700 rounded-lg shrink-0">
            {current.icon}
          </div>
          <div>
            <div className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
              MISSION BRIEFING // STEP {step + 1} OF {steps.length}
            </div>
            <h3 id="tutorial-modal-title" className="text-sm sm:text-base font-bold text-slate-100 font-sans">
              {current.title}
            </h3>
          </div>
        </div>

        {/* Step Content */}
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-4">
          {current.content}
        </p>

        {/* Tip Box */}
        <div className="p-3 bg-cyan-950/30 border border-cyan-900/60 rounded-lg mb-5 sm:mb-6">
          <div className="text-[11px] font-mono text-cyan-300 font-medium">
            <span className="text-cyan-400 font-bold uppercase mr-1.5">[TACTICAL DIRECTIVE]:</span>
            {current.tip}
          </div>
        </div>

        {/* Pagination Dots & Navigation */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? 'w-6 bg-cyan-400' : 'w-2 bg-slate-700'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center justify-center gap-1 min-h-[44px] px-3.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-mono text-slate-300 transition-colors active:scale-95 touch-manipulation"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>PREV</span>
              </button>
            )}

            {step < steps.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                className="flex items-center justify-center gap-1 min-h-[44px] px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg text-xs font-mono font-semibold text-white transition-colors active:scale-95 touch-manipulation"
              >
                <span>NEXT</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onClose}
                className="min-h-[44px] px-5 py-2 bg-cyan-500 hover:bg-cyan-400 rounded-lg text-xs font-mono font-bold text-slate-950 transition-colors active:scale-95 touch-manipulation"
              >
                CLOSE BRIEFING
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
