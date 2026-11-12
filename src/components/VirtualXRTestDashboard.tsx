import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Hand,
  Play,
  RefreshCw,
  ShieldAlert,
  Sliders,
  X,
} from 'lucide-react';
import type { CrystalId } from '../types/game';
import type { SpatialCoordinateSpace, WebXRCapabilityMatrix } from '../spatial/types';
import { WebXRCompatibilityManager } from '../spatial/WebXRCompatibilityManager';
import {
  runAllVirtualXRScenarios,
  SimulationScenarioResult,
  VirtualXRDashboardState,
  VirtualXRSimulationHarness,
} from '../simulation/VirtualXRSimulationHarness';
import type { VirtualFaultType, VirtualHandSide } from '../simulation/VirtualXREnvironment';

interface VirtualXRTestDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const CRYSTAL_IDS: CrystalId[] = ['ruby', 'azure', 'emerald'];
const REF_SPACES: SpatialCoordinateSpace[] = ['local-floor', 'bounded-floor', 'local', 'viewer'];
const FAULTS: Array<{ id: VirtualFaultType; label: string }> = [
  { id: 'none', label: 'CLEAR FAULT' },
  { id: 'tracking_loss', label: 'TRACKING LOSS' },
  { id: 'partial_occlusion', label: 'PARTIAL OCCLUSION' },
  { id: 'nan_joint', label: 'NAN JOINT' },
  { id: 'infinity_joint', label: 'INFINITY JOINT' },
  { id: 'zero_origin', label: 'ZERO ORIGIN' },
  { id: 'out_of_bounds', label: 'OUT OF BOUNDS' },
  { id: 'teleport_spike', label: 'TELEPORT SPIKE' },
];

export const VirtualXRTestDashboard: React.FC<VirtualXRTestDashboardProps> = ({
  isOpen,
  onClose,
}) => {
  const harnessRef = useRef<VirtualXRSimulationHarness | null>(null);
  if (!harnessRef.current) {
    harnessRef.current = new VirtualXRSimulationHarness();
  }

  const [simState, setSimState] = useState<VirtualXRDashboardState>(() =>
    harnessRef.current!.getDashboardState()
  );
  const [activeSide, setActiveSide] = useState<VirtualHandSide>('right');
  const [scenarios, setScenarios] = useState<SimulationScenarioResult[]>(() =>
    runAllVirtualXRScenarios()
  );
  const [compatMatrix, setCompatMatrix] = useState<WebXRCapabilityMatrix | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    const manager = new WebXRCompatibilityManager();
    manager.detectCapabilities().then((matrix) => {
      if (mounted) setCompatMatrix(matrix);
    });
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const h = harnessRef.current;
  const activeHandState = activeSide === 'left' ? simState.leftHand : simState.rightHand;
  const activeCfg = h.env.getHandConfig(activeSide);

  const syncAfterAction = (dtMs = 16.6) => {
    setSimState(h.stepFrame(dtMs));
  };

  const handleMoveHand = (dx: number, dy: number, dz: number) => {
    h.env.moveHandBy(activeSide, [dx, dy, dz]);
    syncAfterAction(16.6);
  };

  const handleTogglePinch = () => {
    const nextPinch = !activeHandState.pinchState.isPinching;
    h.env.setPinch(activeSide, nextPinch, nextPinch ? 0.014 : 0.075);
    setSimState(
      h.stepFrame(16.6, {
        side: activeSide,
        type: nextPinch ? 'pinchstart' : 'pinchend',
        eventToken: `ui-pinch-${Date.now()}`,
      })
    );
  };

  const handleTogglePalm = () => {
    h.env.setPalmFacingHead(activeSide, !activeCfg.palmFacingHead);
    syncAfterAction(16.6);
  };

  const handleInjectFault = (fault: VirtualFaultType) => {
    h.env.injectFault(activeSide, fault);
    syncAfterAction(16.6);
  };

  const handleStepCalibration = () => {
    if (simState.calibration.status !== 'in_progress') {
      h.startCalibration();
    }
    const cal = h.calibrationManager.getState();
    if (cal.step === 'comfort_reach') {
      h.env.setPinch(activeSide, false, 0.075);
      for (let i = 0; i < 8; i++) h.stepFrame(16.6);
    } else if (cal.step === 'pinch_confirm') {
      h.env.setPinch(activeSide, true, 0.015);
      for (let i = 0; i < 3; i++) h.stepFrame(16.6);
    }
    setSimState(h.getDashboardState());
  };

  const handleRunScenarios = () => {
    setScenarios(runAllVirtualXRScenarios());
  };

  const handleReset = () => {
    h.resetAll();
    setSimState(h.getDashboardState());
  };

  const passedCount = scenarios.filter((s) => s.passed).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Development Virtual WebXR Simulation Test Dashboard"
    >
      <div className="w-full max-w-7xl max-h-[96vh] overflow-y-auto bg-[#07090E] border border-slate-800 rounded-lg text-slate-100 shadow-2xl">
        {/* Top Bar Header */}
        <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#0B0F17] border-b border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <Cpu className="w-5 h-5 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="text-xs font-mono font-bold tracking-wider text-cyan-300 uppercase">
                DEV VIRTUAL WEBXR HARDWARE RIG // CONTROLLER-FREE HARNESS
              </div>
              <div className="text-[11px] font-mono text-slate-400 flex flex-wrap items-center gap-x-2">
                <span>ISOLATED SIMULATION LAYER</span>
                <span>·</span>
                <span className="text-amber-300">
                  PHYSICAL HARDWARE: NOT_TESTED (NO HEADSET CLAIMED)
                </span>
                <span>·</span>
                <span className="tabular-nums">CLOCK: {simState.simulatedClockMs}ms</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-200 flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
              <span>RESET RIG</span>
            </button>
            <button
              onClick={onClose}
              aria-label="Close Virtual WebXR Test Dashboard"
              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-xs font-mono text-slate-300 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              <span>CLOSE</span>
            </button>
          </div>
        </div>

        <div className="p-4 space-y-5">
          {/* Row 1: Telemetry Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 font-mono">
            <div className="bg-[#0F1623] border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400 uppercase">SESSION / PHASE</div>
              <div className="text-sm font-bold text-slate-100 mt-1 tabular-nums">
                {simState.sessionActive ? '[ACTIVE]' : '[INTERRUPTED]'}
              </div>
              <div className="text-[11px] text-cyan-300 mt-0.5 uppercase">
                PHASE: {simState.gamePhase}
              </div>
            </div>

            <div className="bg-[#0F1623] border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400 uppercase">CALIBRATION STATUS</div>
              <div className="text-sm font-bold text-slate-100 mt-1 uppercase">
                [{simState.calibration.status}]
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5 tabular-nums">
                {simState.calibration.progressPercent}% · DOM:{' '}
                {simState.calibration.profile.dominantHand.toUpperCase()}
              </div>
            </div>

            <div className="bg-[#0F1623] border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400 uppercase">ACCESSIBILITY MODE</div>
              <div className="text-sm font-bold text-slate-100 mt-1 uppercase">
                {simState.accessibility.postureMode} · {simState.accessibility.turnMode}
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5 tabular-nums">
                {simState.accessibility.referenceSpaceType} · EYE{' '}
                {simState.accessibility.measuredEyeHeightMeters.toFixed(2)}m
              </div>
            </div>

            <div className="bg-[#0F1623] border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400 uppercase">BEAM COHERENCE</div>
              <div className="text-sm font-bold text-cyan-300 mt-1 tabular-nums">
                {Math.round(simState.totalCoherence)}%
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                RECEIVER: {simState.isTargetReceiverHit ? '[LOCKED]' : '[UNALIGNED]'}
              </div>
            </div>

            <div className="bg-[#0F1623] border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400 uppercase">DEBOUNCER GUARD</div>
              <div className="text-sm font-bold text-slate-100 mt-1 tabular-nums">
                EXEC {simState.debouncerMetrics.executedCount} /{' '}
                {simState.debouncerMetrics.totalRequests}
              </div>
              <div className="text-[11px] text-amber-300 mt-0.5 tabular-nums">
                BLOCKED: {simState.debouncerMetrics.blockedCooldownCount} CD ·{' '}
                {simState.debouncerMetrics.blockedDuplicateCount} DUP
              </div>
            </div>

            <div className="bg-[#0F1623] border border-slate-800 rounded p-3">
              <div className="text-[10px] text-slate-400 uppercase">CONTROLLER DEP</div>
              <div className="text-sm font-bold text-emerald-400 mt-1 tabular-nums">
                {simState.controllerDependencyCount} REQUIRED
              </div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                WRIST MENU: {simState.wristMenuOpen ? '[OPEN]' : '[CLOSED]'}
              </div>
            </div>
          </div>

          {/* Row 2: Left & Right Virtual Hands Telemetry + Real WebXR Compatibility */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(['left', 'right'] as const).map((side) => {
              const hs = side === 'left' ? simState.leftHand : simState.rightHand;
              const isSelected = activeSide === side;
              const statusTag = !hs.frame.tracked
                ? '[LOST]'
                : hs.recovery.state === 'occluded_grace'
                ? '[OCCLUDED]'
                : hs.recovery.state === 'recovering'
                ? '[RECOVERING]'
                : '[TRACKING]';

              return (
                <div
                  key={side}
                  className={`bg-[#0F1623] border rounded p-3.5 font-mono ${
                    isSelected ? 'border-cyan-500/80' : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase">
                      <Hand className="w-4 h-4 text-cyan-400" />
                      <span>{side} XR HAND</span>
                      <span
                        className={
                          hs.frame.tracked && hs.recovery.state === 'tracking'
                            ? 'text-emerald-400'
                            : 'text-amber-400'
                        }
                      >
                        {statusTag}
                      </span>
                    </div>
                    <button
                      onClick={() => setActiveSide(side)}
                      className={`text-[10px] px-2 py-0.5 border rounded ${
                        isSelected
                          ? 'bg-cyan-950 border-cyan-400 text-cyan-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                        }`}
                    >
                      {isSelected ? 'SELECTED' : 'SELECT HAND'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-y-1.5 text-[11px] tabular-nums">
                    <span className="text-slate-400">JOINTS VALID:</span>
                    <span className="text-slate-100">{hs.frame.validJointsCount} / 25</span>

                    <span className="text-slate-400">CONFIDENCE:</span>
                    <span className="text-slate-100">
                      {Math.round(hs.frame.confidence * 100)}%
                    </span>

                    <span className="text-slate-400">RECOVERY STATE:</span>
                    <span className="text-cyan-300 uppercase">
                      {hs.recovery.state} ({hs.recovery.recoveryCount}x)
                    </span>

                    <span className="text-slate-400">PINCH STATE:</span>
                    <span className={hs.pinchState.isPinching ? 'text-emerald-400' : 'text-slate-200'}>
                      {hs.pinchState.isPinching ? 'PINCHING' : 'OPEN'} (
                      {Number.isFinite(hs.frame.pinchDistanceMeters)
                        ? `${(hs.frame.pinchDistanceMeters * 100).toFixed(1)}cm`
                        : 'N/A'}
                      )
                    </span>

                    <span className="text-slate-400">PALM UP SCORE:</span>
                    <span className="text-slate-100">{hs.frame.palmUpScore.toFixed(2)}</span>

                    <span className="text-slate-400">GRABBED CRYSTAL:</span>
                    <span className="text-amber-300 uppercase">
                      {hs.grabbedCrystalId || 'NONE'}
                    </span>

                    <span className="text-slate-400">REJECTED FRAMES:</span>
                    <span className={hs.rejectedInvalidFrames > 0 ? 'text-rose-400' : 'text-slate-200'}>
                      {hs.rejectedInvalidFrames} ({hs.lastRejectReason || 'ok'})
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Browser Real WebXR Capability Matrix */}
            <div className="bg-[#0F1623] border border-slate-800 rounded p-3.5 font-mono">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2 mb-2.5 text-xs font-bold text-slate-100 uppercase">
                <Activity className="w-4 h-4 text-amber-400" />
                <span>REAL BROWSER WEBXR FEATURE PROBE</span>
              </div>

              {compatMatrix ? (
                <div className="space-y-1.5 text-[11px] tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-400">navigator.xr:</span>
                    <span>{compatMatrix.isWebXRAvailable ? '[DETECTED]' : '[ABSENT]'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">immersive-vr:</span>
                    <span>{compatMatrix.immersiveVR ? '[SUPPORTED]' : '[UNSUPPORTED]'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">hand-tracking / XRHand:</span>
                    <span>{compatMatrix.handTracking ? '[AVAILABLE]' : '[UNCONFIRMED]'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Fallback Tier:</span>
                    <span className="text-cyan-300">{compatMatrix.activeInputFallback}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ref Spaces:</span>
                    <span>
                      {compatMatrix.supportedReferenceSpaces.length > 0
                        ? compatMatrix.supportedReferenceSpaces.join(', ')
                        : 'none'}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-800 text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>PHYSICAL HEADSET VALIDATION: NOT_TESTED</span>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-slate-400">Probing navigator.xr...</div>
              )}
            </div>
          </div>

          {/* Row 3: Interactive Simulation Controls & Failure Injection */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 font-mono">
            <div className="bg-[#0F1623] border border-slate-800 rounded p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase">
                  <Sliders className="w-4 h-4 text-cyan-400" />
                  <span>VIRTUAL RIG CONTROLS (ACTIVE HAND: {activeSide.toUpperCase()})</span>
                </div>
                <span className="text-[10px] text-slate-400 tabular-nums">
                  YAW: {Math.round((simState.headYawRadians * 180) / Math.PI)}°
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                <button
                  onClick={() => handleMoveHand(-0.08, 0, 0)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                >
                  MOVE LEFT (-8cm)
                </button>
                <button
                  onClick={() => handleMoveHand(0.08, 0, 0)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                >
                  MOVE RIGHT (+8cm)
                </button>
                <button
                  onClick={() => handleMoveHand(0, 0, -0.08)}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                >
                  EXTEND (-8cm Z)
                </button>
                <button
                  onClick={handleTogglePinch}
                  className={`px-2 py-1 border rounded ${
                    activeHandState.pinchState.isPinching
                      ? 'bg-emerald-950 border-emerald-500 text-emerald-200'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  {activeHandState.pinchState.isPinching ? 'RELEASE PINCH' : 'TRIGGER PINCH'}
                </button>
                <button
                  onClick={handleTogglePalm}
                  className={`px-2 py-1 border rounded ${
                    activeCfg.palmFacingHead
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                      : 'bg-slate-900 border-slate-700 text-slate-200'
                  }`}
                >
                  {activeCfg.palmFacingHead ? 'PALM NORMAL' : 'PALM UP'}
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px] pt-1 border-t border-slate-800/80">
                {CRYSTAL_IDS.map((cid) => (
                  <button
                    key={cid}
                    onClick={() => {
                      h.grabCrystalWithHand(activeSide, cid, `ui-grab-${Date.now()}`);
                      setSimState(h.getDashboardState());
                    }}
                    className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded uppercase"
                  >
                    GRAB {cid}
                  </button>
                ))}
                <button
                  onClick={() => {
                    h.releaseHandPinch(activeSide);
                    setSimState(h.getDashboardState());
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                >
                  RELEASE GRAB
                </button>
                <button
                  onClick={() => {
                    h.executeVRUIAction({ type: 'SNAP_TURN', deltaYawRadians: Math.PI / 4 }, activeSide);
                    setSimState(h.getDashboardState());
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                >
                  SNAP -45°
                </button>
                <button
                  onClick={() => {
                    h.executeVRUIAction({ type: 'SNAP_TURN', deltaYawRadians: -Math.PI / 4 }, activeSide);
                    setSimState(h.getDashboardState());
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded"
                >
                  SNAP +45°
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px] pt-1 border-t border-slate-800/80">
                <button
                  onClick={() => {
                    h.setPostureMode(simState.accessibility.postureMode === 'seated' ? 'standing' : 'seated');
                    setSimState(h.getDashboardState());
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded uppercase"
                >
                  POSTURE: {simState.accessibility.postureMode}
                </button>
                <button
                  onClick={() => {
                    h.setTurnMode(simState.accessibility.turnMode === 'snap' ? 'smooth' : 'snap');
                    setSimState(h.getDashboardState());
                  }}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded uppercase"
                >
                  TURN: {simState.accessibility.turnMode}
                </button>
                {REF_SPACES.map((space) => (
                  <button
                    key={space}
                    onClick={() => {
                      h.setReferenceSpace(space);
                      setSimState(h.getDashboardState());
                    }}
                    className={`px-2 py-1 border rounded ${
                      simState.accessibility.referenceSpaceType === space
                        ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {space}
                  </button>
                ))}
                <button
                  onClick={handleStepCalibration}
                  className="px-2 py-1 bg-purple-950/70 hover:bg-purple-900/70 border border-purple-500/70 text-purple-200 rounded"
                >
                  STEP CALIBRATION
                </button>
              </div>
            </div>

            {/* Failure Injection & Crystal Readout */}
            <div className="bg-[#0F1623] border border-slate-800 rounded p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>FAILURE & CORRUPTION INJECTION</span>
                </div>
                <button
                  onClick={() => {
                    h.triggerSessionInterruption();
                    setSimState(h.getDashboardState());
                  }}
                  className="text-[10px] px-2 py-0.5 bg-rose-950/70 border border-rose-500/70 text-rose-200 rounded"
                >
                  DROP XR SESSION
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {FAULTS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => handleInjectFault(f.id)}
                    className={`px-2 py-1 border rounded ${
                      activeCfg.fault === f.id
                        ? 'bg-amber-950 border-amber-400 text-amber-200'
                        : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-amber-500/60'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Crystal State Readout */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-[11px] tabular-nums">
                {simState.crystals.map((c) => (
                  <div key={c.id} className="bg-slate-950/80 border border-slate-800 rounded p-2">
                    <div className="font-bold uppercase text-slate-200">{c.id}</div>
                    <div className="text-slate-400">ROT: {c.rotationY.toFixed(3)} rad</div>
                    <div className={c.isAligned ? 'text-emerald-400' : 'text-cyan-300'}>
                      RES: {c.resonancePercent}% {c.isAligned ? '[ALIGNED]' : ''}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Row 4: Deterministic Virtual XR Test Scenarios Suite */}
          <div className="bg-[#0F1623] border border-slate-800 rounded p-3.5 font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5 mb-3">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-100 uppercase">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  VIRTUAL XR AUTOMATED VALIDATION SUITE ({passedCount}/{scenarios.length} PASS)
                </span>
              </div>
              <button
                onClick={handleRunScenarios}
                className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500 rounded text-xs text-cyan-200 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" />
                <span>RE-RUN ALL SCENARIOS</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {scenarios.map((sc) => (
                <div
                  key={sc.id}
                  className="flex flex-col justify-between bg-slate-950/70 border border-slate-800/90 rounded p-2.5 text-[11px]"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-100">{sc.name}</span>
                    <span
                      className={`shrink-0 font-bold tabular-nums ${
                        sc.passed ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {sc.passed ? '[PASS]' : '[FAIL]'} · {sc.durationMs}ms
                    </span>
                  </div>
                  <div className="text-slate-400 mt-1">{sc.summary}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Row 5: Recent Virtual Gesture & Fault Event Log */}
          <div className="bg-[#0F1623] border border-slate-800 rounded p-3.5 font-mono">
            <div className="text-xs font-bold text-slate-300 uppercase border-b border-slate-800 pb-2 mb-2">
              RECENT VIRTUAL RIG EVENTS (SESSION EPHEMERAL — ZERO BIOMETRICS STORED)
            </div>
            {simState.eventLog.length === 0 ? (
              <div className="text-[11px] text-slate-500">
                No manual virtual rig actions recorded yet. Trigger pinch, move, grab, or fault buttons above.
              </div>
            ) : (
              <div className="space-y-1 max-h-36 overflow-y-auto text-[11px] tabular-nums">
                {simState.eventLog.map((ev) => (
                  <div key={ev.id} className="flex items-center justify-between gap-2 text-slate-300">
                    <span>
                      [{ev.timestampMs}ms] {ev.source.toUpperCase()} // {ev.action}
                    </span>
                    <span className={ev.allowed ? 'text-emerald-400' : 'text-amber-400'}>
                      {ev.allowed ? 'ALLOWED' : 'BLOCKED'} · {ev.detail}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
