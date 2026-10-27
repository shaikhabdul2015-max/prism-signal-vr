import React from 'react';
import { Sparkles, RotateCcw, Check, AlertCircle, Eye, HelpCircle, Layers, ArrowRight } from 'lucide-react';
import { AlienSymbol, DecodingState } from '../types/game';
import { ALIEN_SYMBOLS } from '../puzzle/puzzleEngine';
import { sound } from '../audio/soundEngine';

interface DecodingPanelProps {
  decodingState: DecodingState;
  onSelectSymbol: (symbolId: string) => void;
  onRemoveSymbolSlot: (index: number) => void;
  onClearSequence: () => void;
  onValidateSequence: () => void;
  onFocusChamberNode: (nodeKey: 'ruby' | 'azure' | 'emerald' | 'target') => void;
  onOpenStory: () => void;
}

export const DecodingPanel: React.FC<DecodingPanelProps> = ({
  decodingState,
  onSelectSymbol,
  onRemoveSymbolSlot,
  onClearSequence,
  onValidateSequence,
  onFocusChamberNode,
  onOpenStory,
}) => {
  const { selectedSequence, lastFeedback, isSolved, attempts } = decodingState;

  const sequenceSlots = [0, 1, 2, 3];

  return (
    <div className="w-full max-w-4xl mx-auto bg-slate-950/95 border border-cyan-800/80 rounded-2xl p-3 sm:p-4 md:p-6 shadow-2xl shadow-cyan-950/60 text-slate-200 max-h-[85vh] overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1.5 pb-2.5 mb-3 sm:mb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-sm bg-cyan-400 shrink-0" />
            <h2 className="text-xs sm:text-sm md:text-base font-bold font-mono tracking-wider text-white uppercase">
              PHASE 3 // ALIEN CIPHER DECODER
            </h2>
          </div>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-mono">
            ARRANGE 4 ALIEN GLYPHS IN SEQUENCE ACCORDING TO CHAMBER CLUES
          </p>
        </div>

        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="text-slate-400">ATTEMPTS: {attempts}</span>
          {isSolved && (
            <span className="px-2.5 py-1 bg-emerald-950 border border-emerald-500 text-emerald-300 font-bold rounded-full">
              DECRYPTED
            </span>
          )}
        </div>
      </div>

      {/* Grid Layout: Left is Sequence Slots & Tiles, Right is Chamber Clue Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Column (7 cols): Active Sequence & Symbol Keypad */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          
          {/* Target Sequence Input Slots */}
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
              <span>TRANSMISSION SEQUENCE SLOTS</span>
              <span className="text-cyan-400">CLICK FILLED SLOT TO REMOVE</span>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {sequenceSlots.map((slotIdx) => {
                const symbolId = selectedSequence[slotIdx];
                const symbol = symbolId ? ALIEN_SYMBOLS.find((s) => s.id === symbolId) : null;

                return (
                  <button
                    key={slotIdx}
                    aria-label={`Sequence Slot ${slotIdx + 1}: ${
                      symbol ? `${symbol.name} glyph - click to remove` : 'Empty slot'
                    }`}
                    onClick={() => {
                      if (symbol) {
                        onRemoveSymbolSlot(slotIdx);
                        sound.playUIClick();
                      }
                    }}
                    className={`h-24 rounded-xl border flex flex-col items-center justify-center p-2 transition-all relative overflow-hidden group ${
                      symbol
                        ? 'border-cyan-400 bg-cyan-950/30 shadow-md shadow-cyan-950/50'
                        : 'border-dashed border-slate-700 bg-slate-900/40 hover:border-slate-600'
                    }`}
                  >
                    <span className="absolute top-1.5 left-2 text-[9px] font-mono text-slate-500 uppercase">
                      SLOT 0{slotIdx + 1}
                    </span>

                    {symbol ? (
                      <>
                        <span
                          className="text-2xl md:text-3xl font-bold my-0.5 transition-transform group-hover:scale-110"
                          style={{ color: symbol.color }}
                        >
                          {symbol.glyph}
                        </span>
                        <span className="text-[10px] font-mono font-semibold text-slate-200 truncate w-full text-center">
                          {symbol.name}
                        </span>
                        <span className="text-[8px] font-mono text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                          REMOVE
                        </span>
                      </>
                    ) : (
                      <span className="text-slate-600 font-mono text-xl select-none">
                        +
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available Symbol Keypad */}
          <div>
            <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mb-2 flex justify-between">
              <span>AVAILABLE ALIEN GLYPH TILES</span>
              <span className="text-slate-500">SELECT TO INSERT IN NEXT SLOT</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALIEN_SYMBOLS.map((sym, idx) => {
                const isSelected = selectedSequence.includes(sym.id);

                return (
                  <button
                    key={sym.id}
                    disabled={isSelected || selectedSequence.length >= 4}
                    aria-label={`Select alien glyph ${sym.name}: ${sym.meaning.split('//')[0]}`}
                    onClick={() => {
                      onSelectSymbol(sym.id);
                      sound.playSymbolClick(idx);
                    }}
                    className={`p-2 sm:p-2.5 rounded-xl border flex items-center gap-2 sm:gap-2.5 text-left transition-all min-h-[44px] touch-manipulation ${
                      isSelected
                        ? 'border-slate-800 bg-slate-900/30 opacity-40 cursor-not-allowed'
                        : selectedSequence.length >= 4
                        ? 'border-slate-800 bg-slate-900/40 opacity-60 cursor-not-allowed'
                        : 'border-slate-800 bg-slate-900/80 hover:border-cyan-500 hover:bg-slate-900 active:scale-95 shadow-sm'
                    }`}
                  >
                    <div
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center text-lg sm:text-xl font-bold border border-slate-700 shrink-0 bg-slate-950"
                      style={{ color: sym.color }}
                    >
                      {sym.glyph}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[11px] sm:text-xs font-mono font-bold text-slate-200 truncate">
                        {sym.name}
                      </div>
                      <div className="text-[9px] sm:text-[10px] text-slate-400 font-sans truncate">
                        {sym.meaning.split('//')[0]}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation Feedback & Action Buttons */}
          <div className="pt-2">
            {lastFeedback.status !== 'idle' && (
              <div
                role="status"
                aria-live="polite"
                className={`p-3 rounded-lg border text-xs font-mono flex items-center gap-2.5 mb-3 ${
                  lastFeedback.status === 'success'
                    ? 'border-emerald-500/80 bg-emerald-950/70 text-emerald-200'
                    : lastFeedback.status === 'partial'
                    ? 'border-amber-500/80 bg-amber-950/70 text-amber-200'
                    : 'border-red-500/80 bg-red-950/70 text-red-200'
                }`}
              >
                {lastFeedback.status === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <span>{lastFeedback.message}</span>
              </div>
            )}

            <div className="flex items-center gap-2 sm:gap-2.5">
              {!isSolved ? (
                <>
                  <button
                    onClick={onValidateSequence}
                    disabled={selectedSequence.length !== 4}
                    className={`flex-1 min-h-[44px] py-2.5 px-3 sm:px-4 font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 transition-all touch-manipulation ${
                      selectedSequence.length === 4
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/25 active:scale-95'
                        : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>TRANSMIT & VERIFY CIPHER (4/4)</span>
                  </button>

                  <button
                    onClick={() => {
                      onClearSequence();
                      sound.playUIClick();
                    }}
                    title="Clear current sequence"
                    className="min-h-[44px] min-w-[44px] p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-500 rounded-xl text-slate-400 hover:text-slate-200 transition-colors flex items-center justify-center active:scale-95 touch-manipulation"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <button
                  onClick={onOpenStory}
                  className="w-full min-h-[44px] py-3 px-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/30 transition-all active:scale-95 touch-manipulation"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>READ UNLOCKED CIVILIZATION ARCHIVE</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): In-World Chamber Clues Scanner */}
        <div className="lg:col-span-5 bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold tracking-wider text-slate-200 uppercase">
                CHAMBER CLUE ARCHIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-sans mb-3">
              The ancient alien builders carved sequential cipher runes at each optical junction in the chamber. Follow the optical beam's path to piece together the sequence:
            </p>

            <div className="space-y-2 text-xs font-mono">
              {/* Clue 1: Ruby Pedestal */}
              <div className="p-2 rounded-lg bg-slate-950/80 border border-red-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-red-300 font-bold">
                    <span>CIPHER I:</span>
                    <span className="text-base">⟁</span>
                    <span>STELLAR ORIGIN</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Node-Alpha (Ruby Pedestal)</div>
                </div>
                <button
                  onClick={() => onFocusChamberNode('ruby')}
                  title="Inspect Ruby Pedestal in 3D"
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>VIEW</span>
                </button>
              </div>

              {/* Clue 2: Azure Pedestal */}
              <div className="p-2 rounded-lg bg-slate-950/80 border border-cyan-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                    <span>CIPHER II:</span>
                    <span className="text-base">✧</span>
                    <span>HARMONIC BRIDGE</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Node-Beta (Azure Pedestal)</div>
                </div>
                <button
                  onClick={() => onFocusChamberNode('azure')}
                  title="Inspect Azure Pedestal in 3D"
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>VIEW</span>
                </button>
              </div>

              {/* Clue 3: Emerald Pedestal */}
              <div className="p-2 rounded-lg bg-slate-950/80 border border-emerald-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                    <span>CIPHER III:</span>
                    <span className="text-base">⎔</span>
                    <span>PRISMATIC VECTOR</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Node-Gamma (Emerald Pedestal)</div>
                </div>
                <button
                  onClick={() => onFocusChamberNode('emerald')}
                  title="Inspect Emerald Pedestal in 3D"
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>VIEW</span>
                </button>
              </div>

              {/* Clue 4: Target Receiver */}
              <div className="p-2 rounded-lg bg-slate-950/80 border border-purple-900/50 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-purple-300 font-bold">
                    <span>CIPHER IV:</span>
                    <span className="text-base">◬</span>
                    <span>COSMIC HORIZON</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Chamber North Spire Mount</div>
                </div>
                <button
                  onClick={() => onFocusChamberNode('target')}
                  title="Inspect Target Receiver in 3D"
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-300 hover:text-cyan-300 text-[10px] flex items-center gap-1"
                >
                  <Eye className="w-3 h-3" />
                  <span>VIEW</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 text-[10px] font-mono text-slate-400 flex items-center justify-between">
            <span>SEQUENCE: I ➔ II ➔ III ➔ IV</span>
            <span className="text-cyan-400">4-KEY CIPHER</span>
          </div>
        </div>

      </div>
    </div>
  );
};
