import React from 'react';
import { Volume2, VolumeX, Pause, HelpCircle, Eye, Glasses, Zap, RotateCcw, Target, Sparkles, Hand, Activity } from 'lucide-react';
import { MissionState, VRSupportStatus, HandTrackingStatus } from '../types/game';

interface TopBarProps {
  state: MissionState;
  onOpenTutorial: () => void;
  onTogglePause: () => void;
  onToggleAudio: () => void;
  onToggleCinematic: () => void;
  onOpenVRInfo: () => void;
  onOpenHandsGuide?: () => void;
  onOpenDiagnostics?: () => void;
  onToggleBeamSource: () => void;
  onResetPuzzle: () => void;
  onFocusTarget: () => void;
  onOpenDecoder: () => void;
  onOpenStory: () => void;
  onEnterVR?: () => void;
  onExitVR?: () => void;
  vrSupportStatus?: VRSupportStatus;
  handTrackingStatus?: HandTrackingStatus;
}

export const TopBar: React.FC<TopBarProps> = ({
  state,
  onOpenTutorial,
  onTogglePause,
  onToggleAudio,
  onToggleCinematic,
  onOpenVRInfo,
  onOpenHandsGuide,
  onOpenDiagnostics,
  onToggleBeamSource,
  onResetPuzzle,
  onFocusTarget,
  onOpenDecoder,
  onOpenStory,
  onEnterVR,
  onExitVR,
  vrSupportStatus = 'checking',
  handTrackingStatus = 'unavailable',
}) => {
  const { puzzleProgress, decodingState } = state;
  const isTargetHit = puzzleProgress.isTargetReceiverHit;
  const isDecodingUnlocked = decodingState.isUnlocked || isTargetHit;
  const isStoryUnlocked = decodingState.isSolved;
  const isVRActive = vrSupportStatus === 'active';
  const isVRSupported = vrSupportStatus === 'supported';
  const isHandsActive = handTrackingStatus === 'active';

  return (
    <header className="fixed top-0 left-0 right-0 z-20 pointer-events-none px-2 sm:px-3 md:px-4 py-2 sm:py-2.5 flex flex-col gap-1.5 sm:gap-2">
      <div className="flex items-center justify-between w-full gap-2">
        {/* Top Left: Title & Mission Objective */}
        <div className="pointer-events-auto flex items-center gap-2 sm:gap-2.5 md:gap-3 bg-slate-950/90 border border-cyan-900/70 rounded-lg px-2.5 sm:px-3 py-1.5 shadow-lg shadow-cyan-950/20 shrink min-w-0">
          <div className={`w-2.5 h-2.5 rounded-sm shrink-0 ${isStoryUnlocked ? 'bg-emerald-400' : isTargetHit ? 'bg-purple-400' : 'bg-cyan-400'}`} />
          <div className="min-w-0">
            <div className="text-[10px] font-mono tracking-widest text-cyan-400 font-semibold uppercase flex items-center gap-1.5">
              <span className="shrink-0">PRISM SIGNAL</span>
              <span className="text-slate-500 hidden xs:inline">|</span>
              <span className="text-slate-400 truncate max-w-[100px] xs:max-w-[150px] sm:max-w-none">
                {isStoryUnlocked ? 'MISSION COMPLETE' : isTargetHit ? 'CIPHER DECODER' : 'LIGHT PUZZLE'}
              </span>
            </div>
            <div className="text-[11px] sm:text-xs font-sans text-slate-200 flex items-center gap-1.5 min-w-0">
              <span className="text-slate-400 font-mono text-[10px] sm:text-[11px] shrink-0">STATUS:</span>
              <span className={`font-medium truncate max-w-[110px] xs:max-w-[160px] sm:max-w-xs md:max-w-md ${isStoryUnlocked ? 'text-emerald-300 font-bold' : isTargetHit ? 'text-purple-300 font-bold' : 'text-cyan-200'}`}>
                {isStoryUnlocked
                  ? 'TRANSMISSION ARCHIVE UNLOCKED'
                  : isTargetHit
                  ? 'OPTICAL CIRCUIT ACTIVE // DECODE CIPHER'
                  : 'ALIGN 3 PRISMS TO TARGET RECEIVER'}
              </span>
            </div>
          </div>
        </div>

        {/* Top Center: Live Beam Propagation Pipeline */}
        <div className="hidden lg:flex pointer-events-auto items-center gap-2 bg-slate-950/90 border border-slate-800 rounded-lg px-3.5 py-1.5 shadow-lg">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">BEAM PATH:</span>

          {/* Console Source */}
          <div className="flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                puzzleProgress.isBeamSourceActive
                  ? 'bg-red-950/80 text-red-300 border border-red-700/60'
                  : 'bg-slate-900 text-slate-500'
              }`}
            >
              CONSOLE
            </span>
            <span className="text-slate-600 font-mono">➔</span>
          </div>

          {/* Ruby */}
          <div className="flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                puzzleProgress.beamChainStatus.rubyToAzure
                  ? 'bg-red-500/20 text-red-300 border border-red-500/80'
                  : puzzleProgress.isRubyPowered
                  ? 'bg-red-950/40 text-amber-300 border border-dashed border-amber-600/60'
                  : 'bg-slate-900 text-slate-500'
              }`}
            >
              RUBY
            </span>
            <span className="text-slate-600 font-mono">➔</span>
          </div>

          {/* Azure */}
          <div className="flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                puzzleProgress.beamChainStatus.azureToEmerald
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/80'
                  : puzzleProgress.isAzurePowered
                  ? 'bg-cyan-950/40 text-amber-300 border border-dashed border-amber-600/60'
                  : 'bg-slate-900 text-slate-500'
              }`}
            >
              AZURE
            </span>
            <span className="text-slate-600 font-mono">➔</span>
          </div>

          {/* Emerald */}
          <div className="flex items-center gap-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                puzzleProgress.beamChainStatus.emeraldToTarget
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/80'
                  : puzzleProgress.isEmeraldPowered
                  ? 'bg-emerald-950/40 text-amber-300 border border-dashed border-amber-600/60'
                  : 'bg-slate-900 text-slate-500'
              }`}
            >
              EMERALD
            </span>
            <span className="text-slate-600 font-mono">➔</span>
          </div>

          {/* Target Receiver */}
          <div>
            <span
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold flex items-center gap-1 ${
                isTargetHit
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/40'
                  : 'bg-slate-900 text-slate-400 border border-slate-700'
              }`}
            >
              <Target className="w-3 h-3" />
              RECEIVER
            </span>
          </div>
        </div>

        {/* Top Right: System Actions & Live Progress */}
        <div className="pointer-events-auto flex items-center gap-1 sm:gap-1.5 md:gap-2 shrink-0">
          {/* Progress Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 bg-slate-950/90 border border-slate-800 rounded-md px-2.5 py-1 text-xs font-mono min-h-[38px]">
            <span className="text-[10px] text-slate-400">PROGRESS:</span>
            <span
              className={`font-bold ${
                isTargetHit ? 'text-emerald-400' : 'text-cyan-300'
              }`}
            >
              {puzzleProgress.overallProgressPercent}%
            </span>
          </div>

          {/* Console Light Source Toggle */}
          <button
            onClick={onToggleBeamSource}
            title={puzzleProgress.isBeamSourceActive ? 'Console Light Source: ACTIVE (Click to toggle)' : 'Console Light Source: OFFLINE'}
            className={`flex items-center justify-center gap-1 min-w-[40px] min-h-[40px] px-2 sm:px-2.5 rounded-lg text-xs font-mono transition-colors border active:scale-95 touch-manipulation ${
              puzzleProgress.isBeamSourceActive
                ? 'bg-red-950/80 border-red-500/70 text-red-200 hover:bg-red-900/90'
                : 'bg-slate-950/85 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Zap className={`w-4 h-4 ${puzzleProgress.isBeamSourceActive ? 'text-red-400 fill-current' : ''}`} />
            <span className="hidden md:inline text-[11px]">BEAM</span>
          </button>

          {/* Focus Target Button */}
          <button
            onClick={onFocusTarget}
            title="Focus Camera on Target Receiver"
            className="min-w-[40px] min-h-[40px] p-2 sm:px-2.5 bg-slate-950/85 border border-slate-700 hover:border-cyan-500 rounded-lg text-slate-300 hover:text-cyan-300 text-xs font-mono transition-colors flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
          >
            <Target className="w-4 h-4 text-cyan-400" />
            <span className="hidden xl:inline text-[11px]">TARGET</span>
          </button>

          {/* Reset Puzzle Button */}
          <button
            onClick={onResetPuzzle}
            title="Reset Crystal Light-Beam Puzzle"
            className="min-w-[40px] min-h-[40px] p-2 sm:px-2.5 bg-slate-950/85 border border-slate-700 hover:border-amber-500/70 rounded-lg text-slate-300 hover:text-amber-300 text-xs font-mono transition-colors flex items-center justify-center gap-1 active:scale-95 touch-manipulation"
          >
            <RotateCcw className="w-4 h-4" />
            <span className="hidden md:inline text-[11px]">RESET</span>
          </button>

          {/* Phase 3: Cipher Decoder Quick Access */}
          {isDecodingUnlocked && (
            <button
              onClick={onOpenDecoder}
              title="Open Alien Symbol Cipher Decoder"
              className={`flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-2.5 rounded-lg text-xs font-mono transition-colors border active:scale-95 touch-manipulation ${
                state.phase === 'decoding'
                  ? 'bg-purple-950 border-purple-400 text-purple-200'
                  : 'bg-purple-950/80 border-purple-600/70 text-purple-300 hover:border-purple-400'
              }`}
            >
              <span className="font-bold text-sm">⟁</span>
              <span className="hidden sm:inline text-[11px]">DECODER</span>
            </button>
          )}

          {/* Phase 3: Story Archive Button */}
          {isStoryUnlocked && (
            <button
              onClick={onOpenStory}
              title="View Deciphered Civilization Story"
              className="flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-2.5 rounded-lg text-xs font-mono transition-colors border bg-emerald-950/90 border-emerald-500 text-emerald-200 hover:bg-emerald-900 active:scale-95 touch-manipulation"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline text-[11px]">STORY</span>
            </button>
          )}

          {/* WebXR VR Mode & Info Buttons */}
          <button
            onClick={() => {
              if (isVRActive && onExitVR) {
                onExitVR();
              } else if (isVRSupported && onEnterVR) {
                onEnterVR();
              } else {
                onOpenVRInfo();
              }
            }}
            aria-label={
              isVRActive
                ? 'Exit Immersive WebXR Session'
                : isVRSupported
                ? 'Enter WebXR Immersive VR Session'
                : 'WebXR VR Information and Requirements'
            }
            title={
              isVRActive
                ? 'Exit Immersive VR Session'
                : isVRSupported
                ? 'Enter Immersive VR Session (WebXR)'
                : 'WebXR Requirements & Status'
            }
            className={`flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-2 sm:px-2.5 rounded-lg text-xs font-mono font-semibold transition-all border active:scale-95 touch-manipulation ${
              isVRActive
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200'
                : isVRSupported
                ? 'bg-cyan-950/90 border-cyan-400/80 text-cyan-200 hover:bg-cyan-900 shadow-md shadow-cyan-500/20'
                : 'bg-slate-950/85 border-slate-700 hover:border-cyan-500/80 text-slate-300 hover:text-cyan-300'
            }`}
          >
            <Glasses className={`w-4 h-4 ${isVRActive ? 'text-emerald-400' : isVRSupported ? 'text-cyan-400' : 'text-slate-400'}`} />
            <span className="hidden sm:inline text-[11px]">
              {isVRActive ? 'EXIT VR' : isVRSupported ? 'ENTER VR' : 'VR'}
            </span>
          </button>

          {/* Phase 6: Hand Tracking Guide & Status */}
          <button
            onClick={onOpenHandsGuide}
            aria-label="Hand Tracking Controls and Gestures Guide"
            title={
              isHandsActive
                ? 'Hand Tracking: ACTIVE in VR (Click for Gestures Guide)'
                : 'Hand Tracking Controls & Guide'
            }
            className={`flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-2 sm:px-2.5 rounded-lg text-xs font-mono font-semibold transition-all border active:scale-95 touch-manipulation ${
              isHandsActive
                ? 'bg-emerald-950/90 border-emerald-400 text-emerald-200 shadow-md shadow-emerald-500/20'
                : 'bg-slate-950/85 border-slate-700 hover:border-cyan-500/80 text-slate-300 hover:text-cyan-300'
            }`}
          >
            <Hand className={`w-4 h-4 ${isHandsActive ? 'text-emerald-400' : 'text-slate-400'}`} />
            <span className="hidden md:inline text-[11px]">
              {isHandsActive ? 'HANDS: ON' : 'HANDS'}
            </span>
          </button>

          {/* Phase 10: Optical Hand Tracking Diagnostics */}
          {onOpenDiagnostics && (
            <button
              onClick={onOpenDiagnostics}
              aria-label="Optical Hand Tracking Diagnostics and Validation [D]"
              title="Optical Hand Tracking Diagnostics & Validation [D]"
              className="flex items-center justify-center gap-1.5 min-w-[40px] min-h-[40px] px-2 sm:px-2.5 rounded-lg text-xs font-mono font-semibold transition-all border bg-slate-950/85 border-slate-700 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 active:scale-95 touch-manipulation"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="hidden lg:inline text-[11px]">DIAG</span>
            </button>
          )}

          {/* Audio Toggle */}
          <button
            onClick={onToggleAudio}
            title={state.audioMuted ? 'Unmute Audio' : 'Mute Audio'}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 bg-slate-950/85 border border-slate-700 hover:border-cyan-500/80 rounded-lg text-slate-300 hover:text-cyan-300 transition-colors active:scale-95 touch-manipulation"
          >
            {state.audioMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {/* Tutorial */}
          <button
            onClick={onOpenTutorial}
            title="Tutorial"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 bg-slate-950/85 border border-slate-700 hover:border-cyan-500/80 rounded-lg text-slate-300 hover:text-cyan-300 transition-colors active:scale-95 touch-manipulation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          {/* Zen View */}
          <button
            onClick={onToggleCinematic}
            title={state.cinematicMode ? 'Show Controls' : 'Zen View'}
            className={`min-w-[40px] min-h-[40px] flex items-center justify-center p-2 bg-slate-950/85 border rounded-lg transition-colors active:scale-95 touch-manipulation ${
              state.cinematicMode
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-slate-700 text-slate-300 hover:text-cyan-300'
            }`}
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* Pause */}
          <button
            onClick={onTogglePause}
            title="Pause"
            className="min-w-[40px] min-h-[40px] flex items-center justify-center px-2.5 bg-slate-950/85 border border-slate-700 hover:border-amber-400 rounded-lg text-xs font-mono text-slate-200 hover:text-amber-300 transition-colors active:scale-95 touch-manipulation"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Success Banner when Target is Reached */}
      {isTargetHit && (
        <div className="pointer-events-auto self-center bg-emerald-950/90 border border-emerald-400/80 text-emerald-200 px-4 py-1.5 rounded-full shadow-lg shadow-emerald-950/40 flex items-center gap-2.5 text-xs font-mono animate-in fade-in slide-in-from-top duration-300">
          <div className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="font-bold tracking-wide">PUZZLE SOLVED:</span>
          <span>OPTICAL CIRCUIT COMPLETE — TARGET RECEIVER ACTIVATED!</span>
        </div>
      )}
    </header>
  );
};
