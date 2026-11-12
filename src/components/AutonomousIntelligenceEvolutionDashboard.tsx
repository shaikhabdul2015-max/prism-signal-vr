/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Autonomous Intelligence Evolution & Self-Optimization Dashboard (Phase 34)
 * Tab 24: Real-Time Performance Telemetry, Controlled Runtime Self-Optimization,
 * Multi-Horizon AI Model Evaluation, Adaptive Resource Scheduling, Operator Approval Center,
 * Automated Rollback Verification, and Multi-Agent Evolution Consensus.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AutonomousIntelligenceEvolutionState,
  EvolutionLifecycleStage,
  OptimizationRecommendation,
  ModelPerformanceReport,
  OptimizationTargetDomain,
} from '../types/phase34';
import { IntelligenceEvolutionCoordinator } from '../engines/IntelligenceEvolutionCoordinator';
import { AutonomousIntelligenceEvolutionEngine } from '../engines/AutonomousIntelligenceEvolutionEngine';
import { SelfOptimizationEngine } from '../engines/SelfOptimizationEngine';
import { SystemPerformanceIntelligence } from '../engines/SystemPerformanceIntelligence';
import { AIModelEvaluationEngine } from '../engines/AIModelEvaluationEngine';
import { AdaptiveResourceManagementEngine } from '../engines/AdaptiveResourceManagementEngine';
import { OptimizationRollbackEngine } from '../engines/OptimizationRollbackEngine';
import {
  Sparkles,
  Activity,
  Cpu,
  Brain,
  Shield,
  Clock,
  ArrowRight,
  RefreshCw,
  GitBranch,
  BarChart2,
  Zap,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Check,
  X,
  Layers,
  FileText,
  UserCheck,
  TrendingUp,
  AlertCircle,
  Database,
  Lock,
} from 'lucide-react';

export const AutonomousIntelligenceEvolutionDashboard: React.FC = () => {
  const coordinator = useMemo(() => IntelligenceEvolutionCoordinator.getInstance(), []);
  const evoEngine = useMemo(() => AutonomousIntelligenceEvolutionEngine.getInstance(), []);
  const selfOpt = useMemo(() => SelfOptimizationEngine.getInstance(), []);
  const perfEngine = useMemo(() => SystemPerformanceIntelligence.getInstance(), []);
  const rollbackEngine = useMemo(() => OptimizationRollbackEngine.getInstance(), []);

  const [state, setState] = useState<AutonomousIntelligenceEvolutionState>(coordinator.getState());
  const [activeTabSubSection, setActiveTabSubSection] = useState<'OVERVIEW' | 'PERFORMANCE' | 'CONFIG' | 'RESOURCES' | 'MODELS' | 'RECOMMENDATIONS' | 'APPROVAL' | 'ROLLBACK' | 'COUNCIL'>('OVERVIEW');
  const [operatorId, setOperatorId] = useState('OPERATOR-CHIEF-01');
  const [manualRollbackReason, setManualRollbackReason] = useState('Manual operator intervention for verification');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('ALL');
  const [selectedHorizonFilter, setSelectedHorizonFilter] = useState<'ALL' | 'SHORT_15S' | 'MEDIUM_30S' | 'EXTENDED_60S_120S'>('ALL');
  const [selectedRecIdForDetails, setSelectedRecIdForDetails] = useState<string | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<{ type: 'success' | 'warn' | 'error'; text: string } | null>(null);

  useEffect(() => {
    const unsub = coordinator.subscribe((st) => setState(st));
    return () => unsub();
  }, [coordinator]);

  const showNotification = (type: 'success' | 'warn' | 'error', text: string) => {
    setNotificationMsg({ type, text });
    setTimeout(() => setNotificationMsg(null), 4500);
  };

  const handleRunObservationCycle = () => {
    const result = evoEngine.runObservationCycle();
    coordinator.evaluateAgentConsensus();
    coordinator.notifyListeners();
    showNotification('success', `Cycle completed: ${result.stage} stage active. Captured system performance snapshot.`);
  };

  const handleValidate = (recId: string) => {
    try {
      const rep = evoEngine.validateRecommendation(recId);
      coordinator.evaluateAgentConsensus();
      coordinator.notifyListeners();
      if (rep.overallValidationPassed) {
        showNotification('success', `Validation passed for ${recId}. Moved to PENDING_APPROVAL.`);
      } else {
        showNotification('warn', `Validation failed for ${recId}. See validation report.`);
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Validation error');
    }
  };

  const handleApproveAndApply = (recId: string) => {
    try {
      const result = evoEngine.applyApprovedOptimization(recId, operatorId);
      coordinator.evaluateAgentConsensus();
      coordinator.notifyListeners();
      showNotification('success', `Approved and applied ${recId}. Transitioned to MEASURE stage.`);
    } catch (err: any) {
      showNotification('error', err?.message || 'Application error');
    }
  };

  const handleEvaluateMeasurement = (recId: string, simulateRegression = false) => {
    try {
      const result = evoEngine.evaluateMeasurementOutcome(
        recId,
        simulateRegression ? { apiResponseLatencyMs: 480, renderCadenceFps: 38 } : undefined
      );
      coordinator.evaluateAgentConsensus();
      coordinator.notifyListeners();
      if (result.outcome === 'SUCCESS') {
        showNotification('success', `Measurement confirmed success! Re-entered OBSERVE.`);
      } else {
        showNotification('warn', `Regression detected! Automatic rollback executed: ${result.rollbackRecord?.triggerReason}`);
      }
    } catch (err: any) {
      showNotification('error', err?.message || 'Measurement error');
    }
  };

  const handleManualRollback = (recId: string) => {
    try {
      const record = evoEngine.triggerManualRollback(recId, manualRollbackReason);
      coordinator.evaluateAgentConsensus();
      coordinator.notifyListeners();
      showNotification('warn', `Manual rollback executed for ${recId}. Restored baseline parameter.`);
    } catch (err: any) {
      showNotification('error', err?.message || 'Rollback error');
    }
  };

  const filteredRecommendations = useMemo(() => {
    return state.recommendations.filter((r) => {
      if (selectedDomainFilter !== 'ALL' && r.domain !== selectedDomainFilter) return false;
      return true;
    });
  }, [state.recommendations, selectedDomainFilter]);

  const filteredModels = useMemo(() => {
    return state.modelEvaluations.filter((m) => {
      if (selectedHorizonFilter !== 'ALL' && m.evaluatedHorizon !== selectedHorizonFilter) return false;
      return true;
    });
  }, [state.modelEvaluations, selectedHorizonFilter]);

  const getStageBadgeColor = (stage: EvolutionLifecycleStage) => {
    switch (stage) {
      case 'OBSERVE': return 'bg-cyan-950/80 text-cyan-400 border-cyan-800';
      case 'ANALYZE': return 'bg-blue-950/80 text-blue-400 border-blue-800';
      case 'IDENTIFY': return 'bg-indigo-950/80 text-indigo-400 border-indigo-800';
      case 'RECOMMEND': return 'bg-purple-950/80 text-purple-400 border-purple-800';
      case 'VALIDATE': return 'bg-yellow-950/80 text-yellow-400 border-yellow-800';
      case 'REQUEST_APPROVAL': return 'bg-amber-950/80 text-amber-300 border-amber-600 animate-pulse';
      case 'APPLY': return 'bg-emerald-950/80 text-emerald-400 border-emerald-700';
      case 'MEASURE': return 'bg-emerald-900/60 text-emerald-300 border-emerald-500';
      case 'ROLLBACK': return 'bg-rose-950/80 text-rose-400 border-rose-800';
      default: return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 flex flex-col p-4 md:p-6 space-y-6 overflow-y-auto">
      {/* Header bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 shadow-sm shadow-emerald-500/10">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                  AUTONOMOUS INTELLIGENCE EVOLUTION &amp; SELF-OPTIMIZATION
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-mono font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  PHASE 34
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-400 mt-0.5">
                Closed-Loop Self-Optimization, Multi-Horizon Evaluation, Safe Controlled Adaptation &amp; Instant Rollback
              </p>
            </div>
          </div>
        </div>

        {/* Global Action / Control Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className={`px-3 py-1.5 rounded-md border text-xs font-mono font-semibold flex items-center space-x-2 ${getStageBadgeColor(state.currentStage)}`}>
            <Activity className="w-3.5 h-3.5" />
            <span>LIFECYCLE: {state.currentStage}</span>
          </div>

          <div className="px-3 py-1.5 rounded-md border border-slate-700 bg-slate-900 text-xs font-mono text-slate-300 flex items-center space-x-1.5">
            <GitBranch className="w-3.5 h-3.5 text-cyan-400" />
            <span>CONFIG: {state.learningProgress.currentConfigurationVersion}</span>
          </div>

          <button
            onClick={handleRunObservationCycle}
            className="px-3.5 py-1.5 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-sm shadow-emerald-600/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Run Evolution Cycle</span>
          </button>
        </div>
      </div>

      {/* Notification Toast */}
      {notificationMsg && (
        <div
          className={`p-3 rounded-lg border text-xs font-mono flex items-center justify-between ${
            notificationMsg.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-700 text-emerald-200'
              : notificationMsg.type === 'warn'
              ? 'bg-amber-950/90 border-amber-700 text-amber-200'
              : 'bg-rose-950/90 border-rose-700 text-rose-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{notificationMsg.text}</span>
          </div>
          <button onClick={() => setNotificationMsg(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub-Navigation Tabs */}
      <div className="flex overflow-x-auto space-x-1 pb-1 border-b border-slate-800 scrollbar-none">
        {[
          { id: 'OVERVIEW', label: '1. Executive Overview', icon: Brain },
          { id: 'PERFORMANCE', label: '2. Live Performance Telemetry', icon: Activity },
          { id: 'CONFIG', label: '3. Controlled Self-Optimization', icon: Sliders },
          { id: 'RESOURCES', label: '4. Adaptive Resource Engine', icon: Cpu },
          { id: 'MODELS', label: '5. Multi-Horizon Model Matrix', icon: BarChart2 },
          { id: 'RECOMMENDATIONS', label: '6. Recommendations', icon: Layers },
          { id: 'APPROVAL', label: '7. Operator Approval Center', icon: UserCheck },
          { id: 'ROLLBACK', label: '8. Validation & Rollback History', icon: RotateCcw },
          { id: 'COUNCIL', label: '9. Multi-Agent Council (6 Agents)', icon: Shield },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTabSubSection === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTabSubSection(tab.id as any)}
              className={`px-3 py-2 text-xs font-medium rounded-t-lg transition-colors flex items-center space-x-2 whitespace-nowrap border-b-2 ${
                isActive
                  ? 'border-emerald-500 text-emerald-400 bg-slate-900/80'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.id === 'APPROVAL' && state.pendingApprovals.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-black text-[10px] font-bold">
                  {state.pendingApprovals.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* SECTION 1: EXECUTIVE OVERVIEW */}
      {activeTabSubSection === 'OVERVIEW' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Evolution Lifecycle Stage</span>
                <Sparkles className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold font-mono text-emerald-300">{state.currentStage}</div>
                <div className="text-[11px] text-slate-400 mt-1">9-Stage Closed-Loop State Machine</div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Active Safety Guards:</span>
                <span className="text-emerald-400 font-mono">Zero-Trust Enforced</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Optimization Success Rate</span>
                <TrendingUp className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold font-mono text-cyan-300">
                  {state.learningProgress.optimizationSuccessRatePercent}%
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {state.learningProgress.successfulOptimizationsCount} successful / {state.learningProgress.totalOptimizationsApplied} total
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Rollback Incidents:</span>
                <span className="text-amber-400 font-mono">{state.learningProgress.rollbacksCount} rollbacks</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Runtime API Latency</span>
                <Clock className="w-4 h-4 text-purple-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold font-mono text-purple-300">
                  {state.systemPerformance.apiResponseLatencyMs} ms
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  AI Provider: {state.systemPerformance.aiProviderResponseTimeMs} ms
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>API Success Rate:</span>
                <span className="text-emerald-400 font-mono">{state.systemPerformance.apiSuccessRatePercent}%</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400">
                <span className="text-xs font-medium">Render Cadence &amp; Cache</span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <div className="mt-2">
                <div className="text-xl font-bold font-mono text-amber-300">
                  {state.systemPerformance.renderCadenceFps} FPS
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Cache Hit: {state.systemPerformance.cacheHitRatioPercent}%
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>Real Memory:</span>
                <span className="text-slate-300 font-mono">
                  {state.systemPerformance.isMemoryMeasured
                    ? `${state.systemPerformance.measuredMemoryMb} MB`
                    : 'N/A in browser'}
                </span>
              </div>
            </div>
          </div>

          {/* 9-Stage Evolution Visual Flow */}
          <div className="p-5 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Closed-Loop Evolution Lifecycle Flow</span>
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2 text-center text-xs">
              {[
                { stage: 'OBSERVE', desc: 'Telemetry & Memory' },
                { stage: 'ANALYZE', desc: 'Bottleneck Audit' },
                { stage: 'IDENTIFY', desc: 'Targets Scoped' },
                { stage: 'RECOMMEND', desc: 'Evidence Synthesized' },
                { stage: 'VALIDATE', desc: 'Pre-flight Checks' },
                { stage: 'REQUEST_APPROVAL', desc: 'Operator Gate' },
                { stage: 'APPLY', desc: 'Parameter Update' },
                { stage: 'MEASURE', desc: 'Post Stability' },
                { stage: 'ROLLBACK', desc: 'Instant Reversion' },
              ].map((step, idx) => {
                const isCurrent = state.currentStage === step.stage;
                return (
                  <div
                    key={step.stage}
                    className={`p-2.5 rounded-lg border transition-all ${
                      isCurrent
                        ? 'border-emerald-500 bg-emerald-950/60 shadow-md shadow-emerald-500/20 text-emerald-300'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 font-mono">STAGE {idx + 1}</div>
                    <div className="font-bold text-xs mt-0.5 truncate">{step.stage}</div>
                    <div className="text-[10px] text-slate-400 mt-1 leading-tight">{step.desc}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Bottlenecks & Strategic Directive */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span>Real-Time Bottleneck Identification</span>
                </span>
                <span className="text-xs font-mono text-slate-400">
                  {state.systemPerformance.activeBottlenecks.length} detected
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {state.systemPerformance.activeBottlenecks.length === 0 ? (
                  <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All operational parameters nominal. No active system bottlenecks detected.</span>
                  </div>
                ) : (
                  state.systemPerformance.activeBottlenecks.map((b, i) => (
                    <div key={i} className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-200 font-mono flex items-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{b}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-semibold text-slate-300 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span>Multi-Agent Strategic Directive</span>
                </span>
                <span className="text-xs font-mono text-emerald-400">
                  {state.agentConsensus?.consensusAgreementPercent}% Consensus
                </span>
              </div>
              <div className="mt-3 space-y-3">
                <p className="text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800 leading-relaxed font-mono">
                  {state.agentConsensus?.strategicDirective || 'Autonomous coordination active.'}
                </p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Persistence Tier:</span>
                  <div className="flex items-center space-x-1">
                    {(['LOCAL_DEVELOPMENT', 'CLOUD_FIRESTORE', 'OFFLINE_FALLBACK'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => coordinator.setPersistenceMode(mode)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          state.persistenceMode === mode
                            ? 'bg-emerald-600 text-white font-bold'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {mode.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: LIVE PERFORMANCE TELEMETRY */}
      {activeTabSubSection === 'PERFORMANCE' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-3 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Real-Time Measured System Telemetry (Browser Safe Ingestion)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Real browser-provided runtime indicators. Strictly never fabricates CPU, external cloud, or simulated operating system values.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">API Latency</div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                  {state.systemPerformance.apiResponseLatencyMs} ms
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Threshold: &lt; 300 ms</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">AI Provider Response</div>
                <div className="text-lg font-bold font-mono text-purple-400 mt-1">
                  {state.systemPerformance.aiProviderResponseTimeMs} ms
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Gemini 2.5 Server Proxy</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Task Execution Duration</div>
                <div className="text-lg font-bold font-mono text-amber-400 mt-1">
                  {state.systemPerformance.taskExecutionDurationMs} ms
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Per-task pipeline mean</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Task Queue Depth</div>
                <div className="text-lg font-bold font-mono text-slate-200 mt-1">
                  {state.systemPerformance.queueDepth}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Max capacity: 25</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Cache Hit Ratio</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  {state.systemPerformance.cacheHitRatioPercent}%
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Target: &gt; 80%</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Render Frame Cadence</div>
                <div className="text-lg font-bold font-mono text-blue-400 mt-1">
                  {state.systemPerformance.renderCadenceFps} FPS
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Drops: {state.systemPerformance.renderFrameDropPercent}%</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">Active AI Agents</div>
                <div className="text-lg font-bold font-mono text-emerald-400 mt-1">
                  {state.systemPerformance.activeAgentsCount} / 6
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">Specialist roles synchronized</div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[11px] text-slate-400">JS Memory Heap</div>
                <div className="text-lg font-bold font-mono text-cyan-400 mt-1">
                  {state.systemPerformance.isMemoryMeasured
                    ? `${state.systemPerformance.measuredMemoryMb} MB`
                    : 'N/A'}
                </div>
                <div className="text-[10px] text-slate-400 mt-0.5">
                  {state.systemPerformance.isMemoryMeasured
                    ? 'performance.memory.usedJSHeapSize'
                    : 'Not exposed by current browser'}
                </div>
              </div>
            </div>
          </div>

          {/* Metric Samples History */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center space-x-2">
              <Clock className="w-3.5 h-3.5 text-cyan-400" />
              <span>Recent Metric Telemetry Samples</span>
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2 px-3">Timestamp</th>
                    <th className="py-2 px-3">Metric Key</th>
                    <th className="py-2 px-3">Value</th>
                    <th className="py-2 px-3">Type</th>
                    <th className="py-2 px-3">Source</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {state.performanceHistory.slice(-8).reverse().map((sample, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/40">
                      <td className="py-2 px-3 text-slate-400">{sample.timestamp.slice(11, 19)}</td>
                      <td className="py-2 px-3 text-cyan-300">{sample.metricKey}</td>
                      <td className="py-2 px-3 text-emerald-400 font-bold">{sample.value} {sample.unit}</td>
                      <td className="py-2 px-3 text-slate-400">{sample.type}</td>
                      <td className="py-2 px-3 text-purple-300">{sample.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 3: CONTROLLED SELF-OPTIMIZATION PANEL */}
      {activeTabSubSection === 'CONFIG' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Sliders className="w-4 h-4 text-emerald-400" />
                  <span>Controlled Self-Optimization Parameter Registry</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Controlled parameter manipulation across 8 target domains. Source code is never dynamically modified.
                </p>
              </div>
              <div className="text-xs font-mono text-emerald-400 px-3 py-1 bg-emerald-950/60 border border-emerald-800 rounded">
                ACTIVE VERSION: {state.learningProgress.currentConfigurationVersion}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(state.activeConfiguration).map(([key, val]) => {
                const isArray = Array.isArray(val);
                const displayVal = isArray ? JSON.stringify(val) : String(val);
                return (
                  <div key={key} className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between">
                    <div>
                      <div className="text-[11px] font-mono text-cyan-400 font-semibold truncate">{key}</div>
                      <div className="text-xs font-mono text-slate-200 mt-1 truncate bg-slate-900/80 p-1.5 rounded border border-slate-800">
                        {displayVal}
                      </div>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span>Domain: {key.split('.')[0]}</span>
                      <span className="text-emerald-400">Configured &amp; Auditable</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Config History Audit Log */}
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h4 className="text-xs font-semibold text-slate-300 mb-3 flex items-center space-x-2">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              <span>Configuration Version History &amp; Mutation Audit Log</span>
            </h4>
            <div className="space-y-2 text-xs font-mono">
              {selfOpt.getConfigHistory().length === 0 ? (
                <div className="text-slate-400 text-xs italic">Baseline initialization. No manual mutations yet.</div>
              ) : (
                selfOpt.getConfigHistory().slice(-5).reverse().map((h, i) => (
                  <div key={i} className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <span className="text-cyan-400">{h.version}</span>
                    <span className="text-slate-300">{h.key}</span>
                    <span className="text-slate-400">{JSON.stringify(h.oldValue)} &rarr; <span className="text-emerald-400">{JSON.stringify(h.newValue)}</span></span>
                    <span className="text-slate-400">{h.timestamp.slice(11, 19)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: ADAPTIVE RESOURCE MANAGEMENT */}
      {activeTabSubSection === 'RESOURCES' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-emerald-400" />
              <span>Adaptive Resource Scheduling &amp; Workload Balancing</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Dynamically proposes safe parameter envelopes based on real bottlenecks, client rendering FPS, and queue backlogs.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-slate-300">Task Scheduling Concurrency</div>
                <div className="text-2xl font-bold font-mono text-cyan-400 mt-2">
                  {state.activeConfiguration['taskScheduling.maxConcurrency']}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Safe Envelope: [2, 16] parallel tasks</div>
                <div className="mt-3 text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                  Integrates with Phase 31 WorkloadBalancer to avoid client main-thread contention.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-slate-300">Telemetry Cache TTL Horizon</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-2">
                  {state.activeConfiguration['caching.cacheTtlSeconds']} s
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Safe Envelope: [30s, 600s]</div>
                <div className="mt-3 text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                  Balances telemetry freshness against memory allocation quotas.
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div className="text-xs font-semibold text-slate-300">Dynamic Resolution Trigger</div>
                <div className="text-2xl font-bold font-mono text-amber-400 mt-2">
                  {state.activeConfiguration['rendering.dynamicResolutionThresholdFps']} FPS
                </div>
                <div className="text-[11px] text-slate-400 mt-1">Safe Envelope: [30, 60] FPS</div>
                <div className="mt-3 text-[11px] text-slate-300 bg-slate-900 p-2 rounded border border-slate-800">
                  Triggers 3D canvas downscaling if frame rate dips below threshold.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 5: MULTI-HORIZON AI MODEL MATRIX */}
      {activeTabSubSection === 'MODELS' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <BarChart2 className="w-4 h-4 text-emerald-400" />
                  <span>Multi-Horizon AI &amp; Algorithm Evaluation Matrix</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Addresses Holt Linear Smoothing limitations on short windows with horizon validation across 15s, 30s, and 60-120s.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400">Horizon:</span>
                {(['ALL', 'SHORT_15S', 'MEDIUM_30S', 'EXTENDED_60S_120S'] as const).map((h) => (
                  <button
                    key={h}
                    onClick={() => setSelectedHorizonFilter(h)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono transition-colors ${
                      selectedHorizonFilter === h
                        ? 'bg-emerald-600 text-white font-semibold'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {h.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredModels.map((m) => (
                <div
                  key={`${m.modelId}-${m.evaluatedHorizon}`}
                  className={`p-4 rounded-xl border transition-all ${
                    m.degradationDetected
                      ? 'bg-amber-950/20 border-amber-800/70'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-100">{m.modelName}</div>
                      <div className="text-[10px] font-mono text-cyan-400 mt-0.5">{m.providerType}</div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-mono rounded ${
                      m.degradationDetected ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {m.evaluatedHorizon}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Latency</div>
                      <div className="text-slate-200 font-bold">{m.averageLatencyMs} ms</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Success Rate</div>
                      <div className="text-emerald-400 font-bold">{m.successRatePercent}%</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">Accuracy</div>
                      <div className="text-cyan-400 font-bold">{m.predictionAccuracyPercent}%</div>
                    </div>
                    <div className="p-2 rounded bg-slate-900 border border-slate-800">
                      <div className="text-[10px] text-slate-400">MAPE / MAE</div>
                      <div className={m.meanAbsolutePercentageError > 10 ? 'text-amber-400 font-bold' : 'text-slate-300 font-bold'}>
                        {m.meanAbsolutePercentageError}% / {m.meanAbsoluteError}
                      </div>
                    </div>
                  </div>

                  {m.degradationDetected && (
                    <div className="mt-3 p-2.5 rounded bg-amber-950/40 border border-amber-800 text-[11px] text-amber-200 flex items-start space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{m.recommendedAction}</span>
                    </div>
                  )}

                  {!m.degradationDetected && m.recommendedAction && (
                    <div className="mt-3 text-[11px] text-slate-400 italic">
                      {m.recommendedAction}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 6: RECOMMENDATIONS */}
      {activeTabSubSection === 'RECOMMENDATIONS' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-emerald-400" />
                  <span>Evidence-Based Optimization Recommendations</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Formulated from real bottlenecks and model evaluations. Includes risk profile and rollback metric.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-400">Domain:</span>
                <select
                  value={selectedDomainFilter}
                  onChange={(e) => setSelectedDomainFilter(e.target.value)}
                  className="bg-slate-900 text-slate-200 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono"
                >
                  <option value="ALL">ALL DOMAINS</option>
                  <option value="AI_REQUEST_ROUTING">AI REQUEST ROUTING</option>
                  <option value="TASK_SCHEDULING">TASK SCHEDULING</option>
                  <option value="CACHING_POLICIES">CACHING POLICIES</option>
                  <option value="RENDERING_PERFORMANCE">RENDERING PERFORMANCE</option>
                  <option value="DATA_PROCESSING_PIPELINES">DATA PIPELINES</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              {filteredRecommendations.map((rec) => (
                <div
                  key={rec.recommendationId}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold ${
                        rec.priority === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300' :
                        rec.priority === 'HIGH' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                      }`}>
                        {rec.priority}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100">{rec.title}</h4>
                    </div>

                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-cyan-400">{rec.confidenceScore}% Confidence</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                        {rec.status}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 mt-2 leading-relaxed">{rec.problemDescription}</p>

                  <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] font-bold text-emerald-400">EXPECTED BENEFIT:</div>
                      <div className="text-slate-300 mt-0.5">{rec.expectedBenefit}</div>
                    </div>
                    <div className="p-2.5 rounded bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] font-bold text-amber-400">ROLLBACK THRESHOLD METRIC:</div>
                      <div className="text-slate-300 mt-0.5 font-mono">
                        {rec.rollbackThresholdMetric} ({rec.rollbackThresholdValue})
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
                    <div className="font-mono text-slate-400 text-[11px]">
                      Target: <span className="text-cyan-300">{rec.targetConfigKey}</span> ({String(rec.currentValue)} &rarr; <span className="text-emerald-400">{String(rec.proposedValue)}</span>)
                    </div>

                    <div className="flex items-center space-x-2">
                      {rec.status === 'PROPOSED' && (
                        <button
                          onClick={() => handleValidate(rec.recommendationId)}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Run Pre-flight Safety Validation</span>
                        </button>
                      )}

                      {rec.status === 'PENDING_APPROVAL' && (
                        <button
                          onClick={() => setActiveTabSubSection('APPROVAL')}
                          className="px-3 py-1 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium flex items-center space-x-1"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Review in Approval Center</span>
                        </button>
                      )}

                      {rec.status === 'MEASURING' && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEvaluateMeasurement(rec.recommendationId, false)}
                            className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium flex items-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Stability (Success)</span>
                          </button>
                          <button
                            onClick={() => handleEvaluateMeasurement(rec.recommendationId, true)}
                            className="px-3 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium flex items-center space-x-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Simulate Degradation Rollback</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 7: OPERATOR APPROVAL CENTER */}
      {activeTabSubSection === 'APPROVAL' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Operator Approval &amp; Authorization Center</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              All high-impact optimizations require explicit operator authorization. Zero-Trust security invariants are never bypassed.
            </p>

            <div className="flex items-center space-x-3 mb-4 p-3 rounded-lg bg-slate-950 border border-slate-800">
              <span className="text-xs font-medium text-slate-300">Operator Identifier:</span>
              <input
                type="text"
                value={operatorId}
                onChange={(e) => setOperatorId(e.target.value)}
                className="bg-slate-900 text-emerald-400 border border-slate-700 rounded px-3 py-1 text-xs font-mono w-60"
              />
              <span className="text-xs text-slate-400">Authorized Role: Senior AI Operations Officer</span>
            </div>

            {state.pendingApprovals.length === 0 ? (
              <div className="p-6 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-slate-400 text-xs">
                No optimization recommendations currently pending operator authorization.
              </div>
            ) : (
              <div className="space-y-4">
                {state.pendingApprovals.map((rec) => {
                  const valReport = state.validationReports[rec.recommendationId];
                  return (
                    <div
                      key={rec.recommendationId}
                      className="p-5 rounded-xl bg-slate-950 border border-amber-600/40 shadow-sm shadow-amber-500/10"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                              PENDING APPROVAL
                            </span>
                            <h4 className="text-sm font-bold text-white">{rec.title}</h4>
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{rec.problemDescription}</p>
                        </div>
                        <div className="text-xs font-mono text-cyan-400">Priority: {rec.priority}</div>
                      </div>

                      {/* Validation Safety Report */}
                      {valReport && (
                        <div className="mt-4 p-3 rounded-lg bg-slate-900/90 border border-slate-800">
                          <div className="text-xs font-bold text-slate-200 mb-2 flex items-center space-x-1.5">
                            <Shield className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Pre-Flight Validation Check Results</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
                            {valReport.checks.map((chk) => (
                              <div key={chk.checkId} className="flex items-center justify-between p-2 rounded bg-slate-950 border border-slate-800/80">
                                <span className="text-slate-300">{chk.checkName}</span>
                                <span className={chk.passed ? 'text-emerald-400 flex items-center space-x-1' : 'text-rose-400'}>
                                  {chk.passed ? <CheckCircle2 className="w-3 h-3" /> : <X className="w-3 h-3" />}
                                  <span>{chk.passed ? 'PASSED' : 'FAILED'}</span>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
                        <div className="text-xs font-mono text-slate-400">
                          Target: <span className="text-cyan-300">{rec.targetConfigKey}</span> &rarr; Proposed: <span className="text-emerald-400">{String(rec.proposedValue)}</span>
                        </div>

                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              evoEngine.validateRecommendation(rec.recommendationId);
                              showNotification('warn', `Recommendation rejected.`);
                            }}
                            className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                          >
                            Reject Proposal
                          </button>
                          <button
                            onClick={() => handleApproveAndApply(rec.recommendationId)}
                            className="px-4 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm shadow-emerald-600/30 flex items-center space-x-1.5"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Authorize &amp; Apply Immediately</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION 8: VALIDATION & ROLLBACK HISTORY */}
      {activeTabSubSection === 'ROLLBACK' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>Validation &amp; Rollback History Audit</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete audit record of automated regression rollbacks and operator-initiated manual overrides.
                </p>
              </div>

              {/* Manual rollback trigger */}
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Rollback reason..."
                  value={manualRollbackReason}
                  onChange={(e) => setManualRollbackReason(e.target.value)}
                  className="bg-slate-900 text-xs font-mono text-slate-200 border border-slate-700 rounded px-2.5 py-1 w-64"
                />
                <button
                  onClick={() => {
                    const firstRec = state.recommendations[0];
                    if (firstRec) handleManualRollback(firstRec.recommendationId);
                  }}
                  className="px-3 py-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded flex items-center space-x-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Execute Rollback</span>
                </button>
              </div>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {state.rollbackHistory.length === 0 ? (
                <div className="p-4 rounded bg-slate-950 border border-slate-800 text-slate-400 text-center">
                  No rollbacks recorded in active session. All applied optimizations stable.
                </div>
              ) : (
                state.rollbackHistory.map((rb) => (
                  <div key={rb.rollbackId} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          rb.triggeredBy === 'AUTOMATIC_REGRESSION_DETECTION' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'
                        }`}>
                          {rb.triggeredBy}
                        </span>
                        <span className="text-slate-200 font-bold">{rb.configKey}</span>
                      </div>
                      <span className="text-slate-400 text-[11px]">{rb.rollbackTimestamp.slice(11, 19)}</span>
                    </div>

                    <div className="text-slate-300 text-[11px]">{rb.triggerReason}</div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-800">
                      <span>Restored Value: <span className="text-emerald-400 font-bold">{JSON.stringify(rb.restoredValue)}</span></span>
                      <span>Pre-rollback metric: {rb.preRollbackMetricValue} vs Baseline: {rb.baselineMetricValue}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* SECTION 9: MULTI-AGENT COUNCIL */}
      {activeTabSubSection === 'COUNCIL' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-sm font-semibold text-slate-200 flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-400" />
                  <span>Multi-Agent Evolution Council (6 Specialist Agents)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Consensus coordination across Operations, Test, Tracking, Performance, Incident, and Chief Intelligence agents.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs font-mono">
                <span className="text-slate-400">Council Agreement:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  {state.agentConsensus?.consensusAgreementPercent}%
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {state.agentConsensus?.agentContributions.map((ag) => (
                <div key={ag.agentId} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{ag.agentRole}</span>
                      <span className={`px-2 py-0.5 text-[10px] font-mono rounded font-bold ${
                        ag.approvalStance === 'APPROVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-slate-800 text-slate-400'
                      }`}>
                        {ag.approvalStance}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-cyan-400 mt-0.5">{ag.assignedDomain}</div>

                    <div className="mt-3 space-y-1 text-xs text-slate-300">
                      {ag.findings.map((f, i) => (
                        <div key={i} className="flex items-start space-x-1.5 text-[11px]">
                          <span className="text-emerald-400 font-mono">&bull;</span>
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 p-2 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-400 italic">
                      "{ag.evaluationRationale}"
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>Confidence: {ag.confidenceScore}%</span>
                    <span>Proposals: {ag.proposedOptimizationIds.length}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
