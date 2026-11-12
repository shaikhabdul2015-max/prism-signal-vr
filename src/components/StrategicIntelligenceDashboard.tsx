/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Strategic Intelligence Dashboard (Phase 27)
 * Enterprise-grade Command & Control visualization for:
 * 1. Strategic Overview & Readiness Score
 * 2. Objective & Goal Formulation Matrix
 * 3. Long-Term Mission Roadmap & Milestone Tracker (Critical Path)
 * 4. Strategic Scenario Analysis (Best / Expected / Worst / Alternative - Strictly Marked Simulated)
 * 5. Quantitative Risk Intelligence (7 Categories & Early Warning Triggers)
 * 6. Multi-Agent Strategic Coordination (6 Specialist Agents & Disagreement Mediation)
 * 7. Strategic Knowledge & Outdated Assumption Audits
 * 8. Strategy Trade-Off & Optimization Simulator
 * 9. Human Operator Approvals & Immutable Audit Gate
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { VRTelemetry } from '../types/diagnostics';
import { IncidentRecord } from '../types/phase17';
import {
  StrategicIntelligenceState,
  StrategicHorizon,
  StrategicPriority,
  StrategicObjective,
  StrategicScenario,
  StrategicRisk,
  AgentStrategicPosition,
  OutdatedAssumptionAudit,
  StrategyTradeoffAnalysis,
} from '../types/phase27';
import { strategicIntelligenceEngine } from '../engines/StrategicIntelligenceEngine';
import { longTermStrategicPlanner } from '../engines/LongTermStrategicPlanner';
import { HumanApprovalManager } from '../engines/HumanApprovalManager';
import {
  Brain,
  Compass,
  Target,
  Milestone,
  Layers,
  AlertTriangle,
  Users,
  BookOpen,
  Sliders,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Cpu,
  Activity,
  Zap,
  Lock,
} from 'lucide-react';

interface StrategicIntelligenceDashboardProps {
  telemetry: VRTelemetry;
  activeIncidents?: IncidentRecord[];
  isPhysicalVRActive?: boolean;
}

export const StrategicIntelligenceDashboard: React.FC<StrategicIntelligenceDashboardProps> = ({
  telemetry,
  activeIncidents = [],
  isPhysicalVRActive = false,
}) => {
  const [activeSubView, setActiveSubView] = useState<
    'overview' | 'objectives' | 'roadmap' | 'scenarios' | 'risks' | 'coordination' | 'knowledge' | 'optimization' | 'approvals'
  >('overview');

  const [state, setState] = useState<StrategicIntelligenceState>(() =>
    strategicIntelligenceEngine.getStrategicState(telemetry, activeIncidents)
  );

  // New Objective Form
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newHorizon, setNewHorizon] = useState<StrategicHorizon>('MEDIUM_TERM');
  const [newPriority, setNewPriority] = useState<StrategicPriority>('HIGH');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Filter states
  const [riskCategoryFilter, setRiskCategoryFilter] = useState<string>('ALL');
  const [scenarioFilter, setScenarioFilter] = useState<string>('ALL');

  const approvalManager = useMemo(() => HumanApprovalManager.getInstance(), []);

  // Update strategic state upon telemetry or incident shifts
  const refreshState = useCallback(() => {
    const freshState = strategicIntelligenceEngine.getStrategicState(telemetry, activeIncidents);
    setState(freshState);
  }, [telemetry, activeIncidents]);

  useEffect(() => {
    refreshState();
    const unsubscribe = strategicIntelligenceEngine.subscribe((updated) => {
      setState(updated);
    });
    return () => unsubscribe();
  }, [refreshState]);

  const handleDecomposeObjective = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const created = strategicIntelligenceEngine.decomposeObjective(
      newTitle.trim(),
      newDesc.trim() || 'Tactical objective decomposed via Strategic Intelligence Center.',
      newHorizon,
      newPriority
    );

    setNewTitle('');
    setNewDesc('');
    setStatusMessage(`Objective '${created.title}' created & decomposed into active roadmap.`);
    refreshState();
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleApproveStrategy = (approvalId: string) => {
    const result = strategicIntelligenceEngine.approveStrategicRecommendation(
      approvalId,
      'OPERATOR_CONSOLE_01',
      'Authorized from Strategic Intelligence Center'
    );
    setStatusMessage(result.message);
    refreshState();
    setTimeout(() => setStatusMessage(null), 4000);
  };

  const pendingApprovals = approvalManager
    .getPendingRequests()
    .filter((r) => r.initiator === 'ChiefIntelligenceAgent' || r.commandId.startsWith('strat-'));

  const filteredRisks = useMemo(() => {
    if (riskCategoryFilter === 'ALL') return state.riskSummary.risks;
    return state.riskSummary.risks.filter((r) => r.category === riskCategoryFilter);
  }, [state.riskSummary.risks, riskCategoryFilter]);

  const filteredScenarios = useMemo(() => {
    if (scenarioFilter === 'ALL') return state.activeScenarios;
    return state.activeScenarios.filter((s) => s.type === scenarioFilter);
  }, [state.activeScenarios, scenarioFilter]);

  return (
    <div className="flex flex-col gap-4 text-xs font-mono text-slate-200">
      {/* Executive Header Banner */}
      <div className="bg-slate-950/90 border border-cyan-800/80 rounded-xl p-4 flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span className="text-sm font-bold text-cyan-300 uppercase tracking-wider">
              PRISM SIGNAL // Phase 27 Strategic Intelligence Engine
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] bg-slate-900 border border-cyan-700/60 px-2.5 py-1 rounded text-cyan-400">
              PERSISTENCE: <strong className="text-emerald-400">{state.persistenceMode}</strong>
            </span>
            <span className="text-[10px] bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-slate-400">
              SOURCE: <strong className={isPhysicalVRActive ? 'text-emerald-400' : 'text-cyan-400'}>
                {isPhysicalVRActive ? 'PHYSICAL HARDWARE' : 'SIMULATION RUNTIME'}
              </strong>
            </span>
            <button
              onClick={refreshState}
              className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-600 rounded text-cyan-300 text-[11px] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Recalibrate
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between text-slate-400 text-[11px] pt-1">
          <p>
            Autonomous decision-support architecture formulating multi-horizon operational roadmaps, evaluating competing scenarios, and governing 6-agent strategic consensus.
          </p>
          <span className="text-[10px] text-slate-500">
            Engine Version: 1.27.0 // Non-Autonomous Hard Gate Active
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
          <span className="text-slate-500 text-[10px] uppercase">STRATEGIC FEASIBILITY</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${state.latestPlan && state.latestPlan.overallFeasibility >= 80 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {state.latestPlan ? `${state.latestPlan.overallFeasibility}%` : 'N/A'}
            </span>
            <span className="text-slate-500 text-[10px]">mission score</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">SYSTEM RISK LEVEL</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${
              state.riskSummary.riskLevel === 'NOMINAL'
                ? 'text-emerald-400'
                : state.riskSummary.riskLevel === 'ELEVATED'
                ? 'text-cyan-400'
                : state.riskSummary.riskLevel === 'HIGH'
                ? 'text-amber-400'
                : 'text-rose-400'
            }`}>
              {state.riskSummary.riskLevel}
            </span>
            <span className="text-slate-500 text-[10px]">({state.riskSummary.overallSystemRiskScore}/100)</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">AGENT CONSENSUS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className={`text-base font-bold ${state.coordination.consensusIndex >= 70 ? 'text-emerald-400' : 'text-amber-400'}`}>
              {state.coordination.consensusIndex}%
            </span>
            <span className="text-slate-500 text-[10px]">6 agents</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">DYNAMIC REVISIONS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-purple-400">
              {state.latestPlan ? state.latestPlan.dynamicRevisionCount : 0}
            </span>
            <span className="text-slate-500 text-[10px]">telemetry triggers</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800 rounded-lg p-2.5 flex flex-col justify-between">
          <span className="text-slate-500 text-[10px] uppercase">ACTIVE SCENARIOS</span>
          <div className="flex items-baseline gap-1 mt-0.5">
            <span className="text-base font-bold text-cyan-400">{state.activeScenarios.length}</span>
            <span className="text-slate-500 text-[10px]">simulated paths</span>
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
          { id: 'overview', label: '1. OVERVIEW & READINESS', icon: Compass },
          { id: 'objectives', label: '2. OBJECTIVES MATRIX', icon: Target },
          { id: 'roadmap', label: '3. MISSION ROADMAP & CRITICAL PATH', icon: Milestone },
          { id: 'scenarios', label: '4. SCENARIO SIMULATOR', icon: Layers },
          { id: 'risks', label: '5. RISK INTELLIGENCE (7 CATS)', icon: AlertTriangle },
          { id: 'coordination', label: '6. 6-AGENT CONSENSUS', icon: Users },
          { id: 'knowledge', label: '7. KNOWLEDGE & ASSUMPTIONS', icon: BookOpen },
          { id: 'optimization', label: '8. STRATEGY OPTIMIZER', icon: Sliders },
          { id: 'approvals', label: `9. OPERATOR APPROVALS (${pendingApprovals.length})`, icon: ShieldCheck },
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

      {/* SUBVIEW 1: OVERVIEW & READINESS */}
      {activeSubView === 'overview' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Active Strategic Plan Brief */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-cyan-400" />
                    Active Plan: {state.latestPlan ? state.latestPlan.name : 'Initializing...'}
                  </span>
                  <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-400">
                    v{state.latestPlan?.version}
                  </span>
                </div>
                <p className="text-slate-400 text-xs mb-3">
                  {state.latestPlan?.lastRevisionReason || 'Executing default PRISM SIGNAL operational plan with continuous telemetry adaptation.'}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">TOTAL OBJECTIVES</span>
                    <span className="text-cyan-300 font-bold text-sm">{state.latestPlan?.objectives.length ?? 0}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">TOTAL MILESTONES</span>
                    <span className="text-cyan-300 font-bold text-sm">{state.latestPlan?.milestones.length ?? 0}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">CRITICAL PATH LENGTH</span>
                    <span className="text-purple-300 font-bold text-sm">{state.latestPlan?.criticalPathMilestoneIds.length ?? 0} stages</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                    <span className="text-slate-500 block text-[10px]">OPERATOR SIGN-OFF</span>
                    <span className="text-emerald-400 font-bold text-sm">ENFORCED</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                <span>Created: {new Date(state.latestPlan?.createdAt || Date.now()).toLocaleTimeString()}</span>
                <span>Updated: {new Date(state.latestPlan?.updatedAt || Date.now()).toLocaleTimeString()}</span>
              </div>
            </div>

            {/* Strategic Agent Council Status */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-cyan-400" />
                    6-Agent Strategic Council Synthesis
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                    state.coordination.consensusIndex >= 70
                      ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-500 text-amber-300'
                  }`}>
                    CONSENSUS: {state.coordination.consensusIndex}%
                  </span>
                </div>
                <p className="text-slate-300 text-xs mb-3 leading-relaxed">
                  {state.coordination.overallStrategicDirection}
                </p>
                <div className="space-y-1.5 mb-3">
                  {state.coordination.agentPositions.map((pos) => (
                    <div key={pos.agentRole} className="flex items-center justify-between text-[11px] bg-slate-900/60 px-2 py-1.5 rounded border border-slate-800">
                      <span className="text-slate-300 font-medium">{pos.agentName}</span>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                          pos.stance === 'CONCUR'
                            ? 'bg-emerald-950 text-emerald-400'
                            : pos.stance === 'CAUTION'
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-rose-950 text-rose-400'
                        }`}>
                          {pos.stance}
                        </span>
                        <span className="text-slate-500 text-[10px]">{pos.confidenceScore}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px]">
                <span className="text-slate-500">Active Disagreements: {state.coordination.activeDisagreements.length}</span>
                <span className={state.coordination.humanApprovalRequired ? 'text-amber-400 font-bold' : 'text-emerald-400'}>
                  {state.coordination.humanApprovalRequired ? '⚠️ OPERATOR GATE REQUIRED' : '✓ AUTONOMOUS HARMONY'}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Recommendation & Strategy Strip */}
          {state.optimizationReport && (
            <div className="bg-slate-900/70 border border-purple-800/80 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Sliders className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-purple-300 text-xs uppercase">
                    Recommended Strategy: {state.optimizationReport.competingStrategies.find((s) => s.strategyId === state.optimizationReport?.recommendedStrategyId)?.name}
                  </h4>
                  <p className="text-slate-300 text-xs mt-0.5">
                    {state.optimizationReport.optimizationRationale}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {state.optimizationReport.humanApprovalId && !state.optimizationReport.humanApproved ? (
                  <button
                    onClick={() => handleApproveStrategy(state.optimizationReport!.humanApprovalId!)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-black font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
                  >
                    <ShieldCheck className="w-4 h-4" /> Approve High-Impact Transition
                  </button>
                ) : (
                  <span className="px-3 py-1 bg-emerald-950 border border-emerald-600 rounded text-emerald-300 font-bold text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Strategy Active & Authorized
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 2: OBJECTIVES MATRIX */}
      {activeSubView === 'objectives' && (
        <div className="flex flex-col gap-4">
          {/* Create / Decompose Form */}
          <form onSubmit={handleDecomposeObjective} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-cyan-400" /> Formulate & Decompose Strategic Objective
              </span>
              <span className="text-[10px] text-slate-500">Decomposes objectives into measurable telemetry SLAs</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Objective Title</label>
                <input
                  type="text"
                  placeholder="e.g., Optimize Spatial Physics Pipeline for Low-Light Multi-Sensors"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Horizon</label>
                <select
                  value={newHorizon}
                  onChange={(e) => setNewHorizon(e.target.value as StrategicHorizon)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="IMMEDIATE">IMMEDIATE (&lt; 6 Hours)</option>
                  <option value="SHORT_TERM">SHORT_TERM (1 - 3 Days)</option>
                  <option value="MEDIUM_TERM">MEDIUM_TERM (1 - 2 Weeks)</option>
                  <option value="LONG_TERM">LONG_TERM (1+ Months)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value as StrategicPriority)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Description & Operational Context</label>
              <textarea
                rows={2}
                placeholder="Detail the operational goal, required constraints, and intended outcomes..."
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!newTitle.trim()}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold rounded flex items-center gap-1.5 text-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Decompose & Add to Roadmap
              </button>
            </div>
          </form>

          {/* Objectives List */}
          <div className="space-y-3">
            {state.latestPlan?.objectives.map((obj) => (
              <div key={obj.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-xs">{obj.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      obj.priority === 'CRITICAL'
                        ? 'bg-rose-950 border border-rose-500 text-rose-300'
                        : obj.priority === 'HIGH'
                        ? 'bg-amber-950 border border-amber-500 text-amber-300'
                        : 'bg-slate-900 border border-slate-700 text-slate-300'
                    }`}>
                      {obj.priority}
                    </span>
                    <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-purple-300 border border-purple-800">
                      {obj.horizon}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">Feasibility: <strong className="text-emerald-400">{obj.feasibilityScore}%</strong></span>
                    <span className="text-[10px] bg-cyan-950/60 border border-cyan-800 px-2 py-0.5 rounded text-cyan-300 font-bold">
                      {obj.status}
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs">{obj.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] bg-slate-900/50 p-2 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">MIN CADENCE</span>
                    <span className="font-bold text-emerald-400">{obj.targetMetrics.minCadenceFps} FPS</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">MAX LATENCY</span>
                    <span className="font-bold text-cyan-400">{obj.targetMetrics.maxLatencyMs} ms</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">JOINT CONFIDENCE</span>
                    <span className="font-bold text-purple-400">≥ {(obj.targetMetrics.minJointConfidence * 100).toFixed(0)}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">MAX INCIDENTS</span>
                    <span className="font-bold text-amber-400">&lt; {obj.targetMetrics.maxIncidentRatePerHour}/hr</span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-400 pt-1">
                  <span>Resources: {obj.resourceRequirementSummary}</span>
                  <div className="w-32 bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div className="bg-cyan-500 h-1.5" style={{ width: `${obj.progressPercent}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 3: MISSION ROADMAP & CRITICAL PATH */}
      {activeSubView === 'roadmap' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Milestone className="w-4 h-4 text-cyan-400" />
                Long-Term Mission Roadmap & Milestone Dependency Graph
              </span>
              <span className="text-[10px] bg-purple-950 border border-purple-500 text-purple-300 px-2 py-0.5 rounded">
                CRITICAL PATH: {state.latestPlan?.criticalPathMilestoneIds.length} MILESTONES
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Milestone timeline automatically solves dependency constraints and dynamically adjusts completion probabilities based on active telemetry drift and incidents.
            </p>
          </div>

          <div className="space-y-3">
            {state.latestPlan?.milestones.map((m) => {
              const isCritical = state.latestPlan?.criticalPathMilestoneIds.includes(m.id);
              return (
                <div
                  key={m.id}
                  className={`bg-slate-950/80 border rounded-xl p-4 flex flex-col gap-2 transition-all ${
                    isCritical
                      ? 'border-purple-600/80 shadow-[0_0_12px_rgba(168,85,247,0.15)]'
                      : 'border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-xs">{m.title}</span>
                      {isCritical && (
                        <span className="text-[9px] bg-purple-950 border border-purple-500 text-purple-300 px-1.5 py-0.5 rounded font-bold">
                          CRITICAL PATH
                        </span>
                      )}
                      <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-400">
                        {m.horizon}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        m.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                          : m.status === 'IN_PROGRESS'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-600'
                          : m.status === 'AT_RISK'
                          ? 'bg-rose-950 text-rose-400 border border-rose-600'
                          : 'bg-slate-900 text-slate-400 border border-slate-700'
                      }`}>
                        {m.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-400 text-xs">{m.description}</p>

                  <div className="flex flex-wrap items-center justify-between text-[11px] bg-slate-900/60 p-2 rounded border border-slate-800/60">
                    <div className="flex items-center gap-4">
                      <span>Estimated Duration: <strong className="text-slate-200">{m.estimatedDurationHours}h</strong></span>
                      <span>Completion Probability: <strong className={m.completionProbability >= 80 ? 'text-emerald-400' : 'text-amber-400'}>{m.completionProbability}%</strong></span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Dependencies: {m.dependencies.length > 0 ? m.dependencies.join(', ') : 'None (Root Milestone)'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBVIEW 4: SCENARIO SIMULATOR */}
      {activeSubView === 'scenarios' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-cyan-800/80 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-cyan-300 text-xs uppercase">
                  Multi-Tier Strategic Scenario Simulation
                </span>
              </div>
              <span className="text-[10px] bg-amber-950 border border-amber-500 text-amber-300 font-bold px-2 py-0.5 rounded">
                SIMULATED PREDICTIONS // IS_SIMULATED_DATA: TRUE
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Synthesizes 4 distinct futures against Digital Twin forward kinematics and thermal constraints. All projections are tagged as simulated counterfactual models.
            </p>

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-bold">Filter Profile:</span>
              {['ALL', 'BEST_CASE', 'EXPECTED', 'WORST_CASE', 'ALTERNATIVE_PATH'].map((type) => (
                <button
                  key={type}
                  onClick={() => setScenarioFilter(type)}
                  className={`px-2 py-0.5 rounded text-[10px] ${
                    scenarioFilter === type
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredScenarios.map((scen) => (
              <div key={scen.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-slate-200 text-xs">{scen.name}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      scen.type === 'BEST_CASE'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : scen.type === 'EXPECTED'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-600'
                        : scen.type === 'WORST_CASE'
                        ? 'bg-rose-950 text-rose-400 border border-rose-600'
                        : 'bg-purple-950 text-purple-400 border border-purple-600'
                    }`}>
                      {scen.type}
                    </span>
                  </div>

                  <p className="text-slate-400 text-xs mb-3">{scen.description}</p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">PROJECTED CADENCE</span>
                      <span className="text-emerald-400 font-bold">{scen.projectedCadenceFps} FPS</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">PROJECTED LATENCY</span>
                      <span className="text-cyan-400 font-bold">{scen.projectedLatencyMs} ms</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">OCCURRENCE PROBABILITY</span>
                      <span className="text-purple-400 font-bold">{scen.probability}%</span>
                    </div>
                    <div className="bg-slate-900/60 p-2 rounded border border-slate-800">
                      <span className="text-slate-500 block text-[10px]">RESOURCE EFFICIENCY</span>
                      <span className="text-amber-400 font-bold">{scen.resourceEfficiencyScore}%</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 p-2 rounded border border-slate-800/70 mb-2">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">STRATEGIC RECOMMENDATION</span>
                    <p className="text-slate-300 text-xs">{scen.recommendation}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Survival Probability: <strong className="text-emerald-400">{scen.estimatedSurvivalProbability}%</strong></span>
                  <span className="text-amber-400/90 font-mono">isSimulatedData: true</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 5: RISK INTELLIGENCE (7 CATEGORIES) */}
      {activeSubView === 'risks' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-cyan-400" />
                Quantitative 7-Category Risk Intelligence
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                OVERALL RISK: <strong className={state.riskSummary.overallSystemRiskScore < 40 ? 'text-emerald-400' : 'text-amber-400'}>{state.riskSummary.overallSystemRiskScore}/100</strong>
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Automated scoring evaluates real-time telemetry pressure against defined early warning thresholds. Triggered risks automatically update residual risk calculations.
            </p>

            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-800 overflow-x-auto">
              <span className="text-[10px] text-slate-500 uppercase font-bold shrink-0">Filter Category:</span>
              {['ALL', 'TECHNICAL', 'MISSION_EXECUTION', 'PERFORMANCE', 'INFRASTRUCTURE', 'DATA_INTEGRITY', 'SECURITY', 'RESOURCE'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setRiskCategoryFilter(cat)}
                  className={`px-2 py-0.5 rounded text-[10px] whitespace-nowrap ${
                    riskCategoryFilter === cat
                      ? 'bg-cyan-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filteredRisks.map((risk) => (
              <div
                key={risk.id}
                className={`bg-slate-950/80 border rounded-xl p-4 flex flex-col gap-2 transition-all ${
                  risk.isTriggered
                    ? 'border-rose-600/80 bg-rose-950/10'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs">{risk.title}</span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-cyan-400">
                      {risk.category}
                    </span>
                    {risk.isTriggered && (
                      <span className="text-[9px] bg-rose-950 border border-rose-500 text-rose-300 font-bold px-1.5 py-0.5 rounded">
                        TRIGGERED
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      Composite Risk: <strong className={risk.compositeRiskScore >= 50 ? 'text-rose-400' : 'text-emerald-400'}>{risk.compositeRiskScore}/100</strong>
                    </span>
                  </div>
                </div>

                <p className="text-slate-300 text-xs">{risk.description}</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] bg-slate-900/60 p-2.5 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] font-bold block mb-1">TRIGGER THRESHOLD & STATUS</span>
                    <p className={risk.isTriggered ? 'text-rose-300 font-bold' : 'text-slate-300'}>
                      {risk.triggerThresholdText}
                    </p>
                    <div className="mt-2">
                      <span className="text-slate-500 text-[10px] font-bold block mb-0.5">EARLY WARNING INDICATORS:</span>
                      <ul className="list-disc list-inside text-slate-400 text-[10px] space-y-0.5">
                        {risk.earlyWarningIndicators.map((ewi, idx) => (
                          <li key={idx}>{ewi}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div>
                    <span className="text-slate-500 text-[10px] font-bold block mb-1">MITIGATION & RESIDUAL RISK</span>
                    <p className="text-emerald-300 text-xs">{risk.mitigationStrategy}</p>
                    <div className="mt-2 text-[10px] text-slate-400 flex items-center justify-between">
                      <span>Residual Risk Score: <strong className="text-emerald-400">{risk.residualRiskScore} pts</strong></span>
                      <span>Cascading Links: {risk.dependentRiskIds.length > 0 ? risk.dependentRiskIds.join(', ') : 'None'}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 6: 6-AGENT CONSENSUS */}
      {activeSubView === 'coordination' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-cyan-400" />
                Multi-Agent Strategic Council (6 Specialist Agents)
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-cyan-400">
                OVERALL CONSENSUS: <strong className="text-emerald-400">{state.coordination.consensusIndex}%</strong>
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Continuous strategic consensus evaluation among Operations, Test, Tracking, Performance, Incident, and Chief Intelligence agents.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.coordination.agentPositions.map((pos) => (
              <div key={pos.agentRole} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
                    <span className="font-bold text-slate-200 text-xs">{pos.agentName}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      pos.stance === 'CONCUR'
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-600'
                        : pos.stance === 'CAUTION'
                        ? 'bg-amber-950 text-amber-400 border border-amber-600'
                        : 'bg-rose-950 text-rose-400 border border-rose-600'
                    }`}>
                      {pos.stance}
                    </span>
                  </div>

                  <span className="text-[10px] text-cyan-400 font-bold block mb-1">
                    FOCUS: {pos.priorityFocus}
                  </span>

                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800 mb-2">
                    <span className="text-[10px] text-slate-500 font-bold block mb-0.5">STRATEGIC DIRECTION</span>
                    <p className="text-slate-300 text-xs">{pos.recommendedStrategicDirection}</p>
                  </div>

                  <p className="text-slate-400 text-[11px] italic">
                    Rationale: {pos.rationale}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-500">
                  <span>Confidence: <strong className="text-cyan-400">{pos.confidenceScore}%</strong></span>
                  <span>Role: {pos.agentRole}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Active Disagreements Panel */}
          {state.coordination.activeDisagreements.length > 0 && (
            <div className="bg-slate-950/80 border border-amber-800/80 rounded-xl p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-amber-300 text-xs uppercase flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Active Strategic Disagreements ({state.coordination.activeDisagreements.length})
                </span>
                <span className="text-[10px] text-amber-400/90 font-bold">
                  MEDIATION REQUIRED
                </span>
              </div>

              {state.coordination.activeDisagreements.map((dis) => (
                <div key={dis.id} className="bg-slate-900/60 border border-slate-800 rounded p-3 text-xs">
                  <h5 className="font-bold text-slate-200 mb-1">{dis.issue}</h5>
                  <div className="space-y-1 mb-2">
                    {dis.agentPositions.map((ap, i) => (
                      <div key={i} className="text-[11px] text-slate-300">
                        <strong className="text-cyan-400">{ap.agentName}:</strong> {ap.position}
                      </div>
                    ))}
                  </div>
                  <div className="bg-emerald-950/40 border border-emerald-800/60 p-2 rounded text-emerald-300 text-[11px]">
                    <strong>Consensus Proposal:</strong> {dis.consensusResolutionProposal}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SUBVIEW 7: KNOWLEDGE & ASSUMPTIONS */}
      {activeSubView === 'knowledge' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                Strategic Knowledge Engine & Outdated Assumption Audit
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                PROVENANCE AUDITED
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Verifies operational axioms across historical Phases 17–26 and flags outdated assumptions to prevent recurring systemic blind spots.
            </p>
          </div>

          <div className="space-y-4">
            {state.knowledgeSummary.map((assoc) => (
              <div key={assoc.id} className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-300 text-xs">{assoc.topic}</span>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 px-2 py-0.5 rounded text-purple-300">
                      Phases: {assoc.relatedPhases.join(', ')}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    Provenance: <strong className="text-emerald-400">{assoc.provenance}</strong>
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] font-bold block mb-1 uppercase">VERIFIED AXIOMS</span>
                    <ul className="list-disc list-inside text-slate-300 text-[11px] space-y-1">
                      {assoc.verifiedAxioms.map((ax, idx) => (
                        <li key={idx}>{ax}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="bg-slate-900/60 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-400 text-[10px] font-bold block mb-1 uppercase">OUTDATED ASSUMPTIONS AUDITED</span>
                    <div className="space-y-2">
                      {assoc.outdatedAssumptions.map((audit) => (
                        <div key={audit.id} className="bg-slate-950/80 border border-slate-800 rounded p-2 text-[10px]">
                          <div className="flex items-center justify-between text-slate-300 font-bold mb-0.5">
                            <span className="line-through text-slate-400">{audit.assumption}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[9px] ${
                              audit.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'
                            }`}>
                              {audit.status}
                            </span>
                          </div>
                          <p className="text-amber-300/90 text-[10px]">{audit.invalidatedReason}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 8: STRATEGY OPTIMIZER */}
      {activeSubView === 'optimization' && (
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-cyan-300 text-xs uppercase flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Strategy Trade-Off & Optimization Simulator
              </span>
              <span className="text-[10px] bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-slate-400">
                MULTI-VECTOR OPTIMIZATION
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              Simulates competing runtime profiles across Performance, Reliability, Safety, Latency Budgets, and Energy Footprint. High or critical impact shifts require Human Operator approval.
            </p>
          </div>

          <div className="space-y-3">
            {state.optimizationReport?.competingStrategies.map((strat) => (
              <div
                key={strat.strategyId}
                className={`bg-slate-950/80 border rounded-xl p-4 flex flex-col gap-2 transition-all ${
                  strat.isRecommended
                    ? 'border-cyan-500 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs">{strat.name}</span>
                    {strat.isRecommended && (
                      <span className="text-[9px] bg-cyan-950 border border-cyan-500 text-cyan-300 font-bold px-1.5 py-0.5 rounded">
                        RECOMMENDED
                      </span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                      strat.impactLevel === 'CRITICAL'
                        ? 'bg-rose-950 text-rose-300'
                        : strat.impactLevel === 'HIGH'
                        ? 'bg-amber-950 text-amber-300'
                        : 'bg-slate-900 text-slate-400'
                    }`}>
                      IMPACT: {strat.impactLevel}
                    </span>
                  </div>

                  <span className="text-xs font-bold text-cyan-400">
                    Optimality Score: {strat.compositeScore}/100
                  </span>
                </div>

                <p className="text-slate-300 text-xs">{strat.description}</p>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[10px] bg-slate-900/60 p-2 rounded border border-slate-800">
                  <div>
                    <span className="text-slate-500 block">PERFORMANCE GAIN</span>
                    <span className={`font-bold ${strat.performanceGainPercent >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {strat.performanceGainPercent > 0 ? `+${strat.performanceGainPercent}%` : `${strat.performanceGainPercent}%`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">RELIABILITY MARGIN</span>
                    <span className="font-bold text-cyan-400">{strat.reliabilityMarginPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">SAFETY INDEX</span>
                    <span className="font-bold text-emerald-400">{strat.safetyIndexPercent}%</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">LATENCY DELTA</span>
                    <span className={`font-bold ${strat.latencyBudgetDeltaMs <= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {strat.latencyBudgetDeltaMs > 0 ? `+${strat.latencyBudgetDeltaMs}ms` : `${strat.latencyBudgetDeltaMs}ms`}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">ENERGY FOOTPRINT</span>
                    <span className="font-bold text-purple-400">{strat.energyConsumptionWatts}W</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUBVIEW 9: OPERATOR APPROVALS */}
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
              <p className="text-xs font-bold text-slate-300">No Pending Strategic Approvals</p>
              <p className="text-[11px] text-slate-500 mt-1">All active operational directives are operating within pre-authorized safety boundaries.</p>
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
                      onClick={() => handleApproveStrategy(req.approvalId)}
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
