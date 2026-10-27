import React, { useEffect } from 'react';
import { X, Hand, MoveHorizontal, Disc, CheckCircle, AlertCircle, ToggleLeft, ToggleRight, Sparkles, Sliders, Activity } from 'lucide-react';
import { HandTrackingStatus } from '../types/game';

interface HandTrackingTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
  handTrackingStatus: HandTrackingStatus;
  activeHandsCount: number;
  isHandInteractionEnabled: boolean;
  onToggleHandInteraction: (enabled: boolean) => void;
  onEnterVR?: () => void;
  isVRSupported?: boolean;
  onOpenDiagnostics?: () => void;
}

export const HandTrackingTutorialModal: React.FC<HandTrackingTutorialModalProps> = ({
  isOpen,
  onClose,
  handTrackingStatus,
  activeHandsCount,
  isHandInteractionEnabled,
  onToggleHandInteraction,
  onEnterVR,
  isVRSupported = false,
  onOpenDiagnostics,
}) => {
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

  const isHandsActive = handTrackingStatus === 'active';
  const isHandsLost = handTrackingStatus === 'lost';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hand-tutorial-title"
    >
      <div
        className="w-full max-w-xl bg-slate-950 border border-cyan-800 rounded-xl p-5 md:p-6 shadow-2xl text-slate-200 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close Hand Tracking Guide"
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors active:scale-95 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <Hand className="w-5 h-5 text-cyan-400" />
            <h2 id="hand-tutorial-title" className="text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
              PHASE 6 & 7 // CONTROLLER-FREE HANDS & VR POLISH
            </h2>
          </div>

          <span
            className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isHandsActive
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                : isHandsLost
                ? 'bg-amber-950 border-amber-500 text-amber-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {isHandsActive
              ? `LIVE TRACKING (${activeHandsCount} HAND${activeHandsCount > 1 ? 'S' : ''})`
              : isHandsLost
              ? 'HANDS OCCLUDED / PAUSED'
              : 'HARDWARE HEADSET REQUIRED'}
          </span>
        </div>

        {/* Live Device Capability Notice */}
        <div className="mb-4 p-3 rounded-lg border bg-slate-900/60 border-slate-800">
          <div className="flex items-start gap-2.5">
            {isHandsActive ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            )}
            <div className="text-xs">
              <div className="font-mono font-bold text-slate-200">
                {isHandsActive
                  ? 'Controller-Free Hand Tracking Active in WebXR'
                  : 'WebXR Hand Tracking Detection Status'}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                {isHandsActive
                  ? 'Spatial hand-joint data is being tracked in real time. Reach out toward the crystals in your seated play space to pinch, select, and naturally dial prism rotation with low-pass jitter filtering.'
                  : 'Hand-tracking input requires a WebXR-compatible VR headset with optical hand cameras (e.g., Meta Quest Browser with Hand Tracking enabled in system settings). Standard mouse click-drag, touch gestures, and HUD sliders remain fully responsive.'}
              </p>
            </div>
          </div>
        </div>

        {/* 4 Core Natural Gestures */}
        <div className="space-y-2.5 mb-5 font-mono text-xs">
          {/* Step 1: Aim */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
              1
            </div>
            <div>
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>POINT & AIM</span>
                <span className="text-[10px] text-cyan-400 font-normal">[Index Finger]</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">
                Extend your index finger toward any of the three crystals (Ruby, Azure, Emerald) or the central light console. A subtle holographic cyan targeting ray highlights your target.
              </p>
            </div>
          </div>

          {/* Step 2: Pinch to Grab */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
              2
            </div>
            <div>
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>PINCH TO SELECT & GRAB</span>
                <span className="text-[10px] text-emerald-400 font-normal">[Index + Thumb Hysteresis]</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">
                Bring your index fingertip and thumb tip together (&lt;2.4 cm). A luminous emerald reticle and magnetic energetic tether lock onto the prism with haptic feedback.
              </p>
            </div>
          </div>

          {/* Step 3: Natural Rotation */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
              3
            </div>
            <div>
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>JITTER-FILTERED ROTATION</span>
                <span className="text-[10px] text-cyan-400 font-normal">[Seated Hand Drift]</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">
                While holding the pinch, smoothly shift your hand horizontally to dial the prism angle. Phase 7 exponential low-pass filtering eliminates optical tracking jitter for steady alignments.
              </p>
            </div>
          </div>

          {/* Step 4: Release */}
          <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-3">
            <div className="w-6 h-6 rounded-md bg-cyan-950 border border-cyan-700/60 text-cyan-400 flex items-center justify-center font-bold text-xs shrink-0">
              4
            </div>
            <div>
              <div className="font-bold text-slate-200 flex items-center gap-1.5">
                <span>RELEASE TO LOCK</span>
                <span className="text-[10px] text-slate-400 font-normal">[Release Hysteresis &gt;4.0cm]</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 font-sans leading-relaxed">
                Open your fingers (&gt;4.0 cm) to release the crystal cleanly. The optical beam reflects in real time according to the Snell-law optical simulation.
              </p>
            </div>
          </div>
        </div>

        {/* Input Switcher / Return to Standard Controls */}
        <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <div>
              <div className="text-xs font-mono font-bold text-slate-200">
                INPUT MODE PREFERENCE
              </div>
              <div className="text-[11px] text-slate-400 font-sans">
                {isHandInteractionEnabled
                  ? 'Hand Gestures & Pointer Rays Enabled'
                  : 'Standard Controls Only (Touch / Mouse / Sticks)'}
              </div>
            </div>
          </div>

          <button
            onClick={() => onToggleHandInteraction(!isHandInteractionEnabled)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border bg-slate-950 border-slate-700 hover:border-cyan-500 text-xs font-mono text-slate-300 hover:text-white transition-colors"
          >
            {isHandInteractionEnabled ? (
              <>
                <ToggleRight className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-300">HANDS: ON</span>
              </>
            ) : (
              <>
                <ToggleLeft className="w-4 h-4 text-slate-500" />
                <span className="text-slate-400">HANDS: OFF</span>
              </>
            )}
          </button>
        </div>

        {/* Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5">
          {onOpenDiagnostics && (
            <button
              onClick={() => {
                onClose();
                onOpenDiagnostics();
              }}
              className="w-full sm:w-1/2 py-2 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 hover:border-cyan-400 font-mono text-xs font-bold text-cyan-200 hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>OPEN DIAGNOSTICS</span>
            </button>
          )}

          {isVRSupported && !isHandsActive && onEnterVR && (
            <button
              onClick={() => {
                onEnterVR();
                onClose();
              }}
              className="w-full sm:w-1/2 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-lg text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/25 flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Hand className="w-4 h-4" />
              <span>LAUNCH IN VR</span>
            </button>
          )}

          <button
            onClick={onClose}
            aria-label="Return to Chamber"
            className={`w-full ${isVRSupported && !isHandsActive && onEnterVR ? 'sm:w-1/2' : ''} py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 font-mono text-xs font-bold text-slate-200 hover:text-white rounded-lg transition-colors min-h-[44px]`}
          >
            RETURN TO CHAMBER
          </button>
        </div>
      </div>
    </div>
  );
};
