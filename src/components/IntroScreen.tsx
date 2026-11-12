import React from 'react';
import { Play, HelpCircle, Glasses, Orbit, Loader2 } from 'lucide-react';
import { VRSupportStatus } from '../types/game';

interface IntroScreenProps {
  onStart: () => void;
  onOpenTutorial: () => void;
  onEnterVR?: () => void;
  onOpenVRInfo?: () => void;
  isVRSupported?: boolean;
  vrSupportStatus?: VRSupportStatus;
  isStartingVR?: boolean;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({
  onStart,
  onOpenTutorial,
  onEnterVR,
  onOpenVRInfo,
  isVRSupported = false,
  vrSupportStatus = 'checking',
  isStartingVR = false,
}) => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-none overflow-y-auto">
      <div className="w-full max-w-xl bg-slate-950/95 border border-cyan-800/80 rounded-2xl p-5 sm:p-6 md:p-8 shadow-2xl shadow-cyan-950/80 text-center relative overflow-hidden my-auto max-h-[96vh] overflow-y-auto">
        {/* Subtle decorative top glow line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-cyan-400 to-emerald-400" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-800 text-[10px] sm:text-[11px] font-mono text-cyan-300 uppercase tracking-widest mb-3 sm:mb-4">
          <Orbit className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span className="truncate max-w-[240px] sm:max-w-none">DEEP-SPACE ARRAY // PHASE 13 WEBXR READY</span>
        </div>

        <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-1.5 font-mono">
          PRISM SIGNAL
        </h1>
        <div className="text-xs sm:text-sm font-mono tracking-widest text-cyan-400 mb-4 uppercase">
          BEYOND THE VOID
        </div>

        <p className="text-xs sm:text-sm md:text-base text-slate-300 max-w-md mx-auto leading-relaxed mb-5 font-sans">
          You have reached a forgotten relay chamber in deep space. Align the three floating resonance crystals to refocus the holographic carrier beam and decode an unknown civilization’s harmonic beacon.
        </p>

        {/* 3 Core specs preview */}
        <div className="grid grid-cols-3 gap-2 sm:gap-2.5 max-w-md mx-auto mb-6 sm:mb-8 font-mono text-xs">
          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-red-900/50 flex flex-col items-center">
            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-red-500 mb-1" />
            <span className="text-[10px] sm:text-[11px] font-bold text-red-300">RUBY CORE</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">440 Hz</span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-cyan-900/50 flex flex-col items-center">
            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-cyan-400 mb-1" />
            <span className="text-[10px] sm:text-[11px] font-bold text-cyan-300">AZURE ARRAY</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">659 Hz</span>
          </div>

          <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900/80 border border-emerald-900/50 flex flex-col items-center">
            <div className="w-2.5 sm:w-3 h-2.5 sm:h-3 rounded-full bg-emerald-400 mb-1" />
            <span className="text-[10px] sm:text-[11px] font-bold text-emerald-300">EMERALD</span>
            <span className="text-[9px] sm:text-[10px] text-slate-400">554 Hz</span>
          </div>
        </div>

        {/* Action Buttons with >=48px accessible gaze/touch hit targets */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 sm:gap-3 max-w-md mx-auto">
          <button
            onClick={onStart}
            disabled={isStartingVR}
            aria-label="Start mission in 2D desktop or mobile mode"
            className="flex-1 flex items-center justify-center gap-2 px-5 py-3 min-h-[48px] bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 font-mono font-bold text-xs sm:text-sm rounded-xl shadow-lg shadow-cyan-500/25 transition-all transform active:scale-95 disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>START MISSION (2D)</span>
          </button>

          {(isVRSupported || vrSupportStatus === 'error') && onEnterVR ? (
            <button
              onClick={onEnterVR}
              disabled={isStartingVR}
              aria-label="Enter immersive controller-free WebXR VR session"
              className={`flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-cyan-950/90 hover:bg-cyan-900 border border-cyan-400 text-cyan-200 font-mono text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 ${
                isStartingVR ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {isStartingVR ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                  <span>STARTING VR...</span>
                </>
              ) : (
                <>
                  <Glasses className="w-4 h-4 text-cyan-400" />
                  <span>{vrSupportStatus === 'error' ? 'RETRY VR' : 'ENTER HANDS-FREE VR'}</span>
                </>
              )}
            </button>
          ) : vrSupportStatus === 'checking' ? (
            <button
              disabled
              aria-label="Checking WebXR immersive-vr capability"
              className="flex items-center justify-center gap-2 px-3 py-3 min-h-[48px] bg-slate-900/60 border border-slate-800 text-slate-500 font-mono text-xs rounded-xl cursor-wait"
            >
              <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              <span>CHECKING VR...</span>
            </button>
          ) : (
            <button
              onClick={onOpenVRInfo}
              aria-label="Open WebXR VR compatibility and specifications"
              className="flex items-center justify-center gap-1.5 px-3 py-3 min-h-[48px] bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500/80 text-slate-400 hover:text-cyan-300 font-mono text-xs rounded-xl transition-colors active:scale-95"
              title="Inspect WebXR VR Requirements and 2D Mobile Fallback Status"
            >
              <Glasses className="w-4 h-4 text-slate-400" />
              <span>VR SPECS</span>
            </button>
          )}

          <button
            onClick={onOpenTutorial}
            disabled={isStartingVR}
            aria-label="Open mission briefing and hand-gesture guide"
            className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 text-slate-300 hover:text-cyan-200 font-mono text-xs rounded-xl transition-colors active:scale-95 disabled:opacity-50"
          >
            <HelpCircle className="w-4 h-4" />
            <span>BRIEFING</span>
          </button>
        </div>

        <div className="mt-4 sm:mt-5 text-[10px] sm:text-[11px] font-mono text-slate-400 flex items-center justify-center gap-2 flex-wrap">
          <span>CONTROLLER-FREE XRHAND TRACKING</span>
          <span>&bull;</span>
          <span>SEATED &amp; STANDING CALIBRATION</span>
          <span>&bull;</span>
          <span>2D TOUCH &amp; MOUSE READY</span>
        </div>
      </div>
    </div>
  );
};
