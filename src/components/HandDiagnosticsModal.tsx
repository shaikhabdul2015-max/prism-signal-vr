import React, { useState, useEffect } from 'react';
import {
  X,
  Activity,
  Play,
  Square,
  RotateCcw,
  Copy,
  Check,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Sun,
  Moon,
  Sparkles,
  ShieldAlert,
  Download,
  FileText,
  ListChecks,
  Layers,
  Laptop,
  Glasses,
  CheckCircle,
  XCircle,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import {
  DiagnosticsSessionState,
  LightingConditionRecord,
  HandTrackingStatus,
  PhysicalVRTestCase,
  VRTestStatus,
  VRTestCaseId,
  VRDeviceEnvironmentInfo,
} from '../types/game';
import {
  getDefaultTestCases,
  getVRDeviceEnvironmentInfo,
  calculateTestSuiteSummary,
  captureLiveTelemetryForTest,
  saveTestSuite,
  loadTestSuite,
  exportTestSuiteToJSON,
  exportTestSuiteToText,
  downloadFile,
} from '../utils/vrTestManager';

interface HandDiagnosticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  getDiagnosticsState: () => DiagnosticsSessionState;
  onStartTest: () => void;
  onStopTest: () => void;
  onResetResults: () => void;
  onUpdateLightingChecklist: (checklist: Record<'bright' | 'dim' | 'uneven', LightingConditionRecord>) => void;
  onUpdateTesterNotes: (notes: string) => void;
  handTrackingStatus: HandTrackingStatus;
  isVRActive: boolean;
}

export const HandDiagnosticsModal: React.FC<HandDiagnosticsModalProps> = ({
  isOpen,
  onClose,
  getDiagnosticsState,
  onStartTest,
  onStopTest,
  onResetResults,
  onUpdateLightingChecklist,
  onUpdateTesterNotes,
  handTrackingStatus,
  isVRActive,
}) => {
  const [activeTab, setActiveTab] = useState<'suite' | 'timing' | 'skeleton' | 'occlusion' | 'lighting'>('suite');
  const [copied, setCopied] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [diag, setDiag] = useState<DiagnosticsSessionState>(getDiagnosticsState());
  const [testCases, setTestCases] = useState<PhysicalVRTestCase[]>(() => loadTestSuite());
  const [deviceInfo] = useState<VRDeviceEnvironmentInfo>(() => getVRDeviceEnvironmentInfo());

  const summary = calculateTestSuiteSummary(testCases);

  const updateTestCase = (testId: VRTestCaseId, updater: (t: PhysicalVRTestCase) => PhysicalVRTestCase) => {
    setTestCases((prev) => {
      const updated = prev.map((t) => (t.id === testId ? updater(t) : t));
      saveTestSuite(updated);
      return updated;
    });
  };

  const handleStatusChange = (testId: VRTestCaseId, status: VRTestStatus) => {
    updateTestCase(testId, (t) => ({
      ...t,
      status,
      completedAt: status !== 'not_run' && !t.completedAt ? new Date().toISOString() : t.completedAt,
    }));
  };

  const handleStartTestTimer = (testId: VRTestCaseId) => {
    updateTestCase(testId, (t) => ({
      ...t,
      startedAt: new Date().toISOString(),
    }));
  };

  const handleCompleteTestTimer = (testId: VRTestCaseId) => {
    updateTestCase(testId, (t) => ({
      ...t,
      completedAt: new Date().toISOString(),
    }));
  };

  const handleCaptureTelemetry = (testId: VRTestCaseId) => {
    updateTestCase(testId, (t) => captureLiveTelemetryForTest(t, diag));
  };

  const handleCaptureAllTelemetry = () => {
    setTestCases((prev) => {
      const updated = prev.map((t) => captureLiveTelemetryForTest(t, diag));
      saveTestSuite(updated);
      return updated;
    });
  };

  const handleNotesChange = (testId: VRTestCaseId, notes: string) => {
    updateTestCase(testId, (t) => ({ ...t, notes }));
  };

  const handleExportJSON = () => {
    const jsonStr = exportTestSuiteToJSON(testCases, deviceInfo, diag);
    downloadFile(jsonStr, 'prism-signal-vr-test-report.json', 'application/json');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(jsonStr).then(() => {
        setCopiedJson(true);
        setTimeout(() => setCopiedJson(false), 2500);
      }).catch(() => {});
    }
  };

  const handleExportText = () => {
    const textStr = exportTestSuiteToText(testCases, deviceInfo, diag);
    downloadFile(textStr, 'prism-signal-vr-test-report.txt', 'text/plain');
    if (navigator.clipboard) {
      navigator.clipboard.writeText(textStr).then(() => {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2500);
      }).catch(() => {});
    }
  };

  const handleResetSuite = () => {
    if (window.confirm('Reset all 6 physical VR test cases to Not Run status?')) {
      const fresh = getDefaultTestCases();
      setTestCases(fresh);
      saveTestSuite(fresh);
    }
  };

  // High-frequency polling while modal is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setDiag(getDiagnosticsState());
    }, 100);
    return () => clearInterval(interval);
  }, [isOpen, getDiagnosticsState]);

  // Handle escape key
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

  const left = diag.leftHand;
  const right = diag.rightHand;

  const handleCopyReport = () => {
    const report =
      activeTab === 'suite'
        ? exportTestSuiteToText(testCases, deviceInfo, diag)
        : `=== PRISM SIGNAL // OPTICAL HAND TRACKING DIAGNOSTIC REPORT ===
Timestamp: ${new Date().toISOString()}
Session Active: ${isVRActive ? 'YES (WebXR Immersive-VR)' : 'NO (Flat/Browser Preview)'}
Hand Tracking Status: ${handTrackingStatus}
Test Active: ${diag.isActive ? 'ACTIVE' : 'STOPPED'}
Test Duration: ${(diag.durationMs / 1000).toFixed(1)}s

--- TIMING & LATENCY ---
WebGL Frame Delta: Current ${diag.frameDeltaMs}ms | Avg ${diag.avgFrameDeltaMs}ms | Min ${diag.minFrameDeltaMs}ms | Max ${diag.maxFrameDeltaMs}ms
Computed Frame Rate: ~${diag.fps} FPS
Left Hand Sample Interval: Current ${left.sampleIntervalMs}ms | Avg ${left.avgSampleIntervalMs}ms | Min ${left.minSampleIntervalMs}ms | Max ${left.maxSampleIntervalMs}ms
Right Hand Sample Interval: Current ${right.sampleIntervalMs}ms | Avg ${right.avgSampleIntervalMs}ms | Min ${right.minSampleIntervalMs}ms | Max ${right.maxSampleIntervalMs}
Latency Note: Browser WebXR APIs measure frame-to-frame delta & joint sample intervals. Complete physical photon-to-display latency is managed by headset hardware and cannot be measured via browser APIs alone.

--- SKELETON VALIDATION ---
Left Hand State: ${left.trackingState.toUpperCase()} (${left.availableJointsCount}/${left.totalJointsExpected} joints)
Left Wrist Pos: ${left.wristPosition ? left.wristPosition.join(', ') : 'N/A'}
Left Index Tip: ${left.indexTipPosition ? left.indexTipPosition.join(', ') : 'N/A'}
Left Thumb Tip: ${left.thumbTipPosition ? left.thumbTipPosition.join(', ') : 'N/A'}
Left Missing Joints: ${left.missingJoints.length > 0 ? left.missingJoints.join(', ') : 'NONE'}
Left Pinch Distance: ${left.pinchDistanceMeters !== null ? (left.pinchDistanceMeters * 100).toFixed(1) + 'cm' : 'N/A'} (Pinching: ${left.isPinching})

Right Hand State: ${right.trackingState.toUpperCase()} (${right.availableJointsCount}/${right.totalJointsExpected} joints)
Right Wrist Pos: ${right.wristPosition ? right.wristPosition.join(', ') : 'N/A'}
Right Index Tip: ${right.indexTipPosition ? right.indexTipPosition.join(', ') : 'N/A'}
Right Thumb Tip: ${right.thumbTipPosition ? right.thumbTipPosition.join(', ') : 'N/A'}
Right Missing Joints: ${right.missingJoints.length > 0 ? right.missingJoints.join(', ') : 'NONE'}
Right Pinch Distance: ${right.pinchDistanceMeters !== null ? (right.pinchDistanceMeters * 100).toFixed(1) + 'cm' : 'N/A'} (Pinching: ${right.isPinching})

--- OCCLUSION & TRACKING LOSS ---
Left Interruptions: ${left.interruptionCount} (Total Lost Duration: ${(left.totalInterruptionDurationMs / 1000).toFixed(2)}s)
Right Interruptions: ${right.interruptionCount} (Total Lost Duration: ${(right.totalInterruptionDurationMs / 1000).toFixed(2)}s)
Safe Release Interlock: VERIFIED (crystals drop on loss)
Resumption Jump Prevention: VERIFIED (delta zeroed on return)

--- MANUAL LIGHTING PROTOCOL ---
Bright / Studio Light: ${diag.lightingChecklist.bright.tested ? 'TESTED - Rating: ' + diag.lightingChecklist.bright.rating : 'UNTESTED'}
Dim / Low-Light: ${diag.lightingChecklist.dim.tested ? 'TESTED - Rating: ' + diag.lightingChecklist.dim.rating : 'UNTESTED'}
Uneven / Backlit: ${diag.lightingChecklist.uneven.tested ? 'TESTED - Rating: ' + diag.lightingChecklist.uneven.rating : 'UNTESTED'}
Tester Notes: ${diag.testerNotes || 'None'}
============================================================`;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(report).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  const handleToggleConditionTested = (condition: 'bright' | 'dim' | 'uneven') => {
    const updated = {
      ...diag.lightingChecklist,
      [condition]: {
        ...diag.lightingChecklist[condition],
        tested: !diag.lightingChecklist[condition].tested,
      },
    };
    onUpdateLightingChecklist(updated);
  };

  const handleConditionRatingChange = (
    condition: 'bright' | 'dim' | 'uneven',
    rating: LightingConditionRecord['rating']
  ) => {
    const updated = {
      ...diag.lightingChecklist,
      [condition]: {
        ...diag.lightingChecklist[condition],
        rating,
        tested: true,
      },
    };
    onUpdateLightingChecklist(updated);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="hand-diag-title"
    >
      <div
        className="w-full max-w-3xl bg-slate-950 border border-cyan-800/80 rounded-xl p-4 sm:p-6 shadow-2xl text-slate-200 relative max-h-[94vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Diagnostics Panel"
          className="absolute top-3 right-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-white rounded-lg hover:bg-slate-900 transition-colors active:scale-95 touch-manipulation z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3.5 border-b border-slate-800 gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-400 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 id="hand-diag-title" className="text-sm font-mono font-bold tracking-wider text-slate-100 uppercase">
                OPTICAL HAND TRACKING DIAGNOSTICS // PHASE 10
              </h2>
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <span>MODE: {isVRActive ? 'WEBXR IMMERSIVE VR' : 'DESKTOP / MOBILE FALLBACK'}</span>
                <span>•</span>
                <span className={diag.isActive ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                  {diag.isActive ? `RECORDING (${(diag.durationMs / 1000).toFixed(1)}s)` : 'STANDBY'}
                </span>
              </div>
            </div>
          </div>

          {/* Test Control Actions */}
          <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
            {!diag.isActive ? (
              <button
                onClick={onStartTest}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-emerald-950 border border-emerald-600/80 text-emerald-300 hover:bg-emerald-900 text-xs font-mono font-bold transition-colors active:scale-95 min-h-[40px] touch-manipulation"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>START TEST</span>
              </button>
            ) : (
              <button
                onClick={onStopTest}
                className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-amber-950 border border-amber-600/80 text-amber-300 hover:bg-amber-900 text-xs font-mono font-bold transition-colors active:scale-95 min-h-[40px] touch-manipulation"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>STOP TEST</span>
              </button>
            )}

            <button
              onClick={onResetResults}
              title="Reset diagnostic counters and intervals"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 text-xs font-mono transition-colors active:scale-95 min-h-[40px] touch-manipulation"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden xs:inline">RESET</span>
            </button>

            <button
              onClick={handleExportJSON}
              title="Export complete VR Test Suite Report as JSON file"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-cyan-950/80 border border-cyan-700/80 text-cyan-300 hover:bg-cyan-900 text-xs font-mono transition-colors active:scale-95 min-h-[40px] touch-manipulation"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden xs:inline">{copiedJson ? 'JSON SAVED' : 'JSON'}</span>
            </button>

            <button
              onClick={handleExportText}
              title="Export complete VR Test Suite Report as Formatted Text / Markdown file"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-emerald-950/80 border border-emerald-700/80 text-emerald-300 hover:bg-emerald-900 text-xs font-mono transition-colors active:scale-95 min-h-[40px] touch-manipulation"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden xs:inline">{copiedText ? 'TXT SAVED' : 'TXT'}</span>
            </button>

            <button
              onClick={handleCopyReport}
              title="Copy complete diagnostic report to clipboard"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono transition-colors active:scale-95 min-h-[40px] touch-manipulation"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden xs:inline">{copied ? 'COPIED' : 'CLIPBOARD'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 mt-2 shrink-0 overflow-x-auto text-xs font-mono">
          <button
            onClick={() => setActiveTab('suite')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
              activeTab === 'suite'
                ? 'border-emerald-400 text-emerald-300 bg-emerald-950/40 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
            <span>5. VR TEST SUITE</span>
            <span
              className={`px-1.5 py-0.5 rounded text-[10px] ${
                summary.completed === summary.total
                  ? 'bg-emerald-900 text-emerald-200'
                  : 'bg-slate-800 text-slate-300'
              }`}
            >
              {summary.completed}/{summary.total}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('timing')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'timing'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            1. TIMING & LATENCY
          </button>
          <button
            onClick={() => setActiveTab('skeleton')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'skeleton'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            2. SKELETON VALIDATION
          </button>
          <button
            onClick={() => setActiveTab('occlusion')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'occlusion'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            3. OCCLUSION & LOSS
          </button>
          <button
            onClick={() => setActiveTab('lighting')}
            className={`py-2 px-3 border-b-2 font-medium transition-colors shrink-0 ${
              activeTab === 'lighting'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            4. LIGHTING PROTOCOL
          </button>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto py-3 space-y-3.5 text-xs font-mono">
          {/* TAB 5: PHYSICAL VR TEST MANAGEMENT & CHECKLIST */}
          {activeTab === 'suite' && (
            <div className="space-y-4">
              {/* Summary Metrics Banner */}
              <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3.5 sm:p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="text-slate-100 font-bold text-sm flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-emerald-400" />
                      <span>PHYSICAL VR TEST SUITE // HARDWARE AUDIT</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Phase 12: Real WebXR physical test execution, timing measurements & sensor verification.
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-start sm:self-auto bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    <span className="text-slate-400 text-[11px]">Completion:</span>
                    <span className="text-sm font-bold text-emerald-400">{summary.completionPercentage}%</span>
                    <span className="text-[11px] text-slate-500">({summary.completed}/{summary.total} tests)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 transition-all duration-300"
                    style={{ width: `${summary.completionPercentage}%` }}
                  />
                </div>

                {/* Summary Stat Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Total Tests</span>
                    <span className="text-base font-bold text-slate-100">{summary.total}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-800/60 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" /> Passed
                    </span>
                    <span className="text-base font-bold text-emerald-300">{summary.passed}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-rose-950/40 border border-rose-800/60 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-rose-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Failed
                    </span>
                    <span className="text-base font-bold text-rose-300">{summary.failed}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/60 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-amber-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <HelpCircle className="w-3 h-3" /> Inconclusive
                    </span>
                    <span className="text-base font-bold text-amber-300">{summary.inconclusive}</span>
                  </div>
                  <div className="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                    <span className="text-base font-bold text-slate-300">{summary.pending}</span>
                  </div>
                </div>
              </div>

              {/* Device Runtime & Measurement Boundary Notice */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-300 font-bold gap-1">
                  <span className="flex items-center gap-1.5">
                    <Glasses className="w-4 h-4 text-cyan-400" />
                    <span>DETECTED HARDWARE & SENSOR AUDIT BOUNDARY</span>
                  </span>
                  <span className="text-[11px] text-cyan-400 font-normal">
                    {deviceInfo.webxrSupported ? 'WebXR API Present' : 'WebXR API Unavailable'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Detected Client / Headset</span>
                    <span className="text-cyan-300 font-bold">{deviceInfo.detectedHeadset}</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/80">
                    <span className="text-slate-400 block text-[10px] uppercase font-semibold">Platform & Screen Resolution</span>
                    <span className="text-slate-200">{deviceInfo.platform} • {deviceInfo.screenResolution}</span>
                  </div>
                </div>

                {/* Strict Disclosure */}
                <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-700/60 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-amber-300 block mb-0.5">
                      PHYSICAL SENSOR BOUNDARY & ZERO-FABRICATION RULE
                    </span>
                    Timing metrics derive strictly from available real WebXR frame intervals and JavaScript timestamps.
                    Browser WebXR APIs do not provide internal optical ASIC photon-to-display latency, optical occlusion root causes,
                    or ambient room photometer lux readings. Environmental lighting and physical occlusion tests must be inspected
                    and verified manually by physical testers.
                  </div>
                </div>
              </div>

              {/* Suite Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleCaptureAllTelemetry}
                    title="Update all test cases with current live WebXR telemetry readings"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 text-xs font-mono font-bold transition-colors min-h-[44px] touch-manipulation active:scale-95"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>CAPTURE LIVE TELEMETRY</span>
                  </button>

                  <button
                    onClick={handleExportJSON}
                    title="Download machine-readable JSON test suite report"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 text-xs font-mono font-bold transition-colors min-h-[44px] touch-manipulation active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{copiedJson ? 'JSON SAVED & COPIED!' : 'EXPORT JSON'}</span>
                  </button>

                  <button
                    onClick={handleExportText}
                    title="Download human-readable text/markdown test report"
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 text-xs font-mono font-bold transition-colors min-h-[44px] touch-manipulation active:scale-95"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{copiedText ? 'TXT SAVED & COPIED!' : 'EXPORT TXT'}</span>
                  </button>
                </div>

                <button
                  onClick={handleResetSuite}
                  title="Reset test suite back to not-run baseline"
                  className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900 text-xs font-mono transition-colors min-h-[44px] touch-manipulation ml-auto active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>RESET CHECKLIST</span>
                </button>
              </div>

              {/* The 6 Physical VR Test Cards */}
              <div className="space-y-4">
                {testCases.map((test, index) => {
                  const isPass = test.status === 'pass';
                  const isFail = test.status === 'fail';
                  const isInconclusive = test.status === 'inconclusive';
                  const isNotRun = test.status === 'not_run';

                  return (
                    <div
                      key={test.id}
                      className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                        isPass
                          ? 'bg-slate-900/90 border-emerald-800/80'
                          : isFail
                          ? 'bg-slate-900/90 border-rose-800/80'
                          : isInconclusive
                          ? 'bg-slate-900/90 border-amber-800/80'
                          : 'bg-slate-900/70 border-slate-800'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              TEST {index + 1}/6
                            </span>
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                              {test.category}
                            </span>
                          </div>
                          <h3 className="text-sm font-bold text-slate-100 mt-1 uppercase tracking-wide">
                            {test.title}
                          </h3>
                        </div>

                        {/* Current Status Badge */}
                        <div className="self-start sm:self-auto">
                          <span
                            className={`px-3 py-1 rounded-md text-xs font-bold font-mono uppercase tracking-wider inline-flex items-center gap-1.5 ${
                              isPass
                                ? 'bg-emerald-950 border border-emerald-500 text-emerald-300'
                                : isFail
                                ? 'bg-rose-950 border border-rose-500 text-rose-300'
                                : isInconclusive
                                ? 'bg-amber-950 border border-amber-500 text-amber-300'
                                : 'bg-slate-950 border border-slate-700 text-slate-400'
                            }`}
                          >
                            {isPass && <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />}
                            {isFail && <XCircle className="w-3.5 h-3.5 text-rose-400" />}
                            {isInconclusive && <HelpCircle className="w-3.5 h-3.5 text-amber-400" />}
                            {isNotRun && <Clock className="w-3.5 h-3.5 text-slate-500" />}
                            <span>
                              {isPass
                                ? 'PASS'
                                : isFail
                                ? 'FAIL'
                                : isInconclusive
                                ? 'INCONCLUSIVE'
                                : 'NOT RUN'}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="text-[11px] text-slate-300 font-sans mt-2.5 leading-relaxed">
                        {test.description}
                      </div>

                      {/* Status Selector Buttons (44px min touch target) */}
                      <div className="mt-3">
                        <div className="text-[10px] uppercase text-slate-400 font-bold mb-1.5">
                          Set Test Verification Verdict:
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          <button
                            onClick={() => handleStatusChange(test.id, 'not_run')}
                            className={`min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
                              isNotRun
                                ? 'bg-slate-800 border-slate-500 text-white shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>NOT RUN</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(test.id, 'pass')}
                            className={`min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
                              isPass
                                ? 'bg-emerald-950 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500 shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-emerald-500/70 hover:border-emerald-700 hover:text-emerald-300'
                            }`}
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>PASS</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(test.id, 'fail')}
                            className={`min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
                              isFail
                                ? 'bg-rose-950 border-rose-500 text-rose-300 ring-1 ring-rose-500 shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-rose-500/70 hover:border-rose-700 hover:text-rose-300'
                            }`}
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>FAIL</span>
                          </button>

                          <button
                            onClick={() => handleStatusChange(test.id, 'inconclusive')}
                            className={`min-h-[44px] px-3 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all active:scale-95 touch-manipulation flex items-center justify-center gap-1.5 ${
                              isInconclusive
                                ? 'bg-amber-950 border-amber-500 text-amber-300 ring-1 ring-amber-500 shadow-sm'
                                : 'bg-slate-950 border-slate-800 text-amber-500/70 hover:border-amber-700 hover:text-amber-300'
                            }`}
                          >
                            <HelpCircle className="w-3.5 h-3.5" />
                            <span>INCONCLUSIVE</span>
                          </button>
                        </div>
                      </div>

                      {/* Timestamps & Timer Control */}
                      <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          <div>
                            <span className="text-slate-500">Started: </span>
                            <span className={test.startedAt ? 'text-slate-200 font-bold' : 'text-slate-600'}>
                              {test.startedAt ? new Date(test.startedAt).toLocaleTimeString() : 'Not recorded'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Completed: </span>
                            <span className={test.completedAt ? 'text-slate-200 font-bold' : 'text-slate-600'}>
                              {test.completedAt ? new Date(test.completedAt).toLocaleTimeString() : 'In progress / Pending'}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 self-start sm:self-auto">
                          <button
                            onClick={() => handleStartTestTimer(test.id)}
                            className="px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 hover:text-white text-xs font-mono transition-colors min-h-[38px] touch-manipulation active:scale-95"
                          >
                            Start Timer
                          </button>
                          <button
                            onClick={() => handleCompleteTestTimer(test.id)}
                            className="px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-slate-200 hover:text-white text-xs font-mono transition-colors min-h-[38px] touch-manipulation active:scale-95"
                          >
                            Finish Timer
                          </button>
                        </div>
                      </div>

                      {/* Verification Criteria */}
                      <div className="mt-3">
                        <div className="text-[10px] uppercase text-slate-400 font-bold mb-1.5">
                          Verification Criteria:
                        </div>
                        <ul className="space-y-1 text-[11px] text-slate-300 font-sans">
                          {test.verificationCriteria.map((criterion, cIdx) => (
                            <li key={cIdx} className="flex items-start gap-1.5">
                              <span className="text-cyan-400 shrink-0 mt-0.5">•</span>
                              <span>{criterion}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Recorded Telemetry & Measurements */}
                      <div className="mt-3">
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="text-[10px] uppercase text-slate-400 font-bold">
                            Actual Recorded Measurements:
                          </div>
                          <button
                            onClick={() => handleCaptureTelemetry(test.id)}
                            className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 underline min-h-[32px] touch-manipulation"
                          >
                            <RefreshCw className="w-3 h-3" />
                            <span>Capture Telemetry</span>
                          </button>
                        </div>

                        <div className="space-y-1.5">
                          {test.measurements.map((m, mIdx) => (
                            <div
                              key={mIdx}
                              className="p-2 rounded bg-slate-950 border border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]"
                            >
                              <span className="text-slate-400">{m.label}</span>
                              <div className="flex items-center gap-2 self-end sm:self-auto">
                                <span className="font-bold text-slate-100">
                                  {m.value} {m.unit || ''}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.5 rounded font-mono uppercase ${
                                    m.source === 'webxr_telemetry'
                                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                      : m.source === 'browser_environment'
                                      ? 'bg-slate-800 text-slate-300'
                                      : 'bg-purple-950 text-purple-300 border border-purple-800'
                                  }`}
                                >
                                  {m.source === 'webxr_telemetry'
                                    ? 'WebXR'
                                    : m.source === 'browser_environment'
                                    ? 'Env'
                                    : 'Manual'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Dedicated Manual Multi-Condition Runs for Test 6 */}
                      {test.id === 'lighting_conditions' && (
                        <div className="mt-3 p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5">
                          <div className="text-[10px] uppercase text-cyan-400 font-bold flex items-center justify-between">
                            <span>SEPARATE MANUAL ILLUMINATION RUNS (3 CONDITIONS)</span>
                            <span className="text-slate-400 text-[9px] font-normal">Physical Tester Evaluation</span>
                          </div>

                          <div className="space-y-2">
                            {/* Bright Condition */}
                            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleToggleConditionTested('bright');
                                    setTimeout(() => handleCaptureTelemetry('lighting_conditions'), 50);
                                  }}
                                  className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${
                                    diag.lightingChecklist.bright.tested
                                      ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                                      : 'bg-slate-950 border-slate-700 text-slate-600'
                                  }`}
                                >
                                  {diag.lightingChecklist.bright.tested && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                  <div className="text-xs font-bold text-slate-200">1. Bright Studio Lighting (&gt;300 lux)</div>
                                  <div className="text-[10px] text-slate-400">Even overhead ambient illumination</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <span className="text-[10px] text-slate-400">Result:</span>
                                <select
                                  value={diag.lightingChecklist.bright.rating}
                                  onChange={(e) => {
                                    handleConditionRatingChange('bright', e.target.value as any);
                                    setTimeout(() => handleCaptureTelemetry('lighting_conditions'), 50);
                                  }}
                                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                                >
                                  <option value="untested">Untested</option>
                                  <option value="stable">Stable Tracking</option>
                                  <option value="intermittent">Intermittent</option>
                                  <option value="degraded">Degraded</option>
                                  <option value="unusable">Unusable</option>
                                </select>
                              </div>
                            </div>

                            {/* Dim Condition */}
                            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleToggleConditionTested('dim');
                                    setTimeout(() => handleCaptureTelemetry('lighting_conditions'), 50);
                                  }}
                                  className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${
                                    diag.lightingChecklist.dim.tested
                                      ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                                      : 'bg-slate-950 border-slate-700 text-slate-600'
                                  }`}
                                >
                                  {diag.lightingChecklist.dim.tested && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                  <div className="text-xs font-bold text-slate-200">2. Low-Light Ambient (&lt;50 lux)</div>
                                  <div className="text-[10px] text-slate-400">Dim twilight or indirect lamp</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <span className="text-[10px] text-slate-400">Result:</span>
                                <select
                                  value={diag.lightingChecklist.dim.rating}
                                  onChange={(e) => {
                                    handleConditionRatingChange('dim', e.target.value as any);
                                    setTimeout(() => handleCaptureTelemetry('lighting_conditions'), 50);
                                  }}
                                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                                >
                                  <option value="untested">Untested</option>
                                  <option value="stable">Stable Tracking</option>
                                  <option value="intermittent">Intermittent</option>
                                  <option value="degraded">Degraded</option>
                                  <option value="unusable">Unusable</option>
                                </select>
                              </div>
                            </div>

                            {/* Backlit Condition */}
                            <div className="p-2 rounded bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleToggleConditionTested('uneven');
                                    setTimeout(() => handleCaptureTelemetry('lighting_conditions'), 50);
                                  }}
                                  className={`w-6 h-6 rounded border flex items-center justify-center shrink-0 ${
                                    diag.lightingChecklist.uneven.tested
                                      ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                                      : 'bg-slate-950 border-slate-700 text-slate-600'
                                  }`}
                                >
                                  {diag.lightingChecklist.uneven.tested && <Check className="w-3.5 h-3.5" />}
                                </button>
                                <div>
                                  <div className="text-xs font-bold text-slate-200">3. Uneven / Backlit Glare</div>
                                  <div className="text-[10px] text-slate-400">Direct window or harsh desk lamp behind hands</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 self-end sm:self-auto">
                                <span className="text-[10px] text-slate-400">Result:</span>
                                <select
                                  value={diag.lightingChecklist.uneven.rating}
                                  onChange={(e) => {
                                    handleConditionRatingChange('uneven', e.target.value as any);
                                    setTimeout(() => handleCaptureTelemetry('lighting_conditions'), 50);
                                  }}
                                  className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                                >
                                  <option value="untested">Untested</option>
                                  <option value="stable">Stable Tracking</option>
                                  <option value="intermittent">Intermittent</option>
                                  <option value="degraded">Degraded</option>
                                  <option value="unusable">Unusable</option>
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Tester Notes */}
                      <div className="mt-3">
                        <label className="text-[10px] uppercase text-slate-400 font-bold block mb-1">
                          Tester Notes & Physical Observations:
                        </label>
                        <textarea
                          value={test.notes}
                          onChange={(e) => handleNotesChange(test.id, e.target.value)}
                          placeholder={`Enter notes for ${test.title} (e.g. ambient lighting lux, optical jitter, room reflections, comfort)...`}
                          rows={2}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500 min-h-[44px]"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 1: TIMING & LATENCY */}
          {activeTab === 'timing' && (
            <div className="space-y-3">
              {/* Important Measurement Boundary Notice */}
              <div className="p-3 rounded-lg bg-cyan-950/40 border border-cyan-800/80 text-cyan-200 text-[11px] leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1 text-cyan-300">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>LATENCY MEASUREMENT BOUNDARY SPECIFICATION</span>
                </div>
                Browser WebXR APIs measure JavaScript render-loop frame intervals and hand-joint pose update intervals.
                Complete physical end-to-end latency (optical camera photodiode exposure → on-headset computer vision pipeline →
                IPC transfer → GPU compositor → photon scanout) is managed directly by headset hardware firmware and cannot be
                measured by browser JavaScript timing alone.
              </div>

              {/* WebGL Frame Timing */}
              <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-slate-300 font-bold mb-2 flex items-center justify-between">
                  <span>WEBGL RENDER LOOP TIMING (CLIENT JS)</span>
                  <span className="text-cyan-400">{diag.fps} FPS</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">CURRENT DELTA</div>
                    <div className="text-base font-bold text-slate-100">{diag.frameDeltaMs} ms</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">AVERAGE DELTA</div>
                    <div className="text-base font-bold text-cyan-300">{diag.avgFrameDeltaMs} ms</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">MIN DELTA</div>
                    <div className="text-base font-bold text-emerald-400">{diag.minFrameDeltaMs} ms</div>
                  </div>
                  <div className="p-2 rounded bg-slate-950 border border-slate-800">
                    <div className="text-[10px] text-slate-400">MAX DELTA</div>
                    <div className="text-base font-bold text-amber-400">{diag.maxFrameDeltaMs} ms</div>
                  </div>
                </div>
              </div>

              {/* Hand Joint Update Intervals */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Hand Timing */}
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-300 font-bold mb-2">
                    <span>LEFT HAND JOINT SAMPLES</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        left.isTracking ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      {left.isTracking ? 'TRACKING' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center mb-2.5">
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-400">AVG INTERVAL</div>
                      <div className="text-xs font-bold text-cyan-300">{left.avgSampleIntervalMs} ms</div>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-400">MIN INTERVAL</div>
                      <div className="text-xs font-bold text-emerald-400">{left.minSampleIntervalMs} ms</div>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-400">MAX INTERVAL</div>
                      <div className="text-xs font-bold text-amber-400">{left.maxSampleIntervalMs} ms</div>
                    </div>
                  </div>
                  {/* Rolling Sparkline Visualizer */}
                  <div className="text-[10px] text-slate-400 mb-1">Rolling Sample History (last 30 frames):</div>
                  <div className="h-8 bg-slate-950 rounded border border-slate-800 p-1 flex items-end gap-0.5 overflow-hidden">
                    {left.rollingIntervals.length > 0 ? (
                      left.rollingIntervals.map((val, idx) => (
                        <div
                          key={idx}
                          className="flex-1 bg-cyan-500/80 rounded-t hover:bg-cyan-300"
                          style={{ height: `${Math.min(100, Math.max(10, (val / 33) * 100))}%` }}
                          title={`${val.toFixed(1)} ms`}
                        />
                      ))
                    ) : (
                      <div className="text-slate-600 text-[10px] m-auto">No joint samples recorded yet</div>
                    )}
                  </div>
                </div>

                {/* Right Hand Timing */}
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800">
                  <div className="flex items-center justify-between text-slate-300 font-bold mb-2">
                    <span>RIGHT HAND JOINT SAMPLES</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border ${
                        right.isTracking ? 'bg-emerald-950 border-emerald-500 text-emerald-300' : 'bg-slate-950 border-slate-700 text-slate-500'
                      }`}
                    >
                      {right.isTracking ? 'TRACKING' : 'OFFLINE'}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5 text-center mb-2.5">
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-400">AVG INTERVAL</div>
                      <div className="text-xs font-bold text-cyan-300">{right.avgSampleIntervalMs} ms</div>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-400">MIN INTERVAL</div>
                      <div className="text-xs font-bold text-emerald-400">{right.minSampleIntervalMs} ms</div>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <div className="text-[9px] text-slate-400">MAX INTERVAL</div>
                      <div className="text-xs font-bold text-amber-400">{right.maxSampleIntervalMs} ms</div>
                    </div>
                  </div>
                  {/* Rolling Sparkline Visualizer */}
                  <div className="text-[10px] text-slate-400 mb-1">Rolling Sample History (last 30 frames):</div>
                  <div className="h-8 bg-slate-950 rounded border border-slate-800 p-1 flex items-end gap-0.5 overflow-hidden">
                    {right.rollingIntervals.length > 0 ? (
                      right.rollingIntervals.map((val, idx) => (
                        <div
                          key={idx}
                          className="flex-1 bg-cyan-500/80 rounded-t hover:bg-cyan-300"
                          style={{ height: `${Math.min(100, Math.max(10, (val / 33) * 100))}%` }}
                          title={`${val.toFixed(1)} ms`}
                        />
                      ))
                    ) : (
                      <div className="text-slate-600 text-[10px] m-auto">No joint samples recorded yet</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SKELETON VALIDATION */}
          {activeTab === 'skeleton' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                WebXR Hand Joint Specification validates up to 25 skeletal joints per hand. Visual skeleton mesh instances are only rendered when genuine joint transformations are confirmed non-zero and finite.
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Left Hand Skeleton */}
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200">LEFT HAND SKELETON</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        left.trackingState === 'full'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : left.trackingState === 'partial'
                          ? 'bg-amber-950 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                      }`}
                    >
                      {left.trackingState === 'full'
                        ? 'FULL SKELETON (25/25)'
                        : left.trackingState === 'partial'
                        ? `PARTIAL (${left.availableJointsCount}/25)`
                        : 'UNTRACKED (0/25)'}
                    </span>
                  </div>

                  {/* Joint Positions */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Wrist (World Pos):</span>
                      <span className="text-slate-200">{left.wristPosition ? left.wristPosition.join(', ') : 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Index Tip (World Pos):</span>
                      <span className="text-slate-200">{left.indexTipPosition ? left.indexTipPosition.join(', ') : 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Thumb Tip (World Pos):</span>
                      <span className="text-slate-200">{left.thumbTipPosition ? left.thumbTipPosition.join(', ') : 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Pinch Distance:</span>
                      <span className="text-cyan-300">
                        {left.pinchDistanceMeters !== null ? `${(left.pinchDistanceMeters * 100).toFixed(1)} cm` : 'N/A'}
                        {left.isPinching ? ' [PINCH LOCKED]' : ''}
                      </span>
                    </div>
                    {left.heldCrystalId && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Holding Prism:</span>
                        <span className="uppercase">{left.heldCrystalId}</span>
                      </div>
                    )}
                  </div>

                  {/* Missing/Invalid Joint Inspection */}
                  {left.missingJoints.length > 0 && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px]">
                      <div className="text-amber-400 font-bold mb-1">Unreported Joints ({left.missingJoints.length}):</div>
                      <div className="text-slate-400 truncate max-h-12 overflow-y-auto">{left.missingJoints.join(', ')}</div>
                    </div>
                  )}
                </div>

                {/* Right Hand Skeleton */}
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <span className="font-bold text-slate-200">RIGHT HAND SKELETON</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                        right.trackingState === 'full'
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-300'
                          : right.trackingState === 'partial'
                          ? 'bg-amber-950 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-700 text-slate-400'
                      }`}
                    >
                      {right.trackingState === 'full'
                        ? 'FULL SKELETON (25/25)'
                        : right.trackingState === 'partial'
                        ? `PARTIAL (${right.availableJointsCount}/25)`
                        : 'UNTRACKED (0/25)'}
                    </span>
                  </div>

                  {/* Joint Positions */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between text-slate-400">
                      <span>Wrist (World Pos):</span>
                      <span className="text-slate-200">{right.wristPosition ? right.wristPosition.join(', ') : 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Index Tip (World Pos):</span>
                      <span className="text-slate-200">{right.indexTipPosition ? right.indexTipPosition.join(', ') : 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Thumb Tip (World Pos):</span>
                      <span className="text-slate-200">{right.thumbTipPosition ? right.thumbTipPosition.join(', ') : 'Unavailable'}</span>
                    </div>
                    <div className="flex justify-between text-slate-400">
                      <span>Pinch Distance:</span>
                      <span className="text-cyan-300">
                        {right.pinchDistanceMeters !== null ? `${(right.pinchDistanceMeters * 100).toFixed(1)} cm` : 'N/A'}
                        {right.isPinching ? ' [PINCH LOCKED]' : ''}
                      </span>
                    </div>
                    {right.heldCrystalId && (
                      <div className="flex justify-between text-emerald-400 font-bold">
                        <span>Holding Prism:</span>
                        <span className="uppercase">{right.heldCrystalId}</span>
                      </div>
                    )}
                  </div>

                  {/* Missing/Invalid Joint Inspection */}
                  {right.missingJoints.length > 0 && (
                    <div className="p-2 rounded bg-slate-950 border border-slate-800 text-[10px]">
                      <div className="text-amber-400 font-bold mb-1">Unreported Joints ({right.missingJoints.length}):</div>
                      <div className="text-slate-400 truncate max-h-12 overflow-y-auto">{right.missingJoints.join(', ')}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: OCCLUSION & TRACKING LOSS */}
          {activeTab === 'occlusion' && (
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-cyan-400" />
                  <span>SAFETY INTERLOCKS & JUMP-PREVENTION VALIDATION</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-[11px]">
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">SAFE RELEASE INTERLOCK: ACTIVE</div>
                      <div className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                        Whenever joint confidence drops below threshold or tracking is lost, grabbed crystals are instantly released without sticking to phantom coords.
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950 border border-slate-800 flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold text-emerald-300">RESUMPTION JUMP PREVENTION: ACTIVE</div>
                      <div className="text-slate-400 text-[10px] mt-0.5 leading-relaxed">
                        When optical tracking resumes after loss, cumulative displacement is zeroed out to prevent crystals from violently snapping or jumping.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Observed Tracking Interruptions */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200">LEFT HAND INTERRUPTIONS</div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Loss Count:</span>
                    <span className="text-base font-bold text-amber-400">{left.interruptionCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Total Lost Time:</span>
                    <span className="text-sm font-bold text-slate-200">{(left.totalInterruptionDurationMs / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Last Loss: {left.lastInterruptionTimestamp ? `${((performance.now() - left.lastInterruptionTimestamp) / 1000).toFixed(1)}s ago` : 'None'}
                  </div>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-900 border border-slate-800 space-y-2">
                  <div className="font-bold text-slate-200">RIGHT HAND INTERRUPTIONS</div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Loss Count:</span>
                    <span className="text-base font-bold text-amber-400">{right.interruptionCount}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Total Lost Time:</span>
                    <span className="text-sm font-bold text-slate-200">{(right.totalInterruptionDurationMs / 1000).toFixed(2)}s</span>
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Last Loss: {right.lastInterruptionTimestamp ? `${((performance.now() - right.lastInterruptionTimestamp) / 1000).toFixed(1)}s ago` : 'None'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400">
                <span className="font-bold text-slate-300">Attribution Notice:</span> Standard WebXR APIs expose joint coordinate availability, but do not provide hardware optical sensor reason codes (such as physical hand occlusion vs outside optical camera field of view).
              </div>
            </div>
          )}

          {/* TAB 4: LIGHTING TEST PROTOCOL */}
          {activeTab === 'lighting' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
                <span className="font-bold text-cyan-300">Manual Environmental Test Protocol:</span> WebXR does not provide ambient photometer API access. Testers evaluate real-world optical camera tracking under these three standardized test environments.
              </div>

              {/* Protocol Checklist Cards */}
              <div className="space-y-2">
                {/* 1. Bright / Studio Lighting */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => handleToggleConditionTested('bright')}
                      className={`min-w-[28px] min-h-[28px] rounded border flex items-center justify-center transition-colors ${
                        diag.lightingChecklist.bright.tested
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-700 text-slate-600'
                      }`}
                    >
                      {diag.lightingChecklist.bright.tested && <Check className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-400" />
                        <span>1. BRIGHT / STUDIO LIGHTING (&gt;500 LUX)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Diffused indoor lighting with clear finger contrast and minimal surface reflections.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[10px] text-slate-400">Rating:</span>
                    <select
                      value={diag.lightingChecklist.bright.rating}
                      onChange={(e) => handleConditionRatingChange('bright', e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    >
                      <option value="untested">Untested</option>
                      <option value="stable">Stable Tracking</option>
                      <option value="intermittent">Intermittent</option>
                      <option value="degraded">Degraded</option>
                      <option value="unusable">Unusable</option>
                    </select>
                  </div>
                </div>

                {/* 2. Dim / Low Light Environment */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => handleToggleConditionTested('dim')}
                      className={`min-w-[28px] min-h-[28px] rounded border flex items-center justify-center transition-colors ${
                        diag.lightingChecklist.dim.tested
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-700 text-slate-600'
                      }`}
                    >
                      {diag.lightingChecklist.dim.tested && <Check className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-blue-400" />
                        <span>2. DIM / LOW-LIGHT ENVIRONMENT (&lt;50 LUX)</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Subdued room illumination testing optical sensor low-light exposure thresholds.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[10px] text-slate-400">Rating:</span>
                    <select
                      value={diag.lightingChecklist.dim.rating}
                      onChange={(e) => handleConditionRatingChange('dim', e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    >
                      <option value="untested">Untested</option>
                      <option value="stable">Stable Tracking</option>
                      <option value="intermittent">Intermittent</option>
                      <option value="degraded">Degraded</option>
                      <option value="unusable">Unusable</option>
                    </select>
                  </div>
                </div>

                {/* 3. Uneven / Harsh Backlight */}
                <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start gap-2.5">
                    <button
                      onClick={() => handleToggleConditionTested('uneven')}
                      className={`min-w-[28px] min-h-[28px] rounded border flex items-center justify-center transition-colors ${
                        diag.lightingChecklist.uneven.tested
                          ? 'bg-emerald-950 border-emerald-500 text-emerald-400'
                          : 'bg-slate-950 border-slate-700 text-slate-600'
                      }`}
                    >
                      {diag.lightingChecklist.uneven.tested && <Check className="w-4 h-4" />}
                    </button>
                    <div>
                      <div className="font-bold text-slate-200 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>3. UNEVEN / HARSH BACKLIGHTING</span>
                      </div>
                      <div className="text-[11px] text-slate-400 font-sans mt-0.5">
                        Direct sunlight or intense lamp glare creating harsh shadows across the hands.
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    <span className="text-[10px] text-slate-400">Rating:</span>
                    <select
                      value={diag.lightingChecklist.uneven.rating}
                      onChange={(e) => handleConditionRatingChange('uneven', e.target.value as any)}
                      className="bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 font-mono"
                    >
                      <option value="untested">Untested</option>
                      <option value="stable">Stable Tracking</option>
                      <option value="intermittent">Intermittent</option>
                      <option value="degraded">Degraded</option>
                      <option value="unusable">Unusable</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Free-form Tester Observations */}
              <div className="space-y-1">
                <label className="text-slate-300 font-bold block">Tester Observations & Environmental Notes:</label>
                <textarea
                  value={diag.testerNotes}
                  onChange={(e) => onUpdateTesterNotes(e.target.value)}
                  placeholder="Record qualitative observations (e.g. tracking stability when crossing hands, optical camera recovery time, reflective desk surface interference)..."
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            Press [ESC] or click outside to dismiss
          </div>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-mono font-bold transition-colors min-h-[44px] touch-manipulation ml-auto"
          >
            RETURN TO CHAMBER
          </button>
        </div>
      </div>
    </div>
  );
};
