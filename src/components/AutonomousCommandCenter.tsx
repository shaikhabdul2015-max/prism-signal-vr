/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 23: Autonomous Command Center Dashboard.
 * Unified enterprise interface providing system health aggregation,
 * registered module matrix, 6-agent workload tracking, predictive risk vectors,
 * human-in-the-loop approval gates, hash-chained audit verification,
 * and database synchronization state.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Cpu,
  Server,
  Activity,
  Terminal,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  Database,
  Users,
  Compass,
  FileCheck,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { VRTelemetry } from '../types/diagnostics';
import {
  RegisteredModule,
  CommandExecutionRecord,
  ApprovalRequest,
  PredictiveMissionAssessment,
  SystemIntelligenceReport,
  HashChainedAuditRecord,
} from '../types/phase23';
import { unifiedCommandCenter } from '../engines/UnifiedCommandCenter';
import { autonomousOperationsManager } from '../engines/AutonomousOperationsManager';
import { humanApprovalManager } from '../engines/HumanApprovalManager';
import { predictiveMissionControl } from '../engines/PredictiveMissionControl';
import { systemIntelligenceMonitor } from '../engines/SystemIntelligenceMonitor';
import { commandAuditService } from '../services/CommandAuditService';

interface AutonomousCommandCenterProps {
  telemetry: VRTelemetry;
}

export const AutonomousCommandCenter: React.FC<AutonomousCommandCenterProps> = ({ telemetry }) => {
  const [modules, setModules] = useState<RegisteredModule[]>(() =>
    unifiedCommandCenter.getRegisteredModules()
  );
  const [commandHistory, setCommandHistory] = useState<CommandExecutionRecord[]>(() =>
    unifiedCommandCenter.getCommandHistory()
  );
  const [approvals, setApprovals] = useState<ApprovalRequest[]>(() =>
    humanApprovalManager.getAllRequests()
  );
  const [auditChain, setAuditChain] = useState<HashChainedAuditRecord[]>(() =>
    commandAuditService.getAuditChain()
  );
  const [isPaused, setIsPaused] = useState<boolean>(() =>
    autonomousOperationsManager.isExecutionPaused()
  );
  const [notice, setNotice] = useState<string | null>(null);

  // Re-sync states when engines trigger updates
  useEffect(() => {
    const unsubCmd = unifiedCommandCenter.subscribe(() => {
      setModules(unifiedCommandCenter.getRegisteredModules());
      setCommandHistory(unifiedCommandCenter.getCommandHistory());
    });

    const unsubAppr = humanApprovalManager.subscribe((reqs) => {
      setApprovals(reqs);
    });

    const unsubAudit = commandAuditService.subscribe((records) => {
      setAuditChain(records);
    });

    const unsubOps = autonomousOperationsManager.subscribe(() => {
      setIsPaused(autonomousOperationsManager.isExecutionPaused());
    });

    return () => {
      unsubCmd();
      unsubAppr();
      unsubAudit();
      unsubOps();
    };
  }, []);

  // System intelligence report
  const systemReport: SystemIntelligenceReport = useMemo(() => {
    return systemIntelligenceMonitor.generateReport(telemetry, 0);
  }, [telemetry]);

  // Predictive risk assessment
  const predictiveRisk: PredictiveMissionAssessment = useMemo(() => {
    return predictiveMissionControl.evaluateMissionRisk('active_mission_01', telemetry);
  }, [telemetry]);

  // Bottlenecks & recommended actions
  const { bottlenecks, recommendedActions } = useMemo(() => {
    return autonomousOperationsManager.analyzeBottlenecks(telemetry);
  }, [telemetry]);

  const pendingApprovals = useMemo(
    () => approvals.filter((a) => a.status === 'PENDING'),
    [approvals]
  );

  const unifiedStatus = useMemo(
    () => unifiedCommandCenter.getUnifiedOperationalStatus(),
    [modules]
  );

  const chainIntegrity = useMemo(
    () => commandAuditService.verifyChainIntegrity(),
    [auditChain]
  );

  const handleApprove = (approvalId: string) => {
    const success = humanApprovalManager.approveRequest(approvalId, 'LEAD_SYSTEMS_OPERATOR');
    if (success) {
      setNotice(`Authorization granted for request: ${approvalId}. Command dispatched.`);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handleReject = (approvalId: string) => {
    const success = humanApprovalManager.rejectRequest(approvalId, 'LEAD_SYSTEMS_OPERATOR', 'Operator safety override');
    if (success) {
      setNotice(`Rejected approval request: ${approvalId}.`);
      setTimeout(() => setNotice(null), 3500);
    }
  };

  const handlePauseResume = () => {
    if (isPaused) {
      autonomousOperationsManager.resumeOperations();
      setNotice('Autonomous operations resumed.');
    } else {
      autonomousOperationsManager.pauseOperations();
      setNotice('Autonomous operations paused.');
    }
    setTimeout(() => setNotice(null), 3000);
  };

  const handleExecuteRecommendation = (rec: (typeof recommendedActions)[0]) => {
    const res = autonomousOperationsManager.executeOperation(rec);
    if (res.requiresApproval) {
      setNotice(`High-impact action queued for operator authorization.`);
    } else if (res.executed) {
      setNotice(`Autonomous action executed: "${rec.title}".`);
    } else {
      setNotice(`Operation blocked: ${res.reason}`);
    }
    setTimeout(() => setNotice(null), 3500);
  };

  const handleResetCounter = () => {
    autonomousOperationsManager.resetActionCounter();
    setNotice('Autonomous action limit counter reset.');
    setTimeout(() => setNotice(null), 3000);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner: Unified Health, Operational Verdict & Master Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-cyan-400">
              <Shield className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  AUTONOMOUS COMMAND & CONTROL SYSTEM
                </h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  PHASE 23
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                    systemReport.operationalVerdict === 'ALL_SYSTEMS_NOMINAL'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {systemReport.operationalVerdict.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                System Health: <strong className="text-emerald-400">{systemReport.overallHealthScore}%</strong> • Modules:{' '}
                <strong className="text-white">{modules.length} Registered</strong> ({unifiedStatus.healthyCount} Healthy,{' '}
                {unifiedStatus.degradedCount} Degraded) • Database:{' '}
                <strong className="text-cyan-300">{systemReport.cloudSync.statusLabel}</strong> • Chain Integrity:{' '}
                <strong className={chainIntegrity.isValid ? 'text-emerald-400' : 'text-rose-400'}>
                  {chainIntegrity.isValid ? 'VERIFIED (HASH-CHAINED)' : 'CORRUPTED'}
                </strong>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <button
              onClick={handlePauseResume}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                isPaused
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                  : 'bg-amber-950 text-amber-300 border-amber-500/40 hover:bg-amber-900'
              }`}
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Resume Autonomous Ops' : 'Pause Autonomous Ops'}</span>
            </button>

            <button
              onClick={handleResetCounter}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Action Quota</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-3 px-3 py-2 bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 rounded text-xs flex items-center space-x-2">
            <Activity className="w-4 h-4 animate-spin" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Operator Authorization Gate (Human-in-the-Loop) */}
      {pendingApprovals.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Pending Operator Approvals ({pendingApprovals.length} Gate Active)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-300/80">Human Authorization Required</span>
          </div>

          <div className="space-y-2">
            {pendingApprovals.map((req) => (
              <div
                key={req.approvalId}
                className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{req.commandName}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {req.impactLevel} IMPACT
                    </span>
                    <span className="text-slate-400 text-[11px]">Initiator: {req.initiator}</span>
                  </div>
                  <p className="text-slate-300 mt-1">{req.actionSummary}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5 italic">{req.justification}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleApprove(req.approvalId)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center space-x-1 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authorize</span>
                  </button>

                  <button
                    onClick={() => handleReject(req.approvalId)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs font-semibold flex items-center space-x-1 transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5 text-rose-400" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Grid: Module Matrix & Predictive Risk Vectors */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Registered Modules Status Matrix */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Centralized Module Matrix ({modules.length})
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              {unifiedStatus.healthyCount} Healthy / {modules.length} Total
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {modules.map((m) => (
              <div
                key={m.moduleId}
                className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-white truncate max-w-[180px]">{m.name}</span>
                    <span
                      className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                        m.status === 'HEALTHY'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400/80 uppercase block">
                    {m.category.replace(/_/g, ' ')} • v{m.version}
                  </span>
                  <div className="mt-2 text-[10px] text-slate-400 flex flex-wrap gap-1">
                    {m.capabilities.slice(0, 3).map((c, i) => (
                      <span key={i} className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                        {c.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                  <span>Latency: {m.latencyMs.toFixed(1)}ms</span>
                  <span>Workloads: {m.activeWorkloads}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Predictive Risk Vectors & Telemetry Intelligence */}
        <div className="lg:col-span-5 space-y-4">
          {/* Telemetry Intelligence Strip */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Real-Time Sensor Intelligence</span>
            </h3>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">CADENCE</span>
                <span className="font-bold text-white">
                  {systemReport.telemetry.cadenceFps !== 'Unavailable'
                    ? `${systemReport.telemetry.cadenceFps} FPS`
                    : 'Unavailable'}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">25-JOINT SKELETON</span>
                <span className="font-bold text-emerald-400">
                  {systemReport.telemetry.trackedJoints !== 'Unavailable'
                    ? `${systemReport.telemetry.trackedJoints}/${systemReport.telemetry.expectedJoints}`
                    : 'Unavailable'}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">FRAME DELTA</span>
                <span className="font-bold text-cyan-400">
                  {systemReport.telemetry.frameDeltaMs !== 'Unavailable'
                    ? `${systemReport.telemetry.frameDeltaMs} ms`
                    : 'Unavailable'}
                </span>
              </div>
              <div className="bg-slate-950 p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">MEMORY USAGE</span>
                <span className="font-bold text-purple-400">
                  {systemReport.memoryUsageMb !== 'Unavailable'
                    ? `${systemReport.memoryUsageMb} MB`
                    : 'Unavailable'}
                </span>
              </div>
            </div>
          </div>

          {/* Predictive Risk Vectors */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <Compass className="w-4 h-4 text-amber-400" />
                <span>Predictive Risk Vectors</span>
              </h3>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                {predictiveRisk.failureProbabilityPercent}% Failure Prob
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono">
              {predictiveRisk.riskVectors.map((v) => (
                <div key={v.dimension} className="bg-slate-950 p-2.5 rounded border border-slate-800/80">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-300 font-bold">{v.dimension.replace(/_/g, ' ')}</span>
                    <div className="flex items-center space-x-1.5">
                      <span
                        className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                          v.isMeasuredData
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-purple-950 text-purple-300 border border-purple-800'
                        }`}
                      >
                        {v.isMeasuredData ? 'MEASURED' : 'SIMULATED'}
                      </span>
                      <span
                        className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                          v.status === 'LOW'
                            ? 'text-emerald-400'
                            : v.status === 'ELEVATED'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {v.riskScore}%
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400">{v.projectedImpact}</p>
                </div>
              ))}
            </div>

            <p className="text-[9px] text-slate-500 mt-2 italic">
              {predictiveRisk.uncertaintyDisclaimer}
            </p>
          </div>
        </div>
      </div>

      {/* Six Specialist Agents Command Matrix */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-4 flex items-center space-x-2">
          <Users className="w-4 h-4 text-purple-400" />
          <span>Six Specialist AI Agents Command Matrix</span>
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs font-mono">
          {Object.entries(systemReport.agentAvailability).map(([role, status]) => (
            <div key={role} className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-center">
              <span className="font-bold text-slate-200 block text-[11px] truncate">
                {role.replace(/([A-Z])/g, ' $1').trim()}
              </span>
              <span
                className={`inline-block text-[9px] px-2 py-0.5 rounded font-semibold mt-2 ${
                  status.status === 'AVAILABLE'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-950 text-amber-400 border border-amber-500/30'
                }`}
              >
                {status.status}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">
                Tasks: {status.activeTaskCount}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Operational Bottlenecks & Corrective Action Recommendations */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Autonomous Bottleneck Detection & Recommended Operations
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-400">
            {bottlenecks.length} Active Bottlenecks Detected
          </span>
        </div>

        <div className="space-y-2.5">
          {recommendedActions.map((rec, i) => (
            <div
              key={i}
              className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-white">{rec.title}</span>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                      rec.impact === 'HIGH'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    {rec.impact} IMPACT
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">Target: {rec.targetModule}</span>
                </div>
                <p className="text-slate-300 mt-1">{rec.actionSummary}</p>
              </div>

              <button
                onClick={() => handleExecuteRecommendation(rec)}
                className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center space-x-1.5 transition-all shrink-0 ${
                  rec.impact === 'HIGH'
                    ? 'bg-amber-600 hover:bg-amber-500 text-white'
                    : 'bg-cyan-600 hover:bg-cyan-500 text-white'
                }`}
              >
                <span>{rec.impact === 'HIGH' ? 'Queue for Approval' : 'Execute Autonomous Action'}</span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Grid: Command Execution History & Hash-Chained Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Command Execution History */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <span>Command Execution History ({commandHistory.length})</span>
          </h3>

          <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
            {commandHistory.slice(0, 8).map((cmd) => (
              <div key={cmd.commandId} className="bg-slate-950 border border-slate-800 rounded p-2.5 text-xs font-mono">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white truncate max-w-[220px]">{cmd.commandName}</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                      cmd.status === 'SUCCESS'
                        ? 'text-emerald-400'
                        : cmd.status === 'PENDING_APPROVAL'
                        ? 'text-amber-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {cmd.status}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 flex items-center justify-between">
                  <span>Actor: {cmd.initiator}</span>
                  <span>{new Date(cmd.dispatchedAt).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hash-Chained Audit Trail */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Hash-Chained Audit Log ({auditChain.length})</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">
                Chain: {chainIntegrity.isValid ? 'VALID' : 'INVALID'}
              </span>
            </div>

            <div className="space-y-1.5 font-mono text-[11px] max-h-[220px] overflow-y-auto pr-1">
              {auditChain.slice(-6).map((audit) => (
                <div key={audit.auditId} className="bg-slate-950 border border-slate-800 rounded p-2 text-slate-300">
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                    <span>#{audit.sequenceNumber} [{audit.eventType}]</span>
                    <span>{new Date(audit.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[11px] truncate text-slate-300">{audit.details}</p>
                  <div className="text-[9px] text-cyan-400/80 mt-1 truncate">
                    Hash: {audit.currentHash}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Cryptographic Sequence Verified</span>
            <span>Immutable Hardware Storage: Not Configured</span>
          </div>
        </div>
      </div>
    </div>
  );
};
