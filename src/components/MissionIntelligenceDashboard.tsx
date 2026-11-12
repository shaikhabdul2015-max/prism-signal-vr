/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Phase 22: Mission Intelligence Dashboard.
 * Renders autonomous mission lifecycles, active task dependency graphs,
 * risk assessments with uncertainty disclosures, operator approval queue,
 * decision trade-off comparisons, multi-agent assignments, and execution controls.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Rocket,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Play,
  Pause,
  RotateCcw,
  AlertTriangle,
  Users,
  Compass,
  Cpu,
  Terminal,
  Activity,
  Layers,
  Sparkles,
  XCircle,
  FileText,
  ChevronRight,
  Flame,
} from 'lucide-react';
import { VRTelemetry } from '../types/diagnostics';
import {
  AutonomousMission,
  AutonomousMissionTask,
  MissionObjectiveType,
  MissionExecutionSnapshot,
  AutonomousMissionDecision,
} from '../types/phase22';
import { autonomousMissionIntelligence } from '../utils/AutonomousMissionIntelligence';
import { missionExecutionController } from '../utils/MissionExecutionController';
import { missionDecisionEngine } from '../utils/MissionDecisionEngine';

interface MissionIntelligenceDashboardProps {
  telemetry: VRTelemetry;
}

export const MissionIntelligenceDashboard: React.FC<MissionIntelligenceDashboardProps> = ({
  telemetry,
}) => {
  const [snapshot, setSnapshot] = useState<MissionExecutionSnapshot>(() =>
    missionExecutionController.getSnapshot()
  );
  const [decisions, setDecisions] = useState<AutonomousMissionDecision[]>(() =>
    missionDecisionEngine.getAllDecisions()
  );
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [selectedObjective, setSelectedObjective] = useState<MissionObjectiveType>('RESONANCE_ALIGNMENT');
  const [notice, setNotice] = useState<string | null>(null);

  // Subscribe to controller and decision updates
  useEffect(() => {
    const unsubExec = missionExecutionController.subscribe((snap) => {
      setSnapshot(snap);
      if (!selectedMissionId && snap.activeMissions.length > 0) {
        setSelectedMissionId(snap.activeMissions[0].missionId);
      }
    });

    const unsubDec = missionDecisionEngine.subscribe((decs) => {
      setDecisions(decs);
    });

    return () => {
      unsubExec();
      unsubDec();
    };
  }, [selectedMissionId]);

  // Dynamic adaptation trigger check
  useEffect(() => {
    if (selectedMissionId) {
      const adaptRecord = autonomousMissionIntelligence.adaptMission(selectedMissionId, telemetry);
      if (adaptRecord) {
        setNotice(`Dynamic Adaptation: ${adaptRecord.triggerDetail}`);
        setTimeout(() => setNotice(null), 4000);
      }
    }
  }, [telemetry, selectedMissionId]);

  const allMissions = useMemo(() => {
    return [
      ...snapshot.activeMissions,
      ...snapshot.completedMissions.filter(
        (m) => !snapshot.activeMissions.some((a) => a.missionId === m.missionId)
      ),
    ];
  }, [snapshot]);

  const activeMission = useMemo(() => {
    return allMissions.find((m) => m.missionId === selectedMissionId) || allMissions[0] || null;
  }, [allMissions, selectedMissionId]);

  const handleCreateMission = () => {
    const titleMap: Record<MissionObjectiveType, string> = {
      STABILITY_SWEEP: 'Autonomous Telemetry & 25-Joint Kinematic Sweep',
      RESONANCE_ALIGNMENT: 'Harmonic Core Resonance & Spire Alignment',
      THERMAL_CADENCE_RECOVERY: 'Thermal Throttle Remediation & Cadence Recovery',
      OPTICAL_TRACKING_CALIBRATION: 'Optical Sensor Recalibration & Dead-Reckoning',
      CLOUD_RESILIENCE_AUDIT: 'Cloud Firestore Queue & Backpressure Audit',
      DIGITAL_TWIN_PREDICTIVE_STRESS: 'Digital Twin Predictive Stress Simulation',
    };

    const newMission = autonomousMissionIntelligence.generateMission(
      selectedObjective,
      titleMap[selectedObjective],
      `Decomposed autonomous task graph optimizing ${selectedObjective.replace(/_/g, ' ')}.`,
      'HIGH',
      telemetry
    );

    setSelectedMissionId(newMission.missionId);
    setNotice(`Generated autonomous mission: "${newMission.title}"`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleStartMission = (missionId: string) => {
    const started = missionExecutionController.startMission(missionId);
    if (!started) {
      setNotice('Mission paused: requires human operator authorization on high-impact tasks.');
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleAuthorizeTask = (missionId: string, taskId: string) => {
    missionExecutionController.authorizeTask(missionId, taskId);
    setNotice(`Authorized high-impact task: ${taskId}. Execution resumed.`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleRejectTask = (missionId: string, taskId: string) => {
    missionExecutionController.rejectTask(missionId, taskId, 'LEAD_SYSTEMS_OPERATOR', 'Operator safety override');
    setNotice(`Rejected task: ${taskId}.`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handlePauseResume = () => {
    if (snapshot.isExecutionPaused) {
      missionExecutionController.resumeExecution();
    } else {
      missionExecutionController.pauseExecution();
    }
  };

  const handleAbort = (missionId: string) => {
    missionExecutionController.abortMission(missionId, 'Operator manual abort');
    setNotice(`Mission ${missionId} aborted.`);
    setTimeout(() => setNotice(null), 3500);
  };

  const handleRetry = (missionId: string, taskId: string) => {
    missionExecutionController.retryTask(missionId, taskId);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* Top Banner: Status, Mission Health, Execution State */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-purple-950/80 border border-purple-500/40 rounded-lg text-purple-400">
              <Rocket className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  AUTONOMOUS MISSION INTELLIGENCE
                </h2>
                <span className="px-2.5 py-0.5 rounded text-xs font-mono font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  PHASE 22
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                    snapshot.isExecutionPaused
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                  }`}
                >
                  {snapshot.isExecutionPaused ? 'EXECUTION PAUSED' : 'CONTROLLER ACTIVE'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Active Missions: <strong className="text-white">{snapshot.activeMissions.length}</strong> • Approval Queue:{' '}
                <strong className={snapshot.approvalQueue.length > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                  {snapshot.approvalQueue.length} Pending
                </strong>{' '}
                • Mission Health:{' '}
                <strong className="text-emerald-400">{snapshot.overallMissionHealth}%</strong> • Operator Gate:{' '}
                <strong className="text-cyan-300">STRICT ENFORCEMENT</strong>
              </p>
            </div>
          </div>

          {/* Quick Mission Dispatcher Controls */}
          <div className="flex items-center space-x-2 flex-wrap gap-y-2">
            <select
              value={selectedObjective}
              onChange={(e) => setSelectedObjective(e.target.value as MissionObjectiveType)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500 font-sans"
            >
              <option value="RESONANCE_ALIGNMENT">Resonance Alignment</option>
              <option value="STABILITY_SWEEP">Stability Sweep</option>
              <option value="THERMAL_CADENCE_RECOVERY">Thermal Cadence Recovery</option>
              <option value="OPTICAL_TRACKING_CALIBRATION">Optical Calibration</option>
              <option value="CLOUD_RESILIENCE_AUDIT">Cloud Resilience Audit</option>
              <option value="DIGITAL_TWIN_PREDICTIVE_STRESS">Digital Twin Stress</option>
            </select>

            <button
              onClick={handleCreateMission}
              className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-md"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Generate Mission</span>
            </button>

            <button
              onClick={handlePauseResume}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all border ${
                snapshot.isExecutionPaused
                  ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900'
                  : 'bg-amber-950 text-amber-300 border-amber-500/40 hover:bg-amber-900'
              }`}
            >
              {snapshot.isExecutionPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{snapshot.isExecutionPaused ? 'Resume Controller' : 'Pause Controller'}</span>
            </button>
          </div>
        </div>

        {notice && (
          <div className="mt-3 px-3 py-2 bg-purple-950/60 border border-purple-500/40 text-purple-300 rounded text-xs flex items-center space-x-2">
            <Activity className="w-4 h-4 animate-spin" />
            <span>{notice}</span>
          </div>
        )}
      </div>

      {/* Operator Approval Queue (Critical Safety Gate) */}
      {snapshot.approvalQueue.length > 0 && (
        <div className="bg-amber-950/40 border border-amber-500/50 rounded-xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2 text-amber-300">
              <ShieldAlert className="w-5 h-5 text-amber-400 animate-pulse" />
              <h3 className="text-sm font-bold tracking-wide uppercase">
                Operator Authorization Required ({snapshot.approvalQueue.length} High-Impact Action)
              </h3>
            </div>
            <span className="text-[11px] font-mono text-amber-300/80">Human-In-The-Loop Safety Gate</span>
          </div>

          <div className="space-y-2">
            {snapshot.approvalQueue.map((task) => (
              <div
                key={task.taskId}
                className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-white">{task.title}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-purple-950 text-purple-300 border border-purple-500/30">
                      Assigned: {task.assignedAgent}
                    </span>
                  </div>
                  <p className="text-slate-400 mt-0.5">{task.description}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => {
                      const parentMission = allMissions.find((m) =>
                        m.tasks.some((t) => t.taskId === task.taskId)
                      );
                      if (parentMission) {
                        handleAuthorizeTask(parentMission.missionId, task.taskId);
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-semibold flex items-center space-x-1 transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Authorize Execution</span>
                  </button>

                  <button
                    onClick={() => {
                      const parentMission = allMissions.find((m) =>
                        m.tasks.some((t) => t.taskId === task.taskId)
                      );
                      if (parentMission) {
                        handleRejectTask(parentMission.missionId, task.taskId);
                      }
                    }}
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

      {/* Main Grid: Mission Selector & Mission Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Mission Directory */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col justify-between space-y-3">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Mission Repository ({allMissions.length})</span>
            </h3>

            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {allMissions.map((m) => {
                const isSelected = m.missionId === selectedMissionId;
                return (
                  <div
                    key={m.missionId}
                    onClick={() => setSelectedMissionId(m.missionId)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-md'
                        : 'bg-slate-950/60 border-slate-800 hover:bg-slate-950 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-white truncate max-w-[200px]">
                        {m.title}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          m.state === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                            : m.state === 'IN_PROGRESS'
                            ? 'bg-cyan-950 text-cyan-400 border border-cyan-500/30 animate-pulse'
                            : m.state === 'PENDING_APPROVAL'
                            ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {m.state}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-2">
                      <span>Tasks: {m.tasks.length}</span>
                      <span>Progress: <strong className="text-purple-400">{m.progressPercent}%</strong></span>
                      <span>Health: <strong className="text-emerald-400">{m.healthScore}%</strong></span>
                    </div>

                    <div className="w-full bg-slate-900 rounded-full h-1 mt-2 overflow-hidden">
                      <div
                        className="h-full bg-purple-500 transition-all duration-300"
                        style={{ width: `${m.progressPercent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Mission Inspector & Tasks Graph */}
        <div className="lg:col-span-8 space-y-4">
          {activeMission ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
              {/* Header */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-white tracking-tight">{activeMission.title}</h3>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {activeMission.priority}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">{activeMission.description}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  {activeMission.state === 'PLANNING' && (
                    <button
                      onClick={() => handleStartMission(activeMission.missionId)}
                      className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start Mission</span>
                    </button>
                  )}

                  {activeMission.state === 'IN_PROGRESS' && (
                    <button
                      onClick={() => handleAbort(activeMission.missionId)}
                      className="px-3 py-1.5 bg-rose-950 text-rose-300 border border-rose-500/40 hover:bg-rose-900 rounded-lg text-xs font-semibold transition-all"
                    >
                      <span>Abort Mission</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Feasibility & Risk Forecaster Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Feasibility */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">
                      Feasibility Assessment
                    </span>
                    <span className="font-mono font-bold text-emerald-400">
                      {activeMission.feasibility.score}/100
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-300">
                    <div>Est Duration: {activeMission.feasibility.estimatedDurationMs}ms</div>
                    <div>Compute Units: {activeMission.feasibility.computeBudgetUnits} ops</div>
                    <div>
                      Required Agents: {activeMission.feasibility.requiredAgents.join(', ')}
                    </div>
                  </div>
                </div>

                {/* Risk Forecaster */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-slate-400 font-semibold uppercase text-[10px]">
                      Predictive Risk Forecaster
                    </span>
                    <span
                      className={`font-mono font-bold ${
                        activeMission.riskAssessment.overallRiskScore > 35
                          ? 'text-amber-400'
                          : 'text-emerald-400'
                      }`}
                    >
                      {activeMission.riskAssessment.failureProbabilityPercent}% Failure Risk
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-slate-300">
                    <div>Tracking Risk: {activeMission.riskAssessment.trackingStabilityRisk}</div>
                    <div>Resource Pressure: {activeMission.riskAssessment.resourceRisk}</div>
                    <div className="text-[10px] text-slate-500 mt-1 italic">
                      {activeMission.riskAssessment.uncertaintyDisclosure}
                    </div>
                  </div>
                </div>
              </div>

              {/* Task Dependency Execution Graph */}
              <div>
                <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-purple-400" />
                  <span>Decomposed Task Dependency Graph</span>
                </h4>

                <div className="space-y-2">
                  {activeMission.tasks.map((task, idx) => (
                    <div
                      key={task.taskId}
                      className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-slate-500 text-[11px]">#{idx + 1}</span>
                          <span className="font-semibold text-white">{task.title}</span>
                          {task.isHighImpact && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              HIGH IMPACT
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-[11px]">{task.description}</p>
                        {task.resultSummary && (
                          <p className="text-emerald-400 text-[11px] font-mono">
                            ↳ {task.resultSummary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 shrink-0 font-mono text-[11px]">
                        <span className="text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/50">
                          {task.assignedAgent}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded font-semibold ${
                            task.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-400'
                              : task.status === 'EXECUTING'
                              ? 'bg-cyan-950 text-cyan-400 animate-pulse'
                              : task.status === 'READY'
                              ? 'bg-blue-950 text-blue-300'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {task.status}
                        </span>
                        {task.status === 'FAILED' && (
                          <button
                            onClick={() => handleRetry(activeMission.missionId, task.taskId)}
                            className="p-1 hover:bg-slate-800 rounded text-amber-400"
                            title="Retry Task"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dynamic Adaptations Log */}
              {activeMission.adaptations.length > 0 && (
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs">
                  <h4 className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] mb-2 flex items-center space-x-1.5">
                    <Flame className="w-3.5 h-3.5 text-amber-400" />
                    <span>Dynamic Adaptations History</span>
                  </h4>
                  <div className="space-y-1.5 font-mono text-[11px]">
                    {activeMission.adaptations.map((a) => (
                      <div key={a.adaptationId} className="text-slate-400 border-l-2 border-amber-500 pl-2">
                        <span className="text-amber-300 font-bold">[{a.trigger}]</span> {a.triggerDetail} —{' '}
                        <span className="text-slate-300">{a.actionsTaken.join(', ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-900/60 border border-dashed border-slate-800 rounded-xl">
              <Compass className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No Mission Selected</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Generate a new mission or select one from the repository on the left to inspect tasks and manage execution.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Decision Trade-off Matrix & Audit Log Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Autonomous Decisions */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-purple-400" />
            <span>Autonomous Decision Engine & Multi-Agent Trade-offs</span>
          </h3>

          <div className="space-y-3">
            {decisions.slice(-3).map((d) => (
              <div key={d.decisionId} className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white">{d.topic}</span>
                  <span className="font-mono text-purple-400 font-semibold">
                    Conf: {Math.round(d.confidenceScore * 100)}%
                  </span>
                </div>
                <p className="text-slate-300 font-mono text-[11px]">
                  Chosen: <strong className="text-cyan-300">{d.chosenAction}</strong>
                </p>
                <p className="text-slate-400 text-[11px] mt-1">{d.rationale}</p>

                {d.alternatives.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-500 uppercase block mb-1">
                      Alternative Trade-off Evaluated
                    </span>
                    {d.alternatives.map((alt, i) => (
                      <div key={i} className="text-[11px] text-slate-400">
                        • <strong className="text-slate-300">{alt.agent}:</strong> {alt.tradeOff}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Execution Controller Audit Log */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Mission Execution Audit Log</span>
            </h3>

            <div className="space-y-1.5 font-mono text-[11px] max-h-[220px] overflow-y-auto pr-1">
              {snapshot.logs.slice(-8).map((log) => (
                <div key={log.logId} className="text-slate-400 flex items-start space-x-2">
                  <span className="text-slate-600 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <span
                    className={`font-semibold shrink-0 ${
                      log.level === 'SECURITY'
                        ? 'text-amber-400'
                        : log.level === 'ERROR'
                        ? 'text-rose-400'
                        : 'text-cyan-400'
                    }`}
                  >
                    [{log.actor}]
                  </span>
                  <span className="text-slate-300">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-500 font-mono">
            <span>Tamper-Evident Audit Active</span>
            <span>Rule #2 Invariant Enforced</span>
          </div>
        </div>
      </div>
    </div>
  );
};
