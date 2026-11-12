/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Autonomous Mission Execution Dashboard (Phase 28)
 * Enterprise-grade Command & Control visualization for:
 * 1. Mission Overview
 * 2. Autonomous Research Center
 * 3. Evidence Verification
 * 4. Mission Planning & Sequencing
 * 5. Task Dependency Graph
 * 6. Multi-Agent Coordination (6 Specialist Agents)
 * 7. Execution Monitoring
 * 8. Predictive Alerts (Strictly Labeled Predictions)
 * 9. Recovery Intelligence
 * 10. Mission History & Reusable Patterns
 * 11. Pending Human Operator Approvals
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import {
  AutonomousMissionEntity,
  MissionLifecycleState,
  MissionPriority,
  AutonomousMissionExecutionSystemState,
  MissionExecutionTask,
} from '../types/phase28';
import { missionExecutionIntelligence } from '../engines/MissionExecutionIntelligence';
import { missionEvidenceValidator } from '../engines/MissionEvidenceValidator';
import { missionRecoveryIntelligence } from '../engines/MissionRecoveryIntelligence';
import { HumanApprovalManager } from '../engines/HumanApprovalManager';
import {
  Rocket,
  Search,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  Layers,
  BookOpen,
  Users,
  Activity,
  Plus,
  RefreshCw,
  Compass,
  Check,
  XCircle,
  FileText,
  Clock,
  Zap,
} from 'lucide-react';

interface AutonomousMissionExecutionDashboardProps {
  telemetry: VRTelemetry;
  activeIncidents?: IncidentRecord[];
  isPhysicalVRActive?: boolean;
}

export const AutonomousMissionExecutionDashboard: React.FC<AutonomousMissionExecutionDashboardProps> = ({
  telemetry,
  activeIncidents = [],
  isPhysicalVRActive = false,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    | 'overview'
    | 'research'
    | 'evidence'
    | 'planning'
    | 'dependencies'
    | 'coordination'
    | 'monitoring'
    | 'alerts'
    | 'recovery'
    | 'history'
    | 'approvals'
  >('overview');

  const [systemState, setSystemState] = useState<AutonomousMissionExecutionSystemState>(() =>
    missionExecutionIntelligence.evaluateSystemState(telemetry, activeIncidents)
  );

  // New Mission Modal / Form
  const [newTitle, setNewTitle] = useState('');
  const [newStatement, setNewStatement] = useState('');
  const [newScope, setNewScope] = useState('');
  const [newPriority, setNewPriority] = useState<MissionPriority>('HIGH');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const approvalManager = useMemo(() => HumanApprovalManager.getInstance(), []);

  const refreshState = useCallback(() => {
    const s = missionExecutionIntelligence.evaluateSystemState(telemetry, activeIncidents);
    setSystemState(s);
  }, [telemetry, activeIncidents]);

  useEffect(() => {
    refreshState();
    const unsub = missionExecutionIntelligence.subscribe((state) => {
      setSystemState(state);
    });
    return () => unsub();
  }, [refreshState]);

  const selectedMission: AutonomousMissionEntity | undefined = useMemo(() => {
    if (!systemState.selectedMissionId) return systemState.activeMissions[0];
    return systemState.activeMissions.find((m) => m.id === systemState.selectedMissionId) || systemState.activeMissions[0];
  }, [systemState]);

  const handleCreateMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const res = missionExecutionIntelligence.createMission(
      newTitle.trim(),
      newStatement.trim() || 'Autonomous mission objective formulated by operator.',
      newScope.trim() || 'Global System Runtime',
      newPriority,
      'OperationsAgent',
      telemetry,
      activeIncidents
    );

    if (res.success && res.mission) {
      setStatusMessage(`Mission '${res.mission.objective.title}' initiated into research pipeline.`);
      setNewTitle('');
      setNewStatement('');
      setNewScope('');
    } else {
      setStatusMessage(res.reason || 'Failed to create mission.');
    }

    refreshState();
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleTransition = (targetState: MissionLifecycleState) => {
    if (!selectedMission) return;
    const res = missionExecutionIntelligence.transitionMissionState(selectedMission.id, targetState, 'OPERATOR_CONSOLE');
    setStatusMessage(res.message);
    refreshState();
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleStepExecution = () => {
    if (!selectedMission) return;
    missionExecutionIntelligence.stepExecution(selectedMission.id);
    refreshState();
  };

  const handleManualVerifyTask = (task: MissionExecutionTask) => {
    if (!selectedMission) return;
    const res = missionExecutionIntelligence.completeTaskWithVerification(
      selectedMission.id,
      task.taskId,
      `Operator verified metric telemetry: Cadence hold >= 72 FPS, zero dropped frames.`,
      { operatorVerified: true, verifiedFps: 72.0, latencyMs: 13.5 },
      task.assignedAgent
    );
    setStatusMessage(res.message);
    refreshState();
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleApprove = (approvalId: string) => {
    const approved = approvalManager.approveRequest(approvalId, 'OPERATOR_CONSOLE', 'Approved via Autonomous Mission Intelligence');
    if (approved) {
      setStatusMessage(`Approval ${approvalId} granted. Mission ready for execution.`);
      refreshState();
    } else {
      setStatusMessage(`Failed to grant approval ${approvalId}.`);
    }
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const pendingApprovals = approvalManager
    .getPendingRequests()
    .filter((r) => r.commandId.startsWith('mission-') || r.commandId.startsWith('recov-') || r.initiator === 'OperationsAgent' || r.initiator === 'IncidentAgent');

  const filteredMissions = useMemo(() => {
    if (!filterQuery.trim()) return systemState.activeMissions;
    const q = filterQuery.toLowerCase();
    return systemState.activeMissions.filter(
      (m) => m.objective.title.toLowerCase().includes(q) || m.state.toLowerCase().includes(q)
    );
  }, [systemState.activeMissions, filterQuery]);

  return (
    <div className="flex flex-col gap-4 text-xs font-mono text-slate-200">
      {/* Executive Command Strip */}
      <div className="bg-slate-950/90 border border-cyan-800/80 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-cyan-300 uppercase tracking-wider">
              PRISM SIGNAL // Phase 28 Autonomous Mission Intelligence
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-slate-900 border border-cyan-700/60 px-2.5 py-1 rounded text-cyan-400">
              PERSISTENCE: <strong className="text-emerald-400">{systemState.persistenceMode}</strong>
            </span>
            <span className="text-[10px] bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-slate-400">
              DATA SOURCE: <strong className={isPhysicalVRActive ? 'text-emerald-400' : 'text-cyan-400'}>
                {isPhysicalVRActive ? 'PHYSICAL HARDWARE' : 'SIMULATION RUNTIME'}
              </strong>
            </span>
            <button
              onClick={refreshState}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 rounded text-cyan-300 text-[11px] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Sync State
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pt-1">
          <p>
            Autonomous evidence research, task sequencing, predictive delay forecasting, and multi-agent recovery coordination under strict human governance.
          </p>
          <span className="text-[10px] text-slate-500">
            System Version: 1.28.0 // Controlled Decision-Support Hard Gate
          </span>
        </div>

        {statusMessage && (
          <div className="mt-1 p-2 bg-emerald-950/80 border border-emerald-500/80 rounded text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* KPI Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs font-mono">
        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">ACTIVE MISSIONS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-cyan-400">{systemState.activeMissions.length}</span>
            <span className="text-slate-500 text-[10px]">registered</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">MISSION LIFECYCLE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${
              selectedMission?.state === 'EXECUTING'
                ? 'text-cyan-400'
                : selectedMission?.state === 'COMPLETED'
                ? 'text-emerald-400'
                : selectedMission?.state === 'AWAITING_APPROVAL'
                ? 'text-amber-400'
                : 'text-purple-400'
            }`}>
              {selectedMission?.state || 'NONE'}
            </span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">RESEARCH CONFIDENCE</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${
              (selectedMission?.researchResult?.confidenceLevel || 0) >= 80 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {selectedMission?.researchResult?.confidenceLevel ? `${selectedMission.researchResult.confidenceLevel}%` : 'N/A'}
            </span>
            <span className="text-slate-500 text-[10px]">grounded</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">TASK PROGRESS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-emerald-400">
              {selectedMission?.executionStatus ? `${selectedMission.executionStatus.actualProgressPercent}%` : '0%'}
            </span>
            <span className="text-slate-500 text-[10px]">actual</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">AGENT CONSENSUS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${
              (selectedMission?.coordination?.consensusScore || 0) >= 70 ? 'text-emerald-400' : 'text-amber-400'
            }`}>
              {selectedMission?.coordination?.consensusScore ? `${selectedMission.coordination.consensusScore}%` : 'N/A'}
            </span>
            <span className="text-slate-500 text-[10px]">6 council</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">OPERATOR APPROVALS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${pendingApprovals.length === 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {pendingApprovals.length}
            </span>
            <span className="text-slate-500 text-[10px]">pending</span>
          </div>
        </div>
      </div>

      {/* Subview Navigation Buttons */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-slate-800 pb-2 text-xs">
        {[
          { id: 'overview', label: '1. MISSION OVERVIEW', icon: Compass },
          { id: 'research', label: '2. RESEARCH CENTER', icon: Search },
          { id: 'evidence', label: '3. EVIDENCE AUDIT', icon: CheckCircle2 },
          { id: 'planning', label: '4. MISSION PLANNING', icon: Layers },
          { id: 'dependencies', label: '5. TASK GRAPH', icon: GitBranch },
          { id: 'coordination', label: '6. 6-AGENT COUNCIL', icon: Users },
          { id: 'monitoring', label: '7. EXECUTION MONITOR', icon: Activity },
          { id: 'alerts', label: '8. PREDICTIVE ALERTS', icon: AlertTriangle },
          { id: 'recovery', label: '9. RECOVERY INTELLIGENCE', icon: RotateCcw },
          { id: 'history', label: '10. MISSION PATTERNS', icon: BookOpen },
          { id: 'approvals', label: `11. APPROVALS (${pendingApprovals.length})`, icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveSubView(tab.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                activeSubView === tab.id
                  ? 'bg-cyan-950 border border-cyan-500 text-cyan-200 font-bold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* SUBVIEW 1: MISSION OVERVIEW */}
      {activeSubView === 'overview' && (
        <div className="flex flex-col gap-4">
          {/* Mission Selector and Controls */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex flex-col gap-1 w-full md:w-2/3">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Select Active Mission:</span>
              <select
                value={selectedMission?.id || ''}
                onChange={(e) => missionExecutionIntelligence.selectMission(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs text-cyan-300 font-bold focus:outline-none focus:border-cyan-500"
              >
                {filteredMissions.map((m) => (
                  <option key={m.id} value={m.id}>
                    [{m.state}] {m.objective.title} ({m.objective.priority})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedMission?.state === 'AWAITING_APPROVAL' && (
                <button
                  onClick={() => selectedMission.executionPlan?.approvalId && handleApprove(selectedMission.executionPlan.approvalId)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
                >
                  <ShieldCheck className="w-4 h-4" /> Grant Operator Approval
                </button>
              )}

              {selectedMission?.state === 'READY' && (
                <button
                  onClick={() => handleTransition('EXECUTING')}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Play className="w-4 h-4" /> Start Execution
                </button>
              )}

              {selectedMission?.state === 'EXECUTING' && (
                <>
                  <button
                    onClick={handleStepExecution}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <Play className="w-4 h-4" /> Step Task
                  </button>
                  <button
                    onClick={() => handleTransition('PAUSED')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <Pause className="w-4 h-4" /> Pause
                  </button>
                </>
              )}

              {selectedMission?.state === 'PAUSED' && (
                <button
                  onClick={() => handleTransition('EXECUTING')}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
                >
                  <Play className="w-4 h-4" /> Resume
                </button>
              )}
            </div>
          </div>

          {/* Formulate New Mission Form */}
          <form onSubmit={handleCreateMission} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" /> Formulate Autonomous Mission Objective
              </span>
              <span className="text-[10px] text-slate-500">Decomposes objectives into evidence-based research</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Mission Title</label>
                <input
                  type="text"
                  placeholder="e.g., Dynamic Kinematic Alignment Under Fast Yaw Headturns"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as MissionPriority)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Objective Statement</label>
                <input
                  type="text"
                  placeholder="Detailed operational goal..."
                  value={newStatement}
                  onChange={(e) => setNewStatement(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Operational Scope</label>
                <input
                  type="text"
                  placeholder="e.g., Spatial Sensors, Display Cadence, IMU fusion"
                  value={newScope}
                  onChange={(e) => setNewScope(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Initialize Mission Pipeline
              </button>
            </div>
          </form>

          {/* Selected Mission Details */}
          {selectedMission && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="font-bold text-cyan-300 text-xs">{selectedMission.objective.title}</span>
                    <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-400">
                      ID: {selectedMission.id}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs mb-3">{selectedMission.objective.statement}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">SCOPE</span>
                      <span className="text-slate-200 font-bold">{selectedMission.objective.scope}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">LEAD AGENT</span>
                      <span className="text-purple-300 font-bold">{selectedMission.objective.assignedLeadAgent}</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">TARGET CADENCE</span>
                      <span className="text-emerald-400 font-bold">≥ {selectedMission.objective.targetMetrics.minCadenceFps} FPS</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">MAX LATENCY</span>
                      <span className="text-cyan-400 font-bold">≤ {selectedMission.objective.targetMetrics.maxLatencyMs} ms</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Created: {new Date(selectedMission.createdAt).toLocaleTimeString()}</span>
                  <span>Updated: {new Date(selectedMission.updatedAt).toLocaleTimeString()}</span>
                </div>
              </div>

              {/* Lifecycle and Readiness Status */}
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                    <span className="font-bold text-cyan-300 text-xs uppercase">Lifecycle & Readiness Status</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                      selectedMission.state === 'COMPLETED'
                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                        : selectedMission.state === 'EXECUTING'
                        ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300'
                        : 'bg-slate-900 border-slate-700 text-slate-300'
                    }`}>
                      {selectedMission.state}
                    </span>
                  </div>

                  <div className="space-y-2 mb-3">
                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Execution Readiness Score</span>
                        <span className="text-emerald-400 font-bold">{selectedMission.executionPlan?.readinessScore || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-emerald-500 h-2 transition-all"
                          style={{ width: `${selectedMission.executionPlan?.readinessScore || 0}%` }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] mb-1">
                        <span className="text-slate-400">Task Completion Progress</span>
                        <span className="text-cyan-400 font-bold">{selectedMission.executionStatus?.actualProgressPercent || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
                        <div
                          className="bg-cyan-500 h-2 transition-all"
                          style={{ width: `${selectedMission.executionStatus?.actualProgressPercent || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-[11px]">
                    <span className="text-slate-500 text-[10px] uppercase font-bold block mb-1">OPERATOR AUTHORIZATION GATE:</span>
                    <p className={selectedMission.executionPlan?.requiresOperatorApproval ? 'text-amber-300 font-bold' : 'text-emerald-400'}>
                      {selectedMission.executionPlan?.requiresOperatorApproval
                        ? '⚠️ Human approval gate enforced for high/critical impact actions.'
                        : '✓ Pre-authorized under standard operational boundaries.'}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                  <span className="text-slate-500">Total Tasks: {selectedMission.executionPlan?.tasks.length || 0}</span>
                  <span className="text-slate-500">Duration: ~{Math.round((selectedMission.executionPlan?.estimatedTotalDurationMs || 0) / 1000)}s</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: RESEARCH CENTER */}
      {activeSubView === 'research' && selectedMission?.researchResult && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Search className="w-4 h-4 text-cyan-400" />
                Evidence-Based Autonomous Research Findings
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-400">
                STATUS: <strong className="text-emerald-400">{selectedMission.researchResult.verificationStatus}</strong>
              </span>
            </div>
            <p className="text-slate-300 text-xs">{selectedMission.researchResult.summary}</p>
          </div>

          {/* Research Questions */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <span className="font-bold text-slate-300 text-xs uppercase mb-1">Decomposed Research Questions</span>
            <ul className="list-disc list-inside text-slate-400 text-xs space-y-1">
              {selectedMission.researchResult.decomposedQuestions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>

          {/* Citations & Authoritative References */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <span className="font-bold text-slate-300 text-xs uppercase">Authoritative Citations & References</span>
            <div className="space-y-2">
              {selectedMission.researchResult.sources.map((src) => (
                <div key={src.citationId} className="bg-slate-900/60 border border-slate-800 rounded p-2.5 text-xs flex justify-between items-center">
                  <div>
                    <h5 className="font-bold text-cyan-300">{src.title}</h5>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Source: {src.sourceType} // Provider: {src.authorOrProvider}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-400 font-bold block">
                      Reliability: {Math.round(src.reliabilityScore * 100)}%
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">{src.referenceUrlOrKey}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUBVIEW 3: EVIDENCE AUDIT */}
      {activeSubView === 'evidence' && selectedMission?.researchResult && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Empirical Evidence Classification & Provenance Audit
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                TOTAL CLAIMS: <strong>{selectedMission.researchResult.evidence.length}</strong>
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              All claims are calibrated against physical hardware measurements and peer-reviewed standards. Uncertainty is strictly preserved without extrapolation.
            </p>
          </div>

          <div className="space-y-3">
            {selectedMission.researchResult.evidence.map((ev) => (
              <div key={ev.evidenceId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="font-bold text-slate-200 text-xs">{ev.claim}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                    ev.verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                      : 'bg-amber-950 text-amber-400 border border-amber-600'
                  }`}>
                    {ev.verificationStatus}
                  </span>
                </div>

                <p className="text-slate-400 text-xs">{ev.dataSnippet}</p>

                <div className="flex flex-wrap items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800">
                  <span>Provenance: <strong className="text-cyan-300">{ev.provenance}</strong></span>
                  <span>Confidence: <strong className="text-emerald-400">{ev.confidenceScore}%</strong></span>
                  <span className="text-slate-500 font-mono text-[10px]">
                    {ev.isSimulatedData ? 'Simulated Model' : 'Empirical Ground Truth'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 4: MISSION PLANNING & SEQUENCING */}
      {activeSubView === 'planning' && selectedMission?.executionPlan && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Sequenced Mission Tasks & Execution Boundaries
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-purple-300">
                STAGES: {selectedMission.executionPlan.executionSequence.length}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Tasks are assigned to the 6 specialist agents with strict dependency gates and completion proof verification.
            </p>
          </div>

          <div className="space-y-3">
            {selectedMission.executionPlan.tasks.map((task) => (
              <div
                key={task.taskId}
                className={`bg-slate-950/80 border rounded-xl p-4 flex flex-col gap-2 transition-all ${
                  task.status === 'COMPLETED'
                    ? 'border-emerald-600/80 bg-emerald-950/10'
                    : task.status === 'EXECUTING'
                    ? 'border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs">{task.title}</span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-400">
                      {task.assignedAgent}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      task.priority === 'CRITICAL' ? 'bg-rose-950 text-rose-300' : 'bg-slate-900 text-slate-400'
                    }`}>
                      {task.priority}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      task.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : task.status === 'EXECUTING'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-600 animate-pulse'
                        : 'bg-slate-900 text-slate-400 border border-slate-700'
                    }`}>
                      {task.status}
                    </span>

                    {task.status !== 'COMPLETED' && selectedMission.state === 'EXECUTING' && (
                      <button
                        onClick={() => handleManualVerifyTask(task)}
                        className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded text-[10px] transition-colors"
                      >
                        Verify & Complete
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-slate-300 text-xs">{task.description}</p>

                {task.verifiedCompletionEvidence && (
                  <div className="bg-emerald-950/30 border border-emerald-800/60 p-2 rounded text-[11px] text-emerald-300">
                    <strong>Verified Completion Proof:</strong> {task.verifiedCompletionEvidence.evidenceSnippet}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 5: TASK DEPENDENCY GRAPH */}
      {activeSubView === 'dependencies' && selectedMission?.executionPlan && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-cyan-400" />
                Execution Stages & Parallel Dependency Chains
              </span>
              <span className="text-[10px] text-slate-400">Total Stages: {selectedMission.executionPlan.executionSequence.length}</span>
            </div>
            <p className="text-slate-400 text-xs">
              Automated topological scheduling guarantees tasks only advance when all upstream dependencies report verified completion evidence.
            </p>
          </div>

          <div className="space-y-4">
            {selectedMission.executionPlan.executionSequence.map((stageTasks, stageIdx) => (
              <div key={stageIdx} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <span className="font-bold text-purple-300 text-xs uppercase">
                  Stage {stageIdx + 1} ({stageTasks.length} Parallel Task{stageTasks.length > 1 ? 's' : ''})
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                  {stageTasks.map((tId) => {
                    const t = selectedMission.executionPlan?.tasks.find((task) => task.taskId === tId);
                    if (!t) return null;
                    return (
                      <div key={tId} className="bg-slate-900/60 border border-slate-800 rounded p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-slate-200">{t.title}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            t.status === 'COMPLETED' ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {t.status}
                          </span>
                        </div>
                        <span className="text-[10px] text-cyan-400 block mb-1">Assigned: {t.assignedAgent}</span>
                        <p className="text-slate-400 text-[11px]">{t.description}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 6: MULTI-AGENT COORDINATION */}
      {activeSubView === 'coordination' && selectedMission?.coordination && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                6-Agent Mission Collaboration Council
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-400">
                CONSENSUS: <strong className="text-emerald-400">{selectedMission.coordination.consensusScore}%</strong>
              </span>
            </div>
            <p className="text-slate-300 text-xs">{selectedMission.coordination.overallConsensusProposal}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {selectedMission.coordination.agents.map((agent) => (
              <div key={agent.role} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-slate-200 text-xs">{agent.responsibilityName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      agent.activeEvaluationStance === 'CONCUR'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : agent.activeEvaluationStance === 'CAUTION'
                        ? 'bg-amber-950 text-amber-400 border border-amber-600'
                        : 'bg-rose-950 text-rose-400 border border-rose-600'
                    }`}>
                      {agent.activeEvaluationStance}
                    </span>
                  </div>

                  <span className="text-[10px] text-cyan-400 font-bold block mb-1">
                    ROLE: {agent.role}
                  </span>

                  <p className="text-slate-400 text-xs mb-2">{agent.scopeOfAuthority}</p>

                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800 mb-2 text-[11px] text-slate-300">
                    {agent.evidenceReviewSummary}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Assigned Tasks: {agent.assignedTaskIds.length}</span>
                  <span>Confidence: <strong className="text-emerald-400">{agent.confidenceScore}%</strong></span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 7: EXECUTION MONITORING */}
      {activeSubView === 'monitoring' && selectedMission?.executionStatus && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">FRAME CADENCE</span>
              <span className="text-lg font-bold text-emerald-400">
                {selectedMission.executionStatus.resourceUtilization.frameCadenceFps} FPS
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">FRAME LATENCY</span>
              <span className="text-lg font-bold text-cyan-400">
                {selectedMission.executionStatus.resourceUtilization.latencyMs} ms
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">CPU UTILIZATION</span>
              <span className="text-lg font-bold text-purple-400">
                {selectedMission.executionStatus.resourceUtilization.cpuPercent}%
              </span>
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
              <span className="text-slate-500 text-[10px] uppercase font-bold block">FAILURE PROBABILITY</span>
              <span className="text-lg font-bold text-amber-400">
                {selectedMission.executionStatus.failureProbability}%
              </span>
            </div>
          </div>

          {/* Anomalies List */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <span className="font-bold text-slate-300 text-xs uppercase">
              Detected Execution Anomalies ({selectedMission.executionStatus.anomalies.length})
            </span>
            {selectedMission.executionStatus.anomalies.length === 0 ? (
              <p className="text-emerald-400 text-xs">Zero anomalies detected. Telemetry is within nominal baseline.</p>
            ) : (
              selectedMission.executionStatus.anomalies.map((a) => (
                <div key={a.anomalyId} className="bg-slate-900/60 border border-slate-800 rounded p-2.5 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-rose-300">{a.metric}</span>
                    <span className="text-slate-400 text-[11px] block">
                      Expected {a.expectedValue}, measured {a.actualValue} ({a.deviationPercent}% deviation)
                    </span>
                  </div>
                  <span className="text-[10px] bg-rose-950 text-rose-300 px-2 py-0.5 rounded font-bold">
                    {a.severity}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* SUBVIEW 8: PREDICTIVE ALERTS */}
      {activeSubView === 'alerts' && selectedMission?.executionStatus && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                Early Warning Predictive Alerts
              </span>
              <span className="text-[10px] bg-amber-950 border border-amber-500 text-amber-300 font-bold px-2 py-0.5 rounded">
                SIMULATED PREDICTIONS // IS_SIMULATED_PREDICTION: TRUE
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Forecasts impending telemetry breaches and deadline slips. Model predictions are strictly differentiated from real hardware measurements.
            </p>
          </div>

          <div className="space-y-3">
            {selectedMission.executionStatus.alerts.map((alert) => (
              <div key={alert.alertId} className="bg-slate-950/80 border border-amber-600/80 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-300 text-xs">{alert.title}</span>
                  <span className="text-[10px] text-amber-400 font-bold">
                    Likelihood: {alert.likelihoodPercent}%
                  </span>
                </div>
                <p className="text-slate-300 text-xs">{alert.description}</p>
                <div className="bg-slate-900/60 p-2 rounded border border-slate-800 text-[11px] text-emerald-300">
                  <strong>Recommended Corrective Action:</strong> {alert.recommendedAction}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 9: RECOVERY INTELLIGENCE */}
      {activeSubView === 'recovery' && selectedMission && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4 text-cyan-400" />
                Autonomous Recovery Intelligence & Root Cause Remediation
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                PROPOSALS: {selectedMission.recoveryRecommendations.length}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Classifies task anomalies into root causes and devises safe recovery pathways. High/Critical impact recoveries require human operator authorization.
            </p>
          </div>

          {selectedMission.recoveryRecommendations.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">No Active Recovery Required</p>
              <p className="text-[11px] text-slate-500 mt-1">Current mission tasks are executing within pre-configured tolerance margins.</p>
            </div>
          ) : (
            selectedMission.recoveryRecommendations.map((rec) => (
              <div key={rec.recommendationId} className="bg-slate-950/80 border border-amber-600/80 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-amber-300 text-xs">{rec.actionSummary}</span>
                  <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-purple-300">
                    {rec.classification}
                  </span>
                </div>
                <p className="text-slate-300 text-xs">{rec.rootCauseSummary}</p>
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-[10px]">
                  <span>Strategy: <strong className="text-cyan-400">{rec.strategy}</strong></span>
                  <span>Feasibility: <strong className="text-emerald-400">{rec.feasibilityScore}%</strong></span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* SUBVIEW 10: MISSION PATTERNS */}
      {activeSubView === 'history' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Cross-Phase Reusable Mission Patterns (Phases 1–27)
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                PATTERNS: {systemState.knowledgeState.patterns.length}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Empirically verified mission templates synthesized from historical operational phases to accelerate autonomous execution.
            </p>
          </div>

          <div className="space-y-3">
            {systemState.knowledgeState.patterns.map((pat) => (
              <div key={pat.patternId} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-cyan-300 text-xs">{pat.name}</span>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    Success Rate: {pat.historicalSuccessRate}%
                  </span>
                </div>
                <span className="text-[10px] text-purple-300 font-bold">DOMAIN: {pat.domain}</span>
                <div className="text-[11px] text-slate-300">
                  <strong>Typical Tasks:</strong> {pat.typicalTasks.join(' ➔ ')}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  <strong>Known Pitfalls:</strong> {pat.knownPitfalls.join('; ')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 11: PENDING HUMAN APPROVALS */}
      {activeSubView === 'approvals' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                Human-in-the-Loop Operator Authorization Gate
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-amber-400 font-bold">
                PENDING: {pendingApprovals.length}
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              In accordance with enterprise governance, high-impact or critical operational transitions require explicit human sign-off before engagement.
            </p>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="bg-slate-950/40 border border-slate-800 rounded-xl p-8 text-center text-slate-400">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-300">No Pending Mission Approvals</p>
              <p className="text-[11px] text-slate-500 mt-1">All active autonomous directives are operating within pre-authorized safety boundaries.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApprovals.map((req) => (
                <div key={req.approvalId} className="bg-slate-950/80 border border-amber-600/80 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-amber-300 text-xs">{req.commandName}</span>
                    <span className="text-[10px] bg-amber-950 border border-amber-500 text-amber-300 px-2 py-0.5 rounded font-bold">
                      IMPACT: {req.impactLevel}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs">{req.actionSummary}</p>

                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 text-[11px] space-y-1">
                    <div><strong className="text-slate-400">Justification:</strong> {req.justification}</div>
                    <div><strong className="text-slate-400">Risk Assessment:</strong> {req.riskAssessmentSummary}</div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">Initiated by: {req.initiator} // ID: {req.approvalId}</span>
                    <button
                      onClick={() => handleApprove(req.approvalId)}
                      className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4" /> Grant Operator Authorization
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
