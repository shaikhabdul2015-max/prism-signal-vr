import React, { useEffect } from 'react';
import { X, CheckCircle, Glasses, ShieldCheck, Target, RotateCw, AlertTriangle, Play, Sparkles, Hand } from 'lucide-react';
import { VRSupportStatus, HandTrackingStatus } from '../types/game';

interface VRInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEnterVR?: () => void;
  onExitVR?: () => void;
  vrSupportStatus?: VRSupportStatus;
  vrErrorMessage?: string | null;
  handTrackingStatus?: HandTrackingStatus;
  onOpenHandsGuide?: () => void;
}

export const VRInfoModal: React.FC<VRInfoModalProps> = ({
  isOpen,
  onClose,
  onEnterVR,
  onExitVR,
  vrSupportStatus = 'checking',
  vrErrorMessage,
  handTrackingStatus = 'unavailable',
  onOpenHandsGuide,
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

  const isVRActive = vrSupportStatus === 'active';
  const isVRSupported = vrSupportStatus === 'supported';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="vr-spec-title"
    >
      <div
        className="w-full max-w-lg bg-slate-950 border border-cyan-800 rounded-xl p-5 md:p-6 shadow-2xl text-slate-200 relative max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close VR Specifications Dialog"
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors active:scale-95 touch-manipulation"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center justify-between mb-3.5 pb-3 border-b border-slate-800 pr-10 sm:pr-0">
          <div className="flex items-center gap-2.5">
            <Glasses className="w-5 h-5 text-cyan-400 shrink-0" />
            <h2 id="vr-spec-title" className="text-xs sm:text-sm font-bold font-mono tracking-wider text-slate-100 uppercase">
              PHASE 5 // WEBXR IMMERSIVE VR
            </h2>
          </div>

          <span
            className={`text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded-full border shrink-0 ${
              isVRActive
                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 font-bold'
                : isVRSupported
                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
          >
            {isVRActive
              ? 'VR ACTIVE'
              : isVRSupported
              ? 'VR READY'
              : '2D MOBILE / WEB'}
          </span>
        </div>

        {/* WebXR Session Launcher Banner */}
        <div className="mb-4 p-3 rounded-lg border bg-slate-900/60 border-slate-800">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-mono font-bold text-white">
                {isVRActive
                  ? 'IMMERSIVE VR SESSION RUNNING'
                  : isVRSupported
                  ? 'COMPATIBLE VR HEADSET DETECTED'
                  : 'DESKTOP / MOBILE 2D MODE'}
              </div>
              <p className="text-[11px] text-slate-400 font-sans mt-0.5 leading-relaxed">
                {isVRActive
                  ? 'Stereoscopic rendering and controller aim rays are active in your headset.'
                  : isVRSupported
                  ? 'Click below to launch WebXR seated stereoscopic mode.'
                  : 'WebXR immersive sessions require a WebXR browser (e.g. Meta Quest Browser, Chrome on PC with VR headset). Standard mouse and touch controls are fully active and optimized on this device.'}
              </p>
            </div>

            {isVRActive ? (
              <button
                onClick={() => {
                  onExitVR?.();
                  onClose();
                }}
                className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 bg-slate-800 hover:bg-slate-700 border border-emerald-500/80 rounded-lg text-xs font-mono font-bold text-emerald-300 transition-colors shrink-0 active:scale-95 touch-manipulation"
              >
                EXIT VR
              </button>
            ) : isVRSupported ? (
              <button
                onClick={() => {
                  onEnterVR?.();
                  onClose();
                }}
                className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 rounded-lg text-xs font-mono font-bold transition-all shadow-md shadow-cyan-500/25 shrink-0 flex items-center justify-center gap-1.5 active:scale-95 touch-manipulation"
              >
                <Glasses className="w-4 h-4" />
                <span>ENTER VR</span>
              </button>
            ) : null}
          </div>

          {vrErrorMessage && (
            <div className="mt-2 pt-2 border-t border-slate-800 flex items-start gap-1.5 text-[11px] font-mono text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{vrErrorMessage}</span>
            </div>
          )}
        </div>

        <div className="space-y-2 mb-4 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
            <Target className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200">1. WebXR Controller Pointer Rays:</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                In VR, pointing controller ray at crystals or central console triggers selection and light beam toggling via decoupled <code className="text-cyan-300">VRInteractionAdapter.onSelectRay</code>.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
            <RotateCw className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200">2. Controller Thumbstick Rotation:</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Primary controller thumbstick X-axis smoothly rotates the currently selected crystal without reaching out.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-200">3. Seated Ergonomics:</span>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                Camera rig is calibrated at seated elevation overlooking console and target receiver. Zero roomscale boundaries required.
              </p>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex items-start gap-2.5">
            <Hand className={`w-4 h-4 shrink-0 mt-0.5 ${handTrackingStatus === 'active' ? 'text-emerald-400' : 'text-cyan-400'}`} />
            <div className="w-full">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">4. Phase 6 Controller-Free Hand Tracking:</span>
                {onOpenHandsGuide && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenHandsGuide();
                    }}
                    className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-mono ml-2"
                  >
                    VIEW GESTURES
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                WebXR 25-joint skeletal hand tracking with procedural visual energy nodes, index-finger pointing ray, and natural pinch-to-dial rotation. Active in compatible VR browsers (e.g. Meta Quest Browser with hands enabled). Outside VR, mouse and touch remain fully active.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          aria-label="Return to Chamber"
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-cyan-500 font-mono text-xs font-bold text-slate-200 hover:text-white rounded-lg transition-colors"
        >
          RETURN TO CHAMBER
        </button>
      </div>
    </div>
  );
};
