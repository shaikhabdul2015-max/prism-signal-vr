import React from 'react';
import { ChevronDown, ChevronUp, RotateCw, RotateCcw, Focus, RefreshCw, Target, Zap } from 'lucide-react';
import { CrystalData, CrystalId, PuzzleProgressState } from '../types/game';

interface BottomDockProps {
  crystals: CrystalData[];
  selectedId: CrystalId | null;
  puzzleProgress: PuzzleProgressState;
  onSelectCrystal: (id: CrystalId) => void;
  onRotateSelected: (deltaDeg: number) => void;
  onSetRotationAngle: (deg: number) => void;
  onFocusCrystal: () => void;
  onFocusTarget: () => void;
  onResetOrientation: () => void;
  onResetPuzzle: () => void;
  onToggleBeamSource: () => void;
  onOpenDecoder?: () => void;
  isDecoderUnlocked?: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const BottomDock: React.FC<BottomDockProps> = ({
  crystals,
  selectedId,
  puzzleProgress,
  onSelectCrystal,
  onRotateSelected,
  onSetRotationAngle,
  onFocusCrystal,
  onFocusTarget,
  onResetOrientation,
  onResetPuzzle,
  onToggleBeamSource,
  onOpenDecoder,
  isDecoderUnlocked,
  isCollapsed,
  onToggleCollapse,
}) => {
  const selectedCrystal = crystals.find((c) => c.id === selectedId) || crystals[0];
  const currentAngleDeg = Math.round(((selectedCrystal.rotationY * 180) / Math.PI) % 360);
  const normalizedDeg = currentAngleDeg < 0 ? currentAngleDeg + 360 : currentAngleDeg;

  const targetNodeName =
    selectedCrystal.id === 'ruby'
      ? 'AZURE PRISM'
      : selectedCrystal.id === 'azure'
      ? 'EMERALD PRISM'
      : 'TARGET RECEIVER';

  return (
    <div
      className={`fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 z-20 w-[96vw] max-w-[920px] transition-transform duration-300 ease-out ${
        isCollapsed ? 'translate-y-[calc(100%-38px)]' : 'translate-y-0'
      }`}
    >
      {/* Collapse/Expand Toggle Tab & Phase 3 Decoder Switch */}
      <div className="flex items-center justify-center gap-2 mb-1">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-1.5 px-4 py-1.5 min-h-[36px] bg-slate-950/90 border border-cyan-800/70 rounded-t-lg text-[11px] font-mono uppercase tracking-wider text-cyan-300 hover:text-cyan-100 hover:border-cyan-500 transition-colors shadow-md active:scale-95 touch-manipulation"
        >
          {isCollapsed ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>EXPAND PRISM CONTROLS</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>MINIMIZE HUD</span>
            </>
          )}
        </button>

        {isDecoderUnlocked && onOpenDecoder && (
          <button
            onClick={onOpenDecoder}
            className="flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] bg-purple-950/90 border border-purple-600/80 rounded-t-lg text-[11px] font-mono uppercase tracking-wider text-purple-300 hover:text-purple-100 hover:border-purple-400 transition-colors shadow-md active:scale-95 touch-manipulation"
          >
            <span>⟁ ALIEN DECODER</span>
          </button>
        )}
      </div>

      {/* Main Unified Control Dock */}
      <div className="bg-slate-950/95 border border-cyan-900/70 rounded-xl p-2.5 sm:p-3 md:p-4 shadow-2xl shadow-cyan-950/40 text-slate-200 max-h-[54vh] sm:max-h-none overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 sm:gap-3 md:gap-4 items-center">

          {/* Section 1: Crystal Selection Matrix (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-1.5">
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest flex justify-between">
              <span>PRISM MATRIX // SELECT NODE</span>
              <span className="text-cyan-400">TAP IN 3D OR SELECT</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5 sm:gap-2">
              {crystals.map((c) => {
                const isSelected = c.id === selectedId;
                const isPowered = c.isReceivingLight;
                const isReflecting = c.isReflectingToTarget;

                return (
                  <button
                    key={c.id}
                    onClick={() => onSelectCrystal(c.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-left relative overflow-hidden min-h-[50px] sm:min-h-[56px] active:scale-95 touch-manipulation ${
                      isSelected
                        ? 'border-cyan-400 bg-cyan-950/50 shadow-inner ring-1 ring-cyan-400/50'
                        : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 w-full justify-between">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: c.hexColor }}
                        />
                        <span className="text-[10px] sm:text-[11px] font-mono uppercase font-bold text-slate-300">
                          {c.id}
                        </span>
                      </div>
                      {isPowered && (
                        <div className="w-2 h-2 rounded-full bg-cyan-400 shadow-sm shadow-cyan-400 shrink-0" title="Receiving Light" />
                      )}
                    </div>

                    <div className="w-full mt-1 sm:mt-1.5 flex items-center justify-between text-[9px] sm:text-[10px] font-mono">
                      <span className={isPowered ? 'text-cyan-300 font-semibold' : 'text-slate-500'}>
                        {isPowered ? 'LIT' : 'UNLIT'}
                      </span>
                      <span
                        className={`font-semibold ${
                          isReflecting ? 'text-emerald-400 font-bold' : 'text-slate-400'
                        }`}
                      >
                        {isReflecting ? 'LOCKED' : `${c.resonancePercent}%`}
                      </span>
                    </div>

                    {/* Resonance Progress bar */}
                    <div className="w-full h-1 bg-slate-800 rounded-full mt-1 overflow-hidden">
                      <div
                        className={`h-full ${
                          isReflecting ? 'bg-emerald-400' : isPowered ? 'bg-cyan-500' : 'bg-slate-700'
                        }`}
                        style={{ width: `${c.resonancePercent}%` }}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Precision Angular Tuning & Reflection (5 cols) */}
          <div className="md:col-span-5 flex flex-col gap-1.5 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-4">
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-widest">
              <span>AIM PRISM REFLECTION</span>
              <span className="font-bold text-cyan-300 font-mono text-xs">
                {normalizedDeg}° / 360°
              </span>
            </div>

            {/* Slider & Fine Stepper Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              <button
                onClick={() => onRotateSelected(-15)}
                aria-label="Rotate Selected Prism -15 Degrees Counter-Clockwise"
                title="Rotate -15° Counter-Clockwise"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-lg text-slate-300 transition-colors active:scale-90 touch-manipulation shrink-0"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="relative w-full flex items-center py-1">
                <input
                  type="range"
                  min="0"
                  max="360"
                  step="2"
                  aria-label={`Prism Angle Slider for ${selectedCrystal.name}`}
                  aria-valuenow={normalizedDeg}
                  aria-valuemin={0}
                  aria-valuemax={360}
                  aria-valuetext={`${normalizedDeg} degrees`}
                  value={normalizedDeg}
                  onChange={(e) => onSetRotationAngle(parseFloat(e.target.value))}
                  className="w-full h-3 sm:h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 touch-manipulation"
                />
              </div>

              <button
                onClick={() => onRotateSelected(15)}
                aria-label="Rotate Selected Prism +15 Degrees Clockwise"
                title="Rotate +15° Clockwise"
                className="min-w-[44px] min-h-[44px] flex items-center justify-center bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-lg text-slate-300 transition-colors active:scale-90 touch-manipulation shrink-0"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Target Alignment Status Feedback (Non-Color Dependent Text Badges) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] sm:text-[11px] font-mono text-slate-400 gap-1">
              <span className="truncate">
                AIMING TOWARDS:{' '}
                <span className="text-cyan-300 font-semibold">{targetNodeName}</span>
                <span className="text-slate-500 ml-1.5">
                  [IDEAL: {Math.round((selectedCrystal.targetRotationY * 180) / Math.PI) % 360}°]
                </span>
              </span>

              <span
                className={`font-semibold px-1.5 py-0.5 rounded text-[10px] w-fit shrink-0 ${
                  selectedCrystal.isReflectingToTarget
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/70'
                    : selectedCrystal.isReceivingLight
                    ? 'bg-amber-950/80 text-amber-300 border border-amber-600/70'
                    : 'bg-slate-900 text-slate-500 border border-slate-800'
                }`}
              >
                {selectedCrystal.isReflectingToTarget
                  ? '[✓ BEAM LOCKED]'
                  : selectedCrystal.isReceivingLight
                  ? '[✕ MISALIGNED]'
                  : '[⊘ AWAITING LIGHT]'}
              </span>
            </div>
          </div>

          {/* Section 3: Action Buttons (2 cols) */}
          <div className="md:col-span-2 flex md:flex-col gap-1.5 sm:gap-2 border-t md:border-t-0 md:border-l border-slate-800 pt-2 md:pt-0 md:pl-3 justify-center">
            {/* Focus Camera on Selected Node */}
            <button
              onClick={onFocusCrystal}
              title="Focus Camera on Selected Prism"
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 rounded-lg text-xs font-mono text-slate-300 transition-colors active:scale-95 touch-manipulation"
            >
              <Focus className="w-4 h-4 text-cyan-400" />
              <span className="text-[11px]">FOCUS</span>
            </button>

            {/* Focus Camera on Target Receiver */}
            <button
              onClick={onFocusTarget}
              title="Focus Camera on Target Receiver Spire"
              className="flex-1 flex items-center justify-center gap-1.5 min-h-[44px] py-2 px-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-emerald-500 rounded-lg text-xs font-mono text-slate-300 transition-colors active:scale-95 touch-manipulation"
            >
              <Target className="w-4 h-4 text-emerald-400" />
              <span className="text-[11px]">RECEIVER</span>
            </button>

            {/* Reset Orientation Button */}
            <button
              onClick={onResetOrientation}
              title="Reset Prism to 0° Heading"
              className="hidden md:flex items-center justify-center gap-1.5 py-1 px-2 text-[10px] font-mono text-slate-400 hover:text-amber-300 transition-colors touch-manipulation"
            >
              <RefreshCw className="w-3 h-3" />
              <span>RESET 0°</span>
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
