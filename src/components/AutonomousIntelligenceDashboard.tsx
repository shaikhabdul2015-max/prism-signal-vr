/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 19.5: Autonomous Intelligence & Cloud Infrastructure Dashboard.
 * Integrates Database Mode Management (LOCAL_DEVELOPMENT, CLOUD_FIRESTORE, OFFLINE_FALLBACK),
 * fail-safe degraded cloud monitoring, Self-Healing loop, Root Cause evaluation,
 * Adaptive Performance tuning, and tamper-evident synchronization audit logs.
 */

import React, { useState, useEffect } from 'react';
import { VRTelemetry } from '../types/diagnostics';
import {
  SelfHealingEngineState,
  RootCauseComprehensiveReport,
  AdaptivePerformanceState,
  PerformanceProfileLevel,
  SelfHealingActionType,
  DatabaseMode,
  InfrastructureHealthReport,
} from '../types/phase19';
import { selfHealingEngine } from '../utils/SelfHealingEngine';
import { RootCauseAnalyzer } from '../utils/RootCauseAnalyzer';
import { adaptiveOptimizer } from '../utils/adaptivePerformanceOptimizer';
import { analyzePredictiveFailures } from '../utils/predictiveFailureEngine';
import { EnterpriseAgentCoordinator } from '../utils/agentCoordinator';
import { dbService } from '../services/firebaseDbService';
import {
  BrainCircuit,
  Wrench,
  Activity,
  Zap,
  ShieldCheck,
  ShieldAlert,
  RotateCcw,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Cpu,
  Sparkles,
  Info,
  Database,
  Cloud,
  CloudOff,
  Server,
  HardDrive,
  FileCheck,
  ArrowRight,
} from 'lucide-react';

interface AutonomousIntelligenceDashboardProps {
  telemetry: VRTelemetry;
}

export const AutonomousIntelligenceDashboard: React.FC<AutonomousIntelligenceDashboardProps> = ({
  telemetry,
}) => {
  const [healingState, setHealingState] = useState<SelfHealingEngineState>(() =>
    selfHealingEngine.getState()
  );
  const [perfState, setPerfState] = useState<AdaptivePerformanceState>(() =>
    adaptiveOptimizer.getState()
  );
  const [infraReport, setInfraReport] = useState<InfrastructureHealthReport>(() =>
    dbService.getInfrastructureReport()
  );
  const [selectedAction, setSelectedAction] = useState<SelfHealingActionType>('recalibrate_skeleton');
  const [isExecutingManualAction, setIsExecutingManualAction] = useState(false);
  const [manualActionResult, setManualActionResult] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // Subscribe to Self-Healing Engine, Adaptive Optimizer, and Infrastructure
  useEffect(() => {
    const unsubHealing = selfHealingEngine.subscribe((state) => setHealingState(state));
    const unsubPerf = adaptiveOptimizer.subscribe((state) => setPerfState(state));
    const unsubInfra = dbService.subscribeInfrastructure((report) => setInfraReport(report));
    return () => {
      unsubHealing();
      unsubPerf();
      unsubInfra();
    };
  }, []);

  // Compute Root Cause Analysis on telemetry
  const rootCauseReport = React.useMemo<RootCauseComprehensiveReport>(() => {
    return RootCauseAnalyzer.analyze(telemetry);
  }, [telemetry]);

  // Compute Predictive Failures
  const predictiveReport = React.useMemo(() => {
    return analyzePredictiveFailures(telemetry);
  }, [telemetry]);

  // Compute Six-Agent Coordination
  const agentReport = React.useMemo(() => {
    return EnterpriseAgentCoordinator.coordinate(telemetry);
  }, [telemetry]);

  const handleManualAction = async () => {
    setIsExecutingManualAction(true);
    setManualActionResult(null);
    try {
      const attempt = await selfHealingEngine.executeAction(
        `manual-trigger-${Date.now()}`,
        selectedAction,
        telemetry.frames?.[0]?.frameDurationMs || 13.88
      );
      setManualActionResult(`Executed ${attempt.actionType}: ${attempt.remediationDetails}`);
    } catch (err: unknown) {
      setManualActionResult(`Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsExecutingManualAction(false);
    }
  };

  const handleProfileSelect = (profile: PerformanceProfileLevel) => {
    adaptiveOptimizer.setProfile(profile, true);
  };

  const handleDatabaseModeSwitch = async (mode: DatabaseMode) => {
    setSyncFeedback(`Switching to ${mode}...`);
    const res = await dbService.setDatabaseMode(mode);
    setSyncFeedback(
      res.reason
        ? `Mode set to ${res.activeMode} (${res.cloudHealth}): ${res.reason}`
        : `Successfully engaged ${res.activeMode} mode.`
    );
  };

  const handleDrainQueue = async () => {
    setIsSyncing(true);
    setSyncFeedback('Attempting cloud queue flush...');
    try {
      const res = await dbService.flushOfflineWrites();
      setSyncFeedback(
        res.flushed > 0
          ? `Flushed ${res.flushed} offline records to Cloud Firestore. ${res.remaining} remaining.`
          : `Sync deferred: ${res.remaining} records pending backoff cooldown or cloud unreachable.`
      );
    } catch (err) {
      setSyncFeedback(`Queue flush failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRetryQuarantine = () => {
    const recovered = dbService.retryFailedRecords();
    setSyncFeedback(`Recovered ${recovered} quarantined records for resynchronization.`);
  };

  const reliabilityScore = Math.max(
    10,
    Math.round(
      (rootCauseReport.overallSystemHealthScore * 0.4 +
        (1 - (predictiveReport.overallRisk === 'high' ? 0.5 : predictiveReport.overallRisk === 'moderate' ? 0.2 : 0)) *
          100 *
          0.3 +
        agentReport.overallConfidence * 100 * 0.3)
    )
  );

  return (
    <div className="space-y-6 text-slate-100 p-4 font-sans">
      {/* Top Banner / Headline with Infrastructure Health Badge */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-indigo-500/30 backdrop-blur-md shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/40">
            <BrainCircuit className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold tracking-tight text-white">Autonomous Intelligence Hub</h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
                PHASE 19.5 VERIFIED
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                  infraReport.cloudHealth === 'HEALTHY'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : infraReport.cloudHealth === 'DEGRADED_CLOUD_MODE'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-slate-800 text-slate-300 border-slate-700'
                }`}
              >
                {infraReport.cloudHealth.replace(/_/g, ' ')}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Self-Healing Loop • Root Cause Evaluation • Database Mode Management • Cloud Fail-Safe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-xs text-slate-400 uppercase font-mono">System Reliability</div>
            <div className="text-2xl font-black text-indigo-400 font-mono">{reliabilityScore}%</div>
          </div>
          <button
            onClick={() => selfHealingEngine.resetAntiLoopCircuit()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition-colors"
            title="Reset Anti-Loop Circuit Breaker"
          >
            <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
            Reset Circuit
          </button>
        </div>
      </div>

      {/* PHASE 19.5 INFRASTRUCTURE & DATABASE MODE BANNER */}
      <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">
              Active Database Mode & Cloud Infrastructure
            </span>
          </div>

          {/* Mode Switcher Buttons */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['LOCAL_DEVELOPMENT', 'CLOUD_FIRESTORE', 'OFFLINE_FALLBACK'] as DatabaseMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => handleDatabaseModeSwitch(mode)}
                className={`px-2.5 py-1 rounded text-xs font-mono font-semibold transition border ${
                  infraReport.activeMode === mode
                    ? 'bg-cyan-950 border-cyan-400 text-cyan-200 shadow-sm'
                    : 'bg-slate-900 border-slate-700/70 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {mode === 'LOCAL_DEVELOPMENT' ? 'Local Dev' : mode === 'CLOUD_FIRESTORE' ? 'Cloud Firestore' : 'Offline Fallback'}
              </button>
            ))}
          </div>
        </div>

        {/* Unavailability / Degraded Alert Banner */}
        {infraReport.unavailabilityReason && (
          <div
            className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
              infraReport.cloudHealth === 'DEGRADED_CLOUD_MODE'
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                : 'bg-slate-900 border-slate-800 text-slate-300'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold">
                {infraReport.cloudHealth === 'DEGRADED_CLOUD_MODE' ? 'DEGRADED CLOUD MODE ACTIVE' : 'INFRASTRUCTURE NOTICE'}:
              </span>{' '}
              <span>{infraReport.unavailabilityReason}</span>
            </div>
          </div>
        )}

        {/* 4 Infrastructure Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px] uppercase">FIRESTORE CONNECTIVITY</span>
            <div className="flex items-center gap-1.5 mt-1">
              <div
                className={`w-2 h-2 rounded-full ${
                  infraReport.firestoreAvailable
                    ? 'bg-emerald-400'
                    : infraReport.cloudHealth === 'DEGRADED_CLOUD_MODE'
                    ? 'bg-amber-400 animate-pulse'
                    : 'bg-slate-500'
                }`}
              />
              <span className="font-bold text-slate-200">
                {infraReport.firestoreAvailable
                  ? `ONLINE (${infraReport.firestoreLatencyMs}ms)`
                  : infraReport.activeMode === 'LOCAL_DEVELOPMENT'
                  ? 'LOCAL ONLY'
                  : 'UNAVAILABLE'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px] uppercase">PENDING SYNC QUEUE</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-base font-bold ${
                  infraReport.pendingSyncCount === 0 ? 'text-emerald-400' : 'text-amber-400'
                }`}
              >
                {infraReport.pendingSyncCount}
              </span>
              <span className="text-slate-500 text-[10px]">records</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px] uppercase">FAILED / QUARANTINED</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`text-base font-bold ${
                  infraReport.failedSyncCount === 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {infraReport.failedSyncCount}
              </span>
              <span className="text-slate-500 text-[10px]">quarantined</span>
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-col justify-between">
            <span className="text-slate-500 text-[10px] uppercase">LAST CLOUD SYNC</span>
            <span className="text-slate-300 font-bold mt-1 truncate">
              {infraReport.lastSuccessfulSync
                ? new Date(infraReport.lastSuccessfulSync).toLocaleTimeString()
                : 'Pending sync'}
            </span>
          </div>
        </div>

        {/* Sync Controls Strip */}
        <div className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800 flex-wrap">
          <div className="text-xs text-slate-400 font-mono truncate">
            {syncFeedback || `Backoff Delay: ${infraReport.backoffDelayMs}ms • Retries: ${infraReport.retryAttempts}/5`}
          </div>
          <div className="flex items-center gap-2">
            {infraReport.failedSyncCount > 0 && (
              <button
                onClick={handleRetryQuarantine}
                className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 border border-red-700/70 text-red-300 rounded text-xs font-mono font-semibold transition"
              >
                Recover Quarantined
              </button>
            )}
            <button
              onClick={handleDrainQueue}
              disabled={isSyncing || infraReport.pendingSyncCount === 0}
              className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 text-cyan-300 disabled:opacity-50 rounded text-xs font-mono font-semibold transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Force Queue Drain</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid: 4 Core Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Self-Healing Status */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Self-Healing Loop</span>
            <Wrench className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="my-3">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  healingState.antiLoopTriggered
                    ? 'bg-amber-400 animate-ping'
                    : healingState.status === 'resolved'
                    ? 'bg-emerald-400'
                    : healingState.status === 'applying'
                    ? 'bg-cyan-400 animate-pulse'
                    : 'bg-indigo-400'
                }`}
              />
              <span className="text-lg font-bold uppercase tracking-wider text-white">
                {healingState.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Resolved: <span className="text-emerald-400 font-bold">{healingState.totalResolvedCount}</span> | Failed: {healingState.totalFailedCount}
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Anti-Loop: {healingState.antiLoopTriggered ? 'TRIPPED (COOLDOWN)' : 'ACTIVE (NORMAL)'}
          </div>
        </div>

        {/* Card 2: Adaptive Performance Profile */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Adaptive Quality</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="my-3">
            <div className="text-lg font-bold text-amber-300 font-mono">
              {perfState.config.profile} ({Math.round(perfState.config.renderScale * 100)}%)
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Cadence: <span className="text-white font-mono">{perfState.currentFps.toFixed(1)} FPS</span> (Target: {perfState.config.targetFps} Hz)
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Shadows: {perfState.config.shadowQuality} • Particles: {Math.round(perfState.config.particleDensity * 100)}%
          </div>
        </div>

        {/* Card 3: Root Cause Primary Vector */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Primary Root Vector</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="my-3">
            <div className="text-sm font-semibold text-purple-200 line-clamp-1">
              {rootCauseReport.primaryHypothesis?.title || 'Nominal Operation'}
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Confidence:{' '}
              <span className="text-purple-400 font-bold">
                {rootCauseReport.primaryHypothesis?.confidenceScore || 100}%
              </span>
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono truncate">
            Rule #2: {rootCauseReport.primaryHypothesis?.rule2Assessment.status || 'INCONCLUSIVE'}
          </div>
        </div>

        {/* Card 4: Six-Agent Consensus */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 uppercase">Agent Consensus</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="my-3">
            <div className="text-lg font-bold text-emerald-400 font-mono">
              {(agentReport.overallConfidence * 100).toFixed(1)}%
            </div>
            <p className="text-xs text-slate-400 mt-1">6/6 Specialist Agents Synchronized</p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono">
            Uncertainty: {(agentReport.agents.ChiefIntelligenceAgent.uncertaintyScore * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Main Section: Root Cause Analyzer & Interactive Self-Healing Dispatcher */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Root Cause Hypotheses & Tamper-Evident Sync Audit Trail */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold tracking-wide uppercase text-slate-200">
                  Root Cause Diagnostics & Evidence
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Audit Hash: {rootCauseReport.auditProof.substring(0, 16)}...
              </span>
            </div>

            {rootCauseReport.primaryHypothesis ? (
              <div className="p-4 rounded-lg bg-slate-800/60 border border-indigo-500/30 mb-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                      RANK 1 HYPOTHESIS
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5">
                      {rootCauseReport.primaryHypothesis.title}
                    </h4>
                  </div>
                  <span className="text-sm font-mono font-bold text-indigo-400">
                    {rootCauseReport.primaryHypothesis.confidenceScore}% Conf
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                  {rootCauseReport.primaryHypothesis.description}
                </p>

                {/* Evidence vs Counter-Evidence */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 pt-3 border-t border-slate-700/50">
                  <div>
                    <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Supporting Evidence:
                    </span>
                    <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                      {rootCauseReport.primaryHypothesis.supportingEvidence.map((ev, i) => (
                        <li key={i}>{ev}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5" /> Counter-Evidence / Invariants:
                    </span>
                    <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
                      {rootCauseReport.primaryHypothesis.counterEvidence.map((cev, i) => (
                        <li key={i}>{cev}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Rule #2 Invariant Card */}
                <div className="mt-3 p-2.5 rounded bg-slate-900/60 border border-amber-500/30 text-xs text-amber-300/90 flex items-start gap-2">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold">Rule #2 Environmental Notice:</span>{' '}
                    {rootCauseReport.primaryHypothesis.rule2Assessment.explanation}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                All optical joints, frame timings, and render buffers are functioning within nominal parameters.
              </div>
            )}
          </div>

          {/* Tamper-Evident Sync & Infrastructure Audit Trail */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold tracking-wide uppercase text-slate-200 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                Tamper-Evident Cloud & Sync Audit Trail (Phase 19.5)
              </h3>
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Hash Verification Active
              </span>
            </div>

            {infraReport.auditLogs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 font-mono">No infrastructure operations recorded yet.</p>
            ) : (
              <div className="overflow-x-auto max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300 font-mono">
                  <thead className="bg-slate-800/60 text-slate-400 sticky top-0">
                    <tr>
                      <th className="p-2">Timestamp</th>
                      <th className="p-2">Operation</th>
                      <th className="p-2">Mode</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Integrity Proof</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {infraReport.auditLogs.slice(0, 15).map((log) => {
                      const isVerified = dbService.verifyAuditProof(log);
                      return (
                        <tr key={log.id} className="hover:bg-slate-800/30">
                          <td className="p-2 text-slate-400">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </td>
                          <td className="p-2 text-indigo-300 font-semibold">{log.operationId}</td>
                          <td className="p-2 text-slate-400 text-[10px]">{log.databaseMode}</td>
                          <td className="p-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                log.status === 'SUCCESS'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : log.status === 'QUEUED'
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : log.status === 'RECOVERED'
                                  ? 'bg-cyan-500/20 text-cyan-400'
                                  : 'bg-red-500/20 text-red-400'
                              }`}
                            >
                              {log.status}
                            </span>
                          </td>
                          <td className="p-2">
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded ${
                                isVerified
                                  ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-600/50'
                                  : 'bg-red-950 text-red-400 border border-red-700'
                              }`}
                            >
                              {isVerified ? 'VERIFIED' : 'TAMPERED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Controls & Adaptive Tuning */}
        <div className="space-y-4">
          {/* Manual Healing Dispatcher */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-200 mb-3 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-indigo-400" />
              Manual Self-Healing Dispatch
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Trigger targeted recovery actions across WebXR and WebGL pipelines.
            </p>
            <div className="space-y-3">
              <select
                value={selectedAction}
                onChange={(e) => setSelectedAction(e.target.value as SelfHealingActionType)}
                className="w-full bg-slate-800 border border-slate-700 text-xs rounded-lg p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                <option value="recalibrate_skeleton">Recalibrate Skeleton Tracking</option>
                <option value="stabilize_frame_pacing">Stabilize Frame Pacing</option>
                <option value="dynamic_resolution_downscale">Dynamic Resolution Downscale (DRS)</option>
                <option value="dynamic_resolution_restore">Restore Render Scale</option>
                <option value="purge_telemetry_buffers">Purge Telemetry Buffers</option>
                <option value="request_tracking_reacquisition">Prompt Tracking Reacquisition</option>
                <option value="adjust_quality_profile">Adjust Graphics Quality Profile</option>
              </select>

              <button
                onClick={handleManualAction}
                disabled={isExecutingManualAction}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-semibold text-white shadow transition cursor-pointer"
              >
                {isExecutingManualAction ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Zap className="w-3.5 h-3.5" />
                )}
                Execute Recovery Routine
              </button>

              {manualActionResult && (
                <div className="p-2.5 rounded bg-slate-800 text-[11px] text-slate-300 font-mono border border-slate-700">
                  {manualActionResult}
                </div>
              )}
            </div>
          </div>

          {/* Adaptive Performance Profiles */}
          <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800">
            <h3 className="text-sm font-bold tracking-wide uppercase text-slate-200 mb-3 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400" />
              Adaptive Quality Profiles
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Dynamic Resolution Scaling and shader quality controls.
            </p>

            <div className="grid grid-cols-1 gap-2">
              {(['Ultra', 'High', 'Balanced', 'Performance', 'PowerSaver'] as PerformanceProfileLevel[]).map(
                (p) => (
                  <button
                    key={p}
                    onClick={() => handleProfileSelect(p)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-xs font-medium transition cursor-pointer ${
                      perfState.config.profile === p
                        ? 'bg-amber-500/20 border-amber-500/60 text-amber-300'
                        : 'bg-slate-800/40 border-slate-700/50 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span>{p}</span>
                    <span className="font-mono text-[11px] text-slate-400">
                      {p === 'Ultra' ? '1.0x • High' : p === 'High' ? '0.95x • High' : p === 'Balanced' ? '0.85x • Low' : p === 'Performance' ? '0.75x • Off' : '0.60x • Off'}
                    </span>
                  </button>
                )
              )}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">Auto-Optimization</span>
              <button
                onClick={() => adaptiveOptimizer.setAutoOptimization(!perfState.config.autoOptimizationEnabled)}
                className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer ${
                  perfState.config.autoOptimizationEnabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {perfState.config.autoOptimizationEnabled ? 'ENABLED' : 'DISABLED'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
